import React from "react";
import { Sparkles, X } from "lucide-react";

interface AdMobBannerProps {
  isPremium: boolean;
  onUpgrade: () => void;
}

export default function AdMobBanner({ isPremium, onUpgrade }: AdMobBannerProps) {
  if (isPremium) return null;

  // INSERIR AD UNIT ID REAIS DO ADMOB AQUI
  // Exemplo de ID de Produção: ca-app-pub-3940256099942544/6300978111
  const ADMOB_BANNER_AD_UNIT_ID = "ca-app-pub-3940256099942544/6300978111"; // ID de Teste AdMob

  return (
    <div className="mt-8 mb-4 w-full flex flex-col items-center justify-center font-sans animate-fade-in">
      {/* Label indicating it is an advertisement */}
      <span className="text-[9px] uppercase tracking-wider text-gray-400 font-mono mb-1.5">
        Publicidade • AdMob Banner
      </span>

      {/* Ad content container */}
      <div 
        className="w-full max-w-lg bg-gray-50 border border-gray-100 hover:border-gray-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all hover:shadow-sm"
        id="admob-banner-viewport"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#094cb2] flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-[#094cb2] animate-pulse" />
          </div>
          <div className="text-left">
            <h4 className="text-xs font-bold text-gray-800 leading-snug">
              Aprende 5x mais rápido com o LingoConversa Premium!
            </h4>
            <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">
              Desbloqueia inteligência ilimitada, todos os cenários de roleplay e zero anúncios.
            </p>
          </div>
        </div>

        <button
          onClick={onUpgrade}
          className="shrink-0 bg-gradient-to-r from-amber-500 to-amber-600 hover:opacity-95 text-white text-[10px] font-bold px-4 py-2.5 rounded-xl shadow-md transition-all active:scale-[0.98]"
        >
          Remover Anúncios
        </button>
      </div>

      {/* Code integration comments */}
      <span className="hidden">
        {/*
          Para integrar o SDK real no Android/iOS (com React Native ou Capacitor):
          import { AdMob, BannerAdSize, BannerAdPosition } from '@capacitor-community/admob';
          
          AdMob.showBanner({
            adId: '${ADMOB_BANNER_AD_UNIT_ID}',
            adSize: BannerAdSize.ADAPTIVE_BANNER,
            position: BannerAdPosition.BOTTOM_CENTER,
            margin: 0
          });
        */}
      </span>
    </div>
  );
}
