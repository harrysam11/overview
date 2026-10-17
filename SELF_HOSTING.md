# Self-hosting HabitFlow LifeOS (local mode)

Local mode is the default. Supported data stays in your browser (IndexedDB) on your machine; no account, no cloud requests.

## Run on Zorin OS / Ubuntu (verified commands)

Requires Node.js 20+ (tested with Node 22).

```bash
git clone <your-github-repo-url> habitflow && cd habitflow
npm ci
npm test          # unit tests for the local data layer
npm run build     # outputs dist/
npx vite preview --host 127.0.0.1 --port 4173
```

Open http://127.0.0.1:4173. Bind to 127.0.0.1 only so the app is not reachable from your network.
Data is tied to that exact address and browser profile: always use the same URL and browser.

For development: `npm run dev` (port 8080).

## What works locally

| Area | Local mode |
|---|---|
| Habits (do/don't), daily check-ins, edit name/notes | Yes (IndexedDB) |
| Daily journal, calendar, points, streaks | Yes |
| Analytics charts, habit-wise analysis | Yes |
| LifeOS home: tasks, projects, focus | Yes (browser localStorage) |
| Backup/restore (habits, check-ins, journal) | Yes, `/data` page, JSON, max 10 MB |
| Planner, goals roadmap, universal diary, ideas | Not yet (shows a notice) |
| Badges, levels, scratch pad, app shortcuts, settings | Not yet (cloud tracker only) |
| Friends, chat, groups, challenges, leaderboards | Off by design (need other users) |
| Habit workspace files | Off (needs cloud file storage) |
| Accounts / sign in | Not used locally |

Note: LifeOS tasks/projects are not included in the JSON backup yet.

## Known limitations

- Clearing site data for the app's address deletes local data. The app asks the browser to keep data (`navigator.storage.persist()`), but the browser may decline. Export backups regularly.
- Data is not encrypted by the app. Use full-disk encryption on your computer.
- No sync between devices.
- Existing cloud data is not migrated (decision deferred).
- The offline app-install (PWA) caches the app; after upgrades, reload twice if the old version shows.

## Cloud mode (opt-in, legacy)

Set `VITE_DATA_MODE=cloud` plus the backend values from `.env.example` in `.env.local`, then rebuild. All original features return. Local mode never loads this code.

## Remaining cloud dependencies in the codebase (only used in cloud mode)

- `@supabase/supabase-js` client (`src/integrations/supabase/`), used by the original pages and hooks: Dashboard, Social, IdeasBoard, WeeklyPlanner, GoalRoadmap, Diary, Auth, ResetPassword, settings, badges, levels, chat, friends, groups, challenges, shortcuts, scratch pad, offline sync.
- `src/lib/data/cloudHabitStore.ts` (cloud implementation of the habit data contract).
- `supabase/migrations/` and `supabase/functions/rate-limited-action` (server-side, not used locally).
- Hosted email for sign-up/password reset.
