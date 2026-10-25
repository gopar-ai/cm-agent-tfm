'use client';

import { useState } from 'react';

type Post = {
  titular: string;
  cuerpo: string;
  hashtags: string;
  promptImagen: string;
};

type Props = {
  post: Post;
  onSave?: ((post: Post) => void) | undefined;
};

export default function PostCard({ post, onSave }: Props) {
  const [saved, setSaved] = useState(false);

  function handleSave() {
    onSave?.(post);
    setSaved(true);
  }

  return (
    <div className="w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-zinc-800 px-4 py-2 flex items-center justify-between">
        <span className="text-xs text-zinc-400 uppercase tracking-widest">Post LinkedIn</span>
        {onSave && (
          <button
            onClick={handleSave}
            disabled={saved}
            className="text-xs bg-[#CC0000] hover:bg-red-700 disabled:opacity-50 text-white px-3 py-1 rounded transition-colors"
          >
            {saved ? '✓ Guardado' : '+ Calendario'}
          </button>
        )}
      </div>

      {/* Content */}
      <div className="px-4 py-4 space-y-3">
        <h3 className="text-white font-bold text-base leading-tight">{post.titular}</h3>
        <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">{post.cuerpo}</p>
        <p className="text-[#CC0000] text-xs font-medium">{post.hashtags}</p>
      </div>

      {/* Prompt imagen */}
      <details className="border-t border-zinc-800">
        <summary className="px-4 py-2 text-zinc-600 text-xs cursor-pointer hover:text-zinc-400 transition-colors">
          Ver prompt de imagen
        </summary>
        <p className="px-4 pb-3 text-zinc-500 text-xs leading-relaxed">{post.promptImagen}</p>
      </details>
    </div>
  );
}
