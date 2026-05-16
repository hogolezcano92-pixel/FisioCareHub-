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
  MessageSquare,
  HelpCircle
} from 'lucide-react';
import { formatDate, cn, resolveStorageUrl, formatDateKeyBR, formatTimeBR, normalizeDateKey } from '../lib/utils';
import { formatDateBR, formatHourBR, formatOnlyDateBR } from '../utils/date';
import { toast } from 'sonner';
import { sendAppointmentConfirmation } from '../services/emailService';
import { triggerWhatsAppNotification } from '../services/notificationService';
import { logActivity } from '../services/activityService';
import { availabilityService, AvailabilityRule, ScheduleBlock } from '../services/availabilityService';


const WEEKDAYS = [
  { value: 1, label: 'Segunda' },
  { value: 2, label: 'Terça' },
  { value: 3, label: 'Quarta' },
  { value: 4, label: 'Quinta' },
  { value: 5, label: 'Sexta' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
];

const todayDateKey = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getWeekdayLabel = (dateKey: string) => {
  const normalized = normalizeDateKey(dateKey);
  if (!normalized) return '';
  const [year, month, day] = normalized.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0);
  return date.toLocaleDateString('pt-BR', { weekday: 'long' });
};

const getShortMonth = (dateKey: string) => {
  const normalized = normalizeDateKey(dateKey);
  if (!normalized) return '';
  const [year, month, day] = normalized.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0);
  return date.toLocaleDateString('pt-BR', { month: 'short' });
};

const getDayNumber = (dateKey: string) => normalizeDateKey(dateKey).split('-')[2] || '';

const createDefaultAvailabilityRules = (physioId: string): AvailabilityRule[] => WEEKDAYS.map(day => ({
  physio_id: physioId,
  weekday: day.value,
  start_time: '08:00',
  end_time: '18:00',
  session_duration_minutes: 60,
  buffer_minutes: 15,
  min_notice_hours: 2,
  cancellation_notice_hours: 24,
  is_active: day.value >= 1 && day.value <= 5,
}));

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
  const [selectedDate, setSelectedDate] = useState(todayDateKey());
  const [view, setView] = useState<'daily' | 'all'>('daily');
  const [serviceSettings, setServiceSettings] = useState<any>(null);
  const [physioServices, setPhysioServices] = useState<any[]>([]);
  const [physioPackages, setPhysioPackages] = useState<any[]>([]);
  const [availabilityRules, setAvailabilityRules] = useState<AvailabilityRule[]>([]);
  const [scheduleBlocks, setScheduleBlocks] = useState<ScheduleBlock[]>([]);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [blockForm, setBlockForm] = useState({
    block_date: todayDateKey(),
    start_time: '',
    end_time: '',
    reason: ''
  });
  
  // Form State
  const [formData, setFormData] = useState({
    paciente_id: '',
    data: todayDateKey(),
    hora: '08:00',
    tipo: '',
    local: '',
    observacoes: '',
    valor: 0
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
    fetchServiceSettings();
    loadAvailabilitySettings();
  }, [user, selectedDate, profile, authLoading, view]);

  const loadAvailabilitySettings = async () => {
    if (!user) return;
    try {
      const [rules, blocks] = await Promise.all([
        availabilityService.getRules(user.id),
        availabilityService.getBlocks(user.id),
      ]);

      setAvailabilityRules(rules.length > 0 ? rules : createDefaultAvailabilityRules(user.id));
      setScheduleBlocks(blocks);
    } catch (err) {
      console.error('Erro ao carregar disponibilidade:', err);
      setAvailabilityRules(createDefaultAvailabilityRules(user.id));
      setScheduleBlocks([]);
    }
  };

  const updateAvailabilityRule = (weekday: number, patch: Partial<AvailabilityRule>) => {
    setAvailabilityRules(prev => {
      const existing = prev.find(rule => rule.weekday === weekday);
      if (!existing) {
        return [...prev, { ...createDefaultAvailabilityRules(user?.id || '').find(rule => rule.weekday === weekday)!, ...patch }];
      }
      return prev.map(rule => rule.weekday === weekday ? { ...rule, ...patch } : rule);
    });
  };

  const handleSaveAvailability = async () => {
    if (!user) return;
    setSavingAvailability(true);
    try {
      const saved = await availabilityService.replaceRules(user.id, availabilityRules);
      setAvailabilityRules(saved.length > 0 ? saved : createDefaultAvailabilityRules(user.id));
      toast.success('Disponibilidade salva com sucesso!');
    } catch (err) {
      console.error('Erro ao salvar disponibilidade:', err);
      toast.error('Erro ao salvar disponibilidade');
    } finally {
      setSavingAvailability(false);
    }
  };

  const handleCreateBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if ((blockForm.start_time && !blockForm.end_time) || (!blockForm.start_time && blockForm.end_time)) {
      toast.error('Informe início e fim do bloqueio, ou deixe ambos vazios para bloquear o dia inteiro.');
      return;
    }

    try {
      const block = await availabilityService.createBlock({
        physio_id: user.id,
        block_date: blockForm.block_date,
        start_time: blockForm.start_time || null,
        end_time: blockForm.end_time || null,
        reason: blockForm.reason || 'Indisponível',
      });
      setScheduleBlocks(prev => [block, ...prev]);
      setBlockForm({ block_date: todayDateKey(), start_time: '', end_time: '', reason: '' });
      toast.success('Bloqueio criado com sucesso!');
    } catch (err) {
      console.error('Erro ao criar bloqueio:', err);
      toast.error('Erro ao criar bloqueio');
    }
  };

  const handleDeleteBlock = async (blockId?: string) => {
    if (!blockId) return;
    try {
      await availabilityService.deleteBlock(blockId);
      setScheduleBlocks(prev => prev.filter(block => block.id !== blockId));
      toast.success('Bloqueio removido.');
    } catch (err) {
      console.error('Erro ao remover bloqueio:', err);
      toast.error('Erro ao remover bloqueio');
    }
  };

  const fetchServiceSettings = async () => {
    if (!user) return;
    try {
      // 1. Fetch legacy settings
      const { data: legacyData, error: legacyError } = await supabase
        .from('configuracao_servicos')
        .select('*')
        .eq('physio_id', user.id)
        .maybeSingle();
      
      if (legacyError && legacyError.code !== 'PGRST116') throw legacyError;
      setServiceSettings(legacyData);

      // 2. Fetch new dynamic services
      const { data: dynamicData, error: dynamicError } = await supabase
        .from('physiotherapist_services')
        .select('*')
        .eq('physiotherapist_id', user.id)
        .eq('is_active', true)
        .order('name');

      if (dynamicError) throw dynamicError;

      // 3. Fetch packages
      const { data: packagesData, error: packagesError } = await supabase
        .from('service_packages')
        .select('*')
        .eq('physiotherapist_id', user.id)
        .eq('is_active', true)
        .order('name');
      
      if (packagesError) throw packagesError;
      setPhysioPackages(packagesData || []);

      let finalServices: any[] = [];
      if (dynamicData && dynamicData.length > 0) {
        finalServices = dynamicData;
      } else if (legacyData) {
        // Fallback mapping
        finalServices = [
          { id: 'av', name: 'Avaliação inicial', base_price: legacyData.avaliacao_inicial },
          { id: 'fis', name: 'Sessão de fisioterapia', base_price: legacyData.sessao_fisioterapia },
          { id: 'reab', name: 'Reabilitação', base_price: legacyData.reabilitacao },
          { id: 'rpg', name: 'RPG', base_price: legacyData.rpg },
          { id: 'pil', name: 'Pilates', base_price: legacyData.pilates },
          { id: 'dom', name: 'Fisioterapia domiciliar', base_price: legacyData.domiciliar },
        ].filter(s => Number(s.base_price) > 0);
      }

      setPhysioServices(finalServices);
      
      if (finalServices.length > 0 && !formData.tipo) {
        const defaultSvc = finalServices.find(s => s.name.toLowerCase().includes('avaliação')) || finalServices[0];
        setFormData(prev => ({ 
          ...prev, 
          tipo: `service:${defaultSvc.name}`,
          valor: Number(defaultSvc.base_price) || 0
        }));
      }
    } catch (err) {
      console.error('Erro ao buscar configurações de serviços:', err);
    }
  };

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
      if (!user) return;
      console.log('Buscando pacientes associados ao fisioterapeuta logado...');
      const { data, error: supabaseError } = await supabase
        .from('pacientes')
        .select('id, nome, email')
        .eq('fisioterapeuta_id', user.id)
        .order('nome');
      
      if (supabaseError) {
        console.error('Erro ao buscar pacientes associados (tentando fallback):', supabaseError);
        // Fallback para caso nome_completo exista
        const { data: retryData } = await supabase
          .from('pacientes')
          .select('id, nome_completo, email')
          .eq('fisioterapeuta_id', user.id);
        
        if (retryData) {
          setPatients(retryData.map(p => ({ ...p, nome: p.nome_completo })));
          return;
        }
        throw supabaseError;
      }
      
      console.log('Pacientes associados encontrados:', data?.length || 0);
      setPatients(data?.map(p => ({ ...p, nome_completo: (p as any).nome_completo || (p as any).nome })) || []);
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
          paciente:perfis!paciente_id (id, nome_completo, email, avatar_url, telefone, endereco, cidade, estado, cep, data_nascimento)
        `)
        .eq('fisio_id', user?.id);

      if (view === 'daily') {
        query = query.eq('data', selectedDate);
      }

      const { data, error: supabaseError } = await query
        .neq('status', 'pendente_pagamento')
        .order('data', { ascending: false })
        .order('hora');

      if (supabaseError) {
        console.error('Erro completo do Supabase ao buscar agendamentos:', supabaseError);
        // Fallback para query simples se o join falhar
        let fallbackQuery = supabase
          .from('agendamentos')
          .select('*')
          .eq('fisio_id', user?.id)
          .neq('status', 'pendente_pagamento');
        
        if (view === 'daily') {
          fallbackQuery = fallbackQuery.eq('data', selectedDate);
        }

        const { data: fallbackData, error: fallbackError } = await fallbackQuery.order('data', { ascending: false }).order('hora');
        
        if (fallbackError) throw fallbackError;
        
        if (fallbackData && fallbackData.length > 0) {
          const patientIds = [...new Set(fallbackData.map(a => a.paciente_id))];
          const { data: profiles } = await supabase
            .from('perfis')
            .select('id, nome_completo, email, avatar_url, telefone, endereco, cidade, estado, cep, data_nascimento')
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
      const currentPrice = formData.valor || 0;

      // 1. Correção do Erro de Data ('Pattern mismatch')
      const sqlDate = normalizeDateKey(formData.data); // YYYY-MM-DD
      const sqlTime = formData.hora.length === 5 ? `${formData.hora}:00` : formData.hora; // HH:mm:ss
      const sqlTimestamp = `${sqlDate}T${sqlTime}`;

      console.log('Criando agendamento (Agenda):', { sqlDate, sqlTime, sqlTimestamp });

      // Clean tipo string if it has prefix
      const tipoParaSalvar = formData.tipo.startsWith('service:') 
        ? formData.tipo.replace('service:', '') 
        : formData.tipo.startsWith('package:')
          ? `Pacote: ${formData.tipo.replace('package:', '')}`
          : formData.tipo;

      // 2. Ajuste de Colunas no Banco (Supabase)
      const { data: insertData, error } = await supabase
        .from('agendamentos')
        .insert({
          paciente_id: formData.paciente_id,
          fisio_id: user.id,
          data: sqlDate,
          hora: sqlTime,
          data_servico: sqlTimestamp,
          tipo: tipoParaSalvar,
          local: formData.local,
          observacoes: formData.observacoes,
          status: 'confirmado', // Profissional agendando já nasce confirmado ou agendado
          valor: currentPrice // Incluindo a coluna valor
        })
        .select();

      if (error) {
        console.error("Erro detalhado (Agenda):", error);
        throw error;
      }

      const newApp = insertData && insertData.length > 0 ? insertData[0] : null;
      const patient = patients.find(p => p.id === formData.paciente_id);

      if (newApp) {
        // Log activity
        await logActivity(
          user.id,
          'fisio',
          'agendamento_criado',
          `Você realizou um agendamento direto para ${patient?.nome_completo || 'um paciente'}`,
          newApp.id.toString()
        );

        if (formData.paciente_id) {
          await logActivity(
            formData.paciente_id,
            'paciente',
            'agendamento_criado',
            `O profissional agendou uma consulta para você no dia ${formatOnlyDateBR(formData.data)}`,
            newApp.id.toString()
          );
        }

        // Criar registro na tabela sessoes para pagamento
        const { error: sessionError } = await supabase
          .from('sessoes')
          .insert({
            paciente_id: formData.paciente_id,
            fisioterapeuta_id: user.id,
            agendamento_id: newApp.id,
            data: sqlDate,
            hora: sqlTime,
            valor_sessao: currentPrice,
            status_pagamento: 'pago_manual' // Assumindo que o profissional recebeu por fora se ele mesmo agendou
          });
        
        if (sessionError) console.error('Erro detalhado (Sessões Agenda):', sessionError);
      }

      if (patient && newApp) {
        const { data: patientProfile } = await supabase
          .from('perfis')
          .select('email, nome_completo, telefone, endereco, cidade, estado, cep, data_nascimento, avatar_url')
          .eq('id', patient.id)
          .single();

        if (patientProfile && profile) {
          sendAppointmentConfirmation(
            patientProfile.email,
            profile.email,
            {
              appointmentId: newApp.id,
              patientName: patientProfile.nome_completo,
              patientEmail: patientProfile.email,
              patientPhone: patientProfile.telefone,
              patientAddress: patientProfile.endereco,
              patientCity: patientProfile.cidade,
              patientState: patientProfile.estado,
              patientZip: patientProfile.cep,
              patientDOB: patientProfile.data_nascimento ? formatOnlyDateBR(patientProfile.data_nascimento) : undefined,
              patientAvatar: patientProfile.avatar_url,
              physioName: profile.nome_completo,
              physioPhone: profile.telefone,
              physioAddress: profile.endereco,
              physioEmail: profile.email,
              date: formatOnlyDateBR(formData.data),
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

      // Log activity
      await logActivity(
        user?.id || '',
        'fisio',
        status === 'concluido' ? 'agendamento_concluido' : 'agendamento_criado',
        `Status do agendamento atualizado para: ${status}`,
        id
      );

      if (app?.paciente_id) {
        await logActivity(
          app.paciente_id,
          'paciente',
          status === 'concluido' ? 'agendamento_concluido' : 'agendamento_criado',
          `Seu agendamento foi atualizado para: ${status} pelo profissional`,
          id
        );
      }

      // Enviar e-mail se confirmado ou cancelado
      if (status === 'confirmado' || status === 'cancelado') {
        const patientEmail = app.paciente?.email;
        const patientName = app.paciente?.nome_completo || app.paciente?.nome;

        // Trigger WhatsApp Notification
        if (status === 'cancelado') {
          triggerWhatsAppNotification('canceled', id);
        }

        if (patientEmail && profile) {
          const { sendAppointmentStatusEmail } = await import('../services/emailService');
          
              if (status === 'confirmado') {
                sendAppointmentStatusEmail(
                  patientEmail,
                  patientName || 'Paciente',
                  profile.nome_completo,
                  'confirmado',
                  {
                    date: app.data ? formatOnlyDateBR(app.data) : formatDateBR(app.data_servico),
                    time: app.hora || formatHourBR(app.data_servico),
                    service: app.tipo || app.servico || 'Consulta'
                  }
                );
              } else if (status === 'cancelado') {
                sendAppointmentStatusEmail(
                  patientEmail,
                  patientName || 'Paciente',
                  profile.nome_completo,
                  'cancelado',
                  {
                    date: app.data ? formatOnlyDateBR(app.data) : formatDateBR(app.data_servico),
                    time: app.hora || formatHourBR(app.data_servico),
                    service: app.tipo || app.servico || 'Consulta'
                  }
                );
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
    const normalized = normalizeDateKey(selectedDate) || todayDateKey();
    const [year, month, day] = normalized.split('-').map(Number);
    const date = new Date(year, month - 1, day, 12, 0, 0);
    date.setDate(date.getDate() + days);
    const next = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    setSelectedDate(next);
  };

  return (
    <div className="space-y-5 w-full box-border overflow-wrap-break-word">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-3 w-full">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-black text-white tracking-tight">Minha Agenda</h1>
            <button 
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('toggle-help-center', { 
                detail: { search: 'agenda', profile: 'fisioterapeuta' } 
              }))}
              className="text-[9px] font-black text-blue-400 uppercase tracking-widest bg-blue-600/10 px-2 py-0.5 rounded-full border border-blue-500/20 hover:bg-blue-600/20 transition-all"
            >
              Precisa de ajuda?
            </button>
          </div>
          <p className="text-slate-400 text-xs font-medium">Controle seus agendamentos e solicitações.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-white/5 p-1 rounded-xl flex items-center gap-1 border border-white/10">
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
            className="flex items-center justify-center gap-2 px-3.5 py-2 bg-blue-600 text-white rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-900/20"
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
            <span className="text-[8px] font-bold text-sky-400 uppercase tracking-widest mb-0.5">
              {getWeekdayLabel(selectedDate)}
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


      <section className="grid xl:grid-cols-[1.4fr_1fr] gap-4 w-full">
        <div className="bg-slate-900/50 backdrop-blur-xl p-4 rounded-[2rem] border border-white/10 shadow-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-black text-white tracking-tight">Minha disponibilidade</h2>
              <p className="text-slate-500 text-[10px] font-bold">Defina os dias e horários que aparecerão para o paciente.</p>
            </div>
            <button
              onClick={handleSaveAvailability}
              disabled={savingAvailability}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {savingAvailability ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Salvar agenda
            </button>
          </div>

          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1 custom-scrollbar">
            {WEEKDAYS.map(day => {
              const rule = availabilityRules.find(item => item.weekday === day.value) || createDefaultAvailabilityRules(user?.id || '').find(item => item.weekday === day.value)!;
              return (
                <div key={day.value} className="grid grid-cols-1 lg:grid-cols-[120px_1fr] gap-3 p-3 bg-white/5 border border-white/10 rounded-2xl">
                  <label className="flex items-center gap-2 text-white text-xs font-black">
                    <input
                      type="checkbox"
                      checked={rule.is_active}
                      onChange={(e) => updateAvailabilityRule(day.value, { is_active: e.target.checked })}
                      className="accent-blue-600"
                    />
                    {day.label}
                  </label>

                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                    <input
                      type="time"
                      value={rule.start_time.slice(0, 5)}
                      disabled={!rule.is_active}
                      onChange={(e) => updateAvailabilityRule(day.value, { start_time: e.target.value })}
                      className="input-compact disabled:opacity-40"
                    />
                    <input
                      type="time"
                      value={rule.end_time.slice(0, 5)}
                      disabled={!rule.is_active}
                      onChange={(e) => updateAvailabilityRule(day.value, { end_time: e.target.value })}
                      className="input-compact disabled:opacity-40"
                    />
                    <select
                      value={rule.session_duration_minutes}
                      disabled={!rule.is_active}
                      onChange={(e) => updateAvailabilityRule(day.value, { session_duration_minutes: Number(e.target.value) })}
                      className="input-compact disabled:opacity-40"
                      title="Duração da sessão"
                    >
                      {[30, 45, 60, 90].map(value => <option key={value} value={value} className="bg-slate-900">{value} min</option>)}
                    </select>
                    <select
                      value={rule.buffer_minutes}
                      disabled={!rule.is_active}
                      onChange={(e) => updateAvailabilityRule(day.value, { buffer_minutes: Number(e.target.value) })}
                      className="input-compact disabled:opacity-40"
                      title="Intervalo entre atendimentos"
                    >
                      {[0, 10, 15, 20, 30].map(value => <option key={value} value={value} className="bg-slate-900">+{value} min</option>)}
                    </select>
                    <select
                      value={rule.min_notice_hours}
                      disabled={!rule.is_active}
                      onChange={(e) => updateAvailabilityRule(day.value, { min_notice_hours: Number(e.target.value) })}
                      className="input-compact disabled:opacity-40"
                      title="Antecedência mínima"
                    >
                      {[2, 6, 12, 24, 48].map(value => <option key={value} value={value} className="bg-slate-900">{value}h antes</option>)}
                    </select>
                    <select
                      value={rule.cancellation_notice_hours}
                      disabled={!rule.is_active}
                      onChange={(e) => updateAvailabilityRule(day.value, { cancellation_notice_hours: Number(e.target.value) })}
                      className="input-compact disabled:opacity-40"
                      title="Cancelamento permitido até"
                    >
                      {[6, 12, 24, 48].map(value => <option key={value} value={value} className="bg-slate-900">Cancel. {value}h</option>)}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-xl p-4 rounded-[2rem] border border-white/10 shadow-2xl space-y-4">
          <div>
            <h2 className="text-sm font-black text-white tracking-tight">Bloqueios de agenda</h2>
            <p className="text-slate-500 text-[10px] font-bold">Use para férias, feriados ou compromissos pontuais.</p>
          </div>

          <form onSubmit={handleCreateBlock} className="space-y-2">
            <input
              type="date"
              required
              value={blockForm.block_date}
              onChange={(e) => setBlockForm({ ...blockForm, block_date: e.target.value })}
              className="input-compact"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="time"
                value={blockForm.start_time}
                onChange={(e) => setBlockForm({ ...blockForm, start_time: e.target.value })}
                className="input-compact"
                placeholder="Início"
              />
              <input
                type="time"
                value={blockForm.end_time}
                onChange={(e) => setBlockForm({ ...blockForm, end_time: e.target.value })}
                className="input-compact"
                placeholder="Fim"
              />
            </div>
            <input
              value={blockForm.reason}
              onChange={(e) => setBlockForm({ ...blockForm, reason: e.target.value })}
              className="input-compact"
              placeholder="Motivo: férias, feriado, compromisso..."
            />
            <button className="w-full py-2 bg-white/10 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-white/15 transition-all">
              Criar bloqueio
            </button>
          </form>

          <div className="space-y-2 max-h-52 overflow-y-auto pr-1 custom-scrollbar">
            {scheduleBlocks.length === 0 ? (
              <div className="p-4 bg-white/5 rounded-2xl text-center text-slate-500 text-xs font-bold">Nenhum bloqueio cadastrado.</div>
            ) : scheduleBlocks.map(block => (
              <div key={block.id} className="p-3 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between gap-3">
                <div>
                  <p className="text-white text-xs font-black">{formatDateKeyBR(block.block_date)}</p>
                  <p className="text-slate-500 text-[10px] font-bold">
                    {block.start_time && block.end_time ? `${block.start_time.slice(0, 5)} às ${block.end_time.slice(0, 5)}` : 'Dia inteiro'} • {block.reason || 'Indisponível'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteBlock(block.id)}
                  className="p-2 text-red-400 bg-red-500/10 rounded-xl hover:bg-red-500/20 transition-all"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

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
                  <div className="flex flex-col items-center justify-center w-12 h-12 bg-white/5 rounded-xl text-white group-hover:bg-sky-500/10 transition-colors border border-white/5">
                    {view === 'all' ? (
                      <>
                        <span className="text-[7px] font-black text-sky-400 uppercase">{getShortMonth(app.data)}</span>
                        <span className="text-sm font-black leading-none">{getDayNumber(app.data)}</span>
                        <span className="text-[7px] font-bold text-slate-500 mt-0.5">{app.hora?.slice(0, 5)}</span>
                      </>
                    ) : (
                      <>
                        <Clock size={12} className="text-sky-400 mb-0.5" />
                        <span className="text-sm font-black">{app.hora?.slice(0, 5) || '--:--'}</span>
                      </>
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white group-hover:text-sky-400 transition-colors">
                      {app.nome_paciente || app.paciente?.nome_completo || 'Paciente'}
                    </h3>
                    <div className="flex flex-wrap gap-2 mt-0.5">
                      <div className="flex items-center gap-1 text-[9px] text-slate-400 font-medium">
                        <Stethoscope size={10} className="text-sky-400" />
                        {app.tipo || app.servico}
                      </div>
                      {app.local && (
                        <div className="flex items-center gap-1 text-[9px] text-slate-400 font-medium">
                          <MapPin size={10} className="text-sky-400" />
                          {app.local}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-3">
                  <span className={cn(
                    "px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest",
                    app.status === 'confirmado' || app.status === 'realizado' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                    app.status === 'agendado' || app.status === 'pendente' || app.status === 'pago' ? "bg-sky-500/10 text-sky-400 border border-sky-500/20" :
                    "bg-red-500/10 text-red-400 border border-red-500/20"
                  )}>
                    {app.status}
                  </span>
                  
                  <div className="flex gap-1.5">
                    {(app.status === 'agendado' || app.status === 'pendente' || app.status === 'pago') && (
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
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
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
                    src={resolveStorageUrl(selectedAppointment.paciente?.avatar_url) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedAppointment.paciente_id || selectedAppointment.nome_paciente}`}
                    alt="Avatar"
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-white/10 shadow-sm"
                  />
                  <div>
                    <h3 className="text-lg font-black text-white">{selectedAppointment.nome_paciente || selectedAppointment.paciente?.nome_completo}</h3>
                    <p className="text-slate-400 text-xs font-bold">{selectedAppointment.telefone_paciente || selectedAppointment.paciente?.telefone || selectedAppointment.paciente?.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 bg-white/5 rounded-2xl border border-white/10">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Data e Hora</p>
                    <div className="flex items-center gap-2 text-white font-black text-xs">
                      <CalendarIcon size={14} className="text-sky-400" />
                      {selectedAppointment.data ? formatOnlyDateBR(selectedAppointment.data) : formatOnlyDateBR(selectedAppointment.data_servico)}
                    </div>
                    <div className="flex items-center gap-2 text-white font-black text-xs mt-1.5">
                      <Clock size={14} className="text-sky-400" />
                      {selectedAppointment.hora || formatHourBR(selectedAppointment.data_servico)}
                    </div>
                  </div>
                  <div className="p-3.5 bg-white/5 rounded-2xl border border-white/10">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Tipo de Consulta</p>
                    <div className="flex items-center gap-2 text-white font-black text-xs">
                      <Stethoscope size={14} className="text-sky-400" />
                      {selectedAppointment.tipo || selectedAppointment.servico}
                    </div>
                    {selectedAppointment.local && (
                      <div className="flex items-center gap-2 text-white font-black text-xs mt-1.5">
                        <MapPin size={14} className="text-sky-400" />
                        {selectedAppointment.local}
                      </div>
                    )}
                  </div>
                </div>

                {selectedAppointment.observacoes && (
                  <div className="p-3.5 bg-sky-500/10 rounded-2xl border border-sky-500/20">
                    <p className="text-[8px] font-black text-sky-400 uppercase tracking-widest mb-1.5">Observações</p>
                    <p className="text-slate-300 text-xs font-medium leading-relaxed">{selectedAppointment.observacoes}</p>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    {(selectedAppointment.status === 'agendado' || selectedAppointment.status === 'pendente' || selectedAppointment.status === 'pago') && (
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
                        className="flex-1 h-11 bg-white/5 text-red-400 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-500/20 transition-all flex items-center justify-center gap-2 border border-white/10"
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
                    className="w-full h-11 bg-white/5 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2 border border-white/10"
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
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
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

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Tipo de Atendimento / Pacote</label>
                  <select
                    required
                    value={formData.tipo}
                    onChange={(e) => {
                      const value = e.target.value;
                      const [prefix, name] = value.split(':');
                      let valor = 0;
                      if (prefix === 'service') {
                        const svc = physioServices.find(s => s.name === name);
                        valor = svc ? Number(svc.base_price) : 0;
                      } else if (prefix === 'package') {
                        const pkg = physioPackages.find(p => p.name === name);
                        valor = pkg ? Number(pkg.total_price) : 0;
                      }
                      
                      setFormData({
                        ...formData, 
                        tipo: value,
                        valor: valor
                      });
                    }}
                    className="input-compact"
                  >
                    <option value="" className="bg-slate-900">Selecione o tipo...</option>
                    <optgroup label="Sessões Avulsas" className="bg-slate-900">
                      {physioServices.map(svc => (
                        <option key={svc.id} value={`service:${svc.name}`} className="bg-slate-900">
                          {svc.name} (R$ {Number(svc.base_price).toFixed(2)})
                        </option>
                      ))}
                    </optgroup>
                    {physioPackages.length > 0 && (
                      <optgroup label="Pacotes de Tratamento" className="bg-slate-900">
                        {physioPackages.map(pkg => (
                          <option key={pkg.id} value={`package:${pkg.name}`} className="bg-slate-900">
                            {pkg.name} ({pkg.sessions_quantity} sessões - R$ {Number(pkg.total_price).toFixed(2)})
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                    Valor do Atendimento
                    <button 
                      type="button"
                      onClick={() => window.dispatchEvent(new CustomEvent('toggle-help-center', { 
                        detail: { search: 'pagamento', profile: 'fisioterapeuta' } 
                      }))}
                      className="text-blue-400 hover:text-blue-300"
                    >
                      <HelpCircle size={10} />
                    </button>
                  </label>
                  <div className="relative">
                    <span className="absolute pointer-events-none z-20" style={{ left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontWeight: 'bold', fontSize: '10px' }}>R$</span>
                    <input
                      type="number"
                      value={formData.valor}
                      onChange={(e) => setFormData({...formData, valor: parseFloat(e.target.value) || 0})}
                      className="input-compact !pl-[60px]"
                      placeholder="0,00"
                    />
                  </div>
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
