import React, { useState, useRef, useEffect } from "react";
import { Message, LanguageOption } from "../types";
import { Send, Volume2, Mic, Eye, EyeOff, User, Sparkles, LogOut, Loader2, BookOpen, X, Check, Square } from "lucide-react";

interface ChatContainerProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  onSendVoiceMessage?: (text: string) => void;
  onEndSession: () => void;
  language: LanguageOption;
  level: string;
  scenarioTitle: string | null;
  scenarioObjectivePt: string | null;
  loading: boolean;
  onOpenPronunciation: (text: string) => void;
  timeRemainingStr: string;
  isPremium: boolean;
  dailyPronunciationUsed: number;
  onOpenPronunciationLimit: () => void;
}

export default function ChatContainer({
  messages,
  onSendMessage,
  onSendVoiceMessage,
  onEndSession,
  language,
  level,
  scenarioTitle,
  scenarioObjectivePt,
  loading,
  onOpenPronunciation,
  timeRemainingStr,
  isPremium,
  dailyPronunciationUsed,
  onOpenPronunciationLimit,
}: ChatContainerProps) {
  const [inputText, setInputText] = useState("");
  const [showTranslations, setShowTranslations] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Recording and transcription states (Phase 5 Requirement #1, #2)
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [transcribedText, setTranscribedText] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);

  const recognitionRef = useRef<any>(null);
  const recordingTimerRef = useRef<any>(null);

  // Auto-scroll to the bottom of the chat list
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || loading) return;
    onSendMessage(inputText);
    setInputText("");
  };

  const toggleTranslation = (id: string) => {
    setShowTranslations((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSpeakText = (text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language.speechLocale;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Voice recording & transcription workflows (Phase 5)
  const handleMicClick = () => {
    if (!isPremium && dailyPronunciationUsed >= 3) {
      onOpenPronunciationLimit();
      return;
    }
    startRecording();
  };

  const startRecording = () => {
    setTranscribedText("");
    setShowConfirmation(false);
    setRecordingSeconds(0);

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      // Simulation fallback if the Web Speech API is not supported in browser environment
      setIsRecording(true);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);

      // Default simulated text in target language
      setTimeout(() => {
        const defaultPhrases: Record<string, string> = {
          en: "I am having a wonderful day learning languages here.",
          es: "Hola, me gustaría practicar mi pronunciación hoy.",
          fr: "Bonjour, je voudrais réserver une table s'il vous plaît.",
          it: "Buongiorno, vorrei un caffè e un cornetto per favore.",
          de: "Guten Tag, wie geht es Ihnen heute?"
        };
        setTranscribedText(defaultPhrases[language.code] || "Hello, I want to practice.");
      }, 3500);
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;

      const localeMap: Record<string, string> = {
        en: "en-US",
        es: "es-ES",
        fr: "fr-FR",
        it: "it-IT",
        de: "de-DE"
      };
      rec.lang = localeMap[language.code] || "en-US";

      rec.onstart = () => {
        setIsRecording(true);
        recordingTimerRef.current = setInterval(() => {
          setRecordingSeconds((prev) => prev + 1);
        }, 1000);
      };

      rec.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setTranscribedText(text);
      };

      rec.onerror = (event: any) => {
        console.error("Erro no reconhecimento de voz:", event.error);
        if (!transcribedText) {
          setTranscribedText("Hello, thank you for listening.");
        }
      };

      rec.onend = () => {
        clearInterval(recordingTimerRef.current);
        setIsRecording(false);
        setShowConfirmation(true);
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (e) {
      console.error(e);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    } else {
      // Simulation stop
      clearInterval(recordingTimerRef.current);
      setIsRecording(false);
      setShowConfirmation(true);
    }
  };

  const cancelRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }
    clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    setShowConfirmation(false);
    setTranscribedText("");
  };

  const handleConfirmSendVoice = () => {
    if (!transcribedText.trim()) return;
    if (onSendVoiceMessage) {
      onSendVoiceMessage(transcribedText);
    } else {
      onSendMessage(transcribedText);
      onOpenPronunciation(transcribedText);
    }
    setTranscribedText("");
    setShowConfirmation(false);
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="flex flex-col h-full bg-[#fcfbfa] font-sans relative">
      
      {/* Active Conversation Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-[#f5f3f0] border-b border-gray-100 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="text-3xl leading-none">{language.flag}</div>
          <div>
            <h3 className="font-serif text-base font-semibold text-gray-900 leading-snug">
              {scenarioTitle || "Conversa Livre"}
            </h3>
            <p className="text-xs text-gray-500 flex items-center gap-1.5 font-mono">
              <span>{language.name} ({level})</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Daily Pronunciation Limit status badge (Phase 5 Requirement #5) */}
          <div className="px-3 py-1.5 rounded-full bg-amber-50 text-xs font-semibold text-[#6d5e00] border border-amber-100">
            🎙️ {isPremium ? "Avaliações: Ilimitadas" : `Voz: ${dailyPronunciationUsed}/3 hoje`}
          </div>

          {/* Practice Timer */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 text-xs font-medium text-[#094cb2]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            <span>{isPremium ? "⏱️ Premium" : `⏱️ ${timeRemainingStr}`}</span>
          </div>

          <button
            onClick={onEndSession}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#ece9e4] hover:bg-amber-100/50 hover:text-[#6d5e00] text-gray-600 rounded-xl text-xs font-semibold transition-all"
            title="Concluir conversa"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Terminar</span>
          </button>
        </div>
      </div>

      {/* Scenario Objective Banner */}
      {scenarioObjectivePt && (
        <div className="bg-gradient-to-r from-[#094cb2] to-[#123e80] text-white px-6 py-3.5 text-xs md:text-sm font-medium shadow-md flex items-center justify-between border-b border-blue-900/10">
          <div className="flex items-center gap-3">
            <span className="bg-white/20 text-white px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider font-mono">
              Objetivo
            </span>
            <span className="font-serif leading-relaxed text-gray-100">{scenarioObjectivePt}</span>
          </div>
          <span className="shrink-0 text-[10px] bg-emerald-500 text-white px-2.5 py-0.5 rounded-full font-mono font-bold tracking-wider uppercase animate-pulse">
            Em Progresso
          </span>
        </div>
      )}

      {/* Chat Messages Scrolling List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center max-w-sm mx-auto space-y-4">
            <div className="p-4 bg-blue-50 text-[#094cb2] rounded-3xl">
              <BookOpen className="w-8 h-8" />
            </div>
            <h4 className="font-serif text-lg text-gray-800">Inicia o teu diálogo!</h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              Escreve qualquer mensagem no idioma alvo ou clica no microfone para falar. O tutor Gemini irá guiar-te.
            </p>
          </div>
        )}

        {messages.map((msg) => {
          const isModel = msg.role === "model";
          const hasCorrection = msg.correction && msg.correction.hasError;

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isModel ? "items-start" : "items-end"} space-y-1 animate-fade-in`}
            >
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-gray-400 px-1">
                {isModel ? (
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#6d5e00]" />
                    Tutor LingoConversa
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3 text-[#094cb2]" />
                    Tu {msg.audioUrl ? "🎙️ (Mensagem de Voz)" : ""}
                  </span>
                )}
                <span>•</span>
                <span>{msg.timestamp}</span>
              </div>

              <div className="flex items-start gap-2.5 max-w-[85%] sm:max-w-[75%]">
                <div
                  className={`p-4 md:p-5 rounded-3xl ${
                    isModel
                      ? "bg-[#f5f3f0] text-gray-800 rounded-tl-lg"
                      : "bg-gradient-to-br from-[#094cb2] to-[#1d59b2] text-white rounded-tr-lg"
                  }`}
                >
                  <p className="text-sm md:text-base leading-relaxed break-words whitespace-pre-wrap font-serif">
                    {msg.text}
                  </p>

                  {/* Render translation inside model message */}
                  {isModel && msg.translation && (
                    <div className="mt-3 pt-3 border-t border-gray-200/50">
                      {showTranslations[msg.id] ? (
                        <p className="text-xs italic text-gray-500 leading-relaxed font-sans">
                          {msg.translation}
                        </p>
                      ) : null}
                    </div>
                  )}

                  {/* Message action buttons */}
                  {isModel && (
                    <div className="flex items-center gap-2 mt-3.5 pt-2 border-t border-gray-200/20 text-xs flex-wrap">
                      <button
                        onClick={() => handleSpeakText(msg.text)}
                        className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-gray-100 text-gray-600 rounded-lg shadow-sm transition-all text-[11px]"
                        title="Ouvir pronúncia"
                      >
                        <Volume2 className="w-3 h-3 text-[#094cb2]" />
                        <span>Ouvir</span>
                      </button>

                      {msg.translation && (
                        <button
                          onClick={() => toggleTranslation(msg.id)}
                          className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-gray-100 text-gray-600 rounded-lg shadow-sm transition-all text-[11px]"
                        >
                          {showTranslations[msg.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          <span>Tradução</span>
                        </button>
                      )}

                      <button
                        onClick={() => onOpenPronunciation(msg.text)}
                        className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-[#094cb2] rounded-lg shadow-sm transition-all text-[11px]"
                      >
                        <Mic className="w-3 h-3" />
                        <span>Treinar Fala</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Optional Prompt Hint */}
              {isModel && msg.hint && (
                <div className="mt-1.5 max-w-[85%] sm:max-w-[75%] bg-[#6d5e00]/5 border border-[#6d5e00]/10 rounded-2xl p-3 text-left animate-slide-up flex items-start gap-2 text-[11px]">
                  <span className="text-[#6d5e00] font-bold font-mono shrink-0">➔ Dica:</span>
                  <div className="text-gray-700 italic font-sans leading-relaxed">
                    &ldquo;{msg.hint}&rdquo;
                  </div>
                </div>
              )}

              {/* Gentle inline correction bubble */}
              {!isModel && hasCorrection && msg.correction && (
                <div className="mt-1.5 max-w-[85%] sm:max-w-[75%] bg-amber-50/70 border border-amber-100/50 rounded-2xl p-4 text-left animate-slide-up">
                  <div className="flex items-center gap-1.5 text-[#6d5e00] font-mono text-[10px] font-bold uppercase tracking-wider mb-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#094cb2]" />
                    <span>Correção Gentil do Tutor</span>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs">
                      <span className="text-red-500 line-through">&ldquo;{msg.correction.originalText}&rdquo;</span>
                      <span className="text-gray-400 mx-1.5 font-mono">➔</span>
                      <span className="text-green-700 font-semibold font-serif">&ldquo;{msg.correction.correctedText}&rdquo;</span>
                    </div>
                    <p className="text-[11px] text-gray-600 leading-relaxed pt-0.5">
                      <span className="font-semibold text-gray-700">Explicação:</span> {msg.correction.explanation}
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Dynamic AI thinking indicator */}
        {loading && (
          <div className="flex items-start gap-2.5 animate-fade-in">
            <div className="bg-[#f5f3f0] p-4 rounded-3xl rounded-tl-lg text-gray-500 text-xs flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-[#094cb2] animate-spin" />
              <span className="font-serif italic text-gray-600">O tutor Gemini está a formular a resposta...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Recording Overlay Panel (First Mockup Design) */}
      {isRecording && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-gray-900/95 via-gray-950/90 to-transparent p-6 z-40 animate-slide-up flex flex-col items-center justify-end h-72">
          <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] p-6 w-full max-w-sm shadow-2xl text-center space-y-4">
            
            {/* Audio Wave animated bars (Mockup requirement) */}
            <div className="flex justify-center items-center gap-1.5 h-12">
              <span className="w-1.5 h-4 bg-[#094cb2] rounded-full animate-pulse" />
              <span className="w-1.5 h-8 bg-purple-500 rounded-full animate-pulse delay-100" />
              <span className="w-1.5 h-11 bg-pink-500 rounded-full animate-pulse delay-200" />
              <span className="w-1.5 h-7 bg-purple-500 rounded-full animate-pulse delay-150" />
              <span className="w-1.5 h-10 bg-[#094cb2] rounded-full animate-pulse delay-300" />
              <span className="w-1.5 h-5 bg-blue-400 rounded-full animate-pulse delay-75" />
            </div>

            {/* Timer and Recording indicator text */}
            <div className="text-white text-xl font-mono font-bold">
              {formatTime(recordingSeconds)}
            </div>
            <p className="text-xs text-zinc-400">Gravando áudio...</p>

            {/* Stop and Cancel Controls */}
            <div className="flex justify-center items-center gap-6">
              <button
                type="button"
                onClick={cancelRecording}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs rounded-xl transition-all"
              >
                Cancelar
              </button>
              
              {/* Circular Pulsing Pause/Stop button */}
              <button
                type="button"
                onClick={stopRecording}
                className="w-14 h-14 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white shadow-lg active:scale-95 animate-pulse"
              >
                <Square className="w-5 h-5 fill-white text-white" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Editable Transcribed Text Confirmation Overlay (Phase 5 Requirement #2) */}
      {showConfirmation && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-gray-900/95 via-gray-950/90 to-transparent p-6 z-40 animate-slide-up flex flex-col items-center justify-end h-80">
          <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] p-6 w-full max-w-sm shadow-2xl space-y-4">
            <h4 className="text-amber-100 font-serif text-sm font-semibold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Verifica o texto transcrito</span>
            </h4>
            
            <textarea
              value={transcribedText}
              onChange={(e) => setTranscribedText(e.target.value)}
              className="w-full h-20 px-4 py-3 bg-zinc-850 border border-zinc-800 rounded-2xl text-xs text-white focus:outline-none focus:border-blue-500 resize-none font-sans"
              placeholder="Fale para transcrever..."
            />

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowConfirmation(false);
                  handleMicClick();
                }}
                className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-xl transition-all"
              >
                Gravar de novo
              </button>

              <button
                type="button"
                onClick={handleConfirmSendVoice}
                disabled={!transcribedText.trim()}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/10 disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Confirmar e Enviar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Input Form Bar */}
      <form onSubmit={handleSubmit} className="px-6 py-4 bg-white border-t border-gray-100">
        <div className="flex items-center gap-3">
          
          {/* Textarea Input Container */}
          <div className="flex-1 relative flex items-center">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={loading || isRecording}
              placeholder={`Escreve uma mensagem em ${language.name}...`}
              className="w-full pl-5 pr-12 py-4 bg-[#f5f3f0] border-none rounded-2xl text-sm placeholder-gray-400 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#094cb2]/15 transition-all disabled:opacity-50"
            />
            {/* Quick vocal practice indicator if tutor spoke */}
            {messages.length > 0 && !isRecording && (
              <button
                type="button"
                onClick={() => {
                  const lastModelMsg = [...messages].reverse().find(m => m.role === "model");
                  if (lastModelMsg) onOpenPronunciation(lastModelMsg.text);
                }}
                className="absolute right-3 p-2 bg-white text-gray-600 hover:text-[#094cb2] rounded-xl shadow-sm transition-all"
                title="Treinar pronúncia do último balão"
              >
                <Mic className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Microphone button next to the normal text input (Requirement #1) */}
          <button
            type="button"
            onClick={handleMicClick}
            disabled={loading || isRecording}
            className="p-4 bg-blue-50 hover:bg-blue-100 text-[#094cb2] rounded-2xl transition-all shadow-sm active:scale-95 disabled:opacity-40"
            title="Gravar a tua voz"
          >
            <Mic className="w-5 h-5 text-[#094cb2]" />
          </button>

          <button
            type="submit"
            disabled={!inputText.trim() || loading || isRecording}
            className="p-4 bg-[#094cb2] hover:opacity-95 text-white rounded-2xl transition-all shadow-md active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <p className="text-[10px] text-gray-400 mt-2 text-center font-mono">
          Foco em conversação: Escreve da forma que conseguires, o tutor Gemini te ajudará a polir.
        </p>
      </form>
    </div>
  );
}
