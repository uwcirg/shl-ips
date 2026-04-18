import { writable, type Writable } from 'svelte/store';

export type ToastMessage = {
  id: number;
  message: string;
  type: 'success' | 'info' | 'warning' | 'danger';
  visible: boolean;
};

export interface ToastStore extends Writable<ToastMessage[]> {
  messages: ToastMessage[];
  add: (message: string, type: ToastMessage['type']) => void;
  remove: any;
  dismiss: any;
  subscribe: any;
};

let nextId = 0;

export function createToastStore() {
  const { subscribe, update } = writable<ToastMessage[]>([]);

  function add(message: string, type: ToastMessage['type']) {
    const id = nextId++;
    update(msgs => [...msgs, { id, message, type, visible: true }]);
    setTimeout(() => remove(id), 4000);
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
