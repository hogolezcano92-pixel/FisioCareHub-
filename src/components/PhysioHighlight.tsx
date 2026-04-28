import React, { useState, useEffect } from 'react';
import { ShieldCheck, Activity, Users, Heart, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function PhysioHighlight() {
  // Lista de pacientes (Foco em Gerontologia/Reabilitação)
  const allPatients = [
    "https://images.unsplash.com/photo-1551076805-e1869033e561?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1544120190-275d272f56cc?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1581579139922-260ef0c85863?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop"
  ];

  const [visibleIndex, setVisibleIndex] = useState(0);

  // Lógica para rotacionar as fotos a cada 4 segundos
  useEffect(() => {
    const timer = setInterval(() => {
      setVisibleIndex((prev) => (prev + 1) % allPatients.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [allPatients.length]);

  // Pegamos 5 fotos começando do index atual para criar o efeito de rotação
  const displayPatients = [
    ...allPatients.slice(visibleIndex, visibleIndex + 5),
    ...allPatients.slice(0, Math.max(0, (visibleIndex + 5) - allPatients.length))
  ];

  return (
    <section className="bg-[#0a0f1e] py-24 px-6 overflow-hidden relative">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="max-w-6xl mx-auto flex flex-col items-center relative z-10">
        
        {/* Card Principal de Prova Social */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          className="bg-white/[0.03] backdrop-blur-3xl border border-white/10 p-10 md:p-14 rounded-[4rem] shadow-2xl flex flex-col items-center gap-8 mb-24 w-full max-w-2xl text-center"
        >
          {/* Avatar Stack com Animação de Troca */}
          <div className="flex items-center justify-center h-20">
            <div className="flex -space-x-5">
              <AnimatePresence mode="popLayout">
                {displayPatients.map((img, i) => (
                  <motion.div
                    key={img} // A key sendo a URL faz o Framer Motion animar a troca
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <img
                      src={img}
                      alt="Paciente Atendido"
                      className="w-16 h-16 md:w-20 md:h-20 rounded-full border-[6px] border-[#0a0f1e] object-cover flex-shrink-0 bg-slate-800"
                      loading="lazy"
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
              
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full border-[6px] border-[#0a0f1e] bg-blue-600 flex items-center justify-center text-white font-black text-sm md:text-base z-10 shadow-2xl">
                +2k
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-white font-black text-3xl md:text-5xl tracking-tighter leading-tight">
              +2.000 <span className="text-blue-400 italic block md:inline">Vidas Transformadas</span>
            </h3>
            
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} size={24} className="fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
              ))}
            </div>
            
            <p className="text-slate-400 text-[10px] md:text-xs font-black uppercase tracking-[0.4em] opacity-70">
              Fisioterapia Especializada e Humanizada
            </p>
          </div>
        </motion.div>

        {/* Grid de Diferenciais (2x2 no mobile, 4x1 no desktop) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12 w-full max-w-5xl">
          {[
            { icon: ShieldCheck, label: "CREFITO", color: "text-amber-400", bg: "bg-amber-400/10" },
            { icon: Activity, label: "MONITORAMENTO", color: "text-emerald-400", bg: "bg-emerald-400/10" },
            { icon: Users, label: "+500 FISIOS", color: "text-blue-400", bg: "bg-blue-400/10" },
            { icon: Heart, label: "HUMANIZADO", color: "text-rose-400", bg: "bg-rose-400/10" }
          ].map((item, index) => (
            <motion.div 
              key={index}
              whileHover={{ y: -5 }}
              className="flex flex-col items-center gap-6"
            >
              <div className={`w-20 h-20 md:w-24 md:h-24 rounded-[2.5rem] ${item.bg} border border-white/5 flex items-center justify-center shadow-lg`}>
                <item.icon className={item.color} size={40} />
              </div>
              <span className="text-white font-black text-[10px] md:text-[12px] uppercase tracking-[0.3em] text-center">
                {item.label}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
