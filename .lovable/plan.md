# HabitFlow LifeOS — Local-first self-hosting audit and staged plan

Scope: research only so far. Nothing was edited, deployed, downloaded, or changed in the database. Target: Zorin OS desktop (~8 GB RAM, 256 GB disk), all data stored locally, private AI through local Ollama, code on your GitHub.

## 1. Current architecture (checked in the code)

Verified:
- Frontend: React 18 + Vite 5 + TypeScript + Tailwind/shadcn, React Router, TanStack Query, TipTap editor, Recharts.
- Backend: everything goes through the hosted backend client (`@supabase/supabase-js`) in `src/integrations/supabase/client.ts`. 30 source files import it.
- Database: 46 migrations in `supabase/migrations/`, 28 tables (habits, daily_records, journal_entries, diary_entries, goals, milestones, weekly_plans, idea_cards/categories, scratch_pad, habit_workspace_items, app_shortcuts, badges/user_badges, user_levels/level_definitions, challenges + participants/invites, friend_requests, messages, groups/group_members/group_messages, notification_*, profiles, rate_limits). Row-level security and server functions (`award_badge_if_earned`, `update_challenge_progress`, `increment_xp`, `join_group_as_creator`, `add_group_member`, `check_rate_limit`, `are_friends`, `is_group_member`).
- Auth: email/password, password reset by email (`src/lib/supabase.ts`, `AuthForm.tsx`, `ResetPassword.tsx`).
- File storage: bucket `habit-files` used by `HabitWorkspaceDialog.tsx`.
- Realtime: `useRealtimeNotifications.ts`, chat and groups.
- Edge function: `supabase/functions/rate-limited-action` (Deno, imports from deno.land and esm.sh) used by `useFriends.ts` and `useChallenges.ts`.
- Offline: `src/lib/offlineDb.ts` (IndexedDB via `idb`), `useOfflineQuery.ts`, `useOfflineSync.ts`, `OfflineIndicator.tsx`. These exist but most feature hooks still call the backend directly, so offline editing is only partial.
- PWA: `vite-plugin-pwa` in `vite.config.ts`, caches backend REST calls 24h; service worker disabled in preview/iframes (`main.tsx`). Icons present in `public/`.
- LifeOS: `/dashboard` → `LifeOS.tsx` (tasks/projects/focus in `localStorage`); `/habits` → original Dashboard. Finance/Health/Learning are entry points only.

Every cloud/network dependency found:
1. Hosted backend URL + key in `.env` and `supabase/config.toml` (note: `.env` points at an old backend ID that does not match this project's current one — the app's backend link is currently inconsistent).
2. Edge function imports from `deno.land` and `esm.sh`.
3. `useAppShortcuts.ts` loads favicons from `google.com/s2/favicons` (leaks visited domains).
4. `index.html` og:image from `lovable.dev`.
5. `lovable-tagger` dev plugin (dev-only, offline-safe).
6. Auth emails (reset/confirm) depend on a hosted mail sender.
7. Current git remote is Lovable's internal storage, not GitHub.

Not verified (assumptions): exact contents of all RLS policies after the earlier sessions where tool calls failed; whether the badge/XP/challenge RPC migrations really landed; whether `useScratchPad` NodeJS type fix landed. Stage 0 checks these.

## 2. Recommended smallest local stack

Option A (recommended, lightest): single-user, browser-local.
- Keep the React app; replace the backend client with a local data layer on IndexedDB (Dexie or existing `idb`), served by `vite preview` or a tiny static server (Caddy or `npx serve`) on `127.0.0.1`.
- No database server, no auth server (local PIN/passphrase lock optional). RAM cost ~0 beyond browser.
- Social features (friends, chat, groups, challenges, leaderboards) have no meaning single-user: hide behind a feature flag, keep code.
- Backup: export/import JSON file + optional scheduled export to a folder.
- Risk: data lives in one browser profile; clearing site data loses it without backups.

Option B: local server, multi-device on LAN.
- Small Node (Hono/Fastify) + SQLite (`better-sqlite3`) on `127.0.0.1`, ~80–150 MB RAM. Port tables from Postgres SQL to SQLite; move RLS/RPC logic into server code; local session auth; files on disk.
- More work, more to maintain; needed only if you want phone + desktop sharing.

Option C (not recommended for 8 GB): full self-hosted Supabase in Docker (~2–4 GB RAM, ~10 containers). Preserves code nearly unchanged but heavy and fights the Ollama memory budget.

## 3. Ollama integration design

- Settings field: endpoint (default `http://127.0.0.1:11434`) and model name (free text, empty by default). Validate endpoint is loopback only (`127.0.0.1`, `localhost`, `::1`); refuse others.
- On save, call `GET /api/tags` to list installed models; user picks one. Never call `/api/pull`; no auto-download anywhere (enforced by a single client wrapper exposing only `tags`, `chat`/`generate`).
- Uses: weekly habit-wise summary, journal reflection, planner suggestions. Data assembled locally, sent only to the local endpoint, `stream: true`, timeout + cancel button.
- Ollama must allow the app origin: set `OLLAMA_ORIGINS=http://127.0.0.1:<port>` and keep `OLLAMA_HOST=127.0.0.1` (systemd override). Document only; you run it.
- RAM: with 8 GB, use 1–4B models (e.g. llama3.2:3b, qwen2.5:3b, gemma 2B q4) — your choice, you download manually. Expect ~2–3.5 GB while active; set `OLLAMA_KEEP_ALIVE=5m`.
- Graceful state when Ollama is off: "AI unavailable" message, app keeps working.

## 4. GitHub workflow and blockers

- Connect via Project settings → Git → GitHub (you do this; I cannot). Lovable creates a new private repo and syncs the default branch both ways. Existing repos cannot be imported.
- Then on Zorin: `git clone`, work on a feature branch, merge into the synced branch.
- Blockers: `.env` is tracked and contains backend keys (publishable only, but remove from repo and add `.env.example`); repo will contain 46 cloud-specific migrations (keep as reference under `legacy/`); no license/README for self-hosting.
- If you leave Lovable entirely, the sync no longer matters; the repo is plain Vite code.

## 5. Security risks (prioritized)

1. High: local data unencrypted at rest in browser/SQLite. Mitigate: full-disk encryption (Zorin LUKS), optional app passphrase with WebCrypto encryption of journal/diary.
2. High: Ollama exposed on LAN if `OLLAMA_HOST=0.0.0.0`. Mitigate: loopback bind, `ufw` deny 11434 inbound, strict `OLLAMA_ORIGINS`.
3. High: prompt injection via journal/link content into AI. Mitigate: AI output is display-only, never executes actions or fetches URLs.
4. Medium: data loss (browser storage eviction). Mitigate: `navigator.storage.persist()`, export/import, scheduled backups, restore test.
5. Medium: XSS through rich editor/links. Mitigate: keep TipTap sanitization, restrict link protocols to http/https/mailto.
6. Medium: favicon leak to Google. Mitigate: generic local icon.
7. Low: stale PWA cache of old backend responses; dependency vulnerabilities. Mitigate: cache rules for local only, `npm audit`, pinned lockfile.
8. Low: secrets in git history. Mitigate: untrack `.env`.

## 6. Staged plan

Stage 0 — Verify (read-only): confirm actual RLS/RPC state, routes, build status, which hooks use offline layer. Dependency: none.
Stage 1 — Repo hygiene: GitHub connection (you), untrack `.env`, add `.env.example`, `SELF_HOSTING.md`, `AGENTS.md` rules. Risk: low.
Stage 2 — Data-access abstraction: one `dataStore` interface per domain (habits, records, journal, diary, goals, planner, ideas, scratch pad, workspace, shortcuts, levels/badges, LifeOS). Current backend implementation behind it first, so nothing breaks. Risk: medium (30 files).
Stage 3 — Local implementation (Option A): IndexedDB schema mirroring the 28 tables' personal subset; port RPC logic (XP, badges, challenge progress) to local functions; files as IndexedDB blobs; local profile instead of auth. `VITE_DATA_MODE=local|cloud` switch. Social features flagged off in local mode.
Stage 4 — Migration tool: one-time export from current backend to JSON, import into local store (optional; you decide if old data matters).
Stage 5 — PWA/offline cleanup: remove backend cache rule in local mode, `storage.persist()`, backup/export UI.
Stage 6 — Ollama: settings, loopback-only client, model picker from `/api/tags`, AI insight panels on habits/journal/LifeOS.
Stage 7 — Desktop run: `npm ci && npm run build`, serve `dist/` on `127.0.0.1` via systemd user service; Ollama systemd override doc.
Stage 8 — Remove cloud dependency (optional, last): drop `@supabase/supabase-js` once local mode is proven.

Dependencies: Stage 2 before 3; 3 before 4–6; your GitHub connect before 1 finishes; Ollama install + model download by you before 6 testing.

## 7. Test/build checklist

- Add Vitest; unit tests for: streak calculation, Do/Don't habit success rates, XP/level thresholds, badge criteria, loopback-only endpoint validator, "no pull call" guarantee, export→import round-trip.
- `npm run lint`, `npm run build`, `tsgo` typecheck.
- Playwright smoke: create habit, mark done, journal entry, LifeOS task, reload, data persists; go offline, still works.
- Manual on Zorin: memory with Ollama loaded (<7 GB total), AI off state, backup restore, `ss -tlnp` shows only 127.0.0.1 listeners.

## Decisions needed from you
1. Option A (single-user browser-local) or B (LAN server + SQLite)?
2. Keep social features hidden in local mode, or remove?
3. Migrate existing cloud data, or start fresh?
