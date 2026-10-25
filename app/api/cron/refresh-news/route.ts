import { NextRequest, NextResponse } from 'next/server';
import { fetchNews } from '@/lib/news';
import { setCachedNews } from '@/lib/news-cache';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const news = await fetchNews();
  setCachedNews(news);
  return NextResponse.json({ ok: true, count: news.length });
}
