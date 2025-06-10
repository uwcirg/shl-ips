import {
  AUTH_URL,
  AUTH_CLIENT_ID,
  AUTH_REDIRECT_URI,
  AUTH_SILENT_REDIRECT_URI,
  AUTH_POST_LOGOUT_URI
} from '$lib/config/config';
import { User, UserManager } from 'oidc-client-ts';

export class AuthService {
  private static _instance: AuthService;
  userManager: UserManager;
  redirect_url: string = "";

  private constructor() {
    const settings = {
      authority: AUTH_URL,
      client_id: AUTH_CLIENT_ID,
      redirect_uri: AUTH_REDIRECT_URI,
      silent_redirect_uri: AUTH_SILENT_REDIRECT_URI,
      post_logout_redirect_uri: AUTH_POST_LOGOUT_URI,
      // iframeScriptOrigin: "http://localhost:3000",
      scope: "openid online_access",
    };
    this.userManager = new UserManager(settings);
  }

  public static get Instance(): AuthService {
    return this._instance || (this._instance = new this());
  }

  getUser(): Promise<User | null> {
    return this.userManager.getUser();
  }

  getAccessToken(): Promise<string | null> {
    return this.getUser().then((user) => {
      if (user?.access_token) {
        return user.access_token;
      } else {
        return this.renewToken().then((user) => {
          return user?.access_token ?? null;
        }).catch((error) => {
          console.error(error);
          this.logout();
          return null;
        });
      }
    });
  }

  async getProfile(): Promise<any | undefined> {
    return (await this.userManager.getUser())?.profile;
  }

  getRedirectUrl(): string {
    let url = this.redirect_url;
    this.redirect_url = "";
    return url;
  }

  signinCallback(): Promise<User | undefined> {
    return this.userManager.signinCallback().then((user) => {
      if (user) {
        this.redirect_url = user.url_state ?? "";
        this.storeUser(user);
      }
      return user;
    });
  }

  storeUser(user: User): void {
    this.userManager.storeUser(user);
  }

  login(): Promise<void> {
    let currentUrl = new URL(window.location.href.split('?')[0]);
    let redirectUrl = currentUrl.href;
    if (currentUrl.pathname === '/' || currentUrl.pathname === '/home') {
      redirectUrl = '/summaries';
    }
    return this.userManager.signinRedirect({ url_state: redirectUrl });
  }

  renewToken(): Promise<User | null> {
    return this.userManager.signinSilent().then((user) => {
      if (user) {
        this.storeUser(user);
      }
      return user;
    }).catch((error) => {
      console.error(error);
      this.logout();
      return null;
    });
  }

  logout(): Promise<void> {
    return this.userManager.signoutRedirect();
  }

  async isAuthenticated(): Promise<Boolean> {
    return this.getUser().then((user) => user !== null);
  }
}

export default AuthService;
