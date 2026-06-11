import { CheckCircle2, HeartPulse, Stethoscope } from 'lucide-react';
import { motion } from 'motion/react';
import Logo from './Logo';

type PostLoginSplashProps = {
  userRole?: 'paciente' | 'fisioterapeuta' | 'admin' | string | null;
  userName?: string | null;
  duration?: number;
  onComplete?: () => void;
};

const getFirstName = (name?: string | null) => {
  const cleanName = name?.trim();
  if (!cleanName) return 'Usuário';
  const parts = cleanName.split(/\s+/).filter(Boolean);
  if (parts.length <= 2) return cleanName;
  return `${parts[0]} ${parts[parts.length - 1]}`;
};

export default function PostLoginSplash({
  userRole = 'paciente',
  userName,
  duration = 6000,
  onComplete,
}: PostLoginSplashProps) {
  const isPhysio = userRole === 'fisioterapeuta';
  const isAdmin = userRole === 'admin';
  const displayName = getFirstName(userName);
  const progressDuration = duration / 1000;

  const title = isAdmin
    ? `Bem-vindo, ${displayName}`
    : isPhysio
      ? `Bem-vindo, Dr. ${displayName}`
      : `Bem-vindo, ${displayName}`;

  const subtitle = isAdmin
    ? 'Preparando sua administração premium...'
    : isPhysio
      ? 'Preparando seu painel profissional...'
      : 'Preparando sua jornada de recuperação...';

  const readyText = isAdmin
    ? 'Sua central de controle está pronta.'
    : isPhysio
      ? 'Seus atendimentos estão prontos.'
      : 'Sua área de cuidado está pronta.';

  const Icon = isPhysio || isAdmin ? Stethoscope : HeartPulse;

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-[#061329] px-5 text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      onAnimationComplete={() => {
        window.setTimeout(() => onComplete?.(), duration);
      }}
      role="status"
      aria-live="polite"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_18%,rgba(56,189,248,0.42),transparent_34%),radial-gradient(circle_at_78%_26%,rgba(147,51,234,0.48),transparent_32%),linear-gradient(135deg,#04142f_0%,#082f6f_38%,#35106f_100%)]" />
      <motion.div
        className="absolute -left-24 top-10 h-[34rem] w-[22rem] rounded-full bg-cyan-400/10 blur-3xl"
        animate={{ scale: [1, 1.16, 1], opacity: [0.42, 0.72, 0.42] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -right-20 bottom-4 h-[28rem] w-[34rem] rounded-full bg-fuchsia-500/20 blur-3xl"
        animate={{ scale: [1, 1.12, 1], opacity: [0.4, 0.76, 0.4] }}
        transition={{ duration: 5.2, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="absolute inset-0 opacity-45 [background-image:radial-gradient(circle_at_center,rgba(255,255,255,0.35)_1px,transparent_1.4px)] [background-size:32px_32px]" />
      <div className="absolute bottom-[-8rem] left-[-8rem] h-80 w-[54rem] rotate-12 rounded-[50%] border border-cyan-300/20 bg-cyan-400/10 blur-xl" />
      <div className="absolute bottom-[-9rem] right-[-9rem] h-96 w-[60rem] -rotate-12 rounded-[50%] border border-purple-300/20 bg-purple-500/10 blur-xl" />

      <motion.div
        className="absolute left-6 top-16 hidden h-[78vh] w-[28vw] max-w-[26rem] opacity-35 md:block"
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 0.35, x: 0 }}
        transition={{ duration: 1.1, ease: 'easeOut' }}
      >
        <div className="absolute inset-y-0 left-1/2 w-[3px] rounded-full bg-cyan-300/70 shadow-[0_0_32px_rgba(34,211,238,0.8)]" />
        <div className="absolute left-[38%] top-[18%] h-44 w-28 rounded-[45%] border border-cyan-200/20 bg-cyan-300/10 blur-[1px]" />
        <div className="absolute left-[29%] top-[34%] h-64 w-48 rounded-[45%] border border-cyan-200/20 bg-blue-400/10 blur-[1px]" />
        <div className="absolute left-[43%] top-[9%] h-20 w-16 rounded-full border border-cyan-200/20 bg-blue-300/10" />
      </motion.div>

      <motion.div
        className="relative z-10 w-full max-w-4xl text-center"
        initial={{ y: 18, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.div
          className="mx-auto mb-7 flex w-fit items-center justify-center rounded-[2rem] border border-white/15 bg-white/10 px-7 py-5 shadow-[0_24px_90px_rgba(0,0,0,0.32)] backdrop-blur-2xl"
          animate={{ boxShadow: ['0 24px 90px rgba(14,165,233,0.16)', '0 28px 110px rgba(168,85,247,0.34)', '0 24px 90px rgba(14,165,233,0.16)'] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Logo size="lg" variant="light" />
        </motion.div>

        <motion.div
          className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full border border-cyan-300/30 bg-white/10 shadow-[0_0_70px_rgba(34,211,238,0.35)] backdrop-blur-xl"
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        >
          <motion.div
            className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400/30 to-purple-500/30"
            animate={{ rotate: [0, -360] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          >
            <Icon className="text-cyan-200" size={30} />
          </motion.div>
        </motion.div>

        <motion.p
          className="mb-3 text-sm font-black uppercase tracking-[0.34em] text-cyan-200/90"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.6 }}
        >
          FisioCareHub
        </motion.p>

        <motion.h1
          className="mx-auto max-w-4xl text-3xl font-black leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28, duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
        >
          {title}
        </motion.h1>

        <motion.p
          className="mx-auto mt-5 max-w-2xl text-base font-semibold text-slate-200 sm:text-xl"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.46, duration: 0.65 }}
        >
          {subtitle}
        </motion.p>

        <motion.div
          className="mx-auto mt-10 max-w-xl rounded-[2rem] border border-white/15 bg-white/[0.08] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.24)] backdrop-blur-2xl"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.62, duration: 0.7 }}
        >
          <div className="mb-4 flex items-center justify-center gap-3 text-sm font-bold text-slate-200 sm:text-base">
            <CheckCircle2 className="text-cyan-300" size={22} />
            <span>{readyText}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-blue-400 to-purple-400 shadow-[0_0_24px_rgba(34,211,238,0.65)]"
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: progressDuration, ease: 'easeInOut' }}
            />
          </div>
          <p className="mt-4 text-xs font-black uppercase tracking-[0.26em] text-slate-400">
            Entrando no Dashboard...
          </p>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
