import type { Readable } from 'svelte/store';

export const DISPLAY_OPTIONS = Symbol('displayOptions');

export type DisplayOptions = {
  showCodeBadges: Readable<boolean>;
};
