<!--
  Reading scale degrees, in five short pages rather than one long one, because
  each builds on the one before and a phone screen holds about one idea at a
  time: what a degree is, what a flat or sharp in front of one means, reading
  a whole scale as a formula, where every degree sits under the hand, and a
  few to try. Every note name shown is spelled by scaleNotes(), the same code
  the drills use, so nothing here can disagree with what a drill marks right.
-->
<script lang="ts" module>
  /** The page you are on, the scale picked for the map and the fret its root sits on. */
  const DEGT = $state({ tab: 0, sid: 'major', rootF: 3 });
</script>

<script lang="ts">
  import { honmoon } from '../../store/honmoon.svelte';
  import { mdoOn, noteName, pcOf } from '../../music/notes';
  import { degPretty, scaleDef } from '../../music/scales';
  import { degStaffSVG } from '../../notation/staff';
  import { go, hasRoute, scrollToTop } from '../../nav.svelte';
  import { degKeyTable, degMapSVG, degRuler, degThirdsSVG, degWorked } from '../scaleboard';
  import { DEGQ, DEGTABS } from '../refdata';
  import Keyboard from '../Keyboard.svelte';

  const { back }: { back?: { label: string; to: string } } = $props();
  const page = $derived(Math.max(0, Math.min(DEGTABS.length - 1, DEGT.tab)));
  const pref = $derived(honmoon.settings.pref);
  function showPage(i: number) {
    DEGT.tab = i;
    scrollToTop();
  }

  /** Frets the degree map's root can sit on, and the open E string they count from. */
  const ROOT_FRETS = [1, 3, 5, 7];
  const LOW_E = 40;
  const ROWS: [string, string][] = [
    ['major', 'The ruler itself.'],
    ['natmin', 'Major with ♭3, ♭6, ♭7.'],
    ['dorian', 'Minor, but with a plain 6. Brighter, funkier.'],
    ['mixo', 'Major with a ♭7. Bluesy, dominant.'],
    ['minpent', 'Minor with the 2 and ♭6 left out — five notes, no half steps.'],
    ['majpent', 'Major with the 4 and 7 left out.'],
    ['blues', 'Minor pentatonic plus the ♭5.'],
  ];
  const PICKS: [string, string][] = [
    ['all', 'Every degree'],
    ['major', 'Major'],
    ['natmin', 'Natural minor'],
    ['minpent', 'Minor pent.'],
    ['majpent', 'Major pent.'],
    ['blues', 'Blues'],
    ['dorian', 'Dorian'],
    ['mixo', 'Mixolydian'],
  ];
</script>

<div class="bar">
  <button class="ghost" id="backlearn" onclick={() => go(back?.to ?? 'learn')}
    >← {back?.label ?? 'Learn'}</button
  ><span class="spacer"></span><span class="tick"
    >Scale degrees · {page + 1} / {DEGTABS.length}</span
  >
</div>
<div class="sec">
  <div class="levels dtabs">
    {#each DEGTABS as title, i (i)}<button
        class="chip sm"
        data-degtab={i}
        aria-pressed={i === page}
        onclick={() => showPage(i)}>{i + 1} · {title}</button
      >{/each}
  </div>
</div>

{#if page === 0}
  <div class="sec">
    <h2>A number instead of a letter</h2>
    <div class="card stack">
      <p class="note">
        A <b>degree</b> is a note’s place in the scale, counting the root as <b>1</b>. In C major, C
        is 1, D is 2, E is 3, and so on up to B, which is 7. The next C is the octave: 8, or 1
        again.
      </p>
      {@html degStaffSVG('major', 0, 48)}
      <p class="note">
        Letters on the top row, degrees underneath. The letter tells you <i>which</i> note; the
        degree tells you <i>what job</i> it is doing in this key.
      </p>
    </div>
  </div>
  <div class="sec">
    <h2>Same numbers, any key</h2>
    <div class="card stack">
      {@html degStaffSVG('major', 7, 43, [7])}
      <p class="note">
        G major. The letters have all changed, but the numbers are the same, and so is the sound of
        each one. The <b>5</b> — marked — was G in C major and is D here, and in both keys it is the note
        that sounds strong and stable, just short of home.
      </p>
      {@html degKeyTable('major', [0, 7, 5, 2], [7])}
      <p class="note">
        This is the whole reason for degrees. Learn that a line goes <b>1 – 5 – 8</b> and you can
        play it in any key without learning it again. Learn that it goes <i>C – G – C</i> and you know
        it in one.
      </p>
    </div>
  </div>
  <div class="sec">
    <h2>Major is the ruler</h2>
    <div class="card stack">
      <p class="note">
        An octave is twelve frets. Here they are in a row, counted up from the root:
      </p>
      {@html degRuler(null, { frets: true })}
      <p class="note">
        The seven <b>bold</b> slots are the major scale — that is what the plain numbers
        <i>mean</i>. The five faint slots in between have no plain number of their own, so they are
        named after a neighbour with a ♭ or ♯ in front. That is the next page.
      </p>
      <p class="note">
        The small numbers underneath are frets from the root, which on bass is the same as
        semitones. 3 is four frets up, 5 is seven, and they always will be.
      </p>
    </div>
  </div>
  <div class="sec">
    <h2>Where the half steps are</h2>
    <div class="card stack">
      <p class="note">
        A bass hides this. Every fret looks like every other fret, so a half step and a whole step
        are the same picture. A keyboard draws it: the half steps are the two places where white
        keys touch with no black key between them.
      </p>
      <Keyboard
        lo={48}
        oct={1}
        tap="play"
        cells={[
          { pc: 4, fill: 'var(--good)', label: 'E' },
          { pc: 5, fill: 'var(--good)', label: 'F' },
          { pc: 11, fill: 'var(--good)', label: 'B' },
          { pc: 0, fill: 'var(--good)', label: 'C' },
        ]}
      />
      <p class="note">
        E to F, and B to C. Everywhere else a black key sits in the gap and the step is a whole one.
        Play the white keys from C to C and you have played a major scale — the famous <b
          >whole whole half whole whole whole half</b
        > is just this picture read left to right. Tap the keys to hear it.
      </p>
    </div>
  </div>
{:else if page === 1}
  <div class="sec">
    <h2>A ♭ means one fret lower</h2>
    <div class="card stack">
      <p class="note">
        A flat in front of a degree means <b>one fret lower than the major scale would put it</b>. A
        sharp means one fret higher. That is all.
      </p>
      <div class="fbwrap fit">{@html degThirdsSVG()}</div>
      <p class="note">
        Root on the E string, fret 5 — that is A. Four frets up is the <b>3</b>, C♯. One fret below
        it is the <b>♭3</b>, C. That single fret is the entire difference between an A major chord
        and an A minor one.
      </p>
    </div>
  </div>
  <div class="sec">
    <h2>♭3 is not “a flat note”</h2>
    <div class="card stack">
      <p class="note">
        This is the part that trips everybody. The ♭ in a degree compares it with <i>major</i>. It
        says nothing about whether the note has a flat in its name.
      </p>
      {@html degStaffSVG('natmin', 4, 40, [3, 8, 10])}
      <p class="note">
        E natural minor. Its formula has three flat degrees — ♭3, ♭6, ♭7 — and they are G, C and D.
        Not a flat sign among them. They are flat <i>degrees</i> because E major has G♯, C♯ and D♯ in
        those places, and minor lowers each by a fret.
      </p>
      {@html degStaffSVG('major', 5, 41, [5])}
      <p class="note">
        And the reverse: F major. B♭ has a flat in its name, but it is just the <b>4</b> — a plain degree
        — because it is exactly where the major scale puts the fourth note in the key of F.
      </p>
    </div>
  </div>
  <div class="sec">
    <h2>The five in-between degrees</h2>
    <div class="card stack">
      {@html degRuler(null, { mark: [1, 3, 6, 8, 10] })}
      <div class="gterm">
        <b>♭2</b>
        <p>
          A fret above the root. Tense and exotic — the sound of Phrygian, flamenco and a lot of
          metal.
        </p>
      </div>
      <div class="gterm">
        <b>♭3</b>
        <p>The minor third. Swap the 3 for this and major becomes minor.</p>
      </div>
      <div class="gterm">
        <b>♯4 / ♭5</b>
        <p>
          Exactly half an octave: the tritone. Called ♭5 in the blues scale, where it is the “blue
          note”; ♯4 in Lydian, where it makes major sound like it is floating.
        </p>
      </div>
      <div class="gterm">
        <b>♭6</b>
        <p>The darker sixth of natural minor.</p>
      </div>
      <div class="gterm">
        <b>♭7</b>
        <p>
          A whole step below the octave instead of a half. The sound of blues, rock and funk, and of
          every dominant 7 chord.
        </p>
      </div>
      <p class="note">
        Why one slot has two names: it is a fret above 4 and a fret below 5, and a scale names it
        after the neighbour it is standing in for. Lydian <i>replaces</i> the 4 with it, so there it is
        ♯4. The blues scale keeps the 4 and adds this note on the way up to the 5, so there it is ♭5.
      </p>
    </div>
  </div>
{:else if page === 2}
  <div class="sec">
    <h2>A scale written as degrees</h2>
    <div class="card stack">
      <p class="note">
        A <b>formula</b> lists a scale’s notes as degrees instead of letters, which makes it true in every
        key. Read it against the ruler: plain numbers are where major has them, a ♭ is a fret lower.
      </p>
      <div class="dform"><b>Natural minor</b><span>1 2 ♭3 4 5 ♭6 ♭7</span></div>
      <p class="note">
        Read aloud: <i>start from major, lower the third, sixth and seventh by a fret.</i> That is how
        you build it in any key without memorising the letters.
      </p>
    </div>
  </div>
  <div class="sec">
    <h2>Worked through: A minor</h2>
    <div class="card stack">
      <p class="note">
        Write out A major, then apply the three flats. The notes that moved are marked.
      </p>
      {@html degWorked('major', 'natmin', 9)}
      <p class="note">
        C♯ down to C, F♯ to F, G♯ to G. What is left is A B C D E F G — no sharps or flats at all,
        which is why A minor is the first minor key anyone learns.
      </p>
    </div>
  </div>
  <div class="sec">
    <h2>Side by side</h2>
    <div class="card stack">
      <p class="note">
        Each row is one scale laid over the ruler. The column tells you the fret; the label is what
        that scale calls it. Compare any two rows and the difference is a handful of cells — which
        is exactly how musicians describe them.
      </p>
      {#each ROWS as [sid, blurb] (sid)}
        <div class="drow">
          <div class="drn"><b>{scaleDef(sid).n}</b><span>{blurb}</span></div>
          {@html degRuler(sid, { compact: true })}
        </div>
      {/each}
      <p class="note">
        Dorian against natural minor: one cell, the 6. Mixolydian against major: one cell, the 7.
        Most of what makes a scale sound the way it does is one or two degrees.
      </p>
    </div>
  </div>
{:else if page === 3}
  {@const pickedSid = DEGT.sid}
  <div class="sec">
    <h2>Every degree, under one hand</h2>
    <div class="card stack">
      <p class="note">
        With the root on the E string, every degree has a fixed spot within reach. Pick a scale to
        see which of them it uses.
      </p>
      <div class="levels">
        {#each PICKS as [sid, title] (sid)}<button
            class="chip sm"
            data-degsid={sid}
            aria-pressed={pickedSid === sid}
            onclick={() => {
              DEGT.sid = sid;
            }}>{title}</button
          >{/each}
      </div>
      <div class="fbwrap fit">
        {@html degMapSVG(pickedSid === 'all' ? null : pickedSid, DEGT.rootF)}
      </div>
      <div class="legend">
        <span><b style="background:var(--accent);border-radius:50%"></b>root</span>
        <span
          ><b style="background:var(--dot);border:1px solid var(--line-2);border-radius:50%"
          ></b>plain degree</span
        >
        <span><b style="background:var(--good);border-radius:50%"></b>♭ or ♯ degree</span>
        {#if pickedSid !== 'all'}<span
            ><b style="border:1.4px solid var(--ink-3);border-radius:50%"></b>not in this scale</span
          >{/if}
      </div>
      <p class="note">
        {#if pickedSid === 'all'}All twelve, plus the octave. The 3 and the 6 sit a fret <i
            >behind</i
          > the root on the next string up — that is why a major shape reaches back.{:else}{scaleDef(
            pickedSid,
          ).n}: {scaleDef(pickedSid).dg.map(degPretty).join(' ')}. Filled spots are the scale; rings
          are the degrees it leaves out.{/if}
      </p>
    </div>
  </div>
  <div class="sec">
    <h2>Move the 1, keep the shape</h2>
    <div class="card stack">
      <p class="note">
        The map above has its root on fret {DEGT.rootF}, which makes it {noteName(
          pcOf(40 + DEGT.rootF),
          'en',
          pref,
        )}. Move the root and every degree comes with it, still in the same place relative to it.
        <b>That is changing key on the bass.</b> A piano player relearns the pattern for every key; you
        move your hand.
      </p>
      <div class="bar">
        <span class="hint">Root at fret</span>
        {#each ROOT_FRETS as fret (fret)}<button
            class="chip sm"
            data-degroot={fret}
            aria-pressed={DEGT.rootF === fret}
            onclick={() => {
              DEGT.rootF = fret;
            }}>{fret} · {noteName(pcOf(LOW_E + fret), 'en', pref)}</button
          >{/each}
      </div>
      <p class="note">
        Try it with the map above: the dots move, their shape does not. With the root on the A
        string instead, it all works the same way, one string higher.
      </p>
    </div>
  </div>
{:else}
  <div class="sec">
    <h2>Try a few</h2>
    <div class="card stack">
      <p class="note">Work each one out, then tap to check. None of these are scored.</p>
      {#each DEGQ as [question, answer, why], i (i)}
        <details class="dq">
          <summary>{@html question}</summary>
          <div>
            <b>{answer}</b>
            <p>{why}</p>
          </div>
        </details>
      {/each}
    </div>
  </div>
  <div class="sec">
    <h2>Where to go next</h2>
    <div class="card stack">
      <p class="note">
        <b>Scale explorer</b> shows any scale in any key with its degrees written under every note — the
        quickest way to check a formula you have worked out.
      </p>
      <p class="note">
        <b>Degree drills</b> — name the degree of a note, find a degree on the neck, sing one — are
        in <i>Names &amp; keys</i> here, and in Mira (bass) and Rumi (voice). {mdoOn()
          ? 'They are switched on.'
          : 'They are switched off until you turn on movable do in Setup, because degrees and movable do are the same idea.'}
      </p>
      <div class="bar">
        {#if hasRoute('sx')}<button class="ghost" data-go="sx" onclick={() => go('sx')}
            >Scale explorer</button
          >{/if}<span class="spacer"></span>
        {#if !mdoOn() && hasRoute('setup')}<button
            class="ghost"
            data-go="setup"
            onclick={() => go('setup')}>Setup</button
          >{/if}
      </div>
    </div>
  </div>
{/if}

<div class="sec">
  <div class="bar">
    {#if page > 0}<button class="ghost" data-degtab={page - 1} onclick={() => showPage(page - 1)}
        >← {DEGTABS[page - 1]}</button
      >{/if}
    <span class="spacer"></span>
    {#if page < DEGTABS.length - 1}<button
        class="ghost on"
        data-degtab={page + 1}
        onclick={() => showPage(page + 1)}>{DEGTABS[page + 1]} →</button
      >
    {:else}<button class="ghost" id="backlearn" onclick={() => go(back?.to ?? 'learn')}>Done</button
      >{/if}
  </div>
</div>
