import { useState, useEffect } from 'react';
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
  CalendarCheck
} from 'lucide-react';
import { formatDate, cn } from '../lib/utils';

export default function Appointments() {
  const { user, loading: authLoading } = useAuth();
  const [userData, setUserData] = useState<any>(null);
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
    const fetchUser = async () => {
      if (user) {
        const { data: profile } = await supabase
          .from('perfis')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          setUserData(profile);
          fetchAppointments(profile);
          setupRealtime(profile);
          
          // Fetch available users for scheduling
          const targetRole = profile.tipo_usuario === 'paciente' ? 'fisioterapeuta' : 'paciente';
          const { data } = await supabase
            .from('perfis')
            .select('id, nome_completo, email')
            .eq('tipo_usuario', targetRole)
            .order('nome_completo');
          if (data) setAvailableUsers(data);
        }
      } else if (!authLoading) {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchUser();
    }
  }, [user, authLoading]);

  const fetchAppointments = async (profile: any) => {
    const isPhysio = profile.tipo_usuario === 'fisioterapeuta';
    const { data, error } = await supabase
      .from('agendamentos')
      .select(`
        *,
        paciente:paciente_id (nome_completo, email),
        fisioterapeuta:fisio_id (nome_completo, email)
      `)
      .eq(isPhysio ? 'fisio_id' : 'paciente_id', profile.id)
      .order('data_servico', { ascending: true });

    if (error) {
      console.error("Erro ao buscar agendamentos:", error);
    } else {
      setAppointments(data || []);
      
      // Check for ID in URL
      const params = new URLSearchParams(window.location.search);
      const appId = params.get('id');
      if (appId && isPhysio) {
        const appToConfirm = data?.find(a => a.id === appId);
        if (appToConfirm && appToConfirm.status === 'pendente') {
          setSelectedAppId(appId);
        }
      }
    }
    setLoading(false);
  };

  const setupRealtime = (profile: any) => {
    const isPhysio = profile.tipo_usuario === 'fisioterapeuta';
    const channel = supabase
      .channel('agendamentos_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agendamentos',
          filter: `${isPhysio ? 'fisio_id' : 'paciente_id'}=eq.${profile.id}`
        },
        () => {
          fetchAppointments(profile);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendEmail = async (to: string, subject: string, body: string) => {
    try {
      const { invokeFunction } = await import('../lib/supabase');
      await invokeFunction('send-email', { to, subject, body });
      console.log("E-mail enviado com sucesso via Edge Function.");
    } catch (err) {
      console.error("Erro ao enviar e-mail via Edge Function:", err);
    }
  };

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !time || submitting || !user || !userData) return;

    if (!selectedUserId && !targetEmail) {
      import('sonner').then(({ toast }) => toast.error("Por favor, selecione um profissional/paciente ou digite o e-mail."));
      return;
    }

    setSubmitting(true);
    try {
      let targetUser: any = null;

      if (selectedUserId) {
        targetUser = availableUsers.find(u => u.id === selectedUserId);
      } else if (targetEmail) {
        const targetRole = userData.tipo_usuario === 'paciente' ? 'fisioterapeuta' : 'paciente';
        const { data: targetUsers, error: targetError } = await supabase
          .from('perfis')
          .select('id, nome_completo, email, tipo_usuario')
          .eq('email', targetEmail.trim().toLowerCase())
          .eq('tipo_usuario', targetRole);

        if (targetError || !targetUsers || targetUsers.length === 0) {
          import('sonner').then(({ toast }) => toast.error(userData.tipo_usuario === 'paciente' ? "Fisioterapeuta não encontrado com este e-mail." : "Paciente não encontrado com este e-mail."));
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
      const { data: newApp, error: insertError } = await supabase
        .from('agendamentos')
        .insert({
          paciente_id: userData.tipo_usuario === 'paciente' ? user?.id : targetUser.id,
          fisio_id: userData.tipo_usuario === 'fisioterapeuta' ? user?.id : targetUser.id,
          data_servico: appointmentDate,
          status: 'pendente',
          observacoes: notes,
          servico: service
        })
        .select(`
          *,
          paciente:paciente_id (nome_completo, email),
          fisioterapeuta:fisio_id (nome_completo, email)
        `)
        .single();

      if (insertError) {
        console.error("Erro ao inserir agendamento:", insertError);
        throw insertError;
      }

      if (!newApp) {
        console.error("Nenhum dado retornado após inserção de agendamento.");
        throw new Error("Falha ao criar agendamento: Nenhum dado retornado.");
      }

      console.log("Agendamento criado com sucesso:", newApp);

      // Create notification for target user
      await supabase
        .from('notificacoes')
        .insert({
          user_id: targetUser.id,
          titulo: 'Nova Solicitação de Agendamento',
          mensagem: `${userData.nome_completo} solicitou uma consulta para o dia ${new Date(appointmentDate).toLocaleDateString('pt-BR')}.`,
          type: 'appointment',
          lida: false,
          link: '/appointments'
        });

      // Send email notification
      const confirmLink = `${window.location.origin}/appointments?id=${newApp.id}`;
      const recipientEmail = targetUser.email;
      
      if (userData.tipo_usuario === 'paciente') {
        // Patient scheduling -> Notify Physio
        await sendEmail(
          recipientEmail,
          "Novo Agendamento - FisioCareHub",
          `
          <div style="font-family: sans-serif; color: #334155;">
            <h2 style="color: #2563eb;">Olá, ${targetUser.nome_completo}!</h2>
            <p>O paciente <strong>${userData.nome_completo}</strong> solicitou um novo agendamento.</p>
            <p><strong>Data:</strong> ${new Date(appointmentDate).toLocaleDateString('pt-BR')}</p>
            <p><strong>Horário:</strong> ${new Date(appointmentDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
            <p><strong>Observações:</strong> ${notes || 'Nenhuma'}</p>
            <br/>
            <a href="${confirmLink}" style="background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
              Confirmar Agendamento
            </a>
          </div>
          `
        );
      } else {
        // Physio scheduling -> Notify Patient
        await sendEmail(
          recipientEmail,
          "Nova Consulta Agendada - FisioCareHub",
          `
          <div style="font-family: sans-serif; color: #334155;">
            <h2 style="color: #2563eb;">Olá, ${targetUser.nome_completo}!</h2>
            <p>O(A) ${userData.genero === 'female' ? 'Dra.' : 'Dr.'} <strong>${userData.nome_completo}</strong> agendou uma nova sessão para você.</p>
            <p><strong>Data:</strong> ${new Date(appointmentDate).toLocaleDateString('pt-BR')}</p>
            <p><strong>Horário:</strong> ${new Date(appointmentDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
            <p><strong>Observações:</strong> ${notes || 'Nenhuma'}</p>
            <br/>
            <p>Acesse o painel para ver os detalhes da sua sessão.</p>
          </div>
          `
        );
      }

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
      if (!app) return;

      const { error } = await supabase
        .from('agendamentos')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
      
      // Create notification for the other party
      const isPhysio = userData.tipo_usuario === 'fisioterapeuta';
      const targetId = isPhysio ? app.paciente_id : app.fisio_id;
      const statusText = status === 'confirmado' ? 'confirmado' : 'cancelado';
      
      await supabase
        .from('notificacoes')
        .insert({
          user_id: targetId,
          titulo: `Agendamento ${statusText}`,
          mensagem: `Seu agendamento para o dia ${new Date(app.data_servico).toLocaleDateString('pt-BR')} foi ${statusText}.`,
          type: 'appointment',
          lida: false,
          link: '/appointments'
        });
      
      // If confirmed, send email to patient
      if (status === 'confirmado') {
        await sendEmail(
          app.paciente.email,
          "Consulta Confirmada - FisioCareHub",
          `
          <div style="font-family: sans-serif; color: #334155;">
            <h2 style="color: #10b981;">Olá, ${app.paciente.nome_completo}!</h2>
            <p>Sua consulta com <strong>${app.fisioterapeuta.nome_completo}</strong> foi confirmada.</p>
            <p><strong>Data:</strong> ${new Date(app.data_servico).toLocaleDateString('pt-BR')}</p>
            <p><strong>Horário:</strong> ${new Date(app.data_servico).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
            <br/>
            <p>Estamos ansiosos para atendê-lo!</p>
          </div>
          `
        );
      } else if (status === 'cancelado') {
        const targetEmail = isPhysio ? app.paciente.email : app.fisioterapeuta.email;
        const targetName = isPhysio ? app.paciente.nome_completo : app.fisioterapeuta.nome_completo;
        
        await sendEmail(
          targetEmail,
          "Agendamento Cancelado - FisioCareHub",
          `
          <div style="font-family: sans-serif; color: #334155;">
            <h2 style="color: #ef4444;">Aviso de Cancelamento</h2>
            <p>Olá, ${targetName}.</p>
            <p>Informamos que o agendamento para o dia <strong>${new Date(app.data_servico).toLocaleDateString('pt-BR')}</strong> foi cancelado.</p>
            <br/>
            <p>Por favor, acesse o aplicativo para reagendar ou entrar em contato.</p>
          </div>
          `
        );
      }
      import('sonner').then(({ toast }) => toast.success(`Status atualizado para ${status}`));
    } catch (err) {
      console.error("Erro ao atualizar status:", err);
      import('sonner').then(({ toast }) => toast.error("Erro ao atualizar status."));
    }
  };

  if (loading) return <div className="flex justify-center pt-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  const isPhysio = userData?.tipo_usuario === 'fisioterapeuta';

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Agenda de Consultas</h1>
          <p className="text-slate-500">Gerencie seus horários e sessões.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100"
        >
          <Plus size={20} /> Agendar Sessão
        </button>
      </header>

      <div className="grid gap-4">
        {appointments.length === 0 ? (
          <div className="bg-white p-20 rounded-[2.5rem] border border-slate-100 text-center">
            <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-6">
              <CalendarIcon size={40} />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Nenhuma consulta agendada</h3>
            <p className="text-slate-500 mt-2">Suas sessões aparecerão aqui.</p>
          </div>
        ) : (
          appointments.map((app) => (
            <motion.div
              key={app.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center",
                  app.status === 'confirmado' ? "bg-emerald-50 text-emerald-600" :
                  app.status === 'pendente' ? "bg-amber-50 text-amber-600" :
                  "bg-slate-50 text-slate-400"
                )}>
                  <CalendarCheck size={28} />
                </div>
                <div>
                  <div className="text-lg font-bold text-slate-900">
                    {formatDate(app.data_servico)}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <User size={14} />
                    {isPhysio ? `Paciente: ${app.paciente?.nome_completo}` : `Fisioterapeuta: ${app.fisioterapeuta?.nome_completo}`}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className={cn(
                  "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
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
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateStatus(app.id, 'confirmado')}
                      className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
                      title="Confirmar"
                    >
                      <Check size={18} />
                    </button>
                    <button
                      onClick={() => updateStatus(app.id, 'cancelado')}
                      className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                      title="Cancelar"
                    >
                      <XCircle size={18} />
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
              className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-8"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold">Agendar Sessão</h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-50 rounded-full">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSchedule} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    {isPhysio ? 'Selecionar Paciente' : 'Selecionar Fisioterapeuta'}
                  </label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => {
                      setSelectedUserId(e.target.value);
                      if (e.target.value) setTargetEmail('');
                    }}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 mb-2"
                  >
                    <option value="">Selecione da lista...</option>
                    {availableUsers.map(u => (
                      <option key={u.id} value={u.id}>{u.nome_completo} ({u.email})</option>
                    ))}
                  </select>
                  <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-slate-400 font-bold">Ou digite o e-mail</span></div>
                  </div>
                  <input
                    type="email"
                    value={targetEmail}
                    onChange={(e) => {
                      setTargetEmail(e.target.value);
                      if (e.target.value) setSelectedUserId('');
                    }}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="email@exemplo.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Serviço</label>
                  <select
                    value={service}
                    onChange={(e) => setService(e.target.value)}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none"
                  >
                    <option value="Consulta de Fisioterapia">Consulta de Fisioterapia</option>
                    <option value="Avaliação Inicial">Avaliação Inicial</option>
                    <option value="Sessão de Reabilitação">Sessão de Reabilitação</option>
                    <option value="Pilates Clínico">Pilates Clínico</option>
                    <option value="RPG">RPG</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Data</label>
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Horário</label>
                    <input
                      type="time"
                      required
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Observações</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 resize-none h-24"
                    placeholder="Alguma observação importante?"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="animate-spin" /> : 'Confirmar Agendamento'}
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
              className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-8 text-center"
            >
              <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <CalendarCheck size={40} />
              </div>
              <h2 className="text-2xl font-bold mb-2">Confirmar Agendamento?</h2>
              <p className="text-slate-500 mb-8">
                Você recebeu uma solicitação de consulta. Deseja confirmar agora?
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    updateStatus(selectedAppId, 'cancelado');
                    setSelectedAppId(null);
                  }}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                >
                  Recusar
                </button>
                <button
                  onClick={() => {
                    updateStatus(selectedAppId, 'confirmado');
                    setSelectedAppId(null);
                  }}
                  className="flex-1 py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100"
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
