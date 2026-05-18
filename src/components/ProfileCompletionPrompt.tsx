import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, ChevronRight, Clock3, UserCog, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

type MissingField = {
  key: string;
  label: string;
  important?: boolean;
};

const SNOOZE_HOURS = 24;

const isFilled = (value: unknown) => {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'string') return value.trim().length > 0;
  return value !== null && value !== undefined && value !== false;
};

const firstAvailable = (...values: unknown[]) => values.find(isFilled);

function getMissingFields(profile: any): MissingField[] {
  if (!profile) return [];

  const role = profile.tipo_usuario;

  if (role === 'admin') return [];

  const common: MissingField[] = [
    { key: 'nome_completo', label: 'nome completo', important: true },
    { key: 'telefone', label: 'telefone de contato', important: true },
    { key: 'cidade_estado', label: 'cidade e estado', important: true },
  ].filter((field) => {
    if (field.key === 'cidade_estado') {
      return !isFilled(firstAvailable(profile.cidade, profile.localizacao)) || !isFilled(profile.estado);
    }

    return !isFilled(profile[field.key]);
  });

  if (role === 'fisioterapeuta') {
    const physioChecks: MissingField[] = [
      { key: 'cpf_cnpj', label: 'CPF/CNPJ', important: true },
      { key: 'crefito', label: 'CREFITO', important: true },
      { key: 'especialidade', label: 'especialidade', important: true },
      { key: 'tipo_servico', label: 'tipo de atendimento', important: true },
      { key: 'bio', label: 'biografia profissional' },
      { key: 'experiencia_profissional', label: 'experiência profissional' },
      { key: 'formacao_academica', label: 'formação acadêmica' },
      { key: 'servicos_ofertados', label: 'serviços ofertados', important: true },
      { key: 'avatar', label: 'foto de perfil' },
      { key: 'documentos', label: 'documentos profissionais' },
    ].filter((field) => {
      if (field.key === 'cpf_cnpj') return !isFilled(firstAvailable(profile.cpf_cnpj, profile.cpf));
      if (field.key === 'avatar') return !isFilled(firstAvailable(profile.avatar_url, profile.foto_url));
      if (field.key === 'documentos') {
        const hasLegacyDocument = isFilled(profile.documentos);
        const hasProfessionalDocs = [
          profile.rg_frente_url,
          profile.rg_verso_url,
          profile.crefito_frente_url,
          profile.crefito_verso_url,
        ].some(isFilled);

        return !hasLegacyDocument && !hasProfessionalDocs;
      }

      return !isFilled(profile[field.key]);
    });

    return [...common, ...physioChecks];
  }

  const patientChecks: MissingField[] = [
    { key: 'data_nascimento', label: 'data de nascimento' },
    { key: 'observacoes_saude', label: 'observações de saúde' },
  ].filter((field) => !isFilled(profile[field.key]));

  return [...common, ...patientChecks];
}

function getSnoozeKey(userId?: string) {
  return userId ? `fch_profile_completion_snoozed_until_${userId}` : 'fch_profile_completion_snoozed_until';
}

export default function ProfileCompletionPrompt() {
  const { user, profile, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);

  const missingFields = useMemo(() => getMissingFields(profile), [profile]);
  const importantMissing = useMemo(
    () => missingFields.filter((field) => field.important),
    [missingFields]
  );

  const isProfilePage = location.pathname === '/profile' || location.pathname === '/area-paciente';
  const isAuthPage = ['/login', '/register', '/reset-password'].includes(location.pathname);
  const isAdminPage = location.pathname.startsWith('/admin') || profile?.tipo_usuario === 'admin';
  const isWaitingPage = location.pathname === '/aguardando-aprovacao';
  const shouldCheck = Boolean(
    user &&
    profile &&
    !loading &&
    !isProfilePage &&
    !isAuthPage &&
    !isAdminPage &&
    !isWaitingPage &&
    missingFields.length > 0
  );

  useEffect(() => {
    if (!shouldCheck) {
      setIsVisible(false);
      return;
    }

    const snoozeUntil = Number(localStorage.getItem(getSnoozeKey(user?.id)) || '0');
    const dismissedThisSession = sessionStorage.getItem(`fch_profile_completion_dismissed_${user?.id}`) === 'true';

    if (Date.now() < snoozeUntil || dismissedThisSession) {
      setIsVisible(false);
      return;
    }

    const timer = window.setTimeout(() => setIsVisible(true), 650);
    return () => window.clearTimeout(timer);
  }, [shouldCheck, user?.id, location.pathname]);

  const handleSnooze = () => {
    if (!user) return;
    const snoozeUntil = Date.now() + SNOOZE_HOURS * 60 * 60 * 1000;
    localStorage.setItem(getSnoozeKey(user.id), String(snoozeUntil));
    setIsVisible(false);
  };

  const handleDismissSession = () => {
    if (user) {
      sessionStorage.setItem(`fch_profile_completion_dismissed_${user.id}`, 'true');
    }
    setIsVisible(false);
  };

  const handleGoToProfile = () => {
    if (!profile) return;
    setIsVisible(false);
    const tab = profile.tipo_usuario === 'fisioterapeuta' ? 'profile_prof' : 'profile';
    navigate(`/profile?tab=${tab}&complete=1`);
  };

  if (!user || !profile) return null;

  const isPhysio = profile.tipo_usuario === 'fisioterapeuta';
  const title = isPhysio ? 'Complete seu perfil profissional' : 'Atualize seus dados cadastrais';
  const description = isPhysio
    ? 'Encontramos informações importantes em aberto. Complete seus dados para melhorar sua aprovação, aparecer corretamente no marketplace e receber pacientes com segurança.'
    : 'Algumas informações do seu cadastro ainda estão incompletas. Atualize seus dados para facilitar agendamentos e melhorar o atendimento do fisioterapeuta.';

  const previewFields = missingFields.slice(0, 4);
  const extraCount = Math.max(0, missingFields.length - previewFields.length);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/55 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-[calc(env(safe-area-inset-top)+1rem)] backdrop-blur-md sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-completion-title"
            className="relative w-full max-w-lg overflow-hidden rounded-[2rem] border border-white/10 bg-white text-slate-950 shadow-2xl dark:bg-[#0b1224] dark:text-white"
            initial={{ y: 36, scale: 0.96, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 24, scale: 0.98, opacity: 0 }}
            transition={{ type: 'spring', damping: 24, stiffness: 260 }}
          >
            <div className="absolute inset-0 pointer-events-none opacity-80 dark:opacity-100">
              <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
              <div className="absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-purple-500/20 blur-3xl" />
            </div>

            <button
              type="button"
              onClick={handleDismissSession}
              className="absolute right-4 top-4 z-10 rounded-full bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/15 dark:hover:text-white"
              aria-label="Fechar aviso"
            >
              <X size={18} />
            </button>

            <div className="relative p-6 sm:p-8">
              <div className="mb-5 flex items-start gap-4 pr-10">
                <div className={cn(
                  'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-lg',
                  importantMissing.length > 0
                    ? 'bg-amber-500 text-white shadow-amber-500/25'
                    : 'bg-blue-600 text-white shadow-blue-500/25'
                )}>
                  {importantMissing.length > 0 ? <AlertCircle size={28} /> : <UserCog size={28} />}
                </div>
                <div>
                  <p className="mb-1 text-xs font-black uppercase tracking-[0.22em] text-blue-600 dark:text-blue-300">
                    FisioCareHub
                  </p>
                  <h2 id="profile-completion-title" className="text-2xl font-black leading-tight text-slate-950 dark:text-white">
                    {title}
                  </h2>
                </div>
              </div>

              <p className="text-sm font-semibold leading-relaxed text-slate-600 dark:text-slate-300">
                {description}
              </p>

              <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Pendências encontradas
                  </span>
                  <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white dark:bg-white dark:text-slate-950">
                    {missingFields.length}
                  </span>
                </div>

                <div className="space-y-2">
                  {previewFields.map((field) => (
                    <div key={field.key} className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                      <CheckCircle2 size={16} className="text-blue-500" />
                      <span>Adicionar {field.label}</span>
                    </div>
                  ))}

                  {extraCount > 0 && (
                    <p className="pl-6 text-xs font-bold text-slate-500 dark:text-slate-400">
                      + {extraCount} item{extraCount > 1 ? 's' : ''} para revisar em Minha Conta
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto]">
                <button
                  type="button"
                  onClick={handleGoToProfile}
                  className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-4 text-sm font-black uppercase tracking-[0.12em] text-white shadow-xl shadow-blue-600/25 transition hover:bg-blue-700 active:scale-[0.99]"
                >
                  Atualizar agora
                  <ChevronRight size={18} className="transition group-hover:translate-x-0.5" />
                </button>

                <button
                  type="button"
                  onClick={handleSnooze}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 px-5 py-4 text-sm font-black uppercase tracking-[0.12em] text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/[0.06] sm:w-auto"
                >
                  <Clock3 size={17} />
                  Lembrar depois
                </button>
              </div>

              <p className="mt-4 text-center text-xs font-semibold text-slate-400 dark:text-slate-500">
                Esse aviso aparece apenas quando existem dados importantes incompletos.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
