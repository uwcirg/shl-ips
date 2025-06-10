import { error, Handle, Request } from '@sveltejs/kit';
import { SERVER_API_BASE } from '$lib/server/config';

const authenticatedAPIs = [
  '/api'
];

async function checkAuth(request: Request) {
  console.log('Checking auth');
  const auth = request.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    console.log('Unauthorized');
    throw error(401, { message: "Unauthorized" });
  }
  return await fetch(`${SERVER_API_BASE}/authcheck`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': auth
    },
  });
}

function isPathAuthenticatedAPI(pathname: string) {
  return authenticatedAPIs.some((path) =>
    path === pathname || pathname.startsWith(path)
  );
}
export const handle: Handle = async ({ event, resolve }) => {
  const { url, request } = event;
  if (isPathAuthenticatedAPI(url.pathname)) {
    const authorized = await checkAuth(request);
    if (!authorized.ok) {
      console.log('Authorization check failed');
      console.log(authorized.status, authorized.statusText, await authorized.text());
      throw error(401, { message: 'Authorization check failed' });
    }
  }
  return resolve(event);
}
