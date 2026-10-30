# CLAUDE.md — Honmoon (@greenblacksky/honmoon)

The engine under the three Mira apps: the music model, spaced repetition,
audio (synth, metronome, mic pitch detection), notation drawn as SVG, and
the Svelte screens the apps share. A library — it never runs on its own.
It began as Fretboard Fluency, a single 6,000-line HTML file, ported to
TypeScript and Svelte.

## The workspace (read this first)

Honmoon (the engine) and the three apps built on it, Mira, Rumi and Zoey,
are four separate repos. They are developed side by side in one npm
workspace: a parent folder, not in any repo, whose `package.json` lists
them and holds the one shared install:

```
<workspace>/            not a git repo — the local glue
  package.json          "workspaces": the projects below
  package-lock.json     the ONE lock file
  node_modules/         the ONE shared install
  huntrix/              a plain folder, no package.json
    honmoon/            the engine, @greenblacksky/honmoon
    mira/  rumi/  zoey/
```

- `@greenblacksky/honmoon` is linked to `../honmoon`, and its `package.json` points
  straight at the TypeScript/Svelte source in `src/lib`. There is no build
  or release step between engine and apps: an engine edit shows up in a
  running app at once. Apps depend on it by range (`"^0.4.0"`); a breaking
  engine change means bumping `honmoon`'s version and the ranges together.
- Everything on the phone comes from an app's `dist/` (`npm run build`),
  with the engine compiled in. The workspace only matters for development.
- Install only from the workspace root: `npm install` there. Never run
  `npm install` inside a project (it would create a stray lock file and a
  local `node_modules` that shadows the shared one).
- Every project pins the same tool versions (exact versions in each
  `package.json`). An upgrade is done in all of them at once, then
  everything is tested: `npm test` from the workspace root.
- Each project is its own git repo; the workspace and `huntrix/` are not.
- Outside the workspace (on GitHub, for example) the apps install the
  published package instead: see `honmoon/docs/PUBLISHING.md`.
- Machine-specific and personal notes live in the workspace's own
  CLAUDE.md, outside the repos. Keep this file free of them.

## Environment and tools

- Node 22. Editor settings (`.vscode/`) are git-ignored and machine-specific.
- Svelte 5 with runes (`$state`, `$derived`, `$effect`, `$props`); shared
  reactive state lives in `.svelte.ts` modules. TypeScript 6, Vite 8,
  `@sveltejs/vite-plugin-svelte` 7, svelte-check 4. Don't upgrade to
  TypeScript 7 (`@sveltejs/package` needs 6).
- Playwright is pinned to 1.56.1; first run needs
  `npx playwright install chromium`.

## Code style

- **Prettier** formats everything (`.prettierrc.json`: 100 columns, single
  quotes; `prettier-plugin-svelte` for `.svelte`). **ESLint** lints
  (`eslint.config.js`: recommended JS, typescript-eslint and Svelte rules,
  plus `curly: all`, `one-var: never`, `prefer-const`, unused names allowed
  only with a leading `_`). The four projects use identical configs — keep
  them in step.
- Before finishing a change: `npm run format`, `npm run lint` (0 errors),
  `npm run check`.
- The code was ported from a dense single-file original. A first
  readability pass is done across the engine and the apps: spelled-out
  local names, named constants instead of magic numbers, small helper
  functions, no nested ternaries. Short names remain where renaming would
  change the saved format or the public API (`Card.s/c/t/k`, Settings keys,
  shape fields like `s`/`f`/`n`, exports like `lvl`, `ivDef`, `FB`) — those
  are listed under "Code: deep refactors" in `honmoon/docs/ROADMAP.md`.
  Write new code in the spelled-out style; keep the order of random calls
  when refactoring (questions are reproducible with a seeded `Math.random`).
- `no-nested-ternary` is a warning; there are none left — don't add any.
- Generated files are excluded from formatting and linting:
  `notation/glyphdata.ts`, `notation/icons.ts`.

## Project notes

- Target is an Android phone: an installable PWA, later Firebase Hosting.
  Firebase is deliberately not implemented yet — only a stub.
- Names are a light nod to HUNTR/X from *KPop Demon Hunters*: Honmoon (the
  engine), Mira, Rumi, Zoey. Keep it a reference, not merchandise — no
  character art, no logos, no quotes.

## Commands (in this folder)

```
npm run check      svelte-check over src/ and tests/
npm run lint       ESLint (lint:fix fixes what it can)
npm run format     Prettier rewrites the layout of every file
npm test           vitest (tests/*.test.ts; passes when there are none)
npm run package    svelte-package → dist/ — only if ever published to a registry
```

To see a change, run an app (`npm run mira` from the workspace root) — it picks up
edits here live.

## Where things are

```
src/lib/
  index.ts          the public API: everything the apps import
  music/            notes and spelling, scales, clefs, intervals, rhythm,
                    voice warm-up data, bass warm-up generators
  notation/         SVG drawing: staff, fretboard, keyboard, rhythm, tab;
                    glyphdata.ts/icons.ts are generated data — don't hand-edit
  audio/            context, synth, metronome (.svelte.ts), pitch (NSDF), mic
  store/            honmoon.svelte.ts (the `honmoon` state object, saving,
                    import/export), types.ts, normalize.ts, sync.ts (Firebase stub)
  learn/            card pools, sampling, sessions, progress summaries
  drills/           defs (all drills and their how-to texts), registry
                    (which groups an app shows), questions, runtime, verdict
  ui/               Shell (header, tabs), widgets, and ui/screens/ (Practice,
                    Drill, Stats, Setup, the reference pages, Learn index…)
  styles/honmoon.css  the one stylesheet and the palette
  nav.svelte.ts     go('screen'), routes, hasRoute
```

## Conventions that matter

- **Saved progress format must not break.** Payload
  `{v, t, cards, daily, tempo, settings}` — the original app's `ff.v1`
  format, so old exports still import. Card ids are part of it:
  `fb:s:f`, `st:m` / `st:clef:m`, `tr:pc`, `pl:pc`, `md:k:pc`, `rh:…`,
  `iv:n`, `ch:id`, `se:id`, `sc:id:root`. Add new kinds with a new prefix;
  never rename existing ones. Each app saves under its own key
  (`honmoon.<app>.v1`), set by the app via `configureStore`.
- **Colours only through tokens** in `styles/honmoon.css`, for light and
  dark (the dark set appears twice: under `prefers-color-scheme` and under
  `[data-theme="dark"]`). Apps set only their accent, via
  `--accent-l/-d`, `--accent-ink-l/-d`, `--accent-soft-l/-d`. `--good`,
  `--mid` ("getting there") and `--bad` are the same in every app on
  purpose. Never hard-code a colour in a component.
- **The engine knows nothing about which app it is in.** Apps configure it
  (`configureStore`, `configureGroups`, `configureRoutes`) and pass props
  (Shell's `appName`, `icon`, `tabs`). Text that names an app should be a
  prop with a default, not a hard-coded string.
- **Android taps**: `ui/tapfix.ts` turns pointer events into clicks and
  swallows the duplicate trusted click; a new question ignores taps for its
  first 320 ms. Keep both in mind when adding interactive screens.
- User-facing wording is deliberate and was checked against the original;
  change it only on purpose.

## Planned next (see docs/ROADMAP.md for the full plan)

Nothing below is built yet. In order:

1. **Path and stages.** Each app becomes a path from easy to hard: stages of
   lessons + drills + a checkpoint. A stage opens when the previous one is
   ~80% solid and its checkpoint is passed. **Gentle locking** (decided):
   every lesson is always readable; only the daily session is limited to
   reached stages. Path position saved in the payload (new `path` field,
   old files must still import).
2. **Placement test** (decided: yes) — optional, 15–20 mixed questions on
   first opening a path; marks known stages done.
3. **Lesson format** shared by all apps: pages/tabs, pictures (existing
   drawing code), tap-to-hear sound examples, a "try it" section, videos.
   Zoey's existing reference pages move to it.
4. **YouTube**: embedded via youtube-nocookie, playing a start–end segment;
   offline → "open in YouTube" link. Video lists in a per-app data file.
   Videos are found by searching and approved by hand — never URLs
   from memory.
5. **New drill kinds**, all as spaced-repetition cards: knowledge (multiple
   choice + explanation, ids like `kn:<lesson>:<n>`), ear (synth-generated
   comparisons), and mic-measured technique (pitch stability, breath length,
   swells, onsets/scoops, siren smoothness, vibrato rate/width; bass
   note-length/muting as experimental).
6. **5-string bass** (for Mira): a `strings` setting (default 4, via a
   normalizer); `STRINGS` becomes the chosen instrument's open strings with
   the low B **appended** as index 4, so `fb:s:f` card ids stay valid.
   Remove the four-string assumptions in `music/bass.ts`, `music/clefs.ts`,
   `notation/fretboard.ts`, `ui/scaleboard.ts`, `music/warmups.ts`,
   `drills/questions.ts` and tab drawing; extend the staff range down to the
   written low B. Describe instruments as lists of open strings so high-C
   5-string or 6-string can follow.
7. **Songs** (for Rumi and Mira), after stage 1 of the paths:
   - Pick an audio file on the phone. The app separates the parts (Demucs
     htdemucs, WebGPU) and finds the notes (Basic Pitch). It stores the
     song on the phone (OPFS/IndexedDB, apart from the progress payload).
   - Then you sing or play along: part volumes, loop, slow down, transpose,
     a note lane with the mic drawn on top, piano playback; later a note
     editor and sheet music or tab.
   - Never downloads from YouTube; a video link is only kept for watching.
   - Step 0 is a phone test of separation speed. If the phone is too slow,
     a Cloud Run service does that one step.
8. Later: publishing to npm so the apps can build on GitHub
   (`docs/PUBLISHING.md`);
   Capacitor for a native Android wrapper.

## Google backend: Firebase (planned, not started)

Firebase is the chosen hosting and backend. Not to be implemented
until asked; `src/lib/store/sync.ts` is the placeholder, and its
`SyncAdapter` interface is the seam. The intended design:

- **One Firebase project for all three apps** (e.g. `huntrix`), so a person
  is the same user everywhere.
- **Hosting**: one Hosting *site* per app (multi-site hosting), each serving
  that app's `dist/` at its own address, so each installs as its own PWA.
  Deploy config (`firebase.json`, `.firebaserc`) lives in each app's repo.
  HTTPS also unblocks the microphone on the phone. Hosting can come early,
  independently of everything else.
- **Auth**: Firebase Authentication with Google sign-in. In an installed PWA
  use the redirect flow, not popups, with the auth domain on the app's own
  Hosting address. Signing in is optional — without it everything keeps
  working locally, as now.
- **Firestore**: one document per user per app,
  `users/{uid}/apps/{appId}`, holding the existing payload unchanged (tens of
  KB at most). `load()` reads it at start-up, `save()` writes it after each
  debounced local save. Offline persistence on, so practice without signal
  syncs later. Conflicts: the copy written last wins (the payload's `t`),
  which is what the store already does on load.
- **Security rules**: a user can read and write only `users/{their uid}/…`.
  The web config object from the Firebase console is public by design and
  may be committed; the rules are what protect data.
- **Engine side**: implement `FirebaseSync` here with the modular Firebase
  JS SDK (`firebase/app`, `firebase/auth`, `firebase/firestore`), loaded
  lazily so the apps stay small for anyone not signed in. A shared
  "Sync across devices" card for Setup (sign in / out, account shown);
  Stats already shows `syncLabel()`.
- **App side**: each app passes its Firebase web config and `appId` to
  `configureStore({ key, sync: new FirebaseSync(…) })`.
- **Later, optional**: a `users/{uid}/shared` document for things more than
  one app uses (vocal range, tap calibration, preferences); lesson video
  lists served from Firestore so a dead link can be fixed without a
  redeploy. No analytics unless asked.
- **Tooling**: `firebase-tools` as a dev dependency in the workspace (run
  with `npx firebase …`), not a global install; the Firebase Emulator Suite
  for local testing of rules and sync. The free Spark plan should be
  plenty for personal use.
