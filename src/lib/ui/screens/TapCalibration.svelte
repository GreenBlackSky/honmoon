<!--
  Between the speaker, the screen and the touch digitiser there is a fixed
  delay of anywhere from 20 to 200 ms. Measure it once and everything after
  is graded on what you actually played, not on your phone's reaction time.
-->
<script lang="ts" module>
  const RCAL = $state({
    on: false,
    /** how many clicks this run plays */
    n: 12,
    taps: 0,
    done: false,
    result: null as number | null,
    flash: false,
  });
</script>

<script lang="ts">
  import { onDestroy } from 'svelte';
  import { honmoon, queueSave } from '../../store/honmoon.svelte';
  import { ac, acIfAny } from '../../audio/context';
  import { metClick } from '../../audio/synth';
  import { drill } from '../../drills/runtime.svelte';
  import { go, nav } from '../../nav.svelte';

  const from = nav.view.opt.from === 'setup' ? 'setup' : 'drill';
  let clicks: number[] = [];
  let taps: number[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;
  Object.assign(RCAL, { on: false, taps: 0, done: false, result: null });

  /** Twelve clicks at 88 bpm, accented every four, after a short lead-in. */
  const CLICK_COUNT = 12;
  const CALIBRATION_BPM = 88;
  const BEATS_PER_BAR = 4;
  const LEAD_IN_S = 0.9;
  /** Time after the last click to keep listening for a late tap. */
  const TAIL_MS = 400;
  const FLASH_MS = 90;
  /** A tap further than this from every click is a fumble, not a delay; it is also the largest delay accepted. */
  const MAX_OFFSET_S = 0.35;
  /** Fewer usable taps than this measure nothing. */
  const MIN_TAPS = 5;
  /** Above this the delay is worth a word of warning. */
  const SLOW_DELAY_S = 0.25;

  function start() {
    const context = ac();
    if (!context) {
      return;
    }
    Object.assign(RCAL, { on: true, n: CLICK_COUNT, taps: 0, done: false, result: null });
    clicks = [];
    taps = [];
    const secondsPerBeat = 60 / CALIBRATION_BPM;
    const firstClick = context.currentTime + LEAD_IN_S;
    for (let i = 0; i < RCAL.n; i++) {
      const time = firstClick + i * secondsPerBeat;
      metClick(time, i % BEATS_PER_BAR === 0 ? 'accent' : 'beat');
      clicks.push(time);
    }
    const end = firstClick + RCAL.n * secondsPerBeat;
    timer = setTimeout(finish, (end - context.currentTime) * 1000 + TAIL_MS);
  }
  function hit() {
    const context = acIfAny();
    if (!RCAL.on || !context) {
      return;
    }
    taps.push(context.currentTime);
    RCAL.taps = taps.length;
    RCAL.flash = true;
    setTimeout(() => {
      RCAL.flash = false;
    }, FLASH_MS);
  }
  /** How far a tap is from its nearest click (positive: late). */
  function offsetFromNearestClick(tap: number): number {
    let best = Infinity;
    for (const click of clicks) {
      const offset = tap - click;
      if (Math.abs(offset) < Math.abs(best)) {
        best = offset;
      }
    }
    return best;
  }
  const median = (sorted: number[]) => sorted[Math.floor(sorted.length / 2)];
  function finish() {
    RCAL.on = false;
    if (timer) {
      clearTimeout(timer);
    }
    /* Each tap is matched to its nearest click; the median offset is the delay.
       The median, not the mean, so one fumbled tap cannot move the answer. */
    const offsets = taps
      .map(offsetFromNearestClick)
      .filter((offset) => Math.abs(offset) < MAX_OFFSET_S)
      .sort((a, b) => a - b);
    RCAL.result =
      offsets.length >= MIN_TAPS ? Math.max(0, Math.min(MAX_OFFSET_S, median(offsets))) : null;
    RCAL.done = true;
  }
  function leave() {
    if (from === 'setup') {
      go('setup');
    } else {
      go('drill', { id: drill.id });
    }
  }
  function use() {
    if (RCAL.result != null) {
      honmoon.settings.rlat = RCAL.result;
      queueSave();
    }
    leave();
  }
  onDestroy(() => {
    if (timer) {
      clearTimeout(timer);
    }
    RCAL.on = false;
  });
</script>

<div class="sec">
  <div class="bar">
    <button class="ghost" id="backdrill" onclick={leave}>← Back</button><span class="spacer"
    ></span><span class="tick">Tap delay</span>
  </div>
</div>
<div class="sec">
  <div class="card stack">
    <p class="note">
      Your phone takes a moment to notice a tap, and its speaker takes a moment to make a sound. Tap
      along with twelve clicks and the app measures that delay once, so tapping drills grade what
      you played rather than how fast your screen is.
    </p>
    <div class="setrow">
      <span class="lbl">Currently allowing</span><span class="tick"
        >{Math.round((honmoon.settings.rlat || 0) * 1000)} ms</span
      >
    </div>
  </div>
</div>
{#if !RCAL.on && !RCAL.done}<div class="sec">
    <button class="start" id="calgo" onclick={start}>Start · {CLICK_COUNT} clicks</button>
  </div>{/if}
{#if RCAL.on}
  <button class="tappad live" class:flash={RCAL.flash} id="calpad" onpointerdown={hit}
    ><span>Tap with the click</span></button
  >
  <div class="bar">
    <span class="spacer"></span><span class="tick" id="calcount">{RCAL.taps} / {RCAL.n}</span>
  </div>
{/if}
{#if RCAL.done}
  {#if RCAL.result == null}
    <div class="sec">
      <div class="card">
        <p class="note">
          Not enough taps landed near a click to measure anything. Try again, and tap every click.
        </p>
      </div>
    </div>
  {:else}
    <div class="sec">
      <div class="card stack">
        <div class="setrow">
          <span class="lbl">Measured delay</span><span class="tick"
            >{Math.round(RCAL.result * 1000)} ms</span
          >
        </div>
        <p class="note">
          {RCAL.result > SLOW_DELAY_S
            ? 'That is on the slow side — some browsers add a lot. It will still work; just keep the tempo modest.'
            : 'That is a normal figure for a touchscreen.'}
        </p>
        <div class="bar">
          <button class="ghost" id="calsave" onclick={use}>Use this</button><span class="spacer"
          ></span><button class="ghost" id="calgo" onclick={start}>Measure again</button>
        </div>
      </div>
    </div>
  {/if}
{/if}
