import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Plus, 
  X, 
  Check, 
  XCircle, 
  User, 
  Loader2,
  ChevronLeft,
  ChevronRight,
  MapPin,
  MoreVertical,
  Stethoscope,
  AlertTriangle,
  MessageSquare
} from 'lucide-react';
import { formatDate, cn } from '../lib/utils';
import { toast } from 'sonner';
import { sendAppointmentConfirmation } from '../services/emailService';

export default function Agenda() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Form State
  const [formData, setFormData] = useState({
    paciente_id: '',
    data: new Date().toISOString().split('T')[0],
    hora: '08:00',
    tipo: 'Presencial',
    local: '',
    observacoes: ''
  });

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      const currentPath = window.location.pathname + window.location.search;
      navigate(`/login?redirectTo=${encodeURIComponent(currentPath)}`);
      return;
    }

    if (profile && profile.tipo_usuario !== 'fisioterapeuta') {
      navigate('/dashboard');
      return;
    }
    
    loadData();
  }, [user, selectedDate, profile, authLoading]);

  useEffect(() => {
    const checkUrlParams = async () => {
      const params = new URLSearchParams(window.location.search);
      const appointmentId = params.get('id');
      
      if (appointmentId) {
        // Primeiro tenta encontrar na lista atual
        const existing = appointments.find(a => a.id === appointmentId);
        if (existing) {
          setSelectedAppointment(existing);
          setShowDetailsModal(true);
          return;
        }

        // Se não encontrar, busca no banco para garantir que temos os dados
        const { data, error: fetchError } = await supabase
          .from('agendamentos')
          .select(`
            *,
            paciente:perfis!paciente_id (id, nome_completo, email, avatar_url, telefone)
          `)
          .eq('id', appointmentId)
          .single();

        if (data && !fetchError) {
          setSelectedAppointment(data);
          setShowDetailsModal(true);
          
          // Se a data for diferente da selecionada, atualiza a data para mostrar o contexto
          if (data.data && data.data !== selectedDate) {
            setSelectedDate(data.data);
          }
        }
      }
    };

    if (!isLoading) {
      checkUrlParams();
    }
  }, [isLoading, appointments.length]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await Promise.all([
        fetchAppointments(),
        fetchPatients()
      ]);
    } catch (err: any) {
      console.error('Erro ao carregar dados da agenda:', err);
      setError(err.message || 'Erro de conexão');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      console.log('Buscando pacientes da tabela perfis...');
      const { data, error: supabaseError } = await supabase
        .from('perfis')
        .select('id, nome_completo')
        .eq('tipo_usuario', 'paciente')
        .order('nome_completo');
      
      if (supabaseError) {
        console.error('Erro completo do Supabase ao buscar pacientes:', supabaseError);
        throw supabaseError;
      }
      
      // Mapear nome_completo para nome para manter compatibilidade com o restante do componente
      const mappedData = (data || []).map(p => ({
        id: p.id,
        nome: p.nome_completo
      }));
      
      console.log('Pacientes encontrados:', mappedData.length);
      setPatients(mappedData);
    } catch (err) {
      console.error('Erro ao buscar pacientes para agenda:', err);
      setPatients([]);
    }
  };

  const fetchAppointments = async () => {
    try {
      console.log('Buscando agendamentos para data:', selectedDate);
      const { data, error: supabaseError } = await supabase
        .from('agendamentos')
        .select(`
          *,
          paciente:perfis!paciente_id (id, nome_completo, email, avatar_url, telefone)
        `)
        .eq('fisio_id', user?.id)
        .eq('data', selectedDate)
        .order('hora');

      if (supabaseError) {
        console.error('Erro completo do Supabase ao buscar agendamentos:', supabaseError);
        // Fallback para query simples se o join falhar
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('agendamentos')
          .select('*')
          .eq('fisio_id', user?.id)
          .eq('data', selectedDate)
          .order('hora');
        
        if (fallbackError) throw fallbackError;
        
        if (fallbackData && fallbackData.length > 0) {
          const patientIds = [...new Set(fallbackData.map(a => a.paciente_id))];
          const { data: profiles } = await supabase
            .from('perfis')
            .select('id, nome_completo, email, avatar_url, telefone')
            .in('id', patientIds);
          
          const profileMap = Object.fromEntries(profiles?.map(p => [p.id, p]) || []);
          const enriched = fallbackData.map(a => ({
            ...a,
            paciente: profileMap[a.paciente_id]
          }));
          setAppointments(enriched);
        } else {
          setAppointments([]);
        }
        return;
      }
      
      console.log('Agendamentos encontrados:', data?.length || 0);
      setAppointments(data || []);
    } catch (err: any) {
      console.error('Erro ao buscar agendamentos:', err);
      setAppointments([]);
      throw err;
    }
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);
    try {
      const { data: insertData, error } = await supabase
        .from('agendamentos')
        .insert({
          ...formData,
          fisio_id: user.id
        })
        .select();

      if (error) throw error;

      const newApp = insertData && insertData.length > 0 ? insertData[0] : null;

      // Buscar e-mail do paciente para enviar confirmação
      const patient = patients.find(p => p.id === formData.paciente_id);
      if (patient && newApp) {
        const { data: patientProfile } = await supabase
          .from('perfis')
          .select('email, nome_completo')
          .eq('id', patient.id)
          .single();

        if (patientProfile && profile) {
          sendAppointmentConfirmation(
            patientProfile.email,
            profile.email,
            {
              appointmentId: newApp.id,
              patientName: patientProfile.nome_completo,
              physioName: profile.nome_completo,
              date: new Date(formData.data).toLocaleDateString('pt-BR'),
              time: formData.hora,
              service: formData.tipo || 'Consulta'
            }
          );
        }
      }

      toast.success('Agendamento realizado!');
      setShowModal(false);
      fetchAppointments();
    } catch (err) {
      console.error('Erro ao agendar:', err);
      toast.error('Erro ao realizar agendamento');
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const app = appointments.find(a => a.id === id);
      if (!app) return;

      const { error } = await supabase
        .from('agendamentos')
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      // Enviar e-mail se confirmado ou cancelado
      if (status === 'confirmado' || status === 'cancelado') {
        const patientEmail = app.paciente?.email;
        const patientName = app.paciente?.nome_completo || app.paciente?.nome;

        if (patientEmail && profile) {
          if (status === 'confirmado') {
            sendAppointmentConfirmation(
              patientEmail,
              profile.email,
              {
                appointmentId: app.id,
                patientName: patientName || 'Paciente',
                physioName: profile.nome_completo,
                date: app.data || new Date(app.data_servico).toLocaleDateString('pt-BR'),
                time: app.hora || new Date(app.data_servico).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                service: app.tipo || app.servico || 'Consulta'
              }
            );
          } else {
            // Cancelamento
            import('../services/emailService').then(({ sendEmail }) => {
              sendEmail({
                to: patientEmail,
                event: 'appointment',
                subject: 'Agendamento Cancelado - FisioCareHub',
                html: `<h1>Olá ${patientName}!</h1><p>Informamos que o agendamento para o dia ${app.data || new Date(app.data_servico).toLocaleDateString('pt-BR')} foi cancelado.</p>`,
              });
            });
          }
        }
      }

      toast.success(`Status atualizado para ${status}`);
      setShowDetailsModal(false);
      fetchAppointments();
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      toast.error('Erro ao atualizar status');
    }
  };

  const changeDate = (days: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  return (
    <div className="space-y-8 w-full box-border overflow-wrap-break-word">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Minha Agenda</h1>
          <p className="text-slate-500 font-medium">Controle seus agendamentos diários.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-2 px-6 py-4 bg-sky-500 text-white rounded-2xl font-black hover:bg-sky-600 transition-all shadow-lg shadow-sky-100"
        >
          <Plus size={20} />
          Novo Agendamento
        </button>
      </header>

      {/* Seletor de Data */}
      <div className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between w-full">
        <button onClick={() => changeDate(-1)} className="p-3 hover:bg-slate-50 rounded-xl transition-all text-slate-400">
          <ChevronLeft size={24} />
        </button>
        <div className="flex flex-col items-center">
          <span className="text-xs font-bold text-sky-500 uppercase tracking-widest mb-1">
            {new Date(selectedDate).toLocaleDateString('pt-BR', { weekday: 'long' })}
          </span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="text-xl font-black text-slate-900 outline-none bg-transparent text-center cursor-pointer"
          />
        </div>
        <button onClick={() => changeDate(1)} className="p-3 hover:bg-slate-50 rounded-xl transition-all text-slate-400">
          <ChevronRight size={24} />
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 p-6 rounded-[2rem] flex items-center gap-4 text-red-600 w-full">
          <AlertTriangle size={24} />
          <div>
            <h3 className="font-black">Erro ao carregar agenda</h3>
            <p className="text-sm font-medium opacity-80">{error}</p>
          </div>
          <button 
            onClick={loadData}
            className="ml-auto px-4 py-2 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-all"
          >
            Tentar Novamente
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4 w-full">
          <Loader2 className="w-12 h-12 text-sky-500 animate-spin" />
          <p className="text-slate-500 font-bold animate-pulse">Carregando agenda...</p>
        </div>
      ) : (
        <div className="space-y-4 w-full">
          {appointments.length === 0 ? (
            <div className="bg-white p-20 rounded-[3rem] border border-slate-100 text-center w-full">
              <div className="w-24 h-24 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-6">
                <CalendarIcon size={48} />
              </div>
              <h3 className="text-2xl font-black text-slate-900">Nenhum atendimento</h3>
              <p className="text-slate-500 mt-2 font-medium">Você não tem compromissos para este dia.</p>
            </div>
          ) : (
            appointments.map((app) => (
              <motion.div
                key={app.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => {
                  setSelectedAppointment(app);
                  setShowDetailsModal(true);
                }}
                className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-md transition-all w-full cursor-pointer group"
              >
                <div className="flex items-center gap-6">
                  <div className="flex flex-col items-center justify-center w-20 h-20 bg-slate-50 rounded-3xl text-slate-900 group-hover:bg-blue-50 transition-colors">
                    <Clock size={20} className="text-sky-500 mb-1" />
                    <span className="text-xl font-black">{app.hora?.slice(0, 5) || '--:--'}</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                      {app.paciente?.nome_completo || app.paciente?.nome || 'Paciente'}
                    </h3>
                    <div className="flex flex-wrap gap-4 mt-2">
                      <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                        <Stethoscope size={16} className="text-sky-500" />
                        {app.tipo || app.servico}
                      </div>
                      {app.local && (
                        <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                          <MapPin size={16} className="text-sky-500" />
                          {app.local}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className={cn(
                    "px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest",
                    app.status === 'confirmado' || app.status === 'realizado' ? "bg-emerald-100 text-emerald-700" :
                    app.status === 'agendado' || app.status === 'pendente' ? "bg-sky-100 text-sky-700" :
                    "bg-red-100 text-red-700"
                  )}>
                    {app.status}
                  </span>
                  
                  <div className="flex gap-2">
                    {(app.status === 'agendado' || app.status === 'pendente') && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateStatus(app.id, 'confirmado');
                          }}
                          className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-100 transition-all"
                          title="Confirmar"
                        >
                          <Check size={20} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateStatus(app.id, 'cancelado');
                          }}
                          className="p-3 bg-red-50 text-red-600 rounded-2xl hover:bg-red-100 transition-all"
                          title="Recusar"
                        >
                          <XCircle size={20} />
                        </button>
                      </>
                    )}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedAppointment(app);
                        setShowDetailsModal(true);
                      }}
                      className="p-3 text-slate-400 hover:bg-slate-50 rounded-2xl transition-all"
                    >
                      <MoreVertical size={20} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Modal de Detalhes */}
      <AnimatePresence>
        {showDetailsModal && selectedAppointment && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDetailsModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[3rem] shadow-2xl p-10 overflow-hidden"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Detalhes do Agendamento</h2>
                <button onClick={() => setShowDetailsModal(false)} className="p-2 hover:bg-slate-50 rounded-full transition-all">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-8">
                <div className="flex items-center gap-6">
                  <img 
                    src={selectedAppointment.paciente?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedAppointment.paciente_id}`}
                    alt="Avatar"
                    className="w-20 h-20 rounded-[2rem] object-cover border-4 border-slate-50 shadow-sm"
                  />
                  <div>
                    <h3 className="text-2xl font-black text-slate-900">{selectedAppointment.paciente?.nome_completo || selectedAppointment.paciente?.nome}</h3>
                    <p className="text-slate-500 font-bold">{selectedAppointment.paciente?.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Data e Hora</p>
                    <div className="flex items-center gap-3 text-slate-900 font-black">
                      <CalendarIcon size={20} className="text-blue-600" />
                      {selectedAppointment.data || new Date(selectedAppointment.data_servico).toLocaleDateString('pt-BR')}
                    </div>
                    <div className="flex items-center gap-3 text-slate-900 font-black mt-2">
                      <Clock size={20} className="text-blue-600" />
                      {selectedAppointment.hora || new Date(selectedAppointment.data_servico).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tipo de Consulta</p>
                    <div className="flex items-center gap-3 text-slate-900 font-black">
                      <Stethoscope size={20} className="text-blue-600" />
                      {selectedAppointment.tipo || selectedAppointment.servico}
                    </div>
                    {selectedAppointment.local && (
                      <div className="flex items-center gap-3 text-slate-900 font-black mt-2">
                        <MapPin size={20} className="text-blue-600" />
                        {selectedAppointment.local}
                      </div>
                    )}
                  </div>
                </div>

                {selectedAppointment.observacoes && (
                  <div className="p-6 bg-blue-50/50 rounded-[2rem] border border-blue-100/50">
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">Observações</p>
                    <p className="text-slate-700 font-medium leading-relaxed">{selectedAppointment.observacoes}</p>
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  <div className="flex gap-3">
                    {(selectedAppointment.status === 'agendado' || selectedAppointment.status === 'pendente') && (
                      <button
                        onClick={() => updateStatus(selectedAppointment.id, 'confirmado')}
                        className="flex-1 py-5 bg-emerald-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 flex items-center justify-center gap-2"
                      >
                        <Check size={20} />
                        Confirmar
                      </button>
                    )}
                    {selectedAppointment.status !== 'cancelado' && (
                      <button
                        onClick={() => updateStatus(selectedAppointment.id, 'cancelado')}
                        className="flex-1 py-5 bg-red-50 text-red-600 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-red-100 transition-all flex items-center justify-center gap-2"
                      >
                        <XCircle size={20} />
                        Recusar
                      </button>
                    )}
                  </div>
                  
                  <button
                    onClick={() => {
                      const phone = selectedAppointment.paciente?.telefone?.replace(/\D/g, '');
                      if (phone) {
                        window.open(`https://wa.me/55${phone}`, '_blank');
                      } else {
                        toast.error('Telefone do paciente não cadastrado.');
                      }
                    }}
                    className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                  >
                    <MessageSquare size={20} />
                    Enviar Mensagem ao Paciente
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Agendamento */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[3rem] shadow-2xl p-8 overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Novo Agendamento</h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-50 rounded-full transition-all">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleCreateAppointment} className="space-y-6 overflow-y-auto">
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-700 uppercase tracking-widest ml-1">Paciente</label>
                  <select
                    required
                    value={formData.paciente_id}
                    onChange={(e) => setFormData({...formData, paciente_id: e.target.value})}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-sky-500 outline-none transition-all"
                  >
                    <option value="">Selecione um paciente...</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>{p.nome}</option>
                    ))}
                  </select>
                  {patients.length === 0 && !isLoading && (
                    <p className="text-xs text-amber-600 font-bold mt-2 px-1">
                      Nenhum paciente cadastrado. Vá em "Pacientes" para registrar um.
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-black text-slate-700 uppercase tracking-widest ml-1">Data</label>
                    <input
                      type="date"
                      required
                      value={formData.data}
                      onChange={(e) => setFormData({...formData, data: e.target.value})}
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-sky-500 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-black text-slate-700 uppercase tracking-widest ml-1">Hora</label>
                    <input
                      type="time"
                      required
                      value={formData.hora}
                      onChange={(e) => setFormData({...formData, hora: e.target.value})}
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-sky-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-700 uppercase tracking-widest ml-1">Tipo de Atendimento</label>
                  <select
                    value={formData.tipo}
                    onChange={(e) => setFormData({...formData, tipo: e.target.value})}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-sky-500 outline-none transition-all"
                  >
                    <option value="Presencial">Presencial</option>
                    <option value="Online">Online</option>
                    <option value="Domiciliar">Domiciliar</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-700 uppercase tracking-widest ml-1">Local / Link</label>
                  <input
                    type="text"
                    value={formData.local}
                    onChange={(e) => setFormData({...formData, local: e.target.value})}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-sky-500 outline-none transition-all"
                    placeholder="Ex: Clínica Central ou Link do Meet"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-700 uppercase tracking-widest ml-1">Observações</label>
                  <textarea
                    value={formData.observacoes}
                    onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-sky-500 outline-none transition-all h-24 resize-none"
                    placeholder="Notas sobre o agendamento..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-5 bg-sky-500 text-white rounded-2xl font-black text-lg hover:bg-sky-600 transition-all shadow-xl shadow-sky-100 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="animate-spin" /> : 'Confirmar Agendamento'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
