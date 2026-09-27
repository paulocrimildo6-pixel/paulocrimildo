import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  Check, 
  ArrowRight, 
  ShieldCheck, 
  Clock, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  Zap,
  Lock,
  MessageSquare,
  HelpCircle,
  BookOpen,
  History,
  TrendingUp,
  CreditCard
} from "lucide-react";
import { User } from "firebase/auth";

interface PremiumPageProps {
  user: User | null;
  isPremium: boolean;
  onOpenAuth: () => void;
  onUpgradeSuccess: () => void;
  onBackToApp?: () => void;
}

export default function PremiumPage({
  user,
  isPremium,
  onOpenAuth,
  onUpgradeSuccess,
  onBackToApp
}: PremiumPageProps) {
  const [checkoutUrl, setCheckoutUrl] = useState("https://chk.cakto.com.br/lingo-conversa-premium");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<"idle" | "checking" | "active" | "not_found">("idle");
  const [subscriptionDetails, setSubscriptionDetails] = useState<any>(null);
  const [pollCount, setPollCount] = useState(0);

  // Fetch checkout configuration from backend
  useEffect(() => {
    fetch("/api/config/checkout")
      .then((res) => res.json())
      .then((data) => {
        if (data.checkoutUrl) {
          setCheckoutUrl(data.checkoutUrl);
        }
      })
      .catch((err) => console.warn("Erro ao carregar URL do checkout:", err));
  }, []);

  // Check URL parameters on mount (e.g. ?status=pending or ?checkout=success)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const statusParam = params.get("status");
    const checkoutParam = params.get("checkout");

    if (statusParam === "pending" || checkoutParam === "success" || checkoutParam === "cakto") {
      setIsVerifying(true);
      setVerificationStatus("checking");
    }
  }, []);

  // Check current status from backend
  const checkSubscriptionStatus = async (silent = false) => {
    if (!user || !user.email) return;

    if (!silent) setVerificationStatus("checking");

    try {
      const res = await fetch(`/api/subscription/status?email=${encodeURIComponent(user.email)}`);
      if (res.ok) {
        const data = await res.json();
        setSubscriptionDetails(data);

        if (data.isPremium && data.subscription_status === "active") {
          setVerificationStatus("active");
          setIsVerifying(false);
          onUpgradeSuccess();
          return true;
        } else {
          if (!silent) {
            setVerificationStatus("not_found");
          }
        }
      }
    } catch (err) {
      console.error("Erro ao verificar assinatura:", err);
      if (!silent) setVerificationStatus("not_found");
    }
    return false;
  };

  // Automated polling when in verifying state
  useEffect(() => {
    let intervalId: any;
    if (isVerifying && user?.email && verificationStatus !== "active") {
      intervalId = setInterval(async () => {
        setPollCount((prev) => prev + 1);
        const active = await checkSubscriptionStatus(true);
        if (active) {
          clearInterval(intervalId);
        }
      }, 3500);
    }
    return () => clearInterval(intervalId);
  }, [isVerifying, user?.email, verificationStatus]);

  // Construct checkout URL with customer email pre-filled
  const getFullCheckoutUrl = () => {
    try {
      const url = new URL(checkoutUrl);
      if (user?.email) {
        url.searchParams.set("email", user.email);
      }
      if (user?.displayName) {
        url.searchParams.set("name", user.displayName);
      }
      return url.toString();
    } catch {
      if (user?.email) {
        return `${checkoutUrl}${checkoutUrl.includes("?") ? "&" : "?"}email=${encodeURIComponent(user.email)}`;
      }
      return checkoutUrl;
    }
  };

  const handleCheckoutClick = () => {
    if (!user) {
      onOpenAuth();
      return;
    }

    const finalUrl = getFullCheckoutUrl();
    // Set verifying state so when they return or switch tab, verification is waiting
    setIsVerifying(true);
    setVerificationStatus("checking");

    // Open real Cakto Checkout
    window.location.href = finalUrl;
  };

  const benefitsList = [
    { title: "Conversação com IA", desc: "Pratique fala e escrita ilimitadas com feedback inteligente." },
    { title: "Prática diária", desc: "Sem limites de tempo para você treinar sempre que quiser." },
    { title: "Correções dos seus erros", desc: "Correções gramaticais detalhadas e gentis a cada mensagem." },
    { title: "Explicações em português", desc: "Tudo explicado de forma simples, clara e didática." },
    { title: "Situações reais em inglês", desc: "Simulações de entrevistas, viagens, trabalho e dia a dia." },
    { title: "Histórico de conversas", desc: "Acesse e revise suas conversas e traduções a qualquer momento." },
    { title: "Acompanhamento da evolução", desc: "Acompanhe seu progresso, vocabulário e sequência de estudos." },
    { title: "Acesso Premium sem o limite do plano gratuito", desc: "Pratique sem interrupções nem restrições diárias." }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 font-sans animate-fade-in text-[#1a1a1a]">
      
      {/* Top Back Nav */}
      {onBackToApp && (
        <button
          onClick={onBackToApp}
          className="mb-6 inline-flex items-center gap-2 text-xs font-semibold text-stone-500 hover:text-stone-900 transition-colors cursor-pointer"
        >
          ← Voltar para o Lingo Conversa AI
        </button>
      )}

      {/* Hero Header */}
      <div className="text-center space-y-3 mb-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-900 text-xs font-bold tracking-wide uppercase">
          <Sparkles className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
          <span>Assinatura Mensal Recorrente</span>
        </div>

        <h1 className="font-serif text-3xl sm:text-5xl font-extrabold text-stone-900 tracking-tight">
          Lingo Conversa Premium
        </h1>

        <p className="text-base sm:text-xl text-stone-600 font-sans max-w-xl mx-auto">
          Seu inglês melhora quando você pratica.
        </p>

        {/* Pricing Badge */}
        <div className="pt-2 flex items-baseline justify-center gap-2">
          <span className="text-4xl sm:text-5xl font-extrabold text-[#094cb2] font-mono">
            R$ 20
          </span>
          <span className="text-stone-500 font-semibold text-lg">/mês</span>
        </div>
        <p className="text-xs text-stone-400">
          Cancele quando quiser diretamente no painel. Pagamento 100% seguro via Cakto.
        </p>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-xl overflow-hidden mb-8">
        
        {/* Verification Alert Banner (Requirement #13) */}
        {isVerifying && (
          <div className="bg-blue-50 border-b border-blue-100 p-6 text-center animate-fade-in">
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-[#094cb2] animate-spin">
                <RefreshCw className="w-5 h-5" />
              </div>

              <div>
                <h3 className="text-base font-bold text-stone-900 font-sans">
                  Estamos verificando sua assinatura...
                </h3>
                <p className="text-xs text-stone-600 max-w-md mx-auto mt-1 leading-relaxed">
                  O acesso Premium será liberado automaticamente assim que a confirmação do pagamento for recebida.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => checkSubscriptionStatus(false)}
                  className="px-4 py-2 bg-[#094cb2] text-white text-xs font-bold rounded-xl shadow-xs hover:bg-[#073c8f] active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Verificar Agora</span>
                </button>

                <button
                  onClick={() => setIsVerifying(false)}
                  className="px-4 py-2 bg-stone-100 text-stone-600 hover:text-stone-900 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                >
                  Fechar Aviso
                </button>
              </div>

              {verificationStatus === "not_found" && (
                <div className="mt-2 text-[11px] text-amber-800 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200/50">
                  Ainda não detectamos a confirmação da Cakto para o e-mail <strong>{user?.email}</strong>. Se você acabou de concluir o pagamento no PIX ou Cartão, aguarde alguns instantes enquanto o webhook é processado.
                </div>
              )}
            </div>
          </div>
        )}

        {/* If user is already active premium */}
        {isPremium && (
          <div className="bg-emerald-50 border-b border-emerald-100 p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-2">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-emerald-900 font-sans">
              Você já é assinante Premium! 👑
            </h3>
            <p className="text-xs text-emerald-700 max-w-md mx-auto mt-1">
              Seu acesso ilimitado com a IA está ativo. Pratique conversação livre, cenários da vida real e correções sem restrições.
            </p>
            {onBackToApp && (
              <button
                onClick={onBackToApp}
                className="mt-4 px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                Ir para o Treinador de Conversação
              </button>
            )}
          </div>
        )}

        <div className="p-6 sm:p-10">
          
          <div className="mb-8">
            <h2 className="text-lg font-bold text-stone-900 mb-4 font-sans flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              <span>O que está incluso no seu plano:</span>
            </h2>

            {/* List of Official Benefits */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {benefitsList.map((item, idx) => (
                <div 
                  key={idx}
                  className="flex items-start gap-3 p-3.5 rounded-2xl bg-stone-50 border border-stone-100/80 hover:bg-blue-50/30 hover:border-blue-100 transition-colors"
                >
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-stone-900">{item.title}</h3>
                    <p className="text-[11px] text-stone-500 leading-relaxed mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action CTA Section */}
          <div className="border-t border-stone-100 pt-8 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold font-mono text-stone-900">R$ 20,00</span>
                <span className="text-stone-500 text-xs">/mês recorrente</span>
              </div>
              <p className="text-[11px] text-stone-400 mt-0.5">
                {user ? `Conta associada: ${user.email}` : "Entre na sua conta para associar o plano."}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              {!isPremium ? (
                <button
                  onClick={handleCheckoutClick}
                  className="w-full sm:w-auto px-8 py-4 bg-[#094cb2] hover:bg-[#073c8f] active:scale-[0.98] text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-900/15 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <span>Assinar por R$ 20/mês</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={onBackToApp}
                  className="w-full sm:w-auto px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-sm shadow-md transition-all cursor-pointer"
                >
                  Continuar Praticando 👑
                </button>
              )}

              {user && !isPremium && (
                <button
                  onClick={() => {
                    setIsVerifying(true);
                    checkSubscriptionStatus(false);
                  }}
                  className="w-full sm:w-auto px-4 py-3.5 text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-2xl transition-all cursor-pointer"
                >
                  Já assinou? Verificar status
                </button>
              )}
            </div>
          </div>

          {/* Security & Guarantee Trust Badges */}
          <div className="mt-8 pt-6 border-t border-stone-100 flex flex-wrap items-center justify-center gap-6 text-[11px] text-stone-400 font-sans">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Checkout oficial Cakto
            </span>
            <span className="flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-stone-400" />
              Criptografia de ponta a ponta
            </span>
            <span className="flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-stone-400" />
              PIX ou Cartão em até 12x
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-stone-400" />
              Cancelamento sem burocracia
            </span>
          </div>

        </div>
      </div>

      {/* FAQ Accordion Section */}
      <div className="max-w-2xl mx-auto space-y-4 pt-4">
        <h3 className="text-center font-serif text-xl font-bold text-stone-800">
          Perguntas Frequentes
        </h3>

        <div className="bg-white rounded-2xl border border-stone-200/80 p-4 shadow-xs space-y-3 text-xs">
          <div>
            <h4 className="font-bold text-stone-900">Como funciona o pagamento de R$ 20/mês?</h4>
            <p className="text-stone-500 mt-1 leading-relaxed">
              O pagamento é processado com total segurança através da plataforma brasileira Cakto. É uma assinatura mensal recorrente que você pode cancelar a qualquer momento no seu painel ou através do suporte.
            </p>
          </div>

          <div className="border-t border-stone-100 pt-3">
            <h4 className="font-bold text-stone-900">Quando meu acesso Premium é liberado?</h4>
            <p className="text-stone-500 mt-1 leading-relaxed">
              O acesso é liberado instantaneamente assim que a Cakto nos envia a confirmação do pagamento via webhook. Se pagar via PIX ou Cartão, a liberação costuma ocorrer em poucos segundos.
            </p>
          </div>

          <div className="border-t border-stone-100 pt-3">
            <h4 className="font-bold text-stone-900">O que acontece se eu não assinar?</h4>
            <p className="text-stone-500 mt-1 leading-relaxed">
              Você pode continuar aproveitando o plano gratuito diariamente até o limite estabelecido de prática diária. O Premium é ideal para quem quer fluência rápida com conversas ilimitadas todos os dias.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
