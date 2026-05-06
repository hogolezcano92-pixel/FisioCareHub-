import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronRight, 
  Home, 
  ShieldCheck, 
  Heart, 
  Lock, 
  LineChart, 
  Rocket, 
  ArrowRight,
  CheckCircle2,
  TrendingUp,
  Activity,
  UserCheck
} from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, EffectFade } from 'swiper/modules';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';

interface OnboardingProps {
  onComplete: () => void;
}

const slides = [
  {
    title: "FisioCareHub",
    subtitle: "Boas-vindas",
    description: "O ecossistema inteligente que conecta fisioterapeutas de elite e pacientes que buscam reabilitação de alta performance.",
    icon: Home,
    color: "from-[#0f172a] to-[#1e293b]",
    image: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=1200",
    theme: "dark"
  },
  {
    title: "Gestão Profissional de Elite",
    subtitle: "Para Fisioterapeutas",
    items: ["Organização de agenda", "Automatização de faturamento", "Posicionamento premium"],
    icon: UserCheck,
    color: "from-[#0f172a] to-[#2dd4bf]",
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=1200",
  },
  {
    title: "Reabilitação com Propósito",
    subtitle: "Para Pacientes",
    items: ["Atendimento humanizado", "Visualização de progresso", "Histórico seguro"],
    icon: Heart,
    color: "from-[#2dd4bf] to-[#0f172a]",
    image: "https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&q=80&w=1200",
  },
  {
    title: "Tecnologia & Segurança",
    subtitle: "Destaque",
    description: "Segurança SHA-256 (Prontuários Invioláveis) e Ecossistema (Agendamento + Marketplace + Gestão Financeira).",
    icon: Lock,
    displayItems: [
      { label: "Criptografia SHA-256", icon: ShieldCheck },
      { label: "Ecossistema Integrado", icon: Activity }
    ],
    color: "from-slate-800 to-[#0f172a]",
    image: "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&q=80&w=1200",
  },
  {
    title: "Métricas Avançadas",
    subtitle: "Visual",
    description: "O app gera gráficos de evolução detalhados do \"Início\" até a \"Alta Clínica\", garantindo transparência total.",
    icon: LineChart,
    color: "from-blue-600 to-[#2dd4bf]",
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=1200",
  },
  {
    title: "Missão & Resultados",
    subtitle: "Transformação",
    stats: [
      { label: "Satisfação", value: "94%" },
      { label: "Produtividade", value: "+40%" }
    ],
    description: "Democratizar o acesso à fisioterapia especializada, transformando o lar no melhor ambiente de cura.",
    icon: Rocket,
    color: "from-[#2dd4bf] to-[#0f172a]",
    image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=1200",
  }
];

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const swiperRef = useRef<any>(null);

  const handleNext = () => {
    if (activeIndex === slides.length - 1) {
      onComplete();
    } else {
      swiperRef.current?.slideNext();
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-[#0f172a] flex flex-col font-sans">
      <Swiper
        modules={[Pagination, EffectFade]}
        effect="fade"
        pagination={{ clickable: true }}
        onSlideChange={(swiper) => setActiveIndex(swiper.activeIndex)}
        onSwiper={(swiper) => (swiperRef.current = swiper)}
        className="w-full h-full"
      >
        {slides.map((slide, index) => (
          <SwiperSlide key={index}>
            <div className="relative w-full h-full flex flex-col">
              {/* Background Image */}
              <div className="absolute inset-0 z-0">
                <img 
                  src={slide.image} 
                  alt="" 
                  className="w-full h-full object-cover opacity-30 mix-blend-overlay"
                  referrerPolicy="no-referrer"
                />
                <div className={`absolute inset-0 bg-gradient-to-b from-transparent via-[#0f172a]/50 to-[#0f172a]`} />
              </div>

              {/* Content Container */}
              <div className="relative z-10 flex-1 flex flex-col justify-center px-8 sm:px-12 pt-20">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeIndex}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.5 }}
                    className="max-w-xl"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 rounded-2xl bg-[#2dd4bf]/20 text-[#2dd4bf] border border-[#2dd4bf]/30">
                        <slide.icon size={28} />
                      </div>
                      <span className="text-[#2dd4bf] font-black uppercase tracking-[0.3em] text-[10px]">
                        {slide.subtitle}
                      </span>
                    </div>

                    <h1 className="text-4xl sm:text-5xl font-black text-white leading-[1.1] mb-6 tracking-tight">
                      {slide.title}
                    </h1>

                    {slide.description && (
                      <p className="text-lg sm:text-xl text-slate-300 leading-relaxed font-medium mb-8">
                        {slide.description}
                      </p>
                    )}

                    {slide.items && (
                      <div className="grid gap-4 mb-8">
                        {slide.items.map((item, i) => (
                          <div key={i} className="flex items-center gap-3 backdrop-blur-sm bg-white/5 p-4 rounded-xl border border-white/10">
                            <CheckCircle2 className="text-[#2dd4bf]" size={20} />
                            <span className="text-white font-bold">{item}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {slide.displayItems && (
                      <div className="grid grid-cols-2 gap-4 mb-8">
                        {slide.displayItems.map((item, i) => (
                          <div key={i} className="flex flex-col gap-3 backdrop-blur-sm bg-white/5 p-4 rounded-xl border border-white/10 text-center items-center">
                            <item.icon className="text-[#2dd4bf]" size={24} />
                            <span className="text-white font-bold text-sm leading-tight">{item.label}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {slide.stats && (
                      <div className="grid grid-cols-2 gap-4 mb-8">
                        {slide.stats.map((stat, i) => (
                          <div key={i} className="flex flex-col gap-1 backdrop-blur-sm bg-white/5 p-4 rounded-xl border border-white/10">
                            <span className="text-3xl font-black text-[#2dd4bf]">{stat.value}</span>
                            <span className="text-slate-400 text-xs font-black uppercase tracking-widest">{stat.label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Floating Controls */}
      <div className="absolute bottom-10 left-0 right-0 z-20 px-8 flex items-center justify-between pointer-events-none">
        <button 
          onClick={onComplete}
          className="pointer-events-auto text-slate-500 font-black uppercase tracking-[0.2em] text-[10px] hover:text-white transition-colors"
        >
          Pular
        </button>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleNext}
          className="pointer-events-auto flex items-center gap-3 px-8 py-5 bg-[#2dd4bf] text-[#0f172a] rounded-2xl font-black text-lg shadow-2xl hover:bg-white transition-all group"
        >
          {activeIndex === slides.length - 1 ? "Começar" : "Próximo"}
          {activeIndex === slides.length - 1 ? <Rocket size={24} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" /> : <ChevronRight size={24} className="group-hover:translate-x-1 transition-transform" />}
        </motion.button>
      </div>

      {/* Pagination Style Overrides */}
      <style>{`
        .swiper-pagination-bullet {
          background: #2dd4bf !important;
          opacity: 0.2;
          width: 8px;
          height: 8px;
          transition: all 0.3s ease;
        }
        .swiper-pagination-bullet-active {
          opacity: 1;
          width: 24px;
          border-radius: 4px;
        }
        .swiper-pagination {
          bottom: 120px !important;
          text-align: left !important;
          padding-left: 32px !important;
        }
      `}</style>
    </div>
  );
}
