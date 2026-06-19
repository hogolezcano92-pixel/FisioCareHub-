import { useEffect, useMemo, useRef } from 'react';
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
import { startPostLoginSplashSound } from '../lib/postLoginSplashSound';

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

const floatingDots = Array.from({ length: 22 }, (_, index) => ({
  id: index,
  left: `${8 + ((index * 17) % 84)}%`,
  top: `${10 + ((index * 23) % 78)}%`,
  delay: 0.08 * index,
  size: index % 3 === 0 ? 'h-2.5 w-2.5' : index % 3 === 1 ? 'h-1.5 w-1.5' : 'h-2 w-2',
}));
const playfulShapes = Array.from({ length: 10 }, (_, index) => ({
  id: index,
  left: `${5 + ((index * 19) % 88)}%`,
  top: `${8 + ((index * 31) % 76)}%`,
  delay: 0.22 * index,
  rotate: index % 2 === 0 ? 12 : -14,
  shape: index % 3 === 0 ? 'rounded-[42%_58%_55%_45%]' : index % 3 === 1 ? 'rounded-full' : 'rounded-2xl',
  size: index % 4 === 0 ? 'h-12 w-12' : index % 4 === 1 ? 'h-8 w-8' : index % 4 === 2 ? 'h-10 w-10' : 'h-6 w-6',
}));

const splitText = (text: string) => text.split('');


type SplashSoundCleanup = () => void;


export default function PostLoginSplash({
  userRole = 'paciente',
  userName,
  duration = 15000,
  onComplete,
}: PostLoginSplashProps) {
  const isPhysio = userRole === 'fisioterapeuta';
  const isAdmin = userRole === 'admin';
  const displayName = getFirstName(userName);
  const splashDuration = Math.max(duration, 15000);
  const progressDuration = splashDuration / 1000;

  const hasStartedSound = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => onComplete?.(), splashDuration);
    return () => window.clearTimeout(timer);
  }, [splashDuration, onComplete]);

  useEffect(() => {
    if (hasStartedSound.current) return;
    hasStartedSound.current = true;

    const stopSound: SplashSoundCleanup = startPostLoginSplashSound(splashDuration);
    return () => stopSound();
  }, [splashDuration]);

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
        { icon: ShieldCheck, label: 'Segurança ativa', accent: 'admin-security' },
        { icon: Activity, label: 'Dados sincronizados', accent: 'admin-data' },
        { icon: CheckCircle2, label: 'Gestão pronta', accent: 'admin-ready' },
      ];
    }

    if (isPhysio) {
      return [
        { icon: CalendarCheck2, label: 'Agenda pronta', accent: 'physio-calendar' },
        { icon: Activity, label: 'Pacientes conectados', accent: 'physio-patients' },
        { icon: CheckCircle2, label: 'Atendimento liberado', accent: 'physio-check' },
      ];
    }

    return [
      { icon: HeartPulse, label: 'Cuidado ativo', accent: 'patient-care' },
      { icon: Activity, label: 'Evolução acompanhada', accent: 'patient-progress' },
      { icon: CheckCircle2, label: 'Dashboard pronto', accent: 'patient-ready' },
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

      {playfulShapes.map((shape) => (
        <motion.span
          key={shape.id}
          className={`absolute z-0 border border-white/18 bg-white/10 shadow-[0_18px_60px_rgba(34,211,238,0.18)] backdrop-blur-md ${shape.size} ${shape.shape}`}
          style={{ left: shape.left, top: shape.top }}
          initial={{ opacity: 0, scale: 0.35, rotate: shape.rotate }}
          animate={{
            opacity: [0, 0.72, 0.38, 0.68],
            scale: [0.35, 1.08, 0.86, 1],
            rotate: [shape.rotate, shape.rotate * -1, shape.rotate, shape.rotate * 0.25],
            y: [0, -18, 10, -8],
            x: [0, shape.id % 2 === 0 ? 18 : -18, 0],
          }}
          transition={{ delay: shape.delay, duration: 5.8, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}

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
          className="fch-splash-glass fch-splash-logo-wrap relative mx-auto mb-7 flex w-fit items-center justify-center overflow-visible rounded-none border-0 bg-transparent px-2 py-2 shadow-none backdrop-blur-0"
          initial={{ opacity: 0, y: -22, scale: 0.88, rotateX: -10 }}
          animate={{
            opacity: 1,
            y: [0, -3, 0],
            scale: [1, 1.018, 1],
            rotateX: 0,
          }}
          transition={{
            opacity: { duration: 0.55 },
            y: { duration: 3.4, repeat: Infinity, ease: 'easeInOut' },
            scale: { duration: 3.4, repeat: Infinity, ease: 'easeInOut' },
            rotateX: { duration: 0.65, ease: [0.22, 1, 0.36, 1] },
          }}
        >
          <motion.span
            className="pointer-events-none absolute -left-12 top-1/2 h-px w-[calc(100%+6rem)] -translate-y-1/2 bg-gradient-to-r from-transparent via-cyan-200/75 to-transparent blur-[1px]"
            animate={{ opacity: [0.16, 0.78, 0.16], scaleX: [0.72, 1.06, 0.72] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.span
            className="pointer-events-none absolute -inset-x-8 top-1/2 h-16 -translate-y-1/2 rounded-full bg-gradient-to-r from-purple-500/0 via-cyan-300/16 to-purple-400/0 blur-2xl"
            animate={{ opacity: [0.32, 0.75, 0.32], scale: [0.92, 1.08, 0.92] }}
            transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.span
            className="pointer-events-none absolute -left-7 top-3 h-2 w-2 rounded-full bg-fuchsia-200 shadow-[0_0_18px_rgba(232,121,249,0.9)]"
            animate={{ x: [0, 36, 0], y: [0, -10, 0], opacity: [0.35, 1, 0.35], scale: [0.8, 1.25, 0.8] }}
            transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.span
            className="pointer-events-none absolute -right-7 top-1 h-2.5 w-2.5 rounded-full bg-cyan-100 shadow-[0_0_20px_rgba(103,232,249,0.95)]"
            animate={{ x: [0, -34, 0], y: [0, 11, 0], opacity: [0.42, 1, 0.42], scale: [0.75, 1.22, 0.75] }}
            transition={{ duration: 3.1, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="fch-splash-logo relative z-10 select-none text-4xl font-black tracking-tight sm:text-5xl"
            aria-label="FisioCareHub"
            initial={{ opacity: 0, scale: 0.92, filter: 'blur(8px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)', y: [0, -2, 0] }}
            transition={{
              opacity: { delay: 0.1, duration: 0.55 },
              scale: { delay: 0.1, type: 'spring', stiffness: 420, damping: 18 },
              filter: { delay: 0.1, duration: 0.55 },
              y: { duration: 2.8, repeat: Infinity, ease: 'easeInOut' },
            }}
          >
            <motion.span
              className="inline-block bg-gradient-to-r from-white via-cyan-100 to-purple-200 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(255,255,255,0.45)]"
              animate={{ textShadow: ['0 0 14px rgba(255,255,255,0.26)', '0 0 30px rgba(103,232,249,0.4)', '0 0 14px rgba(255,255,255,0.26)'] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
            >
              Fisio
            </motion.span>
            <motion.span
              className="fch-splash-logo-care inline-block bg-gradient-to-r from-cyan-200 via-sky-300 to-blue-200 bg-clip-text text-transparent drop-shadow-[0_0_24px_rgba(56,189,248,0.75)]"
              animate={{ scale: [1, 1.045, 1], textShadow: ['0 0 18px rgba(103,232,249,0.5)', '0 0 34px rgba(125,211,252,0.95)', '0 0 18px rgba(103,232,249,0.5)'] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
            >
              Care
            </motion.span>
            <motion.span
              className="inline-block bg-gradient-to-r from-white via-violet-100 to-cyan-100 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(255,255,255,0.42)]"
              animate={{ textShadow: ['0 0 14px rgba(255,255,255,0.25)', '0 0 30px rgba(168,85,247,0.42)', '0 0 14px rgba(255,255,255,0.25)'] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
            >
              Hub
            </motion.span>
          </motion.div>
        </motion.div>

        <motion.div
          className="relative mx-auto mb-8 flex h-28 w-28 items-center justify-center"
          initial={{ opacity: 0, scale: 0.72 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.1, duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
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
            animate={{ scale: [1, 1.14, 0.96, 1.08, 1], rotate: [0, -6, 5, -2, 0], y: [0, -7, 1, -4, 0] }}
            transition={{ duration: 2.15, repeat: Infinity, ease: 'easeInOut' }}
          >
            <motion.span
              className="absolute -right-2 -top-2 h-5 w-5 rounded-full bg-yellow-200 shadow-[0_0_18px_rgba(254,240,138,0.85)]"
              animate={{ scale: [0.7, 1.2, 0.9], rotate: [0, 20, -10, 0] }}
              transition={{ duration: 1.25, repeat: Infinity, ease: 'easeInOut' }}
            />
            <Icon className="text-cyan-100 drop-shadow-[0_0_16px_rgba(103,232,249,0.9)]" size={34} />
          </motion.div>
        </motion.div>

        <motion.p
          className="mb-3 text-sm font-black uppercase tracking-[0.34em] text-cyan-100 drop-shadow-[0_0_14px_rgba(103,232,249,0.65)]"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: [0, -4, 0], scale: [1, 1.04, 1] }}
          transition={{ opacity: { delay: 1.75, duration: 0.65 }, y: { delay: 1.75, duration: 2.2, repeat: Infinity, ease: 'easeInOut' }, scale: { delay: 1.75, duration: 2.2, repeat: Infinity, ease: 'easeInOut' } }}
        >
          ✨ Experiência premium
        </motion.p>

        <h1
          className="fch-splash-title mx-auto max-w-4xl text-3xl font-black leading-tight tracking-tight text-white drop-shadow-[0_0_28px_rgba(255,255,255,0.22)] sm:text-5xl lg:text-6xl"
          aria-label={title}
        >
          {splitText(title).map((letter, index) => (
            <motion.span
              key={`${letter}-${index}`}
              className="inline-block"
              initial={{ opacity: 0, y: 30, scale: 0.58, rotate: -10, filter: 'blur(8px)' }}
              animate={{
                opacity: 1,
                y: [0, index % 2 === 0 ? -3 : 3, 0],
                scale: 1,
                rotate: [0, index % 3 === 0 ? 1.2 : -1.2, 0],
                filter: 'blur(0px)',
              }}
              transition={{
                opacity: { delay: 2.35 + index * 0.025, duration: 0.35 },
                y: { delay: 2.35 + index * 0.025, duration: 2.8 + (index % 5) * 0.12, repeat: Infinity, ease: 'easeInOut' },
                rotate: { delay: 2.35 + index * 0.025, duration: 3.2 + (index % 4) * 0.1, repeat: Infinity, ease: 'easeInOut' },
                scale: { delay: 2.35 + index * 0.025, type: 'spring', stiffness: 520, damping: 17 },
                filter: { delay: 2.35 + index * 0.025, duration: 0.35 },
              }}
            >
              {letter === ' ' ? '\u00A0' : letter}
            </motion.span>
          ))}
        </h1>

        <p
          className="fch-splash-subtitle mx-auto mt-5 flex max-w-2xl flex-wrap justify-center gap-x-1.5 gap-y-2 text-base font-semibold text-slate-100 drop-shadow-[0_0_18px_rgba(15,23,42,0.75)] sm:text-xl"
        >
          {subtitle.split(' ').map((word, index) => (
            <motion.span
              key={`${word}-${index}`}
              className="inline-block"
              initial={{ opacity: 0, y: 16, scale: 0.82 }}
              animate={{ opacity: 1, y: [0, -4, 0], scale: 1 }}
              transition={{
                opacity: { delay: 3.35 + index * 0.055, duration: 0.35 },
                y: { delay: 3.35 + index * 0.055, duration: 3.4, repeat: Infinity, ease: 'easeInOut' },
                scale: { delay: 3.35 + index * 0.055, type: 'spring', stiffness: 420, damping: 18 },
              }}
            >
              {word}
            </motion.span>
          ))}
        </p>

        <motion.div
          className="mx-auto mt-8 grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.28, delayChildren: 4.25 } },
          }}
        >
          {steps.map((step, index) => {
            const StepIcon = step.icon;
            return (
              <motion.div
                key={step.label}
                className="rounded-2xl border border-white/18 bg-white/10 px-4 py-3 text-left shadow-[0_16px_50px_rgba(0,0,0,0.24)] backdrop-blur-xl"
                initial={{ opacity: 0, y: 18, scale: 0.94, rotate: -3 }}
                animate={{ opacity: 1, y: [0, -8, 0], rotate: [0, 1.4, -1.4, 0], scale: [1, 1.025, 1] }}
                transition={{
                  opacity: { delay: 4.25 + index * 0.28, duration: 0.45 },
                  y: { delay: 4.25 + index * 0.28, duration: 3.2, repeat: Infinity, ease: 'easeInOut' },
                  rotate: { delay: 4.25 + index * 0.28, duration: 3.2, repeat: Infinity, ease: 'easeInOut' },
                  scale: { delay: 4.25 + index * 0.28, duration: 3.2, repeat: Infinity, ease: 'easeInOut' },
                }}
              >
                <div className="flex items-center gap-3">
                  <span className={`fch-splash-step-icon fch-splash-step-icon-${step.accent} flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-300/18 text-cyan-100 shadow-[0_0_22px_rgba(103,232,249,0.22)]`}>
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
          transition={{ delay: 5.45, duration: 0.75 }}
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
