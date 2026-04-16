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
            {[1, 2, 3].map((i) => (
              <motion.img
                key={i}
                initial={{ scale: 0.8, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                src={`https://i.pravatar.cc/150?u=${i + 25}`}
                alt="Professional"
                className="w-14 h-14 rounded-full border-4 border-[#0a0f1e] object-cover shadow-xl"
                referrerPolicy="no-referrer"
              />
            ))}
          </div>
          
          <div className="text-center space-y-2">
            <p className="text-white font-black text-2xl tracking-tight">+2k Pacientes Atendidos</p>
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
            <div className="w-20 h-20 rounded-[2rem] border border-white/10 flex items-center justify-center group-hover:bg-white/5 group-hover:border-white/20 group-hover:scale-110 transition-all duration-500">
              <ShieldCheck className="text-white stroke-[1px]" size={40} />
            </div>
            <span className="text-white font-black text-[11px] uppercase tracking-[0.4em] opacity-70 group-hover:opacity-100 transition-opacity">CREFITO</span>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center gap-5 group"
          >
            <div className="w-20 h-20 rounded-[2rem] border border-white/10 flex items-center justify-center group-hover:bg-white/5 group-hover:border-white/20 group-hover:scale-110 transition-all duration-500">
              <Activity className="text-white stroke-[1px]" size={40} />
            </div>
            <span className="text-white font-black text-[11px] uppercase tracking-[0.4em] opacity-70 group-hover:opacity-100 transition-opacity">MONITORAMENTO</span>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="flex flex-col items-center gap-5 group"
          >
            <div className="w-20 h-20 rounded-[2rem] border border-white/10 flex items-center justify-center group-hover:bg-white/5 group-hover:border-white/20 group-hover:scale-110 transition-all duration-500">
              <Users className="text-white stroke-[1px]" size={40} />
            </div>
            <span className="text-white font-black text-[11px] uppercase tracking-[0.4em] opacity-70 group-hover:opacity-100 transition-opacity">+500 FISIOS</span>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="flex flex-col items-center gap-5 group"
          >
            <div className="w-20 h-20 rounded-[2rem] border border-white/10 flex items-center justify-center group-hover:bg-white/5 group-hover:border-white/20 group-hover:scale-110 transition-all duration-500">
              <Heart className="text-white stroke-[1px]" size={40} />
            </div>
            <span className="text-white font-black text-[11px] uppercase tracking-[0.4em] opacity-70 group-hover:opacity-100 transition-opacity">HUMANIZADO</span>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
