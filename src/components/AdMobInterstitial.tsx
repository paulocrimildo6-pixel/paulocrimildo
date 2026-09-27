import React, { useState, useEffect } from "react";
import { X, Sparkles, Trophy, Star, ShieldAlert } from "lucide-react";

interface AdMobInterstitialProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdMobInterstitial({ isOpen, onClose }: AdMobInterstitialProps) {
  const [secondsRemaining, setSecondsRemaining] = useState(3);
  const [canClose, setCanClose] = useState(false);

  // INSERIR AD UNIT ID REAIS DO ADMOB AQUI
  // Exemplo de ID de Produção: ca-app-pub-3940256099942544/1033173712
  const ADMOB_INTERSTITIAL_AD_UNIT_ID = "ca-app-pub-3940256099942544/1033173712"; // ID de Teste AdMob

  useEffect(() => {
    if (!isOpen) return;
    
    setSecondsRemaining(3);
    setCanClose(false);

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanClose(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-white font-sans animate-fade-in">
      
      {/* Top Controls Bar */}
      <div className="absolute top-6 right-6 flex items-center gap-3">
        {!canClose ? (
          <span className="bg-white/10 text-white/80 font-mono text-xs px-3 py-1.5 rounded-full border border-white/10">
            Pode saltar em {secondsRemaining}s
          </span>
        ) : (
          <button
            onClick={onClose}
            className="p-2.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer"
            id="close-interstitial-btn"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Ad Content Box */}
      <div className="w-full max-w-sm text-center space-y-8 animate-scale-up">
        <span className="text-[10px] font-mono tracking-widest uppercase text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20 inline-block">
          Publicidade • LingoConversa Premium
        </span>

        {/* Big Illustration */}
        <div className="relative mx-auto w-28 h-28 bg-gradient-to-tr from-amber-400 to-yellow-300 rounded-3xl flex items-center justify-center shadow-2xl shadow-amber-500/20 rotate-3 animate-pulse">
          <Sparkles className="w-14 h-14 text-slate-900" />
          <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white rounded-full p-1.5 shadow-md">
            <Trophy className="w-4 h-4" />
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="font-serif text-3xl font-bold text-gray-100 tracking-tight">
            Adeus Limites Diários!
          </h2>
          <p className="text-sm text-gray-300 leading-relaxed max-w-xs mx-auto">
            Garante prática ilimitada de 100% dos cenários reais sem nenhuma publicidade incomodativa.
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-left space-y-2.5">
          <div className="flex items-center gap-2.5 text-xs text-gray-200">
            <span className="text-amber-400">★</span>
            <span>Conversação ilimitada (sem limites de tempo)</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-gray-200">
            <span className="text-amber-400">★</span>
            <span>Todos os 6 cenários de simulação profissional</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-gray-200">
            <span className="text-amber-400">★</span>
            <span>Análise fonética ilimitada de pronúncia</span>
          </div>
        </div>

        {/* Action Button */}
        <div className="space-y-3">
          <button
            onClick={onClose}
            className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold text-sm rounded-2xl shadow-lg transition-all active:scale-[0.98]"
          >
            Continuar para o meu Resumo
          </button>
          <p className="text-[10px] text-gray-400">
            Pressiona para voltar à tua avaliação pedagógica pós-cenário.
          </p>
        </div>
      </div>

      {/* Code integration comments */}
      <span className="hidden">
        {/*
          Para integrar o Interstitial real com Capacitor AdMob:
          import { AdMob, AdOptions } from '@capacitor-community/admob';
          
          async function showInterstitial() {
            await AdMob.prepareInterstitial({
              adId: '${ADMOB_INTERSTITIAL_AD_UNIT_ID}',
              isTesting: true
            });
            await AdMob.showInterstitial();
          }
        */}
      </span>
    </div>
  );
}
