import type { ToastStore } from '$lib/stores/toast';
import { FHIRServiceError } from '$lib/utils/FHIRDataService';

let _toastStore: ToastStore | null = null;

export function initErrorReporter(toastStore: ToastStore) {
  _toastStore = toastStore;
}

export function reportError(error: unknown, msg?: string) {
  if (error instanceof FHIRServiceError) {
    console.error(`[${error.operation}]`, error.cause ?? error);
    let message = error.message ?? String(error);
    if (!message) {
      return;
    }
    message = msg ? `${msg}: ${message}` : message;
    _toastStore?.add({ type: 'danger', message });
  } else {
    let message = error instanceof Error ? error.message : String(error);
    if (!message) {
      return;
    }
    _toastStore?.add({ type: 'danger', message });
  }
}