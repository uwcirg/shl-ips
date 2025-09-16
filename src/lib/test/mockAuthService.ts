import { writable } from "svelte/store";
import type { User } from "oidc-client-ts";
import type { IAuthService } from "./authTypes";

export class MockAuthService implements IAuthService {
  user = writable<User | null>(null);
  authenticated = writable(false);
  error = writable(null);

  private fakeUser: User | null = {
    profile: { name: "Test User" },
    expired: false,
    access_token: "fake-token",
  } as any;

  async getUser(): Promise<User | null> {
    return this.fakeUser;
  }

  async getAccessToken(): Promise<string | undefined> {
    return this.fakeUser?.access_token;
  }

  async getProfile(): Promise<any | undefined> {
    return this.fakeUser?.profile;
  }

  getRedirectUrl(): string {
    return "/mock-redirect";
  }

  async signinCallback(): Promise<User | undefined> {
    this.user.set(this.fakeUser);
    this.authenticated.set(true);
    return this.fakeUser;
  }

  storeUser(user: User): void {
    this.user.set(user);
  }

  async login(): Promise<void> {
    this.user.set(this.fakeUser);
    this.authenticated.set(true);
  }

  async renewToken(): Promise<User | null> {
    return this.fakeUser;
  }

  async logout(): Promise<void> {
    this.user.set(null);
    this.authenticated.set(false);
  }

  async isAuthenticated(): Promise<boolean | undefined> {
    const value = !!this.fakeUser && !this.fakeUser.expired;
    this.authenticated.set(value);
    return value;
  }
}

// Singleton mock instance (like real one)
export const mockAuthService = new MockAuthService();