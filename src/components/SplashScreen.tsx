import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Logo from './Logo';

const splashImages = [
  "https://images.unsplash.com/photo-1580281657527-47f249e8f5d6?auto=format&fit=crop&w=2000&q=80",
  "https://images.unsplash.com/photo-1571019613914-85f342c1a2c7?auto=format&fit=crop&w=2000&q=80",
  "https://images.unsplash.com/photo-1599058917212-d750089bc07e?auto=format&fit=crop&w=2000&q=80"
];

export default function SplashScreen() {
  const [currentImageIdx, setCurrentImageIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImageIdx((prev) => (prev + 1) % splashImages.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0f172a] overflow-hidden"
    >
      {/* High Quality Background Image Slideshow with Overlay */}
      <div className="absolute inset-0 z-0">
        <AnimatePresence mode="wait">
          <motion.img 
            key={currentImageIdx}
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.4 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            src={splashImages[currentImageIdx]} 
            className="w-full h-full object-cover"
            alt="Background"
            referrerPolicy="no-referrer"
          />
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f172a] via-[#0f172a]/80 to-transparent" />
      </div>

      {/* Animated Background Elements */}
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.2, 0.4, 0.2]
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        className="absolute top-[-10%] left-[-10%] w-[70%] h-[70%] bg-blue-600/10 rounded-full blur-[120px] z-[1]" 
      />
      <motion.div 
        animate={{ 
          scale: [1, 1.3, 1],
          opacity: [0.1, 0.3, 0.1]
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] bg-[#2dd4bf]/10 rounded-full blur-[120px] z-[1]" 
      />

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ 
          opacity: 1, 
          scale: [0.9, 1.05, 1],
        }}
        transition={{ 
          duration: 1.5, 
          ease: [0.22, 1, 0.36, 1],
        }}
        className="text-center relative z-10 flex flex-col items-center"
      >
        <motion.div
          animate={{
            filter: ["blur(0px)", "blur(2px)", "blur(0px)"],
            opacity: [1, 0.9, 1]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <Logo size="xl" variant="light" />
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-12 flex flex-col items-center gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 bg-[#2dd4bf] rounded-full animate-pulse shadow-[0_0_10px_rgba(45,212,191,0.8)]" />
            <span className="text-[11px] font-black text-slate-100 uppercase tracking-[0.4em] drop-shadow-lg">Carregando Experiência</span>
            <div className="w-1.5 h-1.5 bg-[#2dd4bf] rounded-full animate-pulse [animation-delay:200ms] shadow-[0_0_10px_rgba(45,212,191,0.8)]" />
          </div>
          
          <div className="w-48 h-[2px] bg-white/5 rounded-full overflow-hidden relative">
            <motion.div 
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-[#2dd4bf] to-transparent"
            />
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
