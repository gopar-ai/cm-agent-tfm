'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { syncPublishedPost, removeFromPublished } from '@/lib/calendar-storage';

type Status = 'borrador' | 'programado' | 'publicado';

type Post = {
  id: string;
  titular: string;
  cuerpo: string;
  hashtags: string;
  promptImagen: string;
  fecha: string;
  status: Status;
};

const STATUS_LABELS: Record<Status, string> = {
  borrador: 'Borrador',
  programado: 'Programado',
  publicado: 'Publicado',
};

const STATUS_COLORS: Record<Status, string> = {
  borrador: 'bg-zinc-700 text-zinc-300',
  programado: 'bg-blue-900 text-blue-300',
  publicado: 'bg-green-900 text-green-300',
};

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export default function CalendarPage() {
  return (
    <Suspense fallback={<div className="h-full" />}>
      <CalendarContent />
    </Suspense>
  );
}

function CalendarContent() {
  const searchParams = useSearchParams();
  const postId = searchParams.get('postId');

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [posts, setPosts] = useState<Post[]>([]);
  const [selected, setSelected] = useState<Post | null>(null);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('cm_calendar') ?? '[]') as Post[];
    setPosts(stored);

    if (postId) {
      const match = stored.find((p) => p.id === postId);
      if (match) {
        setSelected(match);
        setYear(Number(match.fecha.slice(0, 4)) || today.getFullYear());
        setMonth((Number(match.fecha.slice(5, 7)) || today.getMonth() + 1) - 1);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  function updatePost(id: string, updates: Partial<Post>) {
    setPosts((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, ...updates } : p));
      localStorage.setItem('cm_calendar', JSON.stringify(next));
      const updated = next.find((p) => p.id === id);
      if (updated) syncPublishedPost(updated);
      return next;
    });
    if (selected?.id === id) setSelected((p) => p ? { ...p, ...updates } : p);
  }

  function deletePost(id: string) {
    setPosts((prev) => {
      const next = prev.filter((p) => p.id !== id);
      localStorage.setItem('cm_calendar', JSON.stringify(next));
      return next;
    });
    removeFromPublished(id);
    setSelected(null);
  }

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function postsForDay(day: number) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return posts.filter((p) => p.fecha === dateStr);
  }

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }

  function nextMonth() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  return (
    <div className="flex h-full">
      {/* Calendar */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-900 flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-white font-semibold text-sm">Calendario de contenido</h1>
            <p className="text-zinc-500 text-xs mt-0.5">Posts programados y publicados</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={prevMonth} className="text-zinc-400 hover:text-white transition-colors px-2">‹</button>
            <span className="text-white text-sm font-medium min-w-[130px] text-center">
              {MONTHS[month]} {year}
            </span>
            <button onClick={nextMonth} className="text-zinc-400 hover:text-white transition-colors px-2">›</button>
          </div>
        </div>

        {/* Empty state */}
        {posts.length === 0 && (
          <div className="px-6 py-4 border-b border-zinc-900 bg-zinc-950/50 shrink-0">
            <p className="text-white text-sm font-medium">📅 Aún no tienes posts guardados</p>
            <p className="text-zinc-500 text-xs mt-1 leading-relaxed">
              Los posts que guardes desde el chat con el botón <span className="text-zinc-300">“+ Calendario”</span> aparecerán aquí para que les asignes fecha y les den seguimiento (borrador → programado → publicado).
            </p>
            <Link
              href="/dashboard"
              className="inline-block mt-2 text-xs bg-[#CC0000] hover:bg-red-700 text-white px-3 py-1.5 rounded transition-colors"
            >
              Ir al chat a generar una propuesta
            </Link>
          </div>
        )}

        {/* Grid header */}
        <div className="grid grid-cols-7 border-b border-zinc-900 shrink-0">
          {DAYS.map((d) => (
            <div key={d} className="py-2 text-center text-zinc-500 text-xs uppercase tracking-wider">
              {d}
            </div>
          ))}
        </div>

        {/* Grid body */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-7 h-full auto-rows-[minmax(80px,1fr)]">
            {cells.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} className="border-b border-r border-zinc-900" />;
              const dayPosts = postsForDay(day);
              const isToday =
                day === today.getDate() &&
                month === today.getMonth() &&
                year === today.getFullYear();
              return (
                <div
                  key={day}
                  className="border-b border-r border-zinc-900 p-1.5 overflow-hidden"
                >
                  <span
                    className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs mb-1 ${
                      isToday ? 'bg-[#CC0000] text-white font-bold' : 'text-zinc-500'
                    }`}
                  >
                    {day}
                  </span>
                  <div className="space-y-0.5">
                    {dayPosts.map((post) => (
                      <button
                        key={post.id}
                        onClick={() => setSelected(post)}
                        className={`w-full text-left text-xs px-1.5 py-0.5 rounded truncate ${
                          STATUS_COLORS[post.status]
                        }`}
                      >
                        {post.titular}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="w-80 border-l border-zinc-900 flex flex-col overflow-hidden shrink-0">
          <div className="px-4 py-3 border-b border-zinc-900 flex items-center justify-between">
            <span className="text-zinc-400 text-xs uppercase tracking-wider">Detalle del post</span>
            <button
              onClick={() => setSelected(null)}
              className="text-zinc-600 hover:text-white text-sm transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <h2 className="text-white font-bold text-sm leading-tight">{selected.titular}</h2>

            {/* Status */}
            <div>
              <label className="text-zinc-500 text-xs uppercase tracking-widest block mb-1">Estado</label>
              <select
                value={selected.status}
                onChange={(e) => updatePost(selected.id, { status: e.target.value as Status })}
                className="bg-zinc-900 border border-zinc-800 text-white text-sm rounded px-3 py-2 w-full focus:outline-none focus:border-[#CC0000]"
              >
                {Object.entries(STATUS_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="text-zinc-500 text-xs uppercase tracking-widest block mb-1">Fecha</label>
              <input
                type="date"
                value={selected.fecha}
                onChange={(e) => updatePost(selected.id, { fecha: e.target.value })}
                className="bg-zinc-900 border border-zinc-800 text-white text-sm rounded px-3 py-2 w-full focus:outline-none focus:border-[#CC0000]"
              />
            </div>

            {/* Copy */}
            <div>
              <label className="text-zinc-500 text-xs uppercase tracking-widest block mb-1">Copy</label>
              <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">{selected.cuerpo}</p>
            </div>

            <p className="text-[#CC0000] text-xs font-medium">{selected.hashtags}</p>

            {/* Delete */}
            <button
              onClick={() => deletePost(selected.id)}
              className="w-full text-sm text-zinc-500 hover:text-[#CC0000] border border-zinc-800 hover:border-[#CC0000] rounded py-2 transition-colors"
            >
              Eliminar post
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
