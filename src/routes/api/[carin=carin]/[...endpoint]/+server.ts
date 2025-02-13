// import fetch from 'node-fetch';
import { json, error, Request } from '@sveltejs/kit';
import {
  ALLOWED,
  CARIN_HOSTS,
  REDIRECT_URI,
} from '$lib/server/config';

export const POST = async ({ params, request }: { params: { carin: typeof ALLOWED[number] }; request: Request; }) => {
  const restPath = params.carin;
  const { code } = await request.json();

  let clientId = CARIN_HOSTS[restPath].clientId;
  let clientSecret = CARIN_HOSTS[restPath].clientSecret;
  let tokenEndpoint = CARIN_HOSTS[restPath].tokenEndpoint;

  console.log({clientId, clientSecret, tokenEndpoint, REDIRECT_URI});

  if (!(clientId && clientSecret && tokenEndpoint && REDIRECT_URI)) {
    return error(500, { message: "Server configuration error" });
  }

  const response = await fetch(tokenEndpoint, {
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

  if (!response.ok) {
    return error(400, { message: 'Token exchange failed' });
  }

  const tokenData = await response.json();
  return json(tokenData);
};

// export const GET = async (re: RequestEvent) => {
//   // return new Response(JSON.stringify(re), {status: 200});
//   const restPath = re.params.carin;
//   const endpoint = re.params.endpoint;
//   let baseUrl;
//   if (restPath === 'aetna') {
//     baseUrl = 'https://vteapif1.aetna.com/fhirdemo/v2/patientaccess';
//   } else if (restPath === 'cpcds') {
//     baseUrl = 'https://cpcds-server.lantanagroup.com/fhir';
//   }
//   const apiUrl = `${baseUrl}/${endpoint}`;
//   // return new Response(apiUrl, {status: 200});
  
//   const response = await fetch(apiUrl, {
//       method: 'GET',
//       headers: {
//           'Authorization': re.request.headers.get('Authorization') || '',
//           // 'Content-Type': 'application/json'
//       }
//   });

//   // Add CORS headers to the response
//   return new Response(response.body, {
//       status: response.status,
//       headers: {
//           'Access-Control-Allow-Origin': '*',
//           ...Object.fromEntries(response.headers)
//       }
//   });
// };


// export async function OPTIONS({ params, request }: RequestEvent) {
//   const restPath = params.carin;
//   const endpoint = params.endpoint;
//   let baseUrl;
//   if (restPath === 'aetna') {
//     baseUrl = 'https://vteapif1.aetna.com/fhirdemo/v2/patientaccess';
//   } else if (restPath === 'cpcds') {
//     baseUrl = 'https://cpcds-server.lantanagroup.com/fhir';
//   }
//   const apiUrl = `${baseUrl}/${endpoint}`;

//     // Forward the OPTIONS request to the API
//     // const response = await fetch(apiUrl, {
//     //     method: 'OPTIONS',
//     //     headers: {
//     //         'Origin': request.headers.get('Origin') || '',
//     //         'Access-Control-Request-Method': request.headers.get('Access-Control-Request-Method') || '',
//     //         'Access-Control-Request-Headers': request.headers.get('Access-Control-Request-Headers') || '',
//     //     }
//     // });

//     // Return the API's preflight response with necessary CORS headers
//     return new Response(null, {
//         status: 204,
//         headers: {
//             'Access-Control-Allow-Origin': '*', // Replace * with specific origin if needed
//             'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
//             'Access-Control-Allow-Headers': 'Authorization, Content-Type',
//         }
//     });
// }
