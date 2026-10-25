import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET!;
const COOKIE_NAME = 'cm-agent-token';
const THIRTY_DAYS = 60 * 60 * 24 * 30;

export function signToken(username: string): string {
  return jwt.sign({ username }, JWT_SECRET, { expiresIn: THIRTY_DAYS });
}

export function verifyToken(token: string): { username: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { username: string };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<{ username: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export function validateCredentials(username: string, password: string): boolean {
  return (
    username === process.env.APP_USERNAME &&
    password === process.env.APP_PASSWORD
  );
}

export { COOKIE_NAME, THIRTY_DAYS };
