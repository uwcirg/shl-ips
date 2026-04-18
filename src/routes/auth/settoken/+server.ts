import { json, error } from '@sveltejs/kit';
import { SERVER_API_BASE } from '$lib/server/config';

export const POST = async ({ request, cookies }) => {
  const { token } = await request.json();
  
  if (!token) throw error(400, 'No token provided');

  // Validate the new token before setting it
  const response = await fetch(`${SERVER_API_BASE}/authcheck`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) throw error(401, 'Token validation failed');

  // Token is valid — set the cookie server-side
  cookies.set('auth_token', token, {
    path: '/',
    sameSite: 'strict',
    secure: true,
    httpOnly: true   // more secure than document.cookie
  });

  return json({ ok: true });
};