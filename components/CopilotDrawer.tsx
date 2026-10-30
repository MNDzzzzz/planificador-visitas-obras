'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  Sparkles,
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Bot,
  User,
  BookOpen,
  Volume2,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { askCopilotAction } from '../lib/actions/copilot';
import { Language, translations } from '../lib/i18n/translations';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  sources?: { id: string; title: string; category: string }[];
  provider?: 'gemini' | 'local-rag';
  timestamp: string;
}

interface CopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: {
    [key: number]: {
      [key: number]: {
        transcript: string;
      };
      isFinal: boolean;
    };
  };
}

interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: (event: SpeechRecognitionEvent) => void;
  onstart: () => void;
  onend: () => void;
  onerror: () => void;
  start: () => void;
  stop: () => void;
}

export const CopilotDrawer: React.FC<CopilotDrawerProps> = ({
  isOpen,
  onClose,
  language,
}) => {
  const t = translations[language];
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text:
        language === 'ca'
          ? 'Hola! Sóc LabQA Copilot, el teu assistent tècnic de control de qualitat i assajos de materials al laboratori de Terrassa. Com et puc ajudar amb la normativa, formigons, geotècnia o la planificació d\'avui?'
          : '¡Hola! Soy LabQA Copilot, tu asistente técnico de control de calidad y ensayos de materiales del laboratorio de Terrassa. ¿En qué puedo ayudarte con la normativa, hormigones, geotecnia o la planificación de hoy?',
      timestamp: 'Ahora',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isVoiceCallActive, setIsVoiceCallActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcriptLive, setTranscriptLive] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, transcriptLive]);

  // Manejo de síntesis de voz (Text to Speech)
  const speakText = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    // Limpiar markdown o etiquetas para lectura natural
    const cleanText = text.replace(/[*#_`•]/g, '').slice(0, 300);
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = language === 'ca' ? 'ca-ES' : 'es-ES';
    utterance.rate = 1.05;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      // Si la llamada sigue activa, reanudar escucha tras hablar
      if (isVoiceCallActive && recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch {
          // ignore
        }
      }
    };
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  // Inicialización de Reconocimiento de Voz (Speech to Text)
  const startListening = () => {
    if (typeof window === 'undefined') return;

    const SpeechRecognitionConstructor =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionInstance }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).webkitSpeechRecognition;

    if (!SpeechRecognitionConstructor) {
      alert('Tu navegador no soporta Web Speech API. Te recomendamos usar Google Chrome o Edge.');
      return;
    }

    try {
      const recognition = new SpeechRecognitionConstructor();
      recognition.lang = language === 'ca' ? 'ca-ES' : 'es-ES';
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const current = event.resultIndex;
        const transcript = event.results[current][0].transcript;
        setTranscriptLive(transcript);

        if (event.results[current].isFinal) {
          handleSendMessage(transcript);
          setTranscriptLive('');
        }
      };

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => {
        setIsListening(false);
      };
      recognition.onerror = () => setIsListening(false);

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.warn('Error iniciando SpeechRecognition:', e);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    setIsListening(false);
  };

  // Conmutar Modo Llamada
  const toggleVoiceCall = () => {
    if (isVoiceCallActive) {
      setIsVoiceCallActive(false);
      stopListening();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsSpeaking(false);
    } else {
      setIsVoiceCallActive(true);
      startListening();
    }
  };

  // Enviar mensaje al RAG Copilot
  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await askCopilotAction(query, language);
      if (res.success && res.data) {
        const botMsg: Message = {
          id: `bot-${Date.now()}`,
          sender: 'assistant',
          text: res.data.answer,
          sources: res.data.sources,
          provider: res.data.provider,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, botMsg]);

        // Si la llamada está activa, hablar la respuesta
        if (isVoiceCallActive) {
          speakText(res.data.answer);
        }
      } else {
        const errorMsg: Message = {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          text: res.error || 'Lo sentimos, hubo un problema técnico consultando el laboratorio.',
          timestamp: 'Ahora',
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          text: 'Error de red contactando al asistente de calidad.',
          timestamp: 'Ahora',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-lg bg-[#0E1015] border-l border-white/10 shadow-2xl flex flex-col h-full z-10 transition-transform duration-200 ease-out">
        {/* Drawer Header */}
        <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#2997FF]/20 to-[#A855F7]/20 border border-white/10 flex items-center justify-center text-[#2997FF]">
              <Sparkles className="w-5 h-5 text-[#2997FF]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-[#F5F5F7] tracking-tight">
                  LabQA Copilot
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#A855F7]/15 text-[#C084FC] border border-[#A855F7]/25">
                  Gemini RAG
                </span>
              </div>
              <p className="text-xs text-[#86868B]">{t.copilotSubtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Botón de Llamada de Voz con IA */}
            <button
              onClick={toggleVoiceCall}
              title={isVoiceCallActive ? t.copilotVoiceStop : t.copilotVoiceStart}
              className={`apple-press px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-all ${
                isVoiceCallActive
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                  : 'bg-white/[0.04] hover:bg-white/[0.08] text-[#F5F5F7] border-white/10'
              }`}
            >
              {isVoiceCallActive ? (
                <>
                  <PhoneOff className="w-3.5 h-3.5 text-rose-400" />
                  <span>Colgar</span>
                </>
              ) : (
                <>
                  <Phone className="w-3.5 h-3.5 text-[#30D158]" />
                  <span className="hidden sm:inline">Llamada</span>
                </>
              )}
            </button>

            {/* Cerrar Drawer */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#86868B] hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Voice Call Active Banner (Apple Intelligence Siri Style) */}
        {isVoiceCallActive && (
          <div className="px-4 py-3 bg-gradient-to-r from-[#2997FF]/10 via-[#A855F7]/15 to-[#30D158]/10 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center">
                <span className="absolute w-6 h-6 rounded-full bg-[#2997FF]/30 animate-ping" />
                <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-[#2997FF] to-[#30D158] flex items-center justify-center">
                  <Volume2 className="w-2.5 h-2.5 text-black" />
                </div>
              </div>
              <div className="text-xs">
                <p className="font-medium text-white">
                  {isSpeaking
                    ? t.copilotVoiceSpeaking
                    : isListening
                    ? t.copilotVoiceListening
                    : t.copilotVoiceActive}
                </p>
                {transcriptLive && (
                  <p className="text-[11px] text-[#2997FF] italic truncate max-w-xs">
                    &ldquo;{transcriptLive}&rdquo;
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={isListening ? stopListening : startListening}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              {isListening ? (
                <Mic className="w-4 h-4 text-[#30D158]" />
              ) : (
                <MicOff className="w-4 h-4 text-[#86868B]" />
              )}
            </button>
          </div>
        )}

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.sender === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div
                className={`flex items-start gap-2.5 max-w-[88%] ${
                  msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs shrink-0 ${
                    msg.sender === 'user'
                      ? 'bg-[#2997FF] text-white'
                      : 'bg-white/[0.08] text-[#2997FF] border border-white/10'
                  }`}
                >
                  {msg.sender === 'user' ? (
                    <User className="w-3.5 h-3.5" />
                  ) : (
                    <Bot className="w-3.5 h-3.5" />
                  )}
                </div>

                <div
                  className={`rounded-2xl px-4 py-2.5 text-xs sm:text-[13px] leading-relaxed shadow-sm ${
                    msg.sender === 'user'
                      ? 'bg-[#2997FF] text-white rounded-br-sm'
                      : 'bg-white/[0.04] text-[#E5E5EA] border border-white/[0.08] rounded-bl-sm'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.text}</div>

                  {/* Citas de Fuentes Documentales (RAG) */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-white/10 flex flex-wrap gap-1.5">
                      <span className="text-[10px] text-[#86868B] flex items-center gap-1">
                        <BookOpen className="w-3 h-3 text-[#2997FF]" />
                        {language === 'ca' ? 'Fonts:' : 'Fuentes:'}
                      </span>
                      {msg.sources.map((s) => (
                        <span
                          key={s.id}
                          className="px-2 py-0.5 rounded text-[10px] bg-white/[0.05] border border-white/[0.08] text-[#86868B]"
                          title={s.title}
                        >
                          {s.id}: {s.category}
                        </span>
                      ))}
                      {msg.provider === 'gemini' && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-0.5">
                          <CheckCircle2 className="w-2.5 h-2.5" /> Gemini
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <span className="text-[10px] text-[#515154] mt-1 px-1">
                {msg.timestamp}
              </span>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-[#86868B] bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2 w-fit">
              <Loader2 className="w-3.5 h-3.5 text-[#2997FF] animate-spin" />
              <span>
                {language === 'ca'
                  ? 'Consultant documents de Terrassa Lab...'
                  : 'Consultando documentos de Terrassa Lab...'}
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompts Bar */}
        <div className="px-4 py-2 border-t border-white/[0.05] bg-white/[0.01] flex gap-1.5 overflow-x-auto text-[11px] text-[#86868B] no-scrollbar">
          <button
            onClick={() =>
              handleSendMessage(
                language === 'ca'
                  ? 'Com es fa l\'assaig de con d\'Abrams segons UNE-EN 12350-2?'
                  : '¿Cómo se realiza el ensayo de cono de Abrams según UNE-EN 12350-2?'
              )
            }
            className="px-2.5 py-1 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-nowrap transition-colors"
          >
            📏 Con d&apos;Abrams
          </button>
          <button
            onClick={() =>
              handleSendMessage(
                language === 'ca'
                  ? 'Què passa si la proveta no dóna la resistència a 7 dies?'
                  : '¿Qué pasa si la probeta no da la resistencia a 7 días?'
              )
            }
            className="px-2.5 py-1 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-nowrap transition-colors"
          >
            🧪 Provetes 7 dies
          </button>
          <button
            onClick={() =>
              handleSendMessage(
                language === 'ca'
                  ? 'Com funciona la regla de 30 minuts de trasllat a Terrassa?'
                  : '¿Cómo funciona la regla de 30 minutos de traslado en Terrassa?'
              )
            }
            className="px-2.5 py-1 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-nowrap transition-colors"
          >
            🚗 Marge 30 min
          </button>
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-white/[0.08] bg-[#0E1015]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t.copilotPlaceholder}
              disabled={loading}
              className="flex-1 bg-white/[0.04] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#F5F5F7] placeholder-[#515154] focus:outline-none focus:border-[#2997FF]/60 transition-colors"
            />

            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="apple-press p-2.5 rounded-xl bg-[#2997FF] hover:bg-[#0077ED] disabled:opacity-40 disabled:pointer-events-none text-white transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
