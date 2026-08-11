/**
 * Test environment.
 *
 * The fake-but-valid credentials live in `vitest.config.ts` under `test.env`,
 * not here: several modules read process.env at import time, so anything set
 * from a setup hook would land after those modules had already initialized.
 *
 * This file stays as the place for future global test wiring.
 */
export {};
