'use client';

import Icono from '@/components/Icono';
import { useState } from 'react';
import type { AngleResult } from '@/lib/post-parser';

import { FORMAT_OPTIONS } from '@/lib/agent-messages';

import type { Nombre } from '@/components/Icono';

/** Un icono por formato, en el mismo orden que los ofrece el contrato. */
const ICONO_FORMATO: Record<string, Nombre> = {
  Copy: 'escribir',
  'Copy + imagen': 'lista',
  Carrusel: 'documento',
  'Documento PDF': 'documento',
  'Video (guión)': 'señal',
};

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
          <p className="text-zinc-500 text-xs font-medium flex items-center gap-1.5"><Icono nombre="diana" className="w-3.5 h-3.5" />Ángulo</p>
          <p className="text-zinc-100 text-sm">{angle.angulo}</p>
        </div>
        <div>
          <p className="text-zinc-500 text-xs font-medium flex items-center gap-1.5"><Icono nombre="reloj" className="w-3.5 h-3.5" />Por qué ahora</p>
          <p className="text-zinc-100 text-sm">{angle.porQueAhora}</p>
        </div>
        <div>
          <p className="text-zinc-500 text-xs font-medium flex items-center gap-1.5"><Icono nombre="corazon" className="w-3.5 h-3.5" />Emoción objetivo</p>
          <p className="text-zinc-100 text-sm">{angle.emocion}</p>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {FORMAT_OPTIONS.map((format) => (
            <button
              key={format}
              disabled={disabled}
              onClick={() => handleClick(format)}
              className={`px-4 py-2 rounded-full text-sm border transition-colors disabled:opacity-50 inline-flex items-center gap-2 ${
                selected === format
                  ? 'bg-[#6366F1] border-[#6366F1] text-white'
                  : 'bg-[#1a1a1a] border-white/20 text-white hover:border-[#6366F1]'
              }`}
            >
              <Icono nombre={ICONO_FORMATO[format] ?? 'escribir'} className="w-3.5 h-3.5" />
              {format}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
