import { randomStringWithEntropy, base64url } from '$lib/utils/util';
import { API_BASE, VIEWER_BASE } from '$lib/config';
import * as jose from 'jose';

type ConfigForServer = Pick<SHLAdminParams, 'passcode' | 'exp'>;

export interface SHLAdminParams {
  id: string;
  managementToken: string;
  encryptionKey: string;
  files: {
    contentEncrypted: string;
    contentType: string;
    date?: string;
    label?: string;
  }[];
  passcode?: string;
  exp?: number;
  label?: string;
  v?: number;
}

export class SHLClient {
  async toLink(shl: SHLAdminParams): Promise<string> {
    const shlinkJsonPayload = {
      url: `${API_BASE}/shl/${shl.id}`,
      exp: shl.exp || undefined,
      flag: shl.passcode ? 'P' : '',
      key: shl.encryptionKey,
      label: shl.label
    };

    const encodedPayload: string = base64url.encode(JSON.stringify(shlinkJsonPayload));
    const shlinkBare = VIEWER_BASE + `shlink:/` + encodedPayload;
    return shlinkBare;
  }

  async createShl(config: ConfigForServer = {}): Promise<SHLAdminParams> {
    const ek = randomStringWithEntropy();
    const create = await fetch(`${API_BASE}/shl`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify(config)
    });
    const { id, managementToken } = await create.json();
    return {
      id,
      managementToken,
      encryptionKey: ek,
      files: [],
      ...config
    };
  }

  async deleteShl(shl: SHLAdminParams): Promise<boolean> {
    const req = await fetch(`${API_BASE}/shl/${shl.id}`, {
      method: 'DELETE',
      headers: {
        authorization: `Bearer ${shl.managementToken}`
      }
    });
    const res = await req.json();
    return true;
  }

  async resetShl(shl: SHLAdminParams): Promise<boolean> {
    const req = await fetch(`${API_BASE}/shl/${shl.id}`, {
      method: 'PUT',
      body: JSON.stringify({ passcode: shl.passcode, exp: shl.exp }),
      headers: {
        authorization: `Bearer ${shl.managementToken}`
      }
    });
    const res = await req.json();
    return true;
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
      return content;
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
  }

  async reactivate(shl: SHLAdminParams): Promise<boolean> {
    const req = await fetch(`${API_BASE}/shl/${shl.id}/reactivate`, {
      method: 'PUT',
      headers: {
        authorization: `Bearer ${shl.managementToken}`
      }
    });
    const res = await req.json();
    return res;
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
      .encrypt(jose.base64url.decode(shl.encryptionKey));

    let date = new Date().toISOString().slice(0, 10);
    let label = (patientName ? patientName.charAt(0).toUpperCase() + patientName.slice(1).toLowerCase() + "'s" : "My")+ " Summary";
    new TextEncoder().encode(contentEncrypted), shl.files.push({ contentEncrypted, contentType, date, label });
    const add = await fetch(`${API_BASE}/shl/${shl.id}/file`, {
      method: 'POST',
      headers: {
        'content-type': contentType,
        authorization: `Bearer ${shl.managementToken}`
      },
      body: contentEncrypted
    });
    return shl;
  }

  async deleteFile(shl: SHLAdminParams, contentEncrypted: string): Promise<SHLAdminParams> {
    const req = await fetch(`${API_BASE}/shl/${shl.id}/file`, {
      method: 'DELETE',
      headers: {
        authorization: `Bearer ${shl.managementToken}`
      },
      body: contentEncrypted
    });
    const res = await req.json();
    return shl;
  }
}
