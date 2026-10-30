<!--
  A copy of your progress you can keep, and a way to bring one back. Until
  Firebase sync is set up this is the only backup there is: clearing the
  browser's data, or uninstalling the app from the home screen, loses it.
-->
<script lang="ts">
  import { exportText, importText } from '../store/honmoon.svelte';
  const { appId = 'honmoon' }: { appId?: string } = $props();
  let msg = $state('');
  let input: HTMLInputElement;

  function exportNow() {
    const blob = new Blob([exportText()], { type: 'application/json' });
    const link = document.createElement('a');
    const today = new Date().toISOString().slice(0, 10);
    link.href = URL.createObjectURL(blob);
    link.download = appId + '-progress-' + today + '.json';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      URL.revokeObjectURL(link.href);
      link.remove();
    }, 1000);
    msg = 'Saved ' + link.download + ' to your downloads.';
  }
  async function picked(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) {
      return;
    }
    const text = await file.text();
    if (
      !confirm(
        'Replace the progress in this app with the file you picked? Your settings stay as they are.',
      )
    ) {
      input.value = '';
      return;
    }
    msg = importText(text).msg;
    input.value = '';
  }
</script>

<div class="sec">
  <h2>Your data</h2>
  <div class="card stack">
    <p class="note">
      Progress is kept in this browser only. Save a copy now and then — clearing the browser's data
      or removing the app from your home screen would lose it. A file saved from Fretboard Fluency
      can be brought in here too.
    </p>
    <div class="bar">
      <button class="ghost" id="exportprog" onclick={exportNow}>Save a copy</button>
      <button class="ghost" id="importprog" onclick={() => input.click()}>Bring one back</button>
      <input
        bind:this={input}
        type="file"
        accept="application/json,.json"
        hidden
        onchange={picked}
      />
    </div>
    {#if msg}<p class="note" style="margin:0">{msg}</p>{/if}
  </div>
</div>
