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
  AlertCircle,
  Zap
} from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';

import { cn } from '../lib/utils';

export default function PaymentPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [appointment, setAppointment] = useState<any>(null);
  const [physio, setPhysio] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'asaas'>('stripe');
  const [asaasMethod, setAsaasMethod] = useState<'PIX' | 'BOLETO'>('PIX');

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
    if (!appointment || !user || !physio) return;

    setPaymentLoading(true);
    try {
      // 1. Get user profile for necessary info
      const { data: profile, error: profileError } = await supabase
        .from('perfis')
        .select('id, nome_completo, email, telefone')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        throw new Error('Perfil não encontrado. Verifique seus dados.');
      }

      if (paymentMethod === 'stripe') {
        // Stripe Logic (Edge Function)
        const { config } = await import('../config/api');
        const supabaseUrl = config.supabaseUrl.replace(/\/$/, '');
        const url = `${supabaseUrl}/functions/v1/create-checkout-session`;

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': config.supabaseAnonKey,
            'Authorization': `Bearer ${config.supabaseAnonKey}`
          },
          body: JSON.stringify({
            user_id: user.id,
            email: profile.email,
            plan: 'appointment',
            type: 'appointment',
            service_name: appointment.tipo || 'Atendimento de Fisioterapia',
            amount: Number(appointment.valor),
            appointment_id: appointment.id
          })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Erro ao gerar checkout Stripe.');
        
        if (data.url) {
          // Record pending payment for Stripe
          await supabase.from('pagamentos').upsert({
            external_id: data.id || data.session_id,
            user_id: user.id,
            external_reference: appointment.id,
            amount: Number(appointment.valor),
            status: 'pending',
            gateway: 'stripe',
            method: 'credit_card'
          }, { onConflict: 'external_id' });
          
          window.location.href = data.url;
        } else {
          throw new Error('URL de checkout Stripe não retornada.');
        }

      } else {
        // Asaas Logic (Server API)
        const payload = {
          name: profile.nome_completo,
          email: profile.email,
          value: Number(appointment.valor),
          appointmentId: appointment.id,
          phone: profile.telefone,
          user_id: user.id, // kept for internal tracking if needed
          billingType: asaasMethod
        };

        console.log("Dados enviados para Asaas:", payload);

        const response = await fetch('/api/asaas/create-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Erro ao gerar pagamento Asaas.');

        const redirectUrl = data.invoiceUrl || data.url || data.bankSlipUrl;

        if (redirectUrl) {
          toast.success('Redirecionando para o pagamento via Asaas...');
          window.location.href = redirectUrl;
        } else {
          throw new Error('URL de pagamento Asaas não retornada.');
        }
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
            <h1 className="text-2xl font-black text-white tracking-tight">Finalizar agendamento</h1>
            <p className="text-blue-500 text-sm font-bold uppercase tracking-widest">FisioCareHub</p>
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
                <User size={24} />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Fisioterapeuta</p>
                <p className="text-white font-black text-lg">Dr. {physio?.nome_completo}</p>
                <p className="text-blue-400/80 text-xs font-bold">{physio?.especialidade}</p>
              </div>
            </div>

            <div className="p-4 bg-white/5 rounded-[2rem] border border-white/5">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Serviço</p>
              <p className="text-white font-bold">{appointment.tipo}</p>
            </div>

            {appointment.data && appointment.hora && (
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
            )}
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
          </div>

          {/* Payment Method Selection */}
          <div className="space-y-4">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Escolha a forma de pagamento</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button 
                onClick={() => setPaymentMethod('stripe')}
                className={cn(
                  "p-4 rounded-[1.5rem] border transition-all flex flex-col items-center gap-2",
                  paymentMethod === 'stripe' 
                    ? "bg-blue-600/10 border-blue-500/50 text-blue-400" 
                    : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10"
                )}
              >
                <CreditCard size={24} />
                <span className="text-xs font-black uppercase tracking-widest">Cartão de Crédito</span>
                <span className="text-[8px] font-bold opacity-60">(Stripe)</span>
              </button>

              <button 
                onClick={() => setPaymentMethod('asaas')}
                className={cn(
                  "p-4 rounded-[1.5rem] border transition-all flex flex-col items-center gap-2",
                  paymentMethod === 'asaas' 
                    ? "bg-blue-600/10 border-blue-500/50 text-blue-400" 
                    : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10"
                )}
              >
                <Zap size={24} className="text-yellow-400" />
                <span className="text-xs font-black uppercase tracking-widest text-center">PIX / Boleto</span>
                <span className="text-[8px] font-bold opacity-60">(Asaas)</span>
              </button>
            </div>

            {paymentMethod === 'asaas' && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-white/5 rounded-2xl p-2 flex gap-2 border border-white/5"
              >
                <button
                  type="button"
                  onClick={() => setAsaasMethod('PIX')}
                  className={cn(
                    "flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                    asaasMethod === 'PIX' ? "bg-blue-600 text-white" : "text-slate-500 hover:text-slate-300"
                  )}
                >
                  Pagar com PIX
                </button>
                <button
                  type="button"
                  onClick={() => setAsaasMethod('BOLETO')}
                  className={cn(
                    "flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                    asaasMethod === 'BOLETO' ? "bg-blue-600 text-white" : "text-slate-500 hover:text-slate-300"
                  )}
                >
                  Pagar com Boleto
                </button>
              </motion.div>
            )}
            
            <p className="text-slate-500 text-center text-[10px] font-medium italic">Ambiente seguro e processamento imediato.</p>
          </div>

          {/* Action Button */}
          <div className="space-y-3">
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
                  Finalizar pagamento
                </>
              )}
            </button>
            <p className="text-center text-[10px] font-black text-slate-500 uppercase tracking-widest">
              Pagamento seguro e criptografado
            </p>
          </div>
        </motion.div>

        {/* Security Info */}
        <div className="flex flex-col gap-4">
           <div className="flex items-center justify-center gap-3 p-6 bg-white/5 rounded-[2rem] border border-white/5 text-center">
             <AlertCircle size={20} className="text-blue-500 flex-shrink-0" />
             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
               O agendamento será confirmado automaticamente após a compensação do pagamento.
             </p>
           </div>
        </div>
      </div>
    </div>
  );
}
