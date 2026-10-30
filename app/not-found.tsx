import React from 'react';
import Link from 'next/link';
import { FileQuestion, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-3xl p-8 shadow-2xl text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-[#2997FF]/15 border border-[#2997FF]/30 flex items-center justify-center text-[#2997FF] mx-auto">
          <FileQuestion className="w-8 h-8 stroke-[2.2]" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
            Página No Encontrada (404)
          </h2>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            El recurso o la ruta a la que intentas acceder no existe en el sistema técnico de inspecciones.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href="/"
            className="apple-press inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2997FF] hover:bg-[#0077ED] text-white text-xs sm:text-sm font-semibold shadow-md"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver al Planificador</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
