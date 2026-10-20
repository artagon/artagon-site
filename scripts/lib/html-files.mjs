import { promises as fs } from "node:fs";
import path from "node:path";

// USMR 14.30 (site-2m1.30): keep the identical SRI and CSP HTML walkers shared.
export async function walk(dir) {
  const out = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(filePath)));
    else if (entry.isSymbolicLink() && entry.name.endsWith(".html")) {
      throw new Error(`symlinked HTML file is not allowed: ${filePath}`);
    }
    else if (entry.isFile() && filePath.endsWith(".html")) out.push(filePath);
  }
  return out;
}
