import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { motion } from "motion/react";
import {
  ArrowUpRight,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  History,
  TrendingUp,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import TransferReceiptModal, {
  type TransferReceiptData,
} from "./TransferReceiptModal";

interface PhysioWithdrawalProps {
  userId: string;
  availableBalance: number;
  onSuccess?: () => void;
}

interface WithdrawalRequest {
  id: string;
  valor: number;
  status: "pendente" | "pago" | "recusado";
  created_at: string;
  updated_at?: string | null;
  pago_em?: string | null;
  processado_em?: string | null;
}

interface WithdrawalProfessionalProfile {
  nome_completo?: string | null;
  email?: string | null;
  crefito?: string | null;
  cpf_cnpj?: string | null;
}

const formatDateTimeBR = (date?: string | null) => {
  if (!date) return "—";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsedDate);
};

const getWithdrawalDisplayDate = (request: WithdrawalRequest) => {
  if (request.status === "pago") {
    return (
      request.pago_em ||
      request.processado_em ||
      request.updated_at ||
      request.created_at
    );
  }

  return request.created_at;
};

export default function PhysioWithdrawal({
  userId,
  availableBalance,
  onSuccess,
}: PhysioWithdrawalProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<WithdrawalRequest[]>([]);
  const [pendingRequest, setPendingRequest] =
    useState<WithdrawalRequest | null>(null);
  const [hasCpf, setHasCpf] = useState<boolean>(true);
  const [professionalProfile, setProfessionalProfile] =
    useState<WithdrawalProfessionalProfile | null>(null);
  const [selectedReceipt, setSelectedReceipt] =
    useState<TransferReceiptData | null>(null);

  useEffect(() => {
    checkCpfAndFetchHistory();
  }, [userId]);

  const checkCpfAndFetchHistory = async () => {
    try {
      setLoading(true);

      // Check for CPF
      const { data: profile } = await supabase
        .from("perfis")
        .select("nome_completo, email, crefito, cpf_cnpj")
        .eq("id", userId)
        .single();

      setHasCpf(!!profile?.cpf_cnpj);
      setProfessionalProfile(profile || null);

      await fetchWithdrawalHistory();
    } catch (err) {
      console.error("Erro ao verificar perfil:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWithdrawalHistory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("solicitacoes_saque")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data) {
        setHistory(data);
        const pending = data.find((r) => r.status === "pendente");
        setPendingRequest(pending || null);
      }
    } catch (err: any) {
      console.error("Erro ao buscar histórico de saques:", err);
      toast.error("Erro ao carregar histórico de saques");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestWithdrawal = async () => {
    if (availableBalance <= 0) {
      toast.error(
        "O saldo disponível deve ser maior que zero para solicitar saque.",
      );
      return;
    }

    if (pendingRequest) {
      toast.error("Você já possui uma solicitação de saque em análise.");
      return;
    }

    if (!hasCpf) {
      toast.error(
        "Você precisa cadastrar seu CPF no perfil para solicitar saques.",
      );
      return;
    }

    try {
      setSubmitting(true);
      const { data: withdrawalRequest, error } = await supabase
        .from("solicitacoes_saque")
        .insert({
          user_id: userId,
          valor: availableBalance,
          status: "pendente",
        })
        .select("id, user_id, valor, status, created_at")
        .single();

      if (error) throw error;

      // Notificação complementar para contas admin que usam a tabela pública de notificações.
      // A notificação principal e mais confiável deve ser criada no Supabase por trigger
      // em notificacoes_admin, pois RLS pode bloquear inserts do profissional para outros usuários.
      const { data: admins, error: adminsError } = await supabase
        .from("perfis")
        .select("id")
        .or("tipo_usuario.eq.admin,role.eq.admin");

      if (adminsError) {
        console.warn(
          "Não foi possível buscar admins para notificação de saque:",
          adminsError,
        );
      }

      if (admins && admins.length > 0) {
        const notifications = admins.map((admin) => ({
          user_id: admin.id,
          titulo: "Solicitação de saque",
          mensagem: `Nova solicitação de saque de R$ ${availableBalance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}.`,
          tipo: "withdrawal_request",
          link: "/admin/support?tab=saques",
          metadata: {
            user_id: userId,
            saque_id: withdrawalRequest?.id || null,
            valor: availableBalance,
          },
        }));

        const { error: notificationError } = await supabase
          .from("notificacoes")
          .insert(notifications);

        if (notificationError) {
          console.warn(
            "Saque criado, mas a notificação direta para admins foi bloqueada/falhou:",
            notificationError,
          );
        }
      }

      toast.success("Solicitação de saque enviada com sucesso!");
      toast.info("O pagamento será realizado manualmente após análise");

      await fetchWithdrawalHistory();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error("Erro ao solicitar saque:", err);
      toast.error("Erro ao processar solicitação de saque");
    } finally {
      setSubmitting(false);
    }
  };

  const buildTransferReceipt = (
    request: WithdrawalRequest,
  ): TransferReceiptData => ({
    id: request.id,
    professionalName: professionalProfile?.nome_completo || "Fisioterapeuta",
    professionalEmail: professionalProfile?.email || null,
    crefito: professionalProfile?.crefito || null,
    amount: Number(request.valor) || 0,
    status: request.status === "pago" ? "Repasse realizado" : request.status,
    method: "PIX / repasse administrativo",
    requestedAt: request.created_at,
    processedAt:
      request.pago_em ||
      request.processado_em ||
      request.updated_at ||
      request.created_at,
    period: "Saldo disponível solicitado",
    appointmentsCount: null,
    adminName: "Admin FisioCareHub",
    notes:
      "Comprovante gerado a partir do histórico de saques do fisioterapeuta.",
  });

  if (loading && history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="animate-spin text-blue-500" size={32} />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">
          Carregando saques...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header & Request Section */}
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600/20 text-blue-400 rounded-xl flex items-center justify-center border border-blue-500/30">
            <TrendingUp size={20} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-950 dark:text-white tracking-tight uppercase">
              Saques
            </h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
              Gerencie suas retiradas de saldo
            </p>
          </div>
        </div>

        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <div className="text-right hidden md:block">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              Saldo para Retirada
            </p>
            <p className="text-xl font-black text-slate-950 dark:text-white">
              R${" "}
              {availableBalance.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
              })}
            </p>
          </div>

          <button
            onClick={handleRequestWithdrawal}
            disabled={submitting || availableBalance <= 0 || !!pendingRequest}
            className="flex w-full items-center justify-center gap-2 rounded-[2rem] bg-blue-600 px-6 py-4 text-xs font-black uppercase tracking-[0.18em] text-white shadow-xl shadow-blue-900/20 transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto group"
          >
            {submitting ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <ArrowUpRight
                size={18}
                className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
              />
            )}
            Solicitar Saque
          </button>
        </div>
      </div>

      {!hasCpf && (
        <div className="flex flex-col gap-5 rounded-[2rem] border border-rose-200 bg-rose-50 p-5 dark:border-rose-500/20 dark:bg-rose-500/10 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 bg-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center">
              <UserCheck size={24} />
            </div>
            <div>
              <p className="text-sm font-black uppercase tracking-tight text-rose-700 dark:text-rose-400">
                CPF Obrigatório
              </p>
              <p className="max-w-md text-xs font-semibold text-slate-700 dark:text-slate-400">
                Para realizar saques, é necessário que seu CPF esteja cadastrado
                em seu perfil por motivos de segurança e tributação.
              </p>
            </div>
          </div>
          <a
            href="/profile?tab=profile_prof"
            className="px-6 py-3 bg-rose-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-rose-600 transition-all shadow-lg shadow-rose-900/20"
          >
            Completar Perfil
          </a>
        </div>
      )}

      {pendingRequest && (
        <div className="flex items-start gap-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-500/20 dark:bg-blue-600/10">
          <AlertCircle
            className="mt-0.5 flex-shrink-0 text-blue-600 dark:text-blue-400"
            size={18}
          />
          <div>
            <p className="text-xs font-black uppercase leading-relaxed tracking-widest text-blue-700 dark:text-blue-400">
              Você já possui uma solicitação de R${" "}
              {pendingRequest.valor.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
              })}{" "}
              em análise.
            </p>
            <p className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">
              As solicitações são processadas em até 48 horas úteis.
            </p>
          </div>
        </div>
      )}

      {/* History List */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 ml-1">
          <History size={16} className="text-slate-500" />
          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
            Histórico de Saques
          </h4>
        </div>

        {history.length === 0 ? (
          <div className="rounded-[2.5rem] border-2 border-dashed border-slate-300 bg-white p-12 text-center dark:border-white/5 dark:bg-transparent">
            <p className="text-slate-500 font-bold text-sm">
              Nenhum saque solicitado até o momento.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {history.map((request) => (
              <motion.div
                key={request.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex w-full max-w-full flex-col gap-4 overflow-hidden rounded-2xl border border-slate-300 bg-white p-4 shadow-sm shadow-slate-200/80 dark:border-white/10 dark:bg-white/5 dark:shadow-none sm:flex-row sm:items-center sm:justify-between sm:p-5"
              >
                <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      request.status === "pago"
                        ? "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-0"
                        : request.status === "recusado"
                          ? "bg-rose-50 text-rose-600 ring-1 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-0"
                          : "bg-blue-50 text-blue-600 ring-1 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-0"
                    }`}
                  >
                    {request.status === "pago" ? (
                      <CheckCircle2 size={20} />
                    ) : request.status === "recusado" ? (
                      <XCircle size={20} />
                    ) : (
                      <Clock size={20} />
                    )}
                  </div>
                  <div>
                    <p className="text-base font-black text-slate-950 dark:text-white">
                      R${" "}
                      {request.valor.toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-600 dark:text-slate-500">
                      {formatDateTimeBR(getWithdrawalDisplayDate(request))}
                    </p>
                  </div>
                </div>

                <div className="flex w-full flex-wrap items-center justify-start gap-2 sm:w-auto sm:justify-end">
                  <div
                    className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                      request.status === "pago"
                        ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/5 dark:text-emerald-400"
                        : request.status === "recusado"
                          ? "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/5 dark:text-rose-400"
                          : "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/5 dark:text-blue-400"
                    }`}
                  >
                    {request.status}
                  </div>

                  {request.status === "pago" && (
                    <button
                      onClick={() =>
                        setSelectedReceipt(buildTransferReceipt(request))
                      }
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700 transition-all hover:bg-emerald-600 hover:text-white dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300 sm:w-auto"
                      title="Ver comprovante de repasse"
                    >
                      <CheckCircle2 size={14} />
                      Comprovante
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <TransferReceiptModal
        isOpen={!!selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
        receipt={selectedReceipt}
      />
    </div>
  );
}
