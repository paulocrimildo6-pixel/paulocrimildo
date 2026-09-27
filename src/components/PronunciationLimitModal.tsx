import React from "react";
import { X, Mic, Lock, Sparkles } from "lucide-react";

interface PronunciationLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPremium: () => void;
}

export default function PronunciationLimitModal({
  isOpen,
  onClose,
  onOpenPremium,
}: PronunciationLimitModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in font-sans">
      <div 
        className="relative w-full max-w-sm bg-[#121214] text-white rounded-[2rem] p-8 shadow-2xl text-center border border-zinc-800 overflow-hidden"
        id="pronunciation-limit-modal-content"
      >
        {/* Soft elegant gradient glow */}
        <div className="absolute -top-20 inset-x-0 h-48 bg-amber-500/10 blur-3xl pointer-events-none" />

        {/* Top Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Lock Mic Golden Badge */}
        <div className="relative mx-auto w-24 h-24 flex items-center justify-center bg-zinc-900 border border-amber-500/20 rounded-full mb-6 mt-2 shadow-inner">
          <div className="absolute inset-0 bg-amber-500/5 rounded-full animate-ping" />
          <div className="relative flex items-center justify-center">
            <Mic className="w-10 h-10 text-amber-400" />
            <Lock className="w-4 h-4 text-amber-400 absolute bottom-0 right-0 bg-zinc-900 rounded-md p-0.5 border border-amber-400/30" />
          </div>
        </div>

        {/* Title */}
        <h3 className="font-serif text-2xl font-bold text-amber-100 tracking-tight mb-3">
          Limite Diário Atingido
        </h3>

        {/* Informative Subtitle Description */}
        <p className="text-sm text-zinc-400 leading-relaxed px-1 mb-8 font-sans">
          Você usou todas as suas avaliações de voz por hoje. Atualize para o Premium para avaliações ilimitadas e continue praticando!
        </p>

        {/* CTA Button */}
        <button
          onClick={() => {
            onClose();
            onOpenPremium();
          }}
          className="w-full py-4 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-zinc-955 font-bold text-sm rounded-2xl shadow-lg shadow-amber-500/15 transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer text-black"
          id="upgrade-premium-btn-limit"
        >
          <Sparkles className="w-4 h-4 text-zinc-900 fill-zinc-900" />
          <span>Atualizar para Premium</span>
        </button>
      </div>
    </div>
  );
}
