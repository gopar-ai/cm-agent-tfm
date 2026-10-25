'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    setLoading(false);

    if (res.ok) {
      router.push('/dashboard');
    } else {
      setError('Usuario o contraseña incorrectos.');
    }
  }

  return (
    <main className="min-h-screen bg-[#0f0f0f] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo / branding */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="text-[#CC0000] text-3xl font-black tracking-tight">CM</span>
            <span className="text-white text-3xl font-light tracking-tight">Agent</span>
          </div>
          <p className="text-zinc-500 text-sm">Agente de contenido</p>
          <p className="text-zinc-500 text-sm">Detecta Security</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-zinc-400 text-xs mb-1 uppercase tracking-widest">
              Usuario
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              className="w-full bg-zinc-900 border border-zinc-800 rounded text-white px-4 py-3 text-sm focus:outline-none focus:border-[#CC0000] transition-colors"
            />
          </div>

          <div>
            <label className="block text-zinc-400 text-xs mb-1 uppercase tracking-widest">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full bg-zinc-900 border border-zinc-800 rounded text-white px-4 py-3 text-sm focus:outline-none focus:border-[#CC0000] transition-colors"
            />
          </div>

          {error && (
            <p className="text-[#CC0000] text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#CC0000] hover:bg-red-700 disabled:opacity-50 text-white font-semibold py-3 rounded transition-colors text-sm tracking-wide"
          >
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
      </div>
    </main>
  );
}
