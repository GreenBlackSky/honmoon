<!-- Setup: every setting the original had, grouped as it was; each app picks the rows that apply to it. -->
<script lang="ts" module>
  export const MDO_ADDS =
    'Turning this on adds seven drills in their own group: reading a note as a syllable in a given key, naming its scale degree, finding a degree on the neck, and singing one. It is the thing that makes a melody transposable in your head, and the thing that makes singing a written line possible without a reference note for every phrase. It is also a real second language, so leave it off until the fixed-do and staff drills feel easy.';
</script>

<script lang="ts">
  import { onDestroy } from 'svelte';
  import { honmoon, setSetting, saveLocal, queueSave } from '../../store/honmoon.svelte';
  import type { ClefId, Settings } from '../../store/types';
  import { LEVELS, STRINGS, bassHere, lvl } from '../../music/bass';
  import { CLEFS, clefOn, enabledClefs } from '../../music/clefs';
  import { bothNames, freqOfSounding, pcOf } from '../../music/notes';
  import { RLEVELS, rhFloor, rlev } from '../../music/rhythm';
  import { clefSVG } from '../../notation/staff';
  import {
    micEnv,
    micListen,
    micOn,
    micReason,
    micStart,
    micStop,
    micUsable,
    type MicReading,
    type MicReason,
  } from '../../audio/mic';
  import { go, hasRoute } from '../../nav.svelte';
  import { toggledIn } from '../../util/list';
  import AccRow from '../AccRow.svelte';
  import DataCard from '../DataCard.svelte';
  import type { SetupRow } from '../types';

  interface Props {
    rows: SetupRow[];
    /** which paragraphs "How this works" carries */
    how?: ('written' | 'position' | 'repetition')[];
    /** how many drills the movable-do switch adds in this app, and what they are */
    mdoAdds?: string;
    appId?: string;
  }
  const {
    rows,
    how = ['written', 'position', 'repetition'],
    mdoAdds = MDO_ADDS,
    appId = 'honmoon',
  }: Props = $props();
  const has = (row: SetupRow) => rows.includes(row);
  const settings = $derived(honmoon.settings);
  /** Choices offered for the rhythm drills' starting tempo and their lowest tempo. */
  const RHYTHM_TEMPOS = [60, 70, 80, 92, 104];
  const RHYTHM_FLOORS = [40, 45, 50, 56, 63];
  /** The written pitch is an octave above the sounding one: the mic hears the latter. */
  const OCTAVE = 12;
  /** Input level that fills the meter. */
  const FULL_METER_RMS = 0.06;

  function change<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSetting(key, value);
    if (key === 'mic' && !value) {
      stopCalib();
    }
    /* Raising the floor above where you are now has to carry the tempo with
       it, or the drill would sit below its own limit until you nudged it. */
    if (key === 'rfloor' && (honmoon.settings.rtempo || 72) < rhFloor()) {
      setSetting('rtempo', rhFloor());
    }
  }
  /** Switch a clef on or off — but never the last one. */
  function toggleClef(clef: ClefId) {
    const on = toggledIn(honmoon.settings.clefs || ['bass'], clef);
    if (!on.length) {
      return;
    }
    honmoon.settings.clefs = CLEFS.filter((def) => on.includes(def.id)).map((def) => def.id);
    saveLocal();
    queueSave();
  }

  /* ---- checking the mic against the open strings ---- */
  const calib = $state({
    open: STRINGS.map(() => false),
    live: null as MicReading | null,
    err: null as MicReason | null,
    on: false,
  });
  function stopCalib() {
    if (micOn()) {
      micStop();
    }
    calib.on = false;
    calib.live = null;
  }
  /** Tick off every open string the reading matches. */
  function markOpenString(reading: MicReading) {
    calib.live = reading;
    if (!reading.stable || !reading.midi) {
      return;
    }
    const heard = Math.round(reading.midi);
    STRINGS.forEach((string, i) => {
      if (heard === string.open - OCTAVE) {
        calib.open[i] = true;
      }
    });
  }
  function toggleCalib() {
    if (calib.on) {
      stopCalib();
      calib.err = null;
      return;
    }
    calib.err = null;
    micStart()
      .then(() => {
        calib.on = true;
        micListen(markOpenString);
      })
      .catch((error) => {
        calib.err = micReason(error);
        calib.live = null;
      });
  }
  onDestroy(() => {
    if (calib.on) {
      stopCalib();
    }
  });
  const env = micEnv();
  const usable = micUsable();
  const heardMidi = $derived(calib.live && calib.live.midi ? Math.round(calib.live.midi) : 0);
  /** Why no microphone can be had here, in a sentence. */
  function whyNoMic(): string {
    if (env.policy === false) {
      return 'The page this one is embedded in does not pass microphone access through to it, and no browser setting overrides that.';
    }
    if (!env.secure) {
      return 'The connection is not a secure one, which browsers require before handing over a microphone.';
    }
    return 'This browser exposes no capture API in this context.';
  }
  const yesNo = (value: boolean | null | undefined) => (value ? 'yes' : 'no');
  const policyText = $derived(env.policy === null ? 'unknown' : yesNo(env.policy));
</script>

{#if has('range') || has('acc') || has('pref')}
  <div class="sec">
    <h2>Notes in rotation</h2>
    <div class="card">
      {#if has('range')}
        <div class="setrow">
          <span class="lbl">Range</span><span class="levels">
            {#each LEVELS as level (level.id)}<button
                class="chip sm"
                data-lvl={level.id}
                aria-pressed={level.id === lvl().id}
                onclick={() => change('level', level.id)}>{level.name}</button
              >{/each}
          </span><span class="hint"
            >{lvl().desc}. This is the same control as the one on the neck screen, and it sets how
            far the reading drills range too.</span
          >
        </div>
      {/if}
      {#if has('acc')}<AccRow />{/if}
      {#if has('pref')}
        <div class="setrow">
          <span class="lbl">Sharps or flats</span><span class="levels">
            <button
              class="chip sm"
              data-set="pref"
              data-val="sharp"
              aria-pressed={settings.pref === 'sharp'}
              onclick={() => change('pref', 'sharp')}>♯ sharps</button
            >
            <button
              class="chip sm"
              data-set="pref"
              data-val="flat"
              aria-pressed={settings.pref === 'flat'}
              onclick={() => change('pref', 'flat')}>♭ flats</button
            ></span
          >
          <span class="hint"
            >Which name a black note goes by. The same key is F♯ or G♭ depending on where you are
            coming from; this picks the one the app uses when it has a free choice.</span
          >
        </div>
      {/if}
    </div>
  </div>
{/if}

{#if has('appearance') || has('bass') || has('hints') || has('labels')}
  <div class="sec">
    <h2>The board</h2>
    <div class="card">
      {#if has('appearance')}
        <div class="setrow">
          <span class="lbl">Appearance</span><span class="levels">
            <button
              class="chip sm"
              data-set="theme"
              data-val="auto"
              aria-pressed={(settings.theme || 'auto') === 'auto'}
              onclick={() => change('theme', 'auto')}>Match device</button
            >
            <button
              class="chip sm"
              data-set="theme"
              data-val="light"
              aria-pressed={settings.theme === 'light'}
              onclick={() => change('theme', 'light')}>Light</button
            >
            <button
              class="chip sm"
              data-set="theme"
              data-val="dark"
              aria-pressed={settings.theme === 'dark'}
              onclick={() => change('theme', 'dark')}>Dark</button
            >
          </span><span class="hint"
            >The staff is drawn in ink on the page in one and chalk on a board in the other — the
            lines sit a step back from the notes either way, so the notes read first.</span
          >
        </div>
      {/if}
      {#if has('bass')}
        <div class="setrow">
          <span class="lbl">Bass with me</span>
          <button
            class="chip sm"
            data-set="bass"
            data-val={String(!bassHere())}
            aria-pressed={bassHere()}
            onclick={() => change('bass', !bassHere())}
            >{bassHere() ? 'Yes' : 'Left at home'}</button
          >
          <span class="hint"
            >Say no and the four play-along drills step out of the sessions until you say otherwise.
            The same switch sits on the Practice and Scales screens, which is where you will
            actually want it.</span
          >
        </div>
      {/if}
      {#if has('hints')}
        <div class="setrow">
          <span class="lbl">Explain the drill on screen</span>
          <button
            class="chip sm"
            data-set="hints"
            data-val={String(settings.hints === false)}
            aria-pressed={settings.hints !== false}
            onclick={() => change('hints', settings.hints === false)}
            >{settings.hints !== false ? 'On' : 'Off'}</button
          >
          <span class="hint"
            >A short note under the newer drills saying what is being asked and how to work it out.
            Turn it off once they are familiar — nothing else changes.</span
          >
        </div>
      {/if}
      {#if has('labels')}
        <div class="setrow">
          <span class="lbl">String names on the board</span>
          <button
            class="chip sm"
            data-set="labels"
            data-val={String(!settings.labels)}
            aria-pressed={settings.labels}
            onclick={() => change('labels', !settings.labels)}
            >{settings.labels ? 'Shown' : 'Hidden'}</button
          >
          <span class="hint"
            >Only affects the two Fret → name drills, where the G D A E labels let you count up from
            a known string instead of recognising the note. Turn them off once that drill feels easy
            — knowing the string order by heart is four facts, and it is worth having.</span
          >
        </div>
      {/if}
    </div>
  </div>
{/if}

{#if has('clefs')}
  <div class="sec">
    <h2>Clefs</h2>
    <div class="card stack">
      <p class="note">
        Bass clef is the one your instrument is written in, so it starts on its own. Add the others
        when you are ready and they join the reading and movable-do drills, mixed in at random.
        Turning one off does not lose what you have learned on it.
      </p>
      <div class="clefgrid">
        {#each CLEFS as clef (clef.id)}
          {@const on = clefOn(clef.id)}
          {@const only = on && enabledClefs().length === 1}
          <div class="clefrow">
            <svg viewBox="-2 -22 40 84" aria-hidden="true">
              <g stroke="var(--line)" stroke-width="1.1"
                ><line x1="0" y1="0" x2="38" y2="0" /><line x1="0" y1="10" x2="38" y2="10" /><line
                  x1="0"
                  y1="20"
                  x2="38"
                  y2="20"
                /><line x1="0" y1="30" x2="38" y2="30" /><line x1="0" y1="40" x2="38" y2="40" /></g
              >
              {@html clefSVG(clef.id)}</svg
            >
            <div style="flex:1;min-width:0">
              <div class="setrow" style="border:none;padding:0">
                <span class="lbl">{clef.n} clef</span>
                <button
                  class="chip sm"
                  data-clef={clef.id}
                  aria-pressed={on}
                  disabled={only}
                  onclick={() => toggleClef(clef.id)}>{on ? 'On' : 'Off'}</button
                >
              </div>
              <p class="note" style="margin:4px 0 0">{clef.sb}</p>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>
{/if}

{#if has('mdo')}
  <div class="sec">
    <h2>Movable do and degrees</h2>
    <div class="card stack">
      <div class="setrow">
        <span class="lbl">Key & degrees drills</span>
        <button
          class="chip sm"
          data-set="mdo"
          data-val={String(!settings.mdo)}
          aria-pressed={!!settings.mdo}
          onclick={() => change('mdo', !settings.mdo)}>{settings.mdo ? 'On' : 'Off'}</button
        >
        <span class="hint">Off by default, and nothing else changes while it is off.</span>
      </div>
      <p class="note">
        <b>Fixed do</b> is what the app uses everywhere else: Do is C, always, in every key. It is a
        second name for a letter. <b>Movable do</b> ties the syllables to the key instead — Do is
        whichever note the key is built on, so Do Re Mi sounds the same shape in every key and Sol
        always pulls home the same way. Movable do says <i>Ti</i> rather than Si, because Si is the raised
        fifth.
      </p>
      {#if mdoAdds}<p class="note">{@html mdoAdds}</p>{/if}
    </div>
  </div>
{/if}

{#if has('rhythm')}
  <div class="sec">
    <h2>Rhythm</h2>
    <div class="card stack">
      <div class="setrow">
        <span class="lbl">How much notation</span><span class="levels">
          {#each RLEVELS as level (level.id)}<button
              class="chip sm"
              data-set="rlev"
              data-val={level.id}
              aria-pressed={(settings.rlev || 'r1') === level.id}
              onclick={() => change('rlev', level.id)}>{level.n}</button
            >{/each}
        </span><span class="hint">{rlev().d}</span>
      </div>
      <div class="setrow">
        <span class="lbl">Tempo for tapping</span><span class="levels">
          {#each RHYTHM_TEMPOS as tempo (tempo)}<button
              class="chip sm"
              data-set="rtempo"
              data-val={tempo}
              aria-pressed={(settings.rtempo || 80) === tempo}
              onclick={() => change('rtempo', tempo)}>{tempo}</button
            >{/each}
        </span>
      </div>
      <div class="setrow">
        <span class="lbl">Slowest it will go</span><span class="levels">
          {#each RHYTHM_FLOORS as tempo (tempo)}<button
              class="chip sm"
              data-set="rfloor"
              data-val={tempo}
              aria-pressed={rhFloor() === tempo}
              onclick={() => change('rfloor', tempo)}>{tempo}</button
            >{/each}
        </span><span class="hint"
          >Miss a bar and the tapping drill eases the tempo back a few beats to let you catch it.
          This is where that stops. Very slow is not easier — the gaps between beats get long enough
          that you are counting from memory instead of feeling a pulse, and the bar falls apart. {Math.round(
            60000 / rhFloor(),
          )} ms between beats at {rhFloor()}.</span
        >
      </div>
      <div class="setrow">
        <span class="lbl">Tap delay allowed for</span><span class="tick"
          >{Math.round((settings.rlat || 0) * 1000)} ms</span
        >
        <span class="hint"
          >Phones take 40–150 ms to notice a tap and make a sound. Measure it once and the tapping
          drill grades what you played rather than how quick your screen is.</span
        >
      </div>
      {#if hasRoute('rcal')}<div class="bar">
          <button class="ghost" id="rcalib" onclick={() => go('rcal', { from: 'setup' })}
            >Measure the tap delay</button
          >
        </div>{/if}
    </div>
  </div>
{/if}

{#if has('sound') || has('mic')}
  <div class="sec">
    <h2>Sound</h2>
    <div class="card">
      {#if has('sound')}
        <div class="setrow">
          <span class="lbl">Play the note when I ask for it</span><button
            class="chip sm"
            data-set="sound"
            data-val={String(!settings.sound)}
            aria-pressed={settings.sound}
            onclick={() => change('sound', !settings.sound)}>{settings.sound ? 'On' : 'Off'}</button
          >
        </div>
      {/if}
      {#if has('mic')}
        {#if usable}
          <div class="setrow">
            <span class="lbl">Listen to my bass and check the note</span><button
              class="chip sm"
              data-set="mic"
              data-val={String(!settings.mic)}
              aria-pressed={settings.mic}
              onclick={() => change('mic', !settings.mic)}>{settings.mic ? 'On' : 'Off'}</button
            >
            <span class="hint"
              >Point the phone or laptop mic at your amp. Turn the amp up a little and cut the tone
              knob back — the detector wants the fundamental, not the click of the pick.</span
            >
          </div>
        {:else}
          <div class="setrow">
            <span class="lbl">Listen to my bass and check the note</span><span class="tick"
              >not available here</span
            >
            <span class="hint"
              >This viewer does not give the page a microphone, so the play-along drills ask you to
              mark yourself instead. They still count towards your progress.</span
            >
          </div>
        {/if}
      {/if}
    </div>
  </div>
{/if}

{#if has('mic')}
  <div class="sec">
    <h2>{usable ? 'Check the mic' : 'Microphone'}</h2>
    <div class="card stack">
      {#if !usable}
        <p class="note">
          Nothing in this app can reach a microphone here. {whyNoMic()}
        </p>
        <p class="note">
          The three play-along drills work anyway — they show you the note, play it back on request,
          and you mark whether you got it. Every other drill is unaffected.
        </p>
      {:else}
        <p class="note">
          Play each open string once, let it ring. If a string will not register, that is the string
          to distrust during the play-along drill — the low E is the hardest for any detector, and
          mains hum sits right next to G on that string.
        </p>
        {#if calib.on}
          <div class="tuner">
            <span class="nt">{heardMidi ? bothNames(pcOf(heardMidi), settings.pref) : '—'}</span
            ><span class="hz"
              >{calib.live?.freq ? calib.live.freq.toFixed(1) + ' Hz' : 'listening'}</span
            >
          </div>
          <div class="meter">
            <i
              style="width:{Math.min(
                100,
                Math.round(((calib.live?.rms || 0) * 100) / FULL_METER_RMS),
              )}%"
            ></i>
          </div>
        {/if}
        <table class="opens">
          <tbody>
            {#each STRINGS as string, i (string.n)}
              <tr class:done={calib.open[i]}
                ><td class="st">{string.n}</td><td
                  >{freqOfSounding(string.open - OCTAVE).toFixed(1)} Hz</td
                ><td class="hit">{calib.open[i] ? 'heard ✓' : '—'}</td></tr
              >
            {/each}
          </tbody>
        </table>
        <div class="bar">
          <button class="ghost" class:on={calib.on} id="calib" onclick={toggleCalib}
            >{calib.on ? 'Stop listening' : 'Start listening'}</button
          >
        </div>
        {#if calib.err}<div class="failbox">
            <div class="ft">{calib.err.t}</div>
            <p class="note" style="margin:4px 0 0">{calib.err.m}</p>
          </div>{/if}
      {/if}
      <p class="note" style="font-family:var(--f-mono);font-size:11.5px">
        secure {yesNo(env.secure)} · capture API {yesNo(env.api)} · embedded {yesNo(env.framed)} · allowed
        in this frame {policyText}
      </p>
    </div>
  </div>
{/if}

{#if has('data')}<DataCard {appId} />{/if}

{#if has('how') && how.length}
  <div class="sec">
    <h2>How this works</h2>
    <div class="card stack">
      {#if how.includes('written')}<p class="note">
          <b>Written pitch.</b> Bass is written an octave above where it sounds, so the open E string
          is the note on the first ledger line below the staff, and the drills use that written pitch
          throughout. Fret numbers and your ears agree; only the paper is transposed.
        </p>{/if}
      {#if how.includes('position')}<p class="note">
          <b>Pitch is not position.</b> E on the A string at fret 7 and E on the D string at fret 2 are
          the same sound, so a play-along drill accepts the right note wherever you play it. To be graded
          on a specific spot, use Name → fret.
        </p>{/if}
      {#if how.includes('repetition')}<p class="note">
          <b>Repetition.</b> Positions you miss come back sooner and more often; ones you nail drop out
          of rotation until they have gone stale. Ten minutes most days beats an hour on Sunday.
        </p>{/if}
    </div>
  </div>
{/if}
