import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { readable } from 'svelte/store';
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

describe('/ips page', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Only used for the page's own passcode-probe request, which this test doesn't need to
    // trigger a passcode for — a bare ok:true response is enough to skip that branch.
    fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve('{}') });
    vi.stubGlobal('fetch', fetchMock);
    retrieveMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads a SHL from the server and hands the retrieved bundle to the viewer', async () => {
    retrieveMock.mockResolvedValue({ state: 'abc', jsons: [fakeIpsBundle()] });

    render(IpsPage);

    const content = await screen.findByTestId('ips-content-stub');
    expect(content).toHaveTextContent('Jane');
    expect(retrieveMock).toHaveBeenCalledWith(
      expect.objectContaining({ shl: expect.stringContaining('shlink:/') })
    );
  });

  it('shows an error message when the server reports the SHL cannot be found', async () => {
    retrieveMock.mockResolvedValue({ error: 'not found', status: 404 });

    render(IpsPage);

    expect(await screen.findByText(/does not exist or has been deactivated/i)).toBeInTheDocument();
  });
});
