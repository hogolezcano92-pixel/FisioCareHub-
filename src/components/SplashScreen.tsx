import React from 'react';
import { motion } from 'motion/react';
import Logo from './Logo';

export default function SplashScreen() {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1, ease: "easeInOut" }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0B1120] overflow-hidden"
    >
      {/* Background Subtle Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-400/5 rounded-full blur-[120px]" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ 
          duration: 1.2, 
          ease: [0.22, 1, 0.36, 1],
        }}
        className="text-center relative z-10 flex flex-col items-center"
      >
        {/* Logo Section */}
        <div className="mb-8">
          <Logo size="xl" variant="light" />
        </div>
        
        {/* Subtitle & Loading */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 1 }}
          className="space-y-8 flex flex-col items-center"
        >
          <div className="space-y-2">
            <h2 className="text-white font-accent font-bold tracking-[0.3em] text-sm uppercase">
              FisioCareHub
            </h2>
            <p className="text-blue-400/60 font-accent font-medium tracking-[0.15em] text-[10px] uppercase">
              Reabilitação & Performance
            </p>
          </div>

          {/* Minimalist Loading Bar */}
          <div className="relative w-32 h-[2px] bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ 
                duration: 2.5, 
                repeat: Infinity, 
                ease: "linear" 
              }}
              className="absolute inset-0 w-full bg-gradient-to-r from-transparent via-blue-500 to-transparent"
            />
          </div>
        </motion.div>
      </motion.div>
      
      {/* Footer Branding */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
        className="absolute bottom-12 text-white/10 text-[9px] font-black uppercase tracking-[0.5em]"
      >
        Premium Healthcare Experience
      </motion.div>
    </motion.div>
  );
}
