import type { ToastStore } from '$lib/stores/toast';
import { FHIRServiceError } from '$lib/utils/FHIRDataService';

let _toastStore: ToastStore | null = null;

export function initErrorReporter(toastStore: ToastStore) {
  _toastStore = toastStore;
}

export function reportError(error: unknown) {
  if (error instanceof FHIRServiceError) {
    _toastStore?.add({ type: 'danger', message: error.message });
    console.error(`[${error.operation}]`, error.cause ?? error);
  } else {
    const message = error instanceof Error ? error.message : String(error);
    _toastStore?.add({ type: 'danger', message });
  }
}