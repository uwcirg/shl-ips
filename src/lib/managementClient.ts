import { randomStringWithEntropy, base64url } from './util';
import { API_BASE, VIEWER_BASE } from './config';
import * as jose from 'jose';

type ConfigForServer = Pick<SHLAdminParams, 'passcode' | 'exp'>;

export interface SHLAdminParams {
  id: string;
  sessionId?: string;
  managementToken: string;
  encryptionKey: string;
  files: {
    contentEncrypted: string;
    contentType: string;
    date?: string;
  }[];
  passcode?: string;
  exp?: number;
  date?: string;
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

  async getShl(pid: string): Promise<SHLAdminParams> {
    let shl = {
      id: "string",
      managementToken: pid,
      encryptionKey: "string",
      passcode: "",
      exp: 123456,
      label: "label",
      v: 1,
      files: [
        {
          contentEncrypted: "string",
          contentType: "application/smart-health-link",
          date: new Date().toString(),
        }
      ]
    };
    return shl;
    const req = await fetch(`${API_BASE}/shl`, {
      method: 'GET',
      headers: {
        authorization: `Bearer ${pid}`
      }
    });
    const res = await req.json();
    return res;
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

  async addFile(
    shl: SHLAdminParams,
    content: unknown,
    contentType: string
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
    new TextEncoder().encode(contentEncrypted), shl.files.push({ contentEncrypted, contentType, date });
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
