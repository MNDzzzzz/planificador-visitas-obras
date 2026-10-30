'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Error no controlado en la aplicación:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-3xl p-8 shadow-2xl text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-500 mx-auto">
          <AlertTriangle className="w-8 h-8 stroke-[2.2]" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
            Ha ocurrido un problema inesperado
          </h2>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            Se ha interceptado una anomalía en el renderizado sin comprometer la integridad de los datos. Puedes reintentar la operación de forma segura.
          </p>
        </div>

        {error.message && (
          <div className="p-3 rounded-xl bg-[var(--bg-card-hover)] border border-[var(--border-subtle)] text-[11px] font-mono text-[var(--text-secondary)] text-left overflow-x-auto max-h-28">
            {error.message}
          </div>
        )}

        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="apple-press inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2997FF] hover:bg-[#0077ED] text-white text-xs sm:text-sm font-semibold shadow-md cursor-pointer"
          >
            <RefreshCcw className="w-4 h-4" />
            <span>Reintentar Operación</span>
          </button>
          <button
            onClick={() => {
              if (typeof window !== 'undefined') window.location.href = '/';
            }}
            className="apple-press inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--bg-card-hover)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs sm:text-sm font-semibold cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Inicio</span>
          </button>
        </div>
      </div>
    </div>
  );
}
