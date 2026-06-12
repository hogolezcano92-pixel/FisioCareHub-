import { useEffect, useMemo } from 'react';
import {
  Activity,
  CalendarCheck2,
  CheckCircle2,
  HeartPulse,
  ShieldCheck,
  Sparkles,
  Stethoscope,
} from 'lucide-react';
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

const floatingDots = Array.from({ length: 18 }, (_, index) => ({
  id: index,
  left: `${8 + ((index * 17) % 84)}%`,
  top: `${10 + ((index * 23) % 78)}%`,
  delay: 0.08 * index,
  size: index % 3 === 0 ? 'h-2.5 w-2.5' : index % 3 === 1 ? 'h-1.5 w-1.5' : 'h-2 w-2',
}));

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

  useEffect(() => {
    const timer = window.setTimeout(() => onComplete?.(), duration);
    return () => window.clearTimeout(timer);
  }, [duration, onComplete]);

  const title = isAdmin
    ? `Bem-vindo, ${displayName}`
    : isPhysio
      ? `Bem-vindo, Dr. ${displayName}`
      : `Bem-vindo, ${displayName}`;

  const subtitle = isAdmin
    ? 'Sincronizando sua administração premium...'
    : isPhysio
      ? 'Organizando agenda, pacientes e atendimentos...'
      : 'Preparando sua jornada de recuperação personalizada...';

  const readyText = isAdmin
    ? 'Central de controle pronta para gestão.'
    : isPhysio
      ? 'Painel profissional pronto para cuidar.'
      : 'Área de cuidado pronta para começar.';

  const Icon = isPhysio || isAdmin ? Stethoscope : HeartPulse;

  const steps = useMemo(() => {
    if (isAdmin) {
      return [
        { icon: ShieldCheck, label: 'Segurança ativa' },
        { icon: Activity, label: 'Dados sincronizados' },
        { icon: CheckCircle2, label: 'Gestão pronta' },
      ];
    }

    if (isPhysio) {
      return [
        { icon: CalendarCheck2, label: 'Agenda pronta' },
        { icon: Activity, label: 'Pacientes conectados' },
        { icon: CheckCircle2, label: 'Atendimento liberado' },
      ];
    }

    return [
      { icon: HeartPulse, label: 'Cuidado ativo' },
      { icon: Activity, label: 'Evolução acompanhada' },
      { icon: CheckCircle2, label: 'Dashboard pronto' },
    ];
  }, [isAdmin, isPhysio]);

  return (
    <motion.div
      className="fch-post-login-splash dark fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-[#050816] px-5 text-white isolation-isolate"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.01 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      role="status"
      aria-live="polite"
    >
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_24%_20%,rgba(34,211,238,0.48),transparent_32%),radial-gradient(circle_at_82%_22%,rgba(168,85,247,0.52),transparent_34%),radial-gradient(circle_at_50%_92%,rgba(37,99,235,0.42),transparent_38%),linear-gradient(135deg,#020617_0%,#071a3f_42%,#2e1065_100%)]" />

      <motion.div
        className="absolute inset-0 -z-10 opacity-45 [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:44px_44px]"
        animate={{ x: [0, 22, 0], y: [0, -18, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.div
        className="absolute -left-24 top-10 -z-10 h-[34rem] w-[24rem] rounded-full bg-cyan-400/22 blur-3xl"
        animate={{ scale: [1, 1.18, 1], opacity: [0.38, 0.72, 0.38], x: [0, 28, 0] }}
        transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.div
        className="absolute -right-24 bottom-0 -z-10 h-[30rem] w-[36rem] rounded-full bg-fuchsia-500/28 blur-3xl"
        animate={{ scale: [1, 1.12, 1], opacity: [0.36, 0.76, 0.36], x: [0, -24, 0] }}
        transition={{ duration: 5.4, repeat: Infinity, ease: 'easeInOut' }}
      />

      {floatingDots.map((dot) => (
        <motion.span
          key={dot.id}
          className={`absolute rounded-full bg-cyan-100/60 shadow-[0_0_18px_rgba(103,232,249,0.8)] ${dot.size}`}
          style={{ left: dot.left, top: dot.top }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: [0, 0.75, 0], scale: [0.5, 1.35, 0.7], y: [18, -24, -54] }}
          transition={{ delay: dot.delay, duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}

      <motion.div
        className="absolute left-6 top-16 hidden h-[78vh] w-[28vw] max-w-[26rem] opacity-30 md:block"
        initial={{ opacity: 0, x: -34 }}
        animate={{ opacity: 0.3, x: 0 }}
        transition={{ duration: 1.1, ease: 'easeOut' }}
      >
        <motion.div
          className="absolute inset-y-0 left-1/2 w-[3px] rounded-full bg-cyan-300/70 shadow-[0_0_32px_rgba(34,211,238,0.8)]"
          animate={{ opacity: [0.35, 1, 0.35] }}
          transition={{ duration: 2.3, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="absolute left-[38%] top-[18%] h-44 w-28 rounded-[45%] border border-cyan-200/20 bg-cyan-300/10 blur-[1px]" />
        <div className="absolute left-[29%] top-[34%] h-64 w-48 rounded-[45%] border border-cyan-200/20 bg-blue-400/10 blur-[1px]" />
        <div className="absolute left-[43%] top-[9%] h-20 w-16 rounded-full border border-cyan-200/20 bg-blue-300/10" />
      </motion.div>

      <motion.div
        className="absolute right-4 top-24 hidden h-28 w-72 rounded-[2rem] border border-white/15 bg-white/8 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl lg:block"
        initial={{ opacity: 0, x: 42, rotate: 4 }}
        animate={{ opacity: 1, x: 0, rotate: 0, y: [0, -10, 0] }}
        transition={{ opacity: { delay: 0.5, duration: 0.6 }, x: { delay: 0.5, duration: 0.6 }, rotate: { delay: 0.5, duration: 0.6 }, y: { duration: 4, repeat: Infinity, ease: 'easeInOut' } }}
      >
        <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.24em] text-cyan-100">
          <Sparkles size={15} /> Premium
        </div>
        <div className="h-2 rounded-full bg-white/15">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-purple-300 shadow-[0_0_20px_rgba(103,232,249,0.65)]"
            initial={{ width: '12%' }}
            animate={{ width: ['12%', '86%', '48%', '96%'] }}
            transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <span className="h-2 rounded-full bg-cyan-200/50" />
          <span className="h-2 rounded-full bg-blue-200/40" />
          <span className="h-2 rounded-full bg-purple-200/50" />
        </div>
      </motion.div>

      <motion.div
        className="absolute bottom-12 left-1/2 hidden h-24 w-[44rem] -translate-x-1/2 overflow-hidden opacity-50 md:block"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        transition={{ delay: 0.7, duration: 0.8 }}
      >
        <motion.svg
          viewBox="0 0 900 120"
          className="h-full w-full drop-shadow-[0_0_18px_rgba(34,211,238,0.65)]"
          preserveAspectRatio="none"
        >
          <motion.path
            d="M0 62 L120 62 L145 62 L162 28 L190 96 L222 62 L330 62 L352 40 L375 82 L402 62 L520 62 L545 20 L580 102 L612 62 L900 62"
            fill="none"
            stroke="rgba(125, 249, 255, 0.78)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: [0, 1, 1], opacity: [0, 1, 0.45] }}
            transition={{ duration: 3.2, repeat: Infinity, repeatDelay: 0.45, ease: 'easeInOut' }}
          />
        </motion.svg>
      </motion.div>

      <motion.div
        className="relative z-10 w-full max-w-4xl text-center"
        initial={{ y: 22, opacity: 0, scale: 0.97 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.div
          className="fch-splash-glass mx-auto mb-7 flex w-fit items-center justify-center rounded-[2rem] border border-white/25 bg-slate-950/45 px-7 py-5 shadow-[0_24px_90px_rgba(0,0,0,0.45),0_0_80px_rgba(56,189,248,0.22)] backdrop-blur-2xl"
          initial={{ opacity: 0, y: -14, scale: 0.92 }}
          animate={{
            opacity: 1,
            y: 0,
            scale: 1,
            boxShadow: [
              '0 24px 90px rgba(14,165,233,0.16)',
              '0 28px 110px rgba(168,85,247,0.34)',
              '0 24px 90px rgba(14,165,233,0.16)',
            ],
          }}
          transition={{ opacity: { duration: 0.55 }, y: { duration: 0.55 }, scale: { duration: 0.55 }, boxShadow: { duration: 3.5, repeat: Infinity, ease: 'easeInOut' } }}
        >
          <motion.div
            className="fch-splash-logo select-none text-3xl font-black tracking-tight sm:text-4xl"
            aria-label="FisioCareHub"
            animate={{ y: [0, -2, 0] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
          >
            <span className="text-white drop-shadow-[0_0_18px_rgba(255,255,255,0.35)]">Fisio</span>
            <span className="fch-splash-logo-care bg-gradient-to-r from-cyan-200 via-sky-300 to-blue-300 bg-clip-text text-transparent drop-shadow-[0_0_22px_rgba(56,189,248,0.65)]">Care</span>
            <span className="text-white drop-shadow-[0_0_18px_rgba(255,255,255,0.35)]">Hub</span>
          </motion.div>
        </motion.div>

        <motion.div
          className="relative mx-auto mb-8 flex h-28 w-28 items-center justify-center"
          initial={{ opacity: 0, scale: 0.72 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.16, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            className="absolute inset-0 rounded-full border border-cyan-200/45 shadow-[0_0_80px_rgba(34,211,238,0.46)]"
            animate={{ scale: [1, 1.18, 1], opacity: [0.7, 0.2, 0.7] }}
            transition={{ duration: 2.3, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute inset-3 rounded-full border border-purple-200/35"
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          />
          <motion.div
            className="flex h-20 w-20 items-center justify-center rounded-full border border-cyan-100/40 bg-gradient-to-br from-cyan-300/45 via-blue-500/35 to-purple-400/45 shadow-[inset_0_0_28px_rgba(255,255,255,0.12),0_0_60px_rgba(34,211,238,0.45)] backdrop-blur-xl"
            animate={{ scale: [1, 1.08, 1], rotate: [0, 2, -2, 0] }}
            transition={{ duration: 1.9, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Icon className="text-cyan-100 drop-shadow-[0_0_16px_rgba(103,232,249,0.9)]" size={34} />
          </motion.div>
        </motion.div>

        <motion.p
          className="mb-3 text-sm font-black uppercase tracking-[0.34em] text-cyan-100 drop-shadow-[0_0_14px_rgba(103,232,249,0.65)]"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22, duration: 0.6 }}
        >
          Experiência premium
        </motion.p>

        <motion.h1
          className="fch-splash-title mx-auto max-w-4xl text-3xl font-black leading-tight tracking-tight text-white drop-shadow-[0_0_28px_rgba(255,255,255,0.22)] sm:text-5xl lg:text-6xl"
          initial={{ opacity: 0, y: 14, filter: 'blur(10px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ delay: 0.34, duration: 0.82, ease: [0.22, 1, 0.36, 1] }}
        >
          {title}
        </motion.h1>

        <motion.p
          className="fch-splash-subtitle mx-auto mt-5 max-w-2xl text-base font-semibold text-slate-100 drop-shadow-[0_0_18px_rgba(15,23,42,0.75)] sm:text-xl"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.54, duration: 0.65 }}
        >
          {subtitle}
        </motion.p>

        <motion.div
          className="mx-auto mt-8 grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.13, delayChildren: 0.72 } },
          }}
        >
          {steps.map((step) => {
            const StepIcon = step.icon;
            return (
              <motion.div
                key={step.label}
                className="rounded-2xl border border-white/18 bg-white/10 px-4 py-3 text-left shadow-[0_16px_50px_rgba(0,0,0,0.24)] backdrop-blur-xl"
                variants={{
                  hidden: { opacity: 0, y: 18, scale: 0.94 },
                  visible: { opacity: 1, y: 0, scale: 1 },
                }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-300/18 text-cyan-100 shadow-[0_0_22px_rgba(103,232,249,0.22)]">
                    <StepIcon size={18} />
                  </span>
                  <span className="text-sm font-black text-slate-100">{step.label}</span>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        <motion.div
          className="fch-splash-card mx-auto mt-7 max-w-xl rounded-[2rem] border border-white/25 bg-slate-950/45 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.38),0_0_70px_rgba(99,102,241,0.2)] backdrop-blur-2xl"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.94, duration: 0.7 }}
        >
          <div className="fch-splash-muted mb-4 flex items-center justify-center gap-3 text-sm font-bold text-slate-100 sm:text-base">
            <motion.span
              animate={{ scale: [1, 1.18, 1] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <CheckCircle2 className="text-cyan-200 drop-shadow-[0_0_14px_rgba(103,232,249,0.8)]" size={22} />
            </motion.span>
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

          <motion.p
            className="fch-splash-entering mt-4 text-xs font-black uppercase tracking-[0.26em] text-slate-200/95"
            animate={{ opacity: [0.65, 1, 0.65] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          >
            Entrando no Dashboard...
          </motion.p>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
