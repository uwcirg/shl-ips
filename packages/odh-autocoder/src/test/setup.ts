// Extends Vitest's `expect` with jest-dom matchers for @testing-library/svelte component tests.
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/svelte';

afterEach(() => {
	cleanup();
});
