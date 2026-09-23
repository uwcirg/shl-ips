import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { writable } from 'svelte/store';
import { fakeAuth } from '$lib/test/mocks';
import LandingPage from '../../routes/(landing)/+page.svelte';

// instance_config.ts pulls in an instance-specific config alias and an SCSS import at module
// load time (see AuthService.test.ts for the same issue) — neither is meaningful in a test,
// and neither resolves without the app's real Vite config.
vi.mock('$lib/config/instance_config', () => ({
  INSTANCE_CONFIG: { title: 'Test App', imgPath: '/img', advanced: false }
}));

// $app/navigation only works inside a running SvelteKit app; the page only calls goto() from
// click handlers this test doesn't exercise, but the import itself still needs a mock target.
vi.mock('$app/navigation', () => ({
  goto: vi.fn()
}));

function renderLandingPage(overrides: { authenticated?: boolean; user?: unknown } = {}) {
  const auth = fakeAuth({
    authenticated: writable(overrides.authenticated ?? false),
    user: writable(overrides.user ?? null)
  } as any);
  const fhirDataService = { demographics: writable({}) };

  return render(LandingPage, {
    context: new Map([
      ['authService', auth],
      ['fhirDataService', fhirDataService]
    ])
  });
}

describe('landing page', () => {
  it('renders the base content regardless of auth state', () => {
    renderLandingPage();

    expect(screen.getByText(/An initiative by the University of Washington/i)).toBeInTheDocument();
    expect(screen.getByText('Tell your health story')).toBeInTheDocument();
  });

  it('shows a sign-in prompt when the visitor is not authenticated', () => {
    renderLandingPage({ authenticated: false });

    expect(screen.getByText('Sign In')).toBeInTheDocument();
    expect(screen.getByText('Create an account')).toBeInTheDocument();
    expect(screen.queryByText('Get started')).not.toBeInTheDocument();
  });

  it('greets an authenticated user and offers to get started', () => {
    renderLandingPage({
      authenticated: true,
      user: { profile: { given_name: 'Jane', sub: 'user-1' } }
    });

    expect(screen.getByText(/Welcome, Jane\./)).toBeInTheDocument();
    expect(screen.getByText('Get started')).toBeInTheDocument();
    expect(screen.queryByText('Sign In')).not.toBeInTheDocument();
  });
});
