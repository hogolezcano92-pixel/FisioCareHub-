import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
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
    image: "/onboarding/welcome.mp4",
    themeColor: "#3B82F6"
  },
  {
    title: "Cuidado Personalizado",
    subtitle: "Inovação",
    description: "Transformamos a jornada de recuperação através de inteligência artificial e acompanhamento humano especializado.",
    icon: BrainCircuit,
    image: "/onboarding/cuidado.mp4",
    themeColor: "#8B5CF6"
  },
];

const patientSlides = [
  {
    title: "Recupere seu Movimento",
    subtitle: "Sou Paciente",
    description: "Exercícios guiados para sua evolução. Acesse seu plano de tratamento personalizado em qualquer lugar.",
    icon: Activity,
    image: "/onboarding/recupere.mp4",
    themeColor: "#3B82F6"
  },
  {
    title: "Acompanhe seu Progresso",
    subtitle: "Sou Paciente",
    description: "Veja sua melhora dia após dia com gráficos de evolução e feedback contínuo do seu fisioterapeuta.",
    icon: LineChart,
    image: "/onboarding/acompanhe.mp4",
    themeColor: "#3B82F6"
  },
  {
    title: "Conecte-se Rapidamente",
    subtitle: "Sou Paciente",
    description: "Comunicação direta com seu profissional. Tire dúvidas e receba orientações em tempo real.",
    icon: Heart,
    image: "/onboarding/prescrever.mp4",
    themeColor: "#3B82F6"
  }
];

const physioSlides = [
  {
    title: "Gerencie seus Pacientes",
    subtitle: "Sou Fisioterapeuta",
    description: "Organização simples e eficiente de prontuários, agendas e históricos de atendimento.",
    icon: UserCheck,
    image: "/onboarding/gerencie.mp4",
    themeColor: "#8B5CF6"
  },
  {
    title: "Prescreva com Facilidade",
    subtitle: "Sou Fisioterapeuta",
    description: "Crie planos de exercícios personalizados e envie diretamente para o celular do seu paciente.",
    icon: ClipboardCheck,
    image: "/onboarding/prescreva.mp4",
    themeColor: "#8B5CF6"
  },
  {
    title: "Acompanhe Resultados",
    subtitle: "Sou Fisioterapeuta",
    description: "Evolução dos pacientes em tempo real. Analise dados de aderência e melhora clínica com precisão.",
    icon: Sparkles,
    image: "/onboarding/acompanhe.mp4",
    themeColor: "#8B5CF6"
  }
];

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [userType, setUserType] = useState<UserType>(() => {
    const saved = localStorage.getItem('onboarding_user_type');
    return saved as UserType;
  });
  const swiperRef = useRef<any>(null);

  useLayoutEffect(() => {
    // Preload first video
    const video = document.createElement('video');
    video.src = '/onboarding/welcome.mp4';
    video.preload = 'auto';
    return () => {};
  }, []);

  const allSlides = [
    ...commonSlides,
    { 
      type: 'decision',
      image: "/onboarding/comovocequer.mp4"
    },
    // We render placeholders that become actual slides after decision
    { type: 'dynamic', index: 0 },
    { type: 'dynamic', index: 1 },
    { type: 'dynamic', index: 2 },
  ];

  const handleNext = () => {
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
      setTimeout(() => {
        swiperRef.current?.slideNext();
      }, 500);
    }
  };

  const showButton = activeIndex !== 2 || userType;
  const isLastSlide = activeIndex === allSlides.length - 1;

  // Next video preloader
  const getNextVideoUrl = () => {
    if (isLastSlide) return null;
    const nextSlide = allSlides[activeIndex + 1] as any;
    if (!nextSlide) return null;
    
    let url = '';
    if (nextSlide.type === 'dynamic') {
      const dynamicSlide = userType === 'paciente' 
        ? patientSlides[nextSlide.index] 
        : (userType === 'fisioterapeuta' ? physioSlides[nextSlide.index] : null);
      url = dynamicSlide?.image || '';
    } else {
      url = nextSlide.image || '';
    }
    return url.endsWith('.mp4') ? url : null;
  };

  const nextVideoUrl = getNextVideoUrl();

  return (
    <div className="fixed inset-0 z-[9999] bg-[#0B1C2C] h-screen overflow-hidden flex flex-col font-sans select-none">
      {/* Hidden Preloader */}
      {nextVideoUrl && (
        <video key={`preload-${nextVideoUrl}`} preload="auto" className="hidden">
          <source src={nextVideoUrl} type="video/mp4" />
        </video>
      )}
      
      <div className="relative flex-1">
        <Swiper
          modules={[Pagination, EffectFade]}
          effect="fade"
          fadeEffect={{ crossFade: true }}
          speed={500}
          watchSlidesProgress={true}
          resistanceRatio={0.85}
          observer={false}
          observeParents={false}
          // @ts-ignore
          preloadImages={false}
          // @ts-ignore
          lazy={{ loadPrevNext: true }}
          pagination={{ 
            clickable: activeIndex !== 2,
            dynamicBullets: true
          }}
          onSlideChange={(swiper) => setActiveIndex(swiper.activeIndex)}
          onSwiper={(swiper) => (swiperRef.current = swiper)}
          className="w-full h-full"
          allowTouchMove={activeIndex !== 2}
        >
          {allSlides.map((slide: any, index) => {
            if (slide.type === 'decision') {
              return (
                <SwiperSlide key="decision" className="bg-[#0B1C2C]">
                  <DecisionSlide slide={slide} onSelect={handleSelectType} selectedType={userType} isActive={activeIndex === index} />
                </SwiperSlide>
              );
            }
            
            if (slide.type === 'dynamic') {
              const dynamicSlide = userType === 'paciente' 
                ? patientSlides[slide.index] 
                : (userType === 'fisioterapeuta' ? physioSlides[slide.index] : null);
              
              return (
                <SwiperSlide key={`dynamic-${slide.index}`} className="bg-[#0B1C2C]">
                  {dynamicSlide ? (
                    <ContentSlide slide={dynamicSlide} isActive={activeIndex === index} isPriority={false} slideIndex={index} />
                  ) : (
                    <div className="w-full h-full bg-[#0B1C2C]" />
                  )}
                </SwiperSlide>
              );
            }

            return (
              <SwiperSlide key={`common-${index}`} className="bg-[#0B1C2C]">
                <ContentSlide slide={slide} isActive={activeIndex === index} isPriority={index === 0} slideIndex={index} />
              </SwiperSlide>
            );
          })}
        </Swiper>
      </div>

      {/* Fixed Controls Container - Eliminates jumps */}
      <div className="absolute bottom-0 left-0 w-full z-[110] px-6 pb-12 sm:px-8 pointer-events-none">
        <div className="max-w-xl mx-auto flex items-center justify-between w-full">
          {/* Skip Button */}
          <div className="pointer-events-auto">
            {activeIndex !== 2 && (
              <button 
                onClick={onComplete}
                className="text-[#A1A1AA] font-bold uppercase tracking-[0.2em] text-[10px] hover:text-white transition-colors p-4"
              >
                Pular
              </button>
            )}
          </div>

          {/* Next Button */}
          <div className="pointer-events-auto">
            {showButton && (
              <button
                onClick={handleNext}
                className={cn(
                  "flex items-center gap-4 px-10 py-5 rounded-2xl font-black text-lg transition-all active:scale-[0.98] group shadow-2xl relative",
                  userType === 'fisioterapeuta' 
                    ? "bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white shadow-purple-500/20" 
                    : "bg-gradient-to-r from-[#3B82F6] to-[#2563EB] text-white shadow-blue-500/20"
                )}
              >
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative z-10">
                  {isLastSlide ? "Começar" : "Próximo"}
                </span>
                <div className="relative z-10 transition-transform duration-300 group-hover:translate-x-1">
                  {isLastSlide ? (
                    <Rocket size={22} className="group-hover:-translate-y-1 transition-transform" />
                  ) : (
                    <ChevronRight size={22} />
                  )}
                </div>
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .swiper-pagination-bullet {
          background: #3B82F6 !important;
          opacity: 0.15;
          width: 8px;
          height: 8px;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .swiper-pagination-bullet-active {
          opacity: 1;
          width: 36px;
          border-radius: 6px;
          background: #8B5CF6 !important;
        }
        .swiper-pagination {
          bottom: 125px !important;
          text-align: left !important;
          padding-left: 24px !important;
        }
        @media (min-width: 640px) {
          .swiper-pagination {
            padding-left: 32px !important;
          }
        }
        .swiper-slide {
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}

function ContentSlide({ slide, isActive, isPriority, slideIndex }: { slide: any, isActive: boolean, isPriority: boolean, slideIndex: number }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const color = slide.themeColor || '#3B82F6';

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive) {
      video.currentTime = 0;
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {});
      }
    } else {
      video.pause();
    }
  }, [isActive]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants: any = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.7, ease: "easeOut" }
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden bg-[#0B1C2C]">
      {/* Background Layer - Full screen coverage using img for priority loading */}
      <div className="absolute inset-0 z-0">
        {slide.image.endsWith('.mp4') ? (
          <video
            ref={videoRef}
            key={`${slide.image}-${slideIndex}`}
            muted
            loop
            playsInline
            preload={isActive ? "auto" : "metadata"}
            disablePictureInPicture
            className="w-full h-full object-cover"
            onLoadedData={() => setIsLoaded(true)}
            style={{
              transform: 'translateZ(0)',
              backfaceVisibility: 'hidden',
              willChange: 'opacity'
            }}
          >
            <source src={slide.image} type="video/mp4" />
          </video>
        ) : (
          <img 
            src={slide.image}
            alt=""
            className={cn(
              "w-full h-full object-cover transition-all duration-1000 animate-ken-burns",
              isLoaded ? "grayscale-[0.2]" : "grayscale-0"
            )}
            // @ts-ignore
            fetchPriority={isActive ? "high" : "low"}
            loading={isActive ? "eager" : "lazy"}
            decoding="async"
            onLoad={() => setIsLoaded(true)}
          />
        )}
        <div className={cn(
          "absolute inset-0 bg-gradient-to-b from-[#0B1C2C]/40 to-[#0B1C2C]/60 transition-opacity duration-1000",
          isLoaded ? "opacity-100" : "opacity-0"
        )} />
      </div>
      
      <div className={cn(
        "absolute inset-0 z-0 transition-opacity duration-1000",
        isLoaded ? "opacity-100" : "opacity-0"
      )} />
      
      <div 
        className="absolute inset-0 z-0"
        style={{
          background: 'linear-gradient(180deg, rgba(11, 28, 44, 0.2) 0%, rgba(11, 28, 44, 0.8) 100%)'
        }}
      />
      
      <div className="absolute inset-0 z-0 bg-black/10" />
      
      <div 
        className="absolute inset-0 z-0 opacity-15"
        style={{ 
          background: `linear-gradient(135deg, ${color}30 0%, #8B5CF630 100%)` 
        }} 
      />

      <div className="relative z-10 flex-1 flex flex-col justify-center px-6 sm:px-12 pt-16">
        <div className="max-w-xl">
          <AnimatePresence mode="wait">
            {isActive && (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                <motion.div 
                  variants={itemVariants}
                  className="flex items-center gap-3 mb-6 sm:mb-8"
                >
                  <div 
                    style={{ 
                      backgroundColor: `${color}30`, 
                      color: 'white', 
                      borderColor: `${color}30`,
                      textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                    }}
                    className="p-3 sm:p-4 rounded-3xl border shadow-2xl"
                  >
                    <slide.icon size={24} className="sm:w-7 sm:h-7" />
                  </div>
                  <div className="flex flex-col">
                    <span 
                      style={{ 
                        color: 'white',
                        textShadow: '0 2px 4px rgba(0,0,0,0.4)'
                      }} 
                      className="font-black uppercase tracking-[0.35em] text-[11px]"
                    >
                      {slide.subtitle}
                    </span>
                    <div style={{ backgroundColor: color }} className="h-0.5 w-6 sm:w-8 mt-1 rounded-full shadow-lg" />
                  </div>
                </motion.div>

                <motion.h1 
                  variants={itemVariants}
                  className="text-4xl sm:text-7xl font-black text-white leading-[1.1] sm:leading-[1] mb-6 sm:mb-8 tracking-tighter"
                  style={{ textShadow: '0 4px 12px rgba(0,0,0,0.6)' }}
                >
                  {slide.title}
                </motion.h1>

                <motion.p 
                  variants={itemVariants}
                  className="text-base sm:text-xl text-slate-100 leading-relaxed font-medium mb-8 sm:mb-12 max-w-md border-l-4 pl-4 sm:pl-6 bg-black/5 py-2 rounded-r-lg border-white/20"
                  style={{ 
                    borderColor: `${color}`, 
                    overflowWrap: 'break-word', 
                    wordWrap: 'break-word',
                    textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                  }}
                >
                  {slide.description}
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function DecisionSlide({ slide, onSelect, selectedType, isActive }: { slide: any, onSelect: (type: UserType) => void, selectedType: UserType, isActive: boolean }) {
  const [bgLoaded, setBgLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive) {
      video.currentTime = 0;
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {});
      }
    } else {
      video.pause();
    }
  }, [isActive]);

  const options = [
    { 
      id: 'paciente', 
      label: 'Sou Paciente', 
      desc: 'Recupere seus movimentos e encontre fisioterapeutas para te acompanhar.', 
      badge: 'Encontre profissionais',
      icon: Heart,
      color: '#3B82F6',
      image: 'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&q=60&w=800'
    },
    { 
      id: 'fisioterapeuta', 
      label: 'Sou Fisioterapeuta', 
      desc: 'Gerencie seus pacientes e atraia novos atendimentos pelo app.', 
      badge: 'Capte pacientes',
      icon: Stethoscope,
      color: '#8B5CF6',
      image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=60&w=800'
    }
  ];

  const container: any = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.2
      }
    }
  };

  const fadeUp: any = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center px-4 sm:px-8 overflow-hidden bg-[#0B1C2C]">
      <AnimatePresence>
        {isActive && (
          <>
            {/* Background Layer - Zoom out effect */}
            <div className="absolute inset-0 z-0">
              {slide.image.endsWith('.mp4') ? (
                <video
                  ref={videoRef}
                  muted
                  loop
                  playsInline
                  preload={isActive ? "auto" : "metadata"}
                  disablePictureInPicture
                  className="w-full h-full object-cover"
                  onLoadedData={() => setBgLoaded(true)}
                  style={{
                    transform: 'translateZ(0)',
                    backfaceVisibility: 'hidden',
                    willChange: 'opacity'
                  }}
                >
                  <source src={slide.image} type="video/mp4" />
                </video>
              ) : (
                <motion.img 
                  src={slide.image}
                  initial={{ scale: 1.2, opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 3, ease: "easeOut" }}
                  alt=""
                  className="w-full h-full object-cover object-center animate-ken-burns"
                  decoding="async"
                  loading="eager"
                  style={{ willChange: 'transform, opacity' }}
                  onLoad={() => setBgLoaded(true)}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-b from-[#0B1C2C]/30 via-[#0B1C2C]/50 to-[#0B1C2C]/70" />
            </div>

            <div className="absolute inset-0 z-0" />

            <div className="absolute inset-0 z-0">
              <AnimatePresence mode="wait">
                {selectedType && (
                  <motion.img 
                    key={selectedType}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.15 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    src={selectedType === 'paciente' ? options[0].image : options[1].image} 
                    alt="" 
                    className="w-full h-full object-cover scale-110"
                  />
                )}
              </AnimatePresence>
            </div>

            <motion.div 
              className="relative z-10 w-full max-w-lg"
              variants={container}
              initial="hidden"
              animate="visible"
            >
              <div className="text-center mb-10 sm:mb-16">
                <motion.div 
                  variants={fadeUp}
                  className="inline-flex items-center justify-center p-4 sm:p-5 rounded-3xl bg-white/5 border border-white/10 mb-6 sm:mb-8 shadow-2xl"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Users size={32} className="text-white sm:w-10 sm:h-10" />
                </motion.div>
                <motion.h2 
                  variants={fadeUp}
                  className="text-3xl sm:text-5xl font-black text-white mb-4 sm:mb-6 tracking-tighter leading-tight"
                  style={{ textShadow: '0 4px 12px rgba(0,0,0,0.5)' }}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  Como você quer usar o FisioCareHub?
                </motion.h2>
                <motion.p 
                  variants={fadeUp}
                  className="text-slate-200 text-base sm:text-lg font-medium max-w-sm mx-auto"
                  style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  Escolha o seu perfil para personalizarmos sua jornada.
                </motion.p>
              </div>

              <div className="grid gap-4 sm:gap-6 w-full">
                {options.map((option) => (
                  <motion.button
                    key={option.id}
                    layout
                    variants={fadeUp}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ y: -2, scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onSelect(option.id as UserType)}
                    className={cn(
                      "group relative w-full p-5 sm:p-8 bg-[#0F2235]/70 border-2 rounded-[2rem] sm:rounded-[2.5rem] transition-all text-left flex items-center gap-4 sm:gap-8 overflow-hidden",
                      selectedType === option.id 
                        ? "shadow-[0_20px_60px_-15px_rgba(59,130,246,0.2)]" 
                        : "border-white/10 hover:border-white/20 hover:bg-[#1a3a55]/90"
                    )}
                    style={{ borderColor: selectedType === option.id ? option.color : 'rgba(255,255,255,0.1)' }}
                  >
                    <div 
                      style={{ 
                        backgroundColor: selectedType === option.id ? `${option.color}40` : 'rgba(255,255,255,0.05)',
                        color: selectedType === option.id ? '#FFFFFF' : '#A1A1AA',
                        borderColor: selectedType === option.id ? option.color : 'rgba(255,255,255,0.08)'
                      }}
                      className="absolute top-3 right-3 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all duration-300 z-20 max-w-[70%] truncate"
                    >
                      {option.badge}
                    </div>

                    <motion.div 
                      style={{ 
                        backgroundColor: selectedType === option.id ? option.color : 'rgba(255,255,255,0.05)',
                        color: '#FFFFFF'
                      }}
                      className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl flex items-center justify-center transition-all duration-500 shrink-0"
                    >
                      <option.icon className="w-7 h-7 sm:w-9 sm:h-9" />
                    </motion.div>
                    
                    <div className="flex-1 min-w-0 pt-6 sm:pt-0">
                      <motion.span 
                        className={cn(
                          "block text-xl sm:text-2xl font-black mb-1 leading-tight",
                          selectedType === option.id ? "text-white" : "text-slate-300 group-hover:text-white"
                        )}
                        style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}
                      >
                        {option.label}
                      </motion.span>
                      <motion.span 
                        className={cn(
                          "block text-[11px] sm:text-sm font-medium leading-relaxed transition-colors line-clamp-2 sm:line-clamp-none",
                          selectedType === option.id ? "text-slate-200" : "text-[#A1A1AA]"
                        )}
                        style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}
                      >
                        {option.desc}
                      </motion.span>
                    </div>

                    <div 
                      style={{ backgroundColor: selectedType === option.id ? option.color : 'rgba(255,255,255,0.05)' }}
                      className={cn(
                        "w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all duration-500 shrink-0 sm:ml-4",
                        selectedType === option.id ? "text-white translate-x-0 opacity-100" : "text-slate-700 opacity-0 translate-x-4 group-hover:opacity-100 group-hover:translate-x-0"
                      )}
                    >
                      <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}



