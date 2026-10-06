import { json } from '@sveltejs/kit';

// Counterpart to /auth/settoken. The auth_token cookie is httpOnly, so the
// client can't remove it itself; this endpoint is called on logout and idle timeout.
export const POST = async ({ cookies }) => {
  cookies.delete('auth_token', { path: '/' });
  return json({ ok: true });
};
