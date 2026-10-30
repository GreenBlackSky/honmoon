<!-- The sharps-and-flats switch, shown in both the places you might look for it:
     beside the range on the neck screen, and in Setup under Notes. -->
<script lang="ts">
  import { setSetting } from '../store/honmoon.svelte';
  import { accOn } from '../music/bass';
  const on = $derived(accOn());
</script>

<div class="setrow">
  <span class="lbl">Sharps and flats</span>
  <button
    class="chip sm"
    data-set="acc"
    data-val={String(!on)}
    aria-pressed={on}
    onclick={() => setSetting('acc', !on)}>{on ? 'In' : 'Out'}</button
  >
  <span class="hint"
    >{on
      ? 'All twelve notes are in rotation. Which name a black note gets — F♯ or G♭ — follows the sharps-or-flats choice below.'
      : 'Only the seven natural notes: A B C D E F G. Switch this on when those feel automatic, and the five black notes join in — on the neck, on the staff, and in every drill that names a note.'}</span
  >
</div>
