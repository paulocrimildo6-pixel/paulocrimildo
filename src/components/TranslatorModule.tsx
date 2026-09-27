import React, { useState, useEffect, useRef } from "react";
import { 
  Languages, 
  Mic, 
  MicOff, 
  Volume2, 
  Sparkles, 
  BookOpen, 
  MessageSquare, 
  Copy, 
  Check, 
  History, 
  Search, 
  ArrowRight, 
  Lightbulb, 
  AlertCircle, 
  Trash2,
  ChevronDown,
  VolumeX,
  Bot,
  Star
} from "lucide-react";
import { ExtendedLanguage, TranslationResult, AIExplainResult } from "../types";
import { ALL_LANGUAGES } from "../data/languages";
import { auth, db, incrementTranslationCount } from "../lib/firebase";
import { collection, addDoc, onSnapshot, query, where, orderBy, doc, updateDoc, deleteDoc } from "firebase/firestore";

interface TranslatorModuleProps {
  onStartConversation: () => void;
  onSaveVocabulary?: (word: string, translation: string, explanation: string) => void;
}

const LOCAL_STORAGE_TRANSLATE_HISTORY = "lingo_conversao_translate_history_v1";

export default function TranslatorModule({ onStartConversation, onSaveVocabulary }: TranslatorModuleProps) {
  const [activeTab, setActiveTab] = useState<"translate" | "explain" | "history">("translate");
  
  // Target Language state (Default: English)
  const [targetLang, setTargetLang] = useState<ExtendedLanguage>(
    ALL_LANGUAGES.find(l => l.code === "en") || ALL_LANGUAGES[0]
  );
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [langSearch, setLangSearch] = useState("");

  // Input States
  const [inputText, setInputText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Results
  const [translationResult, setTranslationResult] = useState<TranslationResult | null>(null);
  const [explainResult, setExplainResult] = useState<AIExplainResult | null>(null);

  // History State
  const [history, setHistory] = useState<Array<TranslationResult | AIExplainResult>>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  // Audio Recording Ref for Voice fallback
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Load history on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_TRANSLATE_HISTORY);
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load history", e);
    }
  }, []);

  // Save item to history and sync with Firestore if logged in
  const saveToHistory = async (item: TranslationResult | AIExplainResult) => {
    const currentUser = auth.currentUser;
    
    setHistory(prev => {
      const updated = [item, ...prev.filter(h => h.id !== item.id)].slice(0, 50);
      localStorage.setItem(LOCAL_STORAGE_TRANSLATE_HISTORY, JSON.stringify(updated));
      return updated;
    });

    if (currentUser) {
      try {
        await addDoc(collection(db, "translations"), {
          ...item,
          userId: currentUser.uid,
          createdAt: new Date().toISOString()
        });
        await incrementTranslationCount(currentUser.uid);
      } catch (err) {
        console.warn("Erro ao salvar tradução no Firestore:", err);
      }
    }
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(LOCAL_STORAGE_TRANSLATE_HISTORY);
  };

  // Web Speech API Voice Input
  const startSpeechRecognition = () => {
    setErrorMessage(null);
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      // Fallback to MediaRecorder + Gemini Transcribe
      startMediaRecorder();
      return;
    }

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "auto"; // Auto detect speech

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInputText(transcript);
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error", event.error);
        setIsRecording(false);
        setErrorMessage("Não foi possível reconhecer a voz. Tente digitar ou gravar novamente.");
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.start();
    } catch (err) {
      console.error(err);
      startMediaRecorder();
    }
  };

  // MediaRecorder fallback for Gemini Transcribe
  const startMediaRecorder = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await processAudioTranscription(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error(err);
      setErrorMessage("Permissão para microfone negada ou indisponível.");
      setIsRecording(false);
    }
  };

  const stopMediaRecorder = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      // Stop mic track
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const toggleVoiceRecording = () => {
    if (isRecording) {
      stopMediaRecorder();
    } else {
      startSpeechRecognition();
    }
  };

  const processAudioTranscription = async (blob: Blob) => {
    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(",")[1];
        const res = await fetch("/api/transcribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ audioBase64: base64Audio, mimeType: blob.type })
        });
        const data = await res.json();
        if (data.text) {
          setInputText(data.text);
        } else {
          setErrorMessage("Não conseguimos ouvir áudio claro. Tente falar novamente.");
        }
        setIsProcessing(false);
      };
    } catch (e) {
      console.error(e);
      setIsProcessing(false);
      setErrorMessage("Erro ao transcrever voz.");
    }
  };

  // Text-to-Speech Handler
  const speakText = (text: string, langCode: string, id: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    // Find matching locale
    const target = ALL_LANGUAGES.find(l => l.code === langCode);
    if (target?.speechLocale) {
      utterance.lang = target.speechLocale;
    } else {
      utterance.lang = langCode;
    }
    utterance.rate = 0.9;

    utterance.onstart = () => setSpeakingId(id);
    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);

    window.speechSynthesis.speak(utterance);
  };

  // Handle Action: Translate
  const handleTranslate = async () => {
    if (!inputText.trim()) return;
    setIsProcessing(true);
    setErrorMessage(null);
    setExplainResult(null);

    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: inputText.trim(),
          targetLanguageName: targetLang.name,
          targetLanguageCode: targetLang.code
        })
      });

      if (!res.ok) {
        throw new Error("Falha na tradução com IA.");
      }

      const data: TranslationResult = await res.json();
      data.id = "trans-" + Date.now();
      data.originalText = inputText.trim();
      data.targetLanguageCode = targetLang.code;
      data.targetLanguageName = targetLang.name;
      data.timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      setTranslationResult(data);
      saveToHistory(data);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Erro ao conectar à IA para tradução.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Action: Explain with AI
  const handleExplain = async () => {
    if (!inputText.trim()) return;
    setIsProcessing(true);
    setErrorMessage(null);
    setTranslationResult(null);

    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: inputText.trim(),
          targetLanguageName: targetLang.name
        })
      });

      if (!res.ok) {
        throw new Error("Falha ao obter explicação com IA.");
      }

      const data: AIExplainResult = await res.json();
      data.id = "explain-" + Date.now();
      data.query = inputText.trim();
      data.targetLanguageName = targetLang.name;
      data.targetLanguageCode = targetLang.code;
      data.timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      setExplainResult(data);
      saveToHistory(data);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Erro ao gerar explicação com IA.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredLanguages = ALL_LANGUAGES.filter(l => 
    l.name.toLowerCase().includes(langSearch.toLowerCase()) ||
    l.nativeName.toLowerCase().includes(langSearch.toLowerCase()) ||
    l.code.toLowerCase().includes(langSearch.toLowerCase())
  );

  const topPopularLangs = ALL_LANGUAGES.slice(0, 6);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 font-sans">
      {/* 1. WELCOME BANNER (Solicitado expressamente) */}
      <div className="mb-6 bg-gradient-to-br from-[#094cb2] via-[#0b5cd9] to-[#04327a] text-white p-6 sm:p-8 rounded-3xl shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-8 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-xs font-semibold uppercase tracking-wider text-amber-300">
            <Sparkles className="w-3.5 h-3.5" />
            LingoConversa AI Translation & Learning
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-white leading-snug">
            🌍 Aprenda qualquer idioma com Inteligência Artificial.
          </h1>
          <p className="text-blue-100 text-sm sm:text-base leading-relaxed max-w-3xl">
            Digite ou fale qualquer palavra, frase ou texto. Nossa IA irá identificar o idioma, traduzir instantaneamente, explicar o significado, mostrar exemplos reais, ensinar a pronúncia correta e ajudar você a falar com confiança.
          </p>
        </div>
      </div>

      {/* 2. MODE NAVIGATION TABS */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 bg-amber-50/60 p-1.5 rounded-2xl border border-amber-200/50">
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => { setActiveTab("translate"); setErrorMessage(null); }}
            className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              activeTab === "translate"
                ? "bg-[#094cb2] text-white shadow-sm"
                : "text-gray-600 hover:text-gray-900 hover:bg-white/60"
            }`}
          >
            <Languages className="w-4 h-4" />
            Tradutor & Pronúncia
          </button>
          
          <button
            onClick={() => { setActiveTab("explain"); setErrorMessage(null); }}
            className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              activeTab === "explain"
                ? "bg-[#094cb2] text-white shadow-sm"
                : "text-gray-600 hover:text-gray-900 hover:bg-white/60"
            }`}
          >
            <Lightbulb className="w-4 h-4 text-amber-400" />
            Aprender com IA
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "history"
                ? "bg-[#094cb2] text-white shadow-sm"
                : "text-gray-600 hover:text-gray-900 hover:bg-white/60"
            }`}
          >
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">Histórico</span>
          </button>
        </div>

        {/* Action Button to switch to Conversation Tutor Mode */}
        <button
          onClick={onStartConversation}
          className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer"
        >
          <Bot className="w-4 h-4" />
          <span>Praticar Conversação com IA</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {activeTab !== "history" && (
        <div className="bg-white rounded-3xl border border-stone-200/80 p-5 sm:p-7 shadow-sm mb-8 space-y-6">
          {/* Target Language Selector with 100+ Languages */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <span>Traduzir / Explicar para:</span>
              <span className="text-[#094cb2] font-mono font-bold">+100 Idiomas Disponíveis</span>
            </div>

            {/* Popular Language Quick Chips */}
            <div className="flex flex-wrap items-center gap-2">
              {topPopularLangs.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setTargetLang(lang)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    targetLang.code === lang.code
                      ? "bg-[#094cb2] text-white shadow-sm"
                      : "bg-stone-100 hover:bg-stone-200 text-stone-700"
                  }`}
                >
                  <span>{lang.flag}</span>
                  <span>{lang.name}</span>
                </button>
              ))}

              {/* Dropdown Toggle for 100+ languages */}
              <div className="relative">
                <button
                  onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                  className="px-3 py-1.5 bg-amber-100/70 hover:bg-amber-100 text-amber-900 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                >
                  <span> Outros Idiomas ({ALL_LANGUAGES.length})</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>

                {isLangDropdownOpen && (
                  <div className="absolute right-0 sm:left-0 mt-2 w-72 bg-white border border-stone-200 rounded-2xl shadow-xl z-50 p-3 space-y-2">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Pesquisar idioma..."
                        value={langSearch}
                        onChange={(e) => setLangSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-[#094cb2]"
                      />
                    </div>
                    <div className="max-h-56 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                      {filteredLanguages.map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => {
                            setTargetLang(lang);
                            setIsLangDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all ${
                            targetLang.code === lang.code
                              ? "bg-[#094cb2] text-white font-bold"
                              : "hover:bg-stone-100 text-stone-700"
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span>{lang.flag}</span>
                            <span>{lang.name}</span>
                          </span>
                          <span className="text-[10px] opacity-70 font-mono">{lang.nativeName}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Input Box with Microphone button */}
          <div className="relative bg-stone-50 rounded-2xl border border-stone-200 p-4 focus-within:border-[#094cb2] focus-within:ring-2 focus-within:ring-[#094cb2]/10 transition-all">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                activeTab === "translate"
                  ? "Digite ou cole qualquer palavra, frase ou texto em qualquer idioma (ex: 'How are you today?', 'Je voudrais un café')..."
                  : "Digite uma palavra ou expressão para aprender tudo com a IA (ex: 'Break a leg', 'Over the moon', 'Déjà vu')..."
              }
              rows={4}
              className="w-full bg-transparent border-none text-stone-800 text-sm sm:text-base focus:outline-none resize-none placeholder-stone-400"
            />

            {/* Controls Bar at bottom of input */}
            <div className="flex items-center justify-between pt-2 border-t border-stone-200/60 mt-2">
              <div className="flex items-center gap-2">
                {/* Microfone Button */}
                <button
                  type="button"
                  onClick={toggleVoiceRecording}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isRecording
                      ? "bg-red-500 text-white animate-pulse"
                      : "bg-white border border-stone-300 hover:bg-stone-100 text-stone-700"
                  }`}
                  title="Falar usando o microfone"
                >
                  {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-red-500" />}
                  <span>{isRecording ? "Gravando... Clique para parar" : "🎤 Falar"}</span>
                </button>

                {inputText && (
                  <button
                    onClick={() => setInputText("")}
                    className="text-xs text-stone-400 hover:text-stone-600 px-2 py-1"
                  >
                    Limpar
                  </button>
                )}
              </div>

              {/* Submit Button */}
              <button
                disabled={!inputText.trim() || isProcessing}
                onClick={activeTab === "translate" ? handleTranslate : handleExplain}
                className="px-6 py-2 bg-[#094cb2] hover:bg-[#073c8f] disabled:opacity-50 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center gap-2 shadow-sm transition-all cursor-pointer active:scale-95"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Analisando com IA...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>{activeTab === "translate" ? "Traduzir & Analisar" : "Aprender com IA"}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-700 text-xs sm:text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>
      )}

      {/* 3. TRANSLATION RESULT VIEW */}
      {activeTab === "translate" && translationResult && (
        <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-sm space-y-6 animate-fadeIn">
          {/* Identified Language Badge */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#094cb2]/10 text-[#094cb2] rounded-full text-xs font-bold">
              <span>⚡ Idioma de entrada detectado:</span>
              <span className="font-semibold text-stone-900">{translationResult.detectedLanguage}</span>
            </div>
            <div className="text-xs text-gray-400 font-mono">
              Para: {targetLang.flag} {translationResult.targetLanguageName}
            </div>
          </div>

          {/* Grammar Correction Callout if mistake was found */}
          {translationResult.grammarCorrections?.hasError && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-1.5 text-xs sm:text-sm">
              <div className="flex items-center gap-2 text-amber-900 font-bold">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>Correção de Gramática no texto original:</span>
              </div>
              <p className="text-stone-700">
                Texto correto: <strong className="text-stone-900 font-serif">"{translationResult.grammarCorrections.correctedOriginal}"</strong>
              </p>
              <p className="text-stone-600 italic">
                {translationResult.grammarCorrections.explanation}
              </p>
            </div>
          )}

          {/* Main Translation Output Card */}
          <div className="bg-stone-50 rounded-2xl p-6 border border-stone-200/80 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                  Tradução em {translationResult.targetLanguageName}
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-stone-900 leading-snug">
                  {translationResult.translation}
                </h3>
                {translationResult.phonetic && (
                  <p className="text-xs sm:text-sm text-[#094cb2] font-mono mt-1">
                    Pronúncia: {translationResult.phonetic}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* TTS Listen Button */}
                <button
                  onClick={() => speakText(translationResult.translation, translationResult.targetLanguageCode, translationResult.id)}
                  className={`p-3 rounded-2xl transition-all shadow-sm cursor-pointer ${
                    speakingId === translationResult.id
                      ? "bg-emerald-600 text-white animate-pulse"
                      : "bg-white hover:bg-stone-100 text-[#094cb2] border border-stone-200"
                  }`}
                  title="Ouvir a pronúncia correta em áudio"
                >
                  <Volume2 className="w-5 h-5" />
                </button>

                {/* Copy Button */}
                <button
                  onClick={() => handleCopy(translationResult.translation, translationResult.id)}
                  className="p-3 bg-white hover:bg-stone-100 text-stone-600 border border-stone-200 rounded-2xl transition-all"
                  title="Copiar texto"
                >
                  {copiedId === translationResult.id ? <Check className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Pedagogical Explanation Box */}
            {translationResult.explanation && (
              <div className="bg-white rounded-xl p-4 border border-stone-200/60 space-y-1">
                <span className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  Significado e Explicação Simples:
                </span>
                <p className="text-stone-600 text-xs sm:text-sm leading-relaxed">
                  {translationResult.explanation}
                </p>
              </div>
            )}
          </div>

          {/* Examples Section */}
          {translationResult.examples && translationResult.examples.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#094cb2]" />
                Exemplos Práticos no Dia a Dia:
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {translationResult.examples.map((ex, i) => (
                  <div key={i} className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-1 hover:border-[#094cb2]/40 transition-all">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs sm:text-sm font-bold text-stone-900">{ex.original}</p>
                      <button
                        onClick={() => speakText(ex.original, translationResult.targetLanguageCode, `ex-${i}`)}
                        className="p-1.5 text-stone-400 hover:text-[#094cb2]"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-xs text-stone-500 italic">{ex.translation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Difficult Words Breakdown */}
          {translationResult.difficultWords && translationResult.difficultWords.length > 0 && (
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Vocabulário & Palavras Relevantes:
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {translationResult.difficultWords.map((word, idx) => (
                  <div key={idx} className="p-4 bg-amber-50/50 rounded-2xl border border-amber-200/60 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-amber-950">{word.word}</span>
                      <span className="text-[10px] font-mono text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">{word.phonetic}</span>
                    </div>
                    <p className="text-xs text-amber-900">{word.meaning}</p>
                    <p className="text-[11px] text-amber-700 italic border-t border-amber-200/40 pt-1">
                      Ex: "{word.example}"
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. "APRENDER COM IA" EXPLAIN RESULT VIEW */}
      {activeTab === "explain" && explainResult && (
        <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-sm space-y-6 animate-fadeIn">
          {/* Expression Header */}
          <div className="border-b border-stone-100 pb-4 space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-900 rounded-full text-xs font-bold mb-1">
              <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
              <span>{explainResult.grammaticalCategory || "Explicação da IA"}</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold font-serif text-stone-900">
              "{explainResult.query}"
            </h3>
            <p className="text-stone-600 font-semibold text-sm">
              {explainResult.meaning}
            </p>
          </div>

          {/* Simple Explanation Callout */}
          <div className="bg-stone-50 rounded-2xl p-5 border border-stone-200 space-y-2">
            <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#094cb2]" />
              Explicação Didática:
            </h4>
            <p className="text-stone-700 text-xs sm:text-sm leading-relaxed">
              {explainResult.simpleExplanation}
            </p>
          </div>

          {/* Context & Cultural Note */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-200/60 space-y-1">
              <span className="text-xs font-bold text-blue-900 block">Contexto de Uso Real:</span>
              <p className="text-xs text-blue-800 leading-relaxed">{explainResult.usageContext}</p>
            </div>

            {explainResult.culturalNote && (
              <div className="p-4 bg-purple-50/60 rounded-2xl border border-purple-200/60 space-y-1">
                <span className="text-xs font-bold text-purple-900 block">Dica Cultural / Nuance:</span>
                <p className="text-xs text-purple-800 leading-relaxed">{explainResult.culturalNote}</p>
              </div>
            )}
          </div>

          {/* Mnemonic Memory Tip */}
          {explainResult.mnemonicTip && (
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-start gap-3 text-emerald-900 text-xs sm:text-sm">
              <Sparkles className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold mb-0.5">Dica Mnemónica de Memorização:</strong>
                <span>{explainResult.mnemonicTip}</span>
              </div>
            </div>
          )}

          {/* Examples */}
          {explainResult.examples && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                Exemplos de Aplicação Prática:
              </h4>
              <div className="space-y-2">
                {explainResult.examples.map((ex, i) => (
                  <div key={i} className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-stone-900">{ex.sentence}</p>
                      <p className="text-xs text-stone-500 italic">{ex.translation}</p>
                    </div>
                    <button
                      onClick={() => speakText(ex.sentence, explainResult.targetLanguageCode, `ex-exp-${i}`)}
                      className="p-2 text-stone-400 hover:text-[#094cb2]"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. HISTORY TAB VIEW */}
      {activeTab === "history" && (
        <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-stone-100 pb-4">
            <div>
              <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                <History className="w-5 h-5 text-[#094cb2]" />
                Histórico de Traduções & Explicações
              </h3>
              <p className="text-xs text-stone-500">
                Seus estudos salvos automaticamente no dispositivo.
              </p>
            </div>

            {history.length > 0 && (
              <button
                onClick={clearHistory}
                className="px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-xl transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                Limpar Histórico
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <History className="w-12 h-12 text-stone-300 mx-auto" />
              <p className="text-stone-500 text-sm">
                Ainda não há histórico salvo. Faça tradução ou pergunte algo à IA para começar!
              </p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {history.map((item: any) => (
                <div key={item.id} className="p-5 bg-stone-50 rounded-2xl border border-stone-200 space-y-3 hover:border-stone-300 transition-all">
                  <div className="flex items-center justify-between text-xs text-stone-400">
                    <span className="font-semibold text-[#094cb2] bg-[#094cb2]/10 px-2.5 py-0.5 rounded-full">
                      {item.translation ? "Tradução" : "Explicação com IA"} ({item.targetLanguageName})
                    </span>
                    <span className="font-mono">{item.timestamp}</span>
                  </div>

                  <div>
                    <p className="text-xs text-stone-400 uppercase tracking-wider font-bold">Entrada:</p>
                    <p className="text-sm font-semibold text-stone-800">{item.originalText || item.query}</p>
                  </div>

                  {item.translation ? (
                    <div className="border-t border-stone-200/60 pt-2">
                      <p className="text-xs text-stone-400 uppercase tracking-wider font-bold">Tradução:</p>
                      <p className="text-base font-bold text-stone-900">{item.translation}</p>
                      {item.explanation && (
                        <p className="text-xs text-stone-600 mt-1">{item.explanation}</p>
                      )}
                    </div>
                  ) : (
                    <div className="border-t border-stone-200/60 pt-2 space-y-1">
                      <p className="text-xs text-stone-400 uppercase tracking-wider font-bold">Significado:</p>
                      <p className="text-sm font-semibold text-stone-900">{item.meaning}</p>
                      <p className="text-xs text-stone-600">{item.simpleExplanation}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
