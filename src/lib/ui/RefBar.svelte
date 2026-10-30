<!-- The bar at the top of a reference page: back to Learn, and back to the drill if one is in progress. -->
<script lang="ts">
  import { drill, armListen } from '../drills/runtime.svelte';
  import { go } from '../nav.svelte';

  interface Props {
    title: string;
    back?: { label: string; to: string };
    /** offer "Back to the drill" when a question is open */
    resume?: boolean;
  }
  const { title, back = { label: 'Learn', to: 'learn' }, resume = true }: Props = $props();

  function toDrill() {
    go('drill', { id: drill.id });
    if (drill.q && drill.q.kind === 'play' && !drill.answered) {
      armListen();
    }
  }
</script>

<div class="bar">
  <button class="ghost" id="backlearn" onclick={() => go(back.to)}>← {back.label}</button>
  {#if resume && drill.q}<button class="ghost on" id="resume" onclick={toDrill}
      >Back to the drill</button
    >{/if}
  <span class="spacer"></span><span class="tick">{title}</span>
</div>
