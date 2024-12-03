import {
  AUTH_URL,
  AUTH_CLIENT_ID,
  AUTH_REDIRECT_URI,
  AUTH_SILENT_REDIRECT_URI,
  AUTH_POST_LOGOUT_URI
} from '$lib/config';
import { User, UserManager } from 'oidc-client-ts';

export class AuthService {
  userManager: UserManager;

  constructor() {
    const settings = {
      authority: AUTH_URL,
      client_id: AUTH_CLIENT_ID,
      redirect_uri: AUTH_REDIRECT_URI,
      silent_redirect_uri: AUTH_SILENT_REDIRECT_URI,
      post_logout_redirect_uri: AUTH_POST_LOGOUT_URI,
      scope: 'openid online_access',
    };
    this.userManager = new UserManager(settings);
  }

  getUser(): Promise<User | null> {
    return this.userManager.getUser();
  }

  login(): Promise<void> {
    return this.userManager.signinRedirect();
  }

  renewToken(): Promise<User | null> {
    return this.userManager.signinSilent();
  }

  logout(): Promise<void> {
    return this.userManager.signoutRedirect();
  }

  async isAuthenticated(): Promise<boolean> {
    return this.getUser().then((user) => {
      if (user?.access_token) {
        return true;
      } else {
        return this.renewToken().then((user) => {
          return user?.access_token ? true : false;
        });
      }
    });
  }
}