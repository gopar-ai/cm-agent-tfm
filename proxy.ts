import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

/**
 * Puerta de entrada: sin sesión válida, todo lleva al acceso.
 *
 * Las excepciones son tres y cada una tiene su motivo:
 *  - `/login` y su API, o no habría forma de entrar.
 *  - `/api/health`, porque quien lo consulta es Railway o Docker para saber si
 *    el servicio está en pie, y no tiene sesión. Faltaba: el healthcheck
 *    respondía 307 hacia el login, así que el contenedor podía estar roto por
 *    dentro y la plataforma lo daba por sano igual.
 *  - `/api/cron`, que lo llama una tarea programada y se protege con su propio
 *    secreto (ver la ruta; sin secreto configurado, responde 503).
 */

const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/health', '/api/cron'];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((publico) => pathname === publico || pathname.startsWith(`${publico}/`));
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublicPath(pathname)) return NextResponse.next();

  const token = req.cookies.get('cm-agent-token')?.value;
  if (!token || !verifyToken(token)) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

export { PUBLIC_PATHS };
