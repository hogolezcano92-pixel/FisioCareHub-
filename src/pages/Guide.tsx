import React from 'react';
import { motion } from 'framer-motion';
import { 
  BookOpen, 
  CheckCircle2, 
  ArrowRight, 
  LayoutDashboard, 
  Users, 
  Calendar, 
  FileText, 
  Activity,
  PlayCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function Guide() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const sections = [
    {
      title: "Como funciona o FisioCareHub",
      icon: BookOpen,
      items: [
        "Plataforma completa para gestão de fisioterapia domiciliar",
        "Organização simplificada de atendimentos e agenda",
        "Acompanhamento detalhado da evolução de cada paciente através de inteligência de dados"
      ],
      color: "blue"
    },
    {
      title: "Primeiros passos",
      icon: PlayCircle,
      items: [
        { label: "Criar paciente", icon: Users },
        { label: "Agendar atendimento", icon: Calendar },
        { label: "Registrar evolução", icon: FileText },
        { label: "Enviar exercícios", icon: Activity }
      ],
      color: "emerald"
    },
    {
      title: "Introdução rápida",
      icon: CheckCircle2,
      isCards: true,
      cards: [
        {
          title: "Sessões Domiciliares",
          desc: "Toda a documentação necessária na palma da sua mão.",
          icon: LayoutDashboard
        },
        {
          title: "Engajamento do Paciente",
          desc: "Envie planos de exercícios e receba feedbacks em tempo real.",
          icon: Activity
        }
      ],
      color: "sky"
    }
  ];

  return (
    <div className="space-y-12 pb-12">
      {/* Header with CTA */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900/50 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/10 shadow-2xl">
        <div className="space-y-2">
          <h1 className="text-3xl font-black text-white tracking-tight uppercase">Guia do FisioCareHub</h1>
          <p className="text-slate-400 font-medium">Tudo o que você precisa saber para masterizar a plataforma.</p>
        </div>
        <button
          onClick={() => navigate('/patients?create=true')}
          className="flex items-center justify-center gap-3 px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-500 transition-all shadow-lg shadow-blue-900/40 group active:scale-95"
        >
          <span>Começar agora</span>
          <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </header>

      {/* Main Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Section: Como Funciona */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900/30 p-10 rounded-[3rem] border border-white/5 space-y-8"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center">
              <BookOpen size={24} />
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">Como funciona o FisioCareHub</h2>
          </div>
          
          <ul className="space-y-6">
            {sections[0].items.map((item, idx) => (
              <li key={idx} className="flex gap-4 group">
                <div className="mt-1 flex-shrink-0 w-6 h-6 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center">
                  <CheckCircle2 size={14} />
                </div>
                <p className="text-slate-300 font-medium leading-relaxed group-hover:text-white transition-colors">{item as string}</p>
              </li>
            ))}
          </ul>
        </motion.section>

        {/* Section: Primeiros Passos */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-900/30 p-10 rounded-[3rem] border border-white/5 space-y-8"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center">
              <PlayCircle size={24} />
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">Primeiros passos</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(sections[1].items as any[]).map((item, idx) => (
              <div 
                key={idx} 
                className="p-5 bg-white/5 rounded-2xl border border-white/5 hover:border-emerald-500/30 transition-all group"
              >
                <div className="w-10 h-10 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <item.icon size={20} />
                </div>
                <p className="text-white font-black text-sm uppercase tracking-widest">{item.label}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Section: Introdução Rápida */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="col-span-1 lg:col-span-2 bg-slate-950 p-10 rounded-[3rem] border border-white/10 space-y-8 relative overflow-hidden"
        >
          {/* Background Decoration */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 blur-[100px] -z-10" />
          
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-sky-500/10 text-sky-400 rounded-2xl flex items-center justify-center">
              <CheckCircle2 size={24} />
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">Introdução rápida</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sections[2].cards?.map((card, idx) => (
              <div key={idx} className="glass-card !bg-white/5 p-8 rounded-[2rem] border border-white/10 hover:bg-white/10 transition-all flex flex-col md:flex-row gap-6 items-center md:items-start text-center md:text-left">
                <div className="w-16 h-16 bg-sky-500/10 text-sky-400 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <card.icon size={32} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-white">{card.title}</h3>
                  <p className="text-slate-400 font-medium leading-relaxed">{card.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.section>
      </div>
    </div>
  );
}
