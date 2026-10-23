# Milk Coma

Offline-first feeding & sleep tracker built with SvelteKit, synced across devices via Supabase, packaged for Android with Capacitor.

## How it works

- Every log entry is written to a local IndexedDB store first (`src/lib/db.js`), so the app works with no connection.
- A sync layer (`src/lib/sync.js`) pushes unsynced local entries to Supabase and pulls remote changes down, with last-write-wins conflict resolution on `updated_at`.
- A Supabase realtime subscription pushes changes from other devices into the local store live.
- Auth is email magic-link (no passwords) via Supabase Auth. You can log entries before signing in — they'll sync once you do.

## Setup

1. **Create a Supabase project** at supabase.com.
2. Run `supabase-schema.sql` in the Supabase SQL editor to create the `entries` table, RLS policies, and enable realtime.
3. Copy your project URL and anon key from Settings > API into `src/lib/supabase.js`.
4. Install dependencies:
   ```
   npm install
   ```
5. Run in browser to test the core logic first:
   ```
   npm run dev
   ```

## Packaging for Android

1. Build the static site:
   ```
   npm run build
   ```
2. Add the Android platform (first time only):
   ```
   npx cap add android
   ```
3. Sync the web build into the native project:
   ```
   npm run cap:sync
   ```
4. Open in Android Studio to run on a device/emulator:
   ```
   npm run cap:open
   ```

You'll need Android Studio installed for step 4 (it provides the SDK/build tools), even though you won't be writing Kotlin.

## Next steps to consider

- Add a "notes" field UI (side/type for feeding, quality for sleep) — the schema already supports it.
- Add simple stats: time since last feeding, total sleep today.
- Add local notifications (Capacitor's `@capacitor/local-notifications`) for feeding reminders.
- Tighten conflict resolution if you expect simultaneous edits from two devices at once (current last-write-wins is fine for sequential use, which is the common case for this kind of app).
