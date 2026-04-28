import { motion } from 'motion/react';
import { Info, Target, Heart, Shield } from 'lucide-react';

export default function About() {
  return (
    <div className="min-h-screen bg-slate-950 pt-32 pb-20 overflow-x-hidden">
      <div className="max-w-4xl mx-auto px-6 space-y-20 relative">
        {/* Background Accents */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-sky-600/10 rounded-full blur-3xl -z-10" />

        {/* Header Section */}
        <header className="text-center space-y-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600/10 text-blue-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-500/20 shadow-xl shadow-blue-500/5 mb-4"
          >
            <Info size={14} />
            Institucional
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-black text-white tracking-tighter leading-tight"
          >
            Sobre <span className="text-blue-500">nós</span>
          </motion.h1>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-20 h-1.5 bg-blue-600 mx-auto rounded-full"
          />
        </header>

        {/* Content Section */}
        <section className="space-y-12">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/5 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-10 md:p-14 shadow-2xl relative overflow-hidden"
          >
            <div className="relative z-10 space-y-8">
              <p className="text-lg md:text-xl text-slate-300 font-bold leading-relaxed text-center">
                Somos uma plataforma de fisioterapia domiciliar que conecta pacientes e fisioterapeutas de forma rápida, simples e segura.
              </p>
              
              <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

              <p className="text-lg text-slate-400 font-medium leading-relaxed">
                Reunimos profissionais qualificados e pessoas que precisam de atendimento em casa, facilitando o agendamento e a gestão das sessões em poucos cliques.
              </p>

              <div className="grid md:grid-cols-2 gap-8 pt-6">
                <div className="flex items-start gap-4 p-6 bg-white/5 rounded-3xl border border-white/5">
                  <div className="w-12 h-12 bg-blue-600/20 text-blue-400 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <Target size={24} />
                  </div>
                  <div>
                    <h3 className="text-white font-black text-sm uppercase tracking-widest mb-2">Nosso Objetivo</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Tornar a fisioterapia mais acessível, conectada e eficiente, usando tecnologia para aproximar quem precisa de quem cuida.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-6 bg-white/5 rounded-3xl border border-white/5">
                  <div className="w-12 h-12 bg-emerald-600/20 text-emerald-400 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <Shield size={24} />
                  </div>
                  <div>
                    <h3 className="text-white font-black text-sm uppercase tracking-widest mb-2">Segurança Direta</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Agendamentos validados e profissionais verificados para garantir a melhor experiência no conforto do seu lar.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Brand Footer */}
        <footer className="text-center space-y-4 pt-10 border-t border-white/5">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">
            FisioCareHub • Tecnologia em Saúde
          </p>
          <div className="flex justify-center gap-6 text-slate-600">
            <Heart size={16} className="hover:text-rose-500 cursor-pointer transition-colors" />
            <Shield size={16} className="hover:text-blue-500 cursor-pointer transition-colors" />
            <Info size={16} className="hover:text-sky-500 cursor-pointer transition-colors" />
          </div>
        </footer>
      </div>
    </div>
  );
}
