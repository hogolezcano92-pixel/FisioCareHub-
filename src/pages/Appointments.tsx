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
  Crown,
  HelpCircle
} from 'lucide-react';
import { formatDate, cn } from '../lib/utils';
import ProGuard from '../components/ProGuard';
import { sendAppointmentConfirmation } from '../services/emailService';
import { triggerWhatsAppNotification } from '../services/notificationService';
import PaymentModal from '../components/PaymentModal';
import { Wallet } from 'lucide-react';

export default function Appointments() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  
  // Payment State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  
  // Form
  const [targetEmail, setTargetEmail] = useState('');
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [service, setService] = useState('Consulta de Fisioterapia');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeServices, setActiveServices] = useState<any[]>([]);
  const [activePackages, setActivePackages] = useState<any[]>([]);
  const [configServicos, setConfigServicos] = useState<any>(null);
  const [currentPrice, setCurrentPrice] = useState(0);

  // Fetch prices and dynamic services when a user (physio) is selected
  useEffect(() => {
    const fetchPhysioData = async () => {
      if (!selectedUserId) {
        setActiveServices([]);
        setActivePackages([]);
        setConfigServicos(null);
        setCurrentPrice(0);
        return;
      }

      try {
        // 1. Fetch Dynamic Services
        const { data: svcs, error: svcsError } = await supabase
          .from('physiotherapist_services')
          .select('*')
          .eq('physiotherapist_id', selectedUserId)
          .eq('is_active', true);
        
        if (!svcsError && svcs) setActiveServices(svcs);

        // 2. Fetch Packages
        const { data: pkgs, error: pkgsError } = await supabase
          .from('service_packages')
          .select('*')
          .eq('physiotherapist_id', selectedUserId)
          .eq('is_active', true);
        
        if (!pkgsError && pkgs) setActivePackages(pkgs);

        // 3. Fallback to legacy config (still fetching it for backward compatibility)
        const { data, error } = await supabase
          .from('configuracao_servicos')
          .select('*')
          .eq('physio_id', selectedUserId)
          .single();

        if (error) {
          console.log('Nenhuma configuração de preços específica encontrada para este profissional.');
          const physio = availableUsers.find(u => u.id === selectedUserId);
          const basePrice = physio?.preco_sessao || 0;
          setConfigServicos(null);
          if (svcs && svcs.length === 0) setCurrentPrice(basePrice);
        } else {
          setConfigServicos(data);
        }
      } catch (err) {
        console.error('Erro ao buscar dados do fisioterapeuta:', err);
      }
    };

    fetchPhysioData();
  }, [selectedUserId, availableUsers]);

  // Update price when service type changes
  const updatePrice = (serviceType: string, config: any) => {
    if (!config) return;
    
    let price = 0;
    switch (serviceType) {
      case 'Avaliação Inicial':
        price = config.avaliacao_inicial;
        break;
      case 'Consulta de Fisioterapia':
      case 'Sessão de Reabilitação':
        price = config.sessao_fisioterapia;
        break;
      case 'RPG':
        price = config.rpg;
        break;
      case 'Pilates Clínico':
        price = config.pilates;
        break;
      case 'Fisioterapia Domiciliar':
        price = config.domiciliar;
        break;
      default:
        price = config.sessao_fisioterapia || 0;
    }
    setCurrentPrice(price || 0);
  };

  useEffect(() => {
    if (!service) return;

    if (service.startsWith('service:')) {
      const name = service.replace('service:', '');
      const svc = activeServices.find(s => s.name === name);
      if (svc) setCurrentPrice(Number(svc.base_price));
    } else if (service.startsWith('package:')) {
      const name = service.replace('package:', '');
      const pkg = activePackages.find(p => p.name === name);
      if (pkg) setCurrentPrice(Number(pkg.total_price));
    } else {
      // Legacy fallback
      if (configServicos) {
        updatePrice(service, configServicos);
      }
    }
  }, [service, activeServices, activePackages, configServicos]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('status') === 'success') {
      import('sonner').then(({ toast }) => toast.success("Pagamento realizado com sucesso! Seu agendamento foi agendado."));
      // Remove query params to avoid repeated toasts
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

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
      fetchSessions(profile);
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
        .select('id, nome_completo, email, plano, status_aprovacao, tipo_usuario, telefone, endereco, cidade, estado, cep, data_nascimento, avatar_url');
      
      const { data, error } = await query.order('nome_completo');
      
      if (error) {
        console.error("Erro ao buscar usuários disponíveis:", error);
        // Retry without ordering if it failed
        const { data: retryData, error: retryError } = await supabase.from('perfis').select('id, nome_completo, email, plano, status_aprovacao, tipo_usuario, telefone, endereco, cidade, estado, cep, data_nascimento, avatar_url');
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

  const fetchSessions = async (currentProfile: any) => {
    try {
      const isPhysio = currentProfile.tipo_usuario === 'fisioterapeuta';
      const { data, error } = await supabase
        .from('sessoes')
        .select('*')
        .eq(isPhysio ? 'fisioterapeuta_id' : 'paciente_id', currentProfile.id);

      if (error) throw error;
      setSessions(data || []);
    } catch (err) {
      console.error("Erro ao buscar sessões:", err);
    }
  };

  const fetchAppointments = async (currentProfile: any) => {
    try {
      const isPhysio = currentProfile.tipo_usuario === 'fisioterapeuta';
      let query = supabase
        .from('agendamentos')
        .select(`
          *,
          paciente:perfis(id, nome_completo, email, telefone, endereco, cidade, estado, cep, data_nascimento, avatar_url),
          fisioterapeuta:perfis(id, nome_completo, email, telefone, endereco, cidade, estado, cep, data_nascimento, avatar_url)
        `)
        .eq(isPhysio ? 'fisio_id' : 'paciente_id', currentProfile.id);

      if (isPhysio) {
        query = query.neq('status', 'pendente_pagamento');
      }

      const { data, error } = await query;

      if (error) {
        console.error("Erro ao buscar agendamentos com join:", error);
        
        // Fallback: fetch without join and then fetch profiles manually
        let fallbackQuery = supabase
          .from('agendamentos')
          .select('*')
          .eq(isPhysio ? 'fisio_id' : 'paciente_id', currentProfile.id);

        if (isPhysio) {
          fallbackQuery = fallbackQuery.neq('status', 'pendente_pagamento');
        }

        const { data: basicData, error: basicError } = await fallbackQuery;
        
        if (basicError) throw basicError;
        
        if (basicData && basicData.length > 0) {
          const patientIds = [...new Set(basicData.map(a => a.paciente_id))];
          const physioIds = [...new Set(basicData.map(a => a.fisio_id))];
          const allIds = [...new Set([...patientIds, ...physioIds])];
          
          const { data: profilesData } = await supabase
            .from('perfis')
            .select('id, nome_completo, email, telefone, endereco, cidade, estado, cep, data_nascimento, avatar_url')
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
      const isPhysio = profile.tipo_usuario === 'fisioterapeuta';
      let targetUser: any = null;

      if (selectedUserId) {
        targetUser = availableUsers.find(u => u.id === selectedUserId);
      } else if (targetEmail) {
        const targetRoles = isPatient ? ['fisioterapeuta'] : ['paciente'];
        
        const { data: targetUsers, error: targetError } = await supabase
          .from('perfis')
          .select('id, nome_completo, email, tipo_usuario, telefone, endereco')
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

      // 1. Correção do Erro de Data ('Pattern mismatch')
      const sqlDate = date; // YYYY-MM-DD
      const sqlTime = time.length === 5 ? `${time}:00` : time; // HH:mm:ss
      const sqlTimestamp = `${sqlDate}T${sqlTime}`;

      // Clean Service/Package Name
      const finalService = service.startsWith('service:') 
        ? service.replace('service:', '') 
        : service.startsWith('package:') 
          ? `Pacote: ${service.replace('package:', '')}` 
          : service;

      console.log("Iniciando agendamento...", { sqlDate, sqlTime, sqlTimestamp });

      // 2. Ajuste de Colunas no Banco (Supabase)
      const { data: insertData, error: insertError } = await supabase
        .from('agendamentos')
        .insert({
          paciente_id: isPatient ? user.id : targetUser.id,
          fisio_id: isPhysio ? user.id : targetUser.id,
          data: sqlDate,
          hora: sqlTime,
          data_servico: sqlTimestamp,
          status: 'pendente_pagamento',
          observacoes: notes,
          servico: finalService,
          valor: currentPrice
        })
        .select();

      if (insertError) {
        console.error("Erro detalhado:", insertError);
        throw insertError;
      }

      const newApp = insertData && insertData.length > 0 ? insertData[0] : null;

      // 3. Redirecionamento para a página de pagamento interna
      if (newApp && targetUser.tipo_usuario === 'fisioterapeuta' && currentPrice > 0) {
        setShowModal(false);
        setTargetEmail('');
        setDate('');
        setTime('');
        setNotes('');
        import('sonner').then(({ toast }) => toast.success('Agendamento registrado! Redirecionando para o pagamento...'));
        setTimeout(() => {
          navigate(`/pagamento/${newApp.id}`);
        }, 1500);
        return;
      }

      // Fluxo para casos onde não há pagamento (ex: fisio agendando para paciente ou preço zero)
      setShowModal(false);
      setTargetEmail('');
      setDate('');
      setTime('');
      setNotes('');
      import('sonner').then(({ toast }) => toast.success("Agendamento solicitado com sucesso!"));
    } catch (err: any) {
      console.error("Erro geral no handleSchedule:", err);
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
      
      // If confirmed or cancelled, send email
      if (status === 'confirmado' || status === 'cancelado') {
        const formattedDate = new Date(app.data_servico).toLocaleDateString('pt-BR');
        const formattedTime = new Date(app.data_servico).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const { sendAppointmentStatusEmail } = await import('../services/emailService');

        // Trigger WhatsApp Notification
        if (status === 'cancelado') {
          triggerWhatsAppNotification('canceled', id);
        }

        if (status === 'confirmado') {
          sendAppointmentStatusEmail(
            app.paciente.email,
            app.paciente.nome_completo,
            app.fisioterapeuta.nome_completo,
            'confirmado',
            {
              date: formattedDate,
              time: formattedTime,
              service: app.servico || 'Consulta'
            }
          );
        } else if (status === 'cancelado') {
          const targetEmail = isPhysio ? app.paciente.email : app.fisioterapeuta.email;
          const targetName = isPhysio ? app.paciente.nome_completo : app.fisioterapeuta.nome_completo;
          
          sendAppointmentStatusEmail(
            targetEmail,
            targetName,
            isPhysio ? profile.nome_completo : app.fisioterapeuta.nome_completo,
            'cancelado',
            {
              date: formattedDate,
              time: formattedTime,
              service: app.servico || 'Consulta'
            }
          );
        }
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
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-white tracking-tight">Agenda de Consultas</h1>
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('toggle-help-center', { 
                detail: { search: 'agendamento' } 
              }))}
              className="text-[10px] font-black text-blue-400 uppercase tracking-widest bg-blue-600/10 px-2 py-0.5 rounded-full border border-blue-500/20 hover:bg-blue-600/20 transition-all"
            >
              Precisa de ajuda?
            </button>
          </div>
          <p className="text-slate-400 text-sm font-medium">Gerencie seus horários e sessões.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-sky-500 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-sky-600 transition-all shadow-lg shadow-sky-900/20"
        >
          <Plus size={16} /> Agendar Sessão
        </button>
      </header>

      <div className="grid gap-3">
        {appointments.length === 0 ? (
          <div className="bg-slate-900/50 backdrop-blur-xl p-12 rounded-3xl border border-white/10 text-center">
            <div className="w-16 h-16 bg-white/5 text-slate-700 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
              <CalendarIcon size={32} />
            </div>
            <h3 className="text-xl font-black text-white">Nenhuma consulta</h3>
            <p className="text-slate-400 mt-1 text-sm font-medium">Suas sessões aparecerão aqui.</p>
          </div>
        ) : (
          appointments.map((app) => (
            <motion.div
              key={app.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-slate-900/50 backdrop-blur-xl p-4 rounded-2xl border border-white/10 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center",
                  app.status === 'confirmado' ? "bg-emerald-500/10 text-emerald-400" :
                  app.status === 'pendente' ? "bg-amber-500/10 text-amber-400" :
                  "bg-slate-800 text-slate-600"
                )}>
                  <CalendarCheck size={24} />
                </div>
                <div>
                  <div className="text-base font-black text-white">
                    {formatDate(app.data_servico)}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                    <User size={12} />
                    {isPhysio ? `Paciente: ${app.paciente?.nome_completo}` : `Fisio: ${app.fisioterapeuta?.nome_completo}`}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3">
                <span className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                  app.status === 'confirmado' ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20" :
                  app.status === 'pendente' || app.status === 'pendente_pagamento' ? "bg-amber-500/20 text-amber-400 border border-amber-500/20" :
                  app.status === 'cancelado' ? "bg-red-500/20 text-red-400 border border-red-500/20" :
                  "bg-slate-800 text-slate-600"
                )}>
                  {app.status === 'pendente' ? 'Pendente' : 
                   app.status === 'pendente_pagamento' ? 'Aguardando Pagamento' :
                   app.status === 'confirmado' ? 'Confirmado' : 
                   app.status === 'cancelado' ? 'Cancelado' : 'Concluído'}
                </span>

                {(app.status === 'pendente' || app.status === 'pendente_pagamento') && !isPhysio && (
                  <button
                    onClick={() => navigate(`/pagamento/${app.id}`)}
                    className="flex items-center gap-2 px-4 py-2 bg-sky-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-sky-600 transition-all shadow-lg shadow-sky-900/20"
                  >
                    <Wallet size={14} />
                    Pagar Agora
                  </button>
                )}

                {app.status === 'confirmado' && !isPhysio && (
                  (() => {
                    const session = sessions.find(s => 
                      s.agendamento_id === app.id || 
                      (s.paciente_id === app.paciente_id && s.fisioterapeuta_id === app.fisio_id && s.data === app.data)
                    );
                    
                    if (session && (session.status_pagamento === 'pago_app' || session.status_pagamento === 'pago_manual')) {
                      return (
                        <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 border border-emerald-500/20">
                          <Check size={12} />
                          Pago
                        </span>
                      );
                    }
                    return null;
                  })()
                )}

                {app.status === 'pendente' && (
                  <div className="flex gap-1.5">
                    {isPhysio && (
                      <button
                        onClick={() => updateStatus(app.id, 'confirmado')}
                        className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition-all"
                        title="Confirmar"
                      >
                        <Check size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => updateStatus(app.id, 'cancelado')}
                      className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-all"
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
              className="relative w-full max-w-lg bg-slate-900 rounded-[2.5rem] md:rounded-[3rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 md:p-8 border-b border-white/5 flex items-center justify-between sticky top-0 bg-slate-900 z-20">
                <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">Agendar Sessão</h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/5 rounded-full transition-all text-slate-400">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8">
                <form id="schedule-form" onSubmit={handleSchedule} className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
                      {isPhysio ? 'Paciente' : 'Fisioterapeuta'}
                    </label>
                    <select
                      value={selectedUserId}
                      onChange={(e) => {
                        setSelectedUserId(e.target.value);
                        if (e.target.value) setTargetEmail('');
                      }}
                      className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600 mb-2 text-sm text-white"
                    >
                      <option value="" className="bg-slate-900">Selecione da lista...</option>
                      {availableUsers.map(u => (
                        <option key={u.id} value={u.id} className="bg-slate-900">{u.nome_completo}</option>
                      ))}
                    </select>
                    <div className="relative py-2">
                      <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
                      <div className="relative flex justify-center text-[9px] uppercase"><span className="bg-slate-900 px-2 text-slate-500 font-bold">Ou e-mail</span></div>
                    </div>
                    <input
                      type="email"
                      value={targetEmail}
                      onChange={(e) => {
                        setTargetEmail(e.target.value);
                        if (e.target.value) setSelectedUserId('');
                      }}
                      className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600 text-sm text-white"
                      placeholder="email@exemplo.com"
                    />
                  </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Serviço / Pacote</label>
                  <select
                    value={service}
                    onChange={(e) => setService(e.target.value)}
                    required
                    className="w-full p-3.5 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none text-sm text-white appearance-none"
                  >
                    <option value="" className="bg-slate-900">Selecione...</option>
                    
                    {activeServices.length > 0 ? (
                      <optgroup label="Sessões Avulsas" className="bg-slate-900 text-slate-400">
                        {activeServices.map(svc => (
                          <option key={svc.id} value={`service:${svc.name}`} className="bg-slate-900 text-white">
                            {svc.name} - Sessão Avulsa
                          </option>
                        ))}
                      </optgroup>
                    ) : (
                      <optgroup label="Serviços Padrão" className="bg-slate-900 text-slate-400">
                        <option value="Consulta de Fisioterapia" className="bg-slate-900 text-white">Consulta de Fisioterapia</option>
                        <option value="Avaliação Inicial" className="bg-slate-900 text-white">Avaliação Inicial</option>
                        <option value="Sessão de Reabilitação" className="bg-slate-900 text-white">Sessão de Reabilitação</option>
                        <option value="Pilates Clínico" className="bg-slate-900 text-white">Pilates Clínico</option>
                        <option value="RPG" className="bg-slate-900 text-white">RPG</option>
                        <option value="Fisioterapia Domiciliar" className="bg-slate-900 text-white">Fisioterapia Domiciliar</option>
                      </optgroup>
                    )}

                    {activePackages.length > 0 && (
                      <optgroup label="Pacotes de Tratamento" className="bg-slate-900 text-emerald-400">
                        {activePackages.map(pkg => (
                          <option key={pkg.id} value={`package:${pkg.name}`} className="bg-slate-900 text-white">
                            {pkg.name} - Pacote ({pkg.sessions_quantity} sessões)
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>

                {profile?.tipo_usuario === 'paciente' && currentPrice > 0 && (
                  <div className="p-4 bg-blue-600/10 rounded-2xl border border-blue-500/20 flex items-center justify-between group">
                    <div className="flex items-center gap-2 text-blue-400">
                      <Wallet size={16} />
                      <span className="text-xs font-bold uppercase tracking-widest">Valor da Sessão:</span>
                      <button 
                        type="button"
                        onClick={() => window.dispatchEvent(new CustomEvent('toggle-help-center', { 
                          detail: { search: 'pagamento' } 
                        }))}
                        className="p-1 hover:bg-blue-600/20 rounded-lg transition-all"
                        title="Dúvidas sobre pagamento?"
                      >
                        <HelpCircle size={14} />
                      </button>
                    </div>
                    <span className="text-lg font-black text-blue-400">
                      R$ {currentPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                  <div className="grid grid-cols-2 gap-4 items-end">
                    <div className="flex-1 min-w-0">
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Data</label>
                      <input
                        type="date"
                        required
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600 text-sm text-white"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Hora</label>
                      <input
                        type="time"
                        required
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600 text-sm text-white"
                      />
                    </div>
                  </div>

                {isPhysio && (
                  <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 bg-slate-800 rounded-lg flex items-center justify-center text-blue-400 shadow-sm border border-white/5">
                        <CalendarIcon size={18} />
                      </div>
                      <div>
                        <p className="text-xs font-black text-white">Recorrente</p>
                        <p className="text-[9px] text-slate-500 font-medium">Semanalmente</p>
                      </div>
                    </div>
                    <ProGuard variant="inline">
                      <div className="w-10 h-5 bg-slate-800 rounded-full relative cursor-not-allowed opacity-50">
                        <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-slate-600 rounded-full shadow-sm" />
                      </div>
                    </ProGuard>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Observações</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full p-3.5 bg-white/5 border border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 resize-none h-20 text-sm text-white"
                    placeholder="Notas..."
                  />
                </div>

                <div className="pt-4">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Observações</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600 resize-none h-24 text-sm text-white"
                    placeholder="Alguma observação importante?"
                  />
                </div>
              </form>
            </div>

            <div className="p-6 md:p-8 bg-slate-900 border-t border-white/5 sticky bottom-0 z-20">
              {profile?.tipo_usuario === 'paciente' && currentPrice > 0 && (
                <div className="p-4 mb-6 bg-blue-600/10 rounded-2xl border border-blue-500/20 flex items-center justify-between group">
                  <div className="flex items-center gap-2 text-blue-400">
                    <Wallet size={16} />
                    <span className="text-xs font-bold uppercase tracking-widest">Valor da Sessão:</span>
                    <button 
                      type="button"
                      onClick={() => window.dispatchEvent(new CustomEvent('toggle-help-center', { 
                        detail: { search: 'pagamento' } 
                      }))}
                      className="p-1 hover:bg-blue-600/20 rounded-lg transition-all"
                      title="Dúvidas sobre pagamento?"
                    >
                      <HelpCircle size={14} />
                    </button>
                  </div>
                  <span className="text-lg font-black text-blue-400">
                    R$ {currentPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              <button
                type="submit"
                form="schedule-form"
                disabled={submitting}
                className="w-full py-5 bg-sky-500 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest hover:bg-sky-600 transition-all shadow-xl shadow-sky-900/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="animate-spin" /> : 'Confirmar Solicitação'}
              </button>
            </div>
          </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Confirmation Modal for Link */}
      <AnimatePresence>
        {selectedAppId && (
          <div className="fixed inset-0 z-[50] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedAppId(null)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-slate-900 rounded-[2rem] border border-white/10 shadow-2xl p-6 text-center"
            >
              <div className="w-16 h-16 bg-sky-600/20 text-sky-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-sky-500/20">
                <CalendarCheck size={32} />
              </div>
              <h2 className="text-xl font-black mb-1.5 text-white">Confirmar Agendamento?</h2>
              <p className="text-slate-400 text-sm font-medium mb-6">
                Você recebeu uma solicitação de consulta. Deseja confirmar agora?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    updateStatus(selectedAppId, 'cancelado');
                    setSelectedAppId(null);
                  }}
                  className="flex-1 h-11 bg-white/5 text-slate-400 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all border border-white/10"
                >
                  Recusar
                </button>
                <button
                  onClick={() => {
                    updateStatus(selectedAppId, 'confirmado');
                    setSelectedAppId(null);
                  }}
                  className="flex-1 h-11 bg-sky-500 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-sky-600 transition-all shadow-lg shadow-sky-900/20"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <PaymentModal 
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          if (profile) fetchSessions(profile);
        } }
        sessionId={selectedSession?.id}
        amount={selectedSession?.valor}
        physioId={selectedSession?.fisioterapeuta_id}
      />
    </div>
  );
}
