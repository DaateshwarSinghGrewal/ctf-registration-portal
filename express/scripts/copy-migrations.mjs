import { cpSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Copies the .sql migrations into dist/ after a build.
 *
 * tsc only emits the files it compiles, so without this `npm run build` produces
 * a dist/ whose migration runner finds an empty directory — and a production
 * deploy silently applies nothing. Run as a postbuild step rather than by hand,
 * because "nothing happened" is the failure mode of forgetting it.
 */
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const from = join(root, "src", "database", "migrations");
const to = join(root, "dist", "database", "migrations");

if (!existsSync(from)) {
  console.error(`No migrations directory at ${from}`);
  process.exit(1);
}

cpSync(from, to, { recursive: true });
console.log(`Copied migrations → ${to}`);
