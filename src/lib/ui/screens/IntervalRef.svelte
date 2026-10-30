<!-- What an interval is: all twelve, what they sound like, and why one shape works in every key. -->
<script lang="ts">
  import { IVS } from '../../music/intervals';
  import { playInterval } from '../../audio/synth';
  import RefBar from '../RefBar.svelte';
  const { back }: { back?: { label: string; to: string } } = $props();
  /** Every interval is played up from E3. */
  const START_NOTE = 52;
</script>

<RefBar title="Intervals" {back} />
<div class="sec">
  <div class="card">
    <p class="note">
      An interval is the distance between two notes, counted in semitones — on bass, in frets. It is
      the same distance wherever you play it, which is why one shape works in every key, and it is
      what you are actually doing when you sing: you do not sing frets, you sing distances.
    </p>
  </div>
</div>
<div class="sec">
  <h2>The twelve</h2>
  <div class="card stack">
    {#each IVS as interval (interval.s)}
      <div class="scrow on">
        <button
          class="chip sm"
          data-ivplay={interval.s}
          onclick={() => playInterval(START_NOTE, interval.s, false)}>{interval.ab}</button
        >
        <span class="ivs">{interval.n} · {interval.s}{interval.s === 1 ? ' fret' : ' frets'}</span>
        <p class="note">{interval.c}</p>
      </div>
    {/each}
  </div>
  <p class="note">Tap any of them to hear it played from the same starting note.</p>
</div>
