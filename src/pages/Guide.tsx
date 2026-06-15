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
  PlayCircle,
  MessageSquare,
  TrendingUp,
  Video
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';

export default function Guide() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { profile } = useAuth();

  const isPatient = profile?.tipo_usuario === 'paciente';

  const physioSections = [
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

  const patientSections = [
    {
      title: "Como usar o FisioCareHub",
      icon: BookOpen,
      items: [
        "Você verá seus exercícios prescritos pelo fisioterapeuta",
        "Seu tratamento será acompanhado pelo profissional",
        "Você pode seguir seu plano de reabilitação em casa"
      ],
      color: "blue"
    },
    {
      title: "Como realizar seus exercícios",
      icon: PlayCircle,
      items: [
        { label: "Acesse sua rotina diária", icon: Calendar },
        { label: "Siga os vídeos ou instruções", icon: Video },
        { label: "Marque como concluído", icon: CheckCircle2 }
      ],
      color: "emerald"
    },
    {
      title: "Acompanhar sua evolução",
      icon: TrendingUp,
      items: [
        "Visualize seu progresso ao longo do tempo",
        "Veja orientações do fisioterapeuta"
      ],
      color: "sky"
    },
    {
      title: "Comunicação",
      icon: MessageSquare,
      items: [
        "Envie feedback sobre dores ou dúvidas",
        "Mantenha contato com o profissional"
      ],
      color: "rose"
    }
  ];

  const sections = isPatient ? patientSections : physioSections;
  const guideTitle = isPatient ? t('nav.patient_guide', 'Guia de Uso do Paciente') : t('nav.guide', 'Guia do FisioCareHub');
  const guideDesc = isPatient ? "Tudo o que você precisa para seguir sua reabilitação com sucesso." : "Tudo o que você precisa saber para masterizar a plataforma.";
  const ctaLabel = isPatient ? "Ver meus exercícios" : "Começar agora";
  const ctaPath = isPatient ? "/treinos" : "/patients?create=true";

  return (
    <div className="space-y-12 pb-12">
      {/* Header with CTA */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900/50 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/10 shadow-2xl">
        <div className="space-y-2">
          <h1 className="text-3xl font-black text-white tracking-tight uppercase">{guideTitle}</h1>
          <p className="text-slate-400 font-medium">{guideDesc}</p>
        </div>
        <button
          onClick={() => navigate(ctaPath)}
          className="flex items-center justify-center gap-3 px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-500 transition-all shadow-lg shadow-blue-900/40 group active:scale-95"
        >
          <span>{ctaLabel}</span>
          <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </header>

      {/* Main Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {sections.map((section, sIdx) => (
          <motion.section
            key={sIdx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: sIdx * 0.1 }}
            className={cn(
              "p-10 rounded-[3rem] border border-white/5 space-y-8",
              "bg-slate-900/30",
              section.isCards && "col-span-1 lg:col-span-2 relative overflow-hidden"
            )}
          >
            {section.isCards && <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 blur-[100px] -z-10" />}

            <div className="flex items-center gap-4">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center",
                section.color === 'blue' ? "bg-blue-500/10 text-blue-400" :
                section.color === 'emerald' ? "bg-emerald-500/10 text-emerald-400" :
                section.color === 'sky' ? "bg-sky-500/10 text-sky-400" :
                "bg-rose-500/10 text-rose-400"
              )}>
                <section.icon size={24} />
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight">{section.title}</h2>
            </div>
            
            {section.isCards ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {section.cards?.map((card, cIdx) => (
                  <div key={cIdx} className="glass-card !bg-white/5 p-8 rounded-[2rem] border border-white/10 hover:bg-white/10 transition-all flex flex-col md:flex-row gap-6 items-center md:items-start text-center md:text-left">
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
            ) : section.items[0] && typeof section.items[0] === 'string' ? (
              <ul className="space-y-6">
                {(section.items as string[]).map((item, idx) => (
                  <li key={idx} className="flex gap-4 group">
                    <div className={cn(
                      "mt-1 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center",
                      section.color === 'blue' ? "bg-blue-500/20 text-blue-400" :
                      section.color === 'emerald' ? "bg-emerald-500/20 text-emerald-400" :
                      section.color === 'sky' ? "bg-sky-500/20 text-sky-400" :
                      "bg-rose-500/20 text-rose-400"
                    )}>
                      <CheckCircle2 size={14} />
                    </div>
                    <p className="text-slate-300 font-medium leading-relaxed group-hover:text-white transition-colors">{item}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(section.items as any[]).map((item, idx) => (
                  <div 
                    key={idx} 
                    className={cn(
                      "p-5 bg-white/5 rounded-2xl border border-white/5 transition-all group",
                      section.color === 'emerald' ? "hover:border-emerald-500/30" : "hover:border-blue-500/30"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform",
                      section.color === 'emerald' ? "bg-emerald-500/10 text-emerald-400" : "bg-blue-500/10 text-blue-400"
                    )}>
                      <item.icon size={20} />
                    </div>
                    <p className="text-white font-black text-sm uppercase tracking-widest">{item.label}</p>
                  </div>
                ))}
              </div>
            )}
          </motion.section>
        ))}
      </div>
    </div>
  );
}

// Utility to combine class names
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
