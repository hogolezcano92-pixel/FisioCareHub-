import React from 'react';
import { ShieldCheck, Activity, Users, Heart, Star } from 'lucide-react';
import { motion } from 'motion/react';

export default function PhysioHighlight() {
  // Links mais diretos e estáveis do Unsplash
  const patientAvatars = [
    "https://images.unsplash.com/photo-1551076805-e1869033e561?w=200&h=200&fit=crop", 
    "https://images.unsplash.com/photo-1544120190-275d272f56cc?w=200&h=200&fit=crop", 
    "https://images.unsplash.com/photo-1581579139922-260ef0c85863?w=200&h=200&fit=crop", 
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop", 
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop"
  ];

  return (
    <section className="bg-[#0a0f1e] py-24 px-6 overflow-hidden relative">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="max-w-6xl mx-auto flex flex-col items-center relative z-10">
        
        {/* Card Principal de Prova Social */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          className="bg-white/[0.03] backdrop-blur-3xl border border-white/10 p-10 rounded-[3.5rem] shadow-2xl flex flex-col items-center gap-6 mb-20 group"
        >
          {/* Avatar Stack - CORRIGIDO */}
          <div className="flex items-center justify-center">
            <div className="flex -space-x-4"> {/* Reduzi o espaço negativo para não esmagar */}
              {patientAvatars.map((url, i) => (
                <div key={i} className="relative">
                  <img
                    src={url}
                    alt="Paciente"
                    className="w-14 h-14 md:w-16 md:h-16 rounded-full border-4 border-[#0a0f1e] object-cover flex-shrink-0 bg-slate-800"
                  />
                </div>
              ))}
              <div className="w-14 h-14 md:w-16 md:h-16 rounded-full border-4 border-[#0a0f1e] bg-blue-600 flex items-center justify-center text-white font-black text-xs flex-shrink-0 z-10 shadow-lg">
                +2k
              </div>
            </div>
          </div>
          
          <div className="text-center space-y-2">
            <h3 className="text-white font-black text-2xl md:text-3xl tracking-tighter">
              +2.000 <span className="text-blue-400 italic">Pacientes Felizes</span>
            </h3>
            
            <div className="flex justify-center gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} size={18} className="fill-amber-400 text-amber-400" />
              ))}
            </div>
            
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em]">
              Especialistas em Reabilitação e Gerontologia
            </p>
          </div>
        </motion.div>

        {/* Grid de Ícones (Corrigido para não quebrar no mobile) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 w-full max-w-4xl">
          {[
            { icon: ShieldCheck, label: "CREFITO", color: "text-amber-400", bg: "bg-amber-400/10" },
            { icon: Activity, label: "MONITORAMENTO", color: "text-emerald-400", bg: "bg-emerald-400/10" },
            { icon: Users, label: "+500 FISIOS", color: "text-blue-400", bg: "bg-blue-400/10" },
            { icon: Heart, label: "HUMANIZADO", color: "text-rose-400", bg: "bg-rose-400/10" }
          ].map((item, index) => (
            <div key={index} className="flex flex-col items-center gap-4">
              <div className={`w-16 h-16 md:w-20 md:h-20 rounded-3xl ${item.bg} border border-white/5 flex items-center justify-center`}>
                <item.icon className={item.color} size={32} />
              </div>
              <span className="text-white font-black text-[10px] uppercase tracking-widest text-center">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
