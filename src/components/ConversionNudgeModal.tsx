import React from "react";
import { X, Sparkles, Trophy, ArrowRight } from "lucide-react";

interface ConversionNudgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActivateTrial: () => void;
}

export default function ConversionNudgeModal({
  isOpen,
  onClose,
  onActivateTrial,
}: ConversionNudgeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in font-sans">
      <div 
        className="relative w-full max-w-sm bg-[#fcfbfa] rounded-[2.5rem] p-6 md:p-8 shadow-2xl text-center border border-amber-200/40 overflow-hidden"
        id="conversion-nudge-modal"
      >
        {/* Shiny gold ambient glows */}
        <div className="absolute -top-16 -left-16 w-32 h-32 bg-amber-200/20 rounded-full blur-2xl" />
        <div className="absolute -bottom-16 -right-16 w-32 h-32 bg-blue-100 rounded-full blur-2xl" />

        {/* Top Close icon */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-5">
          {/* Big trophy emoji or icon */}
          <div className="mx-auto w-14 h-14 bg-gradient-to-tr from-amber-50 to-yellow-100 text-amber-600 border border-amber-200/60 rounded-2xl flex items-center justify-center shadow-md animate-bounce">
            <Trophy className="w-7 h-7" />
          </div>

          {/* Titles */}
          <div>
            <h3 className="font-serif text-2xl font-bold text-gray-900 tracking-tight leading-snug">
              Estás no Caminho Certo!
            </h3>
            <p className="text-[10px] text-amber-600 font-mono font-bold tracking-widest uppercase mt-1">
              Conquista: 3 Cenários Concluídos! 🏆
            </p>
          </div>

          {/* Description */}
          <p className="text-xs text-gray-600 leading-relaxed font-sans">
            Estás a ir muito bem! Já dominaste 3 situações do mundo real de forma brilhante. 
            Experimenta <span className="font-bold text-gray-900">7 dias de Premium grátis</span> para desbloquear todo o teu potencial linguístico sem limites!
          </p>

          {/* CTA Button */}
          <div className="space-y-2.5 pt-2">
            <button
              onClick={onActivateTrial}
              className="w-full py-4 bg-gradient-to-r from-[#094cb2] to-blue-800 hover:opacity-95 text-white font-semibold text-xs rounded-2xl shadow-lg shadow-blue-500/10 transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300" />
              <span>Experimentar 7 Dias Grátis</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onClose}
              className="w-full py-2.5 text-xs text-gray-500 hover:text-gray-900 font-medium transition-colors cursor-pointer"
            >
              Talvez mais tarde
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
