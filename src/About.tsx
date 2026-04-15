import { motion } from 'motion/react';
import { Activity, Heart, Shield, Users, Sparkles } from 'lucide-react';

export default function About() {
  return (
    <div className="min-h-screen bg-slate-950 pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 space-y-20">
        {/* Hero Section */}
        <section className="text-center space-y-8 max-w-4xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-sky-500/10 text-sky-400 rounded-full text-sm font-black uppercase tracking-widest border border-sky-500/20"
          >
            <Sparkles size={16} />
            Nossa Missão
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-black text-white tracking-tighter leading-tight"
          >
            Redefinindo a Fisioterapia no <span className="text-sky-500">Lugar que Você Ama</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-slate-400 font-medium leading-relaxed"
          >
            Acreditamos que a cura é potencializada pelo conforto e segurança do lar. Nossa missão é levar excelência clínica diretamente para sua casa, unindo tecnologia de ponta e cuidado humanizado para transformar sua reabilitação.
          </motion.p>
        </section>

        {/* Values Grid */}
        <section className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: Heart,
              title: "Cuidado Humanizado",
              description: "Priorizamos o bem-estar e a dignidade de cada paciente, adaptando o tratamento às suas necessidades individuais.",
              color: "bg-rose-500/10 text-rose-400 border-rose-500/20"
            },
            {
              icon: Shield,
              title: "Segurança e Confiança",
              description: "Todos os nossos profissionais passam por um rigoroso processo de verificação para garantir sua total tranquilidade.",
              color: "bg-sky-500/10 text-sky-400 border-sky-500/20"
            },
            {
              icon: Activity,
              title: "Tecnologia a Serviço da Saúde",
              description: "Utilizamos inteligência artificial e ferramentas digitais para otimizar a triagem e o acompanhamento dos resultados.",
              color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            }
          ].map((value, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-slate-900/50 backdrop-blur-xl p-10 rounded-[3rem] border border-white/10 shadow-sm hover:shadow-xl transition-all space-y-6"
            >
              <div className={`w-16 h-16 ${value.color} rounded-2xl flex items-center justify-center shadow-lg border`}>
                <value.icon size={32} />
              </div>
              <h3 className="text-2xl font-black text-white tracking-tight">{value.title}</h3>
              <p className="text-slate-400 font-medium leading-relaxed">{value.description}</p>
            </motion.div>
          ))}
        </section>

        {/* Story Section */}
        <section className="bg-slate-900/50 backdrop-blur-xl rounded-[4rem] p-12 md:p-20 grid md:grid-cols-2 gap-12 items-center border border-white/10">
          <div className="space-y-8">
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter leading-tight">
              Por que escolher o FisioCareHub?
            </h2>
            <div className="space-y-6">
              {[
                "Atendimento especializado para idosos e pós-operatórios.",
                "Flexibilidade de horários que se adaptam à sua rotina.",
                "Acompanhamento digital da evolução do tratamento.",
                "Suporte técnico dedicado para auxiliar no uso da plataforma."
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="mt-1 w-6 h-6 bg-sky-600 rounded-full flex items-center justify-center text-white flex-shrink-0">
                    <Shield size={14} />
                  </div>
                  <p className="text-lg text-slate-300 font-bold">{item}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <img 
              src="https://picsum.photos/seed/physio-care/800/1000" 
              alt="Fisioterapia Domiciliar" 
              className="rounded-[3rem] shadow-2xl border border-white/10"
              referrerPolicy="no-referrer"
            />
            <div className="absolute -bottom-10 -left-10 bg-slate-900 p-8 rounded-3xl shadow-xl border border-white/10 hidden md:block">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-sky-600 rounded-2xl flex items-center justify-center text-white">
                  <Users size={24} />
                </div>
                <div>
                  <p className="text-2xl font-black text-white">+500</p>
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Famílias Atendidas</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
