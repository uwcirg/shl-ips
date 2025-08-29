import { getContext } from 'svelte';
import { writable, type Writable } from "svelte/store";
import { IPSResourceCollection } from "$lib/utils/IPSResourceCollection";
import type { User } from "oidc-client-ts";
import { SHLAdminParams, SHLClient } from "$lib/utils/managementClient";

let shlClient: SHLClient = getContext('shlClient');

export const authenticated: Writable<boolean> = writable(false);
export const user: Writable<User> = writable({});
export const error: Writable<string> = writable();

export const shlStore: Writable<SHLAdminParams[]> = writable([]);

export const userResources: IPSResourceCollection = new IPSResourceCollection();

export async function initiateUserData(user: User) {
  if (!user) {
    clearUserData();
    return;
  }
  authenticated.set(true);
  user.set(user);
  try {
    shlStore.set(await shlClient.getUserShls());//
  } catch (e) {
    error.set(e);
    console.error(e);
    shlStore.set([]);
  }
  userResources;//
  error.set('');
}

export function clearUserData() {
  authenticated.set(false);
  user.set({});
  error.set('');
  shlStore.set([]);
  userResources.clear();
}
