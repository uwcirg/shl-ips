import { get, writable, derived, type Readable, type Writable } from "svelte/store";
import type { SHLAdminParams } from "$lib/utils/types";
import { SHL } from "$lib/utils/SHL";
import { SHLClient } from "$lib/utils/managementClient";
import { ConfigForServer } from "$lib/utils/types";

export class SHLStore {
  private readonly client: SHLClient;

  private readonly _shlStore: Writable<SHL[]> = writable([]);
  public readonly shlStore: Readable<SHL[]> = derived(this._shlStore, ($shlStore) => $shlStore);

  constructor(client: SHLClient) {
    this.client = client;
    this.loadSHLs();
  }

  async loadSHLs() {
    let shlsRaw: SHLAdminParams[] = await this.client.getUserShls();
    let shls: SHL[] = shlsRaw.map((shl) => new SHL(shl, this.client));
    this._shlStore.set(shls);
  }

  async createSHL(config: ConfigForServer) {
    let shlRaw = await this.client.createShl(config);
    if (!shlRaw) {
      console.error("Failed to create SHL");
      return;
    };
    this._shlStore.update((shls: SHL[]) => [...shls, new SHL(shlRaw, this.client)]);
  }

  async deleteSHL(id: string) {
    let deleted = await this.client.deleteShl({id});
    if (!deleted) {
      console.error("Failed to delete SHL");
      return;
    };
    this._shlStore.update((shls: SHL[]) => shls.filter((shl) => shl.id !== id));
  }

  findById(id: string): SHL | undefined {
    return get(this.shlStore).find((shl) => shl.id === id);
  }
}