import { useMemo, useRef, useState } from 'react';
import {
  Award,
  CheckCircle2,
  Copy,
  Crown,
  Download,
  ExternalLink,
  MapPin,
  QrCode,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
  UserRound,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn, resolveStorageUrl } from '../lib/utils';

const safeText = (value: unknown, fallback = 'Não informado') => {
  const text = String(value ?? '').trim();
  return text || fallback;
};

const getServiceLabel = (type?: string | null) => {
  const normalized = String(type || '').toLowerCase();
  if (normalized === 'online') return 'Online';
  if (normalized === 'domicilio') return 'Domiciliar';
  if (normalized === 'ambos') return 'Domiciliar e online';
  return 'Atendimento fisioterapêutico';
};

type ProfessionalCredentialCardProps = {
  profile: any;
  isPro?: boolean;
  appointmentsCount?: number;
  ratingAverage?: number;
  reviewsCount?: number;
  variant?: 'full' | 'compact';
  className?: string;
};

export default function ProfessionalCredentialCard({
  profile,
  isPro = false,
  appointmentsCount,
  ratingAverage,
  reviewsCount,
  variant = 'full',
  className,
}: ProfessionalCredentialCardProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);

  const profileId = profile?.id || profile?.user_id || '';
  const publicProfileUrl = useMemo(() => {
    if (!profileId || typeof window === 'undefined') return '';
    return `${window.location.origin}/physio/${profileId}`;
  }, [profileId]);

  const qrCodeUrl = publicProfileUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=8&data=${encodeURIComponent(publicProfileUrl)}`
    : '';

  const professionalName = safeText(profile?.nome_completo || profile?.nome || profile?.name, 'Fisioterapeuta');
  const specialty = safeText(profile?.especialidade || profile?.especialidade_principal || profile?.specialty, 'Fisioterapia');
  const crefito = safeText(profile?.crefito || profile?.registro_profissional || profile?.numero_crefito, 'CREFITO pendente');
  const city = safeText(profile?.localizacao || [profile?.cidade, profile?.estado].filter(Boolean).join(', '), 'Região não informada');
  const avatarUrl = resolveStorageUrl(profile?.avatar_url || '') || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profileId || professionalName}`;
  const approved = String(profile?.status_aprovacao || '').toLowerCase() === 'aprovado' || Boolean(profile?.aprovado || profile?.verificado);
  const issuedAt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date());
  const credentialCode = profileId ? `FCH-${String(profileId).slice(0, 8).toUpperCase()}` : 'FCH-PERFIL';
  const ratingText = ratingAverage && ratingAverage > 0 ? ratingAverage.toFixed(1).replace('.', ',') : 'Novo';
  const totalAppointmentsText = typeof appointmentsCount === 'number' ? String(appointmentsCount) : '—';
  const totalReviewsText = typeof reviewsCount === 'number' ? String(reviewsCount) : '—';
  const services = Array.isArray(profile?.servicos_ofertados) ? profile.servicos_ofertados.filter(Boolean).slice(0, 3) : [];

  const handleShareCredential = async () => {
    if (!publicProfileUrl || sharing) return;
    setSharing(true);

    const shareText = `${professionalName} • ${specialty} • Credencial Digital FisioCareHub`;

    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({
          title: 'Credencial Digital FisioCareHub',
          text: shareText,
          url: publicProfileUrl,
        });
        return;
      }

      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(publicProfileUrl);
        toast.success('Link da credencial copiado.');
        return;
      }

      toast.info('Copie o link do perfil público para compartilhar a credencial.');
    } catch (error) {
      if ((error as Error)?.name !== 'AbortError') {
        console.error('Erro ao compartilhar credencial:', error);
        toast.error('Não foi possível compartilhar a credencial agora.');
      }
    } finally {
      setSharing(false);
    }
  };

  const handleDownloadCredential = async () => {
    if (!cardRef.current || downloading) return;
    setDownloading(true);

    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: null,
        useCORS: true,
        allowTaint: false,
        logging: false,
      });
      const imageUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = `credencial-fisiocarehub-${professionalName.toLowerCase().replace(/[^a-z0-9]+/gi, '-') || 'profissional'}.png`;
      link.click();
      toast.success('Credencial baixada como imagem.');
    } catch (error) {
      console.error('Erro ao baixar credencial:', error);
      toast.error('Não foi possível baixar a credencial. Tente novamente após a imagem carregar.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-[2rem] border border-sky-200/70 bg-white p-4 shadow-xl shadow-sky-100/70 dark:border-white/10 dark:bg-slate-900/50 dark:shadow-black/20 sm:rounded-[3rem] sm:p-6',
        className,
      )}
    >
      <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-sky-400/20 blur-3xl dark:bg-blue-500/20" />
      <div className="absolute -bottom-24 -left-16 h-60 w-60 rounded-full bg-emerald-400/20 blur-3xl dark:bg-emerald-500/10" />

      <div className="relative z-10 mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between" data-html2canvas-ignore="true">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300">
            <Crown size={14} fill="currentColor" />
            Credencial premium
          </div>
          {variant === 'full' && (
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-relaxed text-slate-600 dark:text-slate-400">
              Cartão digital para o fisioterapeuta compartilhar seu perfil profissional verificado dentro do FisioCareHub.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={handleShareCredential}
            disabled={!publicProfileUrl || sharing}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-700 shadow-sm transition-all hover:border-sky-300 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
          >
            {sharing ? <Sparkles size={15} /> : <Share2 size={15} />}
            Compartilhar
          </button>
          <button
            type="button"
            onClick={handleDownloadCredential}
            disabled={downloading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-600 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-sky-500/20 transition-all hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Download size={15} />
            {downloading ? 'Gerando...' : 'Baixar imagem'}
          </button>
        </div>
      </div>

      <div
        ref={cardRef}
        className="relative z-10 overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950 p-6 text-white shadow-2xl shadow-slate-900/20 sm:rounded-[2.5rem] sm:p-8"
      >
        <div className="absolute left-0 top-0 h-full w-full opacity-60">
          <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-sky-500/30 blur-3xl" />
          <div className="absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="absolute left-1/2 top-1/2 h-px w-[80%] -translate-x-1/2 rotate-12 bg-white/10" />
        </div>

        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-stretch lg:justify-between">
          <div className="flex-1 space-y-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.32em] text-sky-300">FisioCareHub</p>
                <h3 className="mt-1 text-xl font-black tracking-tight sm:text-2xl">Credencial Digital</h3>
              </div>
              <div className={cn(
                'inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-widest',
                approved
                  ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200'
                  : 'border-amber-300/30 bg-amber-400/10 text-amber-200',
              )}>
                <ShieldCheck size={14} />
                {approved ? 'Profissional verificado' : 'Em validação'}
              </div>
            </div>

            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-[2rem] border-4 border-white/10 bg-white/10 shadow-2xl">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={professionalName}
                    crossOrigin="anonymous"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sky-200">
                    <UserRound size={42} />
                  </div>
                )}
                <div className="absolute bottom-2 right-2 rounded-full border-2 border-slate-950 bg-emerald-500 p-1 text-white">
                  <CheckCircle2 size={14} />
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Fisioterapeuta</p>
                <h4 className="mt-1 text-2xl font-black leading-tight tracking-tight sm:text-3xl">{professionalName}</h4>
                <p className="mt-2 text-sm font-black uppercase tracking-[0.2em] text-sky-300">{specialty}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white/90">
                    CREFITO: {crefito}
                  </span>
                  {isPro && (
                    <span className="rounded-full border border-amber-300/30 bg-amber-400/15 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-amber-200">
                      Plano Pro
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-3xl border border-white/10 bg-white/10 p-4">
                <div className="mb-2 flex items-center gap-2 text-amber-300">
                  <Star size={16} fill="currentColor" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Avaliação</p>
                </div>
                <p className="text-2xl font-black">{ratingText}</p>
                <p className="text-[10px] font-bold text-slate-400">{totalReviewsText} avaliações</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/10 p-4">
                <div className="mb-2 flex items-center gap-2 text-emerald-300">
                  <Award size={16} />
                  <p className="text-[10px] font-black uppercase tracking-widest">Atendimentos</p>
                </div>
                <p className="text-2xl font-black">{totalAppointmentsText}</p>
                <p className="text-[10px] font-bold text-slate-400">na plataforma</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/10 p-4">
                <div className="mb-2 flex items-center gap-2 text-sky-300">
                  <MapPin size={16} />
                  <p className="text-[10px] font-black uppercase tracking-widest">Região</p>
                </div>
                <p className="text-sm font-black leading-tight">{city}</p>
                <p className="text-[10px] font-bold text-slate-400">{getServiceLabel(profile?.tipo_servico)}</p>
              </div>
            </div>

            {services.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {services.map((service: string) => (
                  <span key={service} className="rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-sky-100">
                    {service}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex w-full flex-col justify-between gap-5 rounded-[2rem] border border-white/10 bg-white/10 p-5 backdrop-blur-xl lg:w-64">
            <div className="space-y-3 text-center">
              <div className="mx-auto flex h-36 w-36 items-center justify-center rounded-[1.75rem] border border-white/10 bg-white p-3 shadow-xl">
                {qrCodeUrl ? (
                  <img
                    src={qrCodeUrl}
                    alt="QR Code do perfil profissional"
                    crossOrigin="anonymous"
                    className="h-full w-full rounded-2xl object-contain"
                  />
                ) : (
                  <QrCode className="text-slate-900" size={82} />
                )}
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-300">Aponte a câmera</p>
              <p className="text-xs font-semibold leading-relaxed text-slate-400">Abra o perfil público e valide a credencial dentro da plataforma.</p>
            </div>

            <div className="space-y-3 border-t border-white/10 pt-4">
              <div className="flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <span>Código</span>
                <span className="text-white">{credentialCode}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <span>Emissão</span>
                <span className="text-white">{issuedAt}</span>
              </div>
              {publicProfileUrl && (
                <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-[10px] font-bold text-slate-300">
                  <ExternalLink size={13} className="shrink-0 text-sky-300" />
                  <span className="truncate">{publicProfileUrl}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="relative mt-7 border-t border-white/10 pt-5">
          <p className="text-[10px] font-semibold leading-relaxed text-slate-400">
            Esta credencial identifica o perfil profissional dentro da plataforma FisioCareHub. Ela não substitui documento oficial ou consulta de regularidade junto ao CREFITO.
          </p>
        </div>
      </div>

      {variant === 'full' && publicProfileUrl && (
        <div className="relative z-10 mt-4 flex flex-col gap-3 rounded-[1.75rem] border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex min-w-0 items-center gap-2">
            <ExternalLink size={16} className="shrink-0 text-sky-600 dark:text-sky-300" />
            <span className="truncate">{publicProfileUrl}</span>
          </span>
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(publicProfileUrl);
                toast.success('Link copiado.');
              } catch {
                toast.error('Não foi possível copiar o link.');
              }
            }}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-700 transition-all hover:border-sky-300 hover:text-sky-700 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-200 dark:hover:bg-white/10"
          >
            <Copy size={14} />
            Copiar link
          </button>
        </div>
      )}
    </section>
  );
}
