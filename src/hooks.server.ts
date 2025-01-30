import { redirect, type Handle } from '@sveltejs/kit';

const public_paths = [
  '/home',
  '/ips'
];

function isPathAllowed(pathname: string) {
  return public_paths.some((path) =>
    path === pathname || pathname.startsWith(path)
  );
}

export const handle: Handle = async ({ event, resolve }) => {

  // Validate keycloak token
  let authorized = false;
  try {
    authorized = true;
  } catch (e) {
    console.error(e);
  }

  if (!authorized && !isPathAllowed(event.url.pathname)) {
    throw redirect(302, '/home');
  }

  const response = await resolve(event);
  return response;
};