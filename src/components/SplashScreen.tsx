import React from 'react';
import { motion } from 'motion/react';

export default function SplashScreen() {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0F172A] overflow-hidden"
    >
      {/* Background Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-600/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-sky-500/10 rounded-full blur-[120px]" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="text-center relative z-10"
      >
        {/* Stylized Spinal Column Icon */}
        <div className="relative mb-8 flex justify-center">
          <motion.div
            animate={{ 
              scale: [1, 1.05, 1],
              filter: ["drop-shadow(0 0 10px rgba(37,99,235,0.3))", "drop-shadow(0 0 25px rgba(37,99,235,0.6))", "drop-shadow(0 0 10px rgba(37,99,235,0.3))"]
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="w-24 h-32 flex flex-col items-center justify-between"
          >
            {[...Array(7)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 + 0.5 }}
                className="h-3 bg-gradient-to-r from-blue-500 to-sky-400 rounded-full shadow-lg shadow-blue-500/20"
                style={{ 
                  width: `${30 + (Math.sin(i * 0.5) * 15) + 20}px`,
                  opacity: 1 - (i * 0.05)
                }}
              />
            ))}
            {/* Central Line */}
            <div className="absolute inset-y-0 w-[2px] bg-white/10 left-1/2 -translate-x-1/2 -z-10" />
          </motion.div>
        </div>
        
        <div className="space-y-2">
          <h1 className="font-sans text-5xl font-black tracking-tighter text-white">
            FisioCare<span className="text-blue-500">Hub</span>
          </h1>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="font-sans text-sm text-slate-400 font-bold uppercase tracking-[0.3em]"
          >
            Tecnologia e Movimento
          </motion.p>
        </div>

        {/* Loading Indicator */}
        <div className="mt-12 flex flex-col items-center gap-4">
          <div className="w-48 h-1 bg-slate-800 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 4.5, ease: "easeInOut" }}
              className="h-full bg-gradient-to-r from-blue-600 to-sky-400"
            />
          </div>
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-1.5 h-1.5 bg-blue-500 rounded-full"
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
