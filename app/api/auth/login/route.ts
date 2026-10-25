import { NextRequest, NextResponse } from 'next/server';
import { signToken, validateCredentials, COOKIE_NAME, THIRTY_DAYS } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  if (!validateCredentials(username, password)) {
    return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 });
  }

  const token = signToken(username);
  const response = NextResponse.json({ ok: true });

  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: THIRTY_DAYS,
    path: '/',
  });

  return response;
}
