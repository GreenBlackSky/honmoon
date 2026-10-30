<!--
  The frame every Honmoon app sits in: the header with its tabs, the scrolling
  main column, and the error bar. If anything throws it says so on screen —
  a silent exception looks exactly like a dead button, and that is not a
  thing to debug twice.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { onMount } from 'svelte';
  import { honmoon } from '../store/honmoon.svelte';
  import { met, metStop } from '../audio/metronome.svelte';
  import { go, nav, setScroller } from '../nav.svelte';
  import { installTapFix } from './tapfix';
  import type { Tab } from './types';

  interface Props {
    appName: string;
    /** the app's mark beside its name: an SVG drawn in currentColor (the accent) */
    icon?: string;
    tabs: Tab[];
    /** which tab owns a screen no tab lists */
    fallbackTab?: string;
    /** override for screens whose tab depends on where they were opened from */
    tabFor?: (view: string) => string | null;
    children: Snippet;
  }
  const { appName, icon, tabs, fallbackTab, tabFor, children }: Props = $props();

  let main: HTMLElement;
  let oops = $state('');

  const active = $derived.by(() => {
    const view = nav.view.name;
    const custom = tabFor?.(view);
    if (custom) {
      return custom;
    }
    const owner = tabs.find((tab) => tab.views.includes(view));
    return owner?.id ?? fallbackTab ?? tabs[0]?.id;
  });

  /* The stylesheet already knows how to be forced one way or the other; this
     just sets the attribute it looks for, and removes it to follow the device. */
  $effect(() => {
    const theme = honmoon.settings.theme || 'auto';
    if (theme === 'auto') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  });

  onMount(() => {
    installTapFix();
    setScroller(main);
    /* an uncaught error shows in a strip at the bottom: there is no console on a phone */
    const onError = (event: ErrorEvent) => {
      oops = '⚠ ' + ((event && event.message) || 'script error');
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event && event.reason;
      oops = '⚠ promise: ' + ((reason && (reason.message || reason.code)) || reason);
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  });
</script>

<div id="app">
  <header>
    <div class="brand">
      {#if icon}<span class="mk icon">{@html icon}</span>{:else}<span class="mk"></span>{/if}<span
        class="bt">{appName}</span
      >
    </div>
    {#if met.on}
      <button class="hbtn metchip" id="metchip" onclick={metStop}>♩{met.bpm} ■</button>
    {/if}
    {#each tabs as tab (tab.id)}
      <button
        class="hbtn"
        id={tab.id}
        aria-current={active === tab.id ? 'true' : 'false'}
        onclick={() => go(tab.to)}>{@html tab.label}</button
      >
    {/each}
  </header>
  <main id="main" bind:this={main}>
    {@render children()}
  </main>
  <div id="oops" hidden={!oops}>{oops}</div>
</div>
