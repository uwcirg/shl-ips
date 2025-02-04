import { base64url } from '$lib/utils/util';
import { API_BASE, VIEWER_BASE } from '$lib/config';
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
    });
    const shls = await res.json();
    return shls;
  }

  async createShl(config: ConfigForServer = {}): Promise<SHLAdminParams> {
    config.userId = (await this.auth.getProfile())?.sub;
    config.patientId = config.userId;
    config.pin = config.passcode;
    config.patientIdentifierSystem = "http://keycloak.ips-shl.ubu.dlorigan.dev.cirg.uw.edu";
    // const res = await fetch(`${API_BASE}/shl`, {
    const res = await fetch(`https://pancanadianio.ca::10245/myhealth-gateway/v1/patient-summary`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        "Authorization": `Bearer eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJfTENVTExfanhlb2JQYmtBM3lIaUV0OHlMdzVDVUF5ODVFYnVmTE9xeXNJIn0.eyJleHAiOjE3Mzg3MDA0NTUsImlhdCI6MTczODY5OTI1NSwianRpIjoiMDI4NjJhZTUtM2I0OC00MGVkLWI0NDAtYWZkMmVlZjA5NThkIiwiaXNzIjoiaHR0cHM6Ly9wYW5jYW5hZGlhbmlvLmNhOjEwMTAwL2F1dGgvcmVhbG1zL3BzLWNhIiwiYXVkIjoiYWNjb3VudCIsInN1YiI6ImRkZWFmMjNmLThhZDktNDNlMy1hMzExLWYyM2FiY2RmNjgzZCIsInR5cCI6IkJlYXJlciIsImF6cCI6Imd1ZXN0LXJlc3QtY2xpZW50Iiwic2Vzc2lvbl9zdGF0ZSI6ImU4ZmMzOGM5LTNlZTMtNGM3Zi1iZjk0LTllNzMxYTFhYTdiOSIsImFjciI6IjEiLCJyZWFsbV9hY2Nlc3MiOnsicm9sZXMiOlsib2ZmbGluZV9hY2Nlc3MiLCJ1bWFfYXV0aG9yaXphdGlvbiJdfSwicmVzb3VyY2VfYWNjZXNzIjp7ImFjY291bnQiOnsicm9sZXMiOlsibWFuYWdlLWFjY291bnQiLCJtYW5hZ2UtYWNjb3VudC1saW5rcyIsInZpZXctcHJvZmlsZSJdfX0sInNjb3BlIjoiZW1haWwgcHJvZmlsZSBDQUZFWC0yIiwiY2xpZW50SG9zdCI6IjE1LjIyMi4xMDguNDk6NTY3OCIsImNsaWVudElkIjoiZ3Vlc3QtcmVzdC1jbGllbnQiLCJlbWFpbF92ZXJpZmllZCI6ZmFsc2UsInByZWZlcnJlZF91c2VybmFtZSI6InNlcnZpY2UtYWNjb3VudC1ndWVzdC1yZXN0LWNsaWVudCIsImNsaWVudEFkZHJlc3MiOiIxNS4yMjIuMTA4LjQ5OjU2NzgifQ.R2rwb_ToM7cYXrezvDB1vAwTdDNLqwZXTzFDEGX1MN8UWys_ln0QX2D3-AXFdP4RsiRtDRkMwboyTLTTb9_Kb5EaosCoN3T_U5qFefusWSs25j4LAsYXB3X-uKt_MHxjAfGzXoA8z5RyHcX4NpP2ruG3oKJptULT1ozptHgrxGEpwRCBrTGPHDmwIiPe2w6QMsw0Oo9gEf5iPQvbjIASIXMsVpJCFhUC2CTibpL7pCbernGAI-GTcyhN7lFmLvkZ-ItwTk7IhxeZFldu7mmi8ry8iwv1c7WvynoQ6qKgLyZTtMaNnAQfom45q-gVhHQFiYrQdcbFR2fWTNPnDISPXg`
      },
      body: JSON.stringify(config)
    });
    console.log(`Request: POST ${API_BASE}/shl`);
    console.log(`Request: POST https://pancanadianio.ca::10245/myhealth-gateway/v1/patient-summary`);
    console.log("Request body: ", JSON.stringify(config));
    const shlink = await res.text();
    console.log("Response body: ", shlink);
    const payload = shlink.split('/');
    const decodedPayload = base64url.decode(payload[payload.length - 1]);
    const asString = new TextDecoder('utf-8').decode(decodedPayload);
    console.log("Decoded payload: ", asString);
    const shl: SHLAdminParams = JSON.parse(asString);
    return shl;
  }

  async deleteShl(shl: SHLAdminParams): Promise<SHLAdminParams[]> {
    const res = await fetch(`${API_BASE}/shl/${shl.id}`, {
      method: 'DELETE',
      headers: {
        authorization: `Bearer ${shl.managementToken}`
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
        authorization: `Bearer ${shl.managementToken}`
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
        authorization: `Bearer ${shl.managementToken}`
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

    let added = new Date().toISOString().slice(0, 10);
    let label = (patientName ? patientName.charAt(0).toUpperCase() + patientName.slice(1).toLowerCase() + "'s" : "My")+ " Summary";
    new TextEncoder().encode(contentEncrypted);
    const res = await fetch(`${API_BASE}/shl/${shl.id}/file`, {
      method: 'POST',
      headers: {
        'content-type': contentType,
        authorization: `Bearer ${shl.managementToken}`
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
        authorization: `Bearer ${shl.managementToken}`
      },
      body: contentHash
    });
    const updatedShl = await res.json();
    return updatedShl;
  }
}
