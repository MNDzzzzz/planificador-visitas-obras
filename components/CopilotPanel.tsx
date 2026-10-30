'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Sparkles,
  Bot,
  User,
  BookOpen,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { askCopilotAction } from '../lib/actions/copilot';
import { Language, translations } from '../lib/i18n/translations';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  sources?: { id: string; title: string; category: string }[];
  provider?: 'gemini' | 'local-rag' | 'cache';
  timestamp: string;
  isStreaming?: boolean;
}

interface CopilotPanelProps {
  language: Language;
}

/**
 * Renderiza tokens inline (negrita, código mono, citas documentales [DOC-xx])
 */
function renderInlineTokens(text: string, prefix: string): React.ReactNode[] {
  const regex = /(\*\*.*?\*\*|`.*?`|\[DOC-\d+\])/g;
  const parts = text.split(regex);

  return parts.map((part, idx) => {
    const key = `${prefix}-${idx}`;
    if (!part) return null;

    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <strong key={key} className="font-semibold text-[var(--text-primary)]">
          {part.slice(2, -2)}
        </strong>
      );
    }

    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code
          key={key}
          className="px-1.5 py-0.5 rounded text-[11px] font-mono bg-white/[0.06] text-[#2997FF] border border-[var(--border-subtle)]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    if (/^\[DOC-\d+\]$/.test(part)) {
      return (
        <span
          key={key}
          className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold bg-[#2997FF]/15 text-[#2997FF] border border-[#2997FF]/30 mx-0.5 align-baseline shadow-xs"
        >
          {part}
        </span>
      );
    }

    return <span key={key}>{part}</span>;
  });
}

/**
 * Renderizador de Markdown enriquecido para respuestas técnicas del Copilot (Apple Design System)
 */
function renderFormattedMessage(text: string) {
  if (!text) return null;
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      elements.push(<div key={`blank-${i}`} className="h-1.5" />);
      continue;
    }

    // Encabezados Markdown (###, ##, #)
    if (trimmed.startsWith('### ') || trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
      const headingText = trimmed.replace(/^#+\s*/, '');
      elements.push(
        <h4
          key={`h-${i}`}
          className="text-xs sm:text-[13px] font-bold text-[var(--text-primary)] tracking-[-0.015em] mt-2.5 mb-1 pb-1 border-b border-[var(--border-subtle)] flex items-center gap-1.5"
        >
          {renderInlineTokens(headingText, `h-${i}`)}
        </h4>
      );
      continue;
    }

    // Listas con viñeta (•, -, *)
    if (trimmed.startsWith('• ') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const itemText = trimmed.replace(/^[•\-*]\s*/, '');
      elements.push(
        <div
          key={`bullet-${i}`}
          className="flex items-start gap-2 my-0.5 pl-0.5 text-xs sm:text-[13px] leading-relaxed text-[var(--text-primary)]"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#2997FF] mt-1.5 shrink-0" />
          <div className="flex-1 min-w-0">{renderInlineTokens(itemText, `b-${i}`)}</div>
        </div>
      );
      continue;
    }

    // Listas numeradas (1., 2., etc.)
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      const num = numMatch[1];
      const itemText = numMatch[2];
      elements.push(
        <div
          key={`num-${i}`}
          className="flex items-start gap-2 my-0.5 pl-0.5 text-xs sm:text-[13px] leading-relaxed text-[var(--text-primary)]"
        >
          <span className="text-[11px] font-bold text-[#2997FF] font-mono shrink-0 tabular-nums mt-0.5">
            {num}.
          </span>
          <div className="flex-1 min-w-0">{renderInlineTokens(itemText, `n-${i}`)}</div>
        </div>
      );
      continue;
    }

    // Párrafo estándar
    elements.push(
      <p key={`p-${i}`} className="text-xs sm:text-[13px] leading-relaxed text-[var(--text-primary)] my-0.5">
        {renderInlineTokens(line, `p-${i}`)}
      </p>
    );
  }

  return <div className="space-y-0.5">{elements}</div>;
}

export const CopilotPanel: React.FC<CopilotPanelProps> = ({ language }) => {
  const t = translations[language];
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text:
        language === 'ca'
          ? 'Hola! Sóc LabQA Copilot, el teu assistent tècnic de control de qualitat i assajos de materials. Com et puc ajudar amb el formigó, geotecnia, acústica, EPIs o la planificació?'
          : '¡Hola! Soy LabQA Copilot, tu asistente técnico de control de calidad y ensayos de materiales. ¿En qué puedo ayudarte con el hormigón, geotecnia, acústica, EPIs o la planificación?',
      timestamp: 'Ahora',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Enviar mensaje con streaming en tiempo real (SSE) y fallback a Server Action
  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const assistantMsgId = `bot-${Date.now()}`;
    const initialAssistantMsg: Message = {
      id: assistantMsgId,
      sender: 'assistant',
      text: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMsg, initialAssistantMsg]);
    setInput('');
    setLoading(true);

    try {
      // 1. Conexión con Endpoint de Streaming SSE
      const response = await fetch('/api/copilot/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, language }),
      });

      if (!response.ok || !response.body) {
        throw new Error('Fallback to Server Action');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let streamedText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.slice(6).trim();
            if (dataStr === '[DONE]') {
              continue;
            }

            try {
              const parsed = JSON.parse(dataStr);

              // Metadatos iniciales (fuentes y proveedor)
              if (parsed.sources !== undefined || parsed.provider) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsgId
                      ? {
                          ...m,
                          sources: Array.isArray(parsed.sources) && parsed.sources.length > 0 ? parsed.sources : m.sources,
                          provider: parsed.provider || m.provider,
                        }
                      : m
                  )
                );
              }

              // Fragmento de texto streaming
              if (parsed.text) {
                streamedText += parsed.text;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsgId
                      ? { ...m, text: streamedText, isStreaming: true }
                      : m
                  )
                );
              }
            } catch {
              // ignore partial chunk json
            }
          }
        }
      }

      // Marcar streaming como finalizado
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantMsgId ? { ...m, isStreaming: false } : m))
      );
    } catch {
      // Fallback a Server Action en caso de desconexión SSE
      try {
        const res = await askCopilotAction(query, language);
        if (res.success && res.data) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? {
                    ...m,
                    text: res.data!.answer,
                    sources: res.data!.sources,
                    provider: res.data!.provider,
                    isStreaming: false,
                  }
                : m
            )
          );
        } else {
          // Si no devolvió datos pero teníamos algo en stream, no pisar con error
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? {
                    ...m,
                    text: m.text || (language === 'ca'
                      ? 'No s\'ha pogut completar la resposta en aquest moment. Si us plau, torna-ho a provar.'
                      : 'No se pudo completar la respuesta en este momento. Por favor, inténtalo de nuevo.'),
                    isStreaming: false,
                  }
                : m
            )
          );
        }
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  text: m.text || (language === 'ca'
                    ? 'No s\'ha pogut connectar amb el copilot tècnic en aquest moment.'
                    : 'No se pudo conectar con el copiloto técnico en este momento.'),
                  isStreaming: false,
                }
              : m
          )
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const samplePrompts: { label: string; query: string }[] =
    language === 'ca'
      ? [
          { label: '💡 /help (Guia del sistema i roadmap)', query: '/help' },
          {
            label: 'Com es gestiona el temps mínim de trasllat entre obres?',
            query: 'Com es gestiona el temps mínim de trasllat entre obres?',
          },
          {
            label: 'Quin és el protocol de presa de provetes de formigó a 28 dies?',
            query: 'Quin és el protocol de presa de provetes de formigó a 28 dies?',
          },
          {
            label: "Com es fa l'assaig del Con d'Abrams?",
            query: "Com es fa l'assaig del Con d'Abrams?",
          },
          {
            label: 'Quins EPIs són obligatoris per a la inspecció?',
            query: 'Quins EPIs són obligatoris per a la inspecció?',
          },
        ]
      : [
          { label: '💡 /help (Guía del sistema y roadmap)', query: '/help' },
          {
            label: '¿Cómo se gestiona el tiempo mínimo de traslado entre obras?',
            query: '¿Cómo se gestiona el tiempo mínimo de traslado entre obras?',
          },
          {
            label: '¿Cuál es el protocolo de toma de probetas de hormigón a 28 días?',
            query: '¿Cuál es el protocolo de toma de probetas de hormigón a 28 días?',
          },
          {
            label: '¿Cómo se realiza el ensayo del Cono de Abrams?',
            query: '¿Cómo se realiza el ensayo del Cono de Abrams?',
          },
          {
            label: '¿Qué EPIs son obligatorios para la inspección?',
            query: '¿Qué EPIs son obligatorios para la inspección?',
          },
        ];

  return (
    <aside
      className="w-full flex flex-col rounded-[22px] border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-lg overflow-hidden transition-all duration-200"
      style={{
        height: isMobileExpanded ? '640px' : undefined,
        maxHeight: '920px',
      }}
    >
      {/* Cabecera del Panel con toggle en móvil */}
      <div className="px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-card-hover)] flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#2997FF]/20 via-[#A855F7]/15 to-[#30D158]/20 border border-[var(--border-subtle)] flex items-center justify-center text-[#2997FF] shrink-0">
            <Sparkles className="w-4 h-4 text-[#2997FF]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="text-sm font-bold tracking-tight text-[var(--text-primary)] truncate">
                LabQA Copilot
              </h2>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] truncate">
              {t.copilotSubtitle}
            </p>
          </div>
        </div>

        {/* Botón de Expansión en Móvil (< xl) */}
        <button
          onClick={() => setIsMobileExpanded((prev) => !prev)}
          className="xl:hidden p-1.5 rounded-xl border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
          title={isMobileExpanded ? 'Minimizar copilot' : 'Expandir copilot'}
        >
          {isMobileExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Contenido colapsable en móvil / siempre abierto en desktop */}
      <div className={`flex-1 flex-col overflow-hidden ${isMobileExpanded ? 'flex' : 'hidden xl:flex'}`}>
        {/* Lista de Mensajes con Scroll */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 text-xs sm:text-sm">
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#2997FF]/25 to-[#A855F7]/25 border border-[var(--border-subtle)] flex items-center justify-center text-[#2997FF] shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}

                <div
                  className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 shadow-sm leading-relaxed ${
                    isUser
                      ? 'bg-[#2997FF] text-white font-medium rounded-tr-none'
                      : 'bg-[var(--bg-card-hover)] border border-[var(--border-subtle)] text-[var(--text-primary)] rounded-tl-none'
                  }`}
                >
                  {isUser ? (
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  ) : (
                    renderFormattedMessage(msg.text)
                  )}

                  {/* Indicador de streaming activo */}
                  {msg.isStreaming && (
                    <span className="inline-block w-2 h-3.5 ml-1 bg-[#2997FF] animate-pulse align-middle" />
                  )}

                  {/* Fuentes / Citas Documentales (solo si existen fuentes válidas) */}
                  {Array.isArray(msg.sources) && msg.sources.filter(Boolean).length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-[var(--border-subtle)] space-y-1.5">
                      <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1">
                        <BookOpen className="w-3 h-3 text-[#2997FF]" />
                        <span>{t.copilotStandardsTitle}</span>
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.sources.filter(Boolean).map((s) => (
                          <span
                            key={s.id}
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#2997FF]/10 text-[#2997FF] border border-[#2997FF]/25 shadow-xs"
                            title={`${s.id}: ${s.title}`}
                          >
                            <span className="font-mono font-semibold">{s.id}</span>
                            <span className="text-[var(--text-tertiary)] opacity-60">•</span>
                            <span className="truncate max-w-[220px] text-[var(--text-primary)]">{s.title}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-1.5 flex items-center justify-between text-[10px] text-[var(--text-tertiary)] pt-0.5">
                    <span>{msg.timestamp}</span>
                    {msg.provider && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-medium bg-white/[0.04] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                        {msg.provider === 'gemini'
                          ? 'Gemini 2.5'
                          : msg.provider === 'cache'
                          ? language === 'ca'
                            ? 'Caché Semàntica'
                            : 'Caché Semántica'
                          : 'Base Local'}
                      </span>
                    )}
                  </div>
                </div>

                {isUser && (
                  <div className="w-7 h-7 rounded-xl bg-[var(--bg-card-hover)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-primary)] shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            );
          })}

          {/* Loading inicial de token */}
          {loading && !messages.some((m) => m.isStreaming && m.text.length > 0) && (
            <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] pl-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#2997FF]" />
              <span>{t.copilotConnecting}</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Sugerencias Rápidas */}
        <div className="px-3 py-2 border-t border-[var(--border-subtle)] bg-[var(--bg-card-hover)] shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            {samplePrompts.map((item, idx) => {
              const isHelp = item.query === '/help';
              return (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(item.query)}
                  className={`apple-press text-[11px] whitespace-nowrap px-2.5 py-1 rounded-lg border cursor-pointer transition-all ${
                    isHelp
                      ? 'bg-[#2997FF]/10 border-[#2997FF]/35 text-[#2997FF] font-medium hover:bg-[#2997FF]/20 hover:border-[#2997FF]/50 shadow-xs'
                      : 'bg-[var(--bg-card)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[#2997FF]/40'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Barra de Entrada (Input de texto y Enviar) */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="p-3 border-t border-[var(--border-subtle)] bg-[var(--bg-card)] flex items-center gap-2 shrink-0"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t.copilotPlaceholder}
            disabled={loading}
            className="flex-1 bg-[var(--bg-card-hover)] border border-[var(--border-subtle)] focus:border-[#2997FF] rounded-xl px-3 py-2.5 text-xs sm:text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none transition-all"
          />

          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="apple-press min-hit-area p-2.5 rounded-xl bg-[#2997FF] hover:bg-[#0077ED] disabled:opacity-40 disabled:hover:bg-[#2997FF] text-white transition-all cursor-pointer shrink-0 flex items-center justify-center shadow-sm"
            title="Enviar consulta"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </aside>
  );
};
