import { NextRequest, NextResponse } from 'next/server';
import { getServerEnv } from '@/lib/env';
import { fetchNews } from '@/lib/news';
import { setCachedNews } from '@/lib/news-cache';
import { safeEqual } from '@/lib/security';

/**
 * Refresco programado del feed, para que el primer analista del día no espere
 * la búsqueda completa.
 *
 * Es la única ruta que no pasa por la sesión, así que su secreto es lo único que
 * la protege: se compara en tiempo constante y, si no está configurado, la ruta
 * queda deshabilitada en vez de quedar abierta (OWASP A01).
 */

export async function GET(req: NextRequest) {
  const { cronSecret } = getServerEnv();

  if (!cronSecret) {
    return NextResponse.json(
      { error: 'Refresco programado no disponible: falta configurar CRON_SECRET.' },
      { status: 503 }
    );
  }

  const authHeader = req.headers.get('authorization') ?? '';
  if (!safeEqual(authHeader, `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const news = await fetchNews();
    const persisted = setCachedNews(news);
    return NextResponse.json({ ok: true, count: news.length, persisted });
  } catch (error) {
    console.error('[cron] no se pudo refrescar el feed:', error);
    return NextResponse.json({ ok: false, error: 'No se pudo refrescar el feed' }, { status: 502 });
  }
}
