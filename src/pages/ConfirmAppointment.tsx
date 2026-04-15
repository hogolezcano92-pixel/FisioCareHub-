import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';
import { 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Calendar, 
  ArrowRight, 
  User, 
  MapPin, 
  Phone, 
  Clock, 
  FileText,
  Check
} from 'lucide-react';
import { toast } from 'sonner';

export default function ConfirmAppointment() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const appointmentId = searchParams.get('id');
  const [status, setStatus] = useState<'loading' | 'pending' | 'confirming' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [appointmentData, setAppointmentData] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!appointmentId) {
        setStatus('error');
        setMessage('ID de agendamento não fornecido ou inválido.');
        return;
      }

      try {
        // Buscar o agendamento com os dados do paciente
        const { data: appointment, error: fetchError } = await supabase
          .from('agendamentos')
          .select(`
            *,
            paciente:perfis!paciente_id (
              id,
              nome_completo,
              email,
              avatar_url,
              telefone,
              endereco,
              plano
            )
          `)
          .eq('id', appointmentId)
          .single();

        if (fetchError || !appointment) {
          console.error('Erro ao buscar agendamento:', fetchError);
          setStatus('error');
          setMessage('Agendamento não encontrado. Verifique o link e tente novamente.');
          return;
        }

        setAppointmentData(appointment);

        if (appointment.status === 'confirmado') {
          setStatus('success');
          setMessage('Este agendamento já foi confirmado anteriormente.');
        } else if (appointment.status === 'cancelado') {
          setStatus('error');
          setMessage('Este agendamento foi cancelado e não pode ser confirmado.');
        } else {
          setStatus('pending');
        }
      } catch (err: any) {
        console.error('Erro ao carregar dados:', err);
        setStatus('error');
        setMessage('Ocorreu um erro ao carregar os dados. Tente novamente mais tarde.');
      }
    };

    fetchData();
  }, [appointmentId]);

  const handleConfirm = async () => {
    if (!appointmentId) return;
    
    setStatus('confirming');
    try {
      const { error: updateError } = await supabase
        .from('agendamentos')
        .update({ status: 'confirmado' })
        .eq('id', appointmentId);

      if (updateError) throw updateError;

      // Criar notificação para o paciente
      await supabase.from('notificacoes').insert({
        user_id: appointmentData.paciente_id,
        titulo: 'Agendamento Confirmado',
        mensagem: `Seu agendamento para o dia ${new Date(appointmentData.data_servico).toLocaleDateString('pt-BR')} foi confirmado pelo profissional.`,
        tipo: 'appointment',
        link: '/appointments'
      });

      setStatus('success');
      setMessage('Agendamento confirmado com sucesso! O paciente foi notificado.');
      toast.success('Agendamento confirmado!');
    } catch (err: any) {
      console.error('Erro na confirmação:', err);
      setStatus('pending');
      toast.error('Erro ao confirmar agendamento.');
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Carregando detalhes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 max-w-2xl w-full overflow-hidden"
      >
        {status === 'pending' || status === 'confirming' ? (
          <div className="flex flex-col">
            <div className="bg-blue-600 p-8 text-center text-white">
              <h1 className="text-2xl font-black mb-2">Confirmar Agendamento</h1>
              <p className="text-blue-100 opacity-90">Revise os dados abaixo antes de confirmar o atendimento.</p>
            </div>

            <div className="p-8 space-y-8">
              {/* Dados do Paciente */}
              <div className="flex items-start gap-6">
                <div className="relative">
                  <img 
                    src={appointmentData.paciente?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${appointmentData.paciente?.id}`} 
                    alt={appointmentData.paciente?.nome_completo}
                    className="w-24 h-24 rounded-3xl object-cover border-4 border-slate-50 shadow-lg"
                  />
                  <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-1.5 rounded-xl shadow-md">
                    <User size={16} />
                  </div>
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-black text-slate-900 leading-tight mb-1">
                    {appointmentData.paciente?.nome_completo}
                  </h2>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                      {appointmentData.paciente?.plano || 'Particular'}
                    </span>
                    {appointmentData.paciente?.telefone && (
                      <span className="flex items-center gap-1.5 text-slate-500 text-sm font-medium">
                        <Phone size={14} />
                        {appointmentData.paciente.telefone}
                      </span>
                    )}
                  </div>
                  {appointmentData.paciente?.endereco && (
                    <div className="flex items-start gap-2 text-slate-500 text-sm">
                      <MapPin size={16} className="text-slate-400 mt-0.5 shrink-0" />
                      <span className="leading-relaxed">{appointmentData.paciente.endereco}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Detalhes do Serviço */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
                      <Calendar size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data e Hora</p>
                      <p className="text-sm font-bold text-slate-900">
                        {new Date(appointmentData.data_servico).toLocaleDateString('pt-BR')} às {new Date(appointmentData.data_servico).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
                      <FileText size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Serviço</p>
                      <p className="text-sm font-bold text-slate-900">{appointmentData.servico || 'Consulta'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {appointmentData.observacoes && (
                <div className="bg-amber-50/50 p-5 rounded-3xl border border-amber-100">
                  <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-2">Observações do Paciente</p>
                  <p className="text-sm text-slate-700 italic leading-relaxed">"{appointmentData.observacoes}"</p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button
                  onClick={handleConfirm}
                  disabled={status === 'confirming'}
                  className="flex-1 py-5 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {status === 'confirming' ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Confirmando...
                    </>
                  ) : (
                    <>
                      <Check size={20} />
                      Confirmar Agendamento
                    </>
                  )}
                </button>
                <Link
                  to="/agenda"
                  className="px-8 py-5 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-200 transition-all text-center"
                >
                  Voltar
                </Link>
              </div>
            </div>
          </div>
        ) : status === 'success' ? (
          <div className="p-12 text-center space-y-8">
            <div className="w-24 h-24 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 size={56} />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Tudo Certo!</h1>
              <p className="text-slate-600 font-medium leading-relaxed">{message}</p>
            </div>

            <div className="bg-slate-50 rounded-[2rem] p-6 border border-slate-100 text-left">
              <div className="flex items-center gap-4 mb-4">
                <img 
                  src={appointmentData?.paciente?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${appointmentData?.paciente?.id}`} 
                  alt=""
                  className="w-12 h-12 rounded-xl object-cover"
                />
                <div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Paciente</p>
                  <p className="text-base font-bold text-slate-900">{appointmentData?.paciente?.nome_completo}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</p>
                  <p className="text-sm font-bold text-slate-900">{new Date(appointmentData?.data_servico).toLocaleDateString('pt-BR')}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hora</p>
                  <p className="text-sm font-bold text-slate-900">{new Date(appointmentData?.data_servico).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            </div>

            <Link
              to="/agenda"
              className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-xl shadow-blue-100"
            >
              Ver Minha Agenda
              <ArrowRight size={18} />
            </Link>
          </div>
        ) : (
          <div className="p-12 text-center space-y-8">
            <div className="w-24 h-24 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle size={56} />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Ops!</h1>
              <p className="text-slate-600 font-medium leading-relaxed">{message}</p>
            </div>
            
            <Link
              to="/dashboard"
              className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800 transition-all"
            >
              Voltar ao Início
            </Link>
          </div>
        )}
      </motion.div>
    </div>
  );
}

