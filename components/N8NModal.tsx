'use client';

import React, { useState } from 'react';
import {
  X,
  Zap,
  Play,
  CheckCircle2,
  Copy,
  Check,
  Send,
  Building2,
  FlaskConical,
  FileCheck,
} from 'lucide-react';
import { Language, translations } from '../lib/i18n/translations';
import { VisitDTO } from '../lib/types';

interface N8NModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  latestVisit?: VisitDTO | null;
}

export const N8NModal: React.FC<N8NModalProps> = ({
  isOpen,
  onClose,
  language,
  latestVisit,
}) => {
  const t = translations[language];
  const [copied, setCopied] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [webhookUrl, setWebhookUrl] = useState('https://n8n.terrassa-lab.cat/webhook/qualitat-visites');

  if (!isOpen) return null;

  const mockPayload = {
    event: 'VISIT_SCHEDULED',
    timestamp: new Date().toISOString(),
    organization: 'Empresa Control Qualitat i Assajos de Materials Terrassa',
    isoStandard: 'ISO 9001:2015 - Procediment PNC-04',
    data: {
      visitId: latestVisit?.id || 'vis-sample-101',
      date: latestVisit?.date || new Date().toISOString().split('T')[0],
      startTime: latestVisit?.startTime || '09:00',
      endTime: latestVisit?.endTime || '10:30',
      technician: {
        id: latestVisit?.technicianId || 'tech-carlos',
        name: latestVisit?.technician?.name || 'Carlos Gómez',
        specialty: latestVisit?.technician?.specialty || 'Estructures i Fonamentacions',
      },
      site: {
        id: latestVisit?.siteId || 'site-sample',
        name: latestVisit?.site?.name || 'Residencial Monte Rozas',
        municipality: latestVisit?.site?.municipality || 'Terrassa',
      },
      labReservations: {
        facility: 'Laboratori Central Terrassa (Plaça de la Innovació 4)',
        curingChamberAssigned: 'CÀMBRA-HUMIDA-02',
        specimenType: 'Provetes cilíndriques de formigó 15x30 cm',
        scheduledTests: ['Rotura a 7 dies (UNE-EN 12390-3)', 'Rotura oficial a 28 dies'],
      },
    },
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(mockPayload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimulate = () => {
    setSimulating(true);
    setActiveStep(1);

    setTimeout(() => setActiveStep(2), 700);
    setTimeout(() => setActiveStep(3), 1400);
    setTimeout(() => setActiveStep(4), 2100);
    setTimeout(() => {
      setSimulating(false);
    }, 2800);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/70 backdrop-blur-md transition-opacity"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl bg-[#0F1116] border border-white/10 rounded-2xl shadow-2xl p-6 z-10 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EA580C]/20 border border-[#EA580C]/30 flex items-center justify-center text-[#EA580C]">
              <Zap className="w-5 h-5 text-[#FB923C]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-[#F5F5F7] tracking-tight">
                  {t.n8nTitle}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#EA580C]/15 text-[#FB923C] border border-[#EA580C]/30">
                  n8n Integration
                </span>
              </div>
              <p className="text-xs text-[#86868B]">{t.n8nSubtitle}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#86868B] hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Visual Workflow Steps (n8n Nodes) */}
        <div className="space-y-3">
          <span className="text-xs font-medium text-[#86868B] uppercase tracking-wider">
            Flux de Nodes Automatitzats
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
            {/* Node 1 */}
            <div
              className={`p-3 rounded-xl border transition-all text-xs flex flex-col justify-between h-28 ${
                activeStep >= 1
                  ? 'bg-[#EA580C]/10 border-[#EA580C]/50 text-white shadow-lg'
                  : 'bg-white/[0.02] border-white/[0.08] text-[#86868B]'
              }`}
            >
              <div className="flex items-center justify-between">
                <Zap className="w-4 h-4 text-[#FB923C]" />
                {activeStep >= 1 && <CheckCircle2 className="w-3.5 h-3.5 text-[#30D158]" />}
              </div>
              <div>
                <p className="font-semibold text-[11px] text-[#F5F5F7]">1. Webhook</p>
                <p className="text-[10px] text-[#86868B] mt-0.5">Disparador de Visita</p>
              </div>
            </div>

            {/* Node 2 */}
            <div
              className={`p-3 rounded-xl border transition-all text-xs flex flex-col justify-between h-28 ${
                activeStep >= 2
                  ? 'bg-blue-500/10 border-blue-500/50 text-white shadow-lg'
                  : 'bg-white/[0.02] border-white/[0.08] text-[#86868B]'
              }`}
            >
              <div className="flex items-center justify-between">
                <Send className="w-4 h-4 text-blue-400" />
                {activeStep >= 2 && <CheckCircle2 className="w-3.5 h-3.5 text-[#30D158]" />}
              </div>
              <div>
                <p className="font-semibold text-[11px] text-[#F5F5F7]">2. Telegram</p>
                <p className="text-[10px] text-[#86868B] mt-0.5">Avís Tècnic de Camp</p>
              </div>
            </div>

            {/* Node 3 */}
            <div
              className={`p-3 rounded-xl border transition-all text-xs flex flex-col justify-between h-28 ${
                activeStep >= 3
                  ? 'bg-purple-500/10 border-purple-500/50 text-white shadow-lg'
                  : 'bg-white/[0.02] border-white/[0.08] text-[#86868B]'
              }`}
            >
              <div className="flex items-center justify-between">
                <FlaskConical className="w-4 h-4 text-purple-400" />
                {activeStep >= 3 && <CheckCircle2 className="w-3.5 h-3.5 text-[#30D158]" />}
              </div>
              <div>
                <p className="font-semibold text-[11px] text-[#F5F5F7]">3. Lab Terrassa</p>
                <p className="text-[10px] text-[#86868B] mt-0.5">Reserva Càmera Provetes</p>
              </div>
            </div>

            {/* Node 4 */}
            <div
              className={`p-3 rounded-xl border transition-all text-xs flex flex-col justify-between h-28 ${
                activeStep >= 4
                  ? 'bg-emerald-500/10 border-emerald-500/50 text-white shadow-lg'
                  : 'bg-white/[0.02] border-white/[0.08] text-[#86868B]'
              }`}
            >
              <div className="flex items-center justify-between">
                <FileCheck className="w-4 h-4 text-emerald-400" />
                {activeStep >= 4 && <CheckCircle2 className="w-3.5 h-3.5 text-[#30D158]" />}
              </div>
              <div>
                <p className="font-semibold text-[11px] text-[#F5F5F7]">4. ERP ISO 9001</p>
                <p className="text-[10px] text-[#86868B] mt-0.5">Traçabilitat i Acta</p>
              </div>
            </div>
          </div>
        </div>

        {/* Webhook Endpoint Input */}
        <div className="space-y-1.5">
          <label className="text-xs text-[#86868B] flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-[#2997FF]" />
            {t.n8nWebhookUrl}
          </label>
          <input
            type="text"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#F5F5F7] font-mono focus:outline-none focus:border-[#2997FF]/60"
          />
        </div>

        {/* Payload JSON Inspector */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#86868B] uppercase tracking-wider">
              Payload JSON Transmès al Webhook
            </span>
            <button
              onClick={handleCopy}
              className="text-xs text-[#2997FF] hover:text-[#0077ED] flex items-center gap-1 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#30D158]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiat!' : 'Copiar JSON'}</span>
            </button>
          </div>

          <pre className="bg-black/60 border border-white/[0.08] rounded-xl p-3 text-[11px] text-[#A1A1AA] font-mono overflow-x-auto max-h-48 leading-relaxed">
            {JSON.stringify(mockPayload, null, 2)}
          </pre>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium bg-white/[0.05] hover:bg-white/[0.08] text-[#F5F5F7] transition-colors"
          >
            {t.cancelBtn}
          </button>

          <button
            onClick={handleSimulate}
            disabled={simulating}
            className="apple-press inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#EA580C] to-[#F97316] text-white text-xs font-medium shadow-[0_2px_12px_rgba(234,88,12,0.35)] disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 ${simulating ? 'animate-spin' : ''}`} />
            <span>{simulating ? 'Executant Workflow n8n...' : t.n8nSimulateBtn}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
