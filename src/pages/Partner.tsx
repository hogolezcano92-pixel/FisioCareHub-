import { motion } from 'motion/react';
import { Shield, TrendingUp, Users, Sparkles, Check, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Partner() {
  return (
    <div className="min-h-screen bg-white pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 space-y-20">
        {/* Hero Section */}
        <section className="text-center space-y-8 max-w-4xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-full text-sm font-black uppercase tracking-widest"
          >
            <Sparkles size={16} />
            Seja um Parceiro
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter leading-tight"
          >
            Leve sua <span className="text-emerald-600">Carreira</span> para o Próximo Nível
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-slate-500 font-medium leading-relaxed"
          >
            O FisioCareHub é a plataforma ideal para fisioterapeutas que desejam expandir sua agenda, gerenciar atendimentos domiciliares com facilidade e oferecer um cuidado de excelência.
          </motion.p>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link 
              to="/register" 
              className="px-10 py-5 bg-emerald-600 text-white rounded-full font-black text-lg hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 flex items-center gap-2"
            >
              Cadastrar Agora <ArrowRight size={20} />
            </Link>
          </motion.div>
        </section>

        {/* Benefits Grid */}
        <section className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: TrendingUp,
              title: "Aumente sua Renda",
              description: "Tenha acesso a uma base constante de pacientes em sua região, sem custos fixos de consultório.",
              color: "bg-emerald-50 text-emerald-600"
            },
            {
              icon: Users,
              title: "Gestão Simplificada",
              description: "Agenda digital, prontuários eletrônicos e triagem inteligente para otimizar seu tempo.",
              color: "bg-sky-50 text-sky-600"
            },
            {
              icon: Shield,
              title: "Selo de Verificado",
              description: "Ganhe destaque e credibilidade com nosso selo de verificação após a análise de currículo.",
              color: "bg-indigo-50 text-indigo-600"
            }
          ].map((benefit, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all space-y-6"
            >
              <div className={`w-16 h-16 ${benefit.color} rounded-2xl flex items-center justify-center shadow-lg`}>
                <benefit.icon size={32} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">{benefit.title}</h3>
              <p className="text-slate-500 font-medium leading-relaxed">{benefit.description}</p>
            </motion.div>
          ))}
        </section>

        {/* Requirements Section */}
        <section className="bg-slate-900 rounded-[4rem] p-12 md:p-20 text-white grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <h2 className="text-3xl md:text-5xl font-black tracking-tighter leading-tight">
              O que você precisa para começar?
            </h2>
            <div className="space-y-6">
              {[
                "Formação superior em Fisioterapia.",
                "Registro ativo no CREFITO.",
                "Experiência em atendimento domiciliar (desejável).",
                "Comprometimento com o cuidado humanizado.",
                "Equipamentos básicos para atendimento em casa."
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white flex-shrink-0">
                    <Check size={14} />
                  </div>
                  <p className="text-lg font-bold text-slate-300">{item}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-md p-10 rounded-[3rem] border border-white/10 space-y-8">
            <h3 className="text-2xl font-black">Como funciona o processo?</h3>
            <div className="space-y-6">
              {[
                { step: "01", title: "Cadastro", desc: "Preencha seus dados e envie seus documentos." },
                { step: "02", title: "Análise", desc: "Nossa equipe revisa seu perfil em até 48h." },
                { step: "03", title: "Ativação", desc: "Seu perfil fica visível para centenas de pacientes." },
                { step: "04", title: "Atendimento", desc: "Receba solicitações e comece a atender." }
              ].map((item, i) => (
                <div key={i} className="flex gap-6">
                  <span className="text-emerald-500 font-black text-2xl">{item.step}</span>
                  <div>
                    <h4 className="text-xl font-black">{item.title}</h4>
                    <p className="text-slate-400 font-medium">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
