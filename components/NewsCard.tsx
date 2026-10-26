'use client';

import Icono from '@/components/Icono';
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
    <div className="panel rounded-xl overflow-hidden">
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
            className="text-[11px] bg-[#1d2126] hover:bg-[#262b31] text-[#c9ced4] px-2 py-1 rounded transition-colors"
          >
            <Icono nombre="enlace" className="w-3 h-3" />Ver noticia
          </a>

          {mode === 'feed' ? (
            <button
              onClick={onSave}
              disabled={saved}
              className="text-[11px] bg-[#1d2126] hover:bg-[#262b31] disabled:opacity-50 text-[#c9ced4] px-2 py-1 rounded transition-colors"
            >
              <Icono nombre="guardar" className="w-3 h-3" />{saved ? 'Guardada' : 'Guardar'}
            </button>
          ) : (
            <button
              onClick={onRemove}
              className="text-[11px] bg-[#1d2126] hover:bg-indigo-900 text-[#c9ced4] px-2 py-1 rounded transition-colors"
            >
              🗑️ Quitar
            </button>
          )}

          <button
            onClick={onUseForPost}
            className="text-[11px] btn-sutil text-white px-2 py-1 rounded transition-colors"
          >
            <Icono nombre="escribir" className="w-3 h-3" />Usar para post
          </button>
        </div>
      </div>
    </div>
  );
}
