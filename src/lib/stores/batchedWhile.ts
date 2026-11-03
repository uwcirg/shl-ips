import { readable, type Readable } from 'svelte/store';

/***
A view of `source` that, while `active` is true, only passes changes on at most once per `delayMs`
(the latest value wins), and otherwise passes them on immediately. Turning `active` off flushes
anything held. The first value is never held. Used to apply many quick updates (e.g. datasets
loading in one after another) as a few batches, so a list doesn't reshuffle with every one.

  const unitsWhileLoading = batchedWhile(unitsStore, fhirDataService.syncing, 750);
***/
export function batchedWhile<T>(source: Readable<T>, active: Readable<boolean>, delayMs: number): Readable<T> {
  return readable<T>(undefined as T, (set) => {
    let latest: T;
    let pending = false;
    let initialized = false;
    let isActive = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const flush = () => {
      clearTimeout(timer);
      timer = undefined;
      if (!pending) return;
      pending = false;
      set(latest);
    };

    const unsubscribeActive = active.subscribe((value) => {
      isActive = value;
      if (!value) flush();
    });
    const unsubscribeSource = source.subscribe((value) => {
      latest = value;
      pending = true;
      if (!initialized || !isActive) {
        initialized = true;
        flush();
      } else if (timer === undefined) {
        timer = setTimeout(flush, delayMs);
      }
    });

    return () => {
      unsubscribeActive();
      unsubscribeSource();
      clearTimeout(timer);
    };
  });
}
