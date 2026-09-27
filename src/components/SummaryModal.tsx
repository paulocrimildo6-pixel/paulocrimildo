import React, { useState, useEffect } from "react";
import { X, Sparkles, BookOpen, Check, ShieldAlert, Award, Lightbulb, ArrowRight } from "lucide-react";
import { SessionSummary } from "../types";

interface SummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  summaryData: SessionSummary | null;
  isPremium: boolean;
  loading: boolean;
}

export default function SummaryModal({
  isOpen,
  onClose,
  summaryData,
  isPremium,
  loading,
}: SummaryModalProps) {
  const [adSecondsLeft, setAdSecondsLeft] = useState<number>(3);
  const [showAd, setShowAd] = useState<boolean>(false);

  // Trigger mock interstitial ad if user is Free
  useEffect(() => {
    if (isOpen) {
      if (!isPremium) {
        setShowAd(true);
        setAdSecondsLeft(3);
      } else {
        setShowAd(false);
      }
    }
  }, [isOpen, isPremium]);

  // Interstitial Countdown Timer
  useEffect(() => {
    if (showAd && adSecondsLeft > 0) {
      const timer = setTimeout(() => {
        setAdSecondsLeft((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [showAd, adSecondsLeft]);

  if (!isOpen) return null;

  const handleSkipAd = () => {
    if (adSecondsLeft === 0) {
      setShowAd(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in font-sans">
      
      {/* 1. MOCK ADMOB INTERSTITIAL AD SCREEN */}
      {showAd ? (
        <div className="relative w-full max-w-md bg-[#111111] text-white rounded-3xl p-6 shadow-2xl text-center border border-gray-800 animate-scale-up">
          <div className="absolute top-4 right-4 bg-gray-900 px-3 py-1 rounded-full text-[10px] text-gray-400 uppercase tracking-widest border border-gray-800">
            Anúncio Google AdMob
          </div>

          <div className="py-12 px-4">
            <div className="w-16 h-16 bg-[#094cb2] text-white rounded-2xl flex items-center justify-center text-3xl font-bold font-serif mx-auto mb-6 shadow-lg shadow-[#094cb2]/30">
              LC
            </div>
            <h4 className="font-serif text-2xl tracking-tight leading-snug mb-2">
              Sente a Liberdade Premium
            </h4>
            <p className="text-sm text-gray-400 max-w-xs mx-auto mb-8">
              Remove anúncios, ganha tempo de conversa ilimitado com a IA e desbloqueia feedbacks de pronúncia premium!
            </p>

            <div className="bg-[#1a1a1a] p-4 rounded-2xl flex items-center justify-between text-left mb-8 border border-gray-800">
              <div>
                <span className="text-[10px] uppercase text-[#6d5e00] font-mono tracking-wider font-semibold">Oferta Especial</span>
                <div className="text-sm font-semibold mt-0.5">LingoConversa Premium</div>
              </div>
              <div className="text-right">
                <span className="text-xs text-gray-400 line-through">4,99 €</span>
                <div className="text-sm font-bold text-blue-400">Apenas 2,99 €/mês</div>
              </div>
            </div>

            <button
              onClick={handleSkipAd}
              disabled={adSecondsLeft > 0}
              className={`w-full py-4 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                adSecondsLeft > 0
                  ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                  : "bg-white text-gray-900 hover:bg-gray-100"
              }`}
            >
              {adSecondsLeft > 0 ? (
                <span>O relatório abre em {adSecondsLeft}s...</span>
              ) : (
                <span className="flex items-center gap-1">
                  Ver Relatório de Aprendizagem
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </button>
          </div>
        </div>
      ) : (
        
        /* 2. PEDAGOGICAL SUMMARY REPORT VIEW */
        <div className="relative w-full max-w-2xl bg-[#fcfbfa] rounded-3xl p-6 md:p-8 shadow-2xl overflow-y-auto max-h-[85vh] animate-scale-up text-left">
          
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 text-xs text-[#6d5e00] font-mono tracking-wider uppercase mb-3">
            <BookOpen className="w-4 h-4 text-[#094cb2]" />
            <span>Fim de Sessão • Relatório do Tutor Gemini</span>
          </div>

          <h2 className="font-serif text-2xl md:text-3xl text-gray-900 tracking-tight mb-6">
            Análise Pedagógica Personalizada
          </h2>

          {loading ? (
            <div className="py-20 text-center space-y-4">
              <div className="w-12 h-12 border-4 border-[#094cb2]/10 border-t-[#094cb2] rounded-full animate-spin mx-auto" />
              <p className="text-sm text-gray-500 font-serif italic">
                O Gemini está a analisar o teu histórico de conversação para extrair feedbacks pedagógicos...
              </p>
            </div>
          ) : summaryData ? (
            <div className="space-y-6">

              {/* Scenario Objective Completion Status */}
              {summaryData.objectiveCompleted !== undefined && (
                <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                  summaryData.objectiveCompleted 
                    ? "bg-emerald-50 text-emerald-800 border-emerald-100" 
                    : "bg-amber-50 text-amber-800 border-amber-100"
                }`}>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{summaryData.objectiveCompleted ? "🏆" : "⚠️"}</span>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wide font-mono">
                        {summaryData.objectiveCompleted ? "Objetivo Alcançado com Sucesso!" : "Objetivo Não Concluído"}
                      </h4>
                      <p className="text-[11px] leading-relaxed mt-0.5 opacity-90 font-sans">
                        {summaryData.objectiveCompleted 
                          ? "Parabéns! Cumpriste com sucesso todas as etapas e metas do teu cenário da vida real." 
                          : "Estiveste muito perto! Tenta praticar novamente para concluir todas as metas do cenário com clareza."}
                      </p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full shrink-0 ${
                    summaryData.objectiveCompleted ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                  }`}>
                    {summaryData.objectiveCompleted ? "Completo" : "Pendente"}
                  </span>
                </div>
              )}
              
              {/* General Feedback Text */}
              <div className="bg-[#f5f3f0] p-6 rounded-2xl relative overflow-hidden">
                <div className="absolute -top-12 -right-12 w-24 h-24 bg-blue-100 rounded-full blur-2xl" />
                <h4 className="text-xs uppercase font-mono tracking-wider text-[#6d5e00] mb-2 font-bold flex items-center gap-1.5">
                  <Award className="w-4 h-4" />
                  Avaliação do Tutor
                </h4>
                <p className="text-sm text-gray-700 leading-relaxed font-serif">
                  {summaryData.generalFeedback}
                </p>
              </div>

              {/* Strength Points & Vocabulary in a Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Strength Points */}
                <div className="bg-[#fbfaf8] p-5 rounded-2xl border border-gray-100">
                  <h4 className="text-xs uppercase font-mono tracking-wider text-[#094cb2] mb-3 font-semibold">
                    O que Correio Bem
                  </h4>
                  <ul className="space-y-2">
                    {summaryData.strengthPoints.map((pt, idx) => (
                      <li key={idx} className="flex gap-2 text-xs text-gray-600 leading-relaxed">
                        <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                        <span>{pt}</span>
                      </li>
                    ))}
                    {summaryData.strengthPoints.length === 0 && (
                      <li className="text-xs text-gray-400 italic">Nenhum ponto anotado.</li>
                    )}
                  </ul>
                </div>

                {/* Vocabulary learned */}
                <div className="bg-[#fbfaf8] p-5 rounded-2xl border border-gray-100">
                  <h4 className="text-xs uppercase font-mono tracking-wider text-[#6d5e00] mb-3 font-semibold">
                    Vocabulário Relevante
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {summaryData.vocabularyLearned.map((word, idx) => (
                      <span
                        key={idx}
                        className="text-xs px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                      >
                        {word}
                      </span>
                    ))}
                    {summaryData.vocabularyLearned.length === 0 && (
                      <span className="text-xs text-gray-400 italic">Nenhum vocabulário destacado.</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Common Mistakes */}
              <div>
                <h4 className="text-xs uppercase font-mono tracking-wider text-[#6d5e00] mb-3 font-semibold flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-[#094cb2]" />
                  Correções e Melhorias Recomendadas
                </h4>

                <div className="space-y-3">
                  {summaryData.commonMistakes.map((mistake, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-amber-50/50 border border-amber-100/50 space-y-1.5"
                    >
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="text-red-600 line-through">&ldquo;{mistake.errorPattern}&rdquo;</span>
                        <span className="text-gray-400 font-mono">➔</span>
                        <span className="text-green-700 font-semibold">&ldquo;{mistake.correction}&rdquo;</span>
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        <span className="font-semibold text-[#6d5e00]">Dica didática:</span> {mistake.explanation}
                      </p>
                    </div>
                  ))}
                  {summaryData.commonMistakes.length === 0 && (
                    <div className="text-xs text-green-600 bg-green-50 p-4 rounded-xl font-medium">
                      Parabéns! O tutor Gemini não detectou erros recorrentes durante esta prática. Excelente escrita e concordância!
                    </div>
                  )}
                </div>
              </div>

              {/* Suggested Next Steps */}
              <div className="bg-blue-50/40 p-5 rounded-2xl border border-blue-100/30">
                <h4 className="text-xs uppercase font-mono tracking-wider text-[#094cb2] mb-1.5 font-semibold flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4 text-[#6d5e00]" />
                  Próximos Passos
                </h4>
                <p className="text-xs text-gray-600 leading-relaxed">
                  {summaryData.suggestedNextSteps}
                </p>
              </div>

            </div>
          ) : (
            <div className="py-12 text-center text-gray-500 text-sm">
              Nenhum dado de relatório disponível. Conclua uma conversa primeiro.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
