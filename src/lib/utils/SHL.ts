import type { SHLAdminParams, SHLFile } from "$lib/utils/types";
import { SHLClient } from "$lib/utils/managementClient";
import { base64url } from "$lib/utils/util";
import { VIEWER_BASE } from "$lib/config/config";
import { MutableSHLAdminParams } from "./types";

export class SHL implements SHLAdminParams {
  private readonly client: SHLClient;
  id: string = "";
  url: string = "";
  managementToken: string = "";
  key: string = "";
  files: SHLFile[] = [];
  label?: string;
  passcode?: string;
  exp?: number;
  flag?: string;
  v?: number;

  constructor(shl: SHLAdminParams, client: SHLClient) {
    this.client = client;
    this._update(shl);
  }

  private _update(shl: SHLAdminParams) {
    this.id = shl.id ?? this.id;
    this.url = shl.url ?? this.url;
    this.managementToken = shl.managementToken ?? this.managementToken;
    this.key = shl.key ?? this.key;
    this.files = shl.files ?? this.files;
    this.label = shl.label ?? this.label;
    this.passcode = shl.passcode ?? this.passcode;
    this.exp = shl.exp ?? this.exp;
    this.flag = shl.flag ?? this.flag;
    this.v = shl.v ?? this.v;
  }

  async toLink(shl: SHLAdminParams): Promise<string> {
    const shlinkJsonPayload = {
      url: this.client.getSHLUrl(this),
      exp: shl.exp || undefined,
      flag: shl.flag ?? 'P',
      key: shl.key
    };

    const encodedPayload: string = base64url.encode(JSON.stringify(shlinkJsonPayload));
    const shlinkBare = VIEWER_BASE + `shlink:/` + encodedPayload;
    return shlinkBare;
  }

  async update(changes: MutableSHLAdminParams) {
    const updatedShl: SHLAdminParams = {
      ...this,
      ...changes
    }
    let success = await this.client.resetShl();
    if (success) {
      this._update(updatedShl);
    }
  }

  async isActive(): Promise<boolean> {
    return await this.client.isActive(this.id);
  }

  async reactivate() {
    await this.client.reactivate(this);
  }

  async addFile() {
    let result = await this.client.addFile(this);
    this._update(result);
  }

  async deleteFile(contentHash: string) {
    let result = await this.client.deleteFile(this, contentHash);
    this._update(result);
  }

  toJSON(): SHLAdminParams {
    return JSON.stringify(Object.entries({
      id: this.id,
      url: this.url,
      managementToken: this.managementToken,
      key: this.key,
      files: this.files,
      label: this.label,
      passcode: this.passcode,
      exp: this.exp,
      flag: this.flag,
      v: this.v
    }).filter(([_, v]) => v !== undefined));
  }
}