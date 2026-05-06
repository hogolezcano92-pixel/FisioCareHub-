import { useState, useEffect } from 'react';
import { ShieldCheck, Activity, Users, Heart, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';

const PATIENT_IMAGES = [
  "https://static.wixstatic.com/media/817c2f_fdd977fd7600425a9734fc7c20b5453b~mv2.png/v1/fill/w_568,h_314,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/817c2f_fdd977fd7600425a9734fc7c20b5453b~mv2.png",
  "https://soscardio.com.br/wp-content/uploads/2023/02/Fisioterapia-no-Hospital-SOS-Cardio.jpg",
  "https://www.biosete.com.br/site/wp-content/uploads/2019/09/alzheimer_blog_fisio.png",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSPEXy4VYcy4VbOpBGQgdZqJ06Pbgui8IJ0qLQhh9r4VA&s=10",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSdNki-2MEp873H0ctTrSJmuzsLjTxjBf0QuA0CBqMQFQ&s=10",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT7_-RfpQNcNcnEBvarfHPqNUzk_pY34Wpwc0T8QrC86g&s=10"
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
      setIndex((prev) => (prev + 1) % (PATIENT_IMAGES.length - 2));
    }, 3000);
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
          {/* Multi-Avatar Carousel */}
          <div className="relative w-full overflow-hidden flex justify-center py-4">
             <div className="flex gap-4">
              <AnimatePresence mode="popLayout">
                {PATIENT_IMAGES.slice(index, index + 3).map((url, i) => (
                  <motion.div
                    key={url}
                    initial={{ opacity: 0, scale: 0.5, x: 50 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.5, x: -50 }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className="relative shrink-0"
                  >
                    <div className="absolute -inset-1 bg-gradient-to-tr from-blue-500 to-sky-400 rounded-full blur opacity-20 group-hover:opacity-40 transition-opacity" />
                    <img 
                      src={url} 
                      alt="Paciente Real" 
                      className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full border-4 border-slate-900 object-cover relative z-10 shadow-2xl"
                      referrerPolicy="no-referrer"
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
             </div>
          </div>
          
          <div className="text-center space-y-4">
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
