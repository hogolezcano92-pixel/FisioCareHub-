import React from 'react';
import { motion } from 'motion/react';

export default function SplashScreen() {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0F172A] text-white overflow-hidden"
    >
      {/* Background Subtle Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(37,99,235,0.05)_0%,transparent_70%)]" />

      <div className="relative w-72 h-72 flex items-center justify-center">
        {/* Medical Scanner Line */}
        <motion.div
          initial={{ top: "10%", opacity: 0 }}
          animate={{ 
            top: ["10%", "90%", "10%"],
            opacity: [0, 1, 1, 0]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#2563EB] to-transparent z-10 shadow-[0_0_15px_rgba(37,99,235,0.8)]"
        />

        {/* Minimalist Anatomical Figure SVG */}
        <svg
          viewBox="0 0 200 200"
          className="w-full h-full drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Head */}
          <circle cx="100" cy="40" r="12" fill="white" />
          
          {/* Torso */}
          <path
            d="M85 60C85 57.2386 87.2386 55 90 55H110C112.761 55 115 57.2386 115 60V110C115 112.761 112.761 115 110 115H90C87.2386 115 85 112.761 85 110V60Z"
            fill="white"
          />

          {/* Static Left Arm */}
          <path
            d="M85 65L65 95"
            stroke="white"
            strokeWidth="8"
            strokeLinecap="round"
          />

          {/* Legs */}
          <path
            d="M92 115V155"
            stroke="white"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path
            d="M108 115V155"
            stroke="white"
            strokeWidth="8"
            strokeLinecap="round"
          />

          {/* Animated Right Arm (Shoulder Rehab) */}
          <motion.g
            initial={{ rotate: 0 }}
            animate={{ rotate: -65 }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut"
            }}
            style={{ transformOrigin: "115px 65px" }}
          >
            <path
              d="M115 65L145 65"
              stroke="white"
              strokeWidth="8"
              strokeLinecap="round"
            />
            {/* Forearm */}
            <path
              d="M145 65L165 45"
              stroke="white"
              strokeWidth="6"
              strokeLinecap="round"
            />
          </motion.g>

          {/* Shoulder Joint Glow & Pulse */}
          <g>
            <motion.circle
              cx="115"
              cy="65"
              r="6"
              fill="#2563EB"
              animate={{
                scale: [1, 1.4, 1],
                opacity: [0.6, 1, 0.6]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            <motion.circle
              cx="115"
              cy="65"
              r="12"
              stroke="#2563EB"
              strokeWidth="1"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 2.2, opacity: 0 }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeOut"
              }}
            />
          </g>
        </svg>
      </div>

      {/* App Name and Subtitle */}
      <div className="text-center mt-12 space-y-3">
        <div className="flex items-center justify-center font-black tracking-tighter text-5xl">
          <motion.span
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-white"
          >
            FisioCare
          </motion.span>
          <motion.span
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6, duration: 0.5, type: "spring" }}
            className="text-[#2563EB]"
          >
            Hub
          </motion.span>
        </div>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="text-slate-400 text-sm font-bold uppercase tracking-[0.4em]"
        >
          Tecnologia para Fisioterapia
        </motion.p>
      </div>

      {/* Modern Loading Bar */}
      <div className="mt-16 w-64 h-[6px] bg-slate-800/50 rounded-full overflow-hidden relative border border-white/5">
        <motion.div
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{
            duration: 2.5,
            ease: "easeInOut"
          }}
          className="h-full bg-gradient-to-r from-blue-600 via-sky-400 to-blue-600 relative"
        >
          {/* Shine Effect */}
          <motion.div
            animate={{ x: ["-100%", "200%"] }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12"
          />
        </motion.div>
      </div>
    </motion.div>
  );
}
