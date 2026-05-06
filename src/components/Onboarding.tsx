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
    subtitle: "Ecossistema Inteligente",
    description: "A plataforma de elite que conecta fisioterapeutas referenciados e pacientes que buscam reabilitação de alta performance.",
    icon: Home,
    color: "from-[#0f172a] via-[#1e1b4b] to-[#0f172a]",
    image: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=1200",
  },
  {
    title: "Gestão Profissional de Elite",
    subtitle: "Fisioterapia Home Care",
    items: ["Organização de agenda inteligente", "Automatização de faturamento", "Posicionamento Premium"],
    icon: UserCheck,
    color: "from-[#0f172a] via-[#312e81] to-[#0f172a]",
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=1200",
  },
  {
    title: "Reabilitação com Propósito",
    subtitle: "Cuidado Humanizado",
    items: ["Atendimento focado no Paciente", "Visualização real de progresso", "Histórico clínico unificado"],
    icon: Heart,
    color: "from-[#0f172a] via-[#4c1d95] to-[#0f172a]",
    image: "https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&q=80&w=1200",
  },
  {
    title: "Tecnologia Inviolável",
    subtitle: "Segurança de Dados",
    description: "Criptografia SHA-256 e LGPD Compliance. Seus prontuários e dados financeiros protegidos com rigor militar.",
    icon: Lock,
    displayItems: [
      { label: "SHA-256 Progressivo", icon: ShieldCheck },
      { label: "Backup em Nuvem Realtime", icon: Activity }
    ],
    color: "from-[#0f172a] via-[#1e1b4b] to-[#0f172a]",
    image: "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&q=80&w=1200",
  },
  {
    title: "Métricas de Evolução",
    subtitle: "Data-Driven Recovery",
    description: "Gráficos inteligentes acompanham a jornada do paciente desde a triagem inicial até a alta clínica definitiva.",
    icon: LineChart,
    color: "from-[#0f172a] via-[#312e81] to-[#0f172a]",
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=1200",
  },
  {
    title: "Resultados Comprovados",
    subtitle: "Missão FisioCare",
    stats: [
      { label: "Satisfação", value: "94%" },
      { label: "Produtividade", value: "+40%" }
    ],
    description: "Democratizando o acesso à fisioterapia especializada, transformando cada lar no ambiente ideal de cura.",
    icon: Rocket,
    color: "from-[#0f172a] via-[#4c1d95] to-[#0f172a]",
    image: "https://images.unsplash.com/photo-1581578731548-c64695ce6952?auto=format&fit=crop&q=80&w=1200",
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
    <div className="fixed inset-0 z-[9999] bg-[#0f172a] flex flex-col font-sans overflow-hidden">
      <Swiper
        modules={[Pagination, EffectFade]}
        effect="fade"
        fadeEffect={{ crossFade: true }}
        pagination={{ clickable: true }}
        onSlideChange={(swiper) => setActiveIndex(swiper.activeIndex)}
        onSwiper={(swiper) => (swiperRef.current = swiper)}
        className="w-full h-full"
      >
        {slides.map((slide, index) => (
          <SwiperSlide key={`slide-${index}`} className="bg-[#0f172a]">
            {/* Isolated Slide Container */}
            <div className="relative w-full h-full flex flex-col overflow-hidden">
              
              {/* Background Layer - Isolated per Slide */}
              <div className="absolute inset-0 z-0">
                <motion.img 
                  key={`bg-${index}`}
                  initial={{ opacity: 0, scale: 1.1 }}
                  animate={{ opacity: 0.15, scale: 1 }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  src={slide.image} 
                  alt="" 
                  className="w-full h-full object-cover blur-2xl scale-110"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-[#0f172a]/70 via-[#0f172a]/90 to-[#0f172a]" />
              </div>

              {/* Content Container */}
              <div className="relative z-10 flex-1 flex flex-col justify-center px-8 sm:px-12 pt-16">
                <div className="max-w-xl">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="flex items-center gap-3 mb-6"
                  >
                    <div className="p-3 rounded-2xl bg-[#2dd4bf]/10 text-[#2dd4bf] border border-[#2dd4bf]/20 shadow-lg">
                      <slide.icon size={26} />
                    </div>
                    <span className="text-[#2dd4bf] font-bold uppercase tracking-[0.25em] text-[10px]">
                      {slide.subtitle}
                    </span>
                  </motion.div>

                  <motion.h1 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="text-4xl sm:text-5xl font-black text-white leading-[1.1] mb-6 tracking-tight"
                  >
                    {slide.title}
                  </motion.h1>

                  {slide.description && (
                    <motion.p 
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.3 }}
                      className="text-lg text-slate-300 leading-relaxed font-medium mb-10 max-w-md"
                    >
                      {slide.description}
                    </motion.p>
                  )}

                  {slide.items && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.4 }}
                      className="grid gap-3 mb-10"
                    >
                      {slide.items.map((item, i) => (
                        <div key={i} className="flex items-center gap-3 bg-white/5 p-4 rounded-xl border border-white/10 backdrop-blur-md">
                          <CheckCircle2 className="text-[#2dd4bf]" size={18} />
                          <span className="text-white text-sm font-semibold">{item}</span>
                        </div>
                      ))}
                    </motion.div>
                  )}

                  {slide.displayItems && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.4 }}
                      className="grid grid-cols-2 gap-4 mb-10"
                    >
                      {slide.displayItems.map((item, i) => (
                        <div key={i} className="flex flex-col gap-3 bg-white/5 p-5 rounded-2xl border border-white/10 text-center items-center backdrop-blur-md">
                          <item.icon className="text-[#2dd4bf]" size={24} />
                          <span className="text-white font-bold text-xs leading-tight">{item.label}</span>
                        </div>
                      ))}
                    </motion.div>
                  )}

                  {slide.stats && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.4 }}
                      className="grid grid-cols-2 gap-4 mb-10"
                    >
                      {slide.stats.map((stat, i) => (
                        <div key={i} className="flex flex-col gap-1 bg-white/5 p-5 rounded-2xl border border-white/10 backdrop-blur-md">
                          <span className="text-3xl font-black text-[#2dd4bf]">{stat.value}</span>
                          <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{stat.label}</span>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Floating Controls */}
      <div className="absolute bottom-8 left-0 right-0 z-50 px-8 flex items-center justify-between pointer-events-none">
        <button 
          onClick={onComplete}
          className="pointer-events-auto text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] hover:text-white transition-colors p-4"
        >
          Pular
        </button>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleNext}
          className="pointer-events-auto flex items-center gap-4 px-10 py-5 bg-[#2dd4bf] text-[#0f172a] rounded-2xl font-black text-lg shadow-[0_20px_50px_rgba(45,212,191,0.3)] hover:scale-105 hover:bg-white transition-all group"
        >
          {activeIndex === slides.length - 1 ? "Começar" : "Próximo"}
          {activeIndex === slides.length - 1 ? (
            <Rocket size={22} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          ) : (
            <ChevronRight size={22} className="group-hover:translate-x-1 transition-transform" />
          )}
        </motion.button>
      </div>

      <style>{`
        .swiper-pagination-bullet {
          background: #2dd4bf !important;
          opacity: 0.1;
          width: 6px;
          height: 6px;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .swiper-pagination-bullet-active {
          opacity: 1;
          width: 32px;
          border-radius: 4px;
        }
        .swiper-pagination {
          bottom: 110px !important;
          text-align: left !important;
          padding-left: 32px !important;
        }
        .swiper-slide {
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}
