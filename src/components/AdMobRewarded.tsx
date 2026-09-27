import React, { useState, useEffect } from "react";
import { X, Play, Trophy, Sparkles, AlertCircle } from "lucide-react";

interface AdMobRewardedProps {
  isOpen: boolean;
  onClose: () => void;
  onRewardEarned: () => void;
}

export default function AdMobRewarded({ isOpen, onClose, onRewardEarned }: AdMobRewardedProps) {
  const [phase, setPhase] = useState<"loading" | "watching" | "success">("loading");
  const [secondsRemaining, setSecondsRemaining] = useState(5);

  // INSERIR AD UNIT ID REAIS DO ADMOB AQUI
  // Exemplo de ID de Produção: ca-app-pub-3940256099942544/5224354917
  const ADMOB_REWARDED_AD_UNIT_ID = "ca-app-pub-3940256099942544/5224354917"; // ID de Teste AdMob

  useEffect(() => {
    if (!isOpen) return;

    setPhase("loading");
    setSecondsRemaining(5);

    // 1. Simulate video buffering/loading for 1 second
    const bufferTimeout = setTimeout(() => {
      setPhase("watching");
    }, 1000);

    return () => clearTimeout(bufferTimeout);
  }, [isOpen]);

  useEffect(() => {
    if (phase !== "watching") return;

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setPhase("success");
          onRewardEarned();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, onRewardEarned]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-white font-sans animate-fade-in">
      
      {/* 1. LOADING PHASE */}
      {phase === "loading" && (
        <div className="text-center space-y-4 animate-pulse">
          <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-300 font-mono">A carregar vídeo do patrocinador...</p>
        </div>
      )}

      {/* 2. WATCHING VIDEO PHASE */}
      {phase === "watching" && (
        <div className="w-full max-w-md bg-gray-900 border border-white/10 rounded-3xl p-8 text-center space-y-6 shadow-2xl relative overflow-hidden">
          {/* Mock Video Playing Background */}
          <div className="absolute inset-0 bg-gradient-to-b from-blue-950/20 to-black/40 pointer-events-none" />

          {/* Countdown indicator */}
          <div className="absolute top-4 right-4 bg-black/60 text-white font-mono text-xs px-3 py-1 rounded-full border border-white/10 flex items-center gap-1.5">
            <Play className="w-3 h-3 text-emerald-400 fill-emerald-400 animate-pulse" />
            <span>Recompensa em {secondsRemaining}s</span>
          </div>

          <div className="space-y-4 pt-4">
            <div className="w-16 h-16 bg-blue-500/10 text-blue-400 rounded-full flex items-center justify-center mx-auto animate-bounce">
              <Play className="w-8 h-8 fill-blue-400/20" />
            </div>
            
            <h3 className="font-serif text-2xl font-bold tracking-tight text-white">
              LingoConversa Patrocinador
            </h3>
            <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed">
              Não feches o anúncio para garantir os teus +5 minutos de prática extra gratuitos para hoje.
            </p>
          </div>

          {/* Simulated progress bar */}
          <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-gradient-to-r from-emerald-400 to-blue-500 h-full transition-all duration-1000 ease-linear"
              style={{ width: `${((5 - secondsRemaining) / 5) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* 3. SUCCESS / REWARD AWARDED PHASE */}
      {phase === "success" && (
        <div className="w-full max-w-sm bg-gray-900 border border-white/10 rounded-3xl p-6 text-center space-y-6 shadow-2xl animate-scale-up">
          <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-lg">
            <Trophy className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h3 className="font-serif text-2xl font-bold text-white tracking-tight">
              Tempo Adicionado!
            </h3>
            <p className="text-sm text-gray-300">
              Obrigado por apoiar a nossa comunidade! Ganhaste <span className="text-emerald-400 font-extrabold">+5 Minutos</span> de conversação livre adicionais.
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:opacity-95 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-4 h-4 fill-slate-900" />
            <span>Começar a Conversar</span>
          </button>
        </div>
      )}

      {/* Code integration comments */}
      <span className="hidden">
        {/*
          Para integrar o Rewarded real com Capacitor AdMob:
          import { AdMob, RewardItem } from '@capacitor-community/admob';
          
          async function showRewarded() {
            await AdMob.prepareRewarded({
              adId: '${ADMOB_REWARDED_AD_UNIT_ID}',
              isTesting: true
            });
            
            AdMob.addListener('onRewardedVideoAdRewarded', (info: RewardItem) => {
              // Adicionar +5 minutos
            });
            
            await AdMob.showRewarded();
          }
        */}
      </span>
    </div>
  );
}
