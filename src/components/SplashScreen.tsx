import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Logo from './Logo';

const splashImages = [
  "/assets/fisio1.jpeg",
  "/assets/fisio2.jpeg",
  "/assets/fisio3.jpeg"
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
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-[#07111f] px-6 transition-colors duration-300"
    >
      {/* High Quality Background Image Slideshow with Premium Overlay */}
      <div className="absolute inset-0 z-0">
        <AnimatePresence mode="wait">
          <motion.img
            key={currentImageIdx}
            initial={{ scale: 1.08, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.34 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            src={splashImages[currentImageIdx]}
            className="h-full w-full object-cover"
            alt="Background"
            referrerPolicy="no-referrer"
          />
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-b from-[#020817]/95 via-[#0f172a]/78 to-[#020817]/96" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.22),transparent_58%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,8,23,0.55),transparent_28%,transparent_72%,rgba(2,8,23,0.45))]" />
      </div>

      {/* Animated Premium Background Elements */}
      <motion.div
        animate={{
          scale: [1, 1.18, 1],
          opacity: [0.18, 0.34, 0.18]
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        className="absolute left-[-18%] top-[-12%] z-[1] h-[62%] w-[76%] rounded-full bg-blue-500/20 blur-[130px]"
      />
      <motion.div
        animate={{
          scale: [1, 1.25, 1],
          opacity: [0.14, 0.3, 0.14]
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        className="absolute bottom-[-18%] right-[-18%] z-[1] h-[64%] w-[78%] rounded-full bg-violet-500/20 blur-[140px]"
      />
      <motion.div
        animate={{ opacity: [0.16, 0.34, 0.16] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute left-0 top-[26%] z-[1] h-44 w-24 bg-[radial-gradient(circle,rgba(37,99,235,0.5)_1px,transparent_1.4px)] [background-size:12px_12px]"
      />
      <motion.div
        animate={{ opacity: [0.12, 0.3, 0.12] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-[30%] right-0 z-[1] h-36 w-24 bg-[radial-gradient(circle,rgba(124,58,237,0.5)_1px,transparent_1.4px)] [background-size:12px_12px]"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 flex w-full max-w-[720px] flex-col items-center text-center"
      >
        <motion.div
          animate={{
            boxShadow: [
              "0 0 34px rgba(59,130,246,0.2)",
              "0 0 54px rgba(99,102,241,0.34)",
              "0 0 34px rgba(59,130,246,0.2)"
            ]
          }}
          transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
          className="relative w-full max-w-[560px] rounded-[2rem] border border-white/15 bg-white/[0.055] px-6 py-7 shadow-2xl shadow-blue-950/40 backdrop-blur-xl sm:rounded-[2.5rem] sm:px-10 sm:py-9"
        >
          <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-sky-300/80 to-transparent" />
          <div className="pointer-events-none absolute -left-8 top-8 h-24 w-24 rounded-full bg-sky-400/20 blur-3xl" />
          <div className="pointer-events-none absolute -right-10 bottom-4 h-28 w-28 rounded-full bg-violet-500/20 blur-3xl" />

          <motion.div
            animate={{
              filter: [
                "drop-shadow(0 0 18px rgba(56,189,248,0.28))",
                "drop-shadow(0 0 30px rgba(99,102,241,0.38))",
                "drop-shadow(0 0 18px rgba(56,189,248,0.28))"
              ]
            }}
            transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
            className="relative flex justify-center"
          >
            <Logo size="lg" variant="light" />
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.7 }}
          className="mt-10 flex w-full flex-col items-center gap-5"
        >
          <div className="flex w-full max-w-[540px] items-center justify-center gap-3 px-2">
            <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400 shadow-[0_0_14px_rgba(34,211,238,0.85)]" />
            <span className="min-w-0 text-center text-[10px] font-black uppercase tracking-[0.34em] text-slate-100 drop-shadow-lg sm:text-xs sm:tracking-[0.42em]">
              Preparando sua experiência clínica
            </span>
            <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500 shadow-[0_0_14px_rgba(139,92,246,0.85)]" />
          </div>

          <div className="relative h-[3px] w-[70vw] max-w-[430px] overflow-hidden rounded-full bg-white/10 shadow-[0_0_18px_rgba(59,130,246,0.22)]">
            <div className="absolute inset-y-0 left-0 w-full rounded-full bg-gradient-to-r from-cyan-400/80 via-blue-500/75 to-violet-500/80" />
            <motion.div
              initial={{ x: "-35%" }}
              animate={{ x: "135%" }}
              transition={{ duration: 1.55, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-gradient-to-r from-transparent via-white to-transparent shadow-[0_0_16px_rgba(255,255,255,0.85)]"
            />
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
