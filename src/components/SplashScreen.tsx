import React from 'react';
import { motion } from 'motion/react';

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
        {/* Neon Spinal Column / Movement Icon */}
        <div className="relative mb-10 flex justify-center">
          <motion.div
            animate={{ 
              filter: [
                "drop-shadow(0 0 8px rgba(37,99,235,0.4))", 
                "drop-shadow(0 0 20px rgba(37,99,235,0.8))", 
                "drop-shadow(0 0 8px rgba(37,99,235,0.4))"
              ]
            }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            className="w-24 h-32 flex flex-col items-center justify-between"
          >
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 + 0.3, duration: 0.8 }}
                className="h-[6px] bg-gradient-to-r from-blue-600 to-sky-400 rounded-full"
                style={{ 
                  width: `${25 + (Math.abs(4 - i) * 8) + 15}px`,
                  boxShadow: '0 0 15px rgba(37,99,235,0.5)'
                }}
              />
            ))}
          </motion.div>
        </div>
        
        <div className="space-y-3">
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.8 }}
            className="font-sans text-5xl font-black tracking-tighter"
          >
            <span className="text-white">Fisio</span>
            <span className="text-[#2563EB]">CareHub</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.8, duration: 0.8 }}
            className="font-sans text-xs text-white font-bold uppercase tracking-[0.5em] opacity-80"
          >
            TECNOLOGIA E MOVIMENTO
          </motion.p>
        </div>

        {/* Footer Progress Indicator */}
        <div className="absolute bottom-[-100px] flex flex-col items-center gap-4">
          <div className="w-40 h-[2px] bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 3.5, ease: "easeInOut" }}
              className="h-full bg-[#2563EB] shadow-[0_0_10px_rgba(37,99,235,0.8)]"
            />
          </div>
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-1 h-1 bg-[#2563EB] rounded-full"
                animate={{ 
                  opacity: [0.2, 1, 0.2],
                  scale: [1, 1.2, 1]
                }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
