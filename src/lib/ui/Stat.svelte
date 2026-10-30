<!-- The four-up row of big numbers at the top of Practice, Stats and the summaries. -->
<script lang="ts">
  const { items }: { items: { v: string | number; k: string }[] } = $props();
</script>

<div class="statrow">
  {#each items as item (item.k)}
    <div>
      <div class="v">{item.v}</div>
      <div class="k">{item.k}</div>
    </div>
  {/each}
</div>
