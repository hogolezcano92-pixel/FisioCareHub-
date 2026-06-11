import { CheckCircle2, HeartPulse, Stethoscope } from 'lucide-react';
import { motion } from 'motion/react';

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
      className="fch-post-login-splash dark fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-[#050816] px-5 text-white isolation-isolate"
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
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_28%_18%,rgba(56,189,248,0.55),transparent_34%),radial-gradient(circle_at_78%_26%,rgba(147,51,234,0.58),transparent_32%),linear-gradient(135deg,#030712_0%,#061c43_38%,#2e1065_100%)]" />

      <motion.div
        className="absolute -left-24 top-10 -z-10 h-[34rem] w-[22rem] rounded-full bg-cyan-400/20 blur-3xl"
        animate={{ scale: [1, 1.16, 1], opacity: [0.42, 0.72, 0.42] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.div
        className="absolute -right-20 bottom-4 -z-10 h-[28rem] w-[34rem] rounded-full bg-fuchsia-500/28 blur-3xl"
        animate={{ scale: [1, 1.12, 1], opacity: [0.4, 0.76, 0.4] }}
        transition={{ duration: 5.2, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="absolute inset-0 -z-10 opacity-55 [background-image:radial-gradient(circle_at_center,rgba(255,255,255,0.42)_1px,transparent_1.4px)] [background-size:32px_32px]" />

      <div className="absolute bottom-[-8rem] left-[-8rem] -z-10 h-80 w-[54rem] rotate-12 rounded-[50%] border border-cyan-300/30 bg-cyan-400/15 blur-xl" />

      <div className="absolute bottom-[-9rem] right-[-9rem] -z-10 h-96 w-[60rem] -rotate-12 rounded-[50%] border border-purple-300/30 bg-purple-500/15 blur-xl" />

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
          className="fch-splash-glass mx-auto mb-7 flex w-fit items-center justify-center rounded-[2rem] border border-white/25 bg-slate-950/45 px-7 py-5 shadow-[0_24px_90px_rgba(0,0,0,0.45),0_0_80px_rgba(56,189,248,0.22)] backdrop-blur-2xl"
          animate={{
            boxShadow: [
              '0 24px 90px rgba(14,165,233,0.16)',
              '0 28px 110px rgba(168,85,247,0.34)',
              '0 24px 90px rgba(14,165,233,0.16)',
            ],
          }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div
            className="fch-splash-logo select-none text-3xl font-black tracking-tight sm:text-4xl"
            aria-label="FisioCareHub"
          >
            <span className="text-white drop-shadow-[0_0_18px_rgba(255,255,255,0.35)]">
              Fisio
            </span>
            <span className="fch-splash-logo-care bg-gradient-to-r from-cyan-200 via-sky-300 to-blue-300 bg-clip-text text-transparent drop-shadow-[0_0_22px_rgba(56,189,248,0.65)]">
              Care
            </span>
            <span className="text-white drop-shadow-[0_0_18px_rgba(255,255,255,0.35)]">
              Hub
            </span>
          </div>
        </motion.div>

        <motion.div
          className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full border border-cyan-200/45 bg-slate-950/35 shadow-[0_0_80px_rgba(34,211,238,0.48)] backdrop-blur-xl"
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        >
          <motion.div
            className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-cyan-300/45 to-purple-400/45 shadow-[inset_0_0_28px_rgba(255,255,255,0.12)]"
            animate={{ rotate: [0, -360] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          >
            <Icon className="text-cyan-100 drop-shadow-[0_0_16px_rgba(103,232,249,0.9)]" size={30} />
          </motion.div>
        </motion.div>

        <motion.p
          className="mb-3 text-sm font-black uppercase tracking-[0.34em] text-cyan-100 drop-shadow-[0_0_14px_rgba(103,232,249,0.65)]"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.6 }}
        >
          FisioCareHub
        </motion.p>

        <motion.h1
          className="fch-splash-title mx-auto max-w-4xl text-3xl font-black leading-tight tracking-tight text-white drop-shadow-[0_0_28px_rgba(255,255,255,0.22)] sm:text-5xl lg:text-6xl"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28, duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
        >
          {title}
        </motion.h1>

        <motion.p
          className="fch-splash-subtitle mx-auto mt-5 max-w-2xl text-base font-semibold text-slate-100 drop-shadow-[0_0_18px_rgba(15,23,42,0.75)] sm:text-xl"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.46, duration: 0.65 }}
        >
          {subtitle}
        </motion.p>

        <motion.div
          className="fch-splash-card mx-auto mt-10 max-w-xl rounded-[2rem] border border-white/25 bg-slate-950/45 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.38),0_0_70px_rgba(99,102,241,0.2)] backdrop-blur-2xl"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.62, duration: 0.7 }}
        >
          <div className="fch-splash-muted mb-4 flex items-center justify-center gap-3 text-sm font-bold text-slate-100 sm:text-base">
            <CheckCircle2 className="text-cyan-200 drop-shadow-[0_0_14px_rgba(103,232,249,0.8)]" size={22} />
            <span>{readyText}</span>
          </div>

          <div className="fch-splash-progress-track h-2 overflow-hidden rounded-full bg-white/20 ring-1 ring-white/15">
            <motion.div
              className="fch-splash-progress-bar h-full rounded-full bg-gradient-to-r from-cyan-300 via-blue-400 to-purple-400 shadow-[0_0_24px_rgba(34,211,238,0.65)]"
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: progressDuration, ease: 'easeInOut' }}
            />
          </div>

          <p className="fch-splash-entering mt-4 text-xs font-black uppercase tracking-[0.26em] text-slate-200/95">
            Entrando no Dashboard...
          </p>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
