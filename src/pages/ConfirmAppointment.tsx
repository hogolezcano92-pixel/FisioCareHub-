import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';
import { CheckCircle2, AlertCircle, Loader2, Calendar, ArrowRight } from 'lucide-react';

export default function ConfirmAppointment() {
  const [searchParams] = useSearchParams();
  const appointmentId = searchParams.get('id');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [appointmentData, setAppointmentData] = useState<any>(null);

  useEffect(() => {
    const confirm = async () => {
      if (!appointmentId) {
        setStatus('error');
        setMessage('ID de agendamento não fornecido ou inválido.');
        return;
      }

      try {
        // 1. Buscar o agendamento
        const { data: appointment, error: fetchError } = await supabase
          .from('agendamentos')
          .select('*, perfis:fisio_id(nome_completo)')
          .eq('id', appointmentId)
          .single();

        if (fetchError || !appointment) {
          console.error('Erro ao buscar agendamento:', fetchError);
          setStatus('error');
          setMessage('Agendamento não encontrado. Verifique o link e tente novamente.');
          return;
        }

        setAppointmentData(appointment);

        // 2. Se já estiver confirmado, apenas mostra sucesso
        if (appointment.status === 'confirmado') {
          setStatus('success');
          setMessage('Este agendamento já foi confirmado anteriormente.');
          return;
        }

        // 3. Atualizar o status para confirmado
        const { error: updateError } = await supabase
          .from('agendamentos')
          .update({ status: 'confirmado' })
          .eq('id', appointmentId);

        if (updateError) {
          throw updateError;
        }

        setStatus('success');
        setMessage('Agendamento confirmado com sucesso! O paciente será notificado.');
      } catch (err: any) {
        console.error('Erro na confirmação:', err);
        setStatus('error');
        setMessage('Ocorreu um erro ao processar a confirmação. Tente novamente mais tarde.');
      }
    };

    confirm();
  }, [appointmentId]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-8 md:p-12 rounded-[3rem] shadow-2xl border border-slate-100 max-w-lg w-full text-center"
      >
        {status === 'loading' && (
          <div className="space-y-6">
            <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto animate-pulse">
              <Loader2 className="animate-spin" size={40} />
            </div>
            <h1 className="text-2xl font-black text-slate-900">Confirmando Agendamento...</h1>
            <p className="text-slate-500">Aguarde um momento enquanto processamos sua solicitação.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-8">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 size={48} />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Tudo Certo!</h1>
              <p className="text-slate-600 font-medium">{message}</p>
            </div>

            {appointmentData && (
              <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 text-left space-y-4">
                <div className="flex items-center gap-3 text-slate-600">
                  <Calendar size={18} className="text-blue-600" />
                  <span className="text-sm font-bold">
                    {new Date(appointmentData.data_hora).toLocaleDateString('pt-BR')} às {new Date(appointmentData.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="pt-4 border-t border-slate-200">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Serviço</p>
                  <p className="text-lg font-black text-slate-900">{appointmentData.servico}</p>
                </div>
              </div>
            )}

            <Link
              to="/agenda"
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-xl shadow-blue-100"
            >
              Ver Minha Agenda
              <ArrowRight size={18} />
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-8">
            <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle size={48} />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Ops!</h1>
              <p className="text-slate-600 font-medium">{message}</p>
            </div>
            
            <Link
              to="/dashboard"
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800 transition-all"
            >
              Voltar ao Início
            </Link>
          </div>
        )}
      </motion.div>
    </div>
  );
}
