import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronRight, 
  Home, 
  ShieldCheck, 
  Heart, 
  Lock, 
  LineChart, 
  Rocket, 
  CheckCircle2,
  Activity,
  UserCheck,
  Stethoscope,
  Users,
  BrainCircuit,
  ArrowRight,
  Sparkles,
  ClipboardCheck
} from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, EffectFade } from 'swiper/modules';
import { cn } from '../lib/utils';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';

interface OnboardingProps {
  onComplete: () => void;
}

type UserType = 'paciente' | 'fisioterapeuta' | null;

const commonSlides = [
  {
    title: "Bem-vindo ao FisioCareHub",
    subtitle: "Ecossistema Inteligente",
    description: "Tecnologia que conecta recuperação e cuidado. A plataforma de elite para fisioterapia moderna e eficiente.",
    icon: Home,
    image: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=1200",
  },
  {
    title: "Cuidado Personalizado",
    subtitle: "Inovação",
    description: "Transformamos a jornada de recuperação através de inteligência artificial e acompanhamento humano especializado.",
    icon: BrainCircuit,
    image: "https://images.unsplash.com/photo-1581578731548-c64695ce6952?auto=format&fit=crop&q=80&w=1200",
  },
];

const patientSlides = [
  {
    title: "Recupere seu Movimento",
    subtitle: "Sou Paciente",
    description: "Exercícios guiados para sua evolução. Acesse seu plano de tratamento personalizado em qualquer lugar.",
    icon: Activity,
    image: "https://images.unsplash.com/photo-1544027993-37dbfe43562a?auto=format&fit=crop&q=80&w=1200",
  },
  {
    title: "Acompanhe seu Progresso",
    subtitle: "Sou Paciente",
    description: "Veja sua melhora dia após dia com gráficos de evolução e feedback contínuo do seu fisioterapeuta.",
    icon: LineChart,
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=1200",
  },
  {
    title: "Conecte-se Rapidamente",
    subtitle: "Sou Paciente",
    description: "Comunicação direta com seu profissional. Tire dúvidas e receba orientações em tempo real.",
    icon: Heart,
    image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=1200",
  }
];

const physioSlides = [
  {
    title: "Gerencie seus Pacientes",
    subtitle: "Sou Fisioterapeuta",
    description: "Organização simples e eficiente de prontuários, agendas e históricos de atendimento.",
    icon: UserCheck,
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=1200",
  },
  {
    title: "Prescreva com Facilidade",
    subtitle: "Sou Fisioterapeuta",
    description: "Crie planos de exercícios personalizados e envie diretamente para o celular do seu paciente.",
    icon: ClipboardCheck,
    image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=1200",
  },
  {
    title: "Acompanhe Resultados",
    subtitle: "Sou Fisioterapeuta",
    description: "Evolução dos pacientes em tempo real. Analise dados de aderência e melhora clínica com precisão.",
    icon: Sparkles,
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=1200",
  }
];

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [userType, setUserType] = useState<UserType>(() => {
    const saved = localStorage.getItem('onboarding_user_type');
    return saved as UserType;
  });
  const swiperRef = useRef<any>(null);

  const allSlides = [
    ...commonSlides,
    { type: 'decision' }, // Decision slide at index 2
    ...(userType === 'paciente' ? patientSlides : (userType === 'fisioterapeuta' ? physioSlides : [])),
  ];

  const handleNext = () => {
    // If we are at the decision slide and no type is selected, we can't move forward
    if (activeIndex === 2 && !userType) return;

    if (activeIndex === allSlides.length - 1) {
      localStorage.setItem('onboarding_completed', 'true');
      onComplete();
    } else {
      swiperRef.current?.slideNext();
    }
  };

  const handleSelectType = (type: UserType) => {
    setUserType(type);
    if (type) {
      localStorage.setItem('onboarding_user_type', type);
      // Brief delay for tactile feedback
      setTimeout(() => {
        swiperRef.current?.slideNext();
      }, 500);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-[#0f172a] flex flex-col font-sans overflow-hidden">
      <Swiper
        modules={[Pagination, EffectFade]}
        effect="fade"
        fadeEffect={{ crossFade: true }}
        pagination={{ 
          clickable: activeIndex !== 2,
          dynamicBullets: true
        }}
        onSlideChange={(swiper) => setActiveIndex(swiper.activeIndex)}
        onSwiper={(swiper) => (swiperRef.current = swiper)}
        className="w-full h-full"
        allowTouchMove={activeIndex !== 2}
      >
        {allSlides.map((slide: any, index) => (
          <SwiperSlide key={`slide-${index}-${userType || 'initial'}`} className="bg-[#0f172a]">
            {slide.type === 'decision' ? (
              <DecisionSlide onSelect={handleSelectType} selectedType={userType} />
            ) : (
              <ContentSlide slide={slide} />
            )}
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Floating Controls */}
      <div className="absolute bottom-8 left-0 right-0 z-[100] px-8 flex items-center justify-between pointer-events-none">
        <AnimatePresence>
          {activeIndex !== 2 && (
            <motion.button 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onComplete}
              className="pointer-events-auto text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] hover:text-white transition-colors p-4"
            >
              Pular
            </motion.button>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {(activeIndex !== 2 || userType) && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleNext}
              className={cn(
                "pointer-events-auto flex items-center gap-4 px-10 py-5 rounded-2xl font-black text-lg transition-all group shadow-2xl",
                userType === 'paciente' 
                  ? "bg-[#2dd4bf] text-[#0f172a] shadow-[#2dd4bf]/20" 
                  : "bg-blue-500 text-white shadow-blue-500/20"
              )}
            >
              {activeIndex === allSlides.length - 1 ? "Começar" : "Próximo"}
              {activeIndex === allSlides.length - 1 ? (
                <Rocket size={22} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              ) : (
                <ChevronRight size={22} className="group-hover:translate-x-1 transition-transform" />
              )}
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <style>{`
        .swiper-pagination-bullet {
          background: #2dd4bf !important;
          opacity: 0.15;
          width: 8px;
          height: 8px;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .swiper-pagination-bullet-active {
          opacity: 1;
          width: 36px;
          border-radius: 6px;
        }
        .swiper-pagination {
          bottom: 115px !important;
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

function ContentSlide({ slide }: { slide: any }) {
  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <motion.img 
          initial={{ opacity: 0, scale: 1.2, filter: 'blur(30px)' }}
          animate={{ opacity: 0.35, scale: 1, filter: 'blur(15px)' }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          src={slide.image} 
          alt="" 
          className="w-full h-full object-cover scale-110"
          referrerPolicy="no-referrer"
        />
        <div className={cn("absolute inset-0 bg-gradient-to-b from-slate-900/40 via-slate-950/80 to-slate-950")} />
      </div>

      {/* Content Container */}
      <div className="relative z-10 flex-1 flex flex-col justify-center px-4 sm:px-12 pt-16">
        <div className="max-w-xl">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
            className="flex items-center gap-3 mb-6 sm:mb-8"
          >
            <div className="p-3 sm:p-4 rounded-3xl bg-[#2dd4bf]/20 text-[#2dd4bf] border border-[#2dd4bf]/20 shadow-2xl backdrop-blur-xl">
              <slide.icon size={24} className="sm:w-7 sm:h-7" />
            </div>
            <div className="flex flex-col">
              <span className="text-[#2dd4bf] font-black uppercase tracking-[0.35em] text-[9px] sm:text-[10px]">
                {slide.subtitle}
              </span>
              <div className="h-0.5 w-6 sm:w-8 bg-[#2dd4bf]/30 mt-1 rounded-full" />
            </div>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="text-3xl sm:text-7xl font-black text-white leading-[1.1] sm:leading-[1] mb-6 sm:mb-8 tracking-tighter"
          >
            {slide.title}
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            className="text-base sm:text-xl text-slate-300 leading-relaxed font-medium mb-8 sm:mb-12 max-w-md border-l-2 border-[#2dd4bf]/20 pl-4 sm:pl-6"
          >
            {slide.description}
          </motion.p>
        </div>
      </div>
    </div>
  );
}

function DecisionSlide({ onSelect, selectedType }: { onSelect: (type: UserType) => void, selectedType: UserType }) {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center px-4 sm:px-8 bg-[#0f172a] overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(45,212,191,0.08)_0%,transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_70%,rgba(59,130,246,0.08)_0%,transparent_50%)]" />
      
      <div className="relative z-10 w-full max-w-lg">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10 sm:mb-16"
        >
          <div className="inline-flex items-center justify-center p-4 sm:p-5 rounded-3xl bg-white/5 border border-white/10 mb-6 sm:mb-8 shadow-2xl backdrop-blur-xl">
            <Users size={32} className="text-[#2dd4bf] sm:w-10 sm:h-10" />
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white mb-4 sm:mb-6 tracking-tighter leading-tight">Como você quer usar o FisioCareHub?</h2>
          <p className="text-slate-400 text-base sm:text-lg font-medium max-w-sm mx-auto">Escolha o seu perfil para personalizarmos sua jornada.</p>
        </motion.div>

        <div className="grid gap-4 sm:gap-6 w-full">
          {[
            { 
              id: 'paciente', 
              label: 'Sou Paciente', 
              desc: 'Recupere seus movimentos e encontre fisioterapeutas para te acompanhar.', 
              badge: 'Encontre profissionais',
              icon: Heart,
              color: 'emerald',
            },
            { 
              id: 'fisioterapeuta', 
              label: 'Sou Fisioterapeuta', 
              desc: 'Gerencie seus pacientes e atraia novos atendimentos pelo app.', 
              badge: 'Capte pacientes',
              icon: Stethoscope,
              color: 'blue',
            }
          ].map((option) => (
            <motion.button
              key={option.id}
              initial={false}
              animate={selectedType === option.id ? { scale: 1 } : { scale: 0.98 }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => onSelect(option.id as UserType)}
              className={cn(
                "group relative w-full p-5 sm:p-8 bg-white/[0.03] border-2 rounded-[2rem] sm:rounded-[2.5rem] transition-all text-left flex items-center gap-4 sm:gap-8 overflow-hidden backdrop-blur-sm",
                selectedType === option.id 
                  ? "border-[#2dd4bf] bg-white/[0.08] shadow-[0_20px_60px_-15px_rgba(45,212,191,0.15)]" 
                  : "border-white/5 hover:border-white/20 hover:bg-white/[0.05]"
              )}
            >
              {/* Highlight Badge */}
              <div className={cn(
                "absolute top-4 right-4 sm:top-6 sm:right-8 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all duration-300",
                selectedType === option.id 
                  ? "bg-[#2dd4bf] text-[#0f172a] border-[#2dd4bf]" 
                  : "bg-white/5 text-slate-500 border-white/5 group-hover:border-[#2dd4bf]/30 group-hover:text-[#2dd4bf]"
              )}>
                {option.badge}
              </div>

              <div className={cn(
                "w-14 h-14 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl flex items-center justify-center transition-all duration-500 shrink-0",
                selectedType === option.id 
                  ? "bg-[#2dd4bf] text-[#0f172a] shadow-lg rotate-6 sm:rotate-12" 
                  : "bg-white/5 text-slate-400 group-hover:bg-[#2dd4bf] group-hover:text-[#0f172a] group-hover:scale-105"
              )}>
                <option.icon className="w-7 h-7 sm:w-9 sm:h-9" />
              </div>
              
              <div className="flex-1 min-w-0 pr-12 sm:pr-0">
                <span className={cn(
                  "block text-xl sm:text-2xl font-black mb-1",
                  selectedType === option.id ? "text-white" : "text-slate-300 group-hover:text-white"
                )}>
                  {option.label}
                </span>
                <span className={cn(
                  "block text-[11px] sm:text-sm font-medium leading-relaxed transition-colors",
                  selectedType === option.id ? "text-slate-300" : "text-slate-500 group-hover:text-slate-400"
                )}>
                  {option.desc}
                </span>
              </div>

              <div className={cn(
                "w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all duration-500 bg-white/5 shrink-0 sm:absolute sm:right-8 sm:top-1/2 sm:-translate-y-1/2",
                selectedType === option.id ? "bg-[#2dd4bf] text-[#0f172a] translate-x-0 opacity-100" : "text-slate-700 opacity-0 translate-x-4 group-hover:opacity-100 group-hover:translate-x-0"
              )}>
                <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}

