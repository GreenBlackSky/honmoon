<!-- The metronome's controls: tempo, start/stop, feel, subdivision, tap tempo. -->
<script lang="ts">
  import {
    BPM_MAX,
    BPM_MIN,
    met,
    metSetBpm,
    metSetSub,
    metTap,
    metToggle,
  } from '../audio/metronome.svelte';
  const { compact = false }: { compact?: boolean } = $props();

  /** From here up the buttons move two beats per minute at a time, below it one. */
  const FAST_TEMPO = 120;
  const stepDown = () => (met.bpm > FAST_TEMPO ? 2 : 1);
  const stepUp = () => (met.bpm >= FAST_TEMPO ? 2 : 1);
  const clampBpm = (bpm: number) => Math.max(BPM_MIN, Math.min(BPM_MAX, bpm));
  const sliderValue = (event: Event) => +(event.target as HTMLInputElement).value;
  const FEELS: [number, string][] = [
    [4, '4/4'],
    [3, '3/4'],
    [6, '6/8'],
  ];
  const SUBDIVISIONS: [number, string][] = [
    [1, 'Quarters'],
    [2, 'Eighths'],
    [3, 'Triplets'],
    [4, '16ths'],
  ];
</script>

<div class="card met stack">
  <div class="metrow">
    <button class="mbtn" id="bpmdn" onclick={() => metSetBpm(met.bpm - stepDown())}>−</button>
    <div class="bpm"><span class="v">{met.bpm}</span><span class="u">bpm</span></div>
    <button class="mbtn" id="bpmup" onclick={() => metSetBpm(met.bpm + stepUp())}>+</button>
    <span class="metdot {met.flash}" id="metdot"></span>
    <span class="tick" id="metbeat">{met.on ? met.beatLabel : '—'}</span>
    <span class="spacer"></span>
    <button
      class={met.on ? 'ghost on' : 'start'}
      id="mettoggle"
      style="width:auto"
      onclick={metToggle}>{met.on ? 'Stop' : 'Start'}</button
    >
  </div>
  <input
    class="slider"
    id="bpmslider"
    type="range"
    min={BPM_MIN}
    max={BPM_MAX}
    step="1"
    value={met.bpm}
    aria-label="tempo"
    oninput={(event) => {
      met.bpm = clampBpm(sliderValue(event));
    }}
    onchange={(event) => metSetBpm(sliderValue(event))}
  />
  {#if !compact}
    <div class="bar">
      <span class="hint">Feel</span>
      {#each FEELS as [beats, title] (beats)}
        <button
          class="chip sm"
          data-met="beats"
          data-val={beats}
          aria-pressed={met.beats === beats}
          onclick={() => {
            met.beats = beats;
          }}>{title}</button
        >
      {/each}
    </div>
    <div class="bar">
      <span class="hint">Click</span>
      {#each SUBDIVISIONS as [sub, title] (sub)}
        <button
          class="chip sm"
          data-met="sub"
          data-val={sub}
          aria-pressed={met.sub === sub}
          onclick={() => metSetSub(sub)}>{title}</button
        >
      {/each}
    </div>
    <div class="bar">
      <button
        class="ghost"
        class:on={met.subClick}
        id="metsubclick"
        onclick={() => {
          met.subClick = !met.subClick;
        }}>{met.subClick ? 'Subdivisions audible' : 'Subdivisions silent'}</button
      >
      <button class="ghost" id="mettap" onclick={metTap}>Tap tempo</button>
    </div>
  {/if}
</div>
