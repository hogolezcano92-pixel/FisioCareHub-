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
  ClipboardList
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

export default function PhysioDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'requests' | 'agenda'>('requests');
  const [requests, setRequests] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    location: '',
    specialty: ''
  });

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
      const { data: appData, error: appError } = await supabase
        .from('agendamentos')
        .select(`
          *,
          paciente:perfis!paciente_id(nome_completo, avatar_url)
        `)
        .eq('fisio_id', user?.id)
        .order('data', { ascending: true });

      if (!appError) setAppointments(appData || []);

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
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[3rem] shadow-xl shadow-blue-900/5 border border-slate-100">
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Dashboard do Profissional</h1>
            <p className="text-slate-500 font-medium">Gerencie suas solicitações e agenda em um só lugar.</p>
          </div>
          
          <div className="flex p-1.5 bg-slate-50 rounded-2xl border border-slate-100">
            <button 
              onClick={() => setActiveTab('requests')}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all",
                activeTab === 'requests' ? "bg-white text-blue-600 shadow-lg shadow-blue-900/5" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <Users size={16} />
              Solicitações
              {requests.length > 0 && (
                <span className="ml-1 w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px]">
                  {requests.length}
                </span>
              )}
            </button>
            <button 
              onClick={() => setActiveTab('agenda')}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all",
                activeTab === 'agenda' ? "bg-white text-blue-600 shadow-lg shadow-blue-900/5" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <Calendar size={16} />
              Minha Agenda
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
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Filtrar por localização..."
                    value={filter.location}
                    onChange={(e) => setFilter({...filter, location: e.target.value})}
                    className="w-full p-4 pl-12 bg-white border border-slate-100 rounded-2xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div className="flex-1 min-w-[200px] relative">
                  <ClipboardList className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Filtrar por especialidade..."
                    value={filter.specialty}
                    onChange={(e) => setFilter({...filter, specialty: e.target.value})}
                    className="w-full p-4 pl-12 bg-white border border-slate-100 rounded-2xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-600"
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
                      className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-lg hover:shadow-xl transition-all"
                    >
                      <div className="flex flex-col md:flex-row gap-8 items-start">
                        <img 
                          src={req.paciente?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${req.paciente_id}`}
                          alt="Paciente"
                          className="w-20 h-20 rounded-2xl object-cover bg-slate-50"
                        />
                        
                        <div className="flex-1 space-y-4">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                                {req.paciente?.nome_completo || 'Paciente'}
                              </h3>
                              <div className="flex items-center gap-4 mt-1">
                                <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                                  <MapPin size={14} className="text-blue-600" />
                                  {req.localizacao}
                                </span>
                                <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                                  <Clock size={14} className="text-blue-600" />
                                  {new Date(req.created_at).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            <div className="px-4 py-2 bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-full border border-blue-100">
                              {req.especialidade || 'Geral'}
                            </div>
                          </div>

                          <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                            <p className="text-slate-600 font-medium leading-relaxed italic">
                              "{req.descricao}"
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-4 pt-4">
                            <button 
                              onClick={() => handleAcceptRequest(req.id)}
                              className="flex-1 min-w-[140px] py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2"
                            >
                              <CheckCircle2 size={18} />
                              Aceitar Atendimento
                            </button>
                            <button 
                              onClick={() => handleRejectRequest(req.id)}
                              className="flex-1 min-w-[140px] py-4 bg-slate-50 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all border border-slate-100 flex items-center justify-center gap-2"
                            >
                              <XCircle size={18} />
                              Recusar
                            </button>
                            <button className="p-4 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-100 transition-all border border-slate-100">
                              <MessageSquare size={18} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-20 bg-white rounded-[3rem] border border-dashed border-slate-200 space-y-4">
                    <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto text-slate-300">
                      <Users size={32} />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-black text-slate-900">Nenhuma solicitação pendente</h3>
                      <p className="text-slate-500 font-medium">Novas solicitações de pacientes aparecerão aqui.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="grid gap-6">
              {appointments.length > 0 ? (
                appointments.map((app) => (
                  <div 
                    key={app.id}
                    className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6"
                  >
                    <div className="flex items-center gap-6">
                      <img 
                        src={app.paciente?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${app.paciente_id}`}
                        alt="Paciente"
                        className="w-16 h-16 rounded-2xl object-cover bg-slate-50"
                      />
                      <div>
                        <h4 className="text-lg font-black text-slate-900 tracking-tight">
                          {app.paciente?.nome_completo || 'Paciente'}
                        </h4>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                            <Calendar size={14} className="text-blue-600" />
                            {new Date(app.data).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                            <Clock size={14} className="text-blue-600" />
                            {app.hora}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border",
                        app.status === 'confirmado' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100"
                      )}>
                        {app.status}
                      </div>
                      <button className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-100 transition-all border border-slate-100">
                        <ChevronRight size={20} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-20 bg-white rounded-[3rem] border border-dashed border-slate-200 space-y-4">
                  <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto text-slate-300">
                    <Calendar size={32} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-black text-slate-900">Agenda vazia</h3>
                    <p className="text-slate-500 font-medium">Você ainda não tem consultas agendadas.</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
