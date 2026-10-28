<script>
  import { onMount, onDestroy } from "svelte";
  import { entries, activeFeeding } from "$lib/stores.js";
  import Emblem from "$lib/components/Emblem.svelte";
  import Duration from "$lib/components/Duration.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import {
    startBreastFeeding,
    switchBreastSide,
    pauseBreastFeeding,
    resumeBreastFeeding,
    stopBreastFeeding,
    startBottleFeeding,
    pauseBottleFeeding,
    resumeBottleFeeding,
    stopBottleFeeding,
    bottleAmounts,
    bottleInputsValid,
    getLastBreastSide,
    deleteEntry,
    editEntry,
    toDatetimeLocal,
    fromDatetimeLocal,
    fmtTime,
    fmtDate,
    fmtSeconds,
  } from "$lib/appState.js";

  let editingId = null;
  let editStart = "";
  let editLeftMin = 0;
  let editRightMin = 0;
  let editContent = "breast_milk";
  let editBm = "";
  let editFm = "";
  let editBottleMin = 0;

  function startEdit(e) {
    editingId = e.id;
    editStart = toDatetimeLocal(e.start_time);
    if (e.feed_type === "breast") {
      editLeftMin = +((e.left_seconds || 0) / 60).toFixed(2);
      editRightMin = +((e.right_seconds || 0) / 60).toFixed(2);
    } else {
      editContent = e.bottle_content ?? "breast_milk";
      editBm = e.bottle_content
        ? (e.breast_milk_oz ?? "")
        : (e.amount_oz ?? "");
      editFm = e.formula_oz ?? "";
      editBottleMin = +((e.bottle_elapsed_seconds || 0) / 60).toFixed(2);
    }
  }

  function cancelEdit() {
    editingId = null;
  }

  function saveEdit(e) {
    const start_time = fromDatetimeLocal(editStart);
    if (e.feed_type === "breast") {
      editEntry(e.id, {
        start_time,
        left_seconds: Math.round(editLeftMin * 60),
        right_seconds: Math.round(editRightMin * 60),
      });
    } else {
      const a = bottleAmounts(editContent, editBm, editFm);
      editEntry(e.id, {
        start_time,
        bottle_content: editContent,
        breast_milk_oz: a.breastMilkOz,
        formula_oz: a.formulaOz,
        amount_oz: Math.round((a.breastMilkOz + a.formulaOz) * 100) / 100,
        bottle_elapsed_seconds: Math.round(editBottleMin * 60),
      });
    }
    editingId = null;
  }

  function removeEntry(id) {
    if (confirm("Delete this entry? This can't be undone.")) {
      deleteEntry(id);
      editingId = null;
    }
  }

  let now = new Date();
  let tick;
  let bottleContentChoice = null; // null = same contents as the last bottle
  let bmOz = "";
  let fmOz = "";

  onMount(() => {
    tick = setInterval(() => (now = new Date()), 1000);
  });
  onDestroy(() => clearInterval(tick));

  $: feedingHistory = $entries.filter(
    (e) => e.type === "feeding" && e.end_time,
  );
  let visibleCount = 10;
  $: visibleFeedings = feedingHistory.slice(0, visibleCount);
  $: lastSide = getLastBreastSide($entries);

  // Seconds elapsed on the currently-running side (not yet folded into left/right_seconds)
  $: liveSideSeconds =
    $activeFeeding?.feed_type === "breast" && $activeFeeding.active_side
      ? (now - new Date($activeFeeding.side_started_at)) / 1000
      : 0;

  $: liveLeftTotal =
    $activeFeeding?.feed_type === "breast"
      ? ($activeFeeding.left_seconds || 0) +
        ($activeFeeding.active_side === "left" ? liveSideSeconds : 0)
      : 0;
  $: liveRightTotal =
    $activeFeeding?.feed_type === "breast"
      ? ($activeFeeding.right_seconds || 0) +
        ($activeFeeding.active_side === "right" ? liveSideSeconds : 0)
      : 0;

  $: bottleLiveRunningSeconds =
    $activeFeeding?.feed_type === "bottle" &&
    $activeFeeding.bottle_running_since
      ? (now - new Date($activeFeeding.bottle_running_since)) / 1000
      : 0;
  $: bottleElapsedSeconds =
    $activeFeeding?.feed_type === "bottle"
      ? ($activeFeeding.bottle_elapsed_seconds || 0) + bottleLiveRunningSeconds
      : 0;

  $: lastBottle = $entries.find(
    (e) => e.type === "feeding" && e.feed_type === "bottle" && e.bottle_content,
  );
  $: bottleContent =
    bottleContentChoice ?? lastBottle?.bottle_content ?? "breast_milk";
  $: bottleAmountValid = bottleInputsValid(bottleContent, bmOz, fmOz);

  function resetBottle() {
    bmOz = "";
    fmOz = "";
    bottleContentChoice = null;
  }

  function cancelFeed() {
    if (!$activeFeeding) return;
    if (
      confirm(
        "Cancel this feed? The timer and anything entered will be discarded.",
      )
    ) {
      deleteEntry($activeFeeding.id);
      resetBottle();
    }
  }

  function finishBottle() {
    if (!bottleAmountValid) return;
    stopBottleFeeding({
      content: bottleContent,
      ...bottleAmounts(bottleContent, bmOz, fmOz),
    });
    resetBottle();
  }
</script>

<!--{#if lastSide}
  <h1>
    Last side used: <strong>{lastSide === "left" ? "Left" : "Right"}</strong>
  </h1>
{/if} -->

{#if $activeFeeding?.feed_type === "breast"}
  <section class="timer breast-active">
    <Emblem
      size={190}
      a="var(--magenta)"
      b="var(--cyan)"
      spin={!!$activeFeeding.active_side}
    >
      <span class="emb-num"
        ><Duration text={fmtSeconds(liveLeftTotal + liveRightTotal)} /></span
      ><span class="emb-cap"
        >{$activeFeeding.active_side ? "feeding" : "paused"}</span
      >
    </Emblem>
    <div class="sides">
      <div class="side" class:active={$activeFeeding.active_side === "left"}>
        <span class="side-label">Left</span>
        <span class="side-time"
          ><Duration text={fmtSeconds(liveLeftTotal)} /></span
        >
      </div>
      <div class="side" class:active={$activeFeeding.active_side === "right"}>
        <span class="side-label">Right</span>
        <span class="side-time"
          ><Duration text={fmtSeconds(liveRightTotal)} /></span
        >
      </div>
    </div>

    {#if $activeFeeding.active_side}
      <button class="switch" on:click={switchBreastSide}>
        Switch to {$activeFeeding.active_side === "left" ? "right" : "left"}
      </button>
      <button class="pause" on:click={pauseBreastFeeding}>Pause</button>
    {:else}
      <p class="paused-label">Paused</p>
      <div class="side-buttons">
        <button class="start left" on:click={() => resumeBreastFeeding("left")}
          >Resume left</button
        >
        <button
          class="start right"
          on:click={() => resumeBreastFeeding("right")}>Resume right</button
        >
      </div>
    {/if}
    <button class="stop" on:click={stopBreastFeeding}>Done feeding</button>
    <button class="delete" on:click={cancelFeed}>Cancel feed</button>
  </section>
{:else if $activeFeeding?.feed_type === "bottle"}
  <section class="timer bottle-active">
    <Emblem
      size={190}
      a="var(--sun)"
      b="var(--orange)"
      spin={!!$activeFeeding.bottle_running_since}
    >
      <span class="emb-num"
        ><Duration text={fmtSeconds(bottleElapsedSeconds)} /></span
      ><span class="emb-cap"
        >{$activeFeeding.bottle_running_since ? "bottle" : "paused"}</span
      >
    </Emblem>
    <p class="since">started {fmtTime($activeFeeding.start_time)}</p>

    {#if $activeFeeding.bottle_running_since}
      <button class="pause" on:click={pauseBottleFeeding}>Pause</button>
    {:else}
      <p class="paused-label">Paused</p>
      <button class="start bottle-start" on:click={resumeBottleFeeding}
        >Resume</button
      >
    {/if}

    <div class="seg three" role="group" aria-label="Bottle contents">
      <button
        aria-pressed={bottleContent === "breast_milk"}
        on:click={() => (bottleContentChoice = "breast_milk")}
        >Breast milk</button
      >
      <button
        aria-pressed={bottleContent === "formula"}
        on:click={() => (bottleContentChoice = "formula")}>Formula</button
      >
      <button
        aria-pressed={bottleContent === "combo"}
        on:click={() => (bottleContentChoice = "combo")}>Combo</button
      >
    </div>
    {#if bottleContent !== "formula"}
      <input
        class="oz-input"
        type="number"
        min="0"
        step="0.5"
        bind:value={bmOz}
        placeholder="Breast milk (oz)"
        aria-label="Breast milk in ounces"
      />
    {/if}
    {#if bottleContent !== "breast_milk"}
      <input
        class="oz-input"
        type="number"
        min="0"
        step="0.5"
        bind:value={fmOz}
        placeholder="Formula (oz)"
        aria-label="Formula in ounces"
      />
    {/if}
    <button class="stop" on:click={finishBottle} disabled={!bottleAmountValid}
      >Done feeding</button
    >
    {#if !bottleAmountValid}
      <p class="hint">
        {bottleContent === "combo"
          ? "Enter both amounts to finish."
          : "Enter the amount consumed to finish."}
      </p>
    {/if}
    <button class="delete" on:click={cancelFeed}>Cancel feed</button>
  </section>
{:else if !$activeFeeding}
  <section class="choose-type">
    <div class="type-block">
      <h2>Breastfeed</h2>
      {#if lastSide}
        <span class="card-sub"
          >last side: <span
            class="card-value"
            style="color: var({lastSide === 'left' ? '--magenta' : '--cyan'})"
          >
            {lastSide === "left" ? "Left" : "Right"}
          </span>
        </span>
      {/if}
      <div class="side-buttons">
        <button class="start left" on:click={() => startBreastFeeding("left")}
          >Start left</button
        >
        <button class="start right" on:click={() => startBreastFeeding("right")}
          >Start right</button
        >
      </div>
    </div>

    <div class="type-block">
      <h2>Bottle</h2>
      <button class="start bottle-start" on:click={startBottleFeeding}
        >Start bottle</button
      >
    </div>
  </section>
{/if}

<section class="history">
  <h2>History</h2>
  <ul>
    {#each visibleFeedings as e (e.id)}
      <li>
        {#if editingId === e.id}
          <div class="edit-form">
            <label>
              Start time
              <input type="datetime-local" bind:value={editStart} />
            </label>
            {#if e.feed_type === "breast"}
              <div class="edit-row">
                <label>
                  Left (min)
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    bind:value={editLeftMin}
                  />
                </label>
                <label>
                  Right (min)
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    bind:value={editRightMin}
                  />
                </label>
              </div>
            {:else}
              <div class="seg three" role="group" aria-label="Bottle contents">
                <button
                  aria-pressed={editContent === "breast_milk"}
                  on:click={() => (editContent = "breast_milk")}
                  >Breast milk</button
                >
                <button
                  aria-pressed={editContent === "formula"}
                  on:click={() => (editContent = "formula")}>Formula</button
                >
                <button
                  aria-pressed={editContent === "combo"}
                  on:click={() => (editContent = "combo")}>Combo</button
                >
              </div>
              {#if editContent !== "formula"}
                <label>
                  Breast milk (oz)
                  <input type="number" min="0" step="0.5" bind:value={editBm} />
                </label>
              {/if}
              {#if editContent !== "breast_milk"}
                <label>
                  Formula (oz)
                  <input type="number" min="0" step="0.5" bind:value={editFm} />
                </label>
              {/if}
              <label>
                Duration (min)
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  bind:value={editBottleMin}
                />
              </label>
            {/if}
            <div class="edit-actions">
              <button class="save" on:click={() => saveEdit(e)}>Save</button>
              <button class="cancel" on:click={cancelEdit}>Cancel</button>
              <button class="delete" on:click={() => removeEntry(e.id)}
                >Delete</button
              >
            </div>
          </div>
        {:else}
          <button class="entry-row" on:click={() => startEdit(e)}>
            <span class="badge {e.feed_type === 'bottle' ? 'b-sun' : 'b-left'}"
              ><Icon
                name={e.feed_type === "bottle" ? "bottle" : "heart"}
                size={18}
              /></span
            >
            <span class="entry-main">
              <span class="entry-date">{fmtDate(e.start_time)}</span>
              <span class="entry-time"
                >{fmtTime(e.start_time)}{#if e.feed_type !== "bottle"}
                  to {fmtTime(e.end_time)}{/if}</span
              >
              <span class="chips">
                {#if e.feed_type === "bottle"}
                  {#if e.bottle_content === "combo"}
                    <span class="chip bm">{e.breast_milk_oz} oz milk</span><span
                      class="chip fm">{e.formula_oz} oz formula</span
                    >
                  {:else if e.bottle_content === "formula"}
                    <span class="chip fm">{e.formula_oz} oz formula</span>
                  {:else if e.bottle_content === "breast_milk"}
                    <span class="chip bm"
                      >{e.breast_milk_oz} oz breast milk</span
                    >
                  {:else}
                    <span class="chip oz">{e.amount_oz} oz</span>
                  {/if}
                  <span class="chip dur"
                    >{fmtSeconds(e.bottle_elapsed_seconds || 0)}</span
                  >
                {:else}
                  <span class="chip l">L {fmtSeconds(e.left_seconds || 0)}</span
                  ><span class="chip r"
                    >R {fmtSeconds(e.right_seconds || 0)}</span
                  >
                {/if}
              </span>
            </span>
          </button>
        {/if}
      </li>
    {:else}
      <li class="empty">No feedings logged yet.</li>
    {/each}
  </ul>
  {#if feedingHistory.length > visibleCount}
    <button class="secondary show-more" on:click={() => (visibleCount += 10)}>
      Show more ({feedingHistory.length - visibleCount} left)
    </button>
  {/if}
</section>
