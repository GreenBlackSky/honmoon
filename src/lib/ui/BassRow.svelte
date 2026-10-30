<!-- One control, offered wherever a session is about to start: is the bass in the room? -->
<script lang="ts">
  import { setSetting } from '../store/honmoon.svelte';
  import { bassHere } from '../music/bass';
  const on = $derived(bassHere());
</script>

<div>
  <div class="hint" style="margin-bottom:6px">Bass</div>
  <div class="levels">
    <button
      class="chip sm"
      data-set="bass"
      data-val="true"
      aria-pressed={on}
      onclick={() => setSetting('bass', true)}>With me</button
    >
    <button
      class="chip sm"
      data-set="bass"
      data-val="false"
      aria-pressed={!on}
      onclick={() => setSetting('bass', false)}>Left at home</button
    >
  </div>
  {#if !on}<p class="note" style="margin-top:6px">
      The play-along drills are out until you say otherwise. Everything else works with nothing but
      the screen.
    </p>{/if}
</div>
