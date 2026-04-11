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
  CalendarCheck,
  Crown
} from 'lucide-react';
import { formatDate, cn } from '../lib/utils';
import ProGuard from '../components/ProGuard';
import { sendAppointmentConfirmation } from '../services/emailService';

export default function Appointments() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  
  // Form
  const [targetEmail, setTargetEmail] = useState('');
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [service, setService] = useState('Consulta de Fisioterapia');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      const currentPath = window.location.pathname + window.location.search;
      navigate(`/login?redirectTo=${encodeURIComponent(currentPath)}`);
      return;
    }

    let cleanupRealtime: (() => void) | undefined;

    if (profile) {
      fetchAppointments(profile);
      cleanupRealtime = setupRealtime(profile);
      fetchAvailableUsers(profile);
    } else {
      setLoading(false);
    }

    return () => {
      if (cleanupRealtime) cleanupRealtime();
    };
  }, [profile, authLoading, user]);

  const fetchAvailableUsers = async (currentProfile: any) => {
    try {
      const isPatient = currentProfile.tipo_usuario === 'paciente';
      const targetRoles = isPatient ? ['fisioterapeuta'] : ['paciente'];
      
      let query = supabase
        .from('perfis')
        .select('id, nome_completo, email, plano, status_aprovacao, tipo_usuario');
      
      const { data, error } = await query.order('nome_completo');
      
      if (error) {
        console.error("Erro ao buscar usuários disponíveis:", error);
        // Retry without ordering if it failed
        const { data: retryData, error: retryError } = await supabase.from('perfis').select('id, nome_completo, email, plano, status_aprovacao, tipo_usuario');
        if (retryError) throw retryError;
        filterAndSetUsers(retryData || [], isPatient, targetRoles);
      } else {
        filterAndSetUsers(data || [], isPatient, targetRoles);
      }
    } catch (err) {
      console.error("Erro fatal ao buscar usuários disponíveis:", err);
    }
  };

  const filterAndSetUsers = (users: any[], isPatient: boolean, targetRoles: string[]) => {
    const filtered = users.filter(u => {
      const isTargetRole = targetRoles.includes(u.tipo_usuario);
      
      if (!isTargetRole) return false;
      
      // Se for paciente buscando fisioterapeuta, filtrar aprovados ou pendentes para visibilidade
      if (isPatient) {
        return u.status_aprovacao === 'aprovado' || u.status_aprovacao === 'pendente';
      }
      
      return true;
    });
    
    setAvailableUsers(filtered);
  };

  const fetchAppointments = async (currentProfile: any) => {
    try {
      const isPhysio = currentProfile.tipo_usuario === 'fisioterapeuta';
      const { data, error } = await supabase
        .from('agendamentos')
        .select(`
          *,
          paciente:perfis!paciente_id (nome_completo, email),
          fisioterapeuta:perfis!fisio_id (nome_completo, email)
        `)
        .eq(isPhysio ? 'fisio_id' : 'paciente_id', currentProfile.id);

      if (error) {
        console.error("Erro ao buscar agendamentos com join:", error);
        
        // Fallback: fetch without join and then fetch profiles manually
        const { data: basicData, error: basicError } = await supabase
          .from('agendamentos')
          .select('*')
          .eq(isPhysio ? 'fisio_id' : 'paciente_id', currentProfile.id);
        
        if (basicError) throw basicError;
        
        if (basicData && basicData.length > 0) {
          const patientIds = [...new Set(basicData.map(a => a.paciente_id))];
          const physioIds = [...new Set(basicData.map(a => a.fisio_id))];
          const allIds = [...new Set([...patientIds, ...physioIds])];
          
          const { data: profilesData } = await supabase
            .from('perfis')
            .select('id, nome_completo, email')
            .in('id', allIds);
          
          const profilesMap = (profilesData || []).reduce((acc: any, p: any) => {
            acc[p.id] = p;
            return acc;
          }, {});
          
          const enrichedData = basicData.map(a => ({
            ...a,
            paciente: profilesMap[a.paciente_id] || { nome_completo: 'Usuário não encontrado', email: '' },
            fisioterapeuta: profilesMap[a.fisio_id] || { nome_completo: 'Usuário não encontrado', email: '' }
          }));
          
          setAppointments(enrichedData);
        } else {
          setAppointments([]);
        }
      } else {
        setAppointments(data || []);
      }
      
      // Check for ID in URL
      const params = new URLSearchParams(window.location.search);
      const appId = params.get('id');
      if (appId && isPhysio) {
        const appToConfirm = (data || []).find(a => a.id === appId);
        if (appToConfirm && appToConfirm.status === 'pendente') {
          setSelectedAppId(appId);
        }
      }
    } catch (error) {
      console.error("Erro ao buscar agendamentos:", error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtime = (currentProfile: any) => {
    const isPhysio = currentProfile.tipo_usuario === 'fisioterapeuta';
    const channel = supabase
      .channel(`agendamentos_changes_${Math.random().toString(36).substring(7)}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agendamentos',
          filter: `${isPhysio ? 'fisio_id' : 'paciente_id'}=eq.${currentProfile.id}`
        },
        () => {
          fetchAppointments(currentProfile);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !time || submitting || !user || !profile) return;

    if (!selectedUserId && !targetEmail) {
      import('sonner').then(({ toast }) => toast.error("Por favor, selecione um profissional/paciente ou digite o e-mail."));
      return;
    }

    setSubmitting(true);
    try {
      const isPatient = profile.tipo_usuario === 'paciente';
      let targetUser: any = null;

      if (selectedUserId) {
        targetUser = availableUsers.find(u => u.id === selectedUserId);
      } else if (targetEmail) {
        const targetRoles = isPatient ? ['fisioterapeuta'] : ['paciente'];
        
        const { data: targetUsers, error: targetError } = await supabase
          .from('perfis')
          .select('id, nome_completo, email, tipo_usuario')
          .eq('email', targetEmail.trim().toLowerCase())
          .in('tipo_usuario', targetRoles);

        if (targetError || !targetUsers || targetUsers.length === 0) {
          import('sonner').then(({ toast }) => toast.error(isPatient ? "Fisioterapeuta não encontrado com este e-mail." : "Paciente não encontrado com este e-mail."));
          setSubmitting(false);
          return;
        }
        targetUser = targetUsers[0];
      }

      if (!targetUser) {
        import('sonner').then(({ toast }) => toast.error("Usuário de destino não encontrado."));
        setSubmitting(false);
        return;
      }

      // Combine date and time correctly
      const [year, month, day] = date.split('-').map(Number);
      const [hours, minutes] = time.split(':').map(Number);
      const appointmentDate = new Date(year, month - 1, day, hours, minutes).toISOString();

      console.log("Iniciando inserção de agendamento no Supabase...");
      const isPhysio = profile.tipo_usuario === 'fisioterapeuta';

      const { data: insertData, error: insertError } = await supabase
        .from('agendamentos')
        .insert({
          paciente_id: isPatient ? user?.id : targetUser.id,
          fisio_id: isPhysio ? user?.id : targetUser.id,
          data_servico: appointmentDate,
          status: 'pendente',
          observacoes: notes,
          servico: service
        })
        .select();

      if (insertError) {
        console.error("Erro completo do Supabase ao inserir agendamento:", insertError);
        throw insertError;
      }

      const newApp = insertData && insertData.length > 0 ? insertData[0] : null;
      console.log("Agendamento criado com sucesso:", newApp);

      // Create notification for target user
      console.log("Tentando criar notificação para o usuário:", targetUser.id);
      const { data: notifData, error: notifError } = await supabase
        .from('notificacoes')
        .insert({
          user_id: targetUser.id,
          titulo: 'Nova Solicitação de Agendamento',
          mensagem: `${profile.nome_completo || 'Alguém'} solicitou uma consulta para o dia ${new Date(appointmentDate).toLocaleDateString('pt-BR')}.`,
          tipo: 'appointment',
          lida: false,
          link: '/appointments'
        })
        .select();

      if (notifError) {
        console.error("Erro ao criar notificação no banco:", notifError);
      } else {
        console.log("Notificação criada com sucesso no banco:", notifData);
      }

      // Send email notification
      const formattedDate = new Date(appointmentDate).toLocaleDateString('pt-BR');
      const formattedTime = new Date(appointmentDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      sendAppointmentConfirmation(
        isPatient ? profile.email : targetUser.email,
        isPatient ? targetUser.email : profile.email,
        {
          appointmentId: newApp?.id || '',
          patientName: isPatient ? profile.nome_completo : targetUser.nome_completo,
          physioName: isPatient ? targetUser.nome_completo : profile.nome_completo,
          date: formattedDate,
          time: formattedTime,
          service: service
        }
      );

      setShowModal(false);
      setTargetEmail('');
      setDate('');
      setTime('');
      setNotes('');
      import('sonner').then(({ toast }) => toast.success("Agendamento solicitado com sucesso!"));
    } catch (err: any) {
      console.error("Erro detalhado ao agendar:", err);
      const errorMessage = err.message || "Erro desconhecido";
      import('sonner').then(({ toast }) => toast.error(`Erro ao agendar: ${errorMessage}`));
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const app = appointments.find(a => a.id === id);
      if (!app || !profile) return;

      const { error } = await supabase
        .from('agendamentos')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
      
      // Create notification for the other party
      const isPhysio = profile.tipo_usuario === 'fisioterapeuta';
      const targetId = isPhysio ? app.paciente_id : app.fisio_id;
      const statusText = status === 'confirmado' ? 'confirmado' : 'cancelado';
      
      await supabase
        .from('notificacoes')
        .insert({
          user_id: targetId,
          titulo: `Agendamento ${statusText}`,
          mensagem: `Seu agendamento para o dia ${new Date(app.data_servico).toLocaleDateString('pt-BR')} foi ${statusText}.`,
          tipo: 'appointment',
          lida: false,
          link: '/appointments'
        });
      
      // If confirmed, send email to patient
      if (status === 'confirmado') {
        const formattedDate = new Date(app.data_servico).toLocaleDateString('pt-BR');
        const formattedTime = new Date(app.data_servico).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        sendAppointmentConfirmation(
          app.paciente.email,
          app.fisioterapeuta.email,
          {
            appointmentId: app.id,
            patientName: app.paciente.nome_completo,
            physioName: app.fisioterapeuta.nome_completo,
            date: formattedDate,
            time: formattedTime,
            service: app.servico || 'Consulta'
          }
        );
      } else if (status === 'cancelado') {
        const targetEmail = isPhysio ? app.paciente.email : app.fisioterapeuta.email;
        const targetName = isPhysio ? app.paciente.nome_completo : app.fisioterapeuta.nome_completo;
        
        // Usamos sendEmail genérico do serviço para cancelamento por enquanto
        import('../services/emailService').then(({ sendEmail }) => {
          sendEmail({
            to: targetEmail,
            event: 'appointment',
            subject: 'Agendamento Cancelado - FisioCareHub',
            body: `Olá ${targetName}, informamos que o agendamento para o dia ${new Date(app.data_servico).toLocaleDateString('pt-BR')} foi cancelado.`,
            data: { ...app, status: 'cancelado' }
          });
        });
      }
      import('sonner').then(({ toast }) => toast.success(`Status atualizado para ${status}`));
      setSelectedAppId(null);
    } catch (err) {
      console.error("Erro ao atualizar status:", err);
      import('sonner').then(({ toast }) => toast.error("Erro ao atualizar status."));
    }
  };

  if (loading) return <div className="flex justify-center pt-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  const isPhysio = profile?.tipo_usuario === 'fisioterapeuta';

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Agenda de Consultas</h1>
          <p className="text-slate-500 text-sm font-medium">Gerencie seus horários e sessões.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-black text-xs hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
        >
          <Plus size={16} /> Agendar Sessão
        </button>
      </header>

      <div className="grid gap-3">
        {appointments.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-slate-100 text-center">
            <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
              <CalendarIcon size={32} />
            </div>
            <h3 className="text-xl font-black text-slate-900">Nenhuma consulta</h3>
            <p className="text-slate-500 mt-1 text-sm font-medium">Suas sessões aparecerão aqui.</p>
          </div>
        ) : (
          appointments.map((app) => (
            <motion.div
              key={app.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center",
                  app.status === 'confirmado' ? "bg-emerald-50 text-emerald-600" :
                  app.status === 'pendente' ? "bg-amber-50 text-amber-600" :
                  "bg-slate-50 text-slate-400"
                )}>
                  <CalendarCheck size={24} />
                </div>
                <div>
                  <div className="text-base font-black text-slate-900">
                    {formatDate(app.data_servico)}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                    <User size={12} />
                    {isPhysio ? `Paciente: ${app.paciente?.nome_completo}` : `Fisio: ${app.fisioterapeuta?.nome_completo}`}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3">
                <span className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                  app.status === 'confirmado' ? "bg-emerald-100 text-emerald-700" :
                  app.status === 'pendente' ? "bg-amber-100 text-amber-700" :
                  app.status === 'cancelado' ? "bg-red-100 text-red-700" :
                  "bg-slate-100 text-slate-700"
                )}>
                  {app.status === 'pendente' ? 'Pendente' : 
                   app.status === 'confirmado' ? 'Confirmado' : 
                   app.status === 'cancelado' ? 'Cancelado' : 'Concluído'}
                </span>

                {app.status === 'pendente' && (
                  <div className="flex gap-1.5">
                    {isPhysio && (
                      <button
                        onClick={() => updateStatus(app.id, 'confirmado')}
                        className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-all"
                        title="Confirmar"
                      >
                        <Check size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => updateStatus(app.id, 'cancelado')}
                      className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all"
                      title="Cancelar"
                    >
                      <XCircle size={16} />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Modal */}
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
              className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl p-6 overflow-hidden"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Agendar Sessão</h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-50 rounded-full transition-all">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSchedule} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                <div>
                  <label className="block text-[10px] font-black text-slate-700 uppercase tracking-widest mb-1.5 ml-1">
                    {isPhysio ? 'Paciente' : 'Fisioterapeuta'}
                  </label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => {
                      setSelectedUserId(e.target.value);
                      if (e.target.value) setTargetEmail('');
                    }}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 mb-2 text-sm"
                  >
                    <option value="">Selecione da lista...</option>
                    {availableUsers.map(u => (
                      <option key={u.id} value={u.id}>{u.nome_completo}</option>
                    ))}
                  </select>
                  <div className="relative py-1.5">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                    <div className="relative flex justify-center text-[9px] uppercase"><span className="bg-white px-2 text-slate-400 font-bold">Ou e-mail</span></div>
                  </div>
                  <input
                    type="email"
                    value={targetEmail}
                    onChange={(e) => {
                      setTargetEmail(e.target.value);
                      if (e.target.value) setSelectedUserId('');
                    }}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                    placeholder="email@exemplo.com"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-700 uppercase tracking-widest mb-1.5 ml-1">Serviço</label>
                  <select
                    value={service}
                    onChange={(e) => setService(e.target.value)}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none text-sm"
                  >
                    <option value="Consulta de Fisioterapia">Consulta de Fisioterapia</option>
                    <option value="Avaliação Inicial">Avaliação Inicial</option>
                    <option value="Sessão de Reabilitação">Sessão de Reabilitação</option>
                    <option value="Pilates Clínico">Pilates Clínico</option>
                    <option value="RPG">RPG</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-slate-700 uppercase tracking-widest mb-1.5 ml-1">Data</label>
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-700 uppercase tracking-widest mb-1.5 ml-1">Hora</label>
                    <input
                      type="time"
                      required
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                    />
                  </div>
                </div>

                {isPhysio && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center text-blue-600 shadow-sm">
                        <CalendarIcon size={18} />
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-900">Recorrente</p>
                        <p className="text-[9px] text-slate-400 font-medium">Semanalmente</p>
                      </div>
                    </div>
                    <ProGuard variant="inline">
                      <div className="w-10 h-5 bg-slate-200 rounded-full relative cursor-not-allowed opacity-50">
                        <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm" />
                      </div>
                    </ProGuard>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-black text-slate-700 uppercase tracking-widest mb-1.5 ml-1">Observações</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 resize-none h-20 text-sm"
                    placeholder="Notas..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-12 bg-blue-600 text-white rounded-xl font-black text-sm hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
                >
                  {submitting ? <Loader2 className="animate-spin" size={18} /> : 'Confirmar Agendamento'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Confirmation Modal for Link */}
      <AnimatePresence>
        {selectedAppId && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedAppId(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl p-6 text-center"
            >
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CalendarCheck size={32} />
              </div>
              <h2 className="text-xl font-black mb-1.5 text-slate-900">Confirmar Agendamento?</h2>
              <p className="text-slate-500 text-sm font-medium mb-6">
                Você recebeu uma solicitação de consulta. Deseja confirmar agora?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    updateStatus(selectedAppId, 'cancelado');
                    setSelectedAppId(null);
                  }}
                  className="flex-1 h-11 bg-slate-100 text-slate-600 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  Recusar
                </button>
                <button
                  onClick={() => {
                    updateStatus(selectedAppId, 'confirmado');
                    setSelectedAppId(null);
                  }}
                  className="flex-1 h-11 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
