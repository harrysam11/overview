# Supabase Cloud Backend

Project: `tptwhamashnikffubjpd` (Mumbai / ap-south-1)  
Production app: https://overview-silk.vercel.app

## Data modes

HabitFlow remains **local-first**. `VITE_DATA_MODE=local` is the production default and keeps supported personal data in the encrypted browser vault. It does not initialize the Supabase client.

Set `VITE_DATA_MODE=cloud` only when intentionally enabling Supabase Auth and cloud-backed stores. Cloud mode uses the public publishable key only; never put a Supabase service-role or secret key in Vite variables.

## Cloud schema

The initial backend migration is applied to the Supabase project as `habitflow_cloud_schema` (migration version `20261127022629`). Follow-up hardening/index migration: `habitflow_security_and_fk_indexes`, followed by `habitflow_fk_index_completion`.

The schema includes profiles, habits/check-ins/journal, planner, goals/milestones, diary and habit tags, ideas, scratch pad, badges/levels, shortcuts, challenges/invites/participants, friend requests, direct/group messaging, notification preferences/subscriptions, habit workspace items, and rate-limit tracking.

All 29 public tables have RLS enabled. Personal records are owner-scoped; social records have participant/member policies. Badge and level definitions are seeded. Client roles cannot directly read or write the rate-limit table.

## Enable cloud mode

1. In Supabase Dashboard → Authentication → URL Configuration, set Site URL to `https://overview-silk.vercel.app`.
2. Add `https://overview-silk.vercel.app/**` to the Redirect URLs allowlist. Add trusted preview URLs only if you actually use them.
3. Confirm the Email provider is enabled and review email-confirmation behavior.
4. In Vercel project `overview`, set `VITE_DATA_MODE=cloud` for the intended environment. `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and `VITE_SUPABASE_PROJECT_ID` are already configured for production, preview, and development.
5. Redeploy after changing Vite environment variables.

## Scope and data safety

Cloud mode supports the existing cloud stores and social experience. Notes, finance, and virtual files are still local-only in the current application. Do not assume those datasets sync to Supabase.

Changing the Vercel data mode does not automatically upload an existing device's encrypted local vault. Export an encrypted local backup before changing modes; do not delete or overwrite the local vault. The app currently has a legacy cloud-to-local import path, not a complete local-to-cloud bulk migration workflow.

## Security notes

- Browser code must use only the Supabase publishable key.
- Never add a service-role/secret key to `VITE_*` variables or commit one.
- RLS is enabled on all public tables.
- Security Advisor reports intentional authenticated execution of 13 narrowly scoped SECURITY DEFINER routines used for RLS-safe membership checks and guarded server-side actions. Their search paths are fixed and execute privileges are explicitly granted to authenticated users only where needed.
- Re-run Supabase Security and Performance Advisors after schema changes.
