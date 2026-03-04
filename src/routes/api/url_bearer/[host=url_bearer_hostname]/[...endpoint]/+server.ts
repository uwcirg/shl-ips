// import fetch from 'node-fetch';
import { error, json, text } from '@sveltejs/kit';
import { URL_BEARER_HOSTS } from '$lib/server/config';

export const GET = async ({ params, url, request }: { params: { host: string }; url: URL; request: Request; }) => {
  console.log('Fetching data');
  const hostName = params.host;
  console.log(hostName);
  console.log(JSON.stringify(URL_BEARER_HOSTS));
  let token = URL_BEARER_HOSTS[hostName]?.token;

  if (!token) {
    if (URL_BEARER_HOSTS[hostName].credentials && URL_BEARER_HOSTS[hostName].credentials.clientId && URL_BEARER_HOSTS[hostName].credentials.clientSecret && URL_BEARER_HOSTS[hostName].credentials.tokenEndpoint) {
      console.log('Token exchange');
      console.log (URL_BEARER_HOSTS[hostName].credentials);
      token = await fetch(URL_BEARER_HOSTS[hostName].credentials.tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: URL_BEARER_HOSTS[hostName].credentials.clientId,
          client_secret: URL_BEARER_HOSTS[hostName].credentials.clientSecret,
        }),
      }).then((response) => {
        if (!response.ok) {
          console.log(response);
          throw Error('Token exchange failed');
        }
        return response;
      }
      ).then((response) => response.json()).then((data) => data.access_token);
    }

    if (!token) {
      throw error(400, { message: "Invalid host" });
    }
  }

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

  if (!response) {
    throw error(500, { message: "Error executing token exchange request" });
  }
  
  if (response && response.ok) {
    let data = await response.text();
    console.log("Data:", data);
    try {
      let jsonData = JSON.parse(data);
      console.log("JSON Data:", jsonData);
      return json(jsonData);
    } catch (e) {
      return text(data);
    }
  } else {
    console.log("Request failed");
    console.log(response.status, response.statusText);
    return response;
  }
};
