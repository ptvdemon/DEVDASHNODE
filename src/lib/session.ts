import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
// In a real app, use a library like 'jose' for robust JWT handling.
// For this demo, we'll use a simple base64 encoding which is NOT secure.
const secret = process.env.AUTH_SECRET || 'a-secret-string-for-dev-only-32-chars'

export async function createSession(userId: string) {
  const sessionPayload = { userId, expires: Date.now() + 7 * 24 * 60 * 60 * 1000 };
  const session = Buffer.from(JSON.stringify(sessionPayload)).toString('base64');
  
  cookies().set('session', session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7, // One week
    path: '/',
  })
}

export async function getSession(): Promise<{ userId: string } | null> {
  const sessionCookie = cookies().get('session')
  if (!sessionCookie) return null

  try {
    const sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString('utf-8'));
    if (sessionData.expires < Date.now()) {
      await deleteSession();
      return null;
    }
    return { userId: sessionData.userId };
  } catch (error) {
    console.error('Invalid session cookie:', error);
    return null;
  }
}

export async function deleteSession() {
  cookies().delete('session', { path: '/' });
  redirect('/login');
}
