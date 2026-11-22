# Self-hosting HabitFlow LifeOS (local mode)

Local mode is the default. Habits, check-ins, journal, tasks and projects stay on this computer in an encrypted browser vault; no account or cloud requests are needed.

## Run on Zorin OS / Ubuntu (verified commands)

Requires Node.js 20+ (tested with Node 22).

```bash
git clone <your-github-repo-url> habitflow && cd habitflow
npm ci
npm test          # unit tests for the local data layer
npm run build     # outputs dist/
npx vite preview --host 127.0.0.1 --port 4173
```

Open http://127.0.0.1:4173. Keep the app bound to 127.0.0.1 so it is not reachable from your network.
Data is tied to that exact address and browser profile: always use the same URL and browser. Secure browser encryption requires localhost or HTTPS.

For development: `npm run dev` (port 8080).

## What works locally

| Area | Local mode |
|---|---|
| Habits (do/don't), daily check-ins, edit name/notes | Yes (IndexedDB) |
| Daily journal, calendar, points, streaks | Yes |
| Analytics charts, habit-wise analysis | Yes |
| LifeOS home: tasks, projects | Yes (encrypted browser vault) |
| Backup/restore (habits, check-ins, journal, tasks, projects) | Yes, `/data` page, passphrase-encrypted JSON, max 10 MB |
| Planner, goals roadmap, universal diary, ideas | Not yet (shows a notice) |
| Badges, levels, scratch pad, app shortcuts, settings | Not yet (cloud tracker only) |
| Friends, chat, groups, challenges, leaderboards | Off by design (need other users) |
| Habit workspace files | Off (needs cloud file storage) |
| Accounts / sign in | Not used locally |

## Known limitations

- Clearing site data for the app's address deletes local data. The app asks the browser to keep data (`navigator.storage.persist()`), but the browser may decline. Export backups regularly.
- A passphrase is required to create and unlock the encrypted vault; it is never saved. The app locks after ten minutes idle, when the tab is hidden, or when you press Lock.
- Forgotten passphrases cannot be recovered. The app cannot recover encrypted data without the correct passphrase. Keep the passphrase safe and test a backup.
- New backups are encrypted and include tasks/projects. Older plaintext backups can be imported after a clear warning; they are validated and stored in the encrypted vault.
- Encryption protects stored data at rest; it does not protect a computer with malware, an already-unlocked browser, weak passphrases, or unencrypted system swap/hibernation. Use full-disk encryption and a strong unique passphrase.
- No sync between devices.
- Existing cloud data is not migrated (decision deferred).
- The offline app-install (PWA) caches app files only; private cloud API responses are never placed in its cache. Local serving adds a restrictive content policy and binds only to loopback.
- Only habits, check-ins, journal entries, tasks and projects are available locally and encrypted. Planner, goal roadmap, ideas, social features, badges/levels, scratch pad and cloud accounts remain unavailable in local mode until migrated.

## Cloud mode (opt-in, legacy)

The legacy online mode is not part of the self-hosting setup. Do not add cloud credentials to a local installation. Local mode never loads cloud-only code.

## Remaining cloud dependencies in the codebase (only used in cloud mode)

- `@supabase/supabase-js` client (`src/integrations/supabase/`), used by the original pages and hooks: Dashboard, Social, IdeasBoard, WeeklyPlanner, GoalRoadmap, Diary, Auth, ResetPassword, settings, badges, levels, chat, friends, groups, challenges, shortcuts, scratch pad, offline sync.
- `src/lib/data/cloudHabitStore.ts` (cloud implementation of the habit data contract).
- `supabase/migrations/` and `supabase/functions/rate-limited-action` (server-side, not used locally).
- Hosted email for sign-up/password reset.
