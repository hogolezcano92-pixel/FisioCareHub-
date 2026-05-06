import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, Home, ShieldCheck, LineChart, ArrowRight } from 'lucide-react';

interface OnboardingProps {
  onComplete: () => void;
}

const slides = [
  {
    title: "O Cuidado que vai até Você",
    description: "Conectamos fisioterapeutas de elite a pacientes que buscam excelência no conforto do lar.",
    icon: Home,
    color: "from-blue-600 to-indigo-700",
    image: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=1000"
  },
  {
    title: "Gestão Inteligente, Prontuário Seguro",
    description: "Organize sua agenda, evoluções e documentos clínicos com segurança de nível bancário.",
    icon: ShieldCheck,
    color: "from-emerald-600 to-teal-700",
    image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=1000"
  },
  {
    title: "Sua Evolução em Tempo Real",
    description: "Acompanhe cada passo da sua jornada de cura com gráficos de progresso claros.",
    icon: LineChart,
    color: "from-sky-600 to-blue-700",
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=1000"
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
    <div className="fixed inset-0 z-[9998] bg-[#0B1120] flex flex-col overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="flex-1 flex flex-col"
        >
          {/* Top Image Section */}
          <div className="relative h-[50vh] w-full overflow-hidden">
            <motion.img 
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              transition={{ duration: 1.5 }}
              src={slides[currentSlide].image} 
              alt="" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B1120] via-transparent to-transparent" />
            
            {/* Floating Icon */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className={`absolute bottom-8 left-8 w-16 h-16 bg-gradient-to-br ${slides[currentSlide].color} rounded-2xl flex items-center justify-center text-white shadow-2xl border border-white/20`}
            >
              {React.createElement(slides[currentSlide].icon, { size: 32 })}
            </motion.div>
          </div>

          {/* Content Section */}
          <div className="flex-1 px-8 pt-12 pb-8 flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex gap-2">
                {slides.map((_, idx) => (
                  <div 
                    key={idx}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      idx === currentSlide ? "w-8 bg-blue-500" : "w-2 bg-white/10"
                    }`}
                  />
                ))}
              </div>

              <div className="space-y-4">
                <motion.h2 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-4xl font-black text-white tracking-tight leading-tight"
                >
                  {slides[currentSlide].title}
                </motion.h2>
                <motion.p 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-lg text-slate-400 font-medium leading-relaxed"
                >
                  {slides[currentSlide].description}
                </motion.p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-6">
              <button 
                onClick={onComplete}
                className="text-slate-500 font-black uppercase tracking-widest text-xs hover:text-white transition-colors"
              >
                Pular
              </button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={nextSlide}
                className={`flex items-center gap-3 px-8 py-5 bg-gradient-to-r ${slides[currentSlide].color} text-white rounded-2xl font-black text-lg shadow-2xl transition-all`}
              >
                {currentSlide === slides.length - 1 ? "Começar" : "Próximo"}
                {currentSlide === slides.length - 1 ? <ArrowRight size={24} /> : <ChevronRight size={24} />}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
