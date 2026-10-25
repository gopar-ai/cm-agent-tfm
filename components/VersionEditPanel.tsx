'use client';

import { useEffect, useState } from 'react';
import { parseVersionContent } from '@/lib/post-parser';
import { saveDraft, addToCalendar } from '@/lib/calendar-storage';
import { getVersionEditState, saveVersionEditState } from '@/lib/version-edit-state';

type Props = {
  stateId: string;
  choice: 'A' | 'B';
  titulares: string[];
  contenido: string;
  formato: string;
};

export default function VersionEditPanel({ stateId, choice, titulares, contenido, formato }: Props) {
  const parsed = parseVersionContent(contenido);
  const persisted = getVersionEditState(stateId);

  const [titularesState, setTitularesState] = useState(persisted?.titulares ?? titulares);
  const [selectedIndex, setSelectedIndex] = useState(persisted?.selectedIndex ?? 0);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [cuerpo, setCuerpo] = useState(persisted?.cuerpo ?? parsed.cuerpo);
  const [hashtags, setHashtags] = useState<string[]>(persisted?.hashtags ?? parsed.hashtags);
  const [copyImagen, setCopyImagen] = useState(persisted?.copyImagen ?? parsed.copyImagen ?? '');
  const [newHashtag, setNewHashtag] = useState('');
  const [message, setMessage] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [date, setDate] = useState('');

  useEffect(() => {
    saveVersionEditState(stateId, {
      choice,
      selectedIndex,
      titulares: titularesState,
      cuerpo,
      hashtags,
      copyImagen,
    });
  }, [stateId, choice, selectedIndex, titularesState, cuerpo, hashtags, copyImagen]);

  function flash(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(''), 2500);
  }

  function updateTitular(index: number, value: string) {
    setTitularesState((prev) => prev.map((t, i) => (i === index ? value : t)));
  }

  function removeHashtag(tag: string) {
    setHashtags((prev) => prev.filter((h) => h !== tag));
  }

  function addHashtag() {
    const trimmed = newHashtag.trim();
    if (!trimmed) return;
    setHashtags((prev) => [...prev, trimmed.startsWith('#') ? trimmed : `#${trimmed}`]);
    setNewHashtag('');
  }

  function buildPost() {
    return {
      titular: titularesState[selectedIndex] ?? '',
      cuerpo,
      hashtags: hashtags.join(' '),
      promptImagen: parsed.promptImagen ?? '',
    };
  }

  function handleSaveDraft() {
    saveDraft(buildPost());
    flash('✓ Borrador guardado');
  }

  function handleAddToCalendarClick() {
    if (!showDatePicker) {
      setShowDatePicker(true);
      return;
    }
    if (!date) return;
    addToCalendar({ ...buildPost(), fecha: date });
    setShowDatePicker(false);
    setDate('');
    flash('✓ Agregado al calendario');
  }

  return (
    <div className="mt-3 bg-[#111111] border-t-2 border-[#CC0000] rounded-xl p-5 space-y-5 animate-slide-down">
      <p className="text-zinc-500 text-xs uppercase tracking-widest">Editar versión · {formato}</p>

      {/* Titulares */}
      <div>
        <p className="text-zinc-400 text-xs uppercase tracking-widest mb-2">Titulares</p>
        <div className="space-y-2">
          {titularesState.map((titular, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="radio"
                name={`titular-${formato}`}
                checked={selectedIndex === i}
                onChange={() => setSelectedIndex(i)}
                className="accent-[#CC0000] shrink-0"
              />
              {editingIndex === i ? (
                <>
                  <input
                    type="text"
                    value={titular}
                    onChange={(e) => updateTitular(i, e.target.value)}
                    autoFocus
                    className="flex-1 bg-zinc-950 border border-zinc-700 rounded text-white text-sm px-2 py-1 focus:outline-none focus:border-[#CC0000]"
                  />
                  <button
                    onClick={() => setEditingIndex(null)}
                    className="text-xs bg-[#CC0000] hover:bg-red-700 text-white px-2 py-1 rounded transition-colors shrink-0"
                  >
                    Listo
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm text-white">{titular}</span>
                  <button
                    onClick={() => setEditingIndex(i)}
                    className="text-zinc-500 hover:text-white transition-colors shrink-0"
                  >
                    ✏️
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Copy editable */}
      <div>
        <p className="text-zinc-400 text-xs uppercase tracking-widest mb-2">Copy</p>
        <textarea
          value={cuerpo}
          onChange={(e) => setCuerpo(e.target.value)}
          style={{ minHeight: '200px' }}
          className="w-full bg-[#1a1a1a] border border-zinc-800 rounded-lg text-white text-sm p-3 leading-relaxed focus:outline-none focus:border-[#CC0000] transition-colors resize-y"
        />
      </div>

      {/* Copy de la imagen — solo Copy + imagen */}
      {parsed.copyImagen !== undefined && (
        <div>
          <p className="text-zinc-400 text-xs uppercase tracking-widest mb-2">Copy de la imagen</p>
          <input
            type="text"
            value={copyImagen}
            onChange={(e) => setCopyImagen(e.target.value)}
            className="w-full bg-[#1a1a1a] border border-zinc-800 rounded-lg text-white text-sm px-3 py-2 focus:outline-none focus:border-[#CC0000] transition-colors"
          />
        </div>
      )}

      {/* Prompt para imagen — colapsable, gris */}
      {parsed.promptImagen && (
        <details className="text-zinc-500">
          <summary className="text-xs uppercase tracking-widest cursor-pointer hover:text-zinc-400 transition-colors">
            Prompt para imagen
          </summary>
          <p className="text-xs leading-relaxed mt-2">{parsed.promptImagen}</p>
        </details>
      )}

      {/* Hashtags */}
      <div>
        <p className="text-zinc-400 text-xs uppercase tracking-widest mb-2">Hashtags</p>
        <div className="flex flex-wrap gap-2 items-center">
          {hashtags.map((tag) => (
            <span
              key={tag}
              className="bg-zinc-800 text-zinc-200 text-xs px-2 py-1 rounded-full flex items-center gap-1"
            >
              {tag}
              <button onClick={() => removeHashtag(tag)} className="text-zinc-500 hover:text-white">
                ×
              </button>
            </span>
          ))}
          <input
            type="text"
            value={newHashtag}
            onChange={(e) => setNewHashtag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addHashtag();
              }
            }}
            placeholder="nuevo"
            className="bg-zinc-950 border border-zinc-800 rounded-full text-white text-xs px-2 py-1 w-20 focus:outline-none focus:border-[#CC0000]"
          />
          <button
            onClick={addHashtag}
            className="bg-zinc-800 hover:bg-zinc-700 text-white text-xs w-6 h-6 rounded-full transition-colors"
          >
            +
          </button>
        </div>
      </div>

      {/* Botones al pie */}
      <div className="flex items-center gap-3 flex-wrap pt-2 border-t border-zinc-800">
        <button
          onClick={handleSaveDraft}
          className="text-sm bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded transition-colors"
        >
          Guardar borrador
        </button>

        {showDatePicker ? (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded text-white text-sm px-2 py-1.5 focus:outline-none focus:border-[#CC0000]"
            />
            <button
              onClick={handleAddToCalendarClick}
              disabled={!date}
              className="text-sm bg-[#CC0000] hover:bg-red-700 disabled:opacity-50 text-white px-4 py-2 rounded transition-colors"
            >
              Confirmar fecha
            </button>
          </div>
        ) : (
          <button
            onClick={handleAddToCalendarClick}
            className="text-sm bg-[#CC0000] hover:bg-red-700 text-white px-4 py-2 rounded transition-colors"
          >
            Agregar al calendario
          </button>
        )}

        {message && <span className="text-green-400 text-xs">{message}</span>}
      </div>
    </div>
  );
}
