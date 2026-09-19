import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import { AuthService } from '../utils/AuthService';

// vi.mock factories are hoisted above imports, so anything they reference
// must be created through vi.hoisted rather than a plain top-level const.
const { MockUserManager, mockUserManagerInstances } = vi.hoisted(() => {
  class MockUserManager {
    settings: any;
    events = {
      addUserLoaded: vi.fn(),
      addSilentRenewError: vi.fn(),
      addAccessTokenExpired: vi.fn(),
      addAccessTokenExpiring: vi.fn()
    };
    getUser = vi.fn();
    signinSilent = vi.fn();
    signinRedirect = vi.fn();
    signinCallback = vi.fn();
    storeUser = vi.fn();
    signoutRedirect = vi.fn();
    clearStaleState = vi.fn();

    constructor(settings: any) {
      this.settings = settings;
      mockUserManagerInstances.push(this);
    }
  }
  const mockUserManagerInstances: InstanceType<typeof MockUserManager>[] = [];
  return { MockUserManager, mockUserManagerInstances };
});

vi.mock('oidc-client-ts', () => ({
  UserManager: MockUserManager
}));

// AuthService pulls these from the instance-specific config; real config.ts
// touches import.meta.env / window.__env and drags in an SCSS import via
// instance_config.ts, none of which is relevant to AuthService's own logic.
vi.mock('$lib/config/config', () => ({
  AUTH_URL: 'https://issuer.example.com',
  AUTH_CLIENT_ID: 'test-client',
  AUTH_REDIRECT_URI: 'https://app.example.com/auth',
  AUTH_SILENT_REDIRECT_URI: 'https://app.example.com/auth/silent-renew',
  AUTH_POST_LOGOUT_URI: 'https://app.example.com/logout'
}));

vi.mock('$lib/config/instance_config', () => ({
  INSTANCE_CONFIG: { defaultRedirectURI: '/data' }
}));

function latestManager() {
  return mockUserManagerInstances[mockUserManagerInstances.length - 1];
}

function fakeUser(overrides: Record<string, unknown> = {}): any {
  return {
    profile: { sub: 'user-1' },
    access_token: 'access-token-1',
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    expired: false,
    url_state: '',
    ...overrides
  };
}

describe('AuthService', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockUserManagerInstances.length = 0;
    fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('enables automaticSilentRenew on the underlying UserManager', () => {
    new AuthService();

    expect(latestManager().settings.automaticSilentRenew).toBe(true);
  });

  it('syncs a background-renewed token to the server when the manager fires userLoaded', async () => {
    const service = new AuthService();
    const manager = latestManager();
    const onUserLoaded = manager.events.addUserLoaded.mock.calls[0][0];

    const user = fakeUser({ access_token: 'renewed-token' });
    await onUserLoaded(user);

    expect(fetchMock).toHaveBeenCalledWith('/auth/settoken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'renewed-token' })
    });
    expect(get(service.user)).toEqual(user);
  });

  it('forces a fresh login when a silent renew fails', () => {
    new AuthService();
    const manager = latestManager();
    const onSilentRenewError = manager.events.addSilentRenewError.mock.calls[0][0];

    onSilentRenewError(new Error('renew failed'));

    expect(manager.signinRedirect).toHaveBeenCalled();
  });

  it('forces a fresh login as a backstop when the access token actually expires', () => {
    new AuthService();
    const manager = latestManager();
    const onAccessTokenExpired = manager.events.addAccessTokenExpired.mock.calls[0][0];

    onAccessTokenExpired();

    expect(manager.signinRedirect).toHaveBeenCalled();
  });

  describe('renewToken', () => {
    it('stores the renewed user and syncs the token before resolving', async () => {
      const service = new AuthService();
      const manager = latestManager();
      const user = fakeUser({ access_token: 'renewed-token' });
      manager.signinSilent.mockResolvedValue(user);

      const result = await service.renewToken();

      expect(result).toEqual(user);
      expect(get(service.user)).toEqual(user);
      expect(fetchMock).toHaveBeenCalledWith(
        '/auth/settoken',
        expect.objectContaining({ body: JSON.stringify({ token: 'renewed-token' }) })
      );
    });

    it('forces login when the renewed token fails to sync to the server', async () => {
      const service = new AuthService();
      const manager = latestManager();
      manager.signinSilent.mockResolvedValue(fakeUser({ access_token: 'renewed-token' }));
      fetchMock.mockResolvedValue({ ok: false });

      await service.renewToken();

      expect(manager.signinRedirect).toHaveBeenCalled();
    });
  });

  describe('getAccessToken', () => {
    it('returns the current token without renewing when it is still valid', async () => {
      const service = new AuthService();
      const manager = latestManager();
      manager.getUser.mockResolvedValue(fakeUser({ access_token: 'still-valid', expired: false }));

      const token = await service.getAccessToken();

      expect(token).toBe('still-valid');
      expect(manager.signinSilent).not.toHaveBeenCalled();
    });

    it('renews the token when the stored user is expired', async () => {
      const service = new AuthService();
      const manager = latestManager();
      manager.getUser.mockResolvedValue(fakeUser({ expired: true }));
      manager.signinSilent.mockResolvedValue(fakeUser({ access_token: 'fresh-token' }));

      const token = await service.getAccessToken();

      expect(token).toBe('fresh-token');
    });
  });

  it('syncTokenToServer posts the token and reflects the response status', async () => {
    const service = new AuthService();
    fetchMock.mockResolvedValue({ ok: false });

    const ok = await service.syncTokenToServer('some-token');

    expect(ok).toBe(false);
    expect(fetchMock).toHaveBeenCalledWith('/auth/settoken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'some-token' })
    });
  });
});
