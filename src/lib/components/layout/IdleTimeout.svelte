<script lang="ts">
  import { onMount } from 'svelte';
  import { Button, Modal, ModalBody, ModalFooter, ModalHeader } from '@sveltestrap/sveltestrap';
  import type { IAuthService } from '$lib/utils/types';
  import { IDLE_TIMEOUT_MS, IDLE_WARNING_MS } from '$lib/config/config';

  export let authService: IAuthService;

  // Shared through localStorage so activity in any tab keeps every tab signed in.
  const ACTIVITY_KEY = 'shl-ips:lastActivity';
  const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'scroll', 'touchstart'];
  const WRITE_THROTTLE_MS = 5000;

  let lastActivity = Date.now();
  let lastWrite = 0;
  let showWarning = false;
  let secondsLeft = 0;
  let loggingOut = false;

  function readShared(): number {
    try {
      const value = Number(window.localStorage.getItem(ACTIVITY_KEY));
      return Number.isFinite(value) ? value : 0;
    } catch {
      return 0;
    }
  }

  function recordActivity(force = false) {
    const now = Date.now();
    lastActivity = now;
    if (!force && now - lastWrite < WRITE_THROTTLE_MS) return;
    lastWrite = now;
    try {
      window.localStorage.setItem(ACTIVITY_KEY, String(now));
    } catch {
      // storage unavailable: this tab's own timer still works
    }
  }

  function onActivity() {
    // While the warning is up, only the explicit button counts, so a stray
    // mouse movement doesn't dismiss it.
    if (showWarning || loggingOut) return;
    recordActivity();
  }

  function stay() {
    showWarning = false;
    recordActivity(true);
  }

  async function signOut() {
    if (loggingOut) return;
    loggingOut = true;
    showWarning = false;
    await authService.logout();
  }

  function check() {
    if (loggingOut) return;
    // Date arithmetic rather than a countdown, so a throttled or suspended
    // background tab still signs out as soon as it wakes.
    const idleMs = Date.now() - Math.max(lastActivity, readShared());
    if (idleMs >= IDLE_TIMEOUT_MS) {
      signOut();
    } else if (idleMs >= IDLE_TIMEOUT_MS - IDLE_WARNING_MS) {
      secondsLeft = Math.ceil((IDLE_TIMEOUT_MS - idleMs) / 1000);
      showWarning = true;
    } else {
      showWarning = false;
    }
  }

  onMount(() => {
    if (IDLE_TIMEOUT_MS <= 0) return;

    // A fresh page load counts as activity (also resets a stale timestamp left by a previous session)
    recordActivity(true);
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true, capture: true }));
    document.addEventListener('visibilitychange', check);
    const interval = setInterval(check, 1000);

    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, onActivity, { capture: true }));
      document.removeEventListener('visibilitychange', check);
      clearInterval(interval);
    };
  });
</script>

<Modal isOpen={showWarning} backdrop="static" keyboard={false}>
  <ModalHeader>Are you still there?</ModalHeader>
  <ModalBody>
    For your privacy, you will be signed out in {secondsLeft} second{secondsLeft === 1 ? '' : 's'} due to inactivity.
  </ModalBody>
  <ModalFooter>
    <Button color="secondary" outline on:click={signOut}>Sign out now</Button>
    <Button color="primary" on:click={stay}>Stay signed in</Button>
  </ModalFooter>
</Modal>
