// import fetch from 'node-fetch';
import { json, error, Request } from '@sveltejs/kit';
import { URL_BEARER_HOSTS } from '$lib/server/config';

export const GET = async ({ params, url, request }: { params: { host: string }; url: URL; request: Request; }) => {
  console.log('Fetching data');
  const hostName = params.host;
  console.log(hostName);
  console.log(JSON.stringify(URL_BEARER_HOSTS));
  const token = URL_BEARER_HOSTS[hostName]?.token;

  // console.log({ hostName, token, url: url.href });

  let fetchURL = url.searchParams.get('url');
  if (!(token && fetchURL)) {
    throw error(400, { message: "Invalid request: host or url not found" });
  }

  const response = await fetch(fetchURL, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  console.log({response});

  return response;
};
