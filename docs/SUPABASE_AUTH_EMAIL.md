# Member auth email (Supabase)

Member welcome, confirm signup, password reset, and magic links are sent by **Supabase Auth**, not by the Next.js app. Coach and appointment mail uses Microsoft Graph via `lib/email.ts` (see README).

## 1. App URL (must match Supabase)

Set in `.env.local` / Vercel:

```bash
NEXT_PUBLIC_APP_URL=https://your-production-domain.com
```

Run `npm run env:check` — it prints redirect URLs to add in Supabase.

## 2. Supabase Dashboard → Authentication → URL configuration

| Setting | Value |
|---------|--------|
| **Site URL** | Same as `NEXT_PUBLIC_APP_URL` (no trailing slash) |
| **Redirect URLs** | `{NEXT_PUBLIC_APP_URL}/auth/callback` |
| | `http://localhost:3000/auth/callback` (local dev) |

Google OAuth and email confirmation both land on `/auth/callback` ([`app/auth/callback/page.tsx`](../app/auth/callback/page.tsx)).

## 3. Custom SMTP (required for production mail)

**Authentication → Email → Custom SMTP**

Mirror your Microsoft 365 mailbox settings (see [README](../README.md) § Office 365 SMTP):

- Host: `smtp.office365.com`
- Port: `587`
- Username / password: dedicated sender mailbox with **Authenticated SMTP** enabled in Exchange

Without custom SMTP, Supabase uses its built-in sender (rate-limited and not suitable for production).

## 4. Confirm signup as welcome email

**Authentication → Providers → Email** → enable **Confirm email**.

**Authentication → Email Templates** → edit **Confirm signup** (subject/body, `{ConfirmationURL}`, `{Email}`, etc.) with your welcome copy.

The app passes `emailRedirectTo: {APP_URL}/auth/callback` on signup ([`contexts/AuthContext.tsx`](../contexts/AuthContext.tsx)). After the user clicks the link, they are signed in and routed via onboarding rules.

When confirm email is enabled, signup may return **no session** until confirmation. The register page shows a “check your email” state instead of sending users to `/onboarding` immediately ([`components/RegisterForm.tsx`](../components/RegisterForm.tsx)).

## 5. Password reset

Forgot-password flow uses `supabase.auth.resetPasswordForEmail` with redirect to `/reset-password`. That email is also sent through Supabase custom SMTP once configured.

## Checklist

- [ ] `NEXT_PUBLIC_APP_URL` set on Vercel and locally
- [ ] Supabase Site URL and redirect URLs match
- [ ] Custom SMTP configured and test email sent from Supabase dashboard
- [ ] Confirm email enabled + Confirm signup template branded
- [ ] Test register → inbox → click link → lands on app signed in
