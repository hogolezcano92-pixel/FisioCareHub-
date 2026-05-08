import { useState, useEffect } from 'react';
import { ShieldCheck, Activity, Users, Heart, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';

const TESTIMONIALS = [
  { text: "A praticidade de ser atendido em casa mudou minha rotina. O fisio é excelente!", author: "Maria Silva" },
  { text: "Recuperei meus movimentos muito mais rápido com o acompanhamento pela plataforma.", author: "José Santos" },
  { text: "Segurança e qualidade em cada sessão. Recomendo muito o FisioCareHub.", author: "Ana Oliveira" },
  { text: "O suporte da plataforma é incrível e os profissionais são de altíssimo nível.", author: "Ricardo Lima" },
  { text: "Minha mãe teve uma evolução fantástica. O atendimento humanizado faz toda a diferença.", author: "Carla Souza" }
];

export default function PhysioHighlight() {
  const [index, setIndex] = useState(0);
  const [totalFisios, setTotalFisios] = useState<number | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      const { count, error } = await supabase
        .from('perfis')
        .select('*', { count: 'exact', head: true })
        .eq('tipo_usuario', 'fisioterapeuta')
        .eq('status_aprovacao', 'aprovado');
      
      if (!error && count !== null) {
        setTotalFisios(count);
      }
    };
    fetchStats();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="bg-[#0a0f1e] py-24 px-6 overflow-hidden relative">
      {/* Background Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="max-w-6xl mx-auto flex flex-col items-center relative z-10">
        {/* Floating Top Card - SOCIAL PROOF CAROUSEL */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="bg-white/5 backdrop-blur-3xl border border-white/10 p-10 md:p-14 rounded-[3.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] flex flex-col items-center gap-8 mb-20 group hover:border-white/20 transition-all duration-500 w-full max-w-2xl overflow-hidden"
        >
          {/* Testimonial Carousel */}
          <div className="relative w-full h-32 flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className="text-center px-4"
              >
                <p className="text-lg md:text-xl text-white font-medium italic leading-relaxed mb-4">
                  "{TESTIMONIALS[index].text}"
                </p>
                <div className="flex items-center justify-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
                    <span className="text-[10px] font-black text-blue-400">{TESTIMONIALS[index].author[0]}</span>
                  </div>
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                    {TESTIMONIALS[index].author}
                  </span>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
          
          <div className="text-center space-y-4 border-t border-white/5 pt-8 w-full">
            <h2 className="text-white font-black text-2xl md:text-5xl tracking-tighter leading-tight">
              +2.000 <span className="text-blue-500 italic drop-shadow-[0_0_15px_rgba(59,130,246,0.2)]">Vidas Transformadas</span>
            </h2>
            
            <div className="flex justify-center gap-1.5 py-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} size={22} className="fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.3)]" />
              ))}
            </div>
            
            <p className="text-slate-400 font-medium text-sm md:text-base max-w-md mx-auto leading-relaxed">
              Nossa metodologia humanizada já devolveu autonomia e bem-estar para milhares de famílias brasileiras em domicílio.
            </p>
          </div>
        </motion.div>

        {/* 2x2 Grid - KEPT AS REQUESTED */}
        <div className="grid grid-cols-2 gap-12 md:gap-24 w-full max-w-3xl">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="flex flex-col items-center gap-5 group"
          >
            <div className="w-20 h-20 rounded-[2rem] bg-amber-400/10 border border-amber-400/20 flex items-center justify-center group-hover:bg-amber-400/20 group-hover:scale-110 transition-all duration-500 shadow-[0_0_30px_-10px_rgba(251,191,36,0.3)]">
              <ShieldCheck className="text-amber-400" size={40} />
            </div>
            <span className="text-white font-black text-[11px] uppercase tracking-[0.4em] group-hover:text-amber-400 transition-colors">CREFITO</span>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center gap-5 group"
          >
            <div className="w-20 h-20 rounded-[2rem] bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center group-hover:bg-emerald-400/20 group-hover:scale-110 transition-all duration-500 shadow-[0_0_30_px_-10px_rgba(52,211,153,0.3)]">
              <Activity className="text-emerald-400" size={40} />
            </div>
            <span className="text-white font-black text-[11px] uppercase tracking-[0.4em] group-hover:text-emerald-400 transition-colors">MONITORAMENTO</span>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="flex flex-col items-center gap-5 group"
          >
            <div className="w-20 h-20 rounded-[2rem] bg-blue-400/10 border border-blue-400/20 flex items-center justify-center group-hover:bg-blue-400/20 group-hover:scale-110 transition-all duration-500 shadow-[0_0_30px_-10px_rgba(96,165,250,0.3)]">
              <Users className="text-blue-400" size={40} />
            </div>
            <span className="text-white font-black text-[11px] uppercase tracking-[0.4em] group-hover:text-blue-400 transition-colors">
              +{totalFisios || 0} FISIOS
            </span>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="flex flex-col items-center gap-5 group"
          >
            <div className="w-20 h-20 rounded-[2rem] bg-rose-400/10 border border-rose-400/20 flex items-center justify-center group-hover:bg-rose-400/20 group-hover:scale-110 transition-all duration-500 shadow-[0_0_30px_-10px_rgba(251,113,133,0.3)]">
              <Heart className="text-rose-400" size={40} />
            </div>
            <span className="text-white font-black text-[11px] uppercase tracking-[0.4em] group-hover:text-rose-400 transition-colors">HUMANIZADO</span>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
