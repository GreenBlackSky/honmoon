<!--
  One question at a time, for any drill. What is drawn depends on the kind of
  question; the answer area, the explanation and the verdict are shared.
-->
<script lang="ts">
  import { honmoon } from '../../store/honmoon.svelte';
  import { STRINGS, lvl, vhi, placesFor, sameNoteFrets } from '../../music/bass';
  import { SYSNAME, bothNames, keyName, midiName, noteName, pcOf, relOf } from '../../music/notes';
  import { clefDef, multiClef } from '../../music/clefs';
  import { chPool, ivDef } from '../../music/intervals';
  import {
    degPretty,
    midFret,
    noteText,
    rootName,
    scaleDef,
    scaleName,
    scaleNotes,
    scaleNoun,
    scaleShape,
  } from '../../music/scales';
  import {
    rlev,
    rhBpm,
    rhFloor,
    rhRec,
    rhSetBpm,
    TEMPO_MAX,
    tsSentence,
    type TimeSig,
  } from '../../music/rhythm';
  import { staffSVG, degStaffSVG } from '../../notation/staff';
  import { rhOneSVG, rhythmSVG, tapTimeline } from '../../notation/rhythmsvg';
  import {
    holdNote,
    holdStop,
    piano,
    pianoChord,
    playInterval,
    playScale,
    playScaleEar,
    pluck,
  } from '../../audio/synth';
  import { rhPlay } from '../../audio/rhythmplay';
  import { micUsable } from '../../audio/mic';
  import { anyDrillDef, isScaleDrill } from '../../drills/defs';
  import { groupDef } from '../../drills/registry.svelte';
  import type { Question } from '../../drills/questions';
  import { verdictOf } from '../../drills/verdict';
  import {
    drill,
    session,
    chooseOption,
    choosePc,
    endSession,
    handleFret,
    listen,
    nextQ,
    rtapCancel,
    rtapGo,
    rtapHit,
    selfMark,
    skip,
    tapInstead,
    tapPad,
  } from '../../drills/runtime.svelte';
  import { go, hasRoute } from '../../nav.svelte';
  import { anA } from '../../util/text';
  import { fretFrac, hscroll } from '../actions';
  import Fretboard from '../Fretboard.svelte';
  import Keyboard from '../Keyboard.svelte';
  import StaffRun from '../StaffRun.svelte';
  import RhythmBar from '../RhythmBar.svelte';
  import { boardTopFor, scaleBoard, stepsOnlyHTML } from '../scaleboard';

  /** The question on screen. (Kept short: the markup below reads it hundreds of times.) */
  const q = $derived(drill.q);
  const drillDef = $derived(drill.id ? anyDrillDef(drill.id) : null);
  const pref = $derived(honmoon.settings.pref);
  const level = $derived(lvl());
  const hints = $derived(honmoon.settings.hints !== false);
  const current = $derived(session.current);

  /** Kinds added after the original port, and the ear-training kinds: they get their own controls. */
  const NEW_KINDS = ['mdo', 'deg2fb', 'singdeg', 'rvalue', 'rcount', 'rfill', 'rhear', 'rtap'];
  const EAR_KINDS = ['ivhear', 'chhear', 'ivsee', 'ivbuild', 'singit', 'earscale'];
  const isNew = (kind: string) => NEW_KINDS.includes(kind);
  const isEar = (kind: string) => EAR_KINDS.includes(kind);
  const isSc = (kind: string) => kind.startsWith('sc');
  /** Which extra button the skip bar of a newer kind carries. */
  function newKindExtra(kind: string): 'tonic' | 'rplay' | undefined {
    if (kind === 'mdo' || kind === 'deg2fb') {
      return 'tonic';
    }
    return kind === 'rcount' ? 'rplay' : undefined;
  }

  /** Written pitch is an octave above sounding pitch. */
  const OCTAVE = 12;
  /** The low E string as it sounds (E1): a bare pitch class is played from there up. */
  const LOW_E_SOUNDING = 28;
  const E_PC = 4;
  /** Scale shapes start on the E string unless the question says otherwise. */
  const DEFAULT_SHAPE_STRING = 3;
  const TEMPO_NUDGE = 4;
  /** A dot on the neck for a right or wrong answer. */
  const answerDot = (cell: { s: number; f: number }, fill: string) => ({
    s: cell.s,
    f: cell.f,
    fill,
    r: 11,
  });

  /* ---- the bar across the top ---- */
  const top = $derived.by(() => {
    if (!current) {
      return null;
    }
    const entry = current.queue[current.i];
    const isRedo = !!(entry && entry.retry);
    let pendingRedos = 0;
    for (let at = current.i + (isRedo ? 1 : 0); at < current.queue.length; at++) {
      if (current.queue[at].retry) {
        pendingRedos++;
      }
    }
    return {
      at: Math.min(current.plannedDone + (isRedo ? 0 : 1), current.planned),
      isRedo,
      pend: pendingRedos,
      pct: ((100 * current.i) / Math.max(1, current.queue.length)).toFixed(1),
    };
  });
  const back = $derived.by(() => {
    const inScales =
      (current && current.mode === 'scales') || (drill.id != null && isScaleDrill(drill.id));
    if (inScales) {
      return { id: 'backscales', n: 'Scales', to: () => go('scales') };
    }
    const group = drill.fam ? groupDef(drill.fam) : null;
    if (group) {
      return { id: 'backfam', n: group.n, to: () => go('fam', { fam: drill.fam }) };
    }
    return { id: 'back', n: 'Practice', to: () => go('home') };
  });

  /* ---- sounds ---- */
  /** The sounding pitch a note question is about, if it has one. */
  function soundingMidi(question: Question): number | null {
    if ('note' in question && question.note) {
      return question.note.m - OCTAVE;
    }
    if ('pos' in question && question.pos) {
      return question.pos.m - OCTAVE;
    }
    if ('target' in question && typeof question.target === 'number') {
      return question.target;
    }
    if ('pc' in question && isFinite(question.pc)) {
      return LOW_E_SOUNDING + pcOf(question.pc - E_PC);
    }
    return null;
  }
  function hearIt(question: Question) {
    if ('sid' in question && question.sid != null) {
      playScale(
        question.sid,
        question.root,
        ('start' in question && question.start) || DEFAULT_SHAPE_STRING,
      );
      return;
    }
    const midi = soundingMidi(question);
    if (midi != null && isFinite(midi)) {
      pluck(midi);
    }
  }
  function earPlay() {
    const question = drill.q;
    if (!question) {
      return;
    }
    if (question.kind === 'earscale') {
      playScaleEar(question.sid, question.root);
      question.played = true;
      return;
    }
    if (question.kind === 'chhear') {
      pianoChord(question.notes, null, 2.2, 0.75);
      question.played = true;
    } else if (question.kind === 'singit') {
      holdNote(question.root);
    } else if (question.kind === 'ivhear') {
      playInterval(question.root, question.semis, false);
      question.played = true;
    }
  }
  /** Sing-the-interval: the starting note again, then the one you should have sung, held. */
  function earAnswer() {
    const question = drill.q;
    if (!question || question.kind !== 'singit') {
      return;
    }
    const target = question.root + question.semis * (question.dir || 1);
    holdStop();
    piano(question.root, null, 1.1);
    setTimeout(() => holdNote(target), 800);
  }
  /** C2: the tonic of a key is played from here. */
  const TONIC_BASE = 36;
  /** Major-triad offsets above the tonic. */
  const MAJOR_TRIAD = [0, 4, 7];
  /** The key: its triad, then the tonic held. */
  function hearTonic() {
    const question = drill.q;
    if (!question || !('keyPc' in question)) {
      return;
    }
    holdStop();
    const tonic = TONIC_BASE + OCTAVE + question.keyPc;
    pianoChord(
      MAJOR_TRIAD.map((step) => tonic + step),
      null,
      1.4,
      0.6,
    );
    setTimeout(() => holdNote(tonic), 900);
  }
  /** Sing-the-degree: the tonic, then the degree asked for, held. */
  function singDegAnswer() {
    const question = drill.q;
    if (!question || question.kind !== 'singdeg') {
      return;
    }
    holdStop();
    const tonic = TONIC_BASE + OCTAVE + question.keyPc;
    const target = tonic + relOf(question.pc, question.keyPc);
    piano(tonic, null, 0.9, 0.7);
    setTimeout(() => holdNote(target), 700);
  }
  const COUNT_IN_BEATS = 4;
  function playBar() {
    const question = drill.q;
    if (!question || !('bar' in question)) {
      return;
    }
    rhPlay(question.bar, rhBpm(), { countIn: COUNT_IN_BEATS, beats: true });
    if (question.kind === 'rhear') {
      question.played = true;
    }
  }
  function toCalibration() {
    go('rcal', { from: 'drill' });
  }
  function toStaffMap() {
    go('ref');
  }
  function keyLabel(pc: number, question: { sys?: string }) {
    const system = question.sys === 'staff' ? 'en' : (question.sys as 'en' | 'solf');
    return noteName(pc, system, pref);
  }
  const tsCap = (ts: TimeSig) => '<b>' + ts[0] + '/' + ts[1] + '</b> — ' + tsSentence(ts);
  const hiOf = boardTopFor;
  const fretsOf = (cells: { f: number }[]) => cells.map((cell) => cell.f);

  const verdict = $derived(drill.answered && q ? verdictOf(q, drill) : null);
  const tunerLabel = $derived(listen.midi ? bothNames(pcOf(Math.round(listen.midi)), pref) : '—');
  const cents = $derived(
    listen.midi ? Math.round((listen.midi - Math.round(listen.midi)) * 100) : 0,
  );
  const micLive = $derived(micUsable() && honmoon.settings.mic);
</script>

{#snippet tempoRow(showBest: boolean)}
  {@const record = rhRec()}
  {@const bpm = rhBpm()}
  <div class="tempo">
    <button
      class="tbtn"
      data-bpm="-4"
      aria-label="slower"
      disabled={bpm <= rhFloor()}
      onclick={() => rhSetBpm(rhBpm() - TEMPO_NUDGE)}>−</button
    >
    <span class="bv"><b>{bpm}</b> bpm</span>
    <button
      class="tbtn"
      data-bpm="4"
      aria-label="faster"
      disabled={bpm >= TEMPO_MAX}
      onclick={() => rhSetBpm(rhBpm() + TEMPO_NUDGE)}>+</button
    >
    {#if showBest && record.best}<span class="spacer"></span><span class="best"
        >best clean {record.best}</span
      >{/if}
  </div>
{/snippet}

{#snippet skipBar(extra?: 'hearscale' | 'tonic' | 'rplay' | 'hear')}
  <div class="bar">
    {#if extra === 'hearscale'}<button
        class="ghost"
        id="hearscaleq"
        onclick={() =>
          q &&
          'sid' in q &&
          playScale(q.sid, q.root, ('start' in q && q.start) || DEFAULT_SHAPE_STRING)}
        >♪ Hear it</button
      >{/if}
    {#if extra === 'tonic'}<button class="ghost" id="heartonic" onclick={hearTonic}
        >♪ Hear the key</button
      >{/if}
    {#if extra === 'rplay'}<button class="ghost" id="rplay" onclick={playBar}>♪ Hear it</button
      >{/if}
    {#if extra === 'hear'}
      <button class="ghost" id="hear" onclick={() => q && hearIt(q)}>♪ Hear it</button>
      {#if q?.kind === 'staff2name' && hasRoute('ref')}<button
          class="ghost"
          id="tomap"
          onclick={toStaffMap}>Staff map</button
        >{/if}
    {/if}
    <span class="spacer"></span><button class="ghost" id="skip" onclick={skip}>Skip</button>
  </div>
{/snippet}

{#snippet selfPanel(fromStaff: boolean)}
  <div class="card stack">
    <p class="note">
      {micUsable()
        ? 'Microphone grading is switched off in Setup.'
        : 'This viewer does not hand the page a microphone, so playing cannot be graded automatically.'}
      Play it, check yourself against the sound, then say how it went. It still counts towards your progress.
    </p>
    <div class="bar">
      <button class="ghost" id="hear" onclick={() => q && hearIt(q)}>♪ Hear it</button>
      {#if fromStaff && hasRoute('ref')}<button class="ghost" id="tomap" onclick={toStaffMap}
          >Staff map</button
        >{/if}
      <span class="spacer"></span><button class="ghost" id="skip" onclick={skip}>Skip</button>
    </div>
    <div class="keys">
      <button class="key v-ok" data-self="ok" onclick={() => selfMark(true)}>I played it</button
      ><button class="key v-no" data-self="no" onclick={() => selfMark(false)}>Missed it</button>
    </div>
  </div>
{/snippet}

{#if !q}
  <div class="card">
    <p class="lead">
      Nothing to drill at this range yet. Pick another range on the Practice screen.
    </p>
  </div>
{:else}
  <!-- where you are -->
  {#if current && top}
    <div class="bar">
      <button class="ghost" id="endsess" onclick={endSession}>End session</button>
      <span class="tick">{top.at} / {current.planned}</span>
      {#if top.isRedo}<span class="tag">redo</span>{/if}
      {#if top.pend}<span class="tick">+{top.pend} to redo</span>{/if}
      <span class="spacer"></span><span class="tick">{drillDef ? drillDef.nm : ''}</span>
    </div>
    <div class="prog"><i style="width:{top.pct}%"></i></div>
  {:else}
    <div class="bar">
      <button class="ghost" id={back.id} onclick={back.to}>← {back.n}</button>
      <span class="tick">{drill.session.c} / {drill.session.n} this session</span><span
        class="spacer"
      ></span>
      <span class="tick">{drillDef ? drillDef.nm : ''}</span>
    </div>
  {/if}

  <!-- the question -->
  {#if q.kind === 'fb2name'}
    <div class="stage slim">
      <div class="ask">Which note is marked? Answer in {SYSNAME[q.sys]}</div>
      <div
        class="fbwrap"
        id="fbw"
        use:hscroll={{ frac: fretFrac(q.pos.f, level.lo, vhi()), key: q }}
      >
        <Fretboard
          lo={level.lo}
          hi={vhi()}
          cells={[{ s: q.pos.s, f: q.pos.f, fill: 'var(--accent)', r: 11 }]}
          noLabels={!honmoon.settings.labels}
        />
      </div>
    </div>
  {/if}
  {#if q.kind === 'name2fb'}
    {@const cells = drill.answered
      ? [
          answerDot(q.pos, 'var(--good)'),
          ...(drill.altCell ? [answerDot(drill.altCell, 'var(--good)')] : []),
          ...(drill.wrongCell ? [answerDot(drill.wrongCell, 'var(--bad)')] : []),
        ]
      : []}
    <div class="stage">
      <div class="ask">Find this note on the {STRINGS[q.pos.s].n} string</div>
      <div class="bignote">{noteName(q.pc, q.sys, pref)}</div>
    </div>
    <div
      class="fbwrap"
      id="fbw"
      use:hscroll={{
        frac: drill.answered ? fretFrac(q.pos.f, level.lo, vhi()) : null,
        left: drill.answered ? null : drill.fbScroll,
        key: drill.answered ? 'ans' : q,
      }}
    >
      <Fretboard
        lo={level.lo}
        hi={vhi()}
        {cells}
        tap={!drill.answered}
        onlyString={q.pos.s}
        onTap={handleFret}
      />
    </div>
    {#if !drill.answered}
      <div class="sub">
        Tap the fret on the highlighted {STRINGS[q.pos.s].n} string. Fret 0 is the open string, left of
        the nut{sameNoteFrets(q.pos.s, q.pc).length > 1
          ? '. This note is on the string twice, an octave apart — either will do'
          : ''}.
      </div>
    {/if}
    {#if drill.answered && drill.octaveOff}<div class="sub">
        Both spots are that note; the one it had in mind was fret {q.pos.f}.
      </div>{/if}
  {/if}
  {#if q.kind === 'staffkey'}
    {@const keyCells = drill.answered
      ? [
          { pc: q.pc, fill: 'var(--good)', label: noteName(q.pc, 'en', pref) },
          ...(drill.wrongKey != null && pcOf(drill.wrongKey) !== q.pc
            ? [
                {
                  midi: drill.wrongKey,
                  fill: 'var(--bad)',
                  label: noteName(pcOf(drill.wrongKey), 'en', pref),
                },
              ]
            : []),
        ]
      : []}
    <div class="stage slim"><div class="ask">Which key is this note?</div></div>
    <div class="staffwrap one">{@html staffSVG(q.note.m, pref, q.clef)}</div>
    <Keyboard lo={48} oct={1} tap={!drill.answered} cells={keyCells} />
    {#if !drill.answered}<div class="sub">
        Any octave — the board shows one. {clefDef(q.clef).n} clef.
      </div>{/if}
  {/if}
  {#if q.kind === 'staff2name' || (q.kind === 'play' && q.sys === 'staff')}
    <div class="stage">
      <div class="ask">
        {q.kind === 'play'
          ? 'Read it, then play it'
          : 'Name this note in ' + SYSNAME[q.sys as 'en' | 'solf']}
      </div>
      <div class="staffwrap">{@html staffSVG(q.note!.m, pref, q.clef || 'bass')}</div>
      {#if multiClef()}<div class="tick">{clefDef(q.clef || 'bass').n} clef</div>{/if}
    </div>
  {/if}
  {#if q.kind === 'translate'}
    <div class="stage">
      <div class="ask">Say it in {SYSNAME[q.sys]}</div>
      <div class="bignote">{noteName(q.pc, q.from, pref)}</div>
    </div>
  {/if}
  {#if q.kind === 'play' && q.sys !== 'staff'}
    <div class="stage">
      <div class="ask">Play this note — any octave, anywhere on the neck</div>
      <div class="bignote">{noteName(q.pc, q.sys, pref)}</div>
    </div>
  {/if}

  <!-- movable do and degrees -->
  {#if q.kind === 'mdo'}
    <div class="stage">
      <div class="keychip">Key of {keyName(q.keyPc)}</div>
      <div class="ask">
        {q.from === 'syll'
          ? 'Which note is that, in this key?'
          : 'Which ' +
            (q.mode === 'deg' ? 'scale degree' : 'movable-do syllable') +
            ' is this, in this key?'}
      </div>
      {#if q.from === 'staff'}<div class="staffwrap">{@html staffSVG(q.m!, pref, q.clef)}</div>
      {:else if q.from === 'syll'}<div class="bignote">{q.ask}</div>
      {:else}<div class="bignote">{noteName(q.pc, 'en', pref)}</div>{/if}
      {#if q.from === 'staff' && multiClef()}<div class="tick">{clefDef(q.clef!).n} clef</div>{/if}
    </div>
  {/if}
  {#if q.kind === 'deg2fb'}
    {@const degreeCells = drill.answered
      ? [
          answerDot(q.pos, 'var(--good)'),
          ...(drill.wrongCell ? [answerDot(drill.wrongCell, 'var(--bad)')] : []),
        ]
      : []}
    <div class="stage slim">
      <div class="keychip">Key of {keyName(q.keyPc)}</div>
      <div class="ask">Find the {q.ask} of this key on the neck</div>
      <div class="tick">any octave, anywhere it lies</div>
    </div>
    <div class="fbwrap" id="fbw">
      <Fretboard
        lo={level.lo}
        hi={vhi()}
        cells={degreeCells}
        tap={!drill.answered}
        noLabels={!honmoon.settings.labels}
        onTap={handleFret}
      />
    </div>
  {/if}
  {#if q.kind === 'singdeg'}
    <div class="stage">
      <div class="keychip">Key of {keyName(q.keyPc)}</div>
      <div class="ask">Hear the key, then sing the {q.ask}</div>
      <button class="start" id="heartonic" style="width:auto" onclick={hearTonic}
        >♪ Play the key</button
      >
      <button
        class="mbtn"
        id="hushbtn"
        aria-label="Stop the sound"
        title="Stop the sound"
        onclick={holdStop}>■</button
      >
    </div>
    <div class="card stack">
      <p class="note">
        Sing it, hold it, then check yourself — the answer plays the note you were after and shows
        you where it sits on the neck. Nothing here can hear you, so this one is on your honour.
      </p>
      <div class="bar">
        <button class="ghost" id="singdegans" onclick={singDegAnswer}>♪ Play the answer</button
        ><span class="spacer"></span><button class="ghost" id="skip" onclick={skip}>Skip</button>
      </div>
      {#if !drill.answered}<div class="keys">
          <button class="key v-ok" data-self="ok" onclick={() => selfMark(true)}>I got it</button
          ><button class="key v-no" data-self="no" onclick={() => selfMark(false)}>Missed it</button
          >
        </div>{/if}
    </div>
    {#if drill.answered}
      <div class="fbwrap">
        <Fretboard
          lo={level.lo}
          hi={vhi()}
          cells={placesFor(q.pc)
            .slice(0, 4)
            .map((place) => answerDot(place, 'var(--accent)'))}
          noLabels={!honmoon.settings.labels}
        />
      </div>
    {/if}
  {/if}

  <!-- rhythm -->
  {#if q.kind === 'rvalue'}
    <div class="stage">
      <div class="ask">How long is this {q.rest ? 'rest' : 'note'}? Counting in 4/4</div>
      <div class="staffwrap one">{@html rhOneSVG(q.u, q.rest)}</div>
    </div>
  {/if}
  {#if q.kind === 'rcount'}
    <div class="stage slim"><div class="ask">Which counting matches this bar?</div></div>
    <RhythmBar bar={q.bar} count={drill.answered} />
    {#if hints}<div class="tscap">{@html tsCap(q.bar.ts)}</div>{/if}
    {#if !drill.answered}{@render tempoRow(false)}{/if}
  {/if}
  {#if q.kind === 'rfill'}
    <div class="stage slim">
      <div class="ask">One value is missing. Which one fills the bar?</div>
      <div class="tick">{q.bar.ts[0]}/{q.bar.ts[1]}</div>
    </div>
    <RhythmBar bar={q.bar} blank={drill.answered ? -1 : q.blank} />
    {#if hints}<div class="tscap">{@html tsCap(q.bar.ts)}</div>{/if}
  {/if}
  {#if q.kind === 'rhear'}
    <div class="stage">
      <div class="ask">Which of these was played?</div>
      <button class="start" id="rplay" style="width:auto" onclick={playBar}
        >♪ Play {q.played ? 'again' : 'it'}</button
      >
      <div class="sub">Four clicks to count you in, then the rhythm.</div>
    </div>
    {@render tempoRow(false)}
    {#if hints}<div class="tscap">{@html tsCap(q.bar.ts)}</div>{/if}
    <div class="ropts">
      {#each q.ropts as option, index (index)}
        <button
          class="ropt"
          class:ok={drill.answered && option.ok}
          class:no={drill.answered && !option.ok && index === drill.chosen}
          data-oi={index}
          disabled={drill.answered}
          onclick={() => chooseOption(index)}
        >
          <span class="rn">{index + 1}</span>{@html rhythmSVG(option.b, { scale: 0.8 })}</button
        >
      {/each}
    </div>
  {/if}
  {#if q.kind === 'rtap'}
    <div class="stage slim">
      <div class="ask">Read this bar, then tap it with the click</div>
      <div class="tick">
        {q.bar.ts[0]}/{q.bar.ts[1]} · {rlev().n.toLowerCase()}{honmoon.settings.rlat
          ? ' · ' + Math.round(honmoon.settings.rlat * 1000) + ' ms allowed for your screen'
          : ''}
      </div>
    </div>
    <RhythmBar bar={q.bar} count={true} />
    {#if hints && q.phase !== 'run'}<div class="tscap">{@html tsCap(q.bar.ts)}</div>{/if}
    {#if q.phase === 'ready'}
      {@render tempoRow(true)}
      <div class="sec">
        <button class="start" id="rtapgo" onclick={rtapGo}>Count me in</button>
        <div class="bar">
          <button class="ghost" id="rplay" onclick={playBar}>♪ Hear it first</button>
          <span class="spacer"></span>
          {#if hasRoute('rcal')}<button class="ghost" id="rcalib" onclick={toCalibration}
              >Calibrate the tap delay</button
            >{/if}
        </div>
      </div>
    {/if}
    {#if q.phase === 'run'}
      <button
        class="tappad"
        class:live={!q.counting}
        class:flash={tapPad.flash}
        id="tappad"
        onpointerdown={rtapHit}><span>{q.counting ? 'Counting in…' : 'Tap'}</span></button
      >
      <div class="bar">
        <button class="ghost" id="rtapcancel" onclick={rtapCancel}>Stop</button><span class="spacer"
        ></span><span class="tick" id="tapcount"
          >{q.taps.length}{q.taps.length === 1 ? ' tap' : ' taps'}</span
        >
      </div>
    {/if}
    {#if drill.answered && q.grade}
      {@const grade = q.grade}
      <div class="card stack">
        <div class="tick">Written above the line, what you played below</div>
        {@html tapTimeline(grade, q.bar, q.gstart!, q.gspu!)}
        <div class="legend">
          <span><b style="background:var(--ink-3)"></b>written</span>
          <span><b style="background:var(--good)"></b>on it</span>
          <span><b style="background:var(--mid)"></b>close</span>
          <span><b style="border:1.6px solid var(--bad);border-radius:50%"></b>nothing played</span>
          <span><b style="background:var(--bad)"></b>tap with no note</span>
        </div>
        <p class="note">
          Every tap you made is drawn, wherever it landed — {grade.taps} registered, {grade.got} matched
          a written note{grade.extra
            ? ', ' + grade.extra + ' landed nowhere near one'
            : ''}{grade.extra
            ? '. A tap parked at the edge under an arrow was too early or too late to fit on the picture.'
            : '.'}
        </p>
      </div>
    {/if}
    {#if !drill.answered && q.grade === null && q.phase === 'ready'}{@render skipBar()}{/if}
  {/if}

  <!-- note-name answers -->
  {#if 'opts' in q}
    <div class="keys" id="keys">
      {#each q.opts as pc (pc)}
        <button
          class="key"
          class:ok={drill.answered && pc === q.pc}
          class:no={drill.answered && pc !== q.pc && pc === drill.chosen}
          data-pc={pc}
          disabled={drill.answered}
          onclick={() => choosePc(pc)}>{keyLabel(pc, q)}</button
        >
      {/each}
    </div>
  {/if}

  <!-- ear -->
  {#if q.kind === 'ivhear' || q.kind === 'chhear'}
    <div class="stage">
      <div class="ask">
        {q.kind === 'chhear' ? 'What kind of chord is this?' : 'How far apart are these two notes?'}
      </div>
      <button class="start" id="earplay" style="width:auto" onclick={earPlay}
        >♪ Play {q.played ? 'again' : 'it'}</button
      >
      <div class="sub">
        {q.kind === 'chhear'
          ? 'All the notes together.' +
            (chPool().length < 3
              ? ' Major against minor is the first thing to hear; widen the interval set in this family and seven types join in.'
              : '')
          : 'Played one after the other, low to high.'}
      </div>
    </div>
  {/if}
  {#if q.kind === 'earscale'}
    <div class="stage">
      <div class="ask">Which scale was that?</div>
      <button class="start" id="earplay" style="width:auto" onclick={earPlay}
        >♪ Play {q.played ? 'again' : 'it'}</button
      >
      <div class="sub">
        Straight up from the root to the octave. Listen for where the small steps fall.
      </div>
    </div>
  {/if}
  {#if q.kind === 'ivsee'}
    {@const lastFret = hiOf([q.a.f, q.b.f])}
    <div class="stage slim"><div class="ask">From 1 to 2 — how far is that?</div></div>
    <div
      class="fbwrap"
      id="fbw"
      use:hscroll={{ frac: fretFrac(Math.round((q.a.f + q.b.f) / 2), 0, lastFret), key: q }}
    >
      <Fretboard
        lo={0}
        hi={lastFret}
        cells={[
          {
            s: q.a.s,
            f: q.a.f,
            fill: 'var(--accent)',
            r: 11,
            label: '1',
            fs: 11,
            tc: 'var(--accent-ink)',
          },
          { s: q.b.s, f: q.b.f, fill: 'var(--good)', r: 11, label: '2', fs: 11, tc: 'var(--bg)' },
        ]}
      />
    </div>
  {/if}
  {#if q.kind === 'ivbuild'}
    {@const buildCells = [
      {
        s: q.base.s,
        f: q.base.f,
        fill: 'var(--accent)',
        r: 11,
        label: 'R',
        fs: 11,
        tc: 'var(--accent-ink)',
      },
      ...(drill.answered
        ? [
            answerDot(q.target, 'var(--good)'),
            ...(drill.wrongCell ? [answerDot(drill.wrongCell, 'var(--bad)')] : []),
          ]
        : []),
    ]}
    <div class="stage slim">
      <div class="ask">
        Tap {anA(ivDef(q.semis).n.toLowerCase())} above the marked note, on the same string
      </div>
      <div class="tick">
        {bothNames(pcOf(q.rootMidi), pref)} on the {STRINGS[q.base.s].n} string
      </div>
    </div>
    <div class="fbwrap" id="fbw">
      <Fretboard
        lo={0}
        hi={hiOf([q.target.f])}
        cells={buildCells}
        tap={!drill.answered}
        onlyString={q.base.s}
        onTap={handleFret}
      />
    </div>
  {/if}
  {#if q.kind === 'singit'}
    <div class="stage">
      <div class="ask">
        You will hear a note. Sing {anA(ivDef(q.semis).n.toLowerCase())}
        {q.dir > 0 ? 'above' : 'below'} it
      </div>
      <button class="start" id="earplay" style="width:auto" onclick={earPlay}
        >♪ Play and hold the note</button
      >
      <button
        class="mbtn"
        id="hushbtn"
        aria-label="Stop the sound"
        title="Stop the sound"
        onclick={holdStop}>■</button
      >
      {#if drill.answered}<div class="sub">
          {midiName(q.root)} → {midiName(q.root + q.semis * q.dir)}
        </div>{/if}
    </div>
  {/if}

  <!-- scales -->
  {#if q.kind === 'scbuild'}
    {@const shape = q.shape}
    {@const scaleCells = [
      ...shape.pos.slice(0, q.idx).map((pos) => ({
        s: pos.s,
        f: pos.f,
        fill: 'var(--good)',
        r: 11,
        label: degPretty(pos.deg.deg),
        fs: 11,
        tc: 'var(--bg)',
      })),
      ...(q.wrong ? [answerDot(q.wrong, 'var(--bad)')] : []),
      ...(q.reveal && q.idx < shape.pos.length
        ? [
            {
              s: shape.pos[q.idx].s,
              f: shape.pos[q.idx].f,
              fill: 'none',
              stroke: 'var(--accent)',
              sw: 2.4,
              r: 12,
            },
          ]
        : []),
      ...(drill.answered
        ? shape.pos.slice(q.idx).map((pos) => ({
            s: pos.s,
            f: pos.f,
            fill: 'var(--accent)',
            r: 11,
            label: degPretty(pos.deg.deg),
            fs: 11,
            tc: 'var(--accent-ink)',
          }))
        : []),
    ]}
    <div class="stage slim">
      <div class="ask">
        Tap {scaleName(q.sid, q.root)} in order, from the {STRINGS[q.start].n} string
      </div>
      <div class="tick">
        {q.idx} / {shape.pos.length}{q.misses ? ' · ' + q.misses + ' wrong' : ''}
      </div>
    </div>
    <div class="fbwrap" id="fbw">
      <Fretboard
        lo={0}
        hi={hiOf(fretsOf(shape.pos))}
        cells={scaleCells}
        tap={!drill.answered}
        onTap={handleFret}
      />
    </div>
    {#if !drill.answered}<div class="sub">
        Ascending, starting on the root. Two wrong taps and it will show you the next note.
      </div>{/if}
  {/if}
  {#if q.kind === 'scwrong'}
    {@const wrongCells = [
      ...q.shown.map((pos, index) => ({
        s: pos.s,
        f: pos.f,
        fill:
          drill.answered && (index === q.bad || index === drill.chosenIdx)
            ? 'var(--bad)'
            : 'var(--accent)',
        r: 11,
        label: drill.answered ? degPretty(pos.deg.deg) : '',
        fs: 11,
        tc: 'var(--accent-ink)',
      })),
      ...(drill.answered
        ? [
            {
              s: q.shape.pos[q.bad].s,
              f: q.shape.pos[q.bad].f,
              fill: 'var(--good)',
              r: 11,
              label: degPretty(q.shape.pos[q.bad].deg.deg),
              fs: 11,
              tc: 'var(--bg)',
            },
          ]
        : []),
    ]}
    {@const lastFret = hiOf(fretsOf(q.shown))}
    <div class="stage slim">
      <div class="ask">{scaleName(q.sid, q.root)} — one note has moved a fret. Tap it.</div>
    </div>
    <div
      class="fbwrap"
      id="fbw"
      use:hscroll={{ frac: fretFrac(midFret(q.shown), 0, lastFret), key: q }}
    >
      <Fretboard
        lo={0}
        hi={lastFret}
        cells={wrongCells}
        tap={!drill.answered}
        only={q.shown.map((pos) => ({ s: pos.s, f: pos.f }))}
        onTap={handleFret}
      />
    </div>
  {/if}
  {#if q.kind === 'scname'}
    {@const lastFret = hiOf(fretsOf(q.shape.pos))}
    <div class="stage slim">
      <div class="ask">Root {rootName(q.root)} shown in accent. Which scale is this?</div>
    </div>
    <div
      class="fbwrap"
      id="fbw"
      use:hscroll={{ frac: fretFrac(midFret(q.shape.pos), 0, lastFret), key: q }}
    >
      <Fretboard
        lo={0}
        hi={lastFret}
        cells={q.shape.pos.map((pos) => ({
          s: pos.s,
          f: pos.f,
          fill: pos.deg.semis % OCTAVE === 0 ? 'var(--accent)' : 'var(--good)',
          r: 11,
        }))}
      />
    </div>
  {/if}
  {#if q.kind === 'scstaff'}
    <div class="stage slim">
      <div class="ask">
        It starts on {rootName(q.root)}. Which {scaleNoun(q.sid)} is written here?
      </div>
    </div>
    <div class="card">
      {@html degStaffSVG(q.sid, q.root, null, null, { labels: drill.answered ? 'both' : 'none' })}
    </div>
    {#if !drill.answered}<div class="sub">
        Bass clef, one octave up from the root. Read the sharps and flats against the major scale on {rootName(
          q.root,
        )}.
      </div>{/if}
  {/if}
  {#if q.kind === 'scwrite'}
    <div class="stage slim">
      <div class="ask">Which staff shows {scaleName(q.sid, q.root)}?</div>
    </div>
    <div class="ropts">
      {#each q.sopts as option, index (index)}
        <button
          class="ropt sopt"
          class:ok={drill.answered && option.ok}
          class:no={drill.answered && !option.ok && index === drill.chosen}
          data-oi={index}
          disabled={drill.answered}
          onclick={() => chooseOption(index)}
        >
          <span class="rn">{index + 1}</span>
          {@html degStaffSVG(option.sid, q.root, null, null, {
            labels: drill.answered ? 'letters' : 'none',
            alter: option.alter,
          })}
          {#if drill.answered}<span class="sname"
              >{option.alter
                ? scaleName(option.sid, q.root) + ' with one note moved — not a real scale'
                : scaleName(option.sid, q.root)}</span
            >{/if}
        </button>
      {/each}
    </div>
  {/if}
  {#if q.kind === 'scsteps'}
    <div class="stage">
      <div class="ask">
        Which {scaleNoun(q.sid)} has {q.form === 'steps' ? 'these steps' : 'this formula'}?
      </div>
      {#if q.form === 'steps'}{@html stepsOnlyHTML(q.sid)}{:else}<div
          class="dform"
          style="align-items:center"
        >
          <span>{scaleDef(q.sid).dg.map(degPretty).join(' ')}</span>
        </div>{/if}
      <div class="sub">
        {q.form === 'steps'
          ? 'Frets from each note to the next, starting on the root and ending on the octave.'
          : 'Every note measured from the root. Plain numbers are where the major scale has them; ♭ is a fret lower.'}
      </div>
    </div>
  {/if}
  {#if q.kind === 'screcipe'}
    <div class="stage">
      <div class="ask">
        {q.form === 'steps' ? 'What are the steps of' : 'What is the formula of'}
      </div>
      <div class="bignote" style="font-size:clamp(26px,8vw,38px)">{scaleDef(q.sid).n}</div>
      <div class="sub">
        {q.form === 'steps'
          ? 'Frets from each note to the next, root to octave.'
          : 'Each note as a degree, counting the root as 1.'}
      </div>
    </div>
  {/if}
  {#if q.kind === 'scdeg'}
    <div class="stage">
      <div class="ask">In {scaleName(q.sid, q.root)}</div>
      <div class="bignote">{q.ask}</div>
      <div class="sub">
        {q.dir === 'note' ? 'which note is that degree?' : 'which degree is that note?'}
      </div>
    </div>
  {/if}
  {#if q.kind === 'scplay'}
    <div class="stage">
      <div class="ask">Play this scale, ascending</div>
      {#if q.show === 'name'}<div class="bignote" style="font-size:clamp(26px,8vw,40px)">
          {scaleName(q.sid, q.root)}
        </div>
      {:else if q.show === 'letters'}<div class="notesrow">
          {#each scaleNotes(q.sid, q.root) as note, i (i)}<span class="nchip"
              ><b>{noteText(note)}</b></span
            >{/each}
        </div>
      {:else}<div class="fbwrap">
          <StaffRun
            midis={scaleShape(q.sid, q.root, q.start, 1).pos.map(
              (pos) => STRINGS[pos.s].open + pos.f,
            )}
            {pref}
            tappable={false}
          />
        </div>{/if}
    </div>
    {#if drill.answered}
      {@const board = scaleBoard(q.sid, q.root, q.start, 'deg')}
      <div class="fbwrap" use:hscroll={{ frac: fretFrac(board.cf, board.lo, board.hi), key: q }}>
        <Fretboard lo={board.lo} hi={board.hi} cells={board.cells} />
      </div>
    {/if}
  {/if}

  <!-- multiple choice -->
  {#if 'choices' in q}
    <div class="keys" class:countopts={q.kind === 'rcount' || q.kind === 'screcipe'} id="keys">
      {#each q.choices as choice, index (index)}
        <button
          class="key"
          class:ok={drill.answered && choice.ok}
          class:no={drill.answered && !choice.ok && index === drill.chosen}
          data-oi={index}
          disabled={drill.answered}
          onclick={() => chooseOption(index)}>{choice.t}</button
        >
      {/each}
    </div>
  {/if}
  {#if q.kind === 'singit'}
    <div class="card stack">
      <p class="note">
        Sing it, then check yourself — the answer plays the note you were aiming for. Nothing here
        can hear you, so this one is on your honour.
      </p>
      <div class="bar">
        <button class="ghost" id="earanswer" onclick={earAnswer}>♪ Play the answer</button><span
          class="spacer"
        ></span><button class="ghost" id="skip" onclick={skip}>Skip</button>
      </div>
      {#if !drill.answered}<div class="keys">
          <button class="key v-ok" data-self="ok" onclick={() => selfMark(true)}>I got it</button
          ><button class="key v-no" data-self="no" onclick={() => selfMark(false)}>Missed it</button
          >
        </div>{/if}
    </div>
  {/if}
  {#if isEar(q.kind) && q.kind !== 'singit' && !drill.answered}{@render skipBar()}{/if}
  {#if q.kind === 'scplay'}{@render selfPanel(false)}
  {:else if isSc(q.kind) && !drill.answered}{@render skipBar('hearscale')}{/if}

  <!-- play along -->
  {#if q.kind === 'play'}
    {#if !micLive}{@render selfPanel(q.sys === 'staff')}
    {:else}
      <div class="card stack">
        {#if listen.reason}
          <div class="failbox">
            <div class="ft">{listen.reason.t}</div>
            <p class="note" style="margin:4px 0 0">{listen.reason.m}</p>
          </div>
        {:else}
          <div class="tuner">
            <span class="nt">{tunerLabel}</span><span class="hz"
              >{listen.freq ? listen.freq.toFixed(1) + ' Hz' : 'listening'}</span
            >
          </div>
          <div class="cents">
            <span class="mid"></span><span
              class="ndl"
              style="left:{50 + Math.max(-50, Math.min(50, cents)) * 0.9}%"
            ></span>
          </div>
          <div class="meter">
            <i style="width:{Math.min(100, Math.round((listen.rms * 100) / 0.06))}%"></i>
          </div>
          <p class="note">
            {q.sys === 'staff'
              ? 'Play it on any string — the octave is checked, the position is not.'
              : 'Any octave, anywhere on the neck.'} It needs about a second of clean note — let it ring.
          </p>
        {/if}
        <div class="bar">
          <button class="ghost" id="hear" onclick={() => hearIt(q)}>♪ Hear it</button>
          {#if q.sys === 'staff'}<button class="ghost" id="tapinstead" onclick={tapInstead}
              >Answer by tapping</button
            >{#if hasRoute('ref')}<button class="ghost" id="tomap" onclick={toStaffMap}
                >Staff map</button
              >{/if}{/if}
          <span class="spacer"></span><button class="ghost" id="skip" onclick={skip}>Skip</button>
        </div>
      </div>
    {/if}
  {/if}

  <!-- the newer drills explain themselves -->
  {#if drillDef && drillDef.how && hints && !drill.answered}
    <div class="howbox">
      <span class="q">?</span>
      <div>
        <div class="ht">{drillDef.nm}</div>
        <p>{@html drillDef.how}</p>
        {#if drillDef.kind === 'rhythm' && hasRoute('rref')}<div class="bar" style="margin-top:8px">
            <button class="ghost" onclick={() => go('rref')}>How rhythm is written</button>
          </div>{/if}
      </div>
    </div>
  {/if}

  <!-- the verdict, or the controls -->
  {#if verdict}
    <div class="verdict" class:ok={verdict.ok} class:no={!verdict.ok}>
      <span class="txt">{verdict.txt}</span><button class="next" id="next" onclick={nextQ}
        >{verdict.ok ? 'Next' : 'Got it'}</button
      >
    </div>
    {#each verdict.subs as line, i (i)}<div class="sub" style="text-align:left">{line}</div>{/each}
  {:else if isNew(q.kind) && q.kind !== 'rtap' && q.kind !== 'singdeg'}
    {@render skipBar(newKindExtra(q.kind))}
  {:else if q.kind !== 'play' && !isEar(q.kind) && !isNew(q.kind) && !isSc(q.kind)}
    {@render skipBar('hear')}
  {/if}
{/if}
