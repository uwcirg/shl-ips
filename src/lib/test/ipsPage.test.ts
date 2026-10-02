import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { readable, writable } from 'svelte/store';
import { fakeAuth } from '$lib/test/mocks';
import IpsPage from '../../routes/(common)/ips/+page.svelte';

// vi.mock factories are hoisted above this file's own top-level const declarations, so
// retrieveMock must come from vi.hoisted() rather than a plain const (same TDZ issue
// documented in the other test files this session).
const { retrieveMock } = vi.hoisted(() => ({ retrieveMock: vi.fn() }));

vi.mock('$lib/config/instance_config', () => ({
  INSTANCE_CONFIG: { title: 'Test App', imgPath: '/img' }
}));

vi.mock('$lib/config/config', () => ({
  SHOW_VIEWER_DEMO: false
}));

// Per the agreed scope: mock shlClient's retrieve() directly rather than the raw fetch +
// jose.compactDecrypt chain it wraps — that plumbing is shlClient.ts's own logic and belongs
// in a dedicated test file for it, not re-derived here. url()/flag()/id() are also mocked
// since they'd otherwise try to base64url-decode the fake hash below.
vi.mock('$lib/utils/shlClient', () => ({
  url: vi.fn(() => 'https://shl-server.example.com/manifest'),
  flag: vi.fn(() => undefined),
  id: vi.fn(() => 'shl-1'),
  retrieve: retrieveMock
}));

// shcDecoder.js is a large pre-bundled file (a compiled SMART Health Card verifier), not
// hand-written source. It's never actually invoked here — the fake retrieve() result below
// only supplies `jsons`, not `shcs` — so mock it out rather than pulling that bundle in.
vi.mock('$lib/utils/shcDecoder.js', () => ({
  verify: vi.fn()
}));

// Stubbed per the agreed scope: this test verifies the /ips page's own retrieve/loading/error
// state machine, not IPSContent's own deep bundle rendering.
vi.mock('$lib/components/viewer/IPSContent.svelte', () => import('$lib/test/stubs/IPSContentStub.svelte'));

vi.mock('$app/stores', () => ({
  page: readable({
    url: new URL('http://localhost/ips#shlink:/fake-encoded-payload'),
    params: {},
    route: { id: null }
  })
}));

function fakeIpsBundle() {
  return {
    resourceType: 'Bundle',
    type: 'document',
    entry: [
      { resource: { resourceType: 'Composition', date: '2024-01-01' } },
      {
        resource: {
          resourceType: 'Patient',
          id: 'patient-1',
          name: [{ given: ['Jane'], family: 'Doe' }]
        }
      }
    ]
  };
}

function renderIpsPage(opts: { user?: { profile: Record<string, unknown> } } = {}) {
  const auth = fakeAuth({
    user: writable(opts.user ?? null),
    authenticated: writable(!!opts.user),
    isAuthenticated: vi.fn().mockResolvedValue(!!opts.user),
    restoreSession: vi.fn().mockResolvedValue(false)
  } as any);
  return render(IpsPage, { context: new Map([['authService', auth]]) });
}

const signedInUser = { profile: { name: 'Pat Example' } };

describe('/ips page', () => {
  beforeEach(() => {
    retrieveMock.mockReset();
    localStorage.clear();
  });

  it('retrieves immediately for a signed-in user, using their name as the recipient', async () => {
    retrieveMock.mockResolvedValue({ state: 'abc', jsons: [fakeIpsBundle()] });

    renderIpsPage({ user: signedInUser });

    const content = await screen.findByTestId('ips-content-stub');
    expect(content).toHaveTextContent('Jane');
    expect(retrieveMock).toHaveBeenCalledWith(
      expect.objectContaining({
        shl: expect.stringContaining('shlink:/'),
        recipient: 'Pat Example'
      })
    );
    expect(screen.queryByLabelText(/who are you/i)).not.toBeInTheDocument();
  });

  it('shows an error message when the server reports the SHL cannot be found', async () => {
    retrieveMock.mockResolvedValue({ error: 'not found', status: 404 });

    renderIpsPage({ user: signedInUser });

    expect(await screen.findByText(/does not exist or has been deactivated/i)).toBeInTheDocument();
  });

  it('asks an anonymous user who they are, then retrieves with that recipient', async () => {
    retrieveMock.mockResolvedValue({ state: 'abc', jsons: [fakeIpsBundle()] });

    renderIpsPage();

    const input = await screen.findByLabelText(/who are you/i);
    expect(retrieveMock).not.toHaveBeenCalled();
    await fireEvent.input(input, { target: { value: 'Dr. Visitor' } });
    await fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    expect(await screen.findByTestId('ips-content-stub')).toBeInTheDocument();
    expect(retrieveMock).toHaveBeenCalledWith(expect.objectContaining({ recipient: 'Dr. Visitor' }));
  });

  it('asks for a passcode when the first request is unauthorized, then loads the content', async () => {
    retrieveMock
      .mockResolvedValueOnce({ error: { message: 'Passcode required' }, status: 401 })
      .mockResolvedValueOnce({ state: 'abc', jsons: [fakeIpsBundle()] });

    renderIpsPage({ user: signedInUser });

    const passcode = await screen.findByLabelText(/passcode/i);
    expect(retrieveMock).toHaveBeenNthCalledWith(1, expect.objectContaining({ passcode: '' }));
    await fireEvent.input(passcode, { target: { value: '1234' } });
    await fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    expect(await screen.findByTestId('ips-content-stub')).toBeInTheDocument();
    expect(retrieveMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ passcode: '1234', recipient: 'Pat Example' })
    );
  });
});
