import type { Request } from 'express';
import { getAuth } from 'firebase-admin/auth';
import { ALLOWED_EMAIL_DOMAINS } from './config';

export class AuthError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Verifies the Bearer ID token and gates on email domain. Throws AuthError. */
export async function requireUser(req: Request): Promise<{ uid: string; email: string }> {
  const header = req.headers.authorization ?? '';
  const match = header.match(/^Bearer (.+)$/);
  if (!match) throw new AuthError(401, 'Missing Authorization header');

  let decoded;
  try {
    decoded = await getAuth().verifyIdToken(match[1]!);
  } catch {
    throw new AuthError(401, 'Invalid ID token');
  }

  const email = decoded.email;
  const domain = email?.split('@')[1]?.toLowerCase();
  if (!email || !domain || !ALLOWED_EMAIL_DOMAINS.includes(domain)) {
    throw new AuthError(403, 'Access restricted');
  }

  return { uid: decoded.uid, email };
}
