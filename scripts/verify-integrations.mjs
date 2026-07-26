#!/usr/bin/env node
/**
 * Optional live checks (no secret output). Requires .env.local.
 * Usage: node scripts/verify-integrations.mjs
 */
import { loadEnvLocal } from "./load-env-local.mjs";

const GUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const { loaded } = loadEnvLocal();
if (!loaded) {
  console.error("No .env.local — run npm run env:bootstrap then vercel env pull.");
  process.exit(1);
}

let issues = 0;

async function supabaseReachable() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) {
    console.log("[SKIP] Supabase — missing URL or anon key");
    return;
  }
  try {
    const res = await fetch(`${url.replace(/\/+$/, "")}/auth/v1/health`, {
      headers: { apikey: key },
    });
    const ok = res.ok;
    console.log(`[${ok ? "OK" : "WARN"}] Supabase auth health — HTTP ${res.status}`);
    if (!ok) issues += 1;
  } catch (e) {
    console.log(`[FAIL] Supabase — ${e instanceof Error ? e.message : e}`);
    issues += 1;
  }
}

async function azureToken() {
  const tenantId = process.env.AZURE_TENANT_ID?.trim();
  const clientId = process.env.AZURE_CLIENT_ID?.trim();
  const clientSecret = process.env.AZURE_CLIENT_SECRET?.trim();
  if (!tenantId || !clientId || !clientSecret) {
    console.log("[SKIP] Azure — missing tenant/client/secret");
    return;
  }
  if (!GUID.test(tenantId) || !GUID.test(clientId)) {
    console.log("[FAIL] Azure — tenant or client ID is not a GUID");
    issues += 1;
    return;
  }
  if (
    tenantId.replace(/-/g, "") === "00000000000000000000000000000000" ||
    clientId.replace(/-/g, "") === "00000000000000000000000000000000"
  ) {
    console.log(
      "[FAIL] Azure — placeholder tenant/client ID; copy real values from Vercel or Azure Portal"
    );
    issues += 1;
    return;
  }
  try {
    const res = await fetch(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          scope: "https://graph.microsoft.com/.default",
          grant_type: "client_credentials",
        }),
      }
    );
    const json = await res.json().catch(() => ({}));
    if (res.ok && json.access_token) {
      console.log("[OK] Azure — client credentials token acquired");
    } else {
      const msg = json.error_description || json.error || `HTTP ${res.status}`;
      console.log(`[FAIL] Azure — ${String(msg).slice(0, 200)}`);
      issues += 1;
    }
  } catch (e) {
    console.log(`[FAIL] Azure — ${e instanceof Error ? e.message : e}`);
    issues += 1;
  }
}

function googleClientIdFormat() {
  const id = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();
  if (!id) {
    console.log("[SKIP] Google — NEXT_PUBLIC_GOOGLE_CLIENT_ID not set");
    return;
  }
  const ok = id.endsWith(".apps.googleusercontent.com");
  console.log(
    `[${ok ? "OK" : "WARN"}] Google client ID format${ok ? "" : " (expected *.apps.googleusercontent.com)"}`
  );
  if (!ok) issues += 1;
  console.log(
    "  Confirm Supabase Auth → Google: same Client ID + secret; redirect URI = https://<ref>.supabase.co/auth/v1/callback"
  );
}

function supabaseRedirectChecklist() {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim();
  console.log("\nSupabase Auth → URL configuration checklist:");
  if (appUrl) {
    console.log(`  Site URL: ${appUrl.replace(/\/+$/, "")}`);
    console.log(`  Redirect: ${appUrl.replace(/\/+$/, "")}/auth/callback`);
  } else {
    console.log("  Site URL: (set NEXT_PUBLIC_APP_URL)");
    issues += 1;
  }
  console.log("  Redirect: http://localhost:3000/auth/callback");
}

console.log("Live integration checks (secrets not printed)\n");
await supabaseReachable();
googleClientIdFormat();
await azureToken();
supabaseRedirectChecklist();

console.log("\nAzure permissions reminder: Calendars.ReadWrite + Mail.Send (application, admin consent)");
console.log("CRM: with dev server — GET /api/crm/diagnose");
console.log("Twilio/Yoyo: exercise login and rewards flows in the app");

if (issues > 0) {
  console.log(`\n${issues} issue(s) — see docs/CREDENTIALS_RECOVERY.md`);
  process.exit(1);
}
console.log("\nLive checks passed.");
