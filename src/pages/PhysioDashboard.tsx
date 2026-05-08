import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
  Users, 
  Calendar, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  XCircle, 
  MessageSquare,
  Loader2,
  Filter,
  ChevronRight,
  ClipboardList,
  DollarSign,
  Package,
  Activity
} from 'lucide-react';
import { FinancialDashboard } from '../components/FisioCare/FinancialDashboard';
import ActivityTimeline from '../components/FisioCare/ActivityTimeline';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import FloatingHelpMenu from '../components/FloatingHelpMenu';
import ApprovalWelcomeModal from '../components/ApprovalWelcomeModal';
import ProGuard from '../components/ProGuard';

export default function PhysioDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'requests' | 'agenda' | 'financeiro' | 'historico'>((searchParams.get('tab') as any) || 'requests');
  const [requests, setRequests] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [filter, setFilter] = useState({
    location: '',
    specialty: ''
  });

  useEffect(() => {
    if (profile && profile.status_aprovacao === 'aprovado' && !profile.plan_intro_seen && profile.tipo_usuario === 'fisioterapeuta') {
      setShowWelcome(true);
    }
  }, [profile]);

  useEffect(() => {
    const tab = searchParams.get('tab') as any;
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [searchParams, activeTab]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Open Requests (solicitacoes_atendimento)
      // Assuming the table exists as per user request
      const { data: reqData, error: reqError } = await supabase
        .from('solicitacoes_atendimento')
        .select(`
          *,
          paciente:perfis!paciente_id(nome_completo, avatar_url)
        `)
        .eq('status', 'pendente')
        .order('created_at', { ascending: false });

      if (!reqError) setRequests(reqData || []);

      // 2. Fetch Appointments
      let appQuery = supabase
        .from('agendamentos')
        .select(`
          *,
          paciente:perfis!paciente_id(nome_completo, avatar_url)
        `)
        .eq('fisio_id', user?.id);

      // Profissionais não devem ver agendamentos aguardando pagamento
      appQuery = appQuery.neq('status', 'pendente_pagamento');

      const { data: appData, error: appError } = await appQuery.order('data', { ascending: true });

      if (!appError) setAppointments(appData || []);

      // 3. Fetch Activities
      const { data: actData } = await supabase
        .from('historico_atividades')
        .select('*')
        .eq('usuario_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(20);
      
      setActivities(actData || []);

    } catch (err) {
      console.error('Erro ao buscar dados do dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('solicitacoes_atendimento')
        .update({ 
          status: 'aceito',
          fisio_id: user?.id 
        })
        .eq('id', requestId);

      if (error) throw error;
      
      toast.success('Solicitação aceita! O paciente será notificado.');
      fetchData();
    } catch (err) {
      console.error('Erro ao aceitar solicitação:', err);
      toast.error('Erro ao aceitar solicitação');
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('solicitacoes_atendimento')
        .update({ status: 'recusado' })
        .eq('id', requestId);

      if (error) throw error;
      
      toast.success('Solicitação recusada');
      fetchData();
    } catch (err) {
      console.error('Erro ao recusar solicitação:', err);
      toast.error('Erro ao recusar solicitação');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900/50 backdrop-blur-xl p-8 rounded-[3rem] border border-white/10 shadow-2xl">
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-white tracking-tight">Dashboard do Profissional</h1>
            <p className="text-slate-400 font-medium">Gerencie suas solicitações e agenda em um só lugar.</p>
          </div>
          
          <div className="flex p-1.5 bg-white/5 rounded-2xl border border-white/10">
            <button 
              onClick={() => navigate('/dashboard/fisio?tab=requests')}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all",
                activeTab === 'requests' ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20" : "text-slate-400 hover:text-slate-200"
              )}
            >
              <Users size={16} />
              Solicitações
              {requests.length > 0 && (
                <span className="ml-1 w-5 h-5 bg-white text-blue-600 rounded-full flex items-center justify-center text-[10px] font-black">
                  {requests.length}
                </span>
              )}
            </button>
            <button 
              onClick={() => navigate('/dashboard/fisio?tab=agenda')}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all",
                activeTab === 'agenda' ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20" : "text-slate-400 hover:text-slate-200"
              )}
            >
              <Calendar size={16} />
              Minha Agenda
            </button>
            <button 
              onClick={() => navigate('/dashboard/fisio?tab=financeiro')}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all",
                activeTab === 'financeiro' ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20" : "text-slate-400 hover:text-slate-200"
              )}
            >
              <DollarSign size={16} />
              Financeiro
            </button>
            <button 
              onClick={() => navigate('/dashboard/fisio?tab=historico')}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all",
                activeTab === 'historico' ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20" : "text-slate-400 hover:text-slate-200"
              )}
            >
              <Activity size={16} />
              Histórico
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
              <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Carregando dados...</p>
            </div>
          ) : activeTab === 'requests' ? (
            <div className="space-y-6">
              {/* Filters for Requests */}
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px] relative">
                  <MapPin 
                    className="absolute pointer-events-none z-20" 
                    style={{ left: '16px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', color: '#94a3b8' }}
                  />
                  <input 
                    type="text" 
                    placeholder="Filtrar por localização..."
                    value={filter.location}
                    onChange={(e) => setFilter({...filter, location: e.target.value})}
                    className="w-full p-4 pr-4 bg-white/5 border border-white/10 rounded-2xl font-bold text-white outline-none focus:ring-2 focus:ring-blue-600 !pl-[60px]"
                  />
                </div>
                <div className="flex-1 min-w-[200px] relative">
                  <ClipboardList 
                    className="absolute pointer-events-none z-20" 
                    style={{ left: '16px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', color: '#94a3b8' }}
                  />
                  <input 
                    type="text" 
                    placeholder="Filtrar por especialidade..."
                    value={filter.specialty}
                    onChange={(e) => setFilter({...filter, specialty: e.target.value})}
                    className="w-full p-4 pr-4 bg-white/5 border border-white/10 rounded-2xl font-bold text-white outline-none focus:ring-2 focus:ring-blue-600 !pl-[60px]"
                  />
                </div>
              </div>

              {/* Requests List */}
              <div className="grid gap-6">
                {requests.length > 0 ? (
                  requests.map((req) => (
                    <motion.div 
                      key={req.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-slate-900/50 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/10 shadow-xl hover:shadow-2xl transition-all"
                    >
                      <div className="flex flex-col md:flex-row gap-8 items-start">
                        <img 
                          src={req.paciente?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${req.paciente_id}`}
                          alt="Paciente"
                          className="w-20 h-20 rounded-2xl object-cover bg-white/5 border border-white/10"
                        />
                        
                        <div className="flex-1 space-y-4">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                              <h3 className="text-xl font-black text-white tracking-tight">
                                {req.paciente?.nome_completo || 'Paciente'}
                              </h3>
                              <div className="flex items-center gap-4 mt-1">
                                <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                                  <MapPin size={14} className="text-blue-400" />
                                  {req.localizacao}
                                </span>
                                <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                                  <Clock size={14} className="text-blue-400" />
                                  {new Date(req.created_at).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            <div className="px-4 py-2 bg-blue-600/20 text-blue-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-blue-500/30">
                              {req.especialidade || 'Geral'}
                            </div>
                          </div>

                          <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                            <p className="text-slate-300 font-medium leading-relaxed italic">
                              "{req.descricao}"
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-4 pt-4">
                            <button 
                              onClick={() => handleAcceptRequest(req.id)}
                              className="flex-1 min-w-[140px] py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                            >
                              <CheckCircle2 size={18} />
                              Aceitar Atendimento
                            </button>
                            <button 
                              onClick={() => handleRejectRequest(req.id)}
                              className="flex-1 min-w-[140px] py-4 bg-white/5 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all border border-white/10 flex items-center justify-center gap-2"
                            >
                              <XCircle size={18} />
                              Recusar
                            </button>
                            <button className="p-4 bg-white/5 text-slate-400 rounded-2xl hover:bg-white/10 transition-all border border-white/10">
                              <MessageSquare size={18} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-20 bg-slate-900/50 backdrop-blur-xl rounded-[3rem] border border-dashed border-white/10 space-y-4">
                    <div className="w-20 h-20 bg-white/5 rounded-[2rem] flex items-center justify-center mx-auto text-slate-500">
                      <Users size={32} />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-black text-white">Nenhuma solicitação pendente</h3>
                      <p className="text-slate-400 font-medium">Novas solicitações de pacientes aparecerão aqui.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === 'financeiro' ? (
            <ProGuard requiredPlan="pro">
              <FinancialDashboard />
            </ProGuard>
          ) : activeTab === 'historico' ? (
            <div className="bg-slate-900/50 backdrop-blur-xl p-8 rounded-[3rem] border border-white/10 shadow-2xl">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-blue-600/20 text-blue-400 rounded-2xl flex items-center justify-center">
                  <Activity size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tight">Histórico de Atividades</h2>
                  <p className="text-slate-400 text-xs font-medium">Acompanhe suas interações recentes no sistema.</p>
                </div>
              </div>
              <ActivityTimeline activities={activities} />
            </div>
          ) : (
            <ProGuard requiredPlan="pro">
              <div className="grid gap-6">
                {appointments.length > 0 ? (
                  appointments.map((app) => (
                    <div 
                      key={app.id}
                      className="bg-slate-900/50 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white/10 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6"
                    >
                      <div className="flex items-center gap-6">
                        <img 
                          src={app.paciente?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${app.paciente_id}`}
                          alt="Paciente"
                          className="w-16 h-16 rounded-2xl object-cover bg-white/5 border border-white/10"
                        />
                        <div>
                          <h4 className="text-lg font-black text-white tracking-tight">
                            {app.paciente?.nome_completo || 'Paciente'}
                          </h4>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                              <Calendar size={14} className="text-blue-400" />
                              {new Date(app.data).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                              <Clock size={14} className="text-blue-400" />
                              {app.hora}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border",
                          app.status === 'confirmado' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : 
                          app.status === 'pago' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                          app.status === 'recusado' ? "bg-rose-500/10 text-rose-400 border-rose-500/20" :
                          "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        )}>
                          {app.status === 'pendente_pagamento' ? 'Aguardando Pagamento' : 
                           app.status === 'pago' ? 'Pago (Aguardando Confirmação)' : 
                           app.status}
                        </div>
                        <button className="p-3 bg-white/5 text-slate-400 rounded-xl hover:bg-white/10 transition-all border border-white/10">
                          <ChevronRight size={20} />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-20 bg-slate-900/50 backdrop-blur-xl rounded-[3rem] border border-dashed border-white/10 space-y-4">
                    <div className="w-20 h-20 bg-white/5 rounded-[2rem] flex items-center justify-center mx-auto text-slate-500">
                      <Calendar size={32} />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-black text-white">Agenda vazia</h3>
                      <p className="text-slate-400 font-medium">Você ainda não tem consultas agendadas.</p>
                    </div>
                  </div>
                )}
              </div>
            </ProGuard>
          )}
        </div>
      </div>
      <FloatingHelpMenu />
      {showWelcome && <ApprovalWelcomeModal onClose={() => setShowWelcome(false)} />}
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
