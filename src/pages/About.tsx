import { motion } from 'motion/react';
import { Link2, Zap, ShieldCheck } from 'lucide-react';

export default function About() {
  return (
    <div className="min-h-screen bg-[#f9fafb] pt-32 pb-20 overflow-x-hidden">
      <div className="max-w-[1100px] mx-auto px-6 space-y-16">
        
        {/* Header Section */}
        <header className="text-center space-y-4 max-w-3xl mx-auto">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight"
          >
            Sobre nós
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg md:text-xl text-slate-500 font-medium leading-relaxed"
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
              color: "text-blue-600",
              bgColor: "bg-blue-50"
            },
            {
              icon: Zap,
              title: "Simplicidade no agendamento",
              text: "Permite agendar, gerenciar e acompanhar sessões de fisioterapia em poucos cliques.",
              color: "text-amber-500",
              bgColor: "bg-amber-50"
            },
            {
              icon: ShieldCheck,
              title: "Segurança e confiança",
              text: "Oferecemos uma plataforma segura para pacientes e profissionais, garantindo organização e confiabilidade em todo o processo.",
              color: "text-emerald-500",
              bgColor: "bg-emerald-50"
            }
          ].map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 + 0.2 }}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              className="bg-white p-10 rounded-2xl border border-slate-100 shadow-md hover:shadow-xl transition-all group flex flex-col items-center text-center"
            >
              <div className={`w-14 h-14 ${card.bgColor} ${card.color} rounded-2xl flex items-center justify-center mb-6 shadow-inner`}>
                <card.icon size={28} strokeWidth={2.5} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-4">{card.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed font-medium">
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
          className="bg-white border border-slate-100 p-12 md:p-20 rounded-[2.5rem] shadow-sm text-center max-w-4xl mx-auto"
        >
          <p className="text-xl md:text-2xl text-slate-700 font-bold leading-relaxed">
            Somos uma plataforma de fisioterapia domiciliar que conecta pacientes e fisioterapeutas, tornando o cuidado em saúde mais acessível, moderno e humano.
          </p>
          <div className="mt-10 flex justify-center gap-3">
            <div className="w-12 h-1.5 bg-blue-600 rounded-full" />
            <div className="w-3 h-1.5 bg-slate-200 rounded-full" />
            <div className="w-3 h-1.5 bg-slate-200 rounded-full" />
          </div>
        </motion.section>

        {/* Subtle Brand Footer */}
        <footer className="text-center pt-10">
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">
            FisioCareHub • Inovação em Reabilitação
          </p>
        </footer>
      </div>
    </div>
  );
}

