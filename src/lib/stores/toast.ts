import { writable, type Writable } from 'svelte/store';

export interface ToastMessage extends ToastOptions {
  id: number;
  visible: boolean;
};

export type ToastOptions = {
  title?: string;
  message?: string;
  type?: 'success' | 'info' | 'warning' | 'danger';
}

export interface ToastStore extends Writable<ToastMessage[]> {
  messages: ToastMessage[];
  add: (options: ToastOptions) => void;
  remove: any;
  dismiss: any;
  subscribe: any;
};

let nextId = 0;

export function createToastStore() {
  const { subscribe, update } = writable<ToastMessage[]>([]);

  function add(options: ToastOptions) {
    const id = nextId++;
    update(msgs => [...msgs, { id, ...options, visible: true }]);
    setTimeout(() => remove(id), 10000);
  }

  function remove(id: number) {
    update(msgs => msgs.filter(m => m.id !== id));
  }

  function dismiss(id: number) {
    update(msgs =>
      msgs.map(t => (t.id === id ? { ...t, visible: false } : t))
    );
  }

  const store: ToastStore = { messages: [], subscribe, add, remove, dismiss };
  return store;
}
