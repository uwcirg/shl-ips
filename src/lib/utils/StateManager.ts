import type Status from '$lib/utils/types';
import { writable } from 'svelte/store';

export enum State {
  IDLE = 'idle',
  LOADING = 'loading',
  ERROR = 'error',
  SYNCED = 'synced'
}

export class StateManager {
    static State = State;
    static readonly StateValues = Object.values(State) as Array<string>;
    subscribe: Function;
    private _set: Function;
    private _update: Function;

    constructor() {
      const { subscribe, set, update } = writable({
        state: State.IDLE,
      } as Status);
  
      this.subscribe = subscribe;
  
      this._set = set;
      this._update = update;
    }

    clear() {
      this.set({
        state: State.IDLE
      });
    }

    set(status: Status) {
      const newStatus = { ...status };
      if (newStatus.state === State.LOADING) {
        newStatus.message = newStatus.message || 'Loading...';
      }
      if (newStatus.state === State.ERROR) {
        newStatus.message = newStatus.message || 'Error';
        newStatus.error = newStatus.error || new Error();
      }
      this._set(newStatus);
    }
}