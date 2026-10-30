<!-- The metronome on its own page. It keeps running while you move around the app. -->
<script lang="ts">
  import MetronomePanel from '../MetronomePanel.svelte';
  import BackBar from '../BackBar.svelte';
  import { go } from '../../nav.svelte';
  const { back = { label: 'Warm up', to: 'warmhome' } }: { back?: { label: string; to: string } } =
    $props();
</script>

<BackBar label={back.label} title="Metronome" sec onBack={() => go(back.to)} />
<div class="sec">
  <MetronomePanel />
  <p class="note" style="margin-top:10px">
    It keeps running while you move around the app — the beats are scheduled on the audio clock, not
    by the page.
  </p>
</div>
