import React from "react";
import { X, Sparkles, Check, ArrowRight, Play } from "lucide-react";

interface DailyLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPremium: () => void;
  onWatchAd?: () => void;
}

export default function DailyLimitModal({
  isOpen,
  onClose,
  onOpenPremium,
  onWatchAd,
}: DailyLimitModalProps) {
  if (!isOpen) return null;

  const benefits = [
    "Conversação com IA",
    "Prática diária",
    "Correções dos seus erros",
    "Explicações em português",
    "Situações reais em inglês",
    "Histórico de conversas",
    "Acompanhamento da evolução",
    "Acesso Premium sem o limite do plano gratuito"
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in font-sans">
      <div 
        className="relative w-full max-w-md bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-2xl text-left border border-stone-200 overflow-hidden"
        id="daily-limit-modal-content"
      >
        {/* Soft background glow */}
        <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-blue-50/70 to-transparent pointer-events-none" />

        {/* Top Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon */}
        <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mb-4 shadow-xs">
          <Sparkles className="w-6 h-6 fill-amber-500 text-amber-600" />
        </div>

        {/* Title & Subtitle Required by Brief */}
        <div className="mb-4">
          <h3 className="font-serif text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight leading-tight">
            Desbloqueie o Lingo Conversa Premium
          </h3>
          <p className="text-sm font-medium text-[#094cb2] mt-1 font-sans">
            Pratique inglês conversando com IA todos os dias.
          </p>
        </div>

        {/* Price Card */}
        <div className="bg-stone-50 border border-stone-200/80 rounded-2xl p-3.5 mb-5 flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase tracking-wider font-mono font-bold text-stone-400 block">
              Preço
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl font-black text-stone-900 font-mono">R$ 20</span>
              <span className="text-xs font-semibold text-stone-500">/mês</span>
            </div>
          </div>
          <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2.5 py-1 rounded-full uppercase tracking-wide">
            Assinatura Recorrente
          </span>
        </div>

        {/* Benefits List */}
        <div className="space-y-2 mb-6 max-h-56 overflow-y-auto pr-1">
          <span className="text-[11px] uppercase tracking-wider font-mono font-bold text-stone-400 block mb-2">
            Benefícios:
          </span>
          {benefits.map((b, i) => (
            <div key={i} className="flex items-center gap-2.5 text-xs text-stone-700 font-sans">
              <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </div>
              <span>{b}</span>
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div className="space-y-2.5">
          <button
            onClick={onOpenPremium}
            className="w-full py-4 bg-[#094cb2] hover:bg-[#073c8f] text-white font-bold text-sm rounded-2xl shadow-lg shadow-blue-900/15 transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
            id="assinar-premium-limit-btn"
          >
            <span>Assinar Premium</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {onWatchAd && (
            <button
              onClick={onWatchAd}
              className="w-full py-2.5 text-xs font-semibold text-stone-500 hover:text-stone-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Play className="w-3 h-3 fill-stone-500" />
              <span>Ganhar 5 minutos extras hoje (Vídeo)</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
