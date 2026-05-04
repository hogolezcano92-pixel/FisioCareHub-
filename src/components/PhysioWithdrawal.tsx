import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';
import { 
  ArrowUpRight, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  AlertCircle,
  History,
  TrendingUp,
  UserCheck
} from 'lucide-react';
import { toast } from 'sonner';

interface PhysioWithdrawalProps {
  userId: string;
  availableBalance: number;
  onSuccess?: () => void;
}

interface WithdrawalRequest {
  id: string;
  valor: number;
  status: 'pendente' | 'pago' | 'recusado';
  created_at: string;
}

export default function PhysioWithdrawal({ userId, availableBalance, onSuccess }: PhysioWithdrawalProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<WithdrawalRequest[]>([]);
  const [pendingRequest, setPendingRequest] = useState<WithdrawalRequest | null>(null);
  const [hasCpf, setHasCpf] = useState<boolean>(true);

  useEffect(() => {
    checkCpfAndFetchHistory();
  }, [userId]);

  const checkCpfAndFetchHistory = async () => {
    try {
      setLoading(true);
      
      // Check for CPF
      const { data: profile } = await supabase
        .from('perfis')
        .select('cpf_cnpj')
        .eq('id', userId)
        .single();
      
      setHasCpf(!!profile?.cpf_cnpj);

      await fetchWithdrawalHistory();
    } catch (err) {
      console.error('Erro ao verificar perfil:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWithdrawalHistory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('solicitacoes_saque')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setHistory(data);
        const pending = data.find(r => r.status === 'pendente');
        setPendingRequest(pending || null);
      }
    } catch (err: any) {
      console.error('Erro ao buscar histórico de saques:', err);
      toast.error('Erro ao carregar histórico de saques');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestWithdrawal = async () => {
    if (availableBalance <= 0) {
      toast.error('O saldo disponível deve ser maior que zero para solicitar saque.');
      return;
    }

    if (pendingRequest) {
      toast.error('Você já possui uma solicitação de saque em análise.');
      return;
    }

    if (!hasCpf) {
      toast.error('Você precisa cadastrar seu CPF no perfil para solicitar saques.');
      return;
    }

    try {
      setSubmitting(true);
      const { error } = await supabase
        .from('solicitacoes_saque')
        .insert({
          user_id: userId,
          valor: availableBalance,
          status: 'pendente'
        });

      if (error) throw error;

      // 1. Fetch all admins to notify them
      const { data: admins } = await supabase
        .from('perfis')
        .select('id')
        .eq('tipo_usuario', 'admin');

      if (admins && admins.length > 0) {
        const notifications = admins.map(admin => ({
          user_id: admin.id,
          titulo: 'Solicitação de Saque',
          mensagem: `Nova solicitação de R$ ${availableBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
          tipo: 'withdrawal_request',
          link: '/admin',
          metadata: { user_id: userId }
        }));

        await supabase.from('notificacoes').insert(notifications);
      }

      toast.success('Solicitação de saque enviada com sucesso!');
      toast.info('O pagamento será realizado manualmente após análise');
      
      await fetchWithdrawalHistory();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Erro ao solicitar saque:', err);
      toast.error('Erro ao processar solicitação de saque');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="animate-spin text-blue-500" size={32} />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Carregando saques...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header & Request Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600/20 text-blue-400 rounded-xl flex items-center justify-center border border-blue-500/30">
            <TrendingUp size={20} />
          </div>
          <div>
            <h3 className="text-xl font-black text-white tracking-tight uppercase">Saques</h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Gerencie suas retiradas de saldo</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden md:block">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Saldo para Retirada</p>
            <p className="text-xl font-black text-white">R$ {availableBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
          
          <button
            onClick={handleRequestWithdrawal}
            disabled={submitting || availableBalance <= 0 || !!pendingRequest}
            className="flex items-center gap-2 px-6 py-4 bg-blue-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-blue-700 transition-all shadow-xl shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {submitting ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <ArrowUpRight size={18} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            )}
            Solicitar Saque
          </button>
        </div>
      </div>

      {!hasCpf && (
        <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-[2rem] flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center">
              <UserCheck size={24} />
            </div>
            <div>
              <p className="font-black text-rose-400 text-sm uppercase tracking-tight">CPF Obrigatório</p>
              <p className="text-xs text-slate-400 font-medium max-w-md">Para realizar saques, é necessário que seu CPF esteja cadastrado em seu perfil por motivos de segurança e tributação.</p>
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
        <div className="p-4 bg-blue-600/10 border border-blue-500/20 rounded-2xl flex items-start gap-4">
          <AlertCircle className="text-blue-400 flex-shrink-0 mt-0.5" size={18} />
          <div>
            <p className="text-xs font-black text-blue-400 uppercase tracking-widest leading-relaxed">
              Você já possui uma solicitação de R$ {pendingRequest.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em análise.
            </p>
            <p className="text-[10px] text-slate-400 font-medium">As solicitações são processadas em até 48 horas úteis.</p>
          </div>
        </div>
      )}

      {/* History List */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 ml-1">
          <History size={16} className="text-slate-500" />
          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Histórico de Saques</h4>
        </div>

        {history.length === 0 ? (
          <div className="p-12 text-center border-2 border-dashed border-white/5 rounded-[2.5rem]">
            <p className="text-slate-500 font-bold text-sm">Nenhum saque solicitado até o momento.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {history.map((request) => (
              <motion.div
                key={request.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    request.status === 'pago' ? 'bg-emerald-500/10 text-emerald-400' :
                    request.status === 'recusado' ? 'bg-rose-500/10 text-rose-400' :
                    'bg-blue-500/10 text-blue-400'
                  }`}>
                    {request.status === 'pago' ? <CheckCircle2 size={20} /> :
                     request.status === 'recusado' ? <XCircle size={20} /> :
                     <Clock size={20} />}
                  </div>
                  <div>
                    <p className="text-sm font-black text-white">R$ {request.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      {new Date(request.created_at).toLocaleDateString('pt-BR')} às {new Date(request.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                  request.status === 'pago' ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5' :
                  request.status === 'recusado' ? 'border-rose-500/30 text-rose-400 bg-rose-500/5' :
                  'border-blue-500/30 text-blue-400 bg-blue-500/5'
                }`}>
                  {request.status}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
