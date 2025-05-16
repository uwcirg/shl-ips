// import fetch from 'node-fetch';
import { json, error, Request } from '@sveltejs/kit';
import {
  CARIN_HOSTS,
  REDIRECT_URI
} from '$lib/server/config';

export const POST = async ({ params, request }: { params: { host: string }; request: Request; }) => {
  console.log('Token exchange');
  const restPath = params.host;
  const { code } = await request.json();

  let clientId = CARIN_HOSTS[restPath].clientId;
  let clientSecret = CARIN_HOSTS[restPath].clientSecret;
  let tokenEndpoint = CARIN_HOSTS[restPath].tokenEndpoint;

  console.log({clientId, clientSecret, tokenEndpoint, REDIRECT_URI});

  if (!(clientId && clientSecret && tokenEndpoint && REDIRECT_URI)) {
    throw error(500, { message: "Server configuration error" });
  }

  return await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
    }),
  });
};
