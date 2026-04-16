import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, Home, ShieldCheck, BarChart3, ArrowRight } from 'lucide-react';

interface OnboardingProps {
  onComplete: () => void;
}

const images = {
  fisioterapiaHome: "https://clinicarecovery.com/wp-content/uploads/2025/10/nurse-doctor-senior-care-exercise-physical-therapy-2025-01-31-17-41-35-utc.jpg",
  fisioterapeutaMorena: "https://somostufisio.com/wp-content/uploads/2025/11/2150321573-1024x683.jpg",
  gestaoModerna: "https://vanfisio.com.br/blog/wp-content/uploads/2020/06/fisioterapia-domiciliar-atendimento-em-domicilio-home-care-e1592427183132.jpg"
};

const slides = [
  {
    title: "Sua Reabilitação em Casa",
    description: "O melhor atendimento profissional no conforto do seu lar.",
    icon: Home,
    color: "from-blue-600 to-indigo-700",
    // Array de imagens para o primeiro card
    images: [images.fisioterapiaHome, images.fisioterapeutaMorena, images.gestaoModerna]
  },
  {
    title: "Profissionais Verificados",
    description: "Especialistas qualificados para garantir sua segurança e performance.",
    icon: ShieldCheck,
    color: "from-emerald-600 to-teal-700",
    image: images.fisioterapeutaMorena
  },
  {
    title: "Gestão Completa",
    description: "Agende sessões, acesse materiais e acompanhe sua evolução.",
    icon: BarChart3,
    color: "from-sky-600 to-blue-700",
    image: images.gestaoModerna
  }
];

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [internalImageIndex, setInternalImageIndex] = useState(0);

  // Efeito para alternar as imagens automaticamente no Card 1 a cada 2 segundos
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (currentSlide === 0) {
      interval = setInterval(() => {
        setInternalImageIndex((prev) => (prev + 1) % slides[0].images!.length);
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [currentSlide]);

  const nextSlide = () => {
    if (currentSlide === slides.length - 1) {
      onComplete();
    } else {
      setCurrentSlide(prev => prev + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-[9998] bg-[#0B1120] flex flex-col overflow-hidden font-sans">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="flex-1 flex flex-col"
        >
          {/* Section de Imagem */}
          <div className="relative h-[55vh] w-full overflow-hidden">
            <AnimatePresence mode="wait">
              {currentSlide === 0 ? (
                // Slideshow interno do Card 1
                <motion.img 
                  key={`internal-${internalImageIndex}`}
                  initial={{ opacity: 0, scale: 1.1 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.8 }}
                  src={slides[0].images![internalImageIndex]} 
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                // Imagem única dos Cards 2 e 3
                <motion.img 
                  key={`slide-${currentSlide}`}
                  initial={{ opacity: 0, scale: 1.2 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 1.5 }}
                  src={slides[currentSlide].image} 
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}
            </AnimatePresence>

            {/* Gradientes e Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B1120] via-[#0B1120]/20 to-transparent opacity-90" />
            <div className={`absolute inset-0 bg-gradient-to-br ${slides[currentSlide].color} mix-blend-overlay opacity-30`} />
            
            {/* Ícone Flutuante */}
            <motion.div 
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className={`absolute bottom-8 left-8 w-16 h-16 bg-gradient-to-br ${slides[currentSlide].color} rounded-2xl flex items-center justify-center text-white shadow-2xl border border-white/20 backdrop-blur-sm z-20`}
            >
              {React.createElement(slides[currentSlide].icon, { size: 32 })}
            </motion.div>
          </div>

          {/* Área de Texto */}
          <div className="flex-1 px-8 pt-10 pb-10 flex flex-col justify-between bg-[#0B1120]">
            <div className="space-y-8">
              <div className="flex gap-2.5">
                {slides.map((_, idx) => (
                  <div 
                    key={idx}
                    className={`h-1.5 rounded-full transition-all duration-500 ${
                      idx === currentSlide ? "w-10 bg-blue-500" : "w-2.5 bg-white/10"
                    }`}
                  />
                ))}
              </div>

              <div className="space-y-4">
                <motion.h2 className="text-4xl font-black text-white tracking-tight leading-tight">
                  {slides[currentSlide].title}
                </motion.h2>
                <motion.p className="text-lg text-slate-400 font-medium leading-relaxed">
                  {slides[currentSlide].description}
                </motion.p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-6 pt-6">
              <button 
                onClick={onComplete}
                className="text-slate-500 font-bold uppercase tracking-widest text-xs hover:text-white transition-colors p-2"
              >
                Pular
              </button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={nextSlide}
                className={`flex items-center gap-3 px-10 py-5 bg-gradient-to-r ${slides[currentSlide].color} text-white rounded-2xl font-black text-lg shadow-xl`}
              >
                {currentSlide === slides.length - 1 ? "Começar Agora" : "Próximo"}
                <ArrowRight size={24} />
              </motion.button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
