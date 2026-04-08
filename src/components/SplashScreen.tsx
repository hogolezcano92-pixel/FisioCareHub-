import React from 'react';
import { motion } from 'motion/react';

export default function SplashScreen() {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0F172A] text-white"
    >
          <div className="relative w-64 h-64 flex items-center justify-center">
            {/* Minimalist Anatomical Figure SVG */}
            <svg
              viewBox="0 0 200 200"
              className="w-full h-full"
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
                animate={{ rotate: -70 }}
                transition={{
                  duration: 1.5,
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

              {/* Shoulder Joint Glow */}
              <motion.circle
                cx="115"
                cy="65"
                r="6"
                fill="#2563EB"
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.5, 1, 0.5]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              
              {/* Pulse Effect around shoulder */}
              <motion.circle
                cx="115"
                cy="65"
                r="15"
                stroke="#2563EB"
                strokeWidth="1"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 2, opacity: 0 }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeOut"
                }}
              />
            </svg>
          </div>

          {/* App Name and Subtitle */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="text-center mt-8"
          >
            <h1 className="text-4xl font-black tracking-tighter text-white">
              FisioCare<span className="text-[#2563EB]">Hub</span>
            </h1>
            <p className="text-slate-400 text-sm font-bold uppercase tracking-[0.3em] mt-2">
              Tecnologia para fisioterapia
            </p>
          </motion.div>

          {/* Loading Bar */}
          <div className="w-48 h-1 bg-slate-800 rounded-full mt-12 overflow-hidden">
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "linear"
              }}
              className="w-full h-full bg-[#2563EB]"
            />
          </div>
        </motion.div>
  );
}
