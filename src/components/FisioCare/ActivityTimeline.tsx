import React from 'react';
import { motion } from 'motion/react';
import { 
  Calendar, 
  CheckCircle2, 
  Star, 
  User, 
  MessageSquare, 
  Activity,
  Clock,
  ArrowRight
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../../lib/utils';

interface ActivityItem {
  id: string;
  tipo_acao: string;
  descricao: string;
  created_at: string;
  referencia_id?: string;
}

interface ActivityTimelineProps {
  activities: ActivityItem[];
  loading?: boolean;
}

const getActionStyles = (type: string) => {
  switch (type) {
    case 'agendamento_criado':
      return { icon: Calendar, color: 'text-blue-400', bg: 'bg-blue-400/10' };
    case 'agendamento_concluido':
      return { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-400/10' };
    case 'avaliacao_enviada':
      return { icon: Star, color: 'text-yellow-400', bg: 'bg-yellow-400/10' };
    case 'perfil_atualizado':
      return { icon: User, color: 'text-purple-400', bg: 'bg-purple-400/10' };
    case 'mensagem_recebida':
      return { icon: MessageSquare, color: 'text-sky-400', bg: 'bg-sky-400/10' };
    default:
      return { icon: Activity, color: 'text-slate-400', bg: 'bg-slate-400/10' };
  }
};

export default function ActivityTimeline({ activities, loading }: ActivityTimelineProps) {
  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 bg-white/5 rounded-3xl border border-white/5" />
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-12 bg-white/5 rounded-[2.5rem] border border-dashed border-white/10">
        <Activity size={48} className="mx-auto text-slate-700 mb-4" />
        <p className="text-slate-500 font-bold">Nenhuma atividade registrada ainda.</p>
      </div>
    );
  }

  return (
    <div className="relative space-y-6">
      {/* Timeline Line */}
      <div className="absolute left-6 top-8 bottom-8 w-px bg-gradient-to-b from-blue-500/50 via-white/10 to-transparent" />

      {activities.map((activity, index) => {
        const { icon: Icon, color, bg } = getActionStyles(activity.tipo_acao);
        
        return (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            viewport={{ once: true }}
            className="relative flex gap-6 group"
          >
            {/* Icon Node */}
            <div className={cn(
              "relative z-10 w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border border-white/10 shadow-xl transition-all group-hover:scale-110",
              bg, color
            )}>
              <Icon size={20} />
            </div>

            {/* Content Card */}
            <div className="flex-1 bg-white/5 backdrop-blur-3xl border border-white/10 p-5 rounded-[2rem] group-hover:bg-white/10 transition-all shadow-lg">
              <div className="flex justify-between items-start mb-1">
                <h4 className="text-sm font-black text-white capitalize tracking-tight">
                  {activity.tipo_acao.replace(/_/g, ' ')}
                </h4>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-black/20 px-2 py-1 rounded-full">
                  <Clock size={10} />
                  {format(new Date(activity.created_at), "HH:mm, d 'de' MMM", { locale: ptBR })}
                </div>
              </div>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">
                {activity.descricao}
              </p>
              
              {activity.referencia_id && (
                <button className="mt-3 flex items-center gap-1.5 text-[9px] font-black text-blue-400 uppercase tracking-[0.2em] hover:text-blue-300 transition-colors group/link">
                  Ver Detalhes
                  <ArrowRight size={10} className="group-hover/link:translate-x-1 transition-transform" />
                </button>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
