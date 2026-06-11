import { useState } from 'react';
import { motion } from 'framer-motion';
import { HeartPulse, ShieldCheck, Sparkles } from 'lucide-react';
import Logo from './Logo';

const splashVideoSrc = '/assets/post-login-splash.mp4';

export default function PostLoginSplash() {
  const [videoFailed, setVideoFailed] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45, ease: 'easeInOut' }}
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-[#eef6ff] px-5 text-slate-900"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_16%,rgba(14,165,233,0.18),transparent_34%),radial-gradient(circle_at_82%_72%,rgba(139,92,246,0.2),transparent_38%),linear-gradient(160deg,#f8fbff_0%,#edf7ff_46%,#f5efff_100%)]" />

      {!videoFailed && (
        <video
          className="absolute inset-0 h-full w-full object-cover opacity-[0.72] saturate-[1.08]"
          src={splashVideoSrc}
          autoPlay
          muted
          playsInline
          preload="auto"
          loop
          onError={() => setVideoFailed(true)}
          aria-hidden="true"
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-b from-white/72 via-white/38 to-white/74" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(239,246,255,0.88),rgba(255,255,255,0.14)_48%,rgba(245,243,255,0.86))]" />

      <motion.div
        animate={{ opacity: [0.18, 0.36, 0.18], scale: [1, 1.08, 1] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-cyan-300/40 blur-[90px]"
      />
      <motion.div
        animate={{ opacity: [0.18, 0.34, 0.18], scale: [1, 1.12, 1] }}
        transition={{ duration: 6.5, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -right-24 bottom-20 h-80 w-80 rounded-full bg-violet-300/45 blur-[100px]"
      />

      <div className="absolute left-6 top-[16%] hidden h-36 w-32 bg-[radial-gradient(circle,rgba(59,130,246,0.28)_1.4px,transparent_1.8px)] [background-size:17px_17px] sm:block" />
      <div className="absolute right-8 bottom-[25%] h-32 w-28 bg-[radial-gradient(circle,rgba(124,58,237,0.22)_1.4px,transparent_1.8px)] [background-size:18px_18px]" />

      <motion.div
        initial={{ opacity: 0, y: 22, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 flex min-h-[80vh] w-full max-w-[680px] flex-col items-center justify-center text-center"
      >
        <motion.div
          animate={{ y: [0, -7, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="mb-10 flex items-center gap-3 rounded-full border border-white/80 bg-white/55 px-4 py-2 text-[10px] font-black uppercase tracking-[0.28em] text-slate-500 shadow-[0_20px_70px_rgba(37,99,235,0.16)] backdrop-blur-2xl"
        >
          <Sparkles size={14} className="text-violet-500" />
          Experiência clínica premium
        </motion.div>

        <motion.div
          animate={{
            boxShadow: [
              '0 28px 90px rgba(14,165,233,0.18)',
              '0 34px 110px rgba(124,58,237,0.24)',
              '0 28px 90px rgba(14,165,233,0.18)'
            ]
          }}
          transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut' }}
          className="relative w-full max-w-[570px] overflow-hidden rounded-[2.25rem] border border-white/80 bg-white/52 px-6 py-7 shadow-2xl backdrop-blur-2xl sm:rounded-[2.75rem] sm:px-10 sm:py-8"
        >
          <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300 to-transparent" />
          <div className="pointer-events-none absolute -left-10 -top-10 h-32 w-32 rounded-full bg-cyan-300/30 blur-3xl" />
          <div className="pointer-events-none absolute -right-12 bottom-0 h-36 w-36 rounded-full bg-violet-400/25 blur-3xl" />

          <motion.div
            animate={{
              filter: [
                'drop-shadow(0 0 18px rgba(14,165,233,0.32))',
                'drop-shadow(0 0 30px rgba(124,58,237,0.38))',
                'drop-shadow(0 0 18px rgba(14,165,233,0.32))'
              ]
            }}
            transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
            className="relative flex justify-center"
          >
            <Logo size="lg" variant="dark" />
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.82 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.35, duration: 0.6 }}
          className="relative mt-10 flex h-16 w-16 items-center justify-center rounded-full border border-white/80 bg-white/55 shadow-[0_24px_80px_rgba(59,130,246,0.18)] backdrop-blur-2xl"
        >
          <motion.div
            animate={{ scale: [1, 1.45, 1], opacity: [0.55, 0, 0.55] }}
            transition={{ duration: 2.1, repeat: Infinity, ease: 'easeOut' }}
            className="absolute inset-0 rounded-full border border-violet-300"
          />
          <HeartPulse className="relative text-blue-600" size={28} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.48, duration: 0.65 }}
          className="mt-8 w-full max-w-[520px]"
        >
          <div className="mb-4 flex items-center justify-center gap-3 px-2">
            <span className="h-2 w-2 shrink-0 rounded-full bg-cyan-400 shadow-[0_0_16px_rgba(34,211,238,0.75)]" />
            <p className="text-center text-[10px] font-black uppercase tracking-[0.36em] text-slate-600 sm:text-xs sm:tracking-[0.42em]">
              Preparando sua experiência clínica
            </p>
            <span className="h-2 w-2 shrink-0 rounded-full bg-violet-500 shadow-[0_0_16px_rgba(139,92,246,0.75)]" />
          </div>

          <div className="relative mx-auto h-3 w-[78vw] max-w-[450px] overflow-hidden rounded-full border border-white/70 bg-white/50 shadow-[0_18px_50px_rgba(37,99,235,0.16)] backdrop-blur-xl">
            <motion.div
              initial={{ width: '14%' }}
              animate={{ width: ['18%', '54%', '82%', '96%'] }}
              transition={{ duration: 4.8, ease: 'easeInOut' }}
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500"
            />
            <motion.div
              initial={{ x: '-45%' }}
              animate={{ x: '145%' }}
              transition={{ duration: 1.45, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-gradient-to-r from-transparent via-white to-transparent"
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.8 }}
          className="mt-11 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400"
        >
          <ShieldCheck size={15} className="text-blue-500" />
          Cuidar · Reabilitar · Evoluir
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
