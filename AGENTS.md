# AGENTS.md

- Data mode comes from `src/lib/appMode.ts`; local is the default and cloud is opt-in via `VITE_DATA_MODE=cloud` — the app must self-host with no cloud runtime dependency.
- In local mode nothing may statically import `@/integrations/supabase/client`; cloud-only pages/components are loaded via `lazy()`/dynamic `import()` — so local mode never initializes auth, realtime or sync network calls.
- Feature data goes through a store contract (e.g. `src/lib/data/habitStore.ts`) with local (IndexedDB) and cloud implementations — so features migrate to local one vertical at a time.
- Local IndexedDB layout lives in `src/lib/local/localDb.ts`; bump `LOCAL_SCHEMA_VERSION` and add an additive upgrade step for changes, never drop user data — so existing on-device data survives upgrades.
- Backups are validated by `src/lib/local/backup.ts` (version, size, references) and imported in a single transaction — so a bad file can never partially overwrite data.
- No third-party network lookups (favicons, remote images, fonts) in local mode — privacy and offline use.
- Unit tests use Vitest + fake-indexeddb (`npm test`) next to the code they cover.
