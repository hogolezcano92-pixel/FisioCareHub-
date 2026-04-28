import { motion } from 'motion/react';
import { Link2, Zap, ShieldCheck } from 'lucide-react';

export default function About() {
  return (
    <div className="min-h-screen bg-slate-950 pt-32 pb-20 overflow-x-hidden relative">
      {/* Background Accents */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] -z-10" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-sky-600/10 rounded-full blur-[120px] -z-10" />

      <div className="max-w-[1100px] mx-auto px-6 space-y-16 relative">
        
        {/* Header Section */}
        <header className="text-center space-y-4 max-w-3xl mx-auto">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-black text-white tracking-tight"
          >
            Sobre nós
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg md:text-xl text-slate-400 font-medium leading-relaxed"
          >
            Conectando pacientes e fisioterapeutas de forma simples, rápida e segura.
          </motion.p>
        </header>

        {/* SaaS Cards Section */}
        <section className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: Link2,
              title: "Conexão inteligente",
              text: "Conectamos pacientes e fisioterapeutas de forma rápida e eficiente, facilitando o acesso ao atendimento domiciliar.",
              color: "text-blue-400",
              bgColor: "bg-blue-400/10"
            },
            {
              icon: Zap,
              title: "Simplicidade no agendamento",
              text: "Permite agendar, gerenciar e acompanhar sessões de fisioterapia em poucos cliques.",
              color: "text-amber-400",
              bgColor: "bg-amber-400/10"
            },
            {
              icon: ShieldCheck,
              title: "Segurança e confiança",
              text: "Oferecemos uma plataforma segura para pacientes e profissionais, garantindo organização e confiabilidade em todo o processo.",
              color: "text-emerald-400",
              bgColor: "bg-emerald-400/10"
            }
          ].map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 + 0.2 }}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              className="bg-white/5 backdrop-blur-xl p-10 rounded-2xl border border-white/5 shadow-2xl hover:bg-white/[0.08] transition-all group flex flex-col items-center text-center"
            >
              <div className={`w-14 h-14 ${card.bgColor} ${card.color} rounded-2xl flex items-center justify-center mb-6 border border-white/5`}>
                <card.icon size={28} strokeWidth={2.5} />
              </div>
              <h3 className="text-xl font-bold text-white mb-4">{card.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed font-medium">
                {card.text}
              </p>
            </motion.div>
          ))}
        </section>

        {/* Final Hero Section */}
        <motion.section 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-white/5 border border-white/5 p-12 md:p-20 rounded-[2.5rem] shadow-sm text-center max-w-4xl mx-auto"
        >
          <p className="text-xl md:text-2xl text-slate-200 font-bold leading-relaxed">
            Somos uma plataforma de fisioterapia domiciliar que conecta pacientes e fisioterapeutas, tornando o cuidado em saúde mais acessível, moderno e humano.
          </p>
          <div className="mt-10 flex justify-center gap-3">
            <div className="w-12 h-1.5 bg-blue-600 rounded-full" />
            <div className="w-3 h-1.5 bg-white/10 rounded-full" />
            <div className="w-3 h-1.5 bg-white/10 rounded-full" />
          </div>
        </motion.section>

        {/* Subtle Brand Footer */}
        <footer className="text-center pt-10">
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em]">
            FisioCareHub • Inovação em Reabilitação
          </p>
        </footer>
      </div>
    </div>
  );
}

