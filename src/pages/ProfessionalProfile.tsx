import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
  Star, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  XCircle,
  Calendar as CalendarIcon, 
  MessageSquare, 
  ChevronLeft,
  Loader2,
  Stethoscope,
  Award,
  ShieldCheck,
  Wallet
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { cn, resolveStorageUrl } from '../lib/utils';

export default function ProfessionalProfile() {
  const { id } = useParams();
  const { user, profile: currentUserProfile } = useAuth();
  const navigate = useNavigate();
  const [physio, setPhysio] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingData, setBookingData] = useState({
    data: '',
    hora: '',
    tipo: 'Avaliação inicial',
    observacoes: '',
    valor: 0
  });
  const [bookingLoading, setBookingLoading] = useState(false);
  const [configServicos, setConfigServicos] = useState<any>(null);

  useEffect(() => {
    const fetchPhysio = async () => {
      if (!id) return;
      try {
        const { data, error } = await supabase
          .from('perfis')
          .select('*')
          .eq('id', id)
          .eq('tipo_usuario', 'fisioterapeuta')
          .single();

        if (error) throw error;
        setPhysio(data);

        // Fetch session settings
        const { data: settings, error: settingsError } = await supabase
          .from('configuracao_servicos')
          .select('*')
          .eq('physio_id', id)
          .single();
        
        if (!settingsError) {
          console.log('Valores de serviços carregados:', settings);
          setConfigServicos(settings);
          setBookingData(prev => ({
            ...prev,
            tipo: 'Avaliação inicial',
            valor: settings.avaliacao_inicial || 0
          }));
        } else {
          console.log('Nenhuma configuração de valores encontrada para este profissional.');
        }
      } catch (err) {
        console.error('Erro ao buscar fisioterapeuta:', err);
        toast.error('Profissional não encontrado');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    fetchPhysio();
  }, [id, navigate]);

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Você precisa estar logado para agendar');
      navigate('/login', { state: { from: `/physio/${id}` } });
      return;
    }

    if (!bookingData.data || !bookingData.hora) {
      toast.error('Selecione data e hora');
      return;
    }

    setBookingLoading(true);
    try {
      // Combine date and time for data_servico (required in schema)
      const [year, month, day] = bookingData.data.split('-').map(Number);
      const [hours, minutes] = bookingData.hora.split(':').map(Number);
      const appointmentDate = new Date(year, month - 1, day, hours, minutes).toISOString();

      // 1. Criar Agendamento
      const { data: appData, error: appError } = await supabase
        .from('agendamentos')
        .insert({
          paciente_id: user.id,
          fisio_id: id,
          data: bookingData.data,
          hora: bookingData.hora,
          data_servico: appointmentDate,
          tipo: bookingData.tipo,
          observacoes: bookingData.observacoes,
          valor_cobrado: bookingData.valor || 0,
          status: 'pendente'
        })
        .select()
        .single();

      if (appError) throw appError;

      // 2. Criar Sessão para Pagamento
      const { error: sessionError } = await supabase
        .from('sessoes')
        .insert({
          paciente_id: user.id,
          fisioterapeuta_id: id,
          data: bookingData.data,
          hora: bookingData.hora,
          valor: bookingData.valor || 0,
          status_pagamento: 'pendente'
        });

      toast.success('Solicitação de agendamento enviada com sucesso!');
      setShowBookingModal(false);
      navigate('/appointments');
    } catch (err) {
      console.error('Erro ao agendar:', err);
      toast.error('Erro ao realizar agendamento');
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-blue-600" size={48} />
      </div>
    );
  }

  if (!physio) return null;

  return (
    <div className="min-h-screen bg-slate-950 pb-20">
      {/* Header / Cover */}
      <div className="h-64 bg-gradient-to-r from-blue-600 to-indigo-700 relative">
        <button 
          onClick={() => navigate(-1)}
          className="absolute top-8 left-8 p-3 bg-white/10 backdrop-blur-md text-white rounded-2xl hover:bg-white/20 transition-all border border-white/10"
        >
          <ChevronLeft size={24} />
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-4 -mt-32 relative z-10">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column: Profile Info */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-slate-900/50 backdrop-blur-xl p-8 rounded-[3rem] shadow-2xl border border-white/10">
              <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="relative">
                  <img 
                    src={resolveStorageUrl(physio.avatar_url) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${physio.id}`}
                    alt={physio.nome_completo}
                    className="w-40 h-40 rounded-[2.5rem] object-cover border-4 border-white/10 shadow-2xl"
                  />
                  <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-2 rounded-full shadow-lg border-4 border-slate-900">
                    <CheckCircle2 size={20} />
                  </div>
                </div>

                <div className="flex-1 space-y-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h1 className="text-3xl font-black text-white tracking-tight">Dr. {physio.nome_completo}</h1>
                      <div className="flex items-center gap-1 px-2.5 py-1 bg-blue-600/20 text-blue-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-blue-500/30">
                        <ShieldCheck size={12} />
                        Verificado
                      </div>
                    </div>
                    <p className="text-blue-400 font-black text-xs uppercase tracking-[0.2em]">{physio.especialidade || 'Fisioterapeuta'}</p>
                  </div>

                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-1.5 text-amber-400">
                      <Star size={18} fill="currentColor" />
                      <span className="text-sm font-black text-white">4.9</span>
                      <span className="text-xs text-slate-400 font-bold">(120 avaliações)</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <MapPin size={18} />
                      <span className="text-sm font-bold">{physio.localizacao || 'São Paulo, SP'}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {['Ortopedia', 'Esportiva', 'RPG', 'Pilates'].map(tag => (
                      <span key={tag} className="px-3 py-1 bg-white/5 text-slate-400 text-[10px] font-bold uppercase tracking-widest rounded-full border border-white/10">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-10 pt-10 border-t border-white/5 space-y-4">
                <h2 className="text-xl font-black text-white tracking-tight">Sobre o Profissional</h2>
                <p className="text-slate-300 font-medium leading-relaxed">
                  {physio.bio || 'Fisioterapeuta dedicado a proporcionar a melhor reabilitação no conforto do seu lar. Especialista em técnicas modernas de terapia manual e exercícios funcionais.'}
                </p>
              </div>
            </div>

            {/* Experience & Education */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-slate-900/50 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white/10 shadow-xl space-y-4">
                <div className="w-12 h-12 bg-blue-600/20 text-blue-400 rounded-2xl flex items-center justify-center">
                  <Award size={24} />
                </div>
                <h3 className="text-lg font-black text-white tracking-tight">Formação Acadêmica</h3>
                <ul className="space-y-3">
                  <li className="flex gap-3">
                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                    <p className="text-sm text-slate-300 font-medium">Graduação em Fisioterapia - USP</p>
                  </li>
                  <li className="flex gap-3">
                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                    <p className="text-sm text-slate-300 font-medium">Pós-graduação em Fisioterapia Esportiva</p>
                  </li>
                </ul>
              </div>

              <div className="bg-slate-900/50 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white/10 shadow-xl space-y-4">
                <div className="w-12 h-12 bg-emerald-600/20 text-emerald-400 rounded-2xl flex items-center justify-center">
                  <Stethoscope size={24} />
                </div>
                <h3 className="text-lg font-black text-white tracking-tight">Serviços Oferecidos</h3>
                <ul className="space-y-3">
                  <li className="flex gap-3">
                    <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full mt-2 flex-shrink-0" />
                    <p className="text-sm text-slate-300 font-medium">Atendimento Domiciliar</p>
                  </li>
                  <li className="flex gap-3">
                    <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full mt-2 flex-shrink-0" />
                    <p className="text-sm text-slate-300 font-medium">Teleconsulta (Online)</p>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Right Column: Booking Card */}
          <div className="space-y-6">
            <div className="bg-slate-900/50 backdrop-blur-xl p-8 rounded-[3rem] shadow-2xl border border-white/10 sticky top-8">
              <div className="text-center space-y-4 mb-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600/20 text-emerald-400 rounded-full text-xs font-black uppercase tracking-widest border border-emerald-500/30">
                  <Wallet size={14} />
                  Investimento
                </div>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-slate-400 text-lg font-bold">R$</span>
                  <span className="text-5xl font-black text-white tracking-tighter">
                    {configServicos?.sessao_fisioterapia 
                      ? Number(configServicos.sessao_fisioterapia).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
                      : '---'}
                  </span>
                  <span className="text-slate-400 text-sm font-bold">/sessão</span>
                </div>
                <p className="text-slate-500 text-xs font-medium">Pagamento seguro via Stripe Connect</p>
              </div>

              <div className="space-y-4">
                <button 
                  onClick={() => setShowBookingModal(true)}
                  className="w-full py-5 bg-blue-600 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-900/20 flex items-center justify-center gap-2"
                >
                  <CalendarIcon size={20} />
                  Agendar Consulta
                </button>
                <button 
                  onClick={() => navigate(`/chat?user=${physio.id}`)}
                  className="w-full py-5 bg-white/5 text-slate-300 rounded-[2rem] font-black text-sm uppercase tracking-widest hover:bg-white/10 transition-all border border-white/10 flex items-center justify-center gap-2"
                >
                  <MessageSquare size={20} />
                  Enviar Mensagem
                </button>
              </div>

              <div className="mt-8 pt-8 border-t border-white/5 space-y-4">
                <div className="flex items-center gap-3 text-slate-400">
                  <Clock size={18} className="text-blue-400" />
                  <span className="text-xs font-bold">Resposta em até 2 horas</span>
                </div>
                <div className="flex items-center gap-3 text-slate-400">
                  <ShieldCheck size={18} className="text-blue-400" />
                  <span className="text-xs font-bold">Garantia de atendimento</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      <AnimatePresence>
        {showBookingModal && (
          <div className="fixed inset-0 z-[50] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowBookingModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-slate-900 rounded-[3rem] shadow-2xl p-8 overflow-hidden border border-white/10"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black text-white tracking-tight">Agendar Consulta</h2>
                <button onClick={() => setShowBookingModal(false)} className="p-2 hover:bg-white/5 rounded-full transition-all text-slate-400">
                  <XCircle size={24} />
                </button>
              </div>

              <form onSubmit={handleBooking} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Data</label>
                    <input 
                      type="date"
                      required
                      value={bookingData.data}
                      onChange={(e) => setBookingData({...bookingData, data: e.target.value})}
                      className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none transition-all font-bold text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Hora</label>
                    <input 
                      type="time"
                      required
                      value={bookingData.hora}
                      onChange={(e) => setBookingData({...bookingData, hora: e.target.value})}
                      className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none transition-all font-bold text-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Tipo de Sessão</label>
                  <select 
                    value={bookingData.tipo}
                    onChange={(e) => {
                      const tipo = e.target.value;
                      let valor = 0;
                      if (configServicos) {
                        switch(tipo) {
                          case 'Avaliação inicial': valor = configServicos.avaliacao_inicial; break;
                          case 'Sessão de fisioterapia': valor = configServicos.sessao_fisioterapia; break;
                          case 'Reabilitação': valor = configServicos.reabilitacao; break;
                          case 'RPG': valor = configServicos.rpg; break;
                          case 'Pilates': valor = configServicos.pilates; break;
                          case 'Fisioterapia domiciliar': valor = configServicos.domiciliar; break;
                        }
                      }
                      console.log(`Tipo selecionado: ${tipo}, Valor: R$ ${valor}`);
                      setBookingData({...bookingData, tipo: tipo, valor: valor || 0});
                    }}
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none transition-all font-bold text-white appearance-none"
                  >
                    <option value="Avaliação inicial" className="bg-slate-900">Avaliação inicial</option>
                    <option value="Sessão de fisioterapia" className="bg-slate-900">Sessão de fisioterapia</option>
                    <option value="Reabilitação" className="bg-slate-900">Reabilitação</option>
                    <option value="RPG" className="bg-slate-900">RPG</option>
                    <option value="Pilates" className="bg-slate-900">Pilates</option>
                    <option value="Fisioterapia domiciliar" className="bg-slate-900">Fisioterapia domiciliar</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Observações</label>
                  <textarea 
                    value={bookingData.observacoes}
                    onChange={(e) => setBookingData({...bookingData, observacoes: e.target.value})}
                    placeholder="Conte brevemente o motivo do agendamento..."
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none transition-all font-bold text-white h-32 resize-none"
                  />
                </div>

                <div className="p-4 bg-blue-600/10 rounded-2xl border border-blue-500/20 flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-400">Total da Sessão:</span>
                  <span className="text-lg font-black text-blue-400">R$ {(bookingData.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>

                <button 
                  type="submit"
                  disabled={bookingLoading}
                  className="w-full py-5 bg-blue-600 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-900/20 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {bookingLoading ? <Loader2 className="animate-spin" /> : 'Confirmar Solicitação'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
