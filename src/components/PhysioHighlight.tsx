import React from 'react';
import { ShieldCheck, Activity, Users, Heart, Star } from 'lucide-react';
import { motion } from 'motion/react';

export default function PhysioHighlight() {
  // Lista de imagens focada em diversidade, com ênfase em idosos (geriatria)
  const patientAvatars = [
    "https://images.unsplash.com/photo-1551076805-e1869033e561?q=80&w=150&h=150&auto=format&fit=crop", // Senhora sorrindo
    "https://images.unsplash.com/photo-1544120190-275d272f56cc?q=80&w=150&h=150&auto=format&fit=crop", // Senhor ativo
    "https://images.unsplash.com/photo-1581579139922-260ef0c85863?q=80&w=150&h=150&auto=format&fit=crop", // Paciente em reabilitação
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&h=150&auto=format&fit=crop", // Homem adulto
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&h=150&auto=format&fit=crop"  // Mulher jovem
  ];

  return (
    <section className="bg-[#0a0f1e] py-24 px-6 overflow-hidden relative">
      {/* Efeito de brilho de fundo (Glow) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="max-w-6xl mx-auto flex flex-col items-center relative z-10">
        
        {/* Card Principal: Prova Social (Avatar Stack) */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="bg-white/[0.03] backdrop-blur-3xl border border-white/10 p-12 rounded-[4rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.6)] flex flex-col items-center gap-8 mb-24 group hover:border-blue-500/30 transition-all duration-700"
        >
          {/* Avatar Stack Dinâmico */}
          <div className="flex items-center">
            <div className="flex -space-x-5">
              {patientAvatars.map((url, i) => (
                <motion.div
                  key={i}
                  initial={{ x: -20, opacity: 0 }}
                  whileInView={{ x: 0, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                >
                  <img
                    src={url}
                    alt="Paciente FisioCareHub"
                    className="w-16 h-16 rounded-full border-[6px] border-[#0a0f1e] object-cover shadow-2xl group-hover:scale-110 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                </motion.div>
              ))}
              {/* Círculo indicador de volume (+2k) */}
              <motion.div 
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                className="w-16 h-16 rounded-full border-[6px] border-[#0a0f1e] bg-blue-600 flex items-center justify-center text-white font-black text-sm shadow-2xl relative z-10"
              >
                +
              </motion.div>
            </div>
          </div>
          
          <div className="text-center space-y-3">
            <h3 className="text-white font-black text-3xl tracking-tighter">
              +2.000 <span className="text-blue-400 italic">Vidas Transformadas</span>
            </h3>
            
            {/* Avaliação em Estrelas */}
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star 
                  key={i} 
                  size={22} 
                  className="fill-amber-400 text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.6)]" 
                />
              ))}
            </div>
            
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] opacity-60">
              Especialistas em Reabilitação e Gerontologia
            </p>
          </div>
        </motion.div>

        {/* Grid de Diferenciais (4 Colunas) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12 w-full max-w-5xl">
          {[
            { 
              icon: ShieldCheck, 
              label: "CREFITO", 
              color: "text-amber-400", 
              bg: "bg-amber-400/10", 
              border: "border-amber-400/20" 
            },
            { 
              icon: Activity, 
              label: "MONITORAMENTO", 
              color: "text-emerald-400", 
              bg: "bg-emerald-400/10", 
              border: "border-emerald-400/20" 
            },
            { 
              icon: Users, 
              label: "+500 FISIOS", 
              color: "text-blue-400", 
              bg: "bg-blue-400/10", 
              border: "border-blue-400/20" 
            },
            { 
              icon: Heart, 
              label: "HUMANIZADO", 
              color: "text-rose-400", 
              bg: "bg-rose-400/10", 
              border: "border-rose-400/20" 
            }
          ].map((item, index) => (
            <motion.div 
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="flex flex-col items-center gap-6 group cursor-default"
            >
              <div className={`w-24 h-24 rounded-[2.5rem] ${item.bg} border ${item.border} flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-lg`}>
                <item.icon className={item.color} size={44} />
              </div>
              <span className={`text-white font-black text-[12px] uppercase tracking-[0.4em] group-hover:${item.color} transition-colors text-center`}>
                {item.label}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
