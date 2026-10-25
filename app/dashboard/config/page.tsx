'use client';

import { useState } from 'react';
import { DEFAULT_CONTEXT, getAgentContext, saveAgentContext, resetAgentContext } from '@/lib/agent-context';

export default function ConfigPage() {
  const [content, setContent] = useState<string>(() => getAgentContext());
  const [message, setMessage] = useState('');

  function flashMessage(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(''), 2500);
  }

  function handleSave() {
    saveAgentContext(content);
    flashMessage('Contexto guardado ✓');
  }

  function handleReset() {
    resetAgentContext();
    setContent(DEFAULT_CONTEXT);
    flashMessage('Restaurado a los valores por defecto');
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-3 border-b border-zinc-900 shrink-0 flex items-center justify-between gap-3">
        <button
          onClick={handleReset}
          className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded transition-colors"
        >
          Restaurar default
        </button>

        <div className="flex items-center gap-3">
          {message && <span className="text-xs text-green-400">{message}</span>}
          <button
            onClick={handleSave}
            className="text-xs bg-[#CC0000] hover:bg-red-700 text-white px-3 py-1.5 rounded transition-colors font-medium"
          >
            Guardar cambios
          </button>
        </div>
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        spellCheck={false}
        className="flex-1 w-full bg-zinc-950 text-zinc-100 text-sm font-mono leading-relaxed p-6 resize-none focus:outline-none"
      />
    </div>
  );
}
