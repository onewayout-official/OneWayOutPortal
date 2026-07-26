import fs from "node:fs";
import path from "node:path";

/**
 * Minimal .env.local loader (no dependency). Does not override existing process.env.
 */
export function loadEnvLocal(cwd = process.cwd()) {
  const filePath = path.join(cwd, ".env.local");
  if (!fs.existsSync(filePath)) {
    return { filePath, loaded: false, keys: [] };
  }

  const text = fs.readFileSync(filePath, "utf8");
  const keys = [];

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
    keys.push(key);
  }

  return { filePath, loaded: true, keys };
}
