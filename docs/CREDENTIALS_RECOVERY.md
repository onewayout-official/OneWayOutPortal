# Credentials recovery runbook

Use this after losing `.env.local`. Production secrets live in **Vercel** and vendor dashboards—not in Git.

## Step 0 — Pull from Vercel (primary)

From the repo root (folder with `package.json`):

```powershell
vercel link --project <your-vercel-project-slug> --yes
vercel env pull .env.local --environment=production --yes
```

If `vercel link` fails because of the folder name, specify the project slug explicitly (Vercel Dashboard → Project → Settings → **Project Name**).

Copy variables into a password manager. **Do not commit** `.env.local`.

Alternative: Vercel Dashboard → **Settings** → **Environment Variables** → copy each value manually into `.env.local`.

Bootstrap empty file:

```powershell
copy .env.local.example .env.local
```

## Step 1 — Validate locally

```powershell
npm run env:check
```

Fix any `[MISSING]` lines using Vercel or the dashboards below.

## Step 2 — Supabase (P0)

Dashboard → **Project Settings** → **API**:

| Variable | Source |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role (server only) |

**Authentication** → **URL configuration**:

- **Site URL** = `NEXT_PUBLIC_APP_URL` (production)
- **Redirect URLs** must include:
  - `https://<your-domain>/auth/callback`
  - `http://localhost:3000/auth/callback`

## Step 3 — Google sign-in (P1)

**Do not delete** the OAuth client until Supabase is updated and tested.

1. **Supabase** → Authentication → Providers → **Google** → enable; paste Client ID + Client secret.
2. **Google Cloud** → Credentials → OAuth 2.0 Web client:
   - **JavaScript origins:** `http://localhost:3000`, `https://<production-domain>`
   - **Redirect URI:** `https://<project-ref>.supabase.co/auth/v1/callback` (shown in Supabase Google provider UI)
3. **`.env.local`:** `NEXT_PUBLIC_GOOGLE_CLIENT_ID` = same Web client ID.

Lost secret only: reset secret in Google Cloud → update Supabase provider (not necessarily a new client).

## Step 4 — Microsoft 365 — Graph mail + Teams (P1)

**`.env.local`:** `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `GRAPH_MAIL_SENDER`, `EMAIL_TRANSPORT=graph` (or `auto`), `COACH_SETUP_EMAIL_MODE=smtp` for coach welcome via Graph only

**Azure Portal** → App registrations → your app → **API permissions** (application, admin consent):

- `Calendars.ReadWrite`
- `Mail.Send`

Lost client secret: **Certificates & secrets** → **New client secret** → update Vercel + `.env.local` → test → revoke old secret later.

Optional SMTP: see [README.md](../README.md) and `.env.example` comments. Member auth mail (welcome/confirm/reset): [SUPABASE_AUTH_EMAIL.md](./SUPABASE_AUTH_EMAIL.md).

## Step 5 — Twilio WhatsApp OTP (P1)

From Vercel or [Twilio Console](https://console.twilio.com/):

- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM` (`whatsapp:+...`)

## Step 6 — Yoyo (P2)

- `YOYO_BASE_URL` (production; code default is sandbox integration URL)
- `YOYO_API_ID`, `YOYO_API_PASSWORD`

## Step 7 — CRM (P2)

Minimum when `CRM_SYNC_ENABLED=true`:

- `CRM_BASE_URL` or `CRM_CREATE_CLIENT_URL`
- Auth: `CRM_USERNAME` + `CRM_PASSWORD`, or `CRM_API_TOKEN`, or `CRM_BASIC_AUTH_B64`, or `CRM_API_KEY`
- Recommended IDs: `CRM_ORGANISATION_ID`, `CRM_TITLE_ID`, `CRM_CLIENT_TYPE_ID`

With `npm run dev` running:

```text
GET http://localhost:3000/api/crm/diagnose
```

## Step 8 — Sync rotations back to Vercel

After rotating **Azure client secret** or **Twilio** tokens:

Vercel Dashboard → Environment Variables → update → redeploy.

Or with CLI (from repo root):

```powershell
vercel env add AZURE_CLIENT_SECRET production
vercel env add TWILIO_AUTH_TOKEN production
```

Google OAuth **secret** is stored in **Supabase**, not Vercel (unless you also put it there).

## Validation checklist

- [ ] `npm run env:check` passes
- [ ] Email login works
- [ ] Google login → `/auth/callback`
- [ ] WhatsApp OTP sends
- [ ] Coach booking / Graph calendar
- [ ] Transactional email (Graph or SMTP)
- [ ] Yoyo campaigns in app
- [ ] CRM diagnose + profile sync
- [ ] Admin UI with email in `ADMIN_PANEL_EMAILS`

## Golden rules

1. Never delete Google OAuth client or Azure app until replacements are tested.
2. Prefer **read/copy** and **rotate in place** over recreating apps.
3. Keep `.env.example` / `.env.local.example` in Git; keep secrets only in `.env.local` and Vercel.
