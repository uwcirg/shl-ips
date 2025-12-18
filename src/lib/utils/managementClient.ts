import { base64url } from '$lib/utils/util';
import { API_BASE } from '$lib/config/config';
import * as jose from 'jose';
import { get } from 'svelte/store';
import type { ConfigForServer, IAuthService, SHLAdminParams } from '$lib/utils/types';
import { VIEWER_BASE } from '$lib/config/config';

export class SHLClient {
  // TODO: commit to jwt auth
  // use this to get token for each request
  auth: IAuthService;
  
  constructor(auth: IAuthService) {
    this.auth = auth;
  }

  async toLink(shl: SHLAdminParams): Promise<string> {
    const shlinkJsonPayload = {
      url: this.getSHLUrl(shl),
      exp: shl.exp || undefined,
      flag: shl.flag ?? 'P',
      key: shl.key
    };

    const encodedPayload: string = base64url.encode(JSON.stringify(shlinkJsonPayload));
    const shlinkBare = VIEWER_BASE + `shlink:/` + encodedPayload;
    return shlinkBare;
  }

  getSHLUrl(shl: SHLAdminParams): string {
    return `${API_BASE}/shl/${shl.id}`;
  }

  async getUserShls(): Promise<SHLAdminParams[]> {
    const userId = await get(this.auth.userId);
    if (!userId) return [];
    const res = await fetch(`${API_BASE}/user`, {
      method: 'POST',
      headers: {
        "Content-Type": 'application/json',
        "Authorization": `Bearer ${await this.auth.getAccessToken()}`
      },
      body: JSON.stringify({ userId }),
      cache: 'no-store'
    });
    const shls = await res.json();
    return shls.map((shl: SHLAdminParams) => {
      if (shl.config) {
        shl = {
          ...shl,
          ...shl.config,
        };
        delete shl.config;
      }
      return shl;
    });
  }

  async createShl(config: ConfigForServer = {}): Promise<SHLAdminParams> {
    const res = await fetch(`${API_BASE}/shl`, {
      method: 'POST',
      headers: {
        "Content-Type": 'application/json',
        "Authorization": `Bearer ${await this.auth.getAccessToken()}`
      },
      body: JSON.stringify(config)
    });
    const shlink = await res.text(); // shlink:/[encoded data]
    const payload = shlink.split('/');
    const decodedPayload = base64url.decode(payload[payload.length - 1]);
    const asString = new TextDecoder('utf-8').decode(decodedPayload);
    const shl: SHLAdminParams = JSON.parse(asString);
    return shl;
  }

  async deleteShl(shl: SHLAdminParams): Promise<SHLAdminParams[]> {
    const res = await fetch(`${API_BASE}/shl/${shl.id}`, {
      method: 'DELETE',
      headers: {
        "Authorization": `Bearer ${await this.auth.getAccessToken()}`
      }
    });
    const deleted = await res.json();
    return deleted;
  }

  async resetShl(shl: SHLAdminParams): Promise<boolean> {
    const res = await fetch(`${API_BASE}/shl/${shl.id}`, {
      method: 'PUT',
      body: JSON.stringify({ passcode: shl.passcode, exp: shl.exp, label: shl.label }),
      headers: {
        "Authorization": `Bearer ${await this.auth.getAccessToken()}`
      }
    });
    const updatedShl = await res.json();
    return updatedShl;
  }

  async isActive(id: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/shl/${id}/active`, {
      method: 'GET'
    });
    let content;
    const contentLength = res.headers.get('Content-Length');
    if (contentLength && parseInt(contentLength) > 0) {
      const contentType = res.headers.get('Content-Type');
  
      // Check if the content type indicates JSON
      if (contentType && contentType.includes('application/json')) {
        content = await res.json();
      } else {
        content = await res.text();
      }
    }
    if (res.ok && content !==undefined) {
      return content as boolean;
    }
    if (!res.ok) {
      if (res.status === 404) {
        if (content !== undefined && "message" in content && content.message === "Deleted") {
          throw Error(content.message);
        }
        return false;
      } else {
        return false;
      }
    }
    return false;
  }

  async reactivate(shl: SHLAdminParams): Promise<boolean> {
    const res = await fetch(`${API_BASE}/shl/${shl.id}/reactivate`, {
      method: 'PUT',
      headers: {
        "Authorization": `Bearer ${await this.auth.getAccessToken()}`
      }
    });
    const reactivated = await res.json();
    return reactivated;
  }

  async addFile(
    shl: SHLAdminParams,
    content: unknown,
    patientName: string = "",
    contentType: string = "application/smart-health-card"
  ): Promise<SHLAdminParams> {
    let contentEncrypted = await new jose.CompactEncrypt(
      new TextEncoder().encode(JSON.stringify(content))
    )
      .setProtectedHeader({
        alg: 'dir',
        enc: 'A256GCM'
      })
      .encrypt(jose.base64url.decode(shl.key));

    let added = new Date().toLocaleString();
    let label = (patientName ? patientName.charAt(0).toUpperCase() + patientName.slice(1).toLowerCase() + "'s" : "My")+ " Summary";
    new TextEncoder().encode(contentEncrypted);
    const res = await fetch(`${API_BASE}/shl/${shl.id}/file`, {
      method: 'POST',
      headers: {
        "Content-Type": contentType,
        "Authorization": `Bearer ${await this.auth.getAccessToken()}`
      },
      body: contentEncrypted
    });
    const updatedShl = await res.json();
    return await updatedShl;
  }

  async deleteFile(shl: SHLAdminParams, contentHash: string): Promise<SHLAdminParams> {
    const res = await fetch(`${API_BASE}/shl/${shl.id}/file`, {
      method: 'DELETE',
      headers: {
        "Authorization": `Bearer ${await this.auth.getAccessToken()}`
      },
      body: contentHash
    });
    const updatedShl = await res.json();
    return updatedShl;
  }
}
