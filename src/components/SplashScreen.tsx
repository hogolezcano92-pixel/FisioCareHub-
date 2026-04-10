import React from 'react';
import { motion } from 'motion/react';
import Logo from './Logo';

export default function SplashScreen() {
  return (
    <motion.div
      initial={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#020617] overflow-hidden"
    >
      {/* Background Subtle Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-600/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-sky-500/5 rounded-full blur-[120px]" />

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="text-center relative z-10 flex flex-col items-center"
      >
        {/* Logo Section */}
        <div className="mb-12">
          <Logo size="xl" variant="light" />
        </div>
        
        {/* Loading Spinner */}
        <div className="relative mb-8">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 w-16 h-16 border-4 border-transparent border-b-sky-400/30 rounded-full"
          />
        </div>

        <div className="space-y-4">
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="font-sans text-sm text-white font-black uppercase tracking-[0.3em] animate-pulse"
          >
            Identificando perfil de usuário...
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="flex items-center justify-center gap-2"
          >
            <div className="h-1 w-12 bg-blue-600/30 rounded-full overflow-hidden">
              <motion.div 
                animate={{ x: [-48, 48] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                className="h-full w-6 bg-blue-500 shadow-[0_0_10px_rgba(37,99,235,0.8)]"
              />
            </div>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}
