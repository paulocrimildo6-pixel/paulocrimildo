import React, { useState } from "react";
import { 
  auth, 
  googleProvider, 
  getFriendlyAuthErrorMessage, 
  syncUserProfile 
} from "../lib/firebase";
import { 
  signInWithPopup, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail, 
  sendEmailVerification,
  updateProfile 
} from "firebase/auth";
import { 
  Mail, 
  Lock, 
  User as UserIcon, 
  ArrowRight, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  Globe 
} from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess?: () => void;
}

export default function AuthModal({ isOpen, onClose, onAuthSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  
  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // States
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const resetForm = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setEmail("");
    setPassword("");
    setName("");
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await signInWithPopup(auth, googleProvider);
      await syncUserProfile(res.user);
      onAuthSuccess?.();
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(getFriendlyAuthErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (mode === "register") {
        if (!name.trim()) {
          throw new Error("Por favor, digite seu nome completo.");
        }
        if (password.length < 6) {
          throw new Error("A senha deve conter pelo menos 6 caracteres.");
        }

        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(cred.user, { displayName: name.trim() });
        
        // Send email verification
        try {
          await sendEmailVerification(cred.user);
        } catch (verifErr) {
          console.warn("Não foi possível enviar e-mail de verificação:", verifErr);
        }

        await syncUserProfile(cred.user);
        setSuccessMessage("Conta criada com sucesso! Enviamos um e-mail de verificação para a sua caixa de entrada.");
        setTimeout(() => {
          onAuthSuccess?.();
          onClose();
        }, 1500);

      } else if (mode === "login") {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        await syncUserProfile(cred.user);
        onAuthSuccess?.();
        onClose();

      } else if (mode === "forgot") {
        if (!email.trim()) {
          throw new Error("Digite seu e-mail para receber a redefinição de senha.");
        }
        await sendPasswordResetEmail(auth, email.trim());
        setSuccessMessage("Link de redefinição de senha enviado para o seu e-mail. Verifique sua caixa de entrada.");
      }
    } catch (err: any) {
      console.error(err);
      const msg = err.code ? getFriendlyAuthErrorMessage(err.code) : err.message;
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden">
        {/* Top Decorative Gradient */}
        <div className="bg-gradient-to-r from-[#094cb2] via-[#0b5cd9] to-teal-600 p-6 text-white text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white rounded-full bg-black/10 hover:bg-black/20 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
            <Globe className="w-7 h-7 text-amber-300" />
          </div>

          <h3 className="text-xl font-serif font-bold tracking-tight">
            LingoConversa AI
          </h3>
          <p className="text-xs text-blue-100 mt-1">
            Sua conta para aprender qualquer idioma com Inteligência Artificial
          </p>
        </div>

        <div className="p-6 space-y-5">
          {/* Mode Switcher Tabs */}
          {mode !== "forgot" && (
            <div className="flex bg-stone-100 p-1 rounded-2xl border border-stone-200/80">
              <button
                type="button"
                onClick={() => { setMode("login"); resetForm(); }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                  mode === "login"
                    ? "bg-white text-[#094cb2] shadow-sm"
                    : "text-stone-500 hover:text-stone-800"
                }`}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => { setMode("register"); resetForm(); }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                  mode === "register"
                    ? "bg-white text-[#094cb2] shadow-sm"
                    : "text-stone-500 hover:text-stone-800"
                }`}
              >
                Criar Conta
              </button>
            </div>
          )}

          {/* Google Authentication Button */}
          {mode !== "forgot" && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full py-3 px-4 bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 font-bold rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-3 shadow-sm hover:shadow transition-all cursor-pointer disabled:opacity-50"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continuar com Google</span>
              </button>

              <div className="relative flex items-center justify-center">
                <div className="border-t border-stone-200 w-full" />
                <span className="bg-white px-3 text-[11px] font-bold text-stone-400 uppercase tracking-wider absolute">
                  Ou com e-mail
                </span>
              </div>
            </div>
          )}

          {/* Form Header for Forgot Password */}
          {mode === "forgot" && (
            <div className="text-center space-y-1">
              <h4 className="text-base font-bold text-stone-900">Redefinir Senha</h4>
              <p className="text-xs text-stone-500">
                Digite seu e-mail cadastrado e enviaremos um link de recuperação.
              </p>
            </div>
          )}

          {/* Alert Messages */}
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2.5 text-red-700 text-xs animate-fadeIn">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-emerald-800 text-xs animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Email / Password Form */}
          <form onSubmit={handleEmailSubmit} className="space-y-3.5">
            {mode === "register" && (
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-stone-600 uppercase tracking-wider block">
                  Nome Completo
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="Seu nome"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 text-xs sm:text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-[#094cb2] focus:bg-white transition-all"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-stone-600 uppercase tracking-wider block">
                E-mail
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  placeholder="seu.email@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 text-xs sm:text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-[#094cb2] focus:bg-white transition-all"
                />
              </div>
            </div>

            {mode !== "forgot" && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-stone-600 uppercase tracking-wider block">
                    Senha
                  </label>
                  {mode === "login" && (
                    <button
                      type="button"
                      onClick={() => { setMode("forgot"); resetForm(); }}
                      className="text-xs font-semibold text-[#094cb2] hover:underline"
                    >
                      Esqueci minha senha
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 text-xs sm:text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-[#094cb2] focus:bg-white transition-all"
                  />
                </div>
              </div>
            )}

            {/* Primary Action Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#094cb2] hover:bg-[#073c8f] text-white font-bold rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-95 disabled:opacity-50 mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Aguarde...</span>
                </>
              ) : (
                <>
                  <span>
                    {mode === "login"
                      ? "Entrar na Conta"
                      : mode === "register"
                      ? "Criar Minha Conta"
                      : "Enviar Link de Recuperação"}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer Back Link for Forgot mode */}
          {mode === "forgot" && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => { setMode("login"); resetForm(); }}
                className="text-xs font-bold text-[#094cb2] hover:underline"
              >
                ← Voltar para a tela de Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
