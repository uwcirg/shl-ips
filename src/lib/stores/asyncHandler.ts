import { writable } from 'svelte/store';
import type { ToastStore, ToastOptions } from './toast';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

// Module-level singleton toast reference
let _toastStore: ToastStore | null = null;

export function initAsyncHandler(toastStore: ToastStore) {
  _toastStore = toastStore;
}

export function createAsyncHandler<T>(
  fetcher: (...args: any[]) => Promise<T>,
  errorToast?: Partial<ToastOptions>
) {
  const { subscribe, set } = writable<AsyncState<T>>({
    data: null,
    loading: false,
    error: null
  });

  async function load(...args: any[]) {
    set({ data: null, loading: true, error: null });
    try {
      const data = await fetcher(...args);
      set({ data, loading: false, error: null });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      set({ data: null, loading: false, error });

      _toastStore?.add({
        type: 'danger',
        title: errorToast?.title ?? 'Failed to load',
        message: errorToast?.message ?? error.message
      });
    }
  }

  return { subscribe, load };
}