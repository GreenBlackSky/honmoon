<!-- Every note on the staff in order, what it is called, and where it lives on the neck. -->
<script lang="ts" module>
  /** The selected note (written pitch, starts on A2) and clef; kept across visits. */
  const ref = $state({ sel: 45, clef: 'bass' as string });
</script>

<script lang="ts">
  import { honmoon } from '../../store/honmoon.svelte';
  import { STRINGS, placesForMidi } from '../../music/bass';
  import {
    clefDef,
    clefLines,
    clefRange,
    clefSpaces,
    diatonicMidi,
    enabledClefs,
  } from '../../music/clefs';
  import { bothNames, noteName, pcOf } from '../../music/notes';
  import { piano, pluck } from '../../audio/synth';
  import { RUN, clefW } from '../../notation/staff';
  import { hscroll } from '../actions';
  import Fretboard from '../Fretboard.svelte';
  import StaffRun from '../StaffRun.svelte';
  import RefBar from '../RefBar.svelte';

  const { back }: { back?: { label: string; to: string } } = $props();

  /** The natural notes from E2 to G4: open E string to the 12th fret of the G string. */
  const BASS_NATURALS = [40, 41, 43, 45, 47, 48, 50, 52, 53, 55, 57, 59, 60, 62, 64, 65, 67];
  /** The open strings, low to high: the four landmarks of the bass staff. */
  const OPEN_STRINGS = [...STRINGS].reverse().map((string) => string.open);
  const OCTAVE = 12;
  /** Diatonic steps from the bottom line of a staff to its middle and top lines. */
  const MIDDLE_LINE_STEPS = 4;
  const TOP_LINE_STEPS = 8;
  /** Room after the clef, and after the last note, in the staff run's units. */
  const RUN_MARGIN = 14;
  const refRun = (clef: string) => (clef === 'bass' ? BASS_NATURALS : clefRange(clef));
  const pref = $derived(honmoon.settings.pref);
  const clefsOn = $derived(enabledClefs());
  $effect(() => {
    if (!clefsOn.includes(ref.clef as never)) {
      ref.clef = clefsOn[0];
    }
    const notes = refRun(ref.clef);
    if (!notes.includes(ref.sel)) {
      ref.sel = notes[Math.floor(notes.length / 2)];
    }
  });
  const clef = $derived(clefDef(ref.clef));
  const run = $derived(refRun(ref.clef));
  const places = $derived(placesForMidi(ref.sel));
  /* keep the selected note on screen, wherever it sits in the run */
  const frac = $derived.by(() => {
    const index = run.indexOf(ref.sel);
    if (index < 0) {
      return null;
    }
    const firstX = Math.max(RUN.x0, clefW(ref.clef) + RUN_MARGIN);
    return (firstX + index * RUN.dx) / (firstX + run.length * RUN.dx + RUN_MARGIN);
  });

  /** Bass notes are plucked an octave down, as a bass sounds; other clefs on the piano. */
  function sound(midi: number) {
    if (ref.clef === 'bass') {
      pluck(midi - OCTAVE);
    } else {
      piano(midi, null, 2.2, 0.8);
    }
  }
  function pickNote(midi: number) {
    ref.sel = midi;
    sound(midi);
  }
  const names = (midis: number[], system: 'en' | 'solf') =>
    midis.map((midi) => noteName(pcOf(midi), system, pref)).join(' ');
</script>

<RefBar title="Staff map" {back} />

{#if clefsOn.length > 1}
  <div class="sec">
    <div class="levels">
      {#each clefsOn as id (id)}<button
          class="chip sm"
          data-refclef={id}
          aria-pressed={id === ref.clef}
          onclick={() => {
            ref.clef = id;
          }}>{clefDef(id).n}</button
        >{/each}
    </div>
  </div>
{/if}

<div class="sec">
  <h2>Every note, in order</h2>
  <div class="card">
    <div class="fbwrap" id="refw" use:hscroll={{ frac, key: ref.clef + ':' + ref.sel }}>
      <StaffRun midis={run} {pref} sel={ref.sel} clef={ref.clef} onNote={pickNote} />
    </div>
    <p class="note" style="margin-top:8px">
      Tap any note to hear it{ref.clef === 'bass' ? ' and see where it lives on the neck' : ''}. {ref.clef ===
      'bass'
        ? 'This runs from the open E string up to the 12th fret of the G string — the whole range the drills use.'
        : 'This runs from two ledger lines below the ' +
          clef.n.toLowerCase() +
          ' staff to two above, which is the range the drills use for it.'}
    </p>
  </div>
</div>

<div class="sec">
  <h2>{bothNames(pcOf(ref.sel), pref)}</h2>
  <div class="card">
    <div class="fbwrap fit">
      <Fretboard
        lo={0}
        hi={12}
        cells={places.map((place) => ({ s: place.s, f: place.f, fill: 'var(--accent)', r: 10 }))}
        scale={1.25}
      />
    </div>
    <div class="bar" style="margin-top:10px">
      <button class="ghost" id="hearref" onclick={() => sound(ref.sel)}>♪ Hear it</button>
      <span class="tick"
        >{places.length
          ? places.map((place) => STRINGS[place.s].n + ' ' + place.f).join('  ·  ')
          : 'not on the first twelve frets — the same letter is, an octave down'}</span
      >
    </div>
  </div>
</div>

<div class="sec">
  <h2>The five lines</h2>
  <div class="card">
    <div class="fbwrap">
      <StaffRun midis={clefLines(ref.clef)} {pref} clef={ref.clef} onNote={pickNote} />
    </div>
    <p class="note" style="margin-top:8px">
      Bottom to top: <b>{names(clefLines(ref.clef), 'en')}</b>. {clef.ml}. In solfège that is {names(
        clefLines(ref.clef),
        'solf',
      )}.
    </p>
  </div>
</div>

<div class="sec">
  <h2>The four spaces</h2>
  <div class="card">
    <div class="fbwrap">
      <StaffRun midis={clefSpaces(ref.clef)} {pref} clef={ref.clef} onNote={pickNote} />
    </div>
    <p class="note" style="margin-top:8px">
      Bottom to top: <b>{names(clefSpaces(ref.clef), 'en')}</b> — <i>{clef.ms}</i>. {names(
        clefSpaces(ref.clef),
        'solf',
      )}.
    </p>
  </div>
</div>

{#if ref.clef === 'bass'}
  <div class="sec">
    <h2>Anchors worth memorising first</h2>
    <div class="card stack">
      <p class="note">
        Rather than counting lines every time, learn four landmarks and read the rest as one step up
        or down from them. All four are open strings, so you already half-know them:
      </p>
      <div class="fbwrap">
        <StaffRun midis={OPEN_STRINGS} {pref} clef="bass" onNote={pickNote} />
      </div>
      <p class="note">
        <b>E</b> hangs on its own ledger line below the staff. <b>A</b> is the first space. <b>D</b>
        is the middle line — the easiest shape on the staff. <b>G</b> is the top space. Learn these four
        and everything else is within two steps of one of them.
      </p>
    </div>
  </div>
{:else}
  <div class="sec">
    <h2>Where to start</h2>
    <div class="card stack">
      <p class="note">
        Learn three landmarks rather than counting lines. The bottom line, the middle line and the
        top line are enough — everything else is within two steps of one of them.
      </p>
      <div class="fbwrap">
        <StaffRun
          midis={[0, MIDDLE_LINE_STEPS, TOP_LINE_STEPS].map((steps) =>
            diatonicMidi(clef.bot + steps),
          )}
          {pref}
          clef={ref.clef}
          onNote={pickNote}
        />
      </div>
      {#if ref.clef === 'treble'}
        <p class="note">
          Treble clef and bass clef are two frames onto the same keyboard, joined by middle C: the
          note one ledger line <i>above</i> the bass staff is the note one ledger line <i>below</i> the
          treble staff. If you know where middle C is in both, you can always find your way across.
        </p>
      {:else}
        <p class="note">
          A C clef points at middle C with the middle of its bracket, which is why it moves: on the
          middle line it is alto clef, one line higher it is tenor. Find middle C first and read out
          from it.
        </p>
      {/if}
    </div>
  </div>
{/if}

<div class="sec">
  <h2>Why bass is written an octave high</h2>
  <div class="card">
    <p class="note">
      Bass guitar is a transposing instrument: the notes are written one octave above where they
      actually sound, so the part stays on the staff instead of drowning in ledger lines. The open E
      string is written on the first ledger line below the bass staff but sounds at 41 Hz, an octave
      lower. You never have to think about it while playing — read the note, play the fret, and the
      octave takes care of itself. It only matters if you are reading a part written for another
      instrument.
    </p>
  </div>
</div>
