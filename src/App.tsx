import React, { useState, useEffect } from "react";
import Onboarding from "./components/Onboarding";
import MainDashboard from "./components/MainDashboard";
import ChatContainer from "./components/ChatContainer";
import PronunciationModal from "./components/PronunciationModal";
import SummaryModal from "./components/SummaryModal";
import PremiumModal from "./components/PremiumModal";
import PremiumPage from "./components/PremiumPage";
import DailyLimitModal from "./components/DailyLimitModal";
import AdMobInterstitial from "./components/AdMobInterstitial";
import AdMobRewarded from "./components/AdMobRewarded";
import ConversionNudgeModal from "./components/ConversionNudgeModal";
import PronunciationLimitModal from "./components/PronunciationLimitModal";
import AuthModal from "./components/AuthModal";
import { auth, db, syncUserProfile, incrementVoiceCount } from "./lib/firebase";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { doc, collection, onSnapshot, query, where, orderBy } from "firebase/firestore";
import { OnboardingState, Message, Scenario, UserStats, SessionSummary, VocabularyItem } from "./types";
import { LANGUAGES } from "./data";
import { ShieldAlert, Sparkles, Trophy, X, Clock, Compass, Download, User as UserIcon, LogOut, LogIn } from "lucide-react";

const LOCAL_STORAGE_ONBOARDING_KEY = "lingo_conversao_onboarding_v1";
const LOCAL_STORAGE_STATS_KEY = "lingo_conversao_stats_v1";
const LOCAL_STORAGE_VOCABULARY_KEY = "lingo_conversao_vocabulary_v1";

export default function App() {
  // Firebase Auth & User State
  const [user, setUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // 1. Core Onboarding and Progress States
  const [onboarding, setOnboarding] = useState<OnboardingState>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_ONBOARDING_KEY);
      return saved ? JSON.parse(saved) : { language: "en", level: "Iniciante", objective: "Viagem", completed: false };
    } catch {
      return { language: "en", level: "Iniciante", objective: "Viagem", completed: false };
    }
  });

  const [stats, setStats] = useState<UserStats>(() => {
    const todayStr = new Date().toLocaleDateString();
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_STATS_KEY);
      const parsed = saved ? JSON.parse(saved) : null;
      if (parsed) {
        const isNewDay = parsed.lastPracticeDate !== todayStr;
        return {
          ...parsed,
          maxStreak: parsed.maxStreak ?? parsed.streak ?? 5,
          scenariosCompletedCount: parsed.scenariosCompletedCount ?? 2,
          activityHistory: parsed.activityHistory ?? {},
          dailyPronunciationUsed: isNewDay ? 0 : (parsed.dailyPronunciationUsed ?? 0),
          dailyMinutesRemaining: isNewDay && !parsed.isPremium ? 10 * 60 : (parsed.dailyMinutesRemaining ?? 10 * 60)
        };
      }
      return {
        streak: 5,
        maxStreak: 5,
        lastPracticeDate: todayStr,
        totalMinutes: 18,
        totalMessages: 32,
        xp: 140,
        level: 2,
        wordsCount: 22,
        isPremium: false,
        dailyMinutesRemaining: 10 * 60,
        scenariosCompletedCount: 2,
        activityHistory: {},
        dailyPronunciationUsed: 0
      };
    } catch {
      return {
        streak: 5,
        maxStreak: 5,
        lastPracticeDate: todayStr,
        totalMinutes: 18,
        totalMessages: 32,
        xp: 140,
        level: 2,
        wordsCount: 22,
        isPremium: false,
        dailyMinutesRemaining: 10 * 60,
        scenariosCompletedCount: 2,
        activityHistory: {},
        dailyPronunciationUsed: 0
      };
    }
  });

  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_VOCABULARY_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const profile = await syncUserProfile(currentUser);
          if (profile) {
            setStats(prev => ({
              ...prev,
              streak: profile.streakDays || prev.streak,
              isPremium: profile.isPremium || prev.isPremium,
              dailyMinutesRemaining: profile.isPremium ? 99999 : prev.dailyMinutesRemaining
            }));
          }
          if (currentUser.email) {
            fetch(`/api/subscription/status?email=${encodeURIComponent(currentUser.email)}`)
              .then(res => res.json())
              .then(sub => {
                if (sub?.isPremium && sub?.subscription_status === "active") {
                  setStats(prev => ({
                    ...prev,
                    isPremium: true,
                    dailyMinutesRemaining: 99999
                  }));
                }
              })
              .catch(err => console.warn("Erro ao checar status de assinatura:", err));
          }
        } catch (err) {
          console.error("Erro ao sincronizar perfil Firebase:", err);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Real-time listener for user profile doc in Firestore
  useEffect(() => {
    if (!user) return;
    const userRef = doc(db, "users", user.uid);
    const unsubDoc = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setStats(prev => ({
          ...prev,
          streak: data.streakDays || prev.streak,
          isPremium: data.isPremium !== undefined ? data.isPremium : prev.isPremium,
          dailyMinutesRemaining: data.isPremium ? 99999 : prev.dailyMinutesRemaining,
          scenariosCompletedCount: data.translationCount ? Math.max(data.translationCount, prev.scenariosCompletedCount) : prev.scenariosCompletedCount
        }));
      }
    }, (err) => console.warn("Erro no listener de usuário Firestore:", err));

    return () => unsubDoc();
  }, [user]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error("Erro ao fazer logout:", e);
    }
  };

  // 2. Chat Conversation State
  const [activeChat, setActiveChat] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentScenario, setCurrentScenario] = useState<Scenario | null>(null);
  const [chatLoading, setChatLoading] = useState(false);

  // 3. Modals and Auxiliary States
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [isPremiumPageOpen, setIsPremiumPageOpen] = useState(() => {
    try {
      const search = window.location.search;
      return window.location.pathname === "/premium" || search.includes("page=premium") || search.includes("status=pending") || search.includes("checkout=cakto");
    } catch {
      return false;
    }
  });
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [isPronunciationOpen, setIsPronunciationOpen] = useState(false);
  const [isPronunciationLimitOpen, setIsPronunciationLimitOpen] = useState(false);
  const [pronunciationText, setPronunciationText] = useState("");
  const [summaryData, setSummaryData] = useState<SessionSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [showTimeWarning, setShowTimeWarning] = useState(false);
  const [isRewardedAdOpen, setIsRewardedAdOpen] = useState(false);
  const [isInterstitialAdOpen, setIsInterstitialAdOpen] = useState(false);
  const [showConversionNudge, setShowConversionNudge] = useState(false);
  const [hasSeenConversionNudge, setHasSeenConversionNudge] = useState(() => {
    try {
      return localStorage.getItem("lingo_conversao_nudge_seen") === "true";
    } catch {
      return false;
    }
  });

  // PWA Installation prompt states
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  // Persistence hooks
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_ONBOARDING_KEY, JSON.stringify(onboarding));
  }, [onboarding]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_STATS_KEY, JSON.stringify(stats));
  }, [stats]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_VOCABULARY_KEY, JSON.stringify(vocabulary));
  }, [vocabulary]);

  useEffect(() => {
    try {
      localStorage.setItem("lingo_conversao_nudge_seen", hasSeenConversionNudge ? "true" : "false");
    } catch (e) {}
  }, [hasSeenConversionNudge]);

  // PWA Install Prompt Listener
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // If already in standalone mode, hide button
    if (window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone) {
      setShowInstallBtn(false);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`PWA install prompt choice: ${outcome}`);
    setDeferredPrompt(null);
    setShowInstallBtn(false);
  };

  // 4. Countdown Timer for Practice Time (10 minutes free limit per day)
  useEffect(() => {
    let timerId: any;
    if (activeChat && !stats.isPremium) {
      timerId = setInterval(() => {
        setStats((prev) => {
          if (prev.dailyMinutesRemaining <= 1) {
            // Out of time
            clearInterval(timerId);
            setActiveChat(false);
            setShowTimeWarning(true);
            return { ...prev, dailyMinutesRemaining: 0 };
          }
          // Increment total practice minutes occasionally (every 60s)
          const newMinutes = prev.dailyMinutesRemaining % 60 === 0 ? prev.totalMinutes + 1 : prev.totalMinutes;
          return {
            ...prev,
            dailyMinutesRemaining: prev.dailyMinutesRemaining - 1,
            totalMinutes: newMinutes
          };
        });
      }, 1000);
    }
    return () => clearInterval(timerId);
  }, [activeChat, stats.isPremium]);

  // Vocabulary and Gamification Handlers (Phase 3 Requirements)
  const handleToggleMastered = (id: string) => {
    setVocabulary((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isMastered: !item.isMastered } : item
      )
    );
  };

  const handleRemoveVocabularyItem = (id: string) => {
    setVocabulary((prev) => prev.filter((item) => item.id !== id));
  };

  const addVocabularyItem = (original: string, corrected?: string, explanation?: string, translation?: string) => {
    setVocabulary((prev) => {
      if (prev.some((item) => item.originalText.trim().toLowerCase() === original.trim().toLowerCase())) {
        return prev;
      }
      const newItem: VocabularyItem = {
        id: Math.random().toString(),
        originalText: original,
        correctedText: corrected,
        translation: translation || "",
        explanation: explanation,
        scenarioSource: currentScenario ? currentScenario.title : "Conversa Livre",
        dateAdded: new Date().toLocaleDateString(),
        isMastered: false,
      };
      return [newItem, ...prev];
    });
  };

  const handlePracticeActivity = () => {
    const todayStr = new Date().toLocaleDateString();
    
    setStats((prev) => {
      let currentStreak = prev.streak || 0;
      const lastDate = prev.lastPracticeDate;
      let xpBonus = 0;
      
      if (!lastDate) {
        currentStreak = 1;
      } else if (lastDate !== todayStr) {
        const lastParts = lastDate.split("/");
        const todayParts = todayStr.split("/");
        let diffDays = 99;
        
        if (lastParts.length === 3 && todayParts.length === 3) {
          const lastDateObj = new Date(Number(lastParts[2]), Number(lastParts[1]) - 1, Number(lastParts[0]));
          const todayDateObj = new Date(Number(todayParts[2]), Number(todayParts[1]) - 1, Number(todayParts[0]));
          
          if (!isNaN(lastDateObj.getTime()) && !isNaN(todayDateObj.getTime())) {
            const diffTime = Math.abs(todayDateObj.getTime() - lastDateObj.getTime());
            diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          }
        }

        if (diffDays <= 1) {
          currentStreak += 1;
          xpBonus = 5; // XP Streak Bonus!
        } else {
          currentStreak = 1;
        }
      }
      
      const updatedHistory = { ...(prev.activityHistory || {}) };
      updatedHistory[todayStr] = (updatedHistory[todayStr] || 0) + 1;
      
      const maxStr = Math.max(currentStreak, prev.maxStreak || currentStreak);
      const nextXP = prev.xp + xpBonus;
      const reachedNewLevel = Math.floor(nextXP / 100) > prev.level;
      
      return {
        ...prev,
        streak: currentStreak,
        maxStreak: maxStr,
        lastPracticeDate: todayStr,
        xp: nextXP,
        level: reachedNewLevel ? prev.level + 1 : prev.level,
        activityHistory: updatedHistory,
        dailyPronunciationUsed: lastDate !== todayStr ? 0 : (prev.dailyPronunciationUsed ?? 0)
      };
    });
  };

  const currentLanguageOption = LANGUAGES.find((l) => l.code === onboarding.language) || LANGUAGES[0];

  // Formatting remaining minutes beautifully (MM:SS)
  const formatTimeRemaining = () => {
    const mins = Math.floor(stats.dailyMinutesRemaining / 60);
    const secs = stats.dailyMinutesRemaining % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Launch Free Conversation
  const handleStartFreeChat = () => {
    if (stats.dailyMinutesRemaining <= 0 && !stats.isPremium) {
      setShowTimeWarning(true);
      return;
    }

    setCurrentScenario(null);
    setActiveChat(true);

    // Seed welcoming tutor message instantly for a seamless initial load
    const firstMsg: Message = {
      id: "welcome-free-init",
      role: "model",
      text: currentLanguageOption.welcomeMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      translation: `Olá! Eu sou o teu tutor de ${currentLanguageOption.name}. Vamos praticar conversação hoje! Do que gostarias de falar?`,
      correction: null
    };
    setMessages([firstMsg]);
  };

  // Launch Real-life Scenario Roleplay
  const handleStartScenarioChat = (scenario: Scenario) => {
    if (stats.dailyMinutesRemaining <= 0 && !stats.isPremium) {
      setShowTimeWarning(true);
      return;
    }

    setCurrentScenario(scenario);
    setActiveChat(true);

    const initialText = scenario.targetLanguagePrompts[onboarding.language] || "Hello!";
    const translationText = "Olá, bem-vindo. Como posso ajudar com a tua situação hoje?";

    const firstMsg: Message = {
      id: "welcome-scenario-init",
      role: "model",
      text: initialText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      translation: translationText,
      correction: null
    };
    setMessages([firstMsg]);
  };

  // Handle sending message that was spoken (Phase 5 voice input)
  const handleSendVoiceMessage = (text: string) => {
    handleSendMessage(text);
    handleOpenPronunciation(text);
  };

  // Handle message sending to Gemini
  const handleSendMessage = async (text: string) => {
    if (stats.dailyMinutesRemaining <= 0 && !stats.isPremium) {
      setShowTimeWarning(true);
      return;
    }

    if (user) {
      incrementVoiceCount(user.uid);
    }

    // Add user message to local list immediately
    const userMsgId = Math.random().toString();
    const newUserMsg: Message = {
      id: userMsgId,
      role: "user",
      text: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const currentHistory = [...messages, newUserMsg];
    setMessages(currentHistory);
    setChatLoading(true);

      try {
        // Register this day's practice activity & streak update
        handlePracticeActivity();

        // Call our backend Express proxy API route
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: currentHistory.map((m) => ({ role: m.role, text: m.text })),
            language: currentLanguageOption.name,
            level: onboarding.level,
            scenario: currentScenario ? currentScenario.initialPrompt : null,
            objective: currentScenario ? currentScenario.objective : onboarding.objective,
          }),
        });

        if (!response.ok) {
          throw new Error("Erro de comunicação com o tutor Gemini.");
        }

        const data = await response.json();

        // Save corrected sentence to vocabulary bank automatically if errors are identified (Phase 3 Requirement #3)
        if (data.correction && data.correction.hasError) {
          addVocabularyItem(
            data.correction.originalText,
            data.correction.correctedText,
            data.correction.explanation,
            data.translation || ""
          );
        }

        // Formulate model message response
        const tutorMsg: Message = {
          id: Math.random().toString(),
          role: "model",
          text: data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          translation: data.translation,
          correction: null,
          hint: data.hint || "",
        };

      // Map dynamic feedback corrections directly back into user message
      const updatedMessages = currentHistory.map((msg) => {
        if (msg.id === userMsgId) {
          return {
            ...msg,
            correction: data.correction,
          };
        }
        return msg;
      });

      setMessages([...updatedMessages, tutorMsg]);

      // Update lightweight gamification states
      setStats((prev) => {
        const bonusXP = data.correction?.hasError ? 5 : 10; // Earn more XP for error-free messages
        const newXP = prev.xp + bonusXP;
        const reachedNewLevel = Math.floor(newXP / 100) > prev.level;
        return {
          ...prev,
          totalMessages: prev.totalMessages + 1,
          xp: newXP,
          level: reachedNewLevel ? prev.level + 1 : prev.level,
          wordsCount: prev.wordsCount + text.split(" ").length,
        };
      });

    } catch (error) {
      console.error("Erro na conversação:", error);
      // Clean fallback if API goes offline or fails
      const fallbackTexts: Record<string, string> = {
        en: "I am sorry, I had a slight connection issue. Could you please repeat that?",
        es: "Lo siento, tuve un pequeño problema de conexión. ¿Podrías repetir eso, por favor?",
        fr: "Je suis désolé, j'ai eu un petit problème de connexion. Pourriez-vous répéter, s'il vous plaît ?",
        it: "Scusa, ho avuto un piccolo problema di connessione. Potresti ripetere, per favore?",
        de: "Es tut mir leid, ich hatte ein kleines Verbindungsproblem. Könntest du das bitte wiederholen?"
      };
      const errorMsg: Message = {
        id: "fallback-error",
        role: "model",
        text: fallbackTexts[onboarding.language] || fallbackTexts.en,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        translation: "Desculpa, tive um pequeno problema de ligação. Podes repetir, por favor?",
        correction: null,
      };
      setMessages([...currentHistory, errorMsg]);
    } finally {
      setChatLoading(false);
    }
  };

  // Close conversation and show Lesson Summary Analysis
  const handleEndSession = async () => {
    setActiveChat(false);
    
    // Anúncio intersticial (tela cheia) ao terminar um cenário, antes de mostrar o resumo pós-cenário
    const shouldShowAd = !stats.isPremium && !!currentScenario;
    if (shouldShowAd) {
      setIsInterstitialAdOpen(true);
    } else {
      setIsSummaryModalOpen(true);
    }
    
    setSummaryLoading(true);

    try {
      const response = await fetch("/api/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messages.map((m) => ({ role: m.role, text: m.text })),
          language: currentLanguageOption.name,
          level: onboarding.level,
          scenario: currentScenario ? currentScenario.title : null,
          scenarioObjective: currentScenario ? currentScenario.objective : null,
        }),
      });

      if (!response.ok) {
        throw new Error("Erro ao gerar resumo.");
      }

      const data = await response.json();
      setSummaryData(data);

      // Save vocabulary items from the session summary (Phase 3 Requirement #3)
      if (data.vocabularyLearned && Array.isArray(data.vocabularyLearned)) {
        data.vocabularyLearned.forEach((word: string) => {
          if (word && word.trim().length > 0) {
            addVocabularyItem(word, undefined, undefined, undefined);
          }
        });
      }

      // Award XP on successful completion of a session (Phase 3 Requirement #2)
      setStats((prev) => {
        const isScenario = !!currentScenario;
        const wasSuccess = isScenario && data.objectiveCompleted;
        const baseXP = isScenario ? (wasSuccess ? 25 : 15) : 10; // +25 for scenario success, +15 for scenario practice, or +10 for free chat
        const finalXP = prev.xp + baseXP;
        const reachedNewLevel = Math.floor(finalXP / 100) > prev.level;
        
        return {
          ...prev,
          xp: finalXP,
          scenariosCompletedCount: isScenario ? (prev.scenariosCompletedCount || 0) + 1 : (prev.scenariosCompletedCount || 0),
          level: reachedNewLevel ? prev.level + 1 : prev.level,
        };
      });

    } catch (error) {
      console.error(error);
      const fallbackData = {
        generalFeedback: "Muito bem feito! Praticaste vários conceitos com excelente consistência e iniciativa. Continua a manter o teu ritmo diário para consolidar as aprendizagens.",
        strengthPoints: ["Boa iniciativa na conversação livre", "Apropriado uso de cumprimentos e fechos"],
        commonMistakes: [],
        vocabularyLearned: ["Prática espontânea"],
        suggestedNextSteps: "Tenta praticar simulações específicas da Vida Real para expandir o teu vocabulário estruturado.",
        objectiveCompleted: true,
      };

      // Safe visual fallback for lesson summaries on request timeout
      setSummaryData(fallbackData);

      // Auto save words for fallback
      if (fallbackData.vocabularyLearned && Array.isArray(fallbackData.vocabularyLearned)) {
        fallbackData.vocabularyLearned.forEach((word: string) => {
          if (word && word.trim().length > 0) {
            addVocabularyItem(word, undefined, undefined, undefined);
          }
        });
      }

      // Award XP for fallback too
      setStats((prev) => {
        const isScenario = !!currentScenario;
        const baseXP = isScenario ? 25 : 10;
        const finalXP = prev.xp + baseXP;
        const reachedNewLevel = Math.floor(finalXP / 100) > prev.level;
        
        return {
          ...prev,
          xp: finalXP,
          scenariosCompletedCount: isScenario ? (prev.scenariosCompletedCount || 0) + 1 : (prev.scenariosCompletedCount || 0),
          level: reachedNewLevel ? prev.level + 1 : prev.level,
        };
      });
    } finally {
      setSummaryLoading(false);
    }
  };

  // Open pronunciation evaluation modal
  const handleOpenPronunciation = (text: string) => {
    if (!stats.isPremium && (stats.dailyPronunciationUsed || 0) >= 3) {
      setIsPronunciationLimitOpen(true);
      return;
    }
    setPronunciationText(text);
    setIsPronunciationOpen(true);
  };

  // Increment pronunciation evaluation usage statistics
  const handlePronunciationComplete = () => {
    setStats((prev) => ({
      ...prev,
      dailyPronunciationUsed: (prev.dailyPronunciationUsed || 0) + 1,
    }));
  };

  // Upgraded Premium Handler
  const handleUpgradeSuccess = () => {
    setStats((prev) => ({
      ...prev,
      isPremium: true,
      dailyMinutesRemaining: 99999, // Unbounded time
    }));
  };

  const handleCloseInterstitial = () => {
    setIsInterstitialAdOpen(false);
    setIsSummaryModalOpen(true);
  };

  const handleOnboardingComplete = (state: OnboardingState) => {
    setOnboarding(state);
  };

  const handleResetOnboarding = () => {
    setOnboarding((prev) => ({ ...prev, completed: false }));
  };

  return (
    <div className="min-h-screen bg-[#fcfbfa] text-[#1a1a1a] flex flex-col antialiased">
      
      {/* 1. ONBOARDING WIZARD */}
      {!onboarding.completed ? (
        <Onboarding initialState={onboarding} onComplete={handleOnboardingComplete} />
      ) : (
        <>
          {/* Main Layout view header bar */}
          <header className="py-3.5 bg-white border-b border-gray-100 flex items-center justify-between px-4 sm:px-6 flex-wrap gap-2 shadow-xs">
            <button
              onClick={() => setActiveChat(false)}
              className="font-serif text-xl font-bold tracking-tight text-[#094cb2] flex items-center gap-2 cursor-pointer"
            >
              <span>LingoConversa</span>
              <span className="text-[10px] font-sans font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full uppercase tracking-wide">
                AI
              </span>
            </button>

            <div className="flex items-center gap-3 sm:gap-4 text-xs font-mono">
              {showInstallBtn && (
                <button
                  onClick={handleInstallClick}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#094cb2] hover:bg-[#073c8f] text-white rounded-xl text-[11px] font-sans font-bold transition-all shadow-sm active:scale-95 cursor-pointer animate-pulse"
                  title="Instalar LingoConversa no dispositivo"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Instalar App</span>
                </button>
              )}

              <div className="hidden sm:flex items-center gap-1.5 text-stone-500 font-sans text-xs">
                <span>Tempo Livre:</span>
                <span className={`font-bold font-mono ${stats.dailyMinutesRemaining < 120 && !stats.isPremium ? "text-red-600" : "text-[#094cb2]"}`}>
                  {stats.isPremium ? "Ilimitado 👑" : formatTimeRemaining()}
                </span>
              </div>

              {/* Premium Subscription Button */}
              <button
                onClick={() => setIsPremiumPageOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-[11px] font-sans font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
                title="Assinatura Premium R$ 20/mês Cakto"
              >
                <Sparkles className="w-3.5 h-3.5 fill-amber-200" />
                <span className="hidden sm:inline">{stats.isPremium ? "Premium Ativo 👑" : "Premium R$ 20/mês"}</span>
                <span className="sm:hidden">{stats.isPremium ? "👑" : "R$ 20"}</span>
              </button>

              {/* User Account / Auth Section */}
              {user ? (
                <div className="flex items-center gap-2 border-l border-stone-200 pl-3">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || "Perfil"}
                      className="w-8 h-8 rounded-full border border-stone-300 object-cover shadow-xs"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#094cb2] text-white font-bold text-xs flex items-center justify-center shadow-xs">
                      {(user.displayName || user.email || "U").charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="hidden md:block text-left">
                    <span className="text-xs font-bold text-stone-800 font-sans block leading-none">
                      {user.displayName || user.email?.split("@")[0]}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-sans font-semibold">
                      ● Conectado
                    </span>
                  </div>

                  <button
                    onClick={handleLogout}
                    className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                    title="Sair da conta"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#094cb2] hover:bg-[#073c8f] text-white rounded-xl text-xs font-sans font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Entrar / Cadastrar</span>
                </button>
              )}
            </div>
          </header>

          <main className="flex-1 flex flex-col overflow-hidden">
            {isPremiumPageOpen ? (
              <div className="flex-1 overflow-y-auto bg-[#fcfbfa]">
                <PremiumPage
                  user={user}
                  isPremium={stats.isPremium}
                  onOpenAuth={() => setIsAuthModalOpen(true)}
                  onUpgradeSuccess={handleUpgradeSuccess}
                  onBackToApp={() => {
                    setIsPremiumPageOpen(false);
                    if (window.location.pathname === "/premium") {
                      window.history.pushState({}, "", "/");
                    }
                  }}
                />
              </div>
            ) : activeChat ? (
              /* 2. CHAT CONVERSATION VIEW */
              <ChatContainer
                messages={messages}
                onSendMessage={handleSendMessage}
                onSendVoiceMessage={handleSendVoiceMessage}
                onEndSession={handleEndSession}
                language={currentLanguageOption}
                level={onboarding.level}
                scenarioTitle={currentScenario ? currentScenario.title : null}
                scenarioObjectivePt={currentScenario ? currentScenario.objectivePt : null}
                loading={chatLoading}
                onOpenPronunciation={handleOpenPronunciation}
                timeRemainingStr={formatTimeRemaining()}
                isPremium={stats.isPremium}
                dailyPronunciationUsed={stats.dailyPronunciationUsed || 0}
                onOpenPronunciationLimit={() => setIsPronunciationLimitOpen(true)}
              />
            ) : (
              /* 3. BENTO DASHBOARD COMPONENT */
              <MainDashboard
                stats={stats}
                language={currentLanguageOption}
                level={onboarding.level}
                objective={onboarding.objective}
                user={user}
                onOpenAuth={() => setIsAuthModalOpen(true)}
                onUpgradeSuccess={handleUpgradeSuccess}
                onStartFreeChat={handleStartFreeChat}
                onStartScenarioChat={handleStartScenarioChat}
                onOpenUpgradeModal={() => setIsPremiumModalOpen(true)}
                onChangeOnboarding={handleResetOnboarding}
                vocabulary={vocabulary}
                onToggleMastered={handleToggleMastered}
                onRemoveItem={handleRemoveVocabularyItem}
              />
            )}
          </main>
        </>
      )}

      {/* 4. MODALS COMPILATIONS */}
      
      {/* Voice Pronunciation Modal */}
      <PronunciationModal
        isOpen={isPronunciationOpen}
        onClose={() => setIsPronunciationOpen(false)}
        expectedText={pronunciationText}
        languageCode={onboarding.language}
        languageName={currentLanguageOption.name}
        onEvaluationComplete={handlePronunciationComplete}
      />

      {/* Daily Pronunciation Limit Modal */}
      <PronunciationLimitModal
        isOpen={isPronunciationLimitOpen}
        onClose={() => setIsPronunciationLimitOpen(false)}
        onOpenPremium={() => {
          setIsPronunciationLimitOpen(false);
          setIsPremiumModalOpen(true);
        }}
      />

      {/* Lesson Summary Modal */}
      <SummaryModal
        isOpen={isSummaryModalOpen}
        onClose={() => {
          setIsSummaryModalOpen(false);
          // Trigger the conversion nudge after completing 3 or more scenarios with success
          if (stats.scenariosCompletedCount >= 3 && !stats.isPremium && !hasSeenConversionNudge) {
            setShowConversionNudge(true);
          }
        }}
        summaryData={summaryData}
        isPremium={stats.isPremium}
        loading={summaryLoading}
      />

      {/* Premium Upgrade Modal */}
      <PremiumModal
        isOpen={isPremiumModalOpen}
        onClose={() => setIsPremiumModalOpen(false)}
        onUpgradeSuccess={handleUpgradeSuccess}
      />

      {/* Daily Time Limit Warning Modal */}
      <DailyLimitModal
        isOpen={showTimeWarning}
        onClose={() => setShowTimeWarning(false)}
        onOpenPremium={() => {
          setShowTimeWarning(false);
          setIsPremiumModalOpen(true);
        }}
        onWatchAd={() => {
          setShowTimeWarning(false);
          setIsRewardedAdOpen(true);
        }}
      />

      {/* Fullscreen Interstitial Ad Simulator */}
      <AdMobInterstitial
        isOpen={isInterstitialAdOpen}
        onClose={handleCloseInterstitial}
      />

      {/* Rewarded Video Ad Simulator */}
      <AdMobRewarded
        isOpen={isRewardedAdOpen}
        onClose={() => setIsRewardedAdOpen(false)}
        onRewardEarned={() => {
          setStats((prev) => ({
            ...prev,
            dailyMinutesRemaining: (prev.dailyMinutesRemaining || 0) + 5 * 60, // Add 5 minutes (300 seconds)
          }));
        }}
      />

      {/* 7-Day Free Trial Conversion Nudge Modal */}
      <ConversionNudgeModal
        isOpen={showConversionNudge}
        onClose={() => {
          setShowConversionNudge(false);
          setHasSeenConversionNudge(true);
        }}
        onActivateTrial={() => {
          setShowConversionNudge(false);
          setHasSeenConversionNudge(true);
          setIsPremiumModalOpen(true);
        }}
      />

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

    </div>
  );
}
