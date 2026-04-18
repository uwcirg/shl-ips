<script lang="ts">
  import { Toast, ToastHeader, ToastBody } from '@sveltestrap/sveltestrap';
  import { type ToastStore } from '$lib/utils/toast';
  import { getContext } from 'svelte';

  const toast: ToastStore = getContext('toast');

  const iconMap = {
    success: '✓',
    danger:  '✕',
    info:    'ℹ',
    warning: '⚠',
  };
  
  const headerMap = {
    success: 'Success',
    danger:  'Error',
    info:    'Info',
    warning: 'Warning',
  };
</script>

<div class="toast-container">
  {#each $toast as msg (msg.id)}
    <Toast
      isOpen={msg.visible}
      class="border-0 shadow"
      transition={{ duration: 300 }}
    >
      <ToastHeader
        icon={msg.type}
        toggle={() => toast.dismiss(msg.id)}
      >
        {iconMap[msg.type] ?? 'ℹ'}
        {headerMap[msg.type] ?? 'Notification'}
      </ToastHeader>
      <ToastBody>{msg.message}</ToastBody>
    </Toast>
  {/each}
</div>

<style>
  .toast-container {
    position: fixed;
    bottom: 5rem;
    right: 1rem;
    z-index: 1100;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
</style>