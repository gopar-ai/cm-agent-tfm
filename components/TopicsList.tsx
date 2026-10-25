'use client';

import { Topic } from '@/lib/post-parser';

type Props = {
  topics: Topic[];
  closingText?: string;
  onSelect?: (topic: Topic) => void;
  disabled?: boolean;
};

export default function TopicsList({ topics, closingText, onSelect, disabled }: Props) {
  return (
    <div className="w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="bg-zinc-800 px-4 py-2">
        <span className="text-xs text-zinc-400 uppercase tracking-widest">
          📋 Propuestas de temas
        </span>
      </div>

      <div className="divide-y divide-zinc-800">
        {topics.map((topic) => (
          <div
            key={topic.number}
            onClick={() => !disabled && onSelect?.(topic)}
            className={`px-4 py-3 flex gap-3 transition-colors ${
              onSelect && !disabled ? 'cursor-pointer hover:bg-zinc-800/60' : ''
            } ${disabled ? 'opacity-60' : ''}`}
          >
            <span className="text-[#CC0000] font-bold text-sm shrink-0 w-5 text-right">
              {topic.number}.
            </span>
            <div className="flex-1 space-y-1.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-white font-semibold text-sm leading-snug">{topic.title}</h4>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap ${
                    topic.kind === 'Actualidad'
                      ? 'bg-blue-950 text-blue-300'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {topic.kind === 'Actualidad' ? '📰 Actualidad' : '🏷️ Tema'}
                </span>
              </div>
              <p className="text-zinc-400 text-xs leading-relaxed">{topic.reason}</p>
              {(topic.date || topic.source || topic.url) && (
                <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                  {(topic.date || topic.source) && (
                    <span className="text-zinc-600 text-xs">
                      {topic.date}
                      {topic.date && topic.source ? ' · ' : ''}
                      {topic.source && `Fuente: ${topic.source}`}
                    </span>
                  )}
                  {topic.url && (
                    <a
                      href={topic.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded-full transition-colors inline-flex items-center gap-1"
                    >
                      🔗 Ver noticia
                    </a>
                  )}
                </div>
              )}
              {onSelect && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!disabled) onSelect(topic);
                  }}
                  disabled={disabled}
                  className="mt-1 text-xs bg-[#CC0000] hover:bg-red-700 disabled:opacity-50 text-white px-3 py-1 rounded-full transition-colors inline-flex items-center gap-1"
                >
                  ✅ Elegir este tema
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {closingText && (
        <div className="px-4 py-3 border-t border-zinc-800 text-zinc-300 text-sm">
          {closingText}
        </div>
      )}
    </div>
  );
}
