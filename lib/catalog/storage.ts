import 'server-only';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { put, get, head, del, BlobNotFoundError } from '@vercel/blob';

/**
 * Safe persistence for the catalog files.
 *
 * Two backends, chosen at call time by credential presence:
 *  - Local filesystem — used in dev and in tests, where the working directory
 *    is writable.
 *  - Vercel Blob — used in production. Vercel's deployed function filesystem
 *    is read-only outside /tmp, and /tmp is ephemeral and not shared across
 *    instances, so writes must land somewhere durable and shared instead.
 *
 * The fs backend still gets an in-process mutex, atomic writes (temp file +
 * rename), and a lock file. The Blob backend gets the same in-process mutex,
 * a single atomic PUT per write (no partial state possible), and a lock blob
 * that relies on `put()` without `allowOverwrite` rejecting a second writer.
 */

const DATA_DIR = path.join(process.cwd(), 'data');
export const CATALOG_PATH = path.join(DATA_DIR, 'products.json');
export const REDIRECTS_PATH = path.join(DATA_DIR, 'redirects.json');
export const BLOG_PATH = path.join(DATA_DIR, 'blog.json');
export const SHOP_PATH = path.join(DATA_DIR, 'shop.json');
export const SYNC_STATE_PATH = path.join(DATA_DIR, '.sync-state.json');
const LOCK_PATH = path.join(DATA_DIR, '.sync.lock');

function useBlobStorage(): boolean {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN || (process.env.VERCEL_OIDC_TOKEN && process.env.BLOB_STORE_ID),
  );
}

/** Maps a local-style path (e.g. `<cwd>/data/products.json`) to a Blob pathname. */
function blobPathname(filePath: string): string {
  return `catalog/${path.basename(filePath)}`;
}

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
  if (useBlobStorage()) return;
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export async function readJsonFile<T>(filePath: string): Promise<T | null> {
  if (useBlobStorage()) {
    try {
      const result = await get(blobPathname(filePath), { access: 'public', useCache: false });
      if (!result) return null;
      return JSON.parse(await new Response(result.stream).text()) as T;
    } catch (error) {
      if (error instanceof BlobNotFoundError) return null;
      throw error;
    }
  }

  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw) as T;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') return null;
    throw error;
  }
}

/**
 * Writes the catalog document. On the fs backend this goes via a temp file in
 * the same directory, then a rename — never partial. On the Blob backend, a
 * single `put()` is itself atomic — there is no partial-write state to guard
 * against.
 */
export async function writeJsonFileAtomic(filePath: string, value: unknown): Promise<void> {
  const serialized = `${JSON.stringify(value, null, 2)}\n`;

  if (useBlobStorage()) {
    await put(blobPathname(filePath), serialized, {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json',
    });
    return;
  }

  await ensureDataDir();
  const tempPath = `${filePath}.${randomBytes(6).toString('hex')}.tmp`;

  let handle: fs.FileHandle | undefined;
  try {
    handle = await fs.open(tempPath, 'w');
    await handle.writeFile(serialized, 'utf8');
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
export async function acquireLock(options: { timeoutMs?: number; staleMs?: number } = {}): Promise<LockHandle> {
  const timeoutMs = options.timeoutMs ?? 30_000;
  const staleMs = options.staleMs ?? 5 * 60_000;
  const deadline = Date.now() + timeoutMs;

  if (useBlobStorage()) {
    const lockPathname = blobPathname(LOCK_PATH);

    for (;;) {
      try {
        // Fails if the blob already exists — no `allowOverwrite` — giving the
        // same "create exclusively" semantics as `fs.open(path, 'wx')`.
        await put(lockPathname, JSON.stringify({ pid: process.pid, at: Date.now() }), {
          access: 'public',
          addRandomSuffix: false,
        });
        return { release: async () => { await del(lockPathname); } };
      } catch {
        const existing = await head(lockPathname).catch(() => null);
        if (existing && Date.now() - existing.uploadedAt.getTime() > staleMs) {
          await del(lockPathname).catch(() => {});
          continue;
        }
        if (Date.now() > deadline) {
          throw new Error(`Timed out after ${timeoutMs}ms waiting for the catalog lock at ${lockPathname}`);
        }
        await new Promise((resolve) => setTimeout(resolve, 120));
      }
    }
  }

  await ensureDataDir();

  for (;;) {
    try {
      const handle = await fs.open(LOCK_PATH, 'wx');
      await handle.writeFile(JSON.stringify({ pid: process.pid, at: Date.now() }), 'utf8');
      await handle.close();
      return {
        release: async () => {
          await fs.rm(LOCK_PATH, { force: true });
        },
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;

      const stat = await fs.stat(LOCK_PATH).catch(() => null);
      if (stat && Date.now() - stat.mtimeMs > staleMs) {
        await fs.rm(LOCK_PATH, { force: true });
        continue;
      }
      if (Date.now() > deadline) {
        throw new Error(`Timed out after ${timeoutMs}ms waiting for the catalog lock at ${LOCK_PATH}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
  }
}
