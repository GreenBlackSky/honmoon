# Honmoon

The engine behind three apps: **Mira** (bass), **Rumi** (voice) and **Zoey**
(theory) — the music model, spaced repetition, audio, notation drawing, and
the screens the apps share. The names are a nod to HUNTR/X from *KPop Demon
Hunters*: three members, and the Honmoon that all three of them hold up.
It is a library, not an app — you never open it on its own.

It started life as Fretboard Fluency (one 6,000-line HTML file) and was
carried over to TypeScript and Svelte.

## What's where

```
src/lib/
  music/      notes and spelling, scales and their fingerings, clefs, intervals,
              rhythm, voice warm-up data, bass warm-up exercise generators
  notation/   drawing as SVG: staff, fretboard, keyboard, rhythm, tab, glyphs
  audio/      the synth voices, metronome, rhythm playback, mic pitch detection
  store/      what is remembered (types, saving, Firebase placeholder)
  learn/      card pools, sampling, sessions, progress summaries
  drills/     the 39 drills: definitions, question makers, answering, verdicts
  ui/         Svelte components: the app shell, fretboard/keyboard/staff widgets,
              and the shared screens (Practice, Drill, Stats, Setup, references…)
  styles/     honmoon.css — the one stylesheet all three apps use, and the
              palette: a shared night base, fixed progress colours
              (--good / --mid / --bad) and an accent each app sets itself
  nav.svelte.ts   which screen is showing, and go('name') to change it
  index.ts        everything the apps import
tests/                *.test.ts files, run by Vitest (none yet)
```

## Working on it

Honmoon lives in `apps/huntrix/` next to the three apps, and is installed
together with them: run `npm install` once in the `apps` folder (see
`apps/README.md`). Then, in this folder:

```
npm test           the tests in tests/ (passes when there are none)
npm run check      TypeScript and Svelte type checking
npm run lint       code problems (ESLint); lint:fix repairs what it can
npm run format     tidy the layout of every file (Prettier)
```

## How the apps get it

The workspace links
`@greenblacksky/honmoon` in its `node_modules` straight to this folder, and
`package.json` points the apps at the TypeScript and Svelte source in
`src/lib` — so there is nothing to build or release: save a file here and
every running app reloads with the change.

The version number still matters. Each app asks for a range
(`"@greenblacksky/honmoon": "^0.4.0"`), and the workspace only links this folder
when its version fits. For a change the apps must adapt to, bump it
(`npm version minor`), update the range in each app, and once the repos
are on GitHub tag the commit, so you can always tell which engine an app
was tested with.

Building an app outside the workspace (for example, automatic
builds on GitHub) needs Honmoon published to a package registry. How to do
that (publicly on npmjs.com, or privately on GitHub Packages), and the GitHub Actions pipeline for
the apps, is in [docs/PUBLISHING.md](docs/PUBLISHING.md).

## Tests

The parity tests that checked the port against the original app were
removed once the migration was done. New tests go in `tests/` as
`something.test.ts` and run with `npm test`.

## Saving and Firebase

Progress is saved in the browser (`localStorage`, one key per app). The
format is the original app's, so a file exported from either can be imported
into the other. `src/lib/store/sync.ts` holds `FirebaseSync`, a placeholder
with the shape the real thing will have; the plan for it is written at the
top of that file.

## Licence

MIT — see [LICENSE](LICENSE).
