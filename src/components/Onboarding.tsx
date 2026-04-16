import React, { useState } from 'react';
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
    // Link Ref: https://pin.it/41KcC5k9f
    image: "https://i.pinimg.com/736x/87/42/48/87424840e6037a4e61288339c2c62f27.jpg" 
  },
  {
    title: "Profissionais Verificados",
    description: "Especialistas qualificados para garantir sua segurança e performance.",
    icon: ShieldCheck,
    color: "from-emerald-600 to-teal-700",
    // Link Ref: https://pin.it/34xR68Hy5
    image: "https://i.pinimg.com/736x/55/92/3d/55923d875a6c1a84f3e5c94295966442.jpg"
  },
  {
    title: "Gestão Completa",
    description: "Agende sessões, acesse materiais e acompanhe sua evolução.",
    icon: BarChart3,
    color: "from-sky-600 to-blue-700",
    // Link Ref: https://pin.it/40cMuBVUd
    image: "https://i.pinimg.com/736x/01/95/9d/01959d64673894451006509f69748633.jpg"
  }
];

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

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
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="flex-1 flex flex-col"
        >
          {/* Top Image Section com Efeito de Vida */}
          <div className="relative h-[55vh] w-full overflow-hidden">
            <motion.div
              initial={{ scale: 1 }}
              animate={{ scale: 1.15 }}
              transition={{ 
                duration: 8, 
                repeat: Infinity, 
                repeatType: "reverse", 
                ease: "linear" 
              }}
              className="w-full h-full"
            >
              <img 
                src={slides[currentSlide].image} 
                alt={slides[currentSlide].title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </motion.div>
            
            {/* Overlay para dar profundidade e cor */}
            <div className={`absolute inset-0 bg-gradient-to-t from-[#0B1120] via-[#0B1120]/20 to-transparent opacity-80`} />
            <div className={`absolute inset-0 bg-gradient-to-br ${slides[currentSlide].color} mix-blend-overlay opacity-30`} />
            
            {/* Floating Icon */}
            <motion.div 
              initial={{ y: 40, opacity: 0, scale: 0.5 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 100 }}
              className={`absolute bottom-10 left-8 w-20 h-20 bg-gradient-to-br ${slides[currentSlide].color} rounded-3xl flex items-center justify-center text-white shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/20 backdrop-blur-sm`}
            >
              {React.createElement(slides[currentSlide].icon, { size: 38 })}
            </motion.div>
          </div>

          {/* Content Section */}
          <div className="flex-1 px-8 pt-10 pb-10 flex flex-col justify-between bg-[#0B1120]">
            <div className="space-y-8">
              {/* Progress Indicators */}
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
                <motion.h2 
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-4xl font-black text-white tracking-tight leading-[1.1]"
                >
                  {slides[currentSlide].title}
                </motion.h2>
                <motion.p 
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-xl text-slate-400 font-medium leading-relaxed max-w-[90%]"
                >
                  {slides[currentSlide].description}
                </motion.p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-6 pt-6">
              <button 
                onClick={onComplete}
                className="text-slate-500 font-bold uppercase tracking-[0.2em] text-xs hover:text-white transition-colors p-2"
              >
                Pular
              </button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={nextSlide}
                className={`flex items-center gap-3 px-10 py-5 bg-gradient-to-r ${slides[currentSlide].color} text-white rounded-2xl font-black text-lg shadow-[0_15px_30px_-10px_rgba(0,0,0,0.5)]`}
              >
                {currentSlide === slides.length - 1 ? "Começar Agora" : "Próximo"}
                <motion.div
                  animate={{ x: [0, 5, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  {currentSlide === slides.length - 1 ? <ArrowRight size={24} /> : <ChevronRight size={24} />}
                </motion.div>
              </motion.button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
