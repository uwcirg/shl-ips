import base64url from 'base64url';
import * as jose from 'jose';
import { Buffer } from 'buffer';
import type { ConfigForServer, SHLAdminParams } from '$lib/utils/types';

export async function getUserShls(apiBase: string, token: string | undefined, userId?: string): Promise<SHLAdminParams[]> {
  if (!token) return [];
  const res = await fetch(`${apiBase}/user`, {
    method: 'POST',
    headers: {
      "Content-Type": 'application/json',
      "Authorization": `Bearer ${token}`
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
