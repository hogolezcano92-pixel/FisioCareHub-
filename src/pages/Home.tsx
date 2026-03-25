import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Activity, Stethoscope, UserCheck, BrainCircuit, ArrowRight, Shield, Heart, Zap, MessageCircle, FileText, Calendar as CalendarIcon, MessageSquare, Paperclip } from 'lucide-react';

export default function Home() {
  return (
    <div className="space-y-32 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-full text-sm font-bold mb-6">
              <Zap size={16} /> A Revolução na Fisioterapia
            </div>
            <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight text-slate-900 leading-tight">
              Cuidado que <span className="text-blue-600">conecta</span> e transforma.
            </h1>
            <p className="mt-6 text-xl text-slate-600 max-w-lg">
              O FisioCareHub é a ponte entre a excelência profissional e a recuperação do paciente. 
              Tecnologia de ponta para quem cuida e para quem é cuidado.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                to="/register"
                className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center gap-2"
              >
                Começar Agora <ArrowRight size={20} />
              </Link>
              <Link
                to="/login"
                className="px-8 py-4 bg-white text-slate-700 border-2 border-slate-200 rounded-2xl font-bold text-lg hover:border-blue-600 hover:text-blue-600 transition-all"
              >
                Entrar
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <div className="absolute -inset-4 bg-blue-100 rounded-[3rem] rotate-3 blur-2xl opacity-50"></div>
            <img
              src="https://images.unsplash.com/photo-1597452485669-2c7bb5fef90d?auto=format&fit=crop&q=80&w=1000"
              alt="Fisioterapeuta trabalhando com paciente"
              className="relative rounded-[2.5rem] shadow-2xl border-8 border-white object-cover aspect-video lg:aspect-square"
              referrerPolicy="no-referrer"
            />
            <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-3xl shadow-xl border border-slate-100 hidden md:block">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
                  <Heart size={24} />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">+10k Pacientes</div>
                  <div className="text-xs text-slate-500">Recuperados com sucesso</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-white rounded-[3rem] p-12 border border-slate-100 shadow-sm grid md:grid-cols-4 gap-8 text-center">
        {[
          { label: "Profissionais", value: "500+", icon: Stethoscope },
          { label: "Consultas/Mês", value: "15k", icon: Activity },
          { label: "Satisfação", value: "99%", icon: UserCheck },
          { label: "Segurança", value: "100%", icon: Shield },
        ].map((stat, i) => (
          <div key={i} className="space-y-2">
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mx-auto mb-2">
              <stat.icon size={20} />
            </div>
            <div className="text-3xl font-bold text-slate-900">{stat.value}</div>
            <div className="text-sm text-slate-500 font-medium uppercase tracking-wider">{stat.label}</div>
          </div>
        ))}
      </section>

      {/* Didactic Section */}
      <section className="grid lg:grid-cols-2 gap-20 items-center">
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="order-2 lg:order-1"
        >
          <img
            src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=1000"
            alt="Anatomia e Fisioterapia"
            className="rounded-[2.5rem] shadow-2xl"
            referrerPolicy="no-referrer"
          />
        </motion.div>
        <div className="order-1 lg:order-2 space-y-8">
          <h2 className="text-4xl font-bold text-slate-900">Por que escolher o FisioCareHub?</h2>
          <div className="space-y-6">
            {[
              {
                title: "Prontuário Inteligente",
                desc: "Acompanhe sua evolução com gráficos e dados precisos inseridos pelo seu fisioterapeuta.",
                icon: FileText
              },
              {
                title: "Triagem por IA",
                desc: "Nossa inteligência artificial ajuda a direcionar o melhor tratamento logo no primeiro contato.",
                icon: BrainCircuit
              },
              {
                title: "Suporte 24/7",
                desc: "Estamos sempre aqui para ajudar você e seu profissional em qualquer etapa do processo.",
                icon: MessageCircle
              }
            ].map((item, i) => (
              <div key={i} className="flex gap-6">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100">
                  <item.icon size={24} />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-slate-900 mb-1">{item.title}</h4>
                  <p className="text-slate-600">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="space-y-12">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-4xl font-bold text-slate-900 mb-4">Recursos Pensados para Você</h2>
          <p className="text-slate-500 text-lg">Tudo o que você precisa em um só lugar, de forma simples e intuitiva.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              title: "Agenda Integrada",
              desc: "Marque e gerencie suas sessões com poucos cliques, sem burocracia.",
              icon: CalendarIcon,
              color: "bg-blue-100 text-blue-600",
              img: "https://images.unsplash.com/photo-1506784365847-bbad939e9335?auto=format&fit=crop&q=80&w=400"
            },
            {
              title: "Chat em Tempo Real",
              desc: "Tire dúvidas diretamente com seu fisioterapeuta de forma segura.",
              icon: MessageSquare,
              color: "bg-indigo-100 text-indigo-600",
              img: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=400"
            },
            {
              title: "Gestão de Documentos",
              desc: "Upload de exames, fotos e vídeos para um diagnóstico mais preciso.",
              icon: Paperclip,
              color: "bg-emerald-100 text-emerald-600",
              img: "https://images.unsplash.com/photo-1586769852044-692d6e3703f0?auto=format&fit=crop&q=80&w=400"
            }
          ].map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl transition-all overflow-hidden"
            >
              <div className="h-48 overflow-hidden">
                <img 
                  src={feature.img} 
                  alt={feature.title} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="p-8">
                <div className={`w-14 h-14 ${feature.color} rounded-2xl flex items-center justify-center mb-6`}>
                  <feature.icon size={28} />
                </div>
                <h3 className="text-2xl font-bold mb-3">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-slate-900 rounded-[3rem] p-12 lg:p-20 text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600 blur-[120px] opacity-20"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600 blur-[120px] opacity-20"></div>
        
        <div className="relative z-10 max-w-3xl mx-auto">
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
            Pronto para transformar sua saúde?
          </h2>
          <p className="text-slate-400 text-xl mb-10">
            Junte-se a milhares de profissionais e pacientes que já estão usando o FisioCareHub.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 px-10 py-5 bg-white text-slate-900 rounded-2xl font-extrabold text-xl hover:bg-blue-50 transition-colors"
          >
            Criar minha conta gratuita
          </Link>
        </div>
      </section>
    </div>
  );
}
