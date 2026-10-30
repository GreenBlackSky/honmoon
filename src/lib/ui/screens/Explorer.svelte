<!-- Any scale in any key: the notes, the steps, the degrees, the box on the neck, the staff and the keyboard. -->
<script lang="ts" module>
  type BoxLabels = 'deg' | 'note' | 'fin';
  /** What the explorer shows; kept across visits. Starts on A minor pentatonic from the E string. */
  const XS = $state({ sid: 'minpent', root: 9, start: 3, labels: 'deg' as BoxLabels });
</script>

<script lang="ts">
  import { honmoon } from '../../store/honmoon.svelte';
  import { STRINGS } from '../../music/bass';
  import {
    SCALES,
    SGROUPS,
    degPretty,
    noteText,
    rootName,
    rootPool,
    scaleDef,
    scaleNotes,
    scaleShape,
    scaleSteps,
  } from '../../music/scales';
  import { kbBase } from '../../notation/keyboard';
  import { playScale } from '../../audio/synth';
  import { go, hasRoute } from '../../nav.svelte';
  import { fretFrac, hscroll } from '../actions';
  import { kbFollow } from '../keyfollow.svelte';
  import { kbHalfStepLine, scaleBoard, stepRowHTML } from '../scaleboard';
  import Fretboard from '../Fretboard.svelte';
  import Keyboard from '../Keyboard.svelte';
  import StaffRun from '../StaffRun.svelte';
  import RefBar from '../RefBar.svelte';

  const { back }: { back?: { label: string; to: string } } = $props();

  const scale = $derived(scaleDef(XS.sid));
  const notes = $derived(scaleNotes(XS.sid, XS.root));
  const board = $derived(scaleBoard(XS.sid, XS.root, XS.start, XS.labels));
  /** How far apart the keyboard lights the notes as the scale plays, in seconds. */
  const FOLLOW_STEP_S = 0.33;
  /** C3: the keyboard picture starts at the C at or below this plus the root. */
  const KEYBOARD_BASE = 48;
  const LABEL_CHOICES: [BoxLabels, string][] = [
    ['deg', 'Degrees'],
    ['note', 'Notes'],
    ['fin', 'Fingers'],
  ];
  const START_CHOICES: [number, string][] = [
    [3, 'E string'],
    [2, 'A string'],
  ];
  const isRootNote = (semis: number) => semis % 12 === 0;
  const total = (steps: number[]) => steps.reduce((sum, step) => sum + step, 0);
  const shapeMidis = (shape: { pos: { s: number; f: number }[] }) =>
    shape.pos.map((pos) => STRINGS[pos.s].open + pos.f);
  function hear() {
    playScale(XS.sid, XS.root, XS.start);
    /* follow mode: the keys light in time with the notes */
    kbFollow(shapeMidis(scaleShape(XS.sid, XS.root, XS.start, 1)), FOLLOW_STEP_S);
  }
</script>

<RefBar title="Explorer" {back} resume={false} />

<div class="sec">
  <div class="card stack">
    <div>
      <div style="font-family:var(--f-disp);font-size:24px;letter-spacing:.02em">
        {rootName(XS.root) + ' ' + scale.n.toLowerCase()}
      </div>
      <p class="note" style="margin:4px 0 0">{scale.d}</p>
    </div>
    {@html stepRowHTML(XS.sid, XS.root)}
    <p class="note" style="margin:0">
      Big numbers are the notes, small ones their degree. The circles between them are the <b
        >steps</b
      >
      — how many frets from each note to the next. They come to {total(scaleSteps(XS.sid))}, because
      that is one octave.
    </p>
    <div
      class="fbwrap"
      use:hscroll={{
        frac: fretFrac(board.cf, board.lo, board.hi),
        key: XS.sid + XS.root + XS.start,
      }}
    >
      <Fretboard lo={board.lo} hi={board.hi} cells={board.cells} />
    </div>
    <div class="bar">
      <span class="hint">Show</span>
      {#each LABEL_CHOICES as [labels, title] (labels)}
        <button
          class="chip sm"
          data-xs="labels"
          data-val={labels}
          aria-pressed={XS.labels === labels}
          onclick={() => {
            XS.labels = labels;
          }}>{title}</button
        >
      {/each}
    </div>
    <div class="bar">
      <span class="hint">From</span>
      {#each START_CHOICES as [string, title] (string)}
        <button
          class="chip sm"
          data-xs="start"
          data-val={string}
          aria-pressed={XS.start === string}
          onclick={() => {
            XS.start = string;
          }}>{title}</button
        >
      {/each}
      <span class="spacer"></span><button class="ghost" id="hearscale" onclick={hear}
        >♪ Hear it</button
      >
    </div>
    <p class="note">
      Hollow rings are every other place that note occurs on the neck. The filled dots are one
      playable box{board.shape.clean
        ? ', all inside a four-fret span.'
        : ' — this one needs a position shift, marked by the finger numbers jumping back.'}
    </p>
  </div>
</div>

<div class="sec">
  <h2>On the staff</h2>
  <div class="card">
    <div class="fbwrap">
      <StaffRun midis={shapeMidis(board.shape)} pref={honmoon.settings.pref} tappable={false} />
    </div>
  </div>
</div>

<!-- The same scale on a keyboard. On a fretboard every step looks alike, so the
     shape of a scale is invisible; here the half steps are drawn for you —
     they are the places where two lit white keys touch. -->
<div class="sec">
  <h2>On the keyboard</h2>
  <div class="card stack">
    <Keyboard
      lo={kbBase(KEYBOARD_BASE + XS.root)}
      oct={1}
      tap="play"
      cells={notes.map((note) => ({
        pc: note.pc,
        fill: isRootNote(note.semis) ? 'var(--accent)' : 'var(--good)',
        label: XS.labels === 'note' ? noteText(note) : degPretty(note.deg),
      }))}
    />
    <p class="note" style="margin:0">
      Tap a key to hear it. {@html kbHalfStepLine(XS.sid, XS.root)}
    </p>
  </div>
</div>

<div class="sec">
  <h2>Reading the steps</h2>
  <div class="card stack">
    <p class="note">
      A <b>step</b> is the distance from one note of a scale to the next, counted in frets. One fret
      is a <b>half step</b> — a semitone. Two frets is a <b>whole step</b>. That is the whole
      vocabulary.
    </p>
    <p class="note">
      Every scale is a recipe of steps from its root, and the recipe is what makes it sound the way
      it does. Major is <b>whole whole half whole whole whole half</b>; play that from any note and
      you have that key's major scale. On the bass the shape does not change at all when you move
      key — it just slides up the neck. That is the one real advantage a fretted instrument has over
      a piano, and it is why bassists think in shapes.
    </p>
    <p class="note">
      Pentatonics leave notes out, so they have bigger gaps — minor pentatonic goes <b>3 2 2 3 2</b
      >. Those three-fret jumps are exactly why it sounds open and singable rather than stepwise,
      and why it is so hard to play a wrong note with it.
    </p>
    <p class="note">
      Whatever the scale, the steps add up to <b>12</b>, because twelve semitones is an octave and
      the scale has to arrive home.
    </p>
  </div>
</div>

<div class="sec">
  <h2>Reading the degrees</h2>
  <div class="card stack">
    <p class="note">
      The small number under each note is its <b>degree</b> — which note of the scale it is, counting
      the root as 1.
    </p>
    <p class="note">
      A ♭ or ♯ in front means it is a semitone lower or higher <i
        >than it would be in the major scale</i
      >. The major scale is the ruler everything else is measured against. So ♭3 means “a semitone
      below the 3 you would get in major” — and that single semitone is the entire difference
      between a major and a minor chord.
    </p>
    <p class="note">
      This is why degrees are worth more to you than note names. <b>The ♭7</b> means the same thing
      in every key, and a line built on 1 ♭3 4 5 works wherever you put it. <b>B♭</b> only means something
      once somebody tells you what key you are in.
    </p>
    {#if hasRoute('degref')}<div class="bar">
        <button class="ghost" data-go="degref" onclick={() => go('degref')}
          >More on degrees, with pictures →</button
        >
      </div>{/if}
  </div>
</div>

<div class="sec">
  <h2>Root</h2>
  <div class="levels">
    {#each rootPool() as root (root)}<button
        class="chip sm"
        data-xs="root"
        data-val={root}
        aria-pressed={XS.root === root}
        onclick={() => {
          XS.root = root;
        }}>{rootName(root)}</button
      >{/each}
  </div>
</div>

{#each SGROUPS as group (group)}
  <div class="sec">
    <h2>{group}</h2>
    <div class="levels">
      {#each SCALES.filter((def) => def.g === group) as def (def.id)}<button
          class="chip sm"
          data-xs="sid"
          data-val={def.id}
          aria-pressed={XS.sid === def.id}
          onclick={() => {
            XS.sid = def.id;
          }}>{def.n}</button
        >{/each}
    </div>
  </div>
{/each}
