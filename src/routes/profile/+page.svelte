<script>
  import { supabase } from "$lib/supabase.js";
  import { session, household } from "$lib/stores.js";
  import { syncNow, loadHousehold } from "$lib/sync.js";
  import {
    createAccount,
    signInWithPassword,
    changePassword,
    validateCredentials,
    emailToUsername,
    MIN_PASSWORD,
  } from "$lib/auth.js";

  let mode = "signin"; // 'signin' | 'create'
  let username = "";
  let password = "";
  let confirm = "";
  let authError = "";
  let authBusy = false;

  let newPassword = "";
  let passwordMessage = "";

  let syncing = false;
  let lastSyncMessage = "";
  let joinCode = "";
  let householdMessage = "";
  let busy = false;

  $: if ($session && !$household) loadHousehold();

  function switchMode(next) {
    mode = next;
    authError = "";
    password = "";
    confirm = "";
  }

  async function submitAuth() {
    authError = "";
    if (mode === "create") {
      const problem = validateCredentials(username, password);
      if (problem) return (authError = problem);
      if (password !== confirm) return (authError = "Passwords do not match.");
    } else if (!username.trim() || !password) {
      return (authError = "Enter your username and password.");
    }
    authBusy = true;
    const result =
      mode === "create"
        ? await createAccount(username, password)
        : await signInWithPassword(username, password);
    authBusy = false;
    if (result.error) return (authError = result.error);
    password = "";
    confirm = "";
    syncNow();
  }

  async function signOut() {
    await supabase.auth.signOut();
    household.set(null);
    username = "";
  }

  async function submitPassword() {
    const result = await changePassword(newPassword);
    passwordMessage = result.error ?? "Password updated.";
    if (!result.error) newPassword = "";
  }

  async function manualSync() {
    syncing = true;
    lastSyncMessage = "";
    try {
      await syncNow();
      lastSyncMessage = `Synced at ${new Date().toLocaleTimeString()}`;
    } catch (e) {
      lastSyncMessage = "Sync failed. Check your connection.";
    }
    syncing = false;
  }

  async function runHousehold(call) {
    busy = true;
    householdMessage = "";
    const { error } = await call;
    if (error) {
      householdMessage = error.message;
    } else {
      await loadHousehold();
      await syncNow();
      joinCode = "";
    }
    busy = false;
  }

  const createHousehold = () => runHousehold(supabase.rpc("create_household"));
  const joinHousehold = () =>
    runHousehold(supabase.rpc("join_household", { code: joinCode }));
</script>

<!--<h1>Profile</h1>-->
<img class="logo" src="/logo.png" alt="" width="104" height="104" />

{#if !$session}
  <section class="auth">
    <p>
      {#if mode === "create"}
        Create a username and password. You can use them to sign in on any
        device, or if you ever get signed out. Keep logging offline in the
        meantime; entries sync once you sign in.
      {:else}
        Sign in with your username and password to sync your log across devices.
      {/if}
    </p>
    <form on:submit|preventDefault={submitAuth}>
      <label class="field">
        Username
        <input
          type="text"
          bind:value={username}
          autocomplete="username"
          autocapitalize="off"
          spellcheck="false"
        />
      </label>
      <label class="field">
        Password
        <input
          type="password"
          bind:value={password}
          autocomplete={mode === "create" ? "new-password" : "current-password"}
        />
      </label>
      {#if mode === "create"}
        <label class="field">
          Confirm password
          <input
            type="password"
            bind:value={confirm}
            autocomplete="new-password"
          />
        </label>
        <p class="hint">
          At least {MIN_PASSWORD} characters. There is no email on file, so a forgotten
          password can't be reset. Save it in a password manager.
        </p>
      {/if}
      <p class="form-error" role="alert" aria-live="polite">{authError}</p>
      <button type="submit" class="primary" disabled={authBusy}>
        {authBusy
          ? "Working…"
          : mode === "create"
            ? "Create account"
            : "Sign in"}
      </button>
    </form>
    <p class="switch-mode">
      {#if mode === "create"}
        Already have an account? <button
          class="link"
          on:click={() => switchMode("signin")}>Sign in</button
        >
      {:else}
        New here? <button class="link" on:click={() => switchMode("create")}
          >Create an account</button
        >
      {/if}
    </p>
  </section>
{:else}
  <section class="account">
    <div class="account-card" style="display: grid">
      <span class="label">Signed in as</span>
      <span class="value">{emailToUsername($session.user.email)}</span>
    </div>

    <button class="secondary" on:click={manualSync} disabled={syncing}>
      {syncing ? "Syncing…" : "Sync now"}
    </button>
    {#if lastSyncMessage}<p class="sync-message">{lastSyncMessage}</p>{/if}

    <h2 style="margin-top: 1.75rem">Shared household</h2>
    {#if $household}
      <div class="account-card" style="display: grid">
        <span class="label">Invite code</span>
        <span class="value">{$household.invite_code}</span>
      </div>
      <p class="sync-message">
        Your partner signs in, opens Profile, and enters this code to see the
        same data.
      </p>
    {:else}
      <p class="sync-message">
        Create a household to share your log with a partner, or join theirs with
        an invite code.
      </p>
      <button class="primary" on:click={createHousehold} disabled={busy}
        >Create household</button
      >
      <input
        type="text"
        bind:value={joinCode}
        placeholder="Invite code"
        aria-label="Invite code"
        autocapitalize="off"
        autocomplete="off"
      />
      <button
        class="secondary"
        on:click={joinHousehold}
        disabled={busy || !joinCode.trim()}>Join household</button
      >
    {/if}
    {#if householdMessage}<p class="sync-message">{householdMessage}</p>{/if}

    <h2 style="margin-top: 1.75rem">Change password</h2>
    <form on:submit|preventDefault={submitPassword}>
      <label class="field">
        New password
        <input
          type="password"
          bind:value={newPassword}
          autocomplete="new-password"
        />
      </label>
      <button type="submit" class="secondary" disabled={!newPassword}
        >Update password</button
      >
    </form>
    {#if passwordMessage}<p class="sync-message" role="status">
        {passwordMessage}
      </p>{/if}

    <button class="danger" on:click={signOut} style="margin-top: 1.75rem"
      >Sign out</button
    >
  </section>
{/if}
