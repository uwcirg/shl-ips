import { derived, writable } from 'svelte/store';
import { buildColorMap } from '$lib/utils/colors';

// The source keys that drive the map
export const colorMapKeys = writable<string[]>([]);

// Derived map that rebuilds whenever keys change
export const colorMap = derived(colorMapKeys, $keys => buildColorMap($keys));