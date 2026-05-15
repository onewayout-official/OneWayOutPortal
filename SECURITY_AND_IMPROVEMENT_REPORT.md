# OneWayOutPortal Security and Improvement Report

## Scope
- Repository-level, read-only assessment of architecture, code quality, security posture, and API key exposure risks.
- Focused review of auth, admin APIs, Supabase RLS usage, tooling/CI, documentation accuracy, and maintainability hotspots.
- This report reflects files present in the current working tree (not full git history).

## Executive Summary
- No confirmed hardcoded production API keys or private secrets were found in the current repository tree.
- The highest-priority security concern is a potential privilege-escalation path tied to trust in `profiles.role` for admin authorization decisions.
- The second major gap is process/tooling: there are no first-class tests or CI enforcement gates.
- Main maintainability issue is a monolithic data layer (`lib/storage.ts`) and duplicated authorization helper logic in admin routes.
- Documentation exists but is partially stale and should be aligned with current `app/api/*` architecture and required server-side env vars.

## Management Summary (One-Page)
- Overall risk status: **Moderate to High** until privilege escalation and CI/testing gaps are addressed.
- Business-impact concern: potential unauthorized admin actions if role-trust weakness is exploited.
- Exposure status: no hardcoded production secrets found in current repository files.
- Delivery risk: missing automated tests and CI checks increase chance of production regressions.
- Operational risk: stale docs can lead to insecure deployment/config decisions.

### Immediate Leadership Priorities
- Approve emergency hardening for admin role authorization and DB policy protections.
- Require CI quality gates (lint, typecheck, build) before merge to main branches.
- Mandate security-safe API errors (no internal detail leakage in client responses).
- Align docs and environment templates with the actual architecture in production.

### Expected Outcome After P0/P1
- Privilege escalation path closed at DB + API layers.
- Higher deployment confidence through automated quality gates.
- Faster onboarding with accurate env and architecture documentation.
- Reduced incident probability from config drift and hidden failures.

## Engineering Action Checklist (Unified)

### P0 - Blocker Security Fixes
- [ ] Restrict user ability to modify privileged role fields in DB policies/triggers.
- [ ] Ensure admin API authorization does not trust user-self-editable role fields.
- [ ] Replace raw upstream error messages in admin APIs with generic client-safe responses.
- [ ] Validate `SUPABASE_SERVICE_ROLE_KEY` remains server-only in all environments.

### P1 - Reliability and Safety Net
- [ ] Add CI workflow for install, lint, typecheck, and build on pull requests.
- [ ] Add targeted tests for admin authz paths (401/403/200) and key failure flows.
- [ ] Extract duplicated admin auth bootstrap logic into a shared module.
- [ ] Add/update `.env.example` or `.env.local.example` with public vs server-only separation.

### P2 - Maintainability and Hardening
- [ ] Split `lib/storage.ts` into domain modules with clear boundaries.
- [ ] Standardize storage error propagation so UI can reliably handle failures.
- [ ] Add middleware/server-side guard for sensitive route groups.
- [ ] Add dependency/security automation (scheduled audit and update workflow).

### Suggested Ownership
- Security/backend: DB policy fixes, admin route hardening, key-handling guarantees.
- Platform/DevEx: CI pipeline, audit automation, branch protections.
- Application team: storage refactor, typing improvements, UI guard consistency.
- Documentation owner: architecture and environment docs synchronization.

## Architecture Snapshot
- Stack: Next.js App Router + React + TypeScript + Supabase.
- Auth/session orchestration: `contexts/AuthContext.tsx`.
- Client-side route gating: `components/ProtectedRoute.tsx`.
- Main data access layer: `lib/storage.ts`.
- Privileged server handlers: `app/api/admin/users/route.ts` and `app/api/admin/users/[id]/route.ts`.
- DB schema and RLS policies: `supabase/migrations/*`.

## Security Findings

### Critical
- Potential role-escalation risk:
  - Admin API trusts admin identity based on profile role checks in server routes.
  - If `profiles.role` remains user-writable under current RLS/policy design, a normal user could potentially self-promote and then call service-role-backed admin APIs.
  - Impact: unauthorized admin-level operations (user listing/management, privileged mutations).

### High
- Service-role blast radius:
  - Admin handlers use `SUPABASE_SERVICE_ROLE_KEY` for privileged actions.
  - Correct server-only placement is present, but any auth logic weakness or env misconfiguration materially increases impact.
- Authorization model fragility:
  - Admin checks based on allowlist/email and/or profile role create operational risk if account governance is weak.

### Medium
- Error information disclosure:
  - Some admin API responses surface raw upstream `error.message` values.
  - This may leak internal details useful to attackers.
- Defense-in-depth gap:
  - No middleware-based server-side route gate was identified; access control relies heavily on client route protection + API checks.
- Password policy concerns:
  - Admin user creation/update flow appears to enforce a relatively weak minimum length.

### Low to Medium
- Admin page discoverability:
  - Admin navigation appears visible to signed-in users generally, even if API later rejects unauthorized calls.
- Defensive filtering consistency:
  - A few update paths rely on record `id` checks without consistently also filtering by `user_id` in code (RLS still provides primary boundary).

## API Key and Secret Exposure Assessment

## Confirmed Exposure Status
- No confirmed committed production secrets found in the current tree:
  - No PEM/private key blocks detected.
  - No obvious cloud access token patterns (AWS/GitHub/Slack/Stripe live keys, etc.).
  - No committed `.env` files observed.

## Notes on Public vs Private Keys
- `NEXT_PUBLIC_*` values are expected to be exposed to the client bundle by design.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` and OAuth client IDs are generally acceptable as public config.
- `SUPABASE_SERVICE_ROLE_KEY` must remain server-only and never be exposed to client code or public env prefixes.

## Residual Exposure Risk to Validate
- Current report is tree-based only; full secret history exposure requires dedicated scanning of git history, forks, CI logs, and deployment config snapshots.
- If any accidental historical leak is suspected, rotate affected keys immediately.

## Quality and Maintainability Findings
- `lib/storage.ts` is a large monolithic module handling many domains and error paths.
- Several storage flows log errors without clearly propagating failures to callers, increasing silent-failure risk.
- Admin auth helper/context logic is duplicated across admin route files.
- Large UI modules with weak typing (`any`) increase change risk and reduce confidence during refactors.

## Tooling, Testing, and Delivery Gaps
- No first-class test harness or test scripts were identified.
- No CI workflow enforcing lint/typecheck/build on pull requests.
- Formatting standards/tooling are not strongly enforced at repository level.
- Docs are partially stale versus actual architecture:
  - `app/api/*` usage and server-side env requirements are not consistently reflected.
  - Env template expectations are inconsistent with current files.

## Prioritized Remediation Plan

### P0 (Immediate)
- Close privilege-escalation path:
  - Restrict writes to privileged role fields at the DB policy/trigger level.
  - Ensure admin route trust source is not user-self-editable fields.
- Harden admin API responses:
  - Replace raw internal error relays with generic client-safe messages.
- Add minimum CI baseline:
  - Install/lint/typecheck/build checks on PRs.

### P1 (Short Term)
- Add focused tests:
  - Admin API authorization matrix (401/403/200).
  - Critical data-layer success/failure scenarios.
- Deduplicate admin authorization bootstrap/helper logic into one shared module.
- Update docs and env templates:
  - Document required server-only vars (`SUPABASE_SERVICE_ROLE_KEY`, admin allowlist vars) and current architecture.

### P2 (Medium Term)
- Modularize `lib/storage.ts` by domain to reduce coupling and review complexity.
- Improve typed error propagation contract from storage layer to UI.
- Add middleware/server-side protection for sensitive route classes.
- Add dependency and security automation (scheduled audit/dependency update tooling).

## Suggested Implementation Order
1. Security patch for admin role trust + DB policy hardening.
2. CI baseline + targeted admin API tests.
3. Documentation synchronization and `.env` template cleanup.
4. Storage modularization and broader type-hardening refactor.

## Verification Checklist
- Confirm users cannot elevate themselves to admin by profile updates.
- Confirm admin APIs reject non-admin tokens across all endpoints.
- Confirm no server-side secret appears in client bundle or `NEXT_PUBLIC_*`.
- Confirm CI blocks merges when lint/typecheck/build fail.
- Confirm docs match current architecture and required environment variables.

## Notes and Limitations
- This report is based on read-only static analysis of the current working tree.
- It does not replace runtime penetration testing, infrastructure review, or full historical secret scanning.

## Infrastructure Review (Quick)

### Current Infrastructure (Inferred From Repository)
- Application runtime is Next.js (`package.json` scripts: `dev`, `build`, `start`).
- Data/auth platform is Supabase (`lib/supabase.ts`, `supabase/migrations/*`).
- Privileged backend operations run through server route handlers in `app/api/admin/users/*`.
- Vercel usage is implied (`.vercel` ignored in `.gitignore`, `public/vercel.svg` present), but explicit deployment manifests are not committed.
- No in-repo CI/CD workflows were identified.

### Infrastructure Risks

#### High
- Missing CI quality gates:
  - No repository-enforced pipeline for install/lint/typecheck/build before merge.
- Service-role blast radius:
  - Admin APIs depend on `SUPABASE_SERVICE_ROLE_KEY`; any authorization weakness or secret misconfiguration increases impact significantly.

#### Medium
- Runtime hardening not encoded:
  - No middleware-based protection layer identified; `next.config.ts` hardening appears minimal.
- Environment/config drift risk:
  - Documentation and env template expectations are not fully synchronized with current admin/server requirements.

#### Low to Medium
- Observability limitations:
  - Error handling relies heavily on `console.*` patterns; no structured telemetry/error pipeline is evident from repo dependencies/config.

### Database and Platform Operations Review
- Strengths:
  - Ordered SQL migrations and broad use of RLS on core user tables.
  - Server route handlers validate Bearer token before privileged admin operations.
- Gaps:
  - No clear rollback strategy or migration automation workflow encoded in repo.
  - No in-repo DR guidance (backup/PITR/restore runbook cues).
  - No explicit rate-limiting layer for privileged admin endpoints.

### Infrastructure Quick Wins (Priority Order)
1. Add minimal CI workflow (install, lint, typecheck, build).
2. Add canonical `.env.example` with strict separation of public vs server-only variables.
3. Add baseline runtime hardening (`middleware` route checks and security headers policy).
4. Add rate limiting and safer error handling on admin endpoints.
5. Add basic observability (error tracking and structured logs).
6. Document deployment topology and backup/restore operations.

### Infrastructure Validation Checklist
- Confirm branch protection requires CI success before merge.
- Confirm privileged env vars are server-only in all deployment environments.
- Confirm admin APIs are protected by both authz checks and abuse controls.
- Confirm migration process is reproducible from clean environment to latest schema.
- Confirm recovery objectives with tested backup/restore process.
