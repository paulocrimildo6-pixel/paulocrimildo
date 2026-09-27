import React, { useState } from "react";
import { Scenario, UserStats, TargetLanguage, LanguageOption, VocabularyItem } from "../types";
import { SCENARIOS } from "../data";
import ProgressDashboard from "./ProgressDashboard";
import VocabularyBank from "./VocabularyBank";
import TranslatorModule from "./TranslatorModule";
import AdminDashboard from "./AdminDashboard";
import PremiumPage from "./PremiumPage";
import AdMobBanner from "./AdMobBanner";
import { User } from "firebase/auth";
import {
  Flame,
  Trophy,
  Award,
  MessageSquare,
  Sparkles,
  BookOpen,
  ArrowUpRight,
  Lock,
  PlaneTakeoff,
  Briefcase,
  Utensils,
  ShoppingBag,
  Stethoscope,
  History,
  TrendingUp,
  HelpCircle,
  Lightbulb,
  BookMarked,
  AlertTriangle,
  Languages,
  ShieldCheck
} from "lucide-react";

interface MainDashboardProps {
  stats: UserStats;
  language: LanguageOption;
  level: string;
  objective: string;
  vocabulary: VocabularyItem[];
  user?: User | null;
  onOpenAuth?: () => void;
  onUpgradeSuccess?: () => void;
  onToggleMastered: (id: string) => void;
  onRemoveItem: (id: string) => void;
  onStartFreeChat: () => void;
  onStartScenarioChat: (scenario: Scenario) => void;
  onOpenUpgradeModal: () => void;
  onChangeOnboarding: () => void;
}

export default function MainDashboard({
  stats,
  language,
  level,
  objective,
  vocabulary,
  user,
  onOpenAuth,
  onUpgradeSuccess,
  onToggleMastered,
  onRemoveItem,
  onStartFreeChat,
  onStartScenarioChat,
  onOpenUpgradeModal,
  onChangeOnboarding,
}: MainDashboardProps) {
  const [activeTab, setActiveTab] = useState<"painel" | "translator" | "scenarios" | "progress" | "vocabulary" | "admin" | "premium">("translator");

  // Map icon strings to Lucide icons dynamically
  const getScenarioIcon = (iconName: string) => {
    switch (iconName) {
      case "PlaneTakeoff":
        return <PlaneTakeoff className="w-5 h-5 text-indigo-600" />;
      case "Briefcase":
        return <Briefcase className="w-5 h-5 text-orange-600" />;
      case "Utensils":
        return <Utensils className="w-5 h-5 text-emerald-600" />;
      case "ShoppingBag":
        return <ShoppingBag className="w-5 h-5 text-amber-600" />;
      case "Stethoscope":
        return <Stethoscope className="w-5 h-5 text-rose-600" />;
      case "MessageSquare":
      default:
        return <MessageSquare className="w-5 h-5 text-blue-600" />;
    }
  };

  const getLevelBadgeClass = (lvl?: string) => {
    switch (lvl) {
      case "Iniciante":
        return "bg-emerald-50 text-emerald-700 border border-emerald-100";
      case "Intermediário":
        return "bg-blue-50 text-blue-700 border border-blue-100";
      case "Avançado":
        return "bg-purple-50 text-purple-700 border border-purple-100";
      default:
        return "bg-gray-50 text-gray-700 border border-gray-100";
    }
  };

  const handleScenarioClick = (scenario: Scenario) => {
    if (stats.isPremium || scenario.isFree) {
      onStartScenarioChat(scenario);
    } else {
      onOpenUpgradeModal();
    }
  };

  // Pre-configured simulated mock sessions to display practice history
  const simulatedHistory = [
    { id: 1, date: "Hoje", scenario: "Pequena Conversa Social", score: 95, status: "Aprovado", lang: language.flag, type: "Cenário" },
    { id: 2, date: "Ontem", scenario: "Conversa Livre", score: 92, status: "Excelente", lang: language.flag, type: "Livre" },
    { id: 3, date: "Há 3 dias", scenario: "Pedir Comida no Restaurante", score: 88, status: "Bom", lang: language.flag, type: "Cenário" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 font-sans selection:bg-blue-100 selection:text-[#094cb2] animate-fade-in">
      
      {/* Upper Brand / Stats Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 pb-6 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-3xl">🗣️</span>
            <h1 className="font-serif text-3xl md:text-4xl text-gray-900 tracking-tight">
              LingoConversa
            </h1>
          </div>
          <p className="text-xs text-gray-500 font-mono flex flex-wrap items-center gap-2">
            <span>IDIOMA:</span>
            <span className="font-bold text-gray-700">{language.flag} {language.name} ({level})</span>
            <span>•</span>
            <span>OBJETIVO:</span>
            <span className="font-bold text-gray-700">{objective}</span>
            <button
              onClick={onChangeOnboarding}
              className="ml-2 text-[#094cb2] hover:underline font-semibold font-sans cursor-pointer"
            >
              Alterar Configurações
            </button>
          </p>
        </div>

        {/* Dynamic Streak / Premium CTA Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-amber-50 text-[#6d5e00] px-4.5 py-2 rounded-2xl text-sm font-semibold shadow-sm border border-amber-100/50">
            <Flame className="w-4 h-4 text-orange-500 fill-orange-500 animate-pulse" />
            <span>{stats.streak} Dias de Streak</span>
          </div>

          <div className="flex items-center gap-2 bg-blue-50 text-[#094cb2] px-4.5 py-2 rounded-2xl text-sm font-semibold shadow-sm border border-blue-100/50">
            <Award className="w-4 h-4 text-[#6d5e00]" />
            <span>Nível {stats.level} ({stats.xp} XP)</span>
          </div>

          {!stats.isPremium ? (
            <button
              onClick={onOpenUpgradeModal}
              className="flex items-center gap-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:opacity-95 text-white px-5 py-2.5 rounded-2xl text-xs font-semibold shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-100" />
              <span>Experimentar Premium</span>
            </button>
          ) : (
            <span className="bg-gradient-to-r from-green-50 to-emerald-50 text-emerald-700 px-4.5 py-2 rounded-2xl text-xs font-bold border border-emerald-100 flex items-center gap-1.5 shadow-sm">
              👑 Plano Premium Ativo
            </span>
          )}
        </div>
      </div>

      {/* Visual Streak Alert Warning (Phase 3 Requirement #1) */}
      {stats.lastPracticeDate !== new Date().toLocaleDateString() ? (
        <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center gap-3.5 text-amber-900 shadow-sm animate-pulse">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <div className="text-xs leading-relaxed font-sans">
            <span className="font-bold">Atenção!</span> Pratica hoje para não perderes a tua sequência de <span className="font-extrabold text-orange-600">{stats.streak} dias</span>! 🔥
          </div>
        </div>
      ) : (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-100/50 flex items-center gap-3.5 text-emerald-900 shadow-sm">
          <Flame className="w-5 h-5 text-emerald-600 fill-emerald-100 shrink-0" />
          <div className="text-xs leading-relaxed font-sans">
            <span className="font-bold">Fantástico!</span> A tua sequência de <span className="font-extrabold text-emerald-600">{stats.streak} dias</span> está garantida hoje. Continua a praticar! 🚀
          </div>
        </div>
      )}

      {/* Tabs Navigation Bar */}
      <div className="flex border-b border-gray-100 mb-8 overflow-x-auto gap-2 scrollbar-none">
        <button
          onClick={() => setActiveTab("translator")}
          className={`px-5 py-3 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === "translator"
              ? "border-[#094cb2] text-[#094cb2] bg-blue-50/20"
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          <Languages className="w-4 h-4 text-[#094cb2]" />
          <span>Tradutor & IA</span>
          <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
            +100 Idiomas
          </span>
        </button>

        <button
          onClick={() => setActiveTab("painel")}
          className={`px-5 py-3 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === "painel"
              ? "border-[#094cb2] text-[#094cb2] bg-blue-50/20"
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>Painel Principal</span>
        </button>

        <button
          onClick={() => setActiveTab("scenarios")}
          className={`px-5 py-3 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === "scenarios"
              ? "border-[#094cb2] text-[#094cb2] bg-blue-50/20"
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Cenários Reais</span>
          <span className="bg-blue-100 text-[#094cb2] text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
            6 Ativos
          </span>
        </button>

        <button
          onClick={() => setActiveTab("progress")}
          className={`px-5 py-3 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === "progress"
              ? "border-[#094cb2] text-[#094cb2] bg-blue-50/20"
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          <History className="w-4 h-4" />
          <span>Progresso & Histórico</span>
        </button>

        <button
          onClick={() => setActiveTab("vocabulary")}
          className={`px-5 py-3 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === "vocabulary"
              ? "border-[#094cb2] text-[#094cb2] bg-blue-50/20"
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          <BookMarked className="w-4 h-4" />
          <span>O Meu Vocabulário</span>
          <span className="bg-[#6d5e00]/10 text-[#6d5e00] text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
            {vocabulary.filter(item => !item.isMastered).length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("admin")}
          className={`px-5 py-3 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === "admin"
              ? "border-amber-600 text-amber-900 bg-amber-50"
              : "border-transparent text-stone-500 hover:text-stone-900"
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-amber-600" />
          <span>Painel Admin</span>
          <span className="bg-amber-200 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
            Pro
          </span>
        </button>

        <button
          onClick={() => setActiveTab("premium")}
          className={`px-5 py-3 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === "premium"
              ? "border-amber-500 text-amber-950 bg-amber-50"
              : "border-transparent text-amber-700 hover:text-amber-950 hover:bg-amber-50/50"
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-600 fill-amber-500" />
          <span>Premium R$ 20/mês</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${
            stats.isPremium ? "bg-emerald-100 text-emerald-800" : "bg-amber-200 text-amber-950"
          }`}>
            {stats.isPremium ? "Ativo 👑" : "Cakto"}
          </span>
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === "painel" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Free Chat spontaneous learning card */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-gradient-to-br from-[#fbfaf8] to-[#f5f3f0] border border-gray-100 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-sm">
              <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-blue-100 rounded-full blur-3xl opacity-50" />
              
              <div className="relative z-10 space-y-4">
                <span className="text-[10px] uppercase tracking-wider font-mono text-[#6d5e00] bg-amber-100/50 px-2.5 py-1 rounded-full font-bold">
                  Prática Espontânea
                </span>
                <h2 className="font-serif text-2xl md:text-3xl text-gray-900 tracking-tight max-w-lg leading-tight">
                  Fala com o tutor Gemini de forma livre sobre qualquer assunto
                </h2>
                <p className="text-sm text-gray-500 max-w-lg leading-relaxed font-sans">
                  Pratica diálogos abertos e dinâmicos. O tutor Gemini ajustará a complexidade da linguagem ao seu nível, fará perguntas envolventes e fornecerá correções gramaticais invisíveis na conversa.
                </p>
                <div className="pt-2">
                  <button
                    onClick={onStartFreeChat}
                    className="inline-flex items-center gap-2 bg-[#094cb2] hover:bg-blue-800 text-white px-6 py-3.5 rounded-2xl text-sm font-semibold shadow-lg shadow-blue-900/10 transition-all active:scale-[0.98] cursor-pointer"
                  >
                    Iniciar Conversa Livre
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Scenarios Preview Grid */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-serif text-xl text-gray-900">
                  Cenários Recomendados
                </h3>
                <button
                  onClick={() => setActiveTab("scenarios")}
                  className="text-xs font-semibold text-[#094cb2] hover:underline"
                >
                  Ver todos os 6 cenários ➔
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {SCENARIOS.slice(0, 2).map((scenario) => (
                  <button
                    key={scenario.id}
                    onClick={() => handleScenarioClick(scenario)}
                    className="bg-white hover:bg-[#fcfbfa] text-left p-5 rounded-2xl border border-gray-100 hover:border-gray-200 transition-all duration-200 hover:shadow-md hover:ring-2 hover:ring-[#094cb2]/5 group flex flex-col justify-between min-h-[150px] cursor-pointer"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between w-full">
                        <div className="p-2 w-fit rounded-xl bg-blue-50/80 text-[#094cb2]">
                          {getScenarioIcon(scenario.icon)}
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold font-sans ${getLevelBadgeClass(scenario.recommendedLevel)}`}>
                          {scenario.recommendedLevel}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-gray-900 group-hover:text-[#094cb2] transition-colors leading-snug">
                          {scenario.title}
                        </h4>
                        <p className="text-[11px] text-gray-500 leading-normal mt-1 line-clamp-2">
                          {scenario.description}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-gray-400 font-semibold tracking-wider uppercase mt-3">
                      Focar conversa ➔
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Stats sidebar widget */}
          <div className="space-y-6">
            <div className="bg-[#f5f3f0] rounded-3xl p-6 shadow-sm space-y-6 border border-gray-200/20">
              <h3 className="font-serif text-lg text-gray-900 border-b border-gray-200/50 pb-3">
                O Teu Painel de Progresso
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#fcfbfa] p-4 rounded-2xl border border-gray-100">
                  <span className="text-[10px] font-mono uppercase text-gray-400 block mb-0.5">Mensagens</span>
                  <span className="text-2xl font-serif font-bold text-gray-800">{stats.totalMessages}</span>
                </div>
                <div className="bg-[#fcfbfa] p-4 rounded-2xl border border-gray-100">
                  <span className="text-[10px] font-mono uppercase text-gray-400 block mb-0.5">Prática (Min)</span>
                  <span className="text-2xl font-serif font-bold text-gray-800">{stats.totalMinutes}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Próximo Nível</span>
                  <span className="font-mono text-[#6d5e00] font-semibold">{stats.xp % 100} / 100 XP</span>
                </div>
                <div className="w-full h-2 bg-[#ece9e4] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#094cb2] to-[#1d59b2] transition-all duration-500"
                    style={{ width: `${stats.xp % 100}%` }}
                  />
                </div>
                <p className="text-[10px] text-gray-400 leading-relaxed font-sans">
                  Conclui cenários ou envia mensagens para ganhar XP e subir de nível de forma consistente.
                </p>
              </div>
            </div>

            {/* Micro pedagogical quote */}
            <div className="bg-[#6d5e00]/5 rounded-3xl p-5 border border-[#6d5e00]/10">
              <h4 className="text-[10px] uppercase font-mono tracking-wider text-[#6d5e00] font-bold mb-1.5 flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                Segredo do Poliglota
              </h4>
              <p className="text-xs text-gray-600 leading-relaxed font-sans">
                Errar é o sinal mais puro de progresso. Cada frase estruturada que escreves treina o teu cérebro a pensar nativamente. Não te preocupes com a perfeição!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Dedicated Scenario List Grid */}
      {activeTab === "scenarios" && (
        <div className="space-y-6">
          <div className="max-w-2xl">
            <h2 className="font-serif text-2xl text-gray-900 tracking-tight">
              Simulações de Cenários Reais
            </h2>
            <p className="text-xs text-gray-500 leading-relaxed mt-1">
              Pratica situações reais de conversação e roleplay com a nossa IA. Cada cenário tem um objetivo prático específico para testar as tuas competências sociais.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {SCENARIOS.map((scenario) => {
              const isLocked = !stats.isPremium && !scenario.isFree;
              return (
                <div
                  key={scenario.id}
                  className={`bg-white rounded-3xl border transition-all duration-300 flex flex-col justify-between min-h-[300px] overflow-hidden ${
                    isLocked
                      ? "border-gray-200/60 opacity-90 shadow-sm"
                      : "border-gray-100 hover:border-blue-200 hover:shadow-lg hover:ring-4 hover:ring-blue-50/50"
                  }`}
                >
                  <div className="p-6 space-y-4">
                    {/* Scenario header badge details */}
                    <div className="flex items-center justify-between">
                      <div className={`p-3 rounded-2xl ${isLocked ? "bg-gray-100 text-gray-400" : "bg-blue-50 text-[#094cb2]"}`}>
                        {getScenarioIcon(scenario.icon)}
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider font-mono ${getLevelBadgeClass(scenario.recommendedLevel)}`}>
                          {scenario.recommendedLevel}
                        </span>
                        {scenario.isFree ? (
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold px-2 py-0.5 rounded-full font-sans">
                            Grátis
                          </span>
                        ) : (
                          <span className="bg-amber-50 text-amber-700 border border-amber-100 text-[10px] font-bold px-2 py-0.5 rounded-full font-sans flex items-center gap-0.5">
                            <Lock className="w-2.5 h-2.5 text-amber-600" />
                            Premium
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Scenario texts */}
                    <div>
                      <h3 className="font-serif text-base font-bold text-gray-900 mb-1.5 flex items-center gap-1.5">
                        {scenario.title}
                      </h3>
                      <p className="text-xs text-gray-500 leading-relaxed font-sans line-clamp-3">
                        {scenario.description}
                      </p>
                    </div>

                    {/* Objective description */}
                    <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-1">
                      <span className="text-[9px] uppercase tracking-wider font-bold text-gray-400 font-mono block">
                        Objetivo Prático do Cenário:
                      </span>
                      <p className="text-[11px] text-gray-700 font-sans leading-relaxed">
                        {scenario.objectivePt}
                      </p>
                    </div>
                  </div>

                  {/* Scenario action footer */}
                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-100/60 flex items-center justify-between">
                    {isLocked ? (
                      <button
                        onClick={onOpenUpgradeModal}
                        className="w-full flex items-center justify-center gap-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:opacity-95 text-white py-2.5 rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Desbloquear com Premium</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleScenarioClick(scenario)}
                        className="w-full flex items-center justify-center gap-1 bg-[#094cb2] hover:bg-blue-800 text-white py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
                      >
                        <span>Iniciar Simulação</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Translator & AI Practice Module */}
      {activeTab === "translator" && (
        <TranslatorModule onStartConversation={onStartFreeChat} />
      )}

      {/* Progress & Session Logs */}
      {activeTab === "progress" && (
        <ProgressDashboard
          stats={stats}
          vocabulary={vocabulary}
          onOpenUpgradeModal={onOpenUpgradeModal}
          simulatedHistory={simulatedHistory}
        />
      )}

      {/* Vocabulary Bank Screen */}
      {activeTab === "vocabulary" && (
        <VocabularyBank
          vocabulary={vocabulary}
          onToggleMastered={onToggleMastered}
          onRemoveItem={onRemoveItem}
        />
      )}

      {/* Admin Panel Screen */}
      {activeTab === "admin" && (
        <AdminDashboard />
      )}

      {/* Premium Subscription Screen */}
      {activeTab === "premium" && (
        <PremiumPage
          user={user || null}
          isPremium={stats.isPremium}
          onOpenAuth={onOpenAuth || (() => {})}
          onUpgradeSuccess={onUpgradeSuccess || (() => {})}
        />
      )}

      {/* Discrete bottom AdMob Banner (Frees only) */}
      <AdMobBanner isPremium={stats.isPremium} onUpgrade={onOpenUpgradeModal} />

    </div>
  );
}
