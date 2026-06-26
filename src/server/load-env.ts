import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

// This module lives in src/server during development and dist/server after build.
// In both cases, ../../.env points at the repository-level workshop config.
config({
  path: path.resolve(currentDir, "../../.env"),
  // Keep repo defaults in .env, but let one-off shell overrides win so
  // candidate-vs-production prompt experiments do not require editing .env.
  override: false,
  quiet: true
});
