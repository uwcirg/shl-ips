import {
  AUTH_URL,
  AUTH_CLIENT_ID,
  AUTH_REDIRECT_URI,
  AUTH_SILENT_REDIRECT_URI,
  AUTH_POST_LOGOUT_URI
} from '$lib/config/config';
import { derived, writable, type Writable, type Readable } from 'svelte/store';
import { type User, UserManager } from 'oidc-client-ts';
import { INSTANCE_CONFIG } from '$lib/config/instance_config';
import type { IAuthService } from '$lib/utils/types';

export class AuthService implements IAuthService {
  private userManager: UserManager;
  protected redirect_url: string = "";

  private _user: Writable<User | null> = writable(null);
  public readonly user: Readable<User | null> = derived(this._user, ($user) => $user);
  public readonly userId: Readable<string> = derived(this._user, ($user) => $user?.profile.sub ?? "");

  private _authenticated: Writable<boolean> = writable(false);
  public readonly authenticated: Readable<boolean> = derived(this._authenticated, ($authenticated) => $authenticated);

  private _error: Writable<any> = writable(null);
  public readonly error: Readable<any> = derived(this._error, ($error) => $error);

  constructor() {
    const settings = {
      authority: AUTH_URL,
      client_id: AUTH_CLIENT_ID,
      redirect_uri: AUTH_REDIRECT_URI,
      silent_redirect_uri: AUTH_SILENT_REDIRECT_URI,
      post_logout_redirect_uri: AUTH_POST_LOGOUT_URI,
      // iframeScriptOrigin: "http://localhost:3000",
      scope: "openid profile online_access",
      automaticSilentRenew: true,
    };
    this.userManager = new UserManager(settings);

    // Background renewal fires no lifecycle hook in the app's Svelte layout,
    // so the renewed token must be pushed to the server cookie here.
    this.userManager.events.addUserLoaded(async (user: User) => {
      this.storeUser(user);
      if (user.access_token) {
        await this.syncTokenToServer(user.access_token);
      }
    });
    this.userManager.events.addSilentRenewError((error: Error) => {
      console.error('Silent renew failed', error);
      this.login();
    });
    this.userManager.events.addAccessTokenExpired(() => {
      // Safety net in case automaticSilentRenew's own retry didn't recover in time.
      this.login();
    });
  }

  async syncTokenToServer(token: string): Promise<boolean> {
    const response = await fetch('/auth/settoken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
    return response.ok;
  }

  private handleError(error: unknown) {
    this.userManager.clearStaleState();
    if (error.error === "login_required") {
      return;
    }
    this._error.set(error);
    console.error(error);
    this.logout();
  }

  async getUser(): Promise<User | null> {
    const user = await this.userManager.getUser();
    return user;
  }

  async getAccessToken(): Promise<string | undefined> {
    try {
      const user = await this.getUser();
      if (user && !user.expired && user?.access_token) {
        return user.access_token;
      } else {
        const user = await this.renewToken();
        if (!user) {
          throw Error('Unable to renew token');
        }
        return user.access_token;
      } 
    } catch (error) {
      this.handleError(error);
    }
  }

  async getProfile(): Promise<any | undefined> {
    const user = await this.getUser();
    return user?.profile;
  }

  getRedirectUrl(): string {
    let url = this.redirect_url;
    this.redirect_url = "";
    return url;
  }

  async signinCallback(): Promise<User | undefined> {
    try {
      const user = await this.userManager.signinCallback();
      // if (!user) {
      //   throw Error('User not found');
      // }
      if (user) {
        this.redirect_url = user.url_state ?? "";
        this.storeUser(user);
        return user;
      }
    } catch (error) {
      this.handleError(error);
    }
  }

  storeUser(user: User): void {
    if (!user) {
      this._user.set(null);
      this._authenticated.set(false);
      this.userManager.clearStaleState();
      return;
    }
    this._user.set(user);
    this._authenticated.set(true);
    this.userManager.storeUser(user);
  }

  async login(): Promise<void> {
    let currentUrl = new URL(window.location.href.split('?')[0]);
    let redirectUrl = currentUrl.href;
    if (currentUrl.pathname === '/' || currentUrl.pathname === '/home') {
      redirectUrl = INSTANCE_CONFIG.defaultRedirectURI ?? '/data';
    }
    return await this.userManager.signinRedirect({ url_state: redirectUrl });
  }

  async isAuthenticated(): Promise<boolean | undefined> {
    try {
      const user = await this.userManager.getUser();
      if (user) {
        this.storeUser(user);
        return true;
      } else {
        return false;
      }
    } catch (error) {
      this.handleError(error);
    }
  }

  async renewToken(): Promise<User | null> {
    try {
      const user = await this.userManager.signinSilent();
      if (user) {
        this.storeUser(user);
        if (user.access_token) {
          // Awaited here (rather than left to addUserLoaded) so callers that
          // depend on the cookie being set, like invalidateAll(), don't race it.
          const synced = await this.syncTokenToServer(user.access_token);
          if (!synced) {
            await this.login();
          }
        }
        return user;
      } else {
        throw Error('Unable to authenticate user in background');
      }
    } catch (error) {
      this.handleError(error);
    }
  }

  async logout(): Promise<void> {
    await this.userManager.signoutRedirect();
  }
}

export default AuthService;
