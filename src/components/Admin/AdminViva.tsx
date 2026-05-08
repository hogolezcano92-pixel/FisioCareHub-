import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
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
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

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
        faturamento_mes: `R$ ${totalRevenue.toLocaleString('pt-BR')}`,
        logs_recentes: (recentLogs || []).map(l => `${l.tipo_acao}: ${l.descricao}`)
      };

      const data = await generateAdminInsights(performanceData);
      setInsights(data);
    } catch (error) {
      console.error("Error generating insights:", error);
      toast.error("Não foi possível analisar os dados reais no momento.");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      {/* VIVA Hero Banner */}
      <div className="bg-gradient-to-br from-indigo-600 to-blue-600 rounded-[3rem] p-12 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 p-24 -mr-24 -mt-24 bg-white/10 blur-3xl rounded-full animate-pulse" />
        <div className="absolute bottom-0 left-0 p-24 -ml-24 -mb-24 bg-blue-400/10 blur-3xl rounded-full" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
          <div className="w-32 h-32 bg-white/20 backdrop-blur-md rounded-[2.5rem] flex items-center justify-center border border-white/30 shadow-2xl animate-bounce-slow">
            <Brain size={64} className="text-white" />
          </div>
          
          <div className="flex-1 text-center md:text-left space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/20 backdrop-blur-md rounded-full border border-white/30 text-[10px] font-black uppercase tracking-[0.2em]">
              <Sparkles size={14} />
              AI Administrative Assistant
            </div>
            <h2 className="text-5xl font-black tracking-tighter">Olá, sou Viva.</h2>
            <p className="text-lg font-medium text-white/80 max-w-2xl leading-relaxed">
              Analiso milhões de pontos de dados para detectar anomalias, 
              prever tendências e sugerir melhorias operacionais para sua clínica.
            </p>
            <div className="flex flex-wrap justify-center md:justify-start gap-4 pt-4">
              <button 
                onClick={generateInsights}
                disabled={analyzing}
                className="px-8 py-4 bg-white text-indigo-600 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-100 transition-all shadow-xl active:scale-95 flex items-center gap-3"
              >
                {analyzing ? <Loader2 className="animate-spin" size={20} /> : <Zap size={20} />}
                Gerar Novos Insights
              </button>
              <button className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-black text-sm uppercase tracking-widest border border-white/20 transition-all flex items-center gap-3">
                <MessageSquare size={20} />
                Falar com Viva
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Insights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <AnimatePresence mode="popLayout">
          {insights.length > 0 ? (
            insights.map((insight, idx) => (
              <motion.div
                key={insight.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white/5 p-8 rounded-[3rem] border border-white/10 shadow-2xl flex flex-col hover:bg-white/[0.08] transition-all group"
              >
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-lg border",
                  insight.type === 'risk' ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' :
                  insight.type === 'growth' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                  'bg-blue-500/10 border-blue-500/20 text-blue-500'
                )}>
                  {insight.type === 'risk' ? <AlertCircle size={28} /> : 
                   insight.type === 'growth' ? <TrendingUp size={28} /> : <Zap size={28} />}
                </div>

                <div className="flex-1 space-y-3">
                  <h4 className="text-xl font-black text-white tracking-tight leading-tight">{insight.title}</h4>
                  <p className="text-sm text-slate-400 font-medium leading-relaxed">{insight.description}</p>
                </div>

                <div className="mt-8 pt-8 border-t border-white/5">
                  <button className="w-full py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all border border-white/5 flex items-center justify-center gap-2 group/btn">
                    {insight.action}
                    <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                </div>
              </motion.div>
            ))
          ) : !analyzing ? (
            /* Empty State */
            <div className="col-span-3 py-20 text-center space-y-6">
              <div className="w-20 h-20 bg-white/5 rounded-[2rem] flex items-center justify-center text-slate-700 mx-auto border border-white/10">
                <Brain size={40} className="opacity-20" />
              </div>
              <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">
                Clique em "Gerar Novos Insights" para começar a análise.
              </p>
            </div>
          ) : (
            /* Loading State */
            <div className="col-span-3 py-20 text-center space-y-6">
              <RefreshCw className="animate-spin text-blue-500 mx-auto" size={48} />
              <div className="space-y-2">
                <p className="text-white font-black text-xl uppercase tracking-tighter">Viva está pensando...</p>
                <p className="text-slate-500 font-bold text-xs">Cruzando dados de usuários, finanças e logs técnicos.</p>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Advanced Capabilities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white/5 p-8 rounded-[3rem] border border-white/10 shadow-2xl flex items-center gap-8 group cursor-pointer hover:bg-white/[0.08] transition-all">
          <div className="w-20 h-20 bg-blue-600/10 text-blue-400 rounded-3xl flex items-center justify-center border border-blue-500/20 group-hover:rotate-6 transition-transform">
            <CheckCircle2 size={32} />
          </div>
          <div>
            <h5 className="text-lg font-black text-white uppercase tracking-tight">Análise de Fraude</h5>
            <p className="text-sm text-slate-500 font-medium leading-tight">Detecção proativa de identidades falsas e estornos suspeitos.</p>
          </div>
        </div>

        <div className="bg-white/5 p-8 rounded-[3rem] border border-white/10 shadow-2xl flex items-center gap-8 group cursor-pointer hover:bg-white/[0.08] transition-all">
          <div className="w-20 h-20 bg-emerald-600/10 text-emerald-400 rounded-3xl flex items-center justify-center border border-emerald-500/20 group-hover:rotate-6 transition-transform">
            <TrendingUp size={32} />
          </div>
          <div>
            <h5 className="text-lg font-black text-white uppercase tracking-tight">Previsão de Churn</h5>
            <p className="text-sm text-slate-500 font-medium leading-tight">Identifique fisioterapeutas com risco de abandonar a plataforma.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
