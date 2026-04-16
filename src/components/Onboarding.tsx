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
    // Imagem: Fisioterapeuta auxiliando paciente idoso a andar na sala de casa (Pexels)
    image: "https://images.pexels.com/photos/6129437/pexels-photo-6129437.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2" 
  },
  {
    title: "Profissionais Verificados",
    description: "Especialistas qualificados para garantir sua segurança e performance.",
    icon: ShieldCheck,
    color: "from-emerald-600 to-teal-700",
    // Imagem: Close em fisioterapeuta trabalhando na perna de uma paciente em ambiente domiciliar (Pexels)
    image: "https://images.pexels.com/photos/6129207/pexels-photo-6129207.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
  },
  {
    title: "Gestão Completa",
    description: "Agende sessões, acesse materiais e acompanhe sua evolução.",
    icon: BarChart3,
    color: "from-sky-600 to-blue-700",
    // Imagem: Fisioterapeuta conversando e anotando progresso com paciente (Pexels)
    image: "https://images.pexels.com/photos/6129500/pexels-photo-6129500.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
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
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="flex-1 flex flex-col"
        >
          {/* Top Image Section com Movimento "Ken Burns" */}
          <div className="relative h-[55vh] w-full overflow-hidden">
            <motion.div
              initial={{ scale: 1 }}
              animate={{ scale: 1.15 }}
              transition={{ 
                duration: 10, 
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
              />
            </motion.div>
            
            {/* Gradiente de transição para o conteúdo */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B1120] via-transparent to-transparent" />
            
            {/* Overlay de cor para dar identidade visual */}
            <div className={`absolute inset-0 bg-gradient-to-br ${slides[currentSlide].color} mix-blend-overlay opacity-30`} />
            
            {/* Ícone Flutuante com efeito Spring */}
            <motion.div 
              initial={{ y: 50, opacity: 0, scale: 0.5 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 100 }}
              className={`absolute bottom-8 left-8 w-16 h-16 bg-gradient-to-br ${slides[currentSlide].color} rounded-2xl flex items-center justify-center text-white shadow-2xl border border-white/20 backdrop-blur-md`}
            >
              {React.createElement(slides[currentSlide].icon, { size: 32 })}
            </motion.div>
          </div>

          {/* Área de Texto e Navegação */}
          <div className="flex-1 px-8 pt-10 pb-10 flex flex-col justify-between">
            <div className="space-y-8">
              {/* Dots de progresso */}
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
                <motion.h2 
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-4xl font-black text-white tracking-tight"
                >
                  {slides[currentSlide].title}
                </motion.h2>
                <motion.p 
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-lg text-slate-400 font-medium leading-relaxed"
                >
                  {slides[currentSlide].description}
                </motion.p>
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="flex items-center justify-between gap-6">
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
                className={`flex items-center gap-3 px-8 py-5 bg-gradient-to-r ${slides[currentSlide].color} text-white rounded-2xl font-black text-lg shadow-2xl transition-all`}
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
