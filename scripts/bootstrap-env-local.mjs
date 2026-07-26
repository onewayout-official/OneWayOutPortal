#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const target = path.join(root, ".env.local");
const template = path.join(root, ".env.local.example");

if (fs.existsSync(target)) {
  console.log(".env.local already exists — not overwriting.");
  console.log("To validate: npm run env:check");
  process.exit(0);
}

if (!fs.existsSync(template)) {
  console.error("Missing .env.local.example");
  process.exit(1);
}

fs.copyFileSync(template, target);
console.log("Created .env.local from .env.local.example");
console.log("");
console.log("Next steps:");
console.log("  1. vercel link --project <slug> --yes");
console.log("  2. vercel env pull .env.local --environment=production --yes");
console.log("  Or paste values from Vercel Dashboard manually.");
console.log("  3. npm run env:check");
console.log("");
console.log("See docs/CREDENTIALS_RECOVERY.md");
