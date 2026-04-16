import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, Home, ShieldCheck, BarChart3, ArrowRight } from 'lucide-react';

interface OnboardingProps {
  onComplete: () => void;
}

const slides = [
  {
    title: "Sua Reabilitação em Casa",
    description: "O melhor atendimento profissional no conforto do seu lar.",
    icon: Home,
    color: "from-blue-600 to-indigo-700",
    // Slideshow Card 1 (3 fotos)
    images: [
      "https://clinicarecovery.com/wp-content/uploads/2025/10/nurse-doctor-senior-care-exercise-physical-therapy-2025-01-31-17-41-35-utc.jpg",
      "https://somostufisio.com/wp-content/uploads/2025/11/2150321573-1024x683.jpg",
      "https://vanfisio.com.br/blog/wp-content/uploads/2020/06/fisioterapia-domiciliar-atendimento-em-domicilio-home-care-e1592427183132.jpg"
    ]
  },
  {
    title: "Profissionais Verificados",
    description: "Especialistas qualificados para garantir sua segurança e performance.",
    icon: ShieldCheck,
    color: "from-emerald-600 to-teal-700",
    // Slideshow Card 2 (2 fotos novas)
    images: [
      "https://wordpress-cms-ufbra-prod-assets.quero.space/uploads/2024/06/2149868922.jpg",
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ-ZKvC32-uX5IZquFoBvikcR3gruO98oToAqq-8N_5Y_MUNUa8XSDpbTg&s=10"
    ]
  },
  {
    title: "Gestão Completa",
    description: "Agende sessões, acesse materiais e acompanhe sua evolução.",
    icon: BarChart3,
    color: "from-sky-600 to-blue-700",
    // Card 3 intacto
    image: "https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg"
  }
];

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [internalIndex, setInternalIndex] = useState(0);

  // Controle dos Slideshows Automáticos (Card 1 e Card 2)
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    // Se o card atual tiver uma lista de imagens (Card 1 ou 2)
    if (slides[currentSlide].images) {
      timer = setInterval(() => {
        setInternalIndex((prev) => (prev + 1) % slides[currentSlide].images!.length);
      }, 4000); // 4 segundos
    }

    return () => clearInterval(timer);
  }, [currentSlide]);

  const nextSlide = () => {
    if (currentSlide === slides.length - 1) {
      onComplete();
    } else {
      setCurrentSlide(prev => prev + 1);
      setInternalIndex(0); // Reseta a animação ao trocar de card
    }
  };

  return (
    <div className="fixed inset-0 z-[9998] bg-[#0B1120] flex flex-col overflow-hidden font-sans text-white">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex-1 flex flex-col"
        >
          {/* Top Image Section */}
          <div className="relative h-[55vh] w-full overflow-hidden">
            <AnimatePresence mode="wait">
              {slides[currentSlide].images ? (
                // Renderiza Slideshow para Card 1 e 2
                <motion.img 
                  key={`internal-${currentSlide}-${internalIndex}`}
                  src={slides[currentSlide].images![internalIndex]}
                  initial={{ opacity: 0, scale: 1.1 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 1.2 }}
                  className="absolute inset-0 w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                // Renderiza Imagem Única para Card 3
                <motion.img 
                  key={`static-${currentSlide}`}
                  src={slides[currentSlide].image}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              )}
            </AnimatePresence>

            <div className="absolute inset-0 bg-gradient-to-t from-[#0B1120] via-transparent to-transparent" />
            <div className={`absolute inset-0 bg-gradient-to-br ${slides[currentSlide].color} mix-blend-overlay opacity-30`} />
            
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={`absolute bottom-8 left-8 w-16 h-16 bg-gradient-to-br ${slides[currentSlide].color} rounded-2xl flex items-center justify-center shadow-2xl border border-white/20 backdrop-blur-md z-20`}
            >
              {React.createElement(slides[currentSlide].icon, { size: 32 })}
            </motion.div>
          </div>

          {/* Content Area */}
          <div className="flex-1 px-8 pt-10 pb-10 flex flex-col justify-between">
            <div className="space-y-8">
              <div className="flex gap-2">
                {slides.map((_, idx) => (
                  <div 
                    key={idx}
                    className={`h-1.5 rounded-full transition-all duration-500 ${
                      idx === currentSlide ? "w-10 bg-blue-500" : "w-2 bg-white/10"
                    }`}
                  />
                ))}
              </div>

              <div className="space-y-4">
                <motion.h2 className="text-4xl font-black leading-tight">
                  {slides[currentSlide].title}
                </motion.h2>
                <motion.p className="text-lg text-slate-400 font-medium">
                  {slides[currentSlide].description}
                </motion.p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-6">
              <button 
                onClick={onComplete}
                className="text-slate-500 font-bold uppercase tracking-widest text-xs hover:text-white"
              >
                Pular
              </button>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={nextSlide}
                className={`flex items-center gap-3 px-10 py-5 bg-gradient-to-r ${slides[currentSlide].color} text-white rounded-2xl font-black text-lg shadow-xl`}
              >
                {currentSlide === slides.length - 1 ? "Começar" : "Próximo"}
                <ArrowRight size={24} />
              </motion.button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
