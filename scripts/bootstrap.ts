/**
 * Shared CLI bootstrap.
 *
 * Loads .env.local (then .env) before any module that reads process.env, and
 * neutralizes the `server-only` guard, which is a Next.js bundler convention
 * rather than a runtime restriction.
 */
import { config } from 'dotenv';
import { createRequire } from 'node:module';
import path from 'node:path';

config({ path: path.join(process.cwd(), '.env.local'), quiet: true });
config({ path: path.join(process.cwd(), '.env'), quiet: true });

const require = createRequire(import.meta.url);
try {
  // Resolve to the CJS entry the `import 'server-only'` statement would hit and
  // replace it with a no-op so these scripts can reuse the same services.
  const resolved = require.resolve('server-only');
  require.cache[resolved] = {
    id: resolved,
    filename: resolved,
    loaded: true,
    exports: {},
  } as NodeJS.Module;
} catch {
  // Package not installed — nothing to stub.
}

const ESC = '';

export const colors = {
  reset: `${ESC}[0m`,
  dim: `${ESC}[2m`,
  bold: `${ESC}[1m`,
  red: `${ESC}[31m`,
  green: `${ESC}[32m`,
  yellow: `${ESC}[33m`,
  blue: `${ESC}[34m`,
  cyan: `${ESC}[36m`,
};

export function heading(text: string): void {
  console.log(`\n${colors.bold}${colors.cyan}${text}${colors.reset}`);
}

export function info(text: string): void {
  console.log(`${colors.dim}${text}${colors.reset}`);
}

export function success(text: string): void {
  console.log(`${colors.green}✓${colors.reset} ${text}`);
}

export function warn(text: string): void {
  console.log(`${colors.yellow}!${colors.reset} ${text}`);
}

export function fail(text: string): void {
  console.error(`${colors.red}✗${colors.reset} ${text}`);
}

export function fatal(error: unknown): never {
  fail(error instanceof Error ? error.message : String(error));
  if (error instanceof Error && error.stack && process.env.DEBUG) {
    console.error(colors.dim + error.stack + colors.reset);
  }
  process.exit(1);
}
