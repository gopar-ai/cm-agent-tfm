'use client';

import { useState } from 'react';
import type { VersionsResult } from '@/lib/post-parser';
import VersionEditPanel from './VersionEditPanel';
import { getVersionEditState } from '@/lib/version-edit-state';

type Props = {
  stateId: string;
  versions: VersionsResult;
  onConfirm: (choice: 'A' | 'B', content: string, titulares: string[]) => void;
  disabled?: boolean;
};

export default function VersionsCompare({ stateId, versions, onConfirm, disabled }: Props) {
  const [confirmed, setConfirmed] = useState<'A' | 'B' | null>(
    () => getVersionEditState(stateId)?.choice ?? null
  );

  function handleChoose(letter: 'A' | 'B') {
    if (confirmed) return;
    const version = letter === 'A' ? versions.versionA : versions.versionB;
    setConfirmed(letter);
    onConfirm(letter, version.contenido, version.titulares);
  }

  const chosen = confirmed === 'A' ? versions.versionA : confirmed === 'B' ? versions.versionB : null;

  return (
    <div className="w-full max-w-2xl space-y-3">
      <p className="text-zinc-500 text-xs uppercase tracking-widest">📐 Formato: {versions.format}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {(['A', 'B'] as const).map((letter) => {
          const v = letter === 'A' ? versions.versionA : versions.versionB;
          return (
            <div
              key={letter}
              className="bg-[#1a1a1a] border border-zinc-800 rounded-xl overflow-hidden flex flex-col"
            >
              <div className="bg-zinc-800 px-3 py-2">
                <span className="text-xs text-zinc-400 uppercase tracking-widest">Versión {letter}</span>
              </div>
              <div className="px-3 py-3 flex-1 space-y-2">
                {v.titulo && <h4 className="text-white font-semibold text-sm">{v.titulo}</h4>}
                <p className="text-zinc-300 text-xs leading-relaxed whitespace-pre-wrap">{v.contenido}</p>
              </div>
              <div className="px-3 pb-3">
                <button
                  onClick={() => handleChoose(letter)}
                  disabled={disabled || !!confirmed}
                  className={`w-full text-sm py-1.5 rounded transition-colors disabled:opacity-50 ${
                    confirmed === letter ? 'bg-red-900 text-white' : 'bg-[#CC0000] hover:bg-red-700 text-white'
                  }`}
                >
                  {confirmed === letter ? '✓ Elegida' : `Elegir ${letter}`}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {chosen && confirmed && (
        <VersionEditPanel
          stateId={stateId}
          choice={confirmed}
          titulares={chosen.titulares}
          contenido={chosen.contenido}
          formato={versions.format}
        />
      )}
    </div>
  );
}
