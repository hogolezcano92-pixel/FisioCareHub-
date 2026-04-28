import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
  CreditCard, 
  Wallet, 
  Calendar, 
  Clock, 
  User, 
  Stethoscope,
  Loader2,
  ChevronLeft,
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';

export default function PaymentPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [appointment, setAppointment] = useState<any>(null);
  const [physio, setPhysio] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!id || !user) return;
      
      try {
        setLoading(true);
        // 1. Fetch appointment
        const { data: appData, error: appError } = await supabase
          .from('agendamentos')
          .select('*')
          .eq('id', id)
          .single();

        if (appError || !appData) {
          throw new Error('Agendamento não encontrado.');
        }

        if (appData.paciente_id !== user.id) {
          throw new Error('Você não tem permissão para acessar este pagamento.');
        }

        setAppointment(appData);

        // 2. Fetch physio details
        const { data: physioData, error: physioError } = await supabase
          .from('perfis')
          .select('nome_completo, especialidade')
          .eq('id', appData.fisio_id)
          .single();

        if (physioError) throw physioError;
        setPhysio(physioData);

      } catch (err: any) {
        console.error('Erro ao buscar dados:', err);
        toast.error(err.message || 'Erro ao carregar dados do pagamento');
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, user, navigate]);

  const handleProcessPayment = async () => {
    if (!appointment || !user) return;

    setPaymentLoading(true);
    try {
      // 1. Get user profile for Asaas info
      const { data: profile, error: profileError } = await supabase
        .from('perfis')
        .select('nome_completo, email, cpf, asaas_customer_id')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        throw new Error('Perfil não encontrado. Verifique seus dados.');
      }

      let customerId = profile.asaas_customer_id;

      // 2. Resolve Customer ID if not exists
      if (!customerId) {
        if (!profile.cpf) {
          toast.error('CPF necessário para faturamento. Atualize seu perfil.');
          navigate('/profile');
          return;
        }

        toast.info('Validando cadastro no gateway...');
        const resCust = await fetch('/api/asaas/create-payment', { // Using this as it has getOrCreate logic
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nome: profile.nome_completo,
            email: profile.email,
            cpf: profile.cpf,
            valor: appointment.valor,
            id_agendamento: appointment.id,
            parcelas: 1
          })
        });
        
        const dataCust = await resCust.json();
        if (!resCust.ok) throw new Error(dataCust.error || 'Erro ao validar cliente');
        
        // After this, asaas_customer_id should be updated or returned
        customerId = dataCust.customer; 
        
        // Update local profile to save customerId for future
        if (customerId) {
          await supabase.from('perfis').update({ asaas_customer_id: customerId }).eq('id', user.id);
        }
      }

      // 3. Call requested API /api/criar-pagamento
      const dueDate = new Date().toISOString().split('T')[0];
      
      const response = await fetch('/api/criar-pagamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          value: appointment.valor,
          dueDate,
          agendamentoId: appointment.id
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao gerar cobrança.');
      }

      if (data.invoiceUrl) {
        toast.success('Redirecionando para o pagamento seguro...');
        window.location.href = data.invoiceUrl;
      } else {
        throw new Error('Link de pagamento não retornado.');
      }

    } catch (err: any) {
      console.error('Erro no pagamento:', err);
      toast.error(err.message || 'Erro ao processar pagamento');
    } finally {
      setPaymentLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Carregando Detalhes...</p>
      </div>
    );
  }

  if (!appointment) return null;

  return (
    <div className="min-h-screen bg-slate-950 pb-20 pt-8 sm:pt-12 px-4">
      <div className="max-w-xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/appointments')}
            className="p-3 bg-white/5 text-slate-400 rounded-2xl hover:bg-white/10 transition-all border border-white/5"
          >
            <ChevronLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Pagamento da Consulta</h1>
            <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">Finalize seu agendamento</p>
          </div>
        </div>

        {/* Summary Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900/50 backdrop-blur-xl p-8 rounded-[3rem] border border-white/10 shadow-2xl space-y-8"
        >
          {/* Details Section */}
          <div className="space-y-6">
            <div className="flex items-start gap-4 p-4 bg-white/5 rounded-[2rem] border border-white/5">
              <div className="w-12 h-12 bg-blue-600/20 text-blue-400 rounded-2xl flex items-center justify-center flex-shrink-0">
                <Stethoscope size={24} />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Fisioterapeuta</p>
                <p className="text-white font-black text-lg">Dr. {physio?.nome_completo}</p>
                <p className="text-blue-400/80 text-xs font-bold">{physio?.especialidade}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-white/5 rounded-[2rem] border border-white/5 space-y-1">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar size={14} className="text-blue-400" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Data</span>
                </div>
                <p className="text-white font-black text-sm">
                  {new Date(appointment.data + 'T00:00:00').toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div className="p-4 bg-white/5 rounded-[2rem] border border-white/5 space-y-1">
                <div className="flex items-center gap-2 mb-1">
                  <Clock size={14} className="text-blue-400" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Horário</span>
                </div>
                <p className="text-white font-black text-sm">{appointment.hora.substring(0, 5)}</p>
              </div>
            </div>

            <div className="p-4 bg-white/5 rounded-[2rem] border border-white/5">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Serviço</p>
              <p className="text-white font-bold">{appointment.tipo}</p>
            </div>
          </div>

          {/* Value Section */}
          <div className="pt-8 border-t border-white/5 text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600/20 text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-500/30">
              <CheckCircle2 size={12} />
              Total a pagar
            </div>
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-slate-400 text-lg font-bold">R$</span>
              <span className="text-5xl font-black text-white tracking-tighter">
                {Number(appointment.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <p className="text-slate-500 text-xs font-medium">Você será redirecionado para o ambiente seguro do Asaas</p>
          </div>

          {/* Action Button */}
          <button 
            onClick={handleProcessPayment}
            disabled={paymentLoading}
            className="w-full py-5 bg-blue-600 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-900/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {paymentLoading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Wallet size={20} />
                Pagar Consulta
              </>
            )}
          </button>
        </motion.div>

        {/* Security Info */}
        <div className="grid grid-cols-2 gap-4 h-full">
           <div className="flex items-start gap-3 p-4 bg-white/5 rounded-[2rem] border border-white/5">
             <ShieldCheck size={20} className="text-blue-500 flex-shrink-0" />
             <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
               <strong className="text-slate-200 block mb-1">Pagamento Seguro</strong>
               Seus dados estão protegidos por criptografia de ponta a ponta.
             </p>
           </div>
           <div className="flex items-start gap-3 p-4 bg-white/5 rounded-[2rem] border border-white/5">
             <AlertCircle size={20} className="text-amber-500 flex-shrink-0" />
             <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
               <strong className="text-slate-200 block mb-1">Informação</strong>
               O agendamento só será confirmado após a compensação do pagamento.
             </p>
           </div>
        </div>
      </div>
    </div>
  );
}
