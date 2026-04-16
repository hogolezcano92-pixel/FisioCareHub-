import React from 'react';
import { ShieldCheck, Activity, Users, Heart, Star } from 'lucide-react';
import { motion } from 'motion/react';

export default function PhysioHighlight() {
  return (
    <section className="bg-[#0a0f1e] py-28 px-6 overflow-hidden relative">

      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto flex flex-col items-center relative z-10">

        {/* Title */}
        <div className="text-center max-w-2xl mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight">
            Confiança de quem já transformou vidas
          </h2>
          <p className="text-slate-400 text-lg">
            Plataforma desenvolvida para conectar pacientes a fisioterapeutas qualificados,
            com monitoramento da evolução e atendimento humanizado.
          </p>
        </div>

        {/* Social Proof Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="bg-white/5 backdrop-blur-3xl border border-white/10 p-10 rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] flex flex-col items-center gap-6 mb-20 hover:border-white/20 transition"
        >

          {/* Patient Photos */}
          <div className="flex -space-x-4">
            {[
              "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150&h=150",
              "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=150&h=150",
              "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150&h=150"
            ].map((url, i) => (
              <img
                key={i}
                src={url}
                alt="Paciente satisfeito"
                className="w-14 h-14 rounded-full border-4 border-[#0a0f1e] object-cover shadow-xl"
                referrerPolicy="no-referrer"
              />
            ))}
          </div>

          <div className="text-center space-y-2">
            <p className="text-white font-bold text-2xl">
              +2.000 pacientes atendidos
            </p>

            <div className="flex justify-center gap-1.5">
              {[1,2,3,4,5].map((i) => (
                <Star
                  key={i}
                  size={18}
                  className="fill-amber-400 text-amber-400"
                />
              ))}
            </div>

            <p className="text-slate-400 text-sm">
              Avaliação média 4.9
            </p>
          </div>

        </motion.div>

        {/* Feature Grid */}
        <div className="grid grid-cols-2 gap-14 md:gap-24 w-full max-w-3xl">

          {/* CREFITO */}
          <div className="flex flex-col items-center gap-5 text-center">
            <div className="w-20 h-20 rounded-[2rem] bg-amber-400/10 border border-amber-400/20 flex items-center justify-center">
              <ShieldCheck className="text-amber-400" size={40} />
            </div>
            <p className="text-white font-semibold text-sm">
              Profissionais registrados no CREFITO
            </p>
          </div>

          {/* Monitoramento */}
          <div className="flex flex-col items-center gap-5 text-center">
            <div className="w-20 h-20 rounded-[2rem] bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center">
              <Activity className="text-emerald-400" size={40} />
            </div>
            <p className="text-white font-semibold text-sm">
              Monitoramento da evolução do paciente
            </p>
          </div>

          {/* Fisios */}
          <div className="flex flex-col items-center gap-5 text-center">
            <div className="w-20 h-20 rounded-[2rem] bg-blue-400/10 border border-blue-400/20 flex items-center justify-center">
              <Users className="text-blue-400" size={40} />
            </div>
            <p className="text-white font-semibold text-sm">
              Mais de 500 fisioterapeutas cadastrados
            </p>
          </div>

          {/* Humanizado */}
          <div className="flex flex-col items-center gap-5 text-center">
            <div className="w-20 h-20 rounded-[2rem] bg-rose-400/10 border border-rose-400/20 flex items-center justify-center">
              <Heart className="text-rose-400" size={40} />
            </div>
            <p className="text-white font-semibold text-sm">
              Atendimento humanizado e personalizado
            </p>
          </div>

        </div>

      </div>
    </section>
  );
}
