import { motion } from 'motion/react';
import { Activity, Heart, Shield, Users, Sparkles } from 'lucide-react';

export default function About() {
  return (
    <div className="min-h-screen bg-white pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 space-y-20">
        {/* Hero Section */}
        <section className="text-center space-y-8 max-w-4xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-sky-50 text-sky-600 rounded-full text-sm font-black uppercase tracking-widest"
          >
            <Sparkles size={16} />
            Nossa Missão
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter leading-tight"
          >
            Transformando a Fisioterapia no <span className="text-sky-600">Conforto do seu Lar</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-slate-500 font-medium leading-relaxed"
          >
            O FisioCareHub nasceu da necessidade de conectar pacientes que buscam reabilitação de qualidade com profissionais capacitados, eliminando as barreiras de deslocamento e garantindo um atendimento humanizado.
          </motion.p>
        </section>

        {/* Values Grid */}
        <section className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: Heart,
              title: "Cuidado Humanizado",
              description: "Priorizamos o bem-estar e a dignidade de cada paciente, adaptando o tratamento às suas necessidades individuais.",
              color: "bg-rose-50 text-rose-600"
            },
            {
              icon: Shield,
              title: "Segurança e Confiança",
              description: "Todos os nossos profissionais passam por um rigoroso processo de verificação para garantir sua total tranquilidade.",
              color: "bg-sky-50 text-sky-600"
            },
            {
              icon: Activity,
              title: "Tecnologia a Serviço da Saúde",
              description: "Utilizamos inteligência artificial e ferramentas digitais para otimizar a triagem e o acompanhamento dos resultados.",
              color: "bg-emerald-50 text-emerald-600"
            }
          ].map((value, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all space-y-6"
            >
              <div className={`w-16 h-16 ${value.color} rounded-2xl flex items-center justify-center shadow-lg`}>
                <value.icon size={32} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">{value.title}</h3>
              <p className="text-slate-500 font-medium leading-relaxed">{value.description}</p>
            </motion.div>
          ))}
        </section>

        {/* Story Section */}
        <section className="bg-sky-50 rounded-[4rem] p-12 md:p-20 grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter leading-tight">
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
                  <p className="text-lg text-slate-700 font-bold">{item}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <img 
              src="https://picsum.photos/seed/physio-care/800/1000" 
              alt="Fisioterapia Domiciliar" 
              className="rounded-[3rem] shadow-2xl"
              referrerPolicy="no-referrer"
            />
            <div className="absolute -bottom-10 -left-10 bg-white p-8 rounded-3xl shadow-xl border border-sky-100 hidden md:block">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-sky-600 rounded-2xl flex items-center justify-center text-white">
                  <Users size={24} />
                </div>
                <div>
                  <p className="text-2xl font-black text-slate-900">+500</p>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Famílias Atendidas</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
