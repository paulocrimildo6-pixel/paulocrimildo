import React, { useState, useEffect } from "react";
import { 
  X, 
  Check, 
  Sparkles, 
  ArrowRight, 
  RefreshCw, 
  ShieldCheck, 
  CreditCard, 
  Lock,
  CheckCircle2
} from "lucide-react";
import { auth } from "../lib/firebase";

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgradeSuccess: () => void;
}

export default function PremiumModal({ isOpen, onClose, onUpgradeSuccess }: PremiumModalProps) {
  const [checkoutUrl, setCheckoutUrl] = useState("https://chk.cakto.com.br/lingo-conversa-premium");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationFeedback, setVerificationFeedback] = useState<string | null>(null);

  const currentUser = auth.currentUser;

  useEffect(() => {
    fetch("/api/config/checkout")
      .then((res) => res.json())
      .then((data) => {
        if (data.checkoutUrl) {
          setCheckoutUrl(data.checkoutUrl);
        }
      })
      .catch((err) => console.warn("Erro ao buscar URL do checkout:", err));
  }, []);

  // Polling when user is in verifying state
  useEffect(() => {
    let intervalId: any;
    if (isVerifying && currentUser?.email) {
      intervalId = setInterval(async () => {
        try {
          const res = await fetch(`/api/subscription/status?email=${encodeURIComponent(currentUser.email!)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.isPremium && data.subscription_status === "active") {
              setIsVerifying(false);
              onUpgradeSuccess();
              onClose();
            }
          }
        } catch (e) {
          console.error(e);
        }
      }, 3500);
    }
    return () => clearInterval(intervalId);
  }, [isVerifying, currentUser?.email, onClose, onUpgradeSuccess]);

  if (!isOpen) return null;

  const handleSubscribe = () => {
    let target = checkoutUrl;
    if (currentUser?.email) {
      target += `${target.includes("?") ? "&" : "?"}email=${encodeURIComponent(currentUser.email)}`;
      if (currentUser.displayName) {
        target += `&name=${encodeURIComponent(currentUser.displayName)}`;
      }
    }

    setIsVerifying(true);
    setVerificationFeedback("Estamos verificando sua assinatura... O acesso Premium será liberado automaticamente assim que a confirmação do pagamento for recebida.");
    window.location.href = target;
  };

  const handleManualCheck = async () => {
    if (!currentUser?.email) {
      setVerificationFeedback("Faça login na sua conta para verificar a assinatura.");
      return;
    }

    setVerificationFeedback("Verificando status com o servidor...");
    try {
      const res = await fetch(`/api/subscription/status?email=${encodeURIComponent(currentUser.email)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.isPremium && data.subscription_status === "active") {
          setVerificationFeedback("Assinatura confirmada com sucesso! Liberando acesso Premium...");
          setTimeout(() => {
            onUpgradeSuccess();
            onClose();
          }, 1200);
        } else {
          setVerificationFeedback("Ainda não recebemos a confirmação da Cakto. Se acabou de pagar, aguarde alguns segundos enquanto o webhook é processado.");
        }
      }
    } catch {
      setVerificationFeedback("Erro ao conectar com o servidor. Tente novamente em instantes.");
    }
  };

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-sans">
      <div 
        className="relative w-full max-w-lg bg-slate-950 rounded-[2.5rem] p-6 sm:p-8 border border-amber-500/25 shadow-2xl overflow-hidden text-white"
        id="premium-modal-card"
      >
        {/* Glow Effects */}
        <div className="absolute -top-32 -left-32 w-72 h-72 bg-gradient-to-tr from-amber-500/15 to-yellow-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-72 h-72 bg-gradient-to-tr from-blue-500/15 to-purple-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {isVerifying ? (
          /* Verification State (Requirement #13) */
          <div className="py-6 text-center space-y-4 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center justify-center mx-auto animate-spin">
              <RefreshCw className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="font-serif text-2xl font-bold text-white">
                Estamos verificando sua assinatura...
              </h3>
              <p className="text-xs text-stone-300 max-w-sm mx-auto leading-relaxed">
                O acesso Premium será liberado automaticamente assim que a confirmação do pagamento for recebida.
              </p>
            </div>

            {verificationFeedback && (
              <div className="text-[11px] bg-slate-900 border border-white/10 p-3 rounded-xl text-amber-300 max-w-sm mx-auto">
                {verificationFeedback}
              </div>
            )}

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={handleManualCheck}
                className="w-full sm:w-auto px-6 py-3 bg-[#094cb2] hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Verificar Novamente</span>
              </button>

              <button
                onClick={() => setIsVerifying(false)}
                className="w-full sm:w-auto px-4 py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                Voltar à tela de planos
              </button>
            </div>
          </div>
        ) : (
          /* Presentation of Premium Subscription */
          <div className="space-y-6">
            
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-bold tracking-wider uppercase">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Assinatura Mensal Cakto</span>
              </div>

              <h2 className="font-serif text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200">
                Lingo Conversa Premium
              </h2>

              <p className="text-sm text-gray-300 font-sans">
                Seu inglês melhora quando você pratica.
              </p>
            </div>

            {/* Price Highlight */}
            <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-4 flex items-center justify-between text-left">
              <div>
                <span className="text-[10px] uppercase font-mono text-gray-400 font-bold block">
                  Plano Ilimitado
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-3xl font-extrabold text-amber-400 font-mono">R$ 20</span>
                  <span className="text-xs text-gray-400 font-medium">/mês</span>
                </div>
              </div>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-1 rounded-full font-bold">
                Recorrente
              </span>
            </div>

            {/* Benefits List */}
            <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
              <span className="text-[10px] uppercase font-mono font-bold text-gray-400 block mb-1">
                Benefícios Inclusos:
              </span>
              {benefits.map((b, idx) => (
                <div key={idx} className="flex items-center gap-2.5 text-xs text-gray-200 font-sans">
                  <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                  <span>{b}</span>
                </div>
              ))}
            </div>

            {/* Button */}
            <div className="space-y-3 pt-2">
              <button
                onClick={handleSubscribe}
                className="w-full py-4 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 hover:opacity-95 text-slate-950 font-extrabold text-sm rounded-2xl shadow-xl shadow-amber-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                id="modal-assinar-premium-btn"
              >
                <span>Assinar por R$ 20/mês</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  setIsVerifying(true);
                  handleManualCheck();
                }}
                className="w-full text-center text-xs text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                Já concluiu o pagamento na Cakto? Clique para verificar
              </button>

              <div className="flex items-center justify-center gap-4 text-[10px] text-gray-500 pt-1">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  Cakto Segura
                </span>
                <span className="flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Sem fidelidade
                </span>
                <span className="flex items-center gap-1">
                  <CreditCard className="w-3 h-3" />
                  PIX & Cartão
                </span>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
