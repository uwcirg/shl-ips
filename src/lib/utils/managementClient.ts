import { base64url } from '$lib/utils/util';
import { API_BASE, VIEWER_BASE } from '$lib/config/config';
import * as jose from 'jose';
import type { AuthService } from './AuthService';

interface ConfigForServer extends Pick<SHLAdminParams, 'passcode' | 'exp' | 'label'> {
  userId?: string;
  patientId?: string;
  pin?: string;
  patientIdentifierSystem?: string;
}

export interface SHLAdminParams {
  id: string;
  url: string;
  managementToken: string;
  key: string;
  files: {
    contentType: string;
    contentHash: string;
    added?: string;
    label?: string | null;
  }[];
  passcode?: string;
  exp?: number;
  flag?: string;
  label?: string;
  v?: number;
}

export class SHLClient {
  // TODO: commit to jwt auth
  // use this to get token for each request
  auth: AuthService;
  
  constructor(auth: AuthService) {
    this.auth = auth;
  }

  async toLink(shl: SHLAdminParams): Promise<string> {
    const shlinkJsonPayload = {
      url: `${API_BASE}/shl/${shl.id}`,
      exp: shl.exp || undefined,
      flag: shl.flag ?? 'P',
      key: shl.key
    };

    const encodedPayload: string = base64url.encode(JSON.stringify(shlinkJsonPayload));
    const shlinkBare = VIEWER_BASE + `shlink:/` + encodedPayload;
    return shlinkBare;
  }

  async getUserShls(): Promise<SHLAdminParams[]> {
    let profile = await this.auth.getProfile();
    if (!profile) return [];
    const userId = profile.sub;
    const res = await fetch(`${API_BASE}/user`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
      cache: 'no-store'
    });
    const shls = await res.json();
    return shls;
  }

  async createShl(config: ConfigForServer = {}): Promise<SHLAdminParams> {
    config.userId = (await this.auth.getProfile())?.sub;
    const res = await fetch(`${API_BASE}/shl`, {
      method: 'POST',
      headers: {
        "Content-Type": 'application/json',
      },
      body: JSON.stringify(config)
    });
    const shlink = await res.text();
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
        "Authorization": `Bearer ${shl.managementToken}`
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
        "Authorization": `Bearer ${shl.managementToken}`
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
        "Authorization": `Bearer ${shl.managementToken}`
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
        "Authorization": `Bearer ${shl.managementToken}`
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
        "Authorization": `Bearer ${shl.managementToken}`
      },
      body: contentHash
    });
    const updatedShl = await res.json();
    return updatedShl;
  }
}
