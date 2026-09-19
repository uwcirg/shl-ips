import { vi } from 'vitest';
import { writable } from 'svelte/store';
import * as jose from 'jose';
import type { IAuthService, SHLAdminParams } from '$lib/utils/types';

export function fakeAuth(overrides: Partial<IAuthService & { userId: any }> = {}) {
  return {
    user: writable(null),
    authenticated: writable(false),
    error: writable(null),
    userId: writable('user-1'),
    getUser: vi.fn(),
    getAccessToken: vi.fn().mockResolvedValue('access-token-1'),
    getProfile: vi.fn(),
    getRedirectUrl: vi.fn(),
    signinCallback: vi.fn(),
    storeUser: vi.fn(),
    login: vi.fn(),
    renewToken: vi.fn(),
    logout: vi.fn(),
    isAuthenticated: vi.fn(),
    syncTokenToServer: vi.fn(),
    ...overrides
  } as unknown as IAuthService;
}

export function fakeShl(overrides: Partial<SHLAdminParams> = {}): SHLAdminParams {
  return {
    id: 'shl-1',
    url: 'https://api.example.com/shl/shl-1',
    managementToken: 'mgmt-token',
    key: jose.base64url.encode(new Uint8Array(32)),
    files: [],
    ...overrides
  };
}
