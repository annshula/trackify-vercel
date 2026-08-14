import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";

/**
 * Safe persistence for the catalog files.
 *
 * Two layers of protection against a corrupt products.json:
 *  - an in-process mutex serializing read-modify-write cycles, and
 *  - atomic writes (temp file + rename) so a crash mid-write cannot truncate
 *    the live file.
 * A lock file additionally guards against the sync script and the server
 * writing at the same moment.
 */

export const DATA_DIR = path.join(process.cwd(), "data");
export const CATALOG_PATH = path.join(DATA_DIR, "products.json");
export const REDIRECTS_PATH = path.join(DATA_DIR, "redirects.json");
export const BLOG_PATH = path.join(DATA_DIR, "blog.json");
export const SYNC_STATE_PATH = path.join(DATA_DIR, ".sync-state.json");
const LOCK_PATH = path.join(DATA_DIR, ".sync.lock");

let chain: Promise<unknown> = Promise.resolve();

/** Serializes every catalog mutation within this process. */
export function withMutex<T>(task: () => Promise<T>): Promise<T> {
  const run = chain.then(task, task);
  // Keep the chain alive even when a task rejects.
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export async function ensureDataDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return null;
    throw error;
  }
}

/** Writes via a temp file in the same directory, then renames — never partial. */
export async function writeJsonFileAtomic(
  filePath: string,
  value: unknown,
): Promise<void> {
  await ensureDataDir();
  const tempPath = `${filePath}.${randomBytes(6).toString("hex")}.tmp`;
  const serialized = `${JSON.stringify(value, null, 2)}\n`;

  let handle: fs.FileHandle | undefined;
  try {
    handle = await fs.open(tempPath, "w");
    await handle.writeFile(serialized, "utf8");
    // fsync before rename so the rename cannot expose an empty file after a crash.
    await handle.sync();
  } finally {
    await handle?.close();
  }

  await fs.rename(tempPath, filePath);
}

export type LockHandle = { release: () => Promise<void> };

/**
 * Cross-process advisory lock. Stale locks (from a killed process) expire so a
 * crashed sync never blocks webhooks forever.
 */
export async function acquireLock(
  options: { timeoutMs?: number; staleMs?: number } = {},
): Promise<LockHandle> {
  const timeoutMs = options.timeoutMs ?? 30_000;
  const staleMs = options.staleMs ?? 5 * 60_000;
  const deadline = Date.now() + timeoutMs;
  await ensureDataDir();

  for (;;) {
    try {
      const handle = await fs.open(LOCK_PATH, "wx");
      await handle.writeFile(
        JSON.stringify({ pid: process.pid, at: Date.now() }),
        "utf8",
      );
      await handle.close();
      return {
        release: async () => {
          await fs.rm(LOCK_PATH, { force: true });
        },
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;

      const stat = await fs.stat(LOCK_PATH).catch(() => null);
      if (stat && Date.now() - stat.mtimeMs > staleMs) {
        await fs.rm(LOCK_PATH, { force: true });
        continue;
      }
      if (Date.now() > deadline) {
        throw new Error(
          `Timed out after ${timeoutMs}ms waiting for the catalog lock at ${LOCK_PATH}`,
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
  }
}
