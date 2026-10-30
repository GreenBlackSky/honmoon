# Honmoon — roadmap

Planned, not built yet. This is the engine side of the plan; what each app
teaches is in its own `docs/ROADMAP.md` (mira, rumi, zoey).

## The idea

Each app becomes a **path from easy to hard**: a handful of stages, each
with a few lessons, the drills that go with them, and a checkpoint. The
existing drill families get spread over the stages, so a new user is never
shown everything at once.

## 1. Path and stages

- A **stage** has: lessons, drills, and a **checkpoint** (a short mixed test).
- The next stage opens when the current one is mostly solid (about 80% of
  its drills mastered) and its checkpoint is passed.
- **Gentle locking** (decided): every lesson can always be opened and read.
  Only the **daily session** stays inside the stages you have reached.
- Where you are on the path is saved with the rest of progress (a new
  `path` field in the saved payload; old files still import).
- The path screen shows the stages in order, what is done, what is next.

## 2. Placement test (decided: yes)

Optional, offered when an app's path is first opened: 15–20 mixed questions
drawn from every stage. Stages you clearly know are marked done and you
start further along. Skipping it starts you at stage 1.

## 3. Lessons

One lesson format shared by all three apps (Zoey's existing reference pages
move to it):

- pages or tabs of short text, with pictures (staff, fretboard, keyboard,
  rhythm — the drawing code already exists)
- **sound examples** to tap and hear, made by the synth where possible
- a **try it** section at the end (like the degrees page has now)
- **videos** (below)
- for techniques: what it is · how it feels · a safe step-by-step exercise ·
  what to avoid · examples

## 4. YouTube

- Embedded player inside the lesson, privacy-friendly mode
  (youtube-nocookie), playing **just the relevant segment** (start–end).
- Without internet: shown as an "open in YouTube" link instead.
- Videos live in a separate data file per app — a deleted video is a
  one-line swap.
- Videos are found by searching when a stage is built, and approved before
  they go in. Never links from memory.

## 5. Drills that check the knowledge

Three kinds, depending on what the app can actually observe. All of them
are cards in spaced repetition and feed the daily session like the existing
drills.

1. **Knowledge** — multiple choice with a short explanation after answering.
   Card ids like `kn:<lesson>:<n>`.
2. **Ear** — the app plays something, you say what it is (made by the synth:
   swing/straight, flat/sharp/in tune, vibrato/straight tone, ghost note or
   not…).
3. **Doing it** — measured through the mic or by timing taps:
   - pitch stability on a held note (cents over time)
   - breath length and evenness (a hiss)
   - a controlled swell (loudness up and down)
   - clean onsets vs scooping into the note
   - a siren through the range: smooth, or a jump at the break
   - vibrato speed and width
   - for bass: whether a note stops when it should (muting) — experimental

The app cannot see hands or posture; those topics get knowledge questions
and advice (mirror, record yourself) instead.

## 5-string bass (for Mira)

A setting for 4 or 5 strings (5 = low B: B E A D G); the details of what
Mira teaches are in Mira's roadmap. Engine work:

- `STRINGS` in `music/bass.ts` becomes the strings of the chosen
  instrument instead of a fixed list of four. The low B is **appended**
  (G=0, D=1, A=2, E=3, B=4), so existing card ids `fb:s:f` keep their
  meaning and saved progress stays valid.
- Replace the places that assume four strings: loops in `music/bass.ts`,
  `music/clefs.ts`, `notation/fretboard.ts`, `ui/scaleboard.ts`, the warm-up
  generators in `music/warmups.ts`, random string picks in
  `drills/questions.ts`, and tab drawing (five lines).
- The staff range extends down to the written low B (ledger lines below the
  bass clef).
- A new `strings` setting (default 4) added through a normalizer, so old
  payloads load unchanged.
- Leave room for later variants (high-C 5-string, 6-string) by describing an
  instrument as a list of open strings rather than a count.

## Songs: load a song, separate it, sing or play along (Rumi and Mira)

You pick an audio file on your phone. The app separates the voice and the
bass from the rest and works out their notes. It keeps the song on the
phone, to practise with offline: sing or play along with the part, without
it, or while reading the notes.

**From the phone, start to finish.** Songs → Add song → the phone's file
picker → a "Preparing…" screen with progress → the song in your list.
Nothing needs a PC.

**Not from YouTube.** YouTube's terms forbid downloading audio unless
YouTube offers it or the rights holder agrees, and a web app cannot read
the sound of an embedded player anyway. Songs come from files you own
(bought MP3s, CD rips, Bandcamp downloads). A song can keep a link to its
official video, to watch in YouTube; the app never fetches the audio from
it.

### The pipeline

1. **Separate:** Demucs v4 (htdemucs, MIT licence) splits vocals, bass,
   drums and the rest. A browser build exists: ONNX, about 126 MB, run on
   the graphics chip through WebGPU
   (huggingface.co/monteslu/htdemucs-web-onnx). It has only been measured
   on a desktop graphics card, where a song takes seconds.
2. **Find the notes:** Basic Pitch from Spotify (TypeScript, Apache 2.0,
   github.com/spotify/basic-pitch-ts) turns the vocal or bass part into
   notes with pitch bends. It is light enough for a phone.
3. **Tidy:** find the tempo and beats, snap notes to the beat, guess the
   key. Reduce the vocal to one melody line.
4. **Store:** the parts as compressed audio (Opus or AAC through WebCodecs,
   roughly 10–20 MB per song), plus a small notes file. Kept in the app's
   own storage (OPFS / IndexedDB), with `navigator.storage.persist()` asked
   so Android does not clear it.

### Where the heavy step runs — decided by a test first

- **On the phone** (preferred): Chrome on Android has had WebGPU since 2025,
  on Android 12+ with a reasonably recent graphics chip. On a phone, speed
  and memory are unknown. While preparing, the app must stay open on
  screen, because Android pauses background tabs; the Wake Lock API keeps
  the screen on.
- **A small cloud service** (fallback): the phone uploads the file and gets
  the parts and notes back, and the server deletes its copy at once. A
  Python service with Demucs and Basic Pitch on Google Cloud Run, next to
  the Firebase project. Cloud Run's free allowance is 180,000 vCPU-seconds
  a month, likely dozens of songs, but it needs a billing account. Adding a
  song then needs internet; playing never does.
- **Step 0 is a test page**: separate a 30-second clip on the target
  phone, and report whether WebGPU is there, the time taken and whether
  memory ran out. That settles the choice above.

### Expect approximate transcriptions

- K-pop vocals come out with doubled voices, harmonies, ad-libs and members
  trading lines. Singers slide and push the rhythm. Most pitches should be
  right; the rhythm will need fixing.
- So a **scrolling note lane** comes first (karaoke-style bars, with the
  mic's pitch drawn on top), not sheet music. It forgives timing
  errors and reuses the existing pitch detection.
- A small **note editor** is part of the plan: delete, move, lengthen,
  merge. Without it a wrong note stays wrong forever.
- **Sheet music** (staff, and tab for Mira) after that, using a notation
  library (VexFlow or OpenSheetMusicDisplay) rather than the engine's
  single-note staff drawing.

### The player

- a volume per part: with the vocal or bass, without it, or quiet
- loop a section
- slow down without changing the pitch, and transpose (needs a
  time-stretch / pitch-shift library, to be chosen)
- the extracted part played on the piano synth
- the note lane with the mic drawn on top; later, a score for how closely
  you followed the line
- count-in and the metronome over the song, using the tempo found

### Data

- Songs are kept apart from the progress payload: they are big, and the
  `{v, t, cards, daily, tempo, settings}` format stays as it is.
- A song package holds:
  - title, artist and an optional video link
  - length, tempo, beat times and key
  - references to the stored parts
  - the notes (time, length, midi, bends), with string and fret for bass
- Backup: export and import a song package, since clearing Chrome's site
  data would delete the songs.
- The audio never goes to Firebase (copyright, size). The notes files might
  sync later.

### Order

1. The phone test page (step 0).
2. Import, separation and storage, and the parts player (volumes, loop,
   slow down).
3. Notes: the note lane, the mic overlay, piano playback and transpose.
4. The note editor.
5. Sheet music, and tab for Mira.
6. Later: scoring, the backup export, syncing notes.

This is a big feature, bigger than any single stage, so it comes after
stage 1 of the paths. The phone test can be done at any time.

## Build order

1. Engine: path and stages, lesson format with video, knowledge drills,
   placement test. Then **stage 1 of all three apps** as the first complete
   slice.
2. One stage at a time per app, adding the ear drills as they come up.
3. The mic-measured drills last — they need testing on a real phone.
4. Songs (above) after stage 1; its phone test can come at any time.

## Google backend: Firebase

Planned, not started — to begin only when asked.

1. **Hosting** (can come early, independent of the rest): one Firebase
   project, one Hosting site per app, each serving that app's `dist/`, so
   each installs as its own PWA on the phone. HTTPS also makes the
   microphone work there.
2. **Sign-in**: Firebase Authentication with Google, optional. Redirect
   flow in the installed app. Without signing in, everything keeps working
   in the browser as now.
3. **Sync**: Firestore, one document per user per app —
   `users/{uid}/apps/{appId}` — holding the existing progress payload.
   Offline persistence, last-written copy wins. Security rules: each user
   reads and writes only their own documents. Implemented as `FirebaseSync`
   in `src/lib/store/sync.ts`, behind the existing `SyncAdapter` interface,
   with the Firebase SDK loaded only when needed; a shared "Sync across
   devices" card in Setup.
4. **Later, optional**: a shared per-user document for things several apps
   use (vocal range, tap calibration, preferences); lesson video lists
   served from Firestore so a dead link can be fixed without a redeploy.

Tooling: `firebase-tools` as a workspace dev dependency (`npx firebase`),
and the Firebase Emulator Suite for testing locally.

## Code: deep refactors left from the readability pass

The first readability pass is done: local names spelled out, magic numbers
named, long functions split into small ones, nested ternaries gone (ESLint
reports none). What follows was too big to do in passing — each needs its
own change, and most need tests first.

1. **Two likely compound-time (6/8) bugs from the original.** Check by ear
   before fixing; both are marked with a comment in the code.
   - `audio/rhythmplay.ts`, `rhPlay`: in 6/8 one click is made three
     sixteenths long (`secondsPerBeat / 3`), though the comment says the
     click is the dotted quarter (six sixteenths). Only two beat clicks are
     laid under a twelve-sixteenth bar, so they cover half of it.
   - `notation/rhythmsvg.ts`, `tapTimeline`: in compound time the beat
     ticks are drawn every three sixteenths — neither every eighth nor every
     dotted quarter.
2. **Unit tests for the engine.** There are none of its own; the migration
   checks against the original app lived outside the repo and are gone.
   Worth having before items 3–6: the question makers, `verdictOf`,
   spelling (`music/scales.ts`), rhythm generation and grading, the store's
   load/merge. Every random choice goes through `Math.random`, so a seeded
   generator gives repeatable questions.
3. **Short field names in saved data.** Card `{s, c, t, k}` (seen, correct,
   time, mastery), the daily log `{n, c, ms}`, tempo records and the
   Settings keys (`slen`, `woff`, `sdoff`, `rlat`, …) are part of the saved
   format, so renaming them needs a version bump of the payload and a
   migration on load (old exports must still import). Doc comments explain
   them for now.
4. **Short field names in shared shapes.** `s`/`f` (string, fret), `m`
   (midi), `fin`, `l`/`a` (letter, accidental), `g`, `n` (name), `sb`,
   `iv`/`dg` (a scale's intervals and degrees), `u`/`ev`/`cmp` (rhythm),
   and the `Question` fields (`opts`, `sopts`, `ropts`, `gspu`…). Used
   everywhere, engine and apps; a rename is mechanical but touches most
   files, so do it as one change per shape with the type checker as the net.
5. **Cryptic exported names.** `lvl`, `vhi`, `rnd`, `ivDef`, `chDef`,
   `rvalDef`, `RHL`, `HST`, `FB`, `KB`, `IC`, `XS`, `DEGT`, `RCAL`, `FOLD`,
   `MAJIV`, `DEGMAP`… Part of the public API in `index.ts`, so renaming
   means changing the apps in the same step.
6. **Split `DrillScreen.svelte`** (about 1,100 lines, one `{#if}` branch per
   question kind, `q` read hundreds of times). One small component per
   family of kinds — note, staff, rhythm, ear, scale — with the shared
   header, answer area and verdict left in DrillScreen.
7. **SVG built as strings.** `notation/*` and `ui/scaleboard.ts` assemble
   SVG and HTML in template strings and the screens inject them with
   `{@html}`. Moving the drawings to Svelte components would give type
   checking of the markup and no escaping concerns; a large change, and the
   pixel output has to stay the same.

## Later, not part of this plan

- Publishing Honmoon to npm, so the apps can be built on GitHub
  (`docs/PUBLISHING.md`).
- Capacitor, if a real Android app is wanted besides the PWA.
