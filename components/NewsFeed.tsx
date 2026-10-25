'use client';

import { useEffect, useState } from 'react';
import NewsCard from './NewsCard';
import type { NewsItem } from '@/lib/news-types';
import { getSavedNews, saveNews, removeSavedNews, isNewsSaved } from '@/lib/news-storage';

type DayFilter = 'hoy' | '3' | '7' | '15' | '30';

const FILTERS: { value: DayFilter; label: string }[] = [
  { value: 'hoy', label: 'Hoy' },
  { value: '3', label: '3 días' },
  { value: '7', label: '7 días' },
  { value: '15', label: '15 días' },
  { value: '30', label: '30 días' },
];

function daysAgo(dateStr: string): number | null {
  if (!dateStr) return null;
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}

function matchesFilter(item: NewsItem, filter: DayFilter): boolean {
  const age = daysAgo(item.date);
  if (age === null || age < 0) return false;
  const max = filter === 'hoy' ? 0 : Number(filter);
  return age <= max;
}

type Props = {
  onUseForPost: (message: string) => void;
};

export default function NewsFeed({ onUseForPost }: Props) {
  const [tab, setTab] = useState<'recientes' | 'guardadas'>('recientes');
  const [filter, setFilter] = useState<DayFilter>('15');
  const [news, setNews] = useState<NewsItem[]>([]);
  const [savedNews, setSavedNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function loadNews() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/news');
      if (!res.ok) throw new Error('Error al cargar noticias');
      const { news: items } = await res.json();
      setNews(items);
    } catch {
      setError('No se pudieron cargar las noticias. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNews();
    setSavedNews(getSavedNews());
  }, []);

  function handleUseForPost(item: NewsItem) {
    onUseForPost(`Genera un post para LinkedIn basado en esta noticia: ${item.title} ${item.url}`);
  }

  function handleSave(item: NewsItem) {
    saveNews(item);
    setSavedNews(getSavedNews());
  }

  function handleRemove(url: string) {
    removeSavedNews(url);
    setSavedNews(getSavedNews());
  }

  const visibleNews = tab === 'recientes' ? news.filter((item) => matchesFilter(item, filter)) : savedNews;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-4 border-b border-zinc-900 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-semibold text-sm">📡 Feed de noticias</h2>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-3">
          {(['recientes', 'guardadas'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                tab === t ? 'bg-[#CC0000] text-white' : 'bg-zinc-900 text-zinc-400 hover:text-white'
              }`}
            >
              {t === 'recientes' ? 'Recientes' : `Guardadas (${savedNews.length})`}
            </button>
          ))}
        </div>

        {/* Day filters */}
        {tab === 'recientes' && (
          <div className="flex gap-1 flex-wrap">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`text-[11px] px-2 py-1 rounded transition-colors ${
                  filter === f.value
                    ? 'bg-zinc-700 text-white'
                    : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {loading && tab === 'recientes' && (
          <p className="text-zinc-500 text-sm text-center py-6">Buscando noticias…</p>
        )}

        {error && <p className="text-[#CC0000] text-sm text-center py-6">{error}</p>}

        {!loading && !error && visibleNews.length === 0 && (
          <p className="text-zinc-500 text-sm text-center py-6">
            {tab === 'recientes'
              ? 'No hay noticias en este rango de fechas.'
              : 'No tienes noticias guardadas todavía.'}
          </p>
        )}

        {visibleNews.map((item) => (
          <NewsCard
            key={item.url}
            news={item}
            mode={tab === 'recientes' ? 'feed' : 'saved'}
            saved={tab === 'recientes' ? isNewsSaved(item.url) : undefined}
            onSave={() => handleSave(item)}
            onRemove={() => handleRemove(item.url)}
            onUseForPost={() => handleUseForPost(item)}
          />
        ))}
      </div>
    </div>
  );
}
