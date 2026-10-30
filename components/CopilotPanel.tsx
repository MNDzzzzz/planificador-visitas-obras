'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
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
  provider?: 'gemini' | 'local-rag';
  timestamp: string;
  isStreaming?: boolean;
}

interface CopilotPanelProps {
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
  onerror: (e: unknown) => void;
  start: () => void;
  stop: () => void;
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
  const [isVoiceCallActive, setIsVoiceCallActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcriptLive, setTranscriptLive] = useState('');
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const speechQueueRef = useRef<string[]>([]);
  const isSpeakingRef = useRef(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, transcriptLive]);

  // Manejo de síntesis de voz en cola continua (Chunked TTS)
  const processSpeechQueue = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (isSpeakingRef.current || speechQueueRef.current.length === 0) return;

    const nextSentence = speechQueueRef.current.shift();
    if (!nextSentence) return;

    // Limpiar markdown o etiquetas para locución limpia y natural
    const cleanSentence = nextSentence
      .replace(/[*#_`•]/g, ' ')
      .replace(/\[DOC-\d+.*?\]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanSentence) {
      processSpeechQueue();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanSentence);
    utterance.lang = language === 'ca' ? 'ca-ES' : 'es-ES';
    utterance.rate = 1.05;

    isSpeakingRef.current = true;
    setIsSpeaking(true);

    utterance.onend = () => {
      isSpeakingRef.current = false;
      setIsSpeaking(false);
      // Continuar con la siguiente frase en cola
      if (speechQueueRef.current.length > 0) {
        processSpeechQueue();
      } else if (isVoiceCallActive && recognitionRef.current) {
        // Al terminar de hablar todo, reanudar escucha activa
        try {
          recognitionRef.current.start();
        } catch {
          // ignore
        }
      }
    };

    utterance.onerror = () => {
      isSpeakingRef.current = false;
      setIsSpeaking(false);
      processSpeechQueue();
    };

    window.speechSynthesis.speak(utterance);
  };

  const queueSentenceForSpeech = (sentence: string) => {
    if (!sentence.trim()) return;
    speechQueueRef.current.push(sentence);
    processSpeechQueue();
  };

  // Inicialización de Reconocimiento de Voz
  const initSpeechRecognition = (onFinalTranscript: (text: string) => void) => {
    if (typeof window === 'undefined') return null;

    const SpeechRecognitionConstructor =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionInstance }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).webkitSpeechRecognition;

    if (!SpeechRecognitionConstructor) {
      alert('Tu navegador no soporta Web Speech API. Se recomienda Google Chrome o Edge.');
      return null;
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
          onFinalTranscript(transcript);
          setTranscriptLive('');
        }
      };

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);

      return recognition;
    } catch (e) {
      console.warn('Error inicializando SpeechRecognition:', e);
      return null;
    }
  };

  // Dictado puntual en el input
  const handleDictate = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = initSpeechRecognition((finalText) => {
      setInput((prev) => (prev ? `${prev} ${finalText}` : finalText));
    });

    if (recognition) {
      recognitionRef.current = recognition;
      try {
        recognition.start();
      } catch (err) {
        console.warn('Recognition start error:', err);
      }
    }
  };

  // Conmutar Modo Llamada Interactiva
  const toggleVoiceCall = () => {
    if (isVoiceCallActive) {
      setIsVoiceCallActive(false);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      speechQueueRef.current = [];
      isSpeakingRef.current = false;
      setIsListening(false);
      setIsSpeaking(false);
    } else {
      setIsVoiceCallActive(true);
      const recognition = initSpeechRecognition((finalText) => {
        handleSendMessage(finalText);
      });
      if (recognition) {
        recognitionRef.current = recognition;
        try {
          recognition.start();
        } catch (err) {
          console.warn('Recognition start error in call mode:', err);
        }
      }
    }
  };

  // Enviar mensaje con streaming en tiempo real (SSE) y Chunked TTS
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

    // Cancelar colas previas de voz si las hubiera
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    speechQueueRef.current = [];
    isSpeakingRef.current = false;

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
      let spokenUpToIndex = 0;
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
              if (parsed.sources) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsgId
                      ? { ...m, sources: parsed.sources, provider: parsed.provider }
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

                // Chunked Speech Synthesis en modo llamada: detectar fin de frase y locutar de inmediato
                if (isVoiceCallActive) {
                  const unvoicedText = streamedText.slice(spokenUpToIndex);
                  const sentenceMatch = unvoicedText.match(/([^\.?!:\n]+[\.?!:\n]+)/);
                  if (sentenceMatch && sentenceMatch[1].trim().length > 20) {
                    const sentenceToSpeak = sentenceMatch[1];
                    spokenUpToIndex += sentenceMatch.index! + sentenceToSpeak.length;
                    queueSentenceForSpeech(sentenceToSpeak);
                  }
                }
              }
            } catch {
              // ignore partial chunk json
            }
          }
        }
      }

      // Locutar cualquier remanente final no locutado en modo llamada
      if (isVoiceCallActive && streamedText.slice(spokenUpToIndex).trim()) {
        queueSentenceForSpeech(streamedText.slice(spokenUpToIndex));
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
          if (isVoiceCallActive) {
            queueSentenceForSpeech(res.data.answer);
          }
        }
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  text:
                    language === 'ca'
                      ? 'Error de connexió amb el copilot tècnic.'
                      : 'Error de conexión con el copiloto técnico.',
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

  const samplePrompts =
    language === 'ca'
      ? [
          'Com es fa l\'assaig del Con de Abrams?',
          'Com funciona la regla de 30 minuts de trasllat?',
          'Quin és el protocol de trencament a 28 dies?',
          'Quins EPIs són obligatoris a l\'obra?',
        ]
      : [
          '¿Cómo se realiza el ensayo del Cono de Abrams?',
          '¿Cómo funciona la regla de 30 min de traslado?',
          '¿Cuál es el protocolo de rotura a 28 días?',
          '¿Qué EPIs son obligatorios en obra?',
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
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-medium bg-[#2997FF]/10 text-[#2997FF] border border-[#2997FF]/25">
                Stream SSE
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] truncate">
              {language === 'ca' ? 'Assistent tècnic i normatiu' : 'Asistente técnico y normativo'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Botón de Llamada de Voz */}
          <button
            onClick={toggleVoiceCall}
            className={`apple-press px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
              isVoiceCallActive
                ? 'bg-rose-500 text-white border-rose-600 animate-pulse'
                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
            }`}
            title={isVoiceCallActive ? 'Finalizar llamada de voz' : 'Iniciar llamada de voz interactiva'}
          >
            {isVoiceCallActive ? (
              <>
                <PhoneOff className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{language === 'ca' ? 'Penjar' : 'Colgar'}</span>
              </>
            ) : (
              <>
                <Phone className="w-3.5 h-3.5" />
                <span>{language === 'ca' ? 'Trucada' : 'Llamada'}</span>
              </>
            )}
          </button>

          {/* Botón de Expansión en Móvil (< xl) */}
          <button
            onClick={() => setIsMobileExpanded((prev) => !prev)}
            className="xl:hidden p-1.5 rounded-xl border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
            title={isMobileExpanded ? 'Minimizar copilot' : 'Expandir copilot'}
          >
            {isMobileExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Banner de Estado de Llamada Activa con Ondas de Voz */}
      {isVoiceCallActive && (
        <div className="bg-gradient-to-r from-emerald-500/15 via-[#2997FF]/15 to-emerald-500/15 border-b border-emerald-500/30 px-3.5 py-2 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              {isSpeaking
                ? (language === 'ca' ? 'LabQA està parlant en veu alta...' : 'LabQA está hablando en voz alta...')
                : isListening
                ? (language === 'ca' ? 'Escoltant la teva veu...' : 'Escuchando tu voz...')
                : (language === 'ca' ? 'Llamada en curs (parla lliurement)' : 'Llamada en curso (habla libremente)')}
            </span>
          </div>
          {isSpeaking && <Volume2 className="w-4 h-4 text-emerald-500 animate-bounce" />}
        </div>
      )}

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
                  <p className="whitespace-pre-wrap">{msg.text}</p>

                  {/* Indicador de streaming activo */}
                  {msg.isStreaming && (
                    <span className="inline-block w-2 h-3.5 ml-1 bg-[#2997FF] animate-pulse align-middle" />
                  )}

                  {/* Fuentes / Citas Documentales */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-[var(--border-subtle)] space-y-1">
                      <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1">
                        <BookOpen className="w-3 h-3 text-[#2997FF]" />
                        <span>{language === 'ca' ? 'Normes i procediments' : 'Normas y procedimientos'}:</span>
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {msg.sources.map((s) => (
                          <span
                            key={s.id}
                            className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#2997FF]/10 text-[#2997FF] border border-[#2997FF]/25 truncate max-w-[240px]"
                            title={`${s.id}: ${s.title}`}
                          >
                            {s.id}: {s.title}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-1 flex items-center justify-between text-[10px] text-[var(--text-tertiary)] pt-0.5">
                    <span>{msg.timestamp}</span>
                    {msg.provider && (
                      <span className="font-mono text-[9px] uppercase font-semibold opacity-80">
                        {msg.provider === 'gemini' ? 'Gemini 3.5' : 'Base Local'}
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

          {/* Transcripción en vivo de voz */}
          {transcriptLive && (
            <div className="flex justify-end gap-2 text-xs">
              <div className="bg-[#2997FF]/20 border border-[#2997FF]/30 text-[var(--text-primary)] rounded-2xl px-3 py-2 italic animate-pulse">
                {transcriptLive}...
              </div>
            </div>
          )}

          {/* Loading inicial de token */}
          {loading && !messages.some((m) => m.isStreaming && m.text.length > 0) && (
            <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] pl-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#2997FF]" />
              <span>
                {language === 'ca'
                  ? 'Connectant amb Gemini 3.5 stream...'
                  : 'Conectando con Gemini 3.5 stream...'}
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Sugerencias Rápidas */}
        <div className="px-3 py-2 border-t border-[var(--border-subtle)] bg-[var(--bg-card-hover)] shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            {samplePrompts.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(prompt)}
                className="apple-press text-[11px] whitespace-nowrap px-2.5 py-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[#2997FF]/40 cursor-pointer transition-all"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Barra de Entrada (Input, Dictado y Enviar) */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="p-3 border-t border-[var(--border-subtle)] bg-[var(--bg-card)] flex items-center gap-2 shrink-0"
        >
          <button
            type="button"
            onClick={handleDictate}
            className={`min-hit-area p-2 rounded-xl border text-xs transition-all cursor-pointer shrink-0 flex items-center justify-center ${
              isListening
                ? 'bg-rose-500 text-white border-rose-600 animate-pulse'
                : 'bg-[var(--bg-card-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-[var(--border-subtle)]'
            }`}
            title={isListening ? 'Detener micrófono' : 'Dictar por voz'}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              isListening
                ? (language === 'ca' ? 'Escoltant la teva veu...' : 'Escuchando tu voz...')
                : (language === 'ca' ? 'Pregunta a la IA sobre formigons, obres...' : 'Pregunta a la IA sobre hormigón, obras...')
            }
            disabled={loading}
            className="flex-1 bg-[var(--bg-card-hover)] border border-[var(--border-subtle)] focus:border-[#2997FF] rounded-xl px-3 py-2 text-xs sm:text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none transition-all"
          />

          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="apple-press min-hit-area p-2 rounded-xl bg-[#2997FF] hover:bg-[#0077ED] disabled:opacity-40 disabled:hover:bg-[#2997FF] text-white transition-all cursor-pointer shrink-0 flex items-center justify-center"
            title="Enviar consulta"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </aside>
  );
};
