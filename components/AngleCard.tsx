'use client';

import { useState } from 'react';
import type { AngleResult } from '@/lib/post-parser';

const FORMATS = ['📝 Copy', '📸 Copy + imagen', '🎠 Carrusel', '📄 Documento PDF', '🎬 Video (guión)'];

type Props = {
  angle: AngleResult;
  onSelectFormat: (format: string) => void;
  disabled?: boolean;
};

export default function AngleCard({ angle, onSelectFormat, disabled }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  function handleClick(format: string) {
    setSelected(format);
    onSelectFormat(format);
  }

  return (
    <div className="w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="px-4 py-4 space-y-3">
        <div>
          <p className="text-zinc-500 text-xs font-medium">🎯 Ángulo</p>
          <p className="text-zinc-100 text-sm">{angle.angulo}</p>
        </div>
        <div>
          <p className="text-zinc-500 text-xs font-medium">💡 Por qué ahora</p>
          <p className="text-zinc-100 text-sm">{angle.porQueAhora}</p>
        </div>
        <div>
          <p className="text-zinc-500 text-xs font-medium">🎭 Emoción objetivo</p>
          <p className="text-zinc-100 text-sm">{angle.emocion}</p>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {FORMATS.map((format) => (
            <button
              key={format}
              disabled={disabled}
              onClick={() => handleClick(format)}
              className={`px-4 py-2 rounded-full text-sm border transition-colors disabled:opacity-50 ${
                selected === format
                  ? 'bg-[#CC0000] border-[#CC0000] text-white'
                  : 'bg-[#1a1a1a] border-white/20 text-white hover:border-[#CC0000]'
              }`}
            >
              {format}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
