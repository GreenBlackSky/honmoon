<!-- How rhythm is written: values, dots, ties, rests, bars, time signatures, and counting out loud. -->
<script lang="ts">
  import { METERS, RVALS, beatsText, type Bar } from '../../music/rhythm';
  import { rhOneSVG, tsGlyphSVG } from '../../notation/rhythmsvg';
  import { playMeter } from '../../audio/synth';
  import RhythmBar from '../RhythmBar.svelte';
  import RefBar from '../RefBar.svelte';

  interface Props {
    back?: { label: string; to: string };
    /** where the drop-out clock lives, for the last paragraph */
    clockWhere?: string;
  }
  const { back, clockWhere = 'Mira (the bass app), under Warm up,' }: Props = $props();

  /** An example bar from its events. Compound time groups in dotted quarters (6 sixteenths). */
  const bar = (ts: [number, number], events: Bar['ev'], compound = false): Bar => ({
    ts,
    u: events.reduce((sum, event) => sum + event.u, 0),
    g: compound ? 6 : 4,
    cmp: compound,
    ev: events,
  });
</script>

<RefBar title="Reading rhythm" {back} />

<div class="sec">
  <h2>The line is time, not pitch</h2>
  <div class="card stack">
    <p class="note">
      On a rhythm staff there is one line and it means nothing about how high the note is — only
      when it happens and how long it lasts. This is worth learning on its own, because rhythm is
      the half of reading that carries a part. A bassist who reads rhythm perfectly and pitch
      approximately will hold a band together; the reverse will not.
    </p>
    <p class="note">
      Every value below is a whole number of sixteenths, and that is the only arithmetic reading
      ever needs.
    </p>
  </div>
</div>

<div class="sec">
  <h2>The values</h2>
  <div class="card">
    <table class="opens">
      <tbody>
        {#each RVALS as value (value.u)}
          <tr
            ><td style="width:72px">{@html rhOneSVG(value.u, false, 62)}</td>
            <td><b>{value.n}</b><br /><span class="hint">{beatsText(value.u)} in 4/4</span></td>
            <td style="width:72px">{@html rhOneSVG(value.u, true, 62)}</td></tr
          >
        {/each}
      </tbody>
    </table>
    <p class="note" style="margin-top:8px">
      Left: the note. Right: the rest of the same length — the same amount of time, deliberately not
      played. Rests are music, and reading them accurately is what stops a line turning to mush.
    </p>
    <p class="note">
      The whole rest and the half rest are the same little block; the only difference is which side
      of the line it sits on. The whole rest hangs below, the half rest sits on top. Everyone mixes
      them up at first.
    </p>
  </div>
</div>

<div class="sec">
  <h2>The dot</h2>
  <div class="card">
    <RhythmBar bar={bar([4, 4], [{ u: 6 }, { u: 2 }, { u: 4 }, { u: 4 }])} count={true} />
    <p class="note" style="margin-top:8px">
      A dot after a note adds half of it again: a dotted quarter is a quarter plus an eighth, a beat
      and a half. That is where nearly every syncopation in pop and rock comes from — the second
      note lands on the <i>and</i>, and the phrase starts pushing.
    </p>
  </div>
</div>

<div class="sec">
  <h2>The tie</h2>
  <div class="card">
    <RhythmBar
      bar={bar([4, 4], [{ u: 2 }, { u: 2 }, { u: 2, tie: true }, { u: 2 }, { u: 4 }, { u: 4 }])}
      count={true}
    />
    <p class="note" style="margin-top:8px">
      A curved line joining two noteheads means play the first and hold through the second: one
      sound, both lengths. It exists so a note can cross a beat or a barline while the beats stay
      visible underneath. Counting a tie out loud, you say the number for the tied-to note but do
      not attack it.
    </p>
  </div>
</div>

<div class="sec">
  <h2>Counting out loud</h2>
  <div class="card stack">
    <RhythmBar
      bar={bar(
        [4, 4],
        [{ u: 1 }, { u: 1 }, { u: 1 }, { u: 1 }, { u: 2 }, { u: 2 }, { u: 4 }, { u: 2 }, { u: 2 }],
      )}
      count={true}
    />
    <p class="note">
      Four sixteenths in a beat are counted <b>1 e &amp; a</b>. Eighths are <b>1 &amp;</b>. A
      quarter is just <b>1</b>. Say it aloud while you tap: the syllable tells you where you are
      inside the beat without counting anything, and it is the fastest route from the page to your
      hands.
    </p>
    <p class="note">
      This is also why notes shorter than a quarter are beamed in groups of one beat. The beams are
      not decoration — they draw the beat for you, so you can see at a glance that four sixteenths
      belong to beat 3.
    </p>
    <p class="note">
      <b>Writing a counting down.</b> The Count the bar drill writes the whole bar out in a row, one
      slot for each step of it, in order: the syllable where a note starts and a <b>·</b> where
      nothing does. So a bar of four quarter notes is
      <span style="font-family:var(--f-mono)">1 2 3 4</span>, and a bar that plays only on the first
      beat and the <i>and</i> of three is
      <span style="font-family:var(--f-mono)">1 · · · · · &amp; ·</span>. Listing only the syllables
      you play would be shorter, but two different bars can produce the same short list — the dots
      are what pin each note to its place.
    </p>
  </div>
</div>

<div class="sec">
  <h2>Bars and time signatures</h2>
  <div class="card stack">
    <p class="note">
      Music is counted in equal packets called <b>bars</b>, and the vertical line at the end of one
      is the <b>barline</b>. The first beat of every bar is the strong one — it is where a phrase
      lands, where a chord usually changes, and where the bass usually plays the root. Nearly
      everything about feel comes from knowing where beat 1 is.
    </p>
    <p class="note">
      The pair of numbers at the start says how those packets are built. It looks like a fraction
      but it is not one; it is two separate facts stacked up:
    </p>
    <div class="tsrow">
      <div class="tsnum">{@html tsGlyphSVG([4, 4], 62)}</div>
      <div>
        <p class="note" style="margin:0">
          <b>The bottom number</b> names the note value that counts as one beat. 4 means a quarter
          note, 8 means an eighth note, 2 means a half note. It is the <i>denominator</i> in the sense
          that 4 means “quarter”, and that is the only sense in which any of this is a fraction.
        </p>
        <p class="note"><b>The top number</b> says how many of those fit in a bar.</p>
        <p class="note" style="margin-bottom:0">
          So <b>4/4</b> is four quarter-note beats to a bar, and <b>3/4</b> is three. Same beat, different
          sized packet — and that one difference is what separates a rock song from a waltz.
        </p>
      </div>
    </div>
  </div>
</div>

<div class="sec">
  <h2>The ones you will meet</h2>
  <div class="card stack">
    <p class="note">
      Tap any of them to hear two bars of the bare pulse. The accent is on beat 1 — listen for how
      far apart the accents are, because that <i>is</i> the time signature.
    </p>
    {#each METERS as meter (meter.n)}
      <div class="tsrow">
        <div class="tsnum">{@html tsGlyphSVG(meter.ts, 54)}</div>
        <div style="flex:1;min-width:0">
          <div class="setrow" style="border:none;padding:0">
            <span class="lbl">{meter.n}</span>
            <button
              class="chip sm"
              data-meter={meter.ts.join('/')}
              onclick={() => playMeter(meter.ts)}>♪ Hear it</button
            >
          </div>
          <p class="note" style="margin:4px 0 0">{@html meter.d}</p>
        </div>
      </div>
    {/each}
  </div>
</div>

<div class="sec">
  <h2>Counting a bar of 3/4</h2>
  <div class="card stack">
    <RhythmBar bar={bar([3, 4], [{ u: 4 }, { u: 2 }, { u: 2 }, { u: 4 }])} count={true} />
    <p class="note">
      Three beats, so the counting only ever reaches 3 before the barline comes round and it starts
      again at 1. A bar of 3/4 that adds up to four beats is simply wrong — that is the rule the
      Complete the bar drill is testing.
    </p>
  </div>
</div>

<div class="sec">
  <h2>Why 6/8 is different</h2>
  <div class="card stack">
    <RhythmBar
      bar={bar([6, 8], [{ u: 2 }, { u: 2 }, { u: 2 }, { u: 4 }, { u: 2 }], true)}
      count={true}
    />
    <p class="note">
      Read literally, 6/8 is six eighth-note beats in a bar. Nobody counts it that way above a
      crawl. In the ear it is <b>two</b> beats that each divide into <b>three</b> — the accents fall
      on 1 and 4 — and that is what makes it roll rather than march. Time signatures that work like
      this are called <i>compound</i>; 6/8, 9/8 and 12/8 are the common ones.
    </p>
    <p class="note">
      The quick test: if the top number is 6, 9 or 12 over an 8, divide it by three to get the real
      number of beats. Count the eighths out loud at first — 1 2 3 4 5 6 — and let the weight settle
      on 1 and 4 until the two-beat feel takes over.
    </p>
  </div>
</div>

<div class="sec">
  <h2>How to practise it</h2>
  <div class="card stack">
    <p class="note">
      <b>Say it before you play it.</b> Count the bar out loud with the metronome until it is automatic.
      Only then put it on the instrument — sight-reading fails far more often on rhythm than on notes.
    </p>
    <p class="note">
      <b>Subdivide even when nothing is subdivided.</b> If the bar is four quarter notes, still feel the
      eighths underneath. That is what keeps long notes from shrinking.
    </p>
    <p class="note">
      <b>Practise the silence.</b> The Internal clock exercise in {clockWhere} takes the metronome away
      for a few bars at a time. Holding tempo through silence is the skill; playing along with a click
      is only the test.
    </p>
  </div>
</div>
