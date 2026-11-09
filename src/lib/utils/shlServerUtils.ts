import base64url from 'base64url';
import * as jose from 'jose';
import { Buffer } from 'buffer';
import type { ConfigForServer, SHLAdminParams } from '$lib/utils/types';
import { fetchParsed } from '$lib/utils/requestUtils';

export async function getUserShls(apiBase: string, token: string | undefined, userId?: string): Promise<SHLAdminParams[]> {
  if (!token) return [];
  let res;
  try {
    // The /user endpoint only reads data (despite being a POST), so it is safe to retry.
    res = await fetchParsed<SHLAdminParams[]>(`${apiBase}/user`, {
      method: 'POST',
      headers: {
        "Content-Type": 'application/json',
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ userId }),
      cache: 'no-store'
    }, { idempotent: true });
  } catch (e) {
    console.error('Failed to load user SHLs', e);
    return [];
  }
  if (!res.ok || !Array.isArray(res.body)) {
    return [];
  }
  return res.body.map((shl: SHLAdminParams) => {
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
