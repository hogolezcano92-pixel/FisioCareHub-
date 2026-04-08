import React from 'react';
import { motion } from 'motion/react';

export default function SplashScreen() {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br from-[#e0f2f1] to-white overflow-hidden"
    >
      {/* Glassmorphism Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#26a69a]/10 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#00796b]/10 rounded-full blur-[100px]" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="brand-wrapper text-center relative z-10 p-12 rounded-[3rem] bg-white/40 backdrop-blur-xl border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.05)]"
      >
        <div className="logo-box w-[120px] h-[120px] bg-white rounded-[30px] flex justify-center items-center mx-auto mb-5 shadow-[0_20px_40px_rgba(0,0,0,0.05)]">
          <svg viewBox="0 0 24 24" className="w-[70px] fill-[#00796b]">
            <path d="M13.5,5.5L12,4C10.9,2.9 9.1,2.9 8,4L4.5,7.5L5.9,8.9L9.4,5.4L10.5,6.5L6.5,10.5L7.9,11.9L11.9,7.9L13,9H17V11H19V7H15L13.5,5.5M12,12C10.9,12 10,12.9 10,14C10,15.1 10.9,16 12,16C13.1,16 14,15.1 14,14C14,12.9 13.1,12 12,12M17.6,15.3L15.4,13.1L14,14.5L16.2,16.7L14.8,18.1L12.6,15.9L11.2,17.3L13.4,19.5L12,20.9L8.5,17.4L7.1,18.8L12,23.7L19,16.7L17.6,15.3Z" />
          </svg>
        </div>
        
        <h1 className="app-name font-sans text-[2.5rem] font-bold color-[#1a3a3a] mb-2 leading-tight">
          FisioCare<span className="text-[#00796b]">Hub</span>
        </h1>
        
        <p className="tagline font-sans text-base text-[#557a7a] mb-8 font-medium">
          Cuidado e Movimento para sua Vida
        </p>

        <div className="loader flex gap-2 justify-center">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="dot w-[10px] h-[10px] bg-[#26a69a] rounded-full"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.3, 1, 0.3]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.2
              }}
            />
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
