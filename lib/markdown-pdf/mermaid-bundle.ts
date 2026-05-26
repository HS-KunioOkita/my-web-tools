import "server-only";
import path from "node:path";
import { access } from "node:fs/promises";

let cachedPath: string | null = null;

export async function getMermaidBundlePath(): Promise<string> {
  if (cachedPath) return cachedPath;
  const candidate = path.resolve(
    process.cwd(),
    "node_modules/mermaid/dist/mermaid.min.js",
  );
  await access(candidate);
  cachedPath = candidate;
  return cachedPath;
}
