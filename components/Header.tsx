'use client';

import React from 'react';
import {
  Plus,
  HardHat,
  Sparkles,
  Zap,
  Phone,
  LayoutGrid,
  CalendarRange,
  Sun,
  Moon,
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
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenScheduleModal: () => void;
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
  theme,
  onToggleTheme,
  onOpenScheduleModal,
  onOpenN8n,
}) => {
  const t = translations[language];

  return (
    <header className="sticky top-0 z-30 w-full apple-glass border-b border-[var(--border-subtle)] px-4 sm:px-6 lg:px-8 xl:px-10 py-3 transition-colors">
      <div className="w-full flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4">
        {/* Identidad de la Aplicación y Sede */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2997FF]/20 via-[#A855F7]/15 to-[#30D158]/20 border border-[var(--border-subtle)] flex items-center justify-center text-[#2997FF] shadow-inner shrink-0">
            <HardHat className="w-5 h-5 text-[#2997FF]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-[var(--text-primary)]">
                {t.appTitle}
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#30D158]/10 text-[#30D158] border border-[#30D158]/25">
                <span className="w-1.5 h-1.5 rounded-full bg-[#30D158] animate-pulse" />
                08:00–17:00 h
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">{t.appSubtitle}</p>
          </div>
        </div>

        {/* Acciones de Cabecera: Conmutadores, Modo Claro/Oscuro, n8n y Nueva Visita */}
        <div className="flex items-center gap-2 sm:gap-2.5 w-full md:w-auto justify-between md:justify-end flex-wrap">
          {/* Conmutador Modo Claro / Modo Oscuro */}
          <button
            onClick={onToggleTheme}
            className="apple-press h-[34px] px-2.5 rounded-xl bg-[var(--bg-card-hover)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-medium flex items-center justify-center cursor-pointer transition-colors"
            title={theme === 'dark' ? t.themeLight : t.themeDark}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700" />
            )}
          </button>

          {/* Switch Bilingüe CAT / ES */}
          <div className="bg-[var(--bg-card-hover)] border border-[var(--border-subtle)] p-0.5 rounded-xl flex items-center h-[34px] text-xs font-medium">
            <button
              onClick={() => onLanguageChange('ca')}
              className={`h-full px-2.5 rounded-lg transition-all cursor-pointer flex items-center ${
                language === 'ca'
                  ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              CAT
            </button>
            <button
              onClick={() => onLanguageChange('es')}
              className={`h-full px-2.5 rounded-lg transition-all cursor-pointer flex items-center ${
                language === 'es'
                  ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              ES
            </button>
          </div>

          {/* Switch de Vistas: Targetes vs Cronograma */}
          <div className="bg-[var(--bg-card-hover)] border border-[var(--border-subtle)] p-0.5 rounded-xl flex items-center h-[34px] text-xs font-medium">
            <button
              onClick={() => onViewChange('timeline')}
              className={`h-full px-2.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                currentView === 'timeline'
                  ? 'bg-[#2997FF] text-white shadow-sm font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
              title={t.viewTimeline}
            >
              <CalendarRange className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.viewTimeline}</span>
            </button>
            <button
              onClick={() => onViewChange('cards')}
              className={`h-full px-2.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                currentView === 'cards'
                  ? 'bg-[#2997FF] text-white shadow-sm font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
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
            className="apple-press h-[34px] px-2.5 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 border border-orange-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Integración n8n Webhook"
          >
            <Zap className="w-3.5 h-3.5 text-orange-500" />
            <span>n8n</span>
          </button>

          {/* Botón de Acción Principal "Nueva Visita" */}
          <button
            onClick={onOpenScheduleModal}
            className="apple-press h-[34px] inline-flex items-center gap-1.5 px-3.5 rounded-xl bg-[#2997FF] hover:bg-[#0077ED] text-white text-xs sm:text-sm font-semibold shadow-[0_2px_12px_rgba(41,151,255,0.35)] cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>{t.newVisitBtn}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
