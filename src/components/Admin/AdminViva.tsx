import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import KineAI from '../KineAI';
import { 
  Sparkles, 
  Brain, 
  TrendingUp, 
  AlertCircle, 
  Zap, 
  CheckCircle2, 
  MessageSquare,
  ArrowRight,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateAdminInsights } from '../../lib/groq';
import { cn } from '../../lib/utils';

interface Insight {
  id: string;
  type: 'growth' | 'risk' | 'improvement';
  title: string;
  description: string;
  action: string;
}

export default function AdminViva() {
  const { t } = useTranslation();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [openViva, setOpenViva] = useState(false);

  const generateInsights = async () => {
    setAnalyzing(true);
    try {
      const today = new Date();
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

      const [
        { count: physiosCount },
        { count: patientsCount },
        { data: revenueData },
        { data: recentLogs }
      ] = await Promise.all([
        supabase.from('perfis').select('*', { count: 'exact', head: true }).eq('tipo_usuario', 'fisioterapeuta'),
        supabase.from('perfis').select('*', { count: 'exact', head: true }).eq('tipo_usuario', 'paciente').gte('created_at', firstDayOfMonth),
        supabase.from('agendamentos').select('valor_cobrado').gte('data_horario', firstDayOfMonth).eq('status', 'concluido'),
        supabase.from('historico_atividades').select('tipo_acao, descricao').order('created_at', { ascending: false }).limit(10)
      ]);

      const totalRevenue = (revenueData || []).reduce((acc, curr) => acc + (Number(curr.valor_cobrado) || 0), 0);

      const performanceData = {
        fisioterapeutas_ativos: physiosCount || 0,
        pacientes_novos_mes: patientsCount || 0,
        faturamento_mes: `R$ ${(totalRevenue || 0).toLocaleString('pt-BR')}`,
        logs_recentes: (recentLogs || []).map(l => `${l.tipo_acao ?? ''}: ${l.descricao ?? ''}`)
      };

      const data = await generateAdminInsights(performanceData);
      setInsights(data || []);
    } catch (error) {
      console.error("Error generating insights:", error);
      toast.error(t('admin.viva.toast.error_insights'));
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* VIVA Hero Banner */}
      <div className="bg-[var(--gradient)] rounded-[2.5rem] p-10 text-[var(--white)] relative overflow-hidden shadow-xl shadow-[var(--primary)]/10">
        <div className="absolute top-0 right-0 p-32 -mr-32 -mt-32 bg-white/5 blur-3xl rounded-full" />
        <div className="absolute bottom-0 left-0 p-32 -ml-32 -mb-32 bg-[var(--primary-2)]/10 blur-3xl rounded-full" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
          <div className="relative">
            <div className="absolute inset-0 bg-white/20 blur-2xl rounded-full" />
            <div className="w-28 h-28 bg-white/10 backdrop-blur-md rounded-3xl flex items-center justify-center border border-white/20 shadow-2xl relative animate-bounce-slow">
              <Brain size={56} className="text-white" />
            </div>
          </div>
          
          <div className="flex-1 text-center md:text-left space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-[9px] font-black uppercase tracking-[0.2em]">
              <Sparkles size={12} className="text-blue-100" />
              {t('admin.viva.hero_subtitle')}
            </div>
            <h2 className="text-4xl font-black tracking-tight">{t('admin.viva.hero_title')}</h2>
            <p className="text-base font-medium text-white/80 max-w-2xl leading-relaxed">
              {t('admin.viva.hero_desc')}
            </p>
            <div className="flex flex-wrap justify-center md:justify-start gap-3 pt-4">
              <button 
                onClick={generateInsights}
                disabled={analyzing}
                className="px-6 py-3 bg-[var(--white)] text-[var(--primary)] rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-white/90 transition-all shadow-lg active:scale-95 flex items-center gap-2"
              >
                {analyzing ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} />}
                {t('admin.viva.generate_insights')}
              </button>
              <button 
                onClick={() => setOpenViva(true)}
                className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold text-xs uppercase tracking-widest border border-white/20 transition-all flex items-center gap-2"
              >
                <MessageSquare size={18} />
                {t('admin.viva.speak_with_viva')}
              </button>
            </div>
          </div>
        </div>
      </div>

      <KineAI 
        externalForceOpen={openViva} 
        onClose={() => setOpenViva(false)} 
      />

      {/* Insights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {insights.length > 0 ? (
            insights.map((insight, idx) => (
              <motion.div
                key={insight.id}
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: idx * 0.1 }}
                className="admin-card p-7 flex flex-col group bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius)]"
              >
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center mb-5 shadow-sm border",
                  insight.type === 'risk' ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' :
                  insight.type === 'growth' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                  'bg-[var(--primary)]/10 border-[var(--primary)]/20 text-[var(--primary)]'
                )}>
                  {insight.type === 'risk' ? <AlertCircle size={22} /> : 
                   insight.type === 'growth' ? <TrendingUp size={22} /> : <Zap size={22} />}
                </div>

                <div className="flex-1 space-y-3">
                  <h4 className="text-lg text-[var(--text)] font-black tracking-tight leading-tight">{insight.title}</h4>
                  <p className="text-[var(--text-2)] text-xs font-medium leading-relaxed">{insight.description}</p>
                </div>

                <div className="mt-6 pt-6 border-t border-[var(--border)]">
                  <button className="w-full py-3 bg-[var(--bg)] hover:bg-[var(--surface)] text-[var(--text)] rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all border border-[var(--border)] flex items-center justify-center gap-2 group/btn">
                    {insight.action}
                    <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform text-[var(--primary)]" />
                  </button>
                </div>
              </motion.div>
            ))
          ) : !analyzing ? (
            /* Empty State */
            <div className="col-span-3 py-16 text-center space-y-4 bg-[var(--surface)]/50 rounded-[2.5rem] border border-dashed border-[var(--border)]">
              <div className="w-16 h-16 bg-[var(--bg)] rounded-2xl flex items-center justify-center text-[var(--text-2)] mx-auto border border-[var(--border)] shadow-sm">
                <Brain size={32} />
              </div>
              <p className="text-[var(--text-2)] font-bold uppercase tracking-widest text-[10px]">
                {t('admin.viva.empty_state')}
              </p>
            </div>
          ) : (
            /* Loading State */
            <div className="col-span-3 py-20 text-center space-y-6">
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-[var(--primary)] blur-xl opacity-20 animate-pulse" />
                <RefreshCw className="animate-spin text-[var(--primary)] relative z-10" size={40} />
              </div>
              <div className="space-y-2">
                <p className="text-[var(--text)] font-black text-xl tracking-tight uppercase">{t('admin.viva.loading_title')}</p>
                <p className="text-[var(--text-2)] font-bold text-xs">{t('admin.viva.loading_desc')}</p>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Advanced Capabilities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="admin-card p-8 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius)] flex items-center gap-8 group cursor-pointer">
          <div className="w-16 h-16 bg-[var(--primary-2)]/10 text-[var(--primary-2)] rounded-2xl flex items-center justify-center border border-[var(--primary-2)]/20 group-hover:bg-[var(--primary-2)] group-hover:text-white transition-all shadow-sm">
            <CheckCircle2 size={28} />
          </div>
          <div>
            <h5 className="text-base text-[var(--text)] font-black uppercase tracking-tight">{t('admin.viva.capabilities.financial_shield_title')}</h5>
            <p className="text-[var(--text-2)] text-xs font-medium leading-relaxed mt-1">{t('admin.viva.capabilities.financial_shield_desc')}</p>
          </div>
        </div>

        <div className="admin-card p-8 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius)] flex items-center gap-8 group cursor-pointer">
          <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center border border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-sm" >
            <TrendingUp size={28} />
          </div>
          <div>
            <h5 className="text-base text-[var(--text)] font-black uppercase tracking-tight">{t('admin.viva.capabilities.growth_title')}</h5>
            <p className="text-[var(--text-2)] text-xs font-medium leading-relaxed mt-1">{t('admin.viva.capabilities.growth_desc')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
