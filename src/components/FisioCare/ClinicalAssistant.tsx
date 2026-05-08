import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BrainCircuit, 
  ChevronRight, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Calendar,
  Sparkles,
  ArrowUpRight,
  Loader2,
  Users,
  FileText,
  TrendingUp,
  MessageSquare
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { kineAIService } from '../../services/kineAI';
import { useAuth } from '../../contexts/AuthContext';

interface ClinicalAssistantProps {
  isPhysio: boolean;
}

export default function ClinicalAssistant({ isPhysio }: ClinicalAssistantProps) {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [insights, setInsights] = useState<{
    statusDay: string;
    alerts: string[];
    suggestions: string[];
    nextPatientSummary?: string;
    daySummary?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchClinicalDataAndGenerateInsights = async () => {
    if (!user || !isPhysio) return;

    setLoading(true);
    setError(null);

    try {
      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toISOString();

      // 1. Fetch Today's Appointments
      const { data: todayAppts } = await supabase
        .from('agendamentos')
        .select(`
          *,
          paciente:perfis!paciente_id(id, nome_completo, avatar_url)
        `)
        .eq('fisio_id', user.id)
        .eq('data', today)
        .order('hora', { ascending: true });

      // 2. Fetch Next Appointment
      const { data: nextAppt } = await supabase
        .from('agendamentos')
        .select(`
          *,
          paciente:perfis!paciente_id(id, nome_completo, avatar_url, bio, observacoes_saude)
        `)
        .eq('fisio_id', user.id)
        .gte('data_servico', now)
        .order('data_servico', { ascending: true })
        .limit(1)
        .maybeSingle();

      // 3. Fetch Recent Failures (Faltas/Cancelamentos)
      const { data: recentFailures } = await supabase
        .from('agendamentos')
        .select('paciente_id, status, data')
        .eq('fisio_id', user.id)
        .in('status', ['cancelado', 'pendente'])
        .lt('data_servico', now)
        .order('data_servico', { ascending: false })
        .limit(20);

      // 4. Fetch Missing Evolutions
      // Get completed appts from the last 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: completedAppts } = await supabase
        .from('agendamentos')
        .select('id, data, paciente_id')
        .eq('fisio_id', user.id)
        .eq('status', 'concluido')
        .gte('data_servico', sevenDaysAgo);

      // 5. Fetch Patients
      const { data: totalPatients } = await supabase
        .from('pacientes')
        .select('*')
        .eq('fisioterapeuta_id', user.id);

      // Format data for AI
      const clinicalContext = {
        professionalName: profile?.nome_completo,
        todayStats: {
          total: todayAppts?.length || 0,
          remaining: todayAppts?.filter(a => a.status !== 'concluido').length || 0,
          next: nextAppt ? {
            time: nextAppt.hora,
            patient: nextAppt.paciente?.nome_completo,
            details: nextAppt.paciente?.observacoes_saude
          } : null
        },
        recentActivity: {
          failures: recentFailures || [],
          completedWithoutEvolution: completedAppts || [], // Simplification for context
          totalPatients: totalPatients?.length || 0
        },
        timestamp: now
      };

      // Call AI Service
      const aiInsights = await kineAIService.generateClinicalInsights(clinicalContext);
      setInsights(aiInsights);

    } catch (err) {
      console.error("Erro ao gerar insights clínicos:", err);
      setError("Não foi possível carregar os insights clínicos no momento.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isPhysio) {
      fetchClinicalDataAndGenerateInsights();
    }
  }, [isPhysio]);

  if (!isPhysio) return null;

  return (
    <motion.div 
      layout
      className={cn(
        "bg-gradient-to-br from-blue-600 via-indigo-700 to-blue-800 rounded-[2.5rem] text-white shadow-2xl shadow-blue-900/40 relative overflow-hidden border border-white/10 group transition-all duration-500",
        isExpanded ? "p-8" : "p-6 cursor-pointer"
      )}
      onClick={() => !isExpanded && setIsExpanded(true)}
    >
      {/* Background Effects */}
      <div className="absolute inset-0 bg-blue-400/10 animate-pulse pointer-events-none" />
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl group-hover:scale-110 transition-transform duration-700" />
      
      <div className="relative z-10 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-inner group-hover:rotate-12 transition-transform">
              <BrainCircuit size={24} className="animate-pulse" />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight flex items-center gap-2">
                Assistente <span className="text-blue-200">Clínico</span>
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              </h3>
              <p className="text-blue-100/70 text-[10px] font-black uppercase tracking-widest">Inteligência de Dados Real</p>
            </div>
          </div>
          {isExpanded && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(false);
              }}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all"
            >
              <ChevronRight size={20} className="rotate-90" />
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center gap-3 py-4">
            <Loader2 size={18} className="animate-spin text-blue-200" />
            <p className="text-sm font-medium text-blue-100">Analisando sua agenda e dados clínicos...</p>
          </div>
        ) : error ? (
          <div className="flex items-center gap-3 py-4 text-amber-200 bg-amber-500/10 p-4 rounded-2xl border border-amber-500/20">
            <AlertTriangle size={18} />
            <p className="text-xs font-bold">{error}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 1. Status do Dia (Always Visible) */}
            <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 space-y-3">
              <div className="flex items-center gap-2 text-blue-200">
                <CheckCircle2 size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">Status do Dia</span>
              </div>
              <p className="text-sm font-medium leading-relaxed">
                {insights?.statusDay}
              </p>
            </div>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-6 overflow-hidden"
                >
                  {/* 2. Alertas Inteligentes */}
                  {insights?.alerts && insights.alerts.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-amber-300">
                        <AlertTriangle size={16} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Alertas Inteligentes</span>
                      </div>
                      <div className="grid gap-2">
                        {insights.alerts.map((alert, idx) => (
                          <div key={idx} className="flex gap-3 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs font-medium text-rose-100">
                            <span className="shrink-0">⚠️</span>
                            {alert}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 4. Pré-resumo do próximo paciente */}
                  {insights?.nextPatientSummary && (
                    <div className="p-5 bg-black/20 backdrop-blur-xl rounded-[2rem] border border-white/10 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sky-300">
                          <Users size={16} />
                          <span className="text-[10px] font-black uppercase tracking-widest">Próxima Consulta</span>
                        </div>
                        <Sparkles size={16} className="text-sky-400 animate-pulse" />
                      </div>
                      <p className="text-xs text-white/90 leading-relaxed italic whitespace-pre-wrap">
                        {insights.nextPatientSummary}
                      </p>
                    </div>
                  )}

                  {/* 3. Sugestões de Ação */}
                  {insights?.suggestions && insights.suggestions.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-emerald-300">
                        <TrendingUp size={16} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Sugestões de Ação</span>
                      </div>
                      <div className="flex flex-col gap-2">
                        {insights.suggestions.map((suggestion, idx) => (
                          <button 
                            key={idx}
                            className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[11px] font-bold text-white transition-all text-left"
                          >
                            <span className="flex-1">{suggestion}</span>
                            <ArrowUpRight size={14} className="text-emerald-400" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Chat / Interaction */}
                  <div className="flex gap-2 pt-4 border-t border-white/10">
                    <div className="flex-1 relative">
                      <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={14} />
                      <input 
                        type="text" 
                        placeholder="Pedir evolução resumida..." 
                        className="w-full bg-black/20 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-xs placeholder-white/30 outline-none focus:ring-2 focus:ring-blue-400 transition-all font-medium"
                      />
                    </div>
                    <button className="p-3 bg-white text-blue-900 rounded-xl font-bold shadow-lg shadow-black/20 hover:scale-105 active:scale-95 transition-all">
                      <ArrowUpRight size={20} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {!isExpanded && (
              <div className="flex items-center justify-between pt-2">
                <div className="flex -space-x-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="w-6 h-6 rounded-full border-2 border-blue-600 bg-white/10 backdrop-blur-md" />
                  ))}
                  <div className="w-6 h-6 rounded-full border-2 border-blue-600 bg-blue-500 flex items-center justify-center text-[8px] font-black">
                    +
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-black text-blue-200 uppercase tracking-widest">
                  Ver Detalhes
                  <ChevronRight size={12} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
