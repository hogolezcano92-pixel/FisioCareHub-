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
  const [view, setView] = useState<'daily' | 'all'>('daily');

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
  }, [user, selectedDate, profile, authLoading, view]);

  useEffect(() => {
    const checkUrlParams = async () => {
      const params = new URLSearchParams(window.location.search);
      const appointmentId = params.get('agendamento_id');
      const viewParam = params.get('view');
      
      if (viewParam === 'all') {
        setView('all');
      }
      
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
          .select('*')
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
      console.log('Buscando agendamentos. View:', view, 'Data:', selectedDate);
      let query = supabase
        .from('agendamentos')
        .select(`
          *,
          paciente:perfis!paciente_id (id, nome_completo, email, avatar_url, telefone, endereco)
        `)
        .eq('fisio_id', user?.id);

      if (view === 'daily') {
        query = query.eq('data', selectedDate);
      }

      const { data, error: supabaseError } = await query.order('data', { ascending: false }).order('hora');

      if (supabaseError) {
        console.error('Erro completo do Supabase ao buscar agendamentos:', supabaseError);
        // Fallback para query simples se o join falhar
        let fallbackQuery = supabase
          .from('agendamentos')
          .select('*')
          .eq('fisio_id', user?.id);
        
        if (view === 'daily') {
          fallbackQuery = fallbackQuery.eq('data', selectedDate);
        }

        const { data: fallbackData, error: fallbackError } = await fallbackQuery.order('data', { ascending: false }).order('hora');
        
        if (fallbackError) throw fallbackError;
        
        if (fallbackData && fallbackData.length > 0) {
          const patientIds = [...new Set(fallbackData.map(a => a.paciente_id))];
          const { data: profiles } = await supabase
            .from('perfis')
            .select('id, nome_completo, email, avatar_url, telefone, endereco')
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
      // Combine date and time for data_servico (required in schema)
      const [year, month, day] = formData.data.split('-').map(Number);
      const [hours, minutes] = formData.hora.split(':').map(Number);
      const appointmentDate = new Date(year, month - 1, day, hours, minutes).toISOString();

      const { data: insertData, error } = await supabase
        .from('agendamentos')
        .insert({
          ...formData,
          data_servico: appointmentDate,
          fisio_id: user.id
        })
        .select();

      if (error) throw error;

      const newApp = insertData && insertData.length > 0 ? insertData[0] : null;

      if (newApp && profile?.preco_sessao) {
        // Criar registro na tabela sessoes para pagamento
        const { error: sessionError } = await supabase
          .from('sessoes')
          .insert({
            paciente_id: formData.paciente_id,
            fisioterapeuta_id: user.id,
            data: formData.data,
            hora: formData.hora,
            valor: profile.preco_sessao,
            status_pagamento: 'pendente'
          });
        
        if (sessionError) console.error('Erro ao criar sessão para pagamento:', sessionError);
      }

      // Buscar e-mail do paciente para enviar confirmação
      const patient = patients.find(p => p.id === formData.paciente_id);
      if (patient && newApp) {
        const { data: patientProfile } = await supabase
          .from('perfis')
          .select('email, nome_completo, telefone, endereco')
          .eq('id', patient.id)
          .single();

        if (patientProfile && profile) {
          sendAppointmentConfirmation(
            patientProfile.email,
            profile.email,
            {
              appointmentId: newApp.id,
              patientName: patientProfile.nome_completo,
              patientPhone: patientProfile.telefone,
              patientAddress: patientProfile.endereco,
              physioName: profile.nome_completo,
              physioPhone: profile.telefone,
              physioAddress: profile.endereco,
              date: new Date(formData.data).toLocaleDateString('pt-BR'),
              time: formData.hora,
              service: formData.tipo || 'Consulta',
              notes: formData.observacoes
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
                patientPhone: app.paciente?.telefone,
                patientAddress: app.paciente?.endereco,
                physioName: profile.nome_completo,
                physioPhone: profile.telefone,
                physioAddress: profile.endereco,
                date: app.data || new Date(app.data_servico).toLocaleDateString('pt-BR'),
                time: app.hora || new Date(app.data_servico).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                service: app.tipo || app.servico || 'Consulta',
                notes: app.observacoes
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
    <div className="space-y-5 w-full box-border overflow-wrap-break-word">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-3 w-full">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight">Minha Agenda</h1>
          <p className="text-slate-500 text-xs font-medium">Controle seus agendamentos e solicitações.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-white/5 p-1 rounded-xl flex items-center gap-1 border border-white/5">
            <button
              onClick={() => setView('daily')}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[8px] font-black transition-all",
                view === 'daily' ? "bg-white/10 text-white shadow-sm" : "text-slate-500 hover:text-slate-400"
              )}
            >
              Agenda Diária
            </button>
            <button
              onClick={() => setView('all')}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[8px] font-black transition-all",
                view === 'all' ? "bg-white/10 text-white shadow-sm" : "text-slate-500 hover:text-slate-400"
              )}
            >
              Todas Solicitações
            </button>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center justify-center gap-2 px-3.5 py-2 bg-[#0047AB] text-white rounded-xl font-black text-[11px] hover:bg-blue-700 transition-all shadow-lg shadow-blue-900/20"
          >
            <Plus size={14} />
            Novo
          </button>
        </div>
      </header>

      {/* Seletor de Data - Só aparece na visão diária */}
      {view === 'daily' && (
        <div className="bg-slate-900/50 backdrop-blur-xl p-2.5 rounded-2xl border border-white/10 shadow-2xl flex items-center justify-between w-full">
          <button onClick={() => changeDate(-1)} className="p-1.5 hover:bg-white/5 rounded-lg transition-all text-slate-500">
            <ChevronLeft size={16} />
          </button>
          <div className="flex flex-col items-center">
            <span className="text-[8px] font-bold text-blue-400 uppercase tracking-widest mb-0.5">
              {new Date(selectedDate).toLocaleDateString('pt-BR', { weekday: 'long' })}
            </span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-sm font-black text-white outline-none bg-transparent text-center cursor-pointer"
            />
          </div>
          <button onClick={() => changeDate(1)} className="p-1.5 hover:bg-white/5 rounded-lg transition-all text-slate-500">
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 p-5 rounded-[2rem] flex items-center gap-4 text-red-400 w-full">
          <AlertTriangle size={20} />
          <div>
            <h3 className="font-black text-sm">Erro ao carregar agenda</h3>
            <p className="text-xs font-medium opacity-80">{error}</p>
          </div>
          <button 
            onClick={loadData}
            className="ml-auto px-3 py-1.5 bg-red-600 text-white rounded-xl font-bold text-xs hover:bg-red-700 transition-all"
          >
            Tentar Novamente
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4 w-full">
          <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
          <p className="text-slate-500 font-bold animate-pulse text-sm">Carregando agenda...</p>
        </div>
      ) : (
        <div className="space-y-3 w-full">
          {appointments.length === 0 ? (
            <div className="bg-slate-900 p-10 rounded-[2.5rem] border border-white/5 text-center w-full shadow-2xl">
              <div className="w-14 h-14 bg-white/5 text-slate-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CalendarIcon size={28} />
              </div>
              <h3 className="text-lg font-black text-white">Nenhum atendimento</h3>
              <p className="text-slate-500 mt-1 text-xs font-medium">
                {view === 'daily' ? 'Você não tem compromissos para este dia.' : 'Você não possui solicitações registradas.'}
              </p>
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
                className="premium-card !p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-blue-500/30 transition-all w-full cursor-pointer group"
              >
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-center justify-center w-12 h-12 bg-white/5 rounded-xl text-white group-hover:bg-blue-500/10 transition-colors border border-white/5">
                    {view === 'all' ? (
                      <>
                        <span className="text-[7px] font-black text-blue-400 uppercase">{new Date(app.data).toLocaleDateString('pt-BR', { month: 'short' })}</span>
                        <span className="text-sm font-black leading-none">{new Date(app.data).getDate()}</span>
                        <span className="text-[7px] font-bold text-slate-500 mt-0.5">{app.hora?.slice(0, 5)}</span>
                      </>
                    ) : (
                      <>
                        <Clock size={12} className="text-blue-400 mb-0.5" />
                        <span className="text-sm font-black">{app.hora?.slice(0, 5) || '--:--'}</span>
                      </>
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white group-hover:text-blue-400 transition-colors">
                      {app.nome_paciente || app.paciente?.nome_completo || app.paciente?.nome || 'Paciente'}
                    </h3>
                    <div className="flex flex-wrap gap-2 mt-0.5">
                      <div className="flex items-center gap-1 text-[9px] text-slate-500 font-medium">
                        <Stethoscope size={10} className="text-blue-400" />
                        {app.tipo || app.servico}
                      </div>
                      {app.local && (
                        <div className="flex items-center gap-1 text-[9px] text-slate-500 font-medium">
                          <MapPin size={10} className="text-blue-400" />
                          {app.local}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-3">
                  <span className={cn(
                    "px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest",
                    app.status === 'confirmado' || app.status === 'realizado' ? "bg-emerald-500/10 text-emerald-400" :
                    app.status === 'agendado' || app.status === 'pendente' ? "bg-blue-500/10 text-blue-400" :
                    "bg-red-500/10 text-red-400"
                  )}>
                    {app.status}
                  </span>
                  
                  <div className="flex gap-1.5">
                    {(app.status === 'agendado' || app.status === 'pendente') && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateStatus(app.id, 'confirmado');
                          }}
                          className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition-all"
                          title="Confirmar"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateStatus(app.id, 'cancelado');
                          }}
                          className="p-1.5 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-all"
                          title="Recusar"
                        >
                          <XCircle size={16} />
                        </button>
                      </>
                    )}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedAppointment(app);
                        setShowDetailsModal(true);
                      }}
                      className="p-1.5 text-slate-600 hover:bg-white/5 rounded-lg transition-all"
                    >
                      <MoreVertical size={16} />
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
          <div className="fixed inset-0 z-[50] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDetailsModal(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-slate-900 rounded-[2.5rem] border border-white/10 shadow-2xl p-6 overflow-hidden"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-black text-white tracking-tight">Detalhes do Agendamento</h2>
                <button onClick={() => setShowDetailsModal(false)} className="p-2 hover:bg-white/5 text-slate-400 rounded-full transition-all">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-5">
                <div className="flex items-center gap-4">
                  <img 
                    src={selectedAppointment.paciente?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedAppointment.paciente_id || selectedAppointment.nome_paciente}`}
                    alt="Avatar"
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-white/5 shadow-sm"
                  />
                  <div>
                    <h3 className="text-lg font-black text-white">{selectedAppointment.nome_paciente || selectedAppointment.paciente?.nome_completo || selectedAppointment.paciente?.nome}</h3>
                    <p className="text-slate-500 text-xs font-bold">{selectedAppointment.telefone_paciente || selectedAppointment.paciente?.telefone || selectedAppointment.paciente?.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 bg-white/5 rounded-2xl border border-white/5">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Data e Hora</p>
                    <div className="flex items-center gap-2 text-white font-black text-xs">
                      <CalendarIcon size={14} className="text-blue-400" />
                      {selectedAppointment.data || new Date(selectedAppointment.data_servico).toLocaleDateString('pt-BR')}
                    </div>
                    <div className="flex items-center gap-2 text-white font-black text-xs mt-1.5">
                      <Clock size={14} className="text-blue-400" />
                      {selectedAppointment.hora || new Date(selectedAppointment.data_servico).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div className="p-3.5 bg-white/5 rounded-2xl border border-white/5">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Tipo de Consulta</p>
                    <div className="flex items-center gap-2 text-white font-black text-xs">
                      <Stethoscope size={14} className="text-blue-400" />
                      {selectedAppointment.tipo || selectedAppointment.servico}
                    </div>
                    {selectedAppointment.local && (
                      <div className="flex items-center gap-2 text-white font-black text-xs mt-1.5">
                        <MapPin size={14} className="text-blue-400" />
                        {selectedAppointment.local}
                      </div>
                    )}
                  </div>
                </div>

                {selectedAppointment.observacoes && (
                  <div className="p-3.5 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                    <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-1.5">Observações</p>
                    <p className="text-slate-300 text-xs font-medium leading-relaxed">{selectedAppointment.observacoes}</p>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    {(selectedAppointment.status === 'agendado' || selectedAppointment.status === 'pendente') && (
                      <button
                        onClick={() => updateStatus(selectedAppointment.id, 'confirmado')}
                        className="flex-1 h-11 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2"
                      >
                        <Check size={16} />
                        Confirmar
                      </button>
                    )}
                    {selectedAppointment.status !== 'cancelado' && (
                      <button
                        onClick={() => updateStatus(selectedAppointment.id, 'cancelado')}
                        className="flex-1 h-11 bg-red-500/10 text-red-400 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-500/20 transition-all flex items-center justify-center gap-2 border border-red-500/20"
                      >
                        <XCircle size={16} />
                        Recusar
                      </button>
                    )}
                  </div>
                  
                  <button
                    onClick={() => {
                      const phone = (selectedAppointment.telefone_paciente || selectedAppointment.paciente?.telefone)?.replace(/\D/g, '');
                      if (phone) {
                        window.open(`https://wa.me/55${phone}`, '_blank');
                      } else {
                        toast.error('Telefone do paciente não cadastrado.');
                      }
                    }}
                    className="w-full h-11 bg-white/5 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2 border border-white/5"
                  >
                    <MessageSquare size={16} />
                    Enviar Mensagem
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
          <div className="fixed inset-0 z-[50] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-slate-900/90 backdrop-blur-2xl rounded-[2rem] border border-white/10 shadow-2xl p-5 overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-black text-white tracking-tight">Novo Agendamento</h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/5 text-slate-400 rounded-full transition-all">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateAppointment} className="space-y-3 overflow-y-auto pr-1">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Paciente</label>
                  <select
                    required
                    value={formData.paciente_id}
                    onChange={(e) => setFormData({...formData, paciente_id: e.target.value})}
                    className="input-compact"
                  >
                    <option value="" className="bg-slate-900">Selecione um paciente...</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id} className="bg-slate-900">{p.nome}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Data</label>
                    <input
                      type="date"
                      required
                      value={formData.data}
                      onChange={(e) => setFormData({...formData, data: e.target.value})}
                      className="input-compact"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Hora</label>
                    <input
                      type="time"
                      required
                      value={formData.hora}
                      onChange={(e) => setFormData({...formData, hora: e.target.value})}
                      className="input-compact"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Tipo</label>
                  <select
                    value={formData.tipo}
                    onChange={(e) => setFormData({...formData, tipo: e.target.value})}
                    className="input-compact"
                  >
                    <option value="Presencial" className="bg-slate-900">Presencial</option>
                    <option value="Online" className="bg-slate-900">Online</option>
                    <option value="Domiciliar" className="bg-slate-900">Domiciliar</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Local / Link</label>
                  <input
                    type="text"
                    value={formData.local}
                    onChange={(e) => setFormData({...formData, local: e.target.value})}
                    className="input-compact"
                    placeholder="Ex: Clínica Central"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Observações</label>
                  <textarea
                    value={formData.observacoes}
                    onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                    className="input-compact h-16 resize-none"
                    placeholder="Notas..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-10 bg-[#0047AB] text-white rounded-xl font-black text-xs hover:bg-blue-700 transition-all shadow-xl shadow-blue-900/20 disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                >
                  {submitting ? <Loader2 className="animate-spin" size={16} /> : 'Confirmar Agendamento'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
