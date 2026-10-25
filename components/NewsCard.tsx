'use client';

import { useState } from 'react';
import type { NewsItem } from '@/lib/news-types';

type Props = {
  news: NewsItem;
  mode: 'feed' | 'saved';
  saved?: boolean;
  onSave?: () => void;
  onRemove?: () => void;
  onUseForPost: () => void;
};

export default function NewsCard({ news, mode, saved, onSave, onRemove, onUseForPost }: Props) {
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = !!news.image && !imgFailed;

  return (
    <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl overflow-hidden">
      {showImage && (
        <img
          src={news.image}
          alt={news.title}
          className="w-full h-32 object-cover"
          onError={() => setImgFailed(true)}
        />
      )}

      <div className="p-3 space-y-2">
        <h4 className="text-white text-sm font-medium leading-snug line-clamp-3">{news.title}</h4>
        <p className="text-zinc-500 text-xs">
          {news.source}
          {news.date && ` · ${news.date}`}
        </p>

        <div className="flex flex-wrap gap-1.5 pt-1">
          <a
            href={news.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-1 rounded transition-colors"
          >
            🔗 Ver noticia
          </a>

          {mode === 'feed' ? (
            <button
              onClick={onSave}
              disabled={saved}
              className="text-[11px] bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-300 px-2 py-1 rounded transition-colors"
            >
              {saved ? '✓ Guardada' : '💾 Guardar'}
            </button>
          ) : (
            <button
              onClick={onRemove}
              className="text-[11px] bg-zinc-800 hover:bg-red-900 text-zinc-300 px-2 py-1 rounded transition-colors"
            >
              🗑️ Quitar
            </button>
          )}

          <button
            onClick={onUseForPost}
            className="text-[11px] bg-[#CC0000] hover:bg-red-700 text-white px-2 py-1 rounded transition-colors"
          >
            ✍️ Usar para post
          </button>
        </div>
      </div>
    </div>
  );
}
