#!/usr/bin/env node
/**
 * Checks email config + coach linked_user_id (no secrets printed).
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./load-env-local.mjs";

loadEnvLocal();

const GUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isGraphEmailReady() {
  const tenantId = process.env.AZURE_TENANT_ID?.trim() ?? "";
  const clientId = process.env.AZURE_CLIENT_ID?.trim() ?? "";
  const secret = process.env.AZURE_CLIENT_SECRET?.trim() ?? "";
  const sender =
    process.env.GRAPH_MAIL_SENDER?.trim() ||
    process.env.SMTP_FROM?.replace(/^["']|["']$/g, "").trim();
  return (
    GUID.test(tenantId) &&
    GUID.test(clientId) &&
    secret.length > 0 &&
    Boolean(sender)
  );
}

function isSmtpReady() {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_FROM &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
  );
}

function canSendEmail() {
  const mode = (process.env.EMAIL_TRANSPORT ?? "auto").toLowerCase();
  if (mode === "graph") return isGraphEmailReady();
  if (mode === "smtp") return isSmtpReady();
  return isGraphEmailReady() || isSmtpReady();
}

console.log("=== 1) Email transport ===\n");
console.log(`  EMAIL_TRANSPORT: ${process.env.EMAIL_TRANSPORT ?? "auto"}`);
console.log(`  Graph (Azure + sender): ${isGraphEmailReady() ? "ready" : "not ready"}`);
console.log(`  SMTP: ${isSmtpReady() ? "ready" : "not ready"}`);
console.log(`  App can send booking emails: ${canSendEmail() ? "YES" : "NO"}`);

if (canSendEmail() && isGraphEmailReady()) {
  const tenantId = process.env.AZURE_TENANT_ID.trim();
  const res = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.AZURE_CLIENT_ID.trim(),
        client_secret: process.env.AZURE_CLIENT_SECRET.trim(),
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials",
      }),
    }
  );
  const json = await res.json().catch(() => ({}));
  console.log(
    `  Azure token (live): ${res.ok && json.access_token ? "OK" : "FAILED"}`
  );
}

console.log("\n=== 2) Coach portal logins (linked_user_id) ===\n");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!url || !key) {
  console.log("  SKIP — missing Supabase URL or service role key");
  process.exit(canSendEmail() ? 0 : 1);
}

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: coaches, error } = await admin
  .from("counselors")
  .select("id, name, is_active, linked_user_id")
  .order("name");

if (error) {
  console.log(`  ERROR: ${error.message}`);
  process.exit(1);
}

const rows = coaches ?? [];
const active = rows.filter((c) => c.is_active);
let allLinked = true;

console.log(`  Active coaches: ${active.length}`);

for (const c of active) {
  const ok = Boolean(c.linked_user_id);
  if (!ok) allLinked = false;
  console.log(`  ${ok ? "[OK]" : "[MISSING LINK]"} ${c.name}`);
  if (ok) {
    const { data: authUser, error: authErr } = await admin.auth.admin.getUserById(
      c.linked_user_id
    );
    if (authErr) {
      console.log(`         login email: (lookup failed: ${authErr.message})`);
    } else {
      const loginEmail = authUser.user?.email?.trim();
      console.log(`         login email: ${loginEmail || "(none on auth user)"}`);
    }
  }
}

if (active.length === 0) {
  console.log("  (no active coaches in database)");
  allLinked = false;
}

console.log("\n=== Summary ===");
const emailOk = canSendEmail();
if (emailOk && allLinked && active.length > 0) {
  console.log("  Both checks passed — booking emails should work for client + coach.");
  process.exit(0);
}
if (!emailOk) console.log("  Email transport is NOT ready.");
if (!allLinked) console.log("  Link every active coach in Admin → Coaches (Login email).");
process.exit(1);
