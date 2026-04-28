import React, { useState, useEffect } from 'react';
import { ShieldCheck, Activity, Users, Heart, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function PhysioHighlight() {
  // Fotos de pacientes (foco em idosos/geriatria)
  const patientImages = [
    "https://images.unsplash.com/photo-1551076805-e1869033e561?w=400&h=400&fit=crop", 
    "https://images.unsplash.com/photo-1544120190-275d272f56cc?w=400&h=400&fit=crop", 
    "https://images.unsplash.com/photo-1581579139922-260ef0c85863?w=400&h=400&fit=crop", 
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop", 
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?w=400&h=400&fit=crop"
  ];

  // Estado para o efeito de slideshow na pilha
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % patientImages.length);
    }, 3000); // Troca a cada 3 segundos
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="bg-[#0a0f1e] py-24 px-6 overflow-hidden relative">
      {/* Glow de fundo */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="max-w-6xl mx-auto flex flex-col items-center relative z-10">
        
        {/* Card Principal */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          className="bg-white/[0.03] backdrop-blur-3xl border border-white/10 p-12 rounded-[4rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.6)] flex flex-col items-center gap-8 mb-24 group hover:border-blue-500/30 transition-all duration-700"
        >
          {/* Avatar Stack com Efeito de Slide */}
          <div className="flex items-center justify-center">
            <div className="flex -space-x-5">
              <AnimatePresence mode="popLayout">
                {patientImages.slice(0, 5).map((img, i) => (
                  <motion.div
                    key={`${img}-${i}`}
                    initial={{ x: -10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 10, opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="relative"
                  >
                    <img
                      src={img}
                      alt="Paciente Atendido"
                      className="w-16 h-16 rounded-full border-[6px] border-[#0a0f1e] object-cover flex-shrink-0 shadow-2xl"
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
              
              <div className="w-16 h-16 rounded-full border-[6px] border-[#0a0f1e] bg-blue-600 flex items-center justify-center text-white font-black text-sm z-10 shadow-2xl">
                +2k
              </div>
            </div>
          </div>
          
          <div className="text-center space-y-3">
            <h3 className="text-white font-black text-4xl tracking-tighter">
              +2.000 <span className="text-blue-400 italic">Vidas Transformadas</span>
            </h3>
            
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} size={22} className="fill-amber-400 text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]" />
              ))}
            </div>
            
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] opacity-80">
              Cuidado especializado onde você estiver
            </p>
          </div>
        </motion.div>

        {/* Grid de Trust Badges */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12 w-full max-w-5xl">
          {[
            { icon: ShieldCheck, label: "CREFITO", color: "text-amber-400", bg: "bg-amber-400/10" },
            { icon: Activity, label: "MONITORAMENTO", color: "text-emerald-400", bg: "bg-emerald-400/10" },
            { icon: Users, label: "+500 FISIOS", color: "text-blue-400", bg: "bg-blue-400/10" },
            { icon: Heart, label: "HUMANIZADO", color: "text-rose-400", bg: "bg-rose-400/10" }
          ].map((item, index) => (
            <motion.div 
              key={index}
              whileHover={{ scale: 1.05 }}
              className="flex flex-col items-center gap-6"
            >
              <div className={`w-24 h-24 rounded-[2.5rem] ${item.bg} border border-white/5 flex items-center justify-center shadow-lg transition-all`}>
                <item.icon className={item.color} size={44} />
              </div>
              <span className="text-white font-black text-[12px] uppercase tracking-[0.4em] text-center">
                {item.label}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
