<script lang="ts">
  import { Col, Icon, Toast, ToastHeader, ToastBody } from '@sveltestrap/sveltestrap';
  import { type ToastStore } from '$lib/utils/toast';
  import { getContext, onMount } from 'svelte';

  const toast: ToastStore = getContext('toast');

  const iconMap = {
    success: 'check-circle-fill',
    danger: 'x-octagon-fill',
    info: 'info-circle-fill',
    warning: 'exclamation-triangle-fill',
  };
  
  const headerMap = {
    success: 'Success',
    danger:  'Error',
    info:    'Info',
    warning: 'Warning',
  };

  const NAV_HEIGHT = 63; // The height of the nav, so that the static/fixed transition happens at the right place
  
  let footerVisible = false;
  let sentinel: HTMLElement;
  
  onMount(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { footerVisible = entry.isIntersecting; },
      {
        threshold: 0,
        // Shrink the bottom of the root viewport inward by the nav height.
        // The sentinel is now considered "intersecting" only when it reaches
        // the imaginary line where the top of the fixed nav sits.
        rootMargin: `0px 0px -${NAV_HEIGHT}px 0px`,
      }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  });
</script>

<div class="toast-container-anchor">
  <div bind:this={sentinel} class="toast-container-sentinel mt-5" aria-hidden="true"></div>
  <div class="toast-container {footerVisible ? 'toast-container--docked' : 'toast-container--fixed'}">
    {#each $toast as msg (msg.id)}
      <Toast
        isOpen={msg.visible}
        class="shadow {msg.type}"
        data-type={msg.type}
        transition={{ duration: 300 }}
        fade={true}
      >
        <ToastHeader
          toggle={() => toast.dismiss(msg.id)}
        >
        <Icon name={iconMap[msg.type] ?? iconMap['info']} slot="icon" class= "text-{msg.type}"/>
        <div class='ms-2'>
          {headerMap[msg.type] ?? headerMap['info']}
        </div>
        </ToastHeader>
        <ToastBody>{msg.message}</ToastBody>
      </Toast>
    {/each}
  </div>
</div>

<style lang="scss">
  .toast-container-anchor {
    position: relative;
  }
  .toast-container-sentinel {
    height: 0;
  }
  .toast-container {
    // bottom: 5rem;
    right: 1rem;
    z-index: 1100;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;

    &--fixed {
      position: fixed;
      bottom: 5rem;
      // left: 0;
      // right: 0;
    }

    &--docked {
      bottom: 1rem;
      position: absolute;
    }
  }

  :global(.toast-container .toast) {
    border-top: 0;
    border-right: 0;
    border-bottom: 0;
    border-left: 0;
  }

  :global(.toast-container .toast[data-type="success"]) {
    border-left: 4px solid var(--bs-success);
  }

  :global(.toast-container .toast[data-type="danger"]) {
    border-left: 4px solid var(--bs-danger);
  }

  :global(.toast-container .toast[data-type="warning"]) {
    border-left: 4px solid var(--bs-warning);
  }

  :global(.toast-container .toast[data-type="info"]) {
    border-left: 4px solid var(--bs-info);
  }
</style>