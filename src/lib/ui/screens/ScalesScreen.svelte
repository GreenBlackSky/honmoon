<!-- The Scales family: its own session, the drills, where you stand, and which scales are in. -->
<script lang="ts">
  import { honmoon, setSetting, queueSave } from '../../store/honmoon.svelte';
  import { bassHere } from '../../music/bass';
  import {
    SCALES,
    SGROUPS,
    degPretty,
    enabledScales,
    scaleCards,
    scaleOn,
  } from '../../music/scales';
  import { IC } from '../../notation/icons';
  import { scaleDrillsInApp, sdrillOn } from '../../drills/registry.svelte';
  import { startDrill, startSession } from '../../drills/runtime.svelte';
  import { go, hasRoute } from '../../nav.svelte';
  import { toggledIn } from '../../util/list';
  import { scaleMatrix, scaleStats } from '../scaleboard';
  import Stat from '../Stat.svelte';
  import BassRow from '../BassRow.svelte';

  const scaleDrills = scaleDrillsInApp();
  const enabled = $derived(enabledScales());
  const pairs = $derived(scaleCards().length);
  const summary = $derived(scaleStats());
  const needsBass = scaleDrills.some((def) => def.bass);
  /* which groups of scales mean anything for this app's drills: arpeggios
     and the rest are always in play, so every group is shown */
  function toggleSdrill(id: string) {
    const off = toggledIn(honmoon.settings.sdoff || [], id);
    if (scaleDrills.every((def) => off.includes(def.id))) {
      return; // never switch every scale drill off
    }
    honmoon.settings.sdoff = off;
    queueSave();
  }
  function toggleScale(id: string) {
    honmoon.settings.sen = toggledIn(honmoon.settings.sen || [], id);
    queueSave();
  }
</script>

<div class="sec">
  <div class="bar">
    <button class="ghost" id="back" onclick={() => go('home')}>← Practice</button>
    <span class="spacer"></span><span class="tick">Scales</span>
  </div>
</div>

<div class="sec">
  <div class="card sesscard stack">
    <div>
      <div style="font-family:var(--f-disp);font-size:22px;letter-spacing:.02em">Scale session</div>
      <p class="note" style="margin:4px 0 0">
        Nothing but scale-and-key pairs, for when you want a run of them. They also turn up in the
        daily session unless you switch the family off there.
      </p>
    </div>
    <div class="levels">
      {#each [10, 20, 30] as n (n)}
        <button
          class="chip sm"
          data-set="sslen"
          data-val={n}
          aria-pressed={+(honmoon.settings.sslen || 20) === n}
          onclick={() => setSetting('sslen', n)}>{n}</button
        >
      {/each}
    </div>
    <div>
      <div class="hint" style="margin-bottom:6px">Drills</div>
      <div class="levels">
        {#each scaleDrills as def (def.id)}
          {@const away = def.bass && !bassHere()}
          <button
            class="chip sm tog"
            data-sdrill={def.id}
            aria-pressed={sdrillOn(def.id) && !away}
            disabled={away}
            style={away ? 'opacity:.5' : ''}
            onclick={() => toggleSdrill(def.id)}>{def.nm}{def.bass ? ' ♪' : ''}</button
          >
        {/each}
      </div>
    </div>
    {#if needsBass}<BassRow />{/if}
    <div>
      <div class="hint" style="margin-bottom:6px">Roots</div>
      <div class="levels">
        <button
          class="chip sm"
          data-set="sroots"
          data-val="nat"
          aria-pressed={honmoon.settings.sroots !== 'all'}
          onclick={() => setSetting('sroots', 'nat')}>Natural only</button
        >
        <button
          class="chip sm"
          data-set="sroots"
          data-val="all"
          aria-pressed={honmoon.settings.sroots === 'all'}
          onclick={() => setSetting('sroots', 'all')}>All twelve</button
        >
        {#if needsBass || scaleDrills.some((def) => def.id === 'scbuild' || def.id === 'scwrong' || def.id === 'scname')}
          <button
            class="chip sm"
            data-set="sstart"
            data-val="both"
            aria-pressed={honmoon.settings.sstart === 'both'}
            onclick={() => setSetting('sstart', 'both')}>Either string</button
          >
          <button
            class="chip sm"
            data-set="sstart"
            data-val="E"
            aria-pressed={honmoon.settings.sstart === 'E'}
            onclick={() => setSetting('sstart', 'E')}>E only</button
          >
          <button
            class="chip sm"
            data-set="sstart"
            data-val="A"
            aria-pressed={honmoon.settings.sstart === 'A'}
            onclick={() => setSetting('sstart', 'A')}>A only</button
          >
        {/if}
      </div>
    </div>
    <button class="start" id="startscale" onclick={() => startSession('scales')}
      >Start scale session</button
    >
    <p class="note" style="text-align:center;margin:0">
      {enabled.length} scales · {pairs} scale-and-key pairs in rotation
    </p>
    {#if !enabled.length}<p class="err">Switch at least one scale on below.</p>{/if}
  </div>
</div>

{#if hasRoute('sx')}
  <div class="sec">
    <button class="drill ref" data-go="sx" onclick={() => go('sx')}
      ><span class="ic">{@html IC.book}</span>
      <span
        ><span class="nm">Scale explorer</span><br /><span class="sb"
          >Every scale in every key on the neck, with degrees, fingerings and the notes spelled
          properly.</span
        ></span
      >
      <span class="mast">→</span></button
    >
  </div>
{/if}

<div class="sec">
  <h2>Where you stand</h2>
  <Stat
    items={[
      { v: summary.seen, k: 'Met' },
      { v: summary.solid, k: 'Solid' },
      { v: summary.ans, k: 'Answers' },
      { v: summary.ans ? summary.acc + '%' : '—', k: 'Accuracy' },
    ]}
  />
  <div class="card" style="margin-top:10px">
    {@html scaleMatrix()}
    <div class="legend" style="margin-top:10px">
      <span><b class="m0"></b>not met</span><span><b class="m1"></b>shaky</span>
      <span><b class="m3"></b>getting there</span><span><b class="m5"></b>solid</span>
    </div>
  </div>
  <p class="note">
    One square per scale in one key — {summary.total} of them in rotation. Squares you miss come back
    sooner and more often, exactly as they do on the Drills side. This is the same spaced repetition,
    just over scales.
  </p>
</div>

<div class="sec">
  <h2>Single drills</h2>
  <div class="drills">
    {#each scaleDrills as def (def.id)}
      <button class="drill" data-drill={def.id} onclick={() => startDrill(def.id, 'scale')}
        ><span class="ic">{@html IC[def.ic]}</span>
        <span><span class="nm">{def.nm}</span><br /><span class="sb">{def.sb}</span></span><span
          class="mast">→</span
        ></button
      >
    {/each}
  </div>
</div>

{#each SGROUPS as group (group)}
  <div class="sec">
    <h2>{group}</h2>
    <div class="stack">
      {#each SCALES.filter((scale) => scale.g === group) as scale (scale.id)}
        <div class="scrow" class:on={scaleOn(scale.id)}>
          <button
            class="chip sm tog"
            data-scale={scale.id}
            aria-pressed={scaleOn(scale.id)}
            onclick={() => toggleScale(scale.id)}>{scale.n}</button
          >
          <span class="ivs">{scale.dg.map(degPretty).join(' ')}</span>
          <p class="note">{scale.d}</p>
        </div>
      {/each}
    </div>
  </div>
{/each}
