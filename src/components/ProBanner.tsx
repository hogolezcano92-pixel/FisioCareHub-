import { Crown, ArrowRight, Sparkles, Zap, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';

export default function ProBanner() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden bg-slate-900 border border-blue-500/30 rounded-[2.5rem] shadow-2xl shadow-blue-900/20 group"
    >
      {/* Premium Glow Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-blue-600/10 group-hover:scale-105 transition-transform duration-700" />
      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-blue-600/20 rounded-full blur-[80px] pointer-events-none" />
      
      <div className="relative p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex items-center gap-6 text-center md:text-left flex-col md:flex-row">
          <div className="w-16 h-16 bg-blue-600/20 border border-blue-500/30 rounded-2xl flex items-center justify-center flex-shrink-0 animate-pulse">
            <Sparkles className="w-8 h-8 text-blue-400 group-hover:rotate-12 transition-transform" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <h3 className="text-xl font-black text-white tracking-tight">Destaque-se na Sua Região</h3>
              <span className="px-2 py-0.5 bg-blue-600 text-white text-[8px] font-black uppercase tracking-widest rounded-full">PRO</span>
            </div>
            <p className="text-slate-400 font-medium text-sm max-w-sm">
              ⭐ Seu perfil pode aparecer primeiro para pacientes da sua região. Aumente seu ranking agora.
            </p>
          </div>
        </div>
        
        <Link 
          to="/subscription" 
          className="w-full md:w-auto px-8 py-4 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-3 group/btn whitespace-nowrap active:scale-95"
        >
          Ver planos profissionais
          <ArrowRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
        </Link>
      </div>
    </motion.div>
  );
}
