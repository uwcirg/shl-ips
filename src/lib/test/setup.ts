// Extends Vitest's `expect` with jest-dom matchers (toBeInTheDocument, toHaveTextContent, ...)
// for use in @testing-library/svelte component tests.
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/svelte';

// @testing-library/svelte renders into the real document; without this, a component left
// mounted by one test's render() would still be in the DOM when the next test's queries run.
afterEach(() => {
  cleanup();
});
