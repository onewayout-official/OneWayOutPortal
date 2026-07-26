#!/usr/bin/env node
/**
 * Validates .env.local for One Way Out Portal. Prints status only — never secret values.
 * Usage: node scripts/check-env.mjs
 */
import { loadEnvLocal } from "./load-env-local.mjs";

const GUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isSet(key) {
  const v = process.env[key]?.trim();
  return Boolean(v && v !== "..." && !v.startsWith("your-"));
}

function isGuid(key) {
  const v = process.env[key]?.trim();
  if (!v || !GUID.test(v)) return false;
  if (/^0+-0+-0+-0+-0+$/i.test(v.replace(/-/g, ""))) return false;
  return true;
}

function status(key, ok, hint = "") {
  const mark = ok ? "OK" : "MISSING";
  console.log(`  [${mark}] ${key}${hint ? ` — ${hint}` : ""}`);
  return ok;
}

function section(title) {
  console.log(`\n## ${title}`);
}

const { filePath, loaded } = loadEnvLocal();

console.log("One Way Out Portal — environment check");
console.log(`File: ${filePath} (${loaded ? "found" : "not found"})`);

if (!loaded) {
  console.log(`
No .env.local yet. Recover production values:
  1. vercel link --project <your-vercel-project-name> --yes
  2. vercel env pull .env.local --environment=production --yes

Or copy the template:
  copy .env.local.example .env.local
Then fill values from Vercel Dashboard → Settings → Environment Variables.

See docs/CREDENTIALS_RECOVERY.md for the full runbook.
`);
  process.exit(1);
}

let failures = 0;
const fail = () => {
  failures += 1;
};

section("P0 — Supabase & app URL");
if (!status("NEXT_PUBLIC_SUPABASE_URL", isSet("NEXT_PUBLIC_SUPABASE_URL"))) fail();
if (!status("NEXT_PUBLIC_SUPABASE_ANON_KEY", isSet("NEXT_PUBLIC_SUPABASE_ANON_KEY"))) fail();
if (!status("SUPABASE_SERVICE_ROLE_KEY", isSet("SUPABASE_SERVICE_ROLE_KEY"))) fail();

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL?.trim() ||
  process.env.NEXT_PUBLIC_SITE_URL?.trim();
const hasAppUrl = Boolean(appUrl);
if (!status("NEXT_PUBLIC_APP_URL or NEXT_PUBLIC_SITE_URL", hasAppUrl, "needed for OAuth redirects")) {
  fail();
}

if (hasAppUrl) {
  console.log(`  Supabase redirect URLs should include:`);
  console.log(`    ${appUrl.replace(/\/+$/, "")}/auth/callback`);
  console.log(`    http://localhost:3000/auth/callback`);
}

section("P1 — Google (local + Supabase dashboard)");
status(
  "NEXT_PUBLIC_GOOGLE_CLIENT_ID",
  isSet("NEXT_PUBLIC_GOOGLE_CLIENT_ID"),
  "optional wrapper; Supabase Auth → Google provider must have Client ID + Secret"
);

section("P1 — Twilio WhatsApp OTP");
const twilioOk =
  status("TWILIO_ACCOUNT_SID", isSet("TWILIO_ACCOUNT_SID")) &&
  status("TWILIO_AUTH_TOKEN", isSet("TWILIO_AUTH_TOKEN")) &&
  status("TWILIO_WHATSAPP_FROM", isSet("TWILIO_WHATSAPP_FROM"));
if (!twilioOk) fail();

section("P1 — Microsoft 365 (Graph: mail + calendar)");
const tenantOk = isSet("AZURE_TENANT_ID") && isGuid("AZURE_TENANT_ID");
const clientOk = isSet("AZURE_CLIENT_ID") && isGuid("AZURE_CLIENT_ID");
const secretOk = isSet("AZURE_CLIENT_SECRET");
if (!status("AZURE_TENANT_ID", tenantOk, "must be a GUID")) fail();
if (!status("AZURE_CLIENT_ID", clientOk, "must be a GUID")) fail();
if (!status("AZURE_CLIENT_SECRET", secretOk)) fail();

const graphSender =
  process.env.GRAPH_MAIL_SENDER?.trim() ||
  process.env.SMTP_FROM?.trim();
if (!status("GRAPH_MAIL_SENDER or SMTP_FROM", Boolean(graphSender), "Graph sendMail sender mailbox")) {
  fail();
}

const smtpPartial =
  isSet("SMTP_HOST") || isSet("SMTP_USER") || isSet("SMTP_PASS");
if (smtpPartial) {
  status("SMTP_HOST", isSet("SMTP_HOST"));
  status("SMTP_FROM", isSet("SMTP_FROM"));
  status("SMTP_USER", isSet("SMTP_USER"));
  status("SMTP_PASS", isSet("SMTP_PASS"));
}

console.log(
  `  Azure app permissions (admin consent): Calendars.ReadWrite, Mail.Send`
);

section("P2 — Yoyo");
const yoyoOk =
  status("YOYO_BASE_URL", isSet("YOYO_BASE_URL"), "use production URL in prod") &&
  status("YOYO_API_ID", isSet("YOYO_API_ID")) &&
  status("YOYO_API_PASSWORD", isSet("YOYO_API_PASSWORD"));
if (!yoyoOk) fail();

section("P2 — CRM");
const crmEnabled = process.env.CRM_SYNC_ENABLED?.trim()?.toLowerCase() === "true";
status("CRM_SYNC_ENABLED", crmEnabled, 'set to "true" to enable sync');
if (crmEnabled) {
  const hasBase =
    isSet("CRM_BASE_URL") || isSet("CRM_CREATE_CLIENT_URL");
  if (!status("CRM_BASE_URL or CRM_CREATE_CLIENT_URL", hasBase)) fail();

  const hasAuth =
    isSet("CRM_API_TOKEN") ||
    (isSet("CRM_USERNAME") && isSet("CRM_PASSWORD")) ||
    isSet("CRM_BASIC_AUTH_B64") ||
    isSet("CRM_API_KEY");
  if (!status("CRM auth (token, user/pass, basic, or api key)", hasAuth)) fail();

  status("CRM_ORGANISATION_ID", isSet("CRM_ORGANISATION_ID"), "recommended");
  status("CRM_TITLE_ID", isSet("CRM_TITLE_ID"), "recommended");
  status("CRM_CLIENT_TYPE_ID", isSet("CRM_CLIENT_TYPE_ID"), "recommended");
}

section("P3 — Admin");
status("ADMIN_PANEL_EMAILS", isSet("ADMIN_PANEL_EMAILS"), "comma-separated allowlist");

section("Optional smoke tests (with dev server running)");
console.log("  CRM:  GET http://localhost:3000/api/crm/diagnose");
console.log("  App:  npm run dev → login (email, Google, phone OTP)");

console.log("\n---");
if (failures > 0) {
  console.log(`Result: ${failures} required check(s) failed.`);
  process.exit(1);
}
console.log("Result: all required checks passed.");
