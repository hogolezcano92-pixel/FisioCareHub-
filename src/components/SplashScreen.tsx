import React from 'react';
import { motion } from 'motion/react';
import Logo from './Logo';

export default function SplashScreen() {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: "easeInOut" }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br from-[#0B1120] via-[#0F172A] to-[#1E293B] overflow-hidden"
    >
      {/* Animated Background Elements */}
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3]
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        className="absolute top-[-10%] left-[-10%] w-[70%] h-[70%] bg-blue-600/10 rounded-full blur-[120px]" 
      />
      <motion.div 
        animate={{ 
          scale: [1, 1.3, 1],
          opacity: [0.2, 0.4, 0.2]
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] bg-blue-400/10 rounded-full blur-[120px]" 
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
            opacity: [1, 0.8, 1]
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
          className="mt-8 flex items-center gap-3"
        >
          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Carregando Experiência</span>
          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse [animation-delay:200ms]" />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
