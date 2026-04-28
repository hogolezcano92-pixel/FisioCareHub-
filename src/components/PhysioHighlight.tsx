import React from 'react';
import { ShieldCheck, Activity, Users, Heart, Star } from 'lucide-react';
import { motion } from 'motion/react';

export default function PhysioHighlight() {
  return (
    <section className="bg-[#0a0f1e] py-24 px-6 overflow-hidden relative">
      {/* Background Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="max-w-6xl mx-auto flex flex-col items-center relative z-10">
        {/* Floating Top Card */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="bg-white/5 backdrop-blur-3xl border border-white/10 p-10 rounded-[3.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] flex flex-col items-center gap-6 mb-20 group hover:border-white/20 transition-all duration-500"
        >
          <div className="flex -space-x-4">
            {[
              "https://images.unsplash.com/photo-1581579885975-53933d6ea909?auto=format&fit=crop&q=80&w=150&h=150",
              "https://images.unsplash.com/photo-1542884748-2b87b36c6b90?auto=format&fit=crop&q=80&w=150&h=150",
              "https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&q=80&w=150&h=150"
            ].map((url, i) => (
              <motion.img
                key={i}
                initial={{ scale: 0.8, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                src={url}
                alt="Paciente Real"
                className="w-14 h-14 rounded-full border-4 border-[#0a0f1e] object-cover shadow-xl"
                referrerPolicy="no-referrer"
              />
            ))}
          </div>
          
          <div className="text-center space-y-2">
            <p className="text-white font-black text-2xl tracking-tight">+2000 Pacientes Atendidos</p>
            <div className="flex justify-center gap-1.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} size={18} className="fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]" />
              ))}
            </div>
          </div>
        </motion.div>

        {/* 2x2 Grid */}
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
            <span className="text-white font-black text-[11px] uppercase tracking-[0.4em] group-hover:text-blue-400 transition-colors">+500 FISIOS</span>
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
