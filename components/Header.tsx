'use client';

import React from 'react';
import {
  Plus,
  CheckCircle2,
  XCircle,
  HardHat,
  Sparkles,
  Zap,
  Phone,
  LayoutGrid,
  CalendarRange,
} from 'lucide-react';
import { Language, translations } from '../lib/i18n/translations';

interface HeaderProps {
  scheduledCount: number;
  cancelledCount: number;
  techniciansCount: number;
  currentView: 'cards' | 'timeline';
  onViewChange: (view: 'cards' | 'timeline') => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  onOpenScheduleModal: () => void;
  onOpenCopilot: () => void;
  onOpenN8n: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  scheduledCount,
  cancelledCount,
  techniciansCount,
  currentView,
  onViewChange,
  language,
  onLanguageChange,
  onOpenScheduleModal,
  onOpenCopilot,
  onOpenN8n,
}) => {
  const t = translations[language];

  return (
    <header className="sticky top-0 z-30 w-full apple-glass border-b border-white/[0.08] px-4 sm:px-6 lg:px-8 py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Marca, Terrassa Lab y Switch de Idioma */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2997FF]/20 via-[#A855F7]/15 to-[#30D158]/20 border border-white/10 flex items-center justify-center text-[#2997FF] shadow-inner shrink-0">
            <HardHat className="w-5 h-5 text-[#2997FF]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-semibold tracking-[-0.02em] text-[#F5F5F7]">
                {t.appTitle}
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#30D158]/10 text-[#30D158] border border-[#30D158]/20">
                <span className="w-1.5 h-1.5 rounded-full bg-[#30D158] animate-pulse" />
                Terrassa Lab • 08:00–17:00 h
              </span>
            </div>
            <p className="text-[11px] text-[#86868B]">{t.appSubtitle}</p>
          </div>
        </div>

        {/* Acciones de Cabecera: Conmutadores, IA, n8n y Nueva Visita */}
        <div className="flex items-center gap-2 sm:gap-2.5 w-full md:w-auto justify-between md:justify-end flex-wrap">
          {/* Switch Bilingüe CAT / ES */}
          <div className="bg-white/[0.04] border border-white/[0.08] p-0.5 rounded-xl flex items-center text-xs font-medium">
            <button
              onClick={() => onLanguageChange('ca')}
              className={`px-2 py-1 rounded-lg transition-all ${
                language === 'ca'
                  ? 'bg-white/15 text-white shadow-sm font-semibold'
                  : 'text-[#86868B] hover:text-white'
              }`}
            >
              CAT
            </button>
            <button
              onClick={() => onLanguageChange('es')}
              className={`px-2 py-1 rounded-lg transition-all ${
                language === 'es'
                  ? 'bg-white/15 text-white shadow-sm font-semibold'
                  : 'text-[#86868B] hover:text-white'
              }`}
            >
              ES
            </button>
          </div>

          {/* Switch de Vistas: Targetes vs Cronograma */}
          <div className="bg-white/[0.04] border border-white/[0.08] p-0.5 rounded-xl flex items-center text-xs font-medium">
            <button
              onClick={() => onViewChange('timeline')}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all ${
                currentView === 'timeline'
                  ? 'bg-[#2997FF] text-white shadow-sm'
                  : 'text-[#86868B] hover:text-white'
              }`}
              title={t.viewTimeline}
            >
              <CalendarRange className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.viewTimeline}</span>
            </button>
            <button
              onClick={() => onViewChange('cards')}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all ${
                currentView === 'cards'
                  ? 'bg-[#2997FF] text-white shadow-sm'
                  : 'text-[#86868B] hover:text-white'
              }`}
              title={t.viewCards}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.viewCards}</span>
            </button>
          </div>

          {/* Botón de Automatización n8n */}
          <button
            onClick={onOpenN8n}
            className="apple-press p-2 sm:px-2.5 sm:py-1.5 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/25 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
            title="Integración n8n Webhook"
          >
            <Zap className="w-3.5 h-3.5 text-orange-400" />
            <span className="hidden lg:inline">n8n</span>
          </button>

          {/* Botón LabQA Copilot IA con Soporte de Voz */}
          <button
            onClick={onOpenCopilot}
            className="apple-press px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-[#2997FF]/20 to-[#A855F7]/20 hover:from-[#2997FF]/30 hover:to-[#A855F7]/30 text-white border border-white/10 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#2997FF]" />
            <span className="hidden sm:inline">LabQA Copilot</span>
            <span className="flex items-center gap-0.5 text-[10px] text-emerald-400 bg-emerald-500/15 px-1 py-0.2 rounded border border-emerald-500/30">
              <Phone className="w-2.5 h-2.5" /> Voz
            </span>
          </button>

          {/* Botón de Acción Principal "Nueva Visita" */}
          <button
            onClick={onOpenScheduleModal}
            className="apple-press inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#2997FF] hover:bg-[#0077ED] text-white text-xs sm:text-sm font-medium shadow-[0_2px_12px_rgba(41,151,255,0.35)] cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>{t.newVisitBtn}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
