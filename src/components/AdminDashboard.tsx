import React, { useState, useEffect } from "react";
import { 
  Users, 
  Search, 
  Download, 
  ShieldAlert, 
  ShieldCheck, 
  Trash2, 
  UserX, 
  UserCheck, 
  Globe, 
  TrendingUp, 
  Activity, 
  MessageSquare, 
  Languages, 
  RefreshCw,
  Lock,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  CreditCard,
  Zap,
  Play
} from "lucide-react";
import { db, UserProfileData } from "../lib/firebase";
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc
} from "firebase/firestore";

interface AdminDashboardProps {
  currentUserEmail?: string | null;
  onClose?: () => void;
}

export default function AdminDashboard({ currentUserEmail, onClose }: AdminDashboardProps) {
  const [users, setUsers] = useState<UserProfileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMethod, setFilterMethod] = useState<"all" | "google.com" | "password" | "premium">("all");
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Subscriptions & Webhook Events Data from Backend
  const [backendSubscriptions, setBackendSubscriptions] = useState<Record<string, any>>({});
  const [webhookEvents, setWebhookEvents] = useState<any[]>([]);
  const [activeAdminTab, setActiveAdminTab] = useState<"users" | "subscriptions" | "webhooks">("users");

  // Webhook Simulator State
  const [simEvent, setSimEvent] = useState<string>("purchase_approved");
  const [simEmail, setSimEmail] = useState<string>("");
  const [simLoading, setSimLoading] = useState(false);

  // Stats
  const [totalTranslations, setTotalTranslations] = useState(0);
  const [totalVoiceCount, setTotalVoiceCount] = useState(0);

  const fetchUsersData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Firestore users
      const usersSnap = await getDocs(collection(db, "users"));
      const loadedUsers: UserProfileData[] = [];
      let sumTranslations = 0;
      let sumVoice = 0;

      usersSnap.forEach((docSnap) => {
        const data = docSnap.data() as UserProfileData;
        loadedUsers.push(data);
        sumTranslations += data.translationCount || 0;
        sumVoice += data.voiceCount || 0;
      });

      // 2. Fetch backend subscriptions and events
      try {
        const subRes = await fetch("/api/admin/subscriptions");
        if (subRes.ok) {
          const subData = await subRes.json();
          setBackendSubscriptions(subData.subscriptions || {});
          setWebhookEvents(subData.recent_events || []);

          // Merge backend subscription status with users
          loadedUsers.forEach((u) => {
            if (u.email && subData.subscriptions[u.email.toLowerCase().trim()]) {
              const s = subData.subscriptions[u.email.toLowerCase().trim()];
              u.subscription_plan = s.subscription_plan;
              u.subscription_status = s.subscription_status;
              u.isPremium = s.subscription_plan === "premium" && s.subscription_status === "active";
            }
          });
        }
      } catch (subErr) {
        console.warn("Erro ao buscar assinaturas do backend:", subErr);
      }

      setUsers(loadedUsers);
      setTotalTranslations(sumTranslations);
      setTotalVoiceCount(sumVoice);
    } catch (e: any) {
      console.error("Erro ao carregar usuários no admin:", e);
      setStatusMessage({ type: "error", text: "Erro ao carregar lista de usuários do Firestore." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersData();
  }, []);

  // Filter users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      (u.displayName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesMethod = true;
    if (filterMethod === "google.com") {
      matchesMethod = u.loginMethod === "google.com";
    } else if (filterMethod === "password") {
      matchesMethod = u.loginMethod !== "google.com";
    } else if (filterMethod === "premium") {
      matchesMethod = !!u.isPremium;
    }

    return matchesSearch && matchesMethod;
  });

  // Calculate stats
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(now.getDate() - 7);

  const oneMonthAgo = new Date();
  oneMonthAgo.setDate(now.getDate() - 30);

  const activeToday = users.filter((u) => u.lastStudyDate === todayStr || (u.lastAccessAt && u.lastAccessAt.startsWith(todayStr))).length;
  
  const activeThisWeek = users.filter((u) => {
    if (!u.lastAccessAt) return false;
    return new Date(u.lastAccessAt) >= oneWeekAgo;
  }).length;

  const activeThisMonth = users.filter((u) => {
    if (!u.lastAccessAt) return false;
    return new Date(u.lastAccessAt) >= oneMonthAgo;
  }).length;

  const premiumCount = users.filter((u) => u.isPremium || u.subscription_plan === "premium").length;
  const projectedMRR = premiumCount * 20;

  // Toggle user block status
  const handleToggleBlock = async (userId: string, currentBlockedStatus?: boolean) => {
    try {
      const userRef = doc(db, "users", userId);
      const nextBlocked = !currentBlockedStatus;
      await updateDoc(userRef, { isBlocked: nextBlocked });

      setUsers((prev) =>
        prev.map((u) => (u.uid === userId ? { ...u, isBlocked: nextBlocked } : u))
      );

      setStatusMessage({
        type: "success",
        text: `Usuário ${nextBlocked ? "bloqueado" : "desbloqueado"} com sucesso.`
      });
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ type: "error", text: "Erro ao atualizar status do usuário." });
    }
  };

  // Delete user record from Firestore
  const handleDeleteUser = async (userId: string, userEmail?: string | null) => {
    if (!window.confirm(`Tem certeza que deseja excluir o usuário ${userEmail || userId}?`)) return;

    try {
      await deleteDoc(doc(db, "users", userId));
      setUsers((prev) => prev.filter((u) => u.uid !== userId));
      setStatusMessage({ type: "success", text: "Usuário removido da base de dados." });
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ type: "error", text: "Erro ao excluir registro de usuário." });
    }
  };

  // Webhook Simulator Handler
  const handleSimulateWebhook = async () => {
    if (!simEmail) {
      setStatusMessage({ type: "error", text: "Informe o e-mail do usuário para o teste de webhook." });
      return;
    }

    setSimLoading(true);
    try {
      const res = await fetch("/api/admin/simulate-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: simEvent,
          email: simEmail.toLowerCase().trim()
        })
      });

      const data = await res.json();
      if (res.ok) {
        setStatusMessage({
          type: "success",
          text: `Webhook Cakto '${simEvent}' processado com sucesso! Plano: ${data.result.subscription?.subscription_plan}, Status: ${data.result.subscription?.subscription_status}`
        });
        fetchUsersData();
      } else {
        setStatusMessage({ type: "error", text: data.error || "Erro ao simular webhook." });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Erro de rede ao simular webhook." });
    } finally {
      setSimLoading(false);
    }
  };

  // Export Users to CSV
  const exportToCSV = () => {
    if (users.length === 0) return;

    const headers = [
      "UID",
      "Nome",
      "Email",
      "Plano",
      "Status Assinatura",
      "Metodo Login",
      "Traducoes",
      "Conversas Voz",
      "Data Cadastro",
      "Ultimo Acesso",
      "Bloqueado"
    ];

    const rows = users.map((u) => [
      `"${u.uid}"`,
      `"${u.displayName || 'Sem nome'}"`,
      `"${u.email || 'Sem email'}"`,
      `"${u.isPremium ? 'Premium (R$ 20/mês)' : 'Gratuito'}"`,
      `"${u.subscription_status || 'none'}"`,
      `"${u.loginMethod || 'password'}"`,
      u.translationCount || 0,
      u.voiceCount || 0,
      `"${u.createdAt ? new Date(u.createdAt).toLocaleDateString('pt-BR') : 'N/A'}"`,
      `"${u.lastAccessAt ? new Date(u.lastAccessAt).toLocaleDateString('pt-BR') : u.lastStudyDate || 'N/A'}"`,
      u.isBlocked ? "Sim" : "Nao"
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `lingoconversa_usuarios_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 font-sans space-y-8 animate-fade-in text-[#1a1a1a]">
      
      {/* Header Bar */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-400/20 text-amber-300 rounded-full text-xs font-bold border border-amber-400/30">
            <Lock className="w-3.5 h-3.5" />
            Painel Administrativo Seguro
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight">
            Gestão, Assinaturas & Métricas
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm">
            Lingo Conversa AI • Sessão ativa: <span className="font-mono text-amber-300">{currentUserEmail || "Administrador"}</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchUsersData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-2xl border border-slate-700 transition-all active:scale-95 cursor-pointer"
            title="Atualizar dados"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Atualizar</span>
          </button>

          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#094cb2] hover:bg-blue-600 text-white text-xs font-bold rounded-2xl shadow-md transition-all active:scale-95 cursor-pointer"
            title="Exportar usuários em CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Status Alert Banner */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-xs font-semibold border ${
            statusMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-red-50 text-red-800 border-red-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-stone-400 hover:text-stone-700 cursor-pointer">✕</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-stone-200 gap-2">
        <button
          onClick={() => setActiveAdminTab("users")}
          className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            activeAdminTab === "users" ? "border-[#094cb2] text-[#094cb2]" : "border-transparent text-stone-500 hover:text-stone-900"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Usuários ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveAdminTab("subscriptions")}
          className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            activeAdminTab === "subscriptions" ? "border-amber-600 text-amber-900 bg-amber-50/50" : "border-transparent text-stone-500 hover:text-stone-900"
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-600" />
          <span>Assinaturas Cakto ({premiumCount} ativas)</span>
        </button>

        <button
          onClick={() => setActiveAdminTab("webhooks")}
          className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            activeAdminTab === "webhooks" ? "border-purple-600 text-purple-900 bg-purple-50/50" : "border-transparent text-stone-500 hover:text-stone-900"
          }`}
        >
          <Zap className="w-4 h-4 text-purple-600" />
          <span>Auditoria & Simulador Webhook</span>
        </button>
      </div>

      {/* Main KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Users */}
        <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Total Usuários</span>
            <div className="p-2 bg-blue-50 text-[#094cb2] rounded-xl">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-stone-900">{users.length}</p>
          <span className="text-[11px] text-stone-400 block font-mono">Contas cadastradas</span>
        </div>

        {/* Premium Subscribers & MRR */}
        <div className="bg-gradient-to-br from-amber-50 to-yellow-50/50 p-5 rounded-3xl border border-amber-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Assinantes Premium</span>
            <div className="p-2 bg-amber-200/60 text-amber-900 rounded-xl">
              <Sparkles className="w-5 h-5 fill-amber-500" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-amber-950">{premiumCount}</p>
          <span className="text-[11px] text-amber-800 font-semibold block font-mono">
            MRR: R$ {projectedMRR.toLocaleString("pt-BR")},00/mês
          </span>
        </div>

        {/* Active Users */}
        <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Ativos Hoje</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-stone-900">{activeToday}</p>
          <span className="text-[11px] text-stone-400 block font-mono">
            {activeThisWeek} semana • {activeThisMonth} mês
          </span>
        </div>

        {/* Translations & Voice Sessions */}
        <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Traduções & Voz</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <MessageSquare className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-stone-900">{totalTranslations + totalVoiceCount}</p>
          <span className="text-[11px] text-stone-400 block font-mono">
            {totalTranslations} traduções • {totalVoiceCount} voz
          </span>
        </div>
      </div>

      {/* TAB 1: USERS LIST */}
      {activeAdminTab === "users" && (
        <div className="bg-white rounded-3xl border border-stone-200 shadow-xs overflow-hidden space-y-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-stone-400" />
              <input
                type="text"
                placeholder="Pesquisar por nome ou e-mail de usuário..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:border-[#094cb2] focus:bg-white transition-all"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-stone-500">Filtrar:</span>
              <select
                value={filterMethod}
                onChange={(e: any) => setFilterMethod(e.target.value)}
                className="px-3 py-2 text-xs font-semibold bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-[#094cb2]"
              >
                <option value="all">Todos os Usuários</option>
                <option value="premium">Apenas Premium 👑</option>
                <option value="google.com">Login Google</option>
                <option value="password">Login E-mail/Senha</option>
              </select>
            </div>
          </div>

          {/* User Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50/80 text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                  <th className="p-3.5">Usuário</th>
                  <th className="p-3.5">Plano / Status</th>
                  <th className="p-3.5">Método Login</th>
                  <th className="p-3.5 text-center">Traduções</th>
                  <th className="p-3.5 text-center">Voz</th>
                  <th className="p-3.5">Data Cadastro</th>
                  <th className="p-3.5 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-xs sm:text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-stone-400">
                      <div className="w-6 h-6 border-2 border-[#094cb2] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      Carregando base de usuários...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-stone-400">
                      Nenhum usuário encontrado para esta pesquisa.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.uid} className={`hover:bg-stone-50/80 transition-all ${u.isBlocked ? "bg-red-50/30" : ""}`}>
                      <td className="p-3.5">
                        <div className="flex items-center gap-2.5">
                          {u.photoURL ? (
                            <img src={u.photoURL} alt={u.displayName || "Perfil"} className="w-8 h-8 rounded-full border border-stone-200 object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-[#094cb2] text-white font-bold text-xs flex items-center justify-center">
                              {(u.displayName || u.email || "U").charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-stone-900 flex items-center gap-1.5">
                              <span>{u.displayName || "Sem nome"}</span>
                              {u.isBlocked && (
                                <span className="text-[10px] font-mono bg-red-100 text-red-700 px-1.5 py-0.5 rounded-md font-bold">
                                  Bloqueado
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-stone-400 font-mono">{u.email || "Sem e-mail"}</p>
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5">
                        {u.isPremium || u.subscription_plan === "premium" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 bg-amber-100/80 px-2.5 py-0.5 rounded-full border border-amber-300">
                            👑 Premium (Ativo)
                          </span>
                        ) : u.subscription_status === "canceled" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-600 bg-stone-100 px-2.5 py-0.5 rounded-full">
                            Cancelado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-500 bg-stone-100 px-2.5 py-0.5 rounded-full">
                            Gratuito
                          </span>
                        )}
                      </td>

                      <td className="p-3.5">
                        {u.loginMethod === "google.com" ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                            Google
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-full">
                            E-mail/Senha
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 text-center font-bold font-mono text-stone-800">
                        {u.translationCount || 0}
                      </td>

                      <td className="p-3.5 text-center font-bold font-mono text-purple-700">
                        {u.voiceCount || 0}
                      </td>

                      <td className="p-3.5 text-stone-500 font-mono text-xs">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString("pt-BR") : "N/A"}
                      </td>

                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleToggleBlock(u.uid, u.isBlocked)}
                            className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                              u.isBlocked
                                ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                : "bg-amber-100 text-amber-800 hover:bg-amber-200"
                            }`}
                            title={u.isBlocked ? "Desbloquear Usuário" : "Bloquear Usuário"}
                          >
                            {u.isBlocked ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                          </button>

                          <button
                            onClick={() => handleDeleteUser(u.uid, u.email)}
                            className="p-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl transition-all cursor-pointer"
                            title="Excluir Usuário"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: SUBSCRIPTIONS AUDIT */}
      {activeAdminTab === "subscriptions" && (
        <div className="bg-white rounded-3xl border border-stone-200 p-6 space-y-6 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-stone-900">
                Auditoria de Assinaturas Cakto (R$ 20,00/mês)
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Status sincronizado via Webhooks com validação de idempotência e integridade.
              </p>
            </div>
            <span className="text-xs font-bold font-mono bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full">
              {premiumCount} Assinaturas Ativas
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-[11px] font-bold text-stone-500 uppercase">
                  <th className="p-3">E-mail do Cliente</th>
                  <th className="p-3">Plano</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">ID Assinatura Cakto</th>
                  <th className="p-3">Início</th>
                  <th className="p-3">Expira / Renova em</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {Object.keys(backendSubscriptions).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-stone-400">
                      Nenhuma assinatura registrada no backend ainda. Use o Simulador de Webhooks abaixo para criar assinaturas de teste.
                    </td>
                  </tr>
                ) : (
                  Object.values(backendSubscriptions).map((sub: any) => (
                    <tr key={sub.email} className="hover:bg-stone-50">
                      <td className="p-3 font-mono font-bold text-stone-900">{sub.email}</td>
                      <td className="p-3">
                        <span className="font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          {sub.subscription_plan}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          sub.subscription_status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-stone-100 text-stone-600"
                        }`}>
                          {sub.subscription_status}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-stone-500">{sub.cakto_subscription_id || "N/A"}</td>
                      <td className="p-3 font-mono text-stone-500">{sub.subscription_started_at ? new Date(sub.subscription_started_at).toLocaleDateString("pt-BR") : "N/A"}</td>
                      <td className="p-3 font-mono text-stone-500">{sub.subscription_expires_at ? new Date(sub.subscription_expires_at).toLocaleDateString("pt-BR") : "N/A"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: WEBHOOKS AUDIT & SIMULATOR */}
      {activeAdminTab === "webhooks" && (
        <div className="space-y-6">
          
          {/* Simulator Box */}
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              <h3 className="font-serif text-lg font-bold">
                Simulador de Eventos de Webhook da Cakto
              </h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
              Teste o fluxo oficial de confirmação, cancelamento e renovação de pagamento sem precisar realizar uma cobrança real. O endpoint <code className="bg-white/10 px-1.5 py-0.5 rounded font-mono text-amber-300">/api/webhooks/cakto</code> receberá o payload correspondente e atualizará a assinatura.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div>
                <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1">Evento Oficial:</label>
                <select
                  value={simEvent}
                  onChange={(e) => setSimEvent(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-xl p-2.5 focus:outline-none focus:border-amber-400"
                >
                  <option value="purchase_approved">purchase_approved (Compra aprovada - Ativa Premium)</option>
                  <option value="subscription_renewed">subscription_renewed (Renovação aprovada)</option>
                  <option value="subscription_canceled">subscription_canceled (Assinatura cancelada)</option>
                  <option value="refund">refund (Reembolso de compra)</option>
                  <option value="chargeback">chargeback (Contestação / Chargeback)</option>
                  <option value="purchase_refused">purchase_refused (Compra recusada)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1">E-mail do Cliente:</label>
                <input
                  type="email"
                  placeholder="exemplo@gmail.com"
                  value={simEmail}
                  onChange={(e) => setSimEmail(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-xl p-2.5 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={handleSimulateWebhook}
                  disabled={simLoading}
                  className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5 fill-slate-950" />
                  <span>{simLoading ? "Processando..." : "Disparar Webhook"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Webhook Log History */}
          <div className="bg-white rounded-3xl border border-stone-200 p-6 space-y-4 shadow-xs">
            <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-600" />
              <span>Eventos de Webhook Recebidos (Histórico de Idempotência)</span>
            </h3>

            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50 text-[11px] font-bold text-stone-500 uppercase sticky top-0">
                    <th className="p-3">ID do Evento</th>
                    <th className="p-3">Tipo do Evento</th>
                    <th className="p-3">Cliente</th>
                    <th className="p-3">Recebido em</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {webhookEvents.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-stone-400">
                        Nenhum evento registrado ainda. Dispare um evento no simulador acima para visualizar.
                      </td>
                    </tr>
                  ) : (
                    webhookEvents.map((ev: any) => (
                      <tr key={ev.id || ev.event_id} className="hover:bg-stone-50">
                        <td className="p-3 font-mono text-[11px] text-stone-600">{ev.event_id}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            ev.event_type === "purchase_approved" || ev.event_type === "subscription_renewed"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-red-100 text-red-800"
                          }`}>
                            {ev.event_type}
                          </span>
                        </td>
                        <td className="p-3 font-mono font-bold text-stone-800">{ev.user_email || "N/A"}</td>
                        <td className="p-3 font-mono text-stone-500">
                          {ev.processed_at ? new Date(ev.processed_at).toLocaleString("pt-BR") : "N/A"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
