import { useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Copy,
  Crown,
  Download,
  QrCode,
  Share2,
  ShieldCheck,
  Sparkles,
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

const escapeSvgText = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const svgToDataUrl = (svg: string) => `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;

const getInitials = (name: string) => {
  const parts = name
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) return 'FH';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const createAvatarFallback = (name: string, subtitle: string) => {
  const initials = escapeSvgText(getInitials(name));
  const title = escapeSvgText(name);
  const description = escapeSvgText(subtitle);

  return svgToDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0f172a"/>
          <stop offset="50%" stop-color="#075985"/>
          <stop offset="100%" stop-color="#0f766e"/>
        </linearGradient>
      </defs>
      <rect width="240" height="240" rx="56" fill="url(#g)"/>
      <circle cx="190" cy="44" r="70" fill="#38bdf8" opacity="0.20"/>
      <circle cx="40" cy="198" r="76" fill="#34d399" opacity="0.18"/>
      <text x="120" y="112" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="58" font-weight="900" fill="#ffffff">${initials}</text>
      <text x="120" y="152" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="800" fill="#bae6fd">${title}</text>
      <text x="120" y="178" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="12" font-weight="800" letter-spacing="2" fill="#d1fae5">${description}</text>
    </svg>
  `);
};

const createQrFallback = (profileUrl: string) => {
  const safeUrl = escapeSvgText(profileUrl || 'FisioCareHub');
  const cells = Array.from({ length: 11 }, (_, row) =>
    Array.from({ length: 11 }, (_, col) => {
      const finder =
        (row < 4 && col < 4) ||
        (row < 4 && col > 6) ||
        (row > 6 && col < 4);
      const value = finder || ((row * 7 + col * 11 + safeUrl.length) % 5 < 2);
      return value ? `<rect x="${20 + col * 12}" y="${20 + row * 12}" width="9" height="9" rx="2" fill="#0f172a"/>` : '';
    }).join(''),
  ).join('');

  return svgToDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180">
      <rect width="180" height="180" rx="28" fill="#ffffff"/>
      ${cells}
      <rect x="61" y="74" width="58" height="32" rx="10" fill="#e0f2fe"/>
      <text x="90" y="95" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="12" font-weight="900" fill="#075985">FCH</text>
      <text x="90" y="158" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="8" font-weight="700" fill="#64748b">${safeUrl.slice(0, 38)}</text>
    </svg>
  `);
};

const fileNameFromName = (value: string) => {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'profissional';
};

const urlToDataUrl = async (url: string) => {
  if (!url || url.startsWith('data:')) return url;

  const response = await fetch(url, { mode: 'cors', cache: 'force-cache' });
  if (!response.ok) throw new Error('Falha ao carregar imagem.');

  const blob = await response.blob();

  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Falha ao converter imagem.'));
    reader.readAsDataURL(blob);
  });
};

const loadImageElement = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Falha ao carregar imagem para exportação.'));
    image.src = src;
  });

const downloadBlobUrl = (url: string, fileName: string) => {
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
};

const shortenForCard = (value: string, maxLength = 28) => {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1).trim()}…`;
};

type ExportCredentialData = {
  avatarDataUrl: string;
  qrDataUrl: string;
  approved: boolean;
  city: string;
  credentialCode: string;
  crefito: string;
  issuedAt: string;
  isPro: boolean;
  professionalName: string;
  publicProfileUrl: string;
  serviceLabel: string;
  specialty: string;
};

const buildCredentialSvg = ({
  avatarDataUrl,
  qrDataUrl,
  approved,
  city,
  credentialCode,
  crefito,
  issuedAt,
  isPro,
  professionalName,
  publicProfileUrl,
  serviceLabel,
  specialty,
}: ExportCredentialData) => {
  const safeName = escapeSvgText(shortenForCard(professionalName, 30));
  const safeSpecialty = escapeSvgText(shortenForCard(specialty, 24).toUpperCase());
  const safeCrefito = escapeSvgText(crefito);
  const safeCity = escapeSvgText(shortenForCard(city, 34));
  const safeCode = escapeSvgText(credentialCode);
  const safeIssuedAt = escapeSvgText(issuedAt);
  const safeService = escapeSvgText(serviceLabel);
  const safePath = escapeSvgText(shortenForCard(publicProfileUrl.replace(/^https?:\/\//, ''), 42));
  const verifiedLabel = approved ? 'VERIFICADO' : 'EM VALIDAÇÃO';

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="1016" height="640" viewBox="0 0 1016 640">
      <defs>
        <linearGradient id="cardBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#020617"/>
          <stop offset="48%" stop-color="#07182f"/>
          <stop offset="100%" stop-color="#083344"/>
        </linearGradient>
        <clipPath id="cardClip"><rect x="24" y="24" width="968" height="592" rx="58"/></clipPath>
        <clipPath id="avatarClip"><rect x="64" y="246" width="190" height="190" rx="44"/></clipPath>
        <clipPath id="qrClip"><rect x="790" y="235" width="150" height="150" rx="26"/></clipPath>
        <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="22" stdDeviation="20" flood-color="#000000" flood-opacity="0.35"/>
        </filter>
      </defs>

      <rect x="16" y="16" width="984" height="608" rx="66" fill="#020617" opacity="0.80"/>
      <rect x="24" y="24" width="968" height="592" rx="58" fill="url(#cardBg)" stroke="#7dd3fc" stroke-opacity="0.55" stroke-width="2" filter="url(#softShadow)"/>

      <g clip-path="url(#cardClip)">
        <circle cx="850" cy="86" r="210" fill="#0ea5e9" opacity="0.20"/>
        <circle cx="114" cy="568" r="220" fill="#10b981" opacity="0.15"/>
        <path d="M520 36 L452 604" stroke="#ffffff" stroke-opacity="0.08" stroke-width="3"/>
        <path d="M24 456 C210 396 356 430 510 510 C660 588 816 590 992 520 L992 616 L24 616 Z" fill="#000000" opacity="0.20"/>

        <text x="64" y="88" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="900" letter-spacing="10" fill="#7dd3fc">FISIOCAREHUB</text>
        <text x="64" y="134" font-family="Arial, Helvetica, sans-serif" font-size="42" font-weight="900" fill="#ffffff">Credencial Digital</text>

        <rect x="724" y="64" width="224" height="54" rx="27" fill="#064e3b" fill-opacity="0.64" stroke="#5eead4" stroke-opacity="0.55"/>
        <circle cx="758" cy="91" r="16" fill="#10b981"/>
        <path d="M750 90 L756 96 L768 82" fill="none" stroke="#ffffff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
        <text x="784" y="98" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="900" letter-spacing="2" fill="#d1fae5">${verifiedLabel}</text>

        <rect x="64" y="246" width="190" height="190" rx="44" fill="#0f172a" stroke="#ffffff" stroke-opacity="0.16" stroke-width="8"/>
        <image href="${avatarDataUrl}" x="64" y="246" width="190" height="190" preserveAspectRatio="xMidYMid slice" clip-path="url(#avatarClip)"/>
        <circle cx="222" cy="404" r="32" fill="#10b981" stroke="#ffffff" stroke-width="6"/>
        <path d="M211 402 L220 411 L236 390" fill="none" stroke="#ffffff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>

        <text x="292" y="242" font-family="Arial, Helvetica, sans-serif" font-size="19" font-weight="900" letter-spacing="8" fill="#94a3b8">FISIOTERAPEUTA</text>
        <text x="292" y="304" font-family="Arial, Helvetica, sans-serif" font-size="54" font-weight="900" fill="#ffffff">${safeName}</text>
        <text x="292" y="356" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="900" letter-spacing="7" fill="#67e8f9">${safeSpecialty}</text>

        <rect x="292" y="385" width="260" height="66" rx="33" fill="#ffffff" fill-opacity="0.10" stroke="#ffffff" stroke-opacity="0.16"/>
        <text x="326" y="428" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="900" letter-spacing="3" fill="#f8fafc">CREFITO: ${safeCrefito}</text>

        ${isPro ? `
        <rect x="292" y="466" width="180" height="48" rx="24" fill="#f59e0b" fill-opacity="0.20" stroke="#facc15" stroke-opacity="0.55"/>
        <text x="327" y="497" font-family="Arial, Helvetica, sans-serif" font-size="19" font-weight="900" letter-spacing="3" fill="#fde68a">PLANO PRO</text>` : ''}

        <rect x="704" y="184" width="268" height="318" rx="48" fill="#ffffff" fill-opacity="0.12" stroke="#ffffff" stroke-opacity="0.18"/>
        <rect x="790" y="235" width="150" height="150" rx="26" fill="#ffffff"/>
        <image href="${qrDataUrl}" x="790" y="235" width="150" height="150" preserveAspectRatio="xMidYMid meet" clip-path="url(#qrClip)"/>
        <text x="838" y="424" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="900" letter-spacing="2" fill="#cbd5e1">${safeCode}</text>
        <text x="838" y="456" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="800" fill="#94a3b8">Validar perfil</text>
        <text x="838" y="482" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="11" font-weight="700" fill="#64748b">${safePath}</text>

        <rect x="64" y="540" width="888" height="1" fill="#ffffff" opacity="0.14"/>
        <text x="64" y="575" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="800" fill="#cbd5e1">${safeService} • ${safeCity}</text>
        <text x="64" y="603" font-family="Arial, Helvetica, sans-serif" font-size="13" font-weight="700" fill="#94a3b8">Credencial de perfil FisioCareHub. Não substitui documento oficial nem consulta ao CREFITO.</text>
        <text x="952" y="575" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="15" font-weight="900" fill="#e2e8f0">Emissão ${safeIssuedAt}</text>
      </g>
    </svg>
  `;
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

  const professionalName = safeText(profile?.nome_completo || profile?.nome || profile?.name, 'Fisioterapeuta');
  const specialty = safeText(profile?.especialidade || profile?.especialidade_principal || profile?.specialty, 'Fisioterapia');
  const crefito = safeText(profile?.crefito || profile?.registro_profissional || profile?.numero_crefito, 'Pendente');
  const city = safeText(profile?.localizacao || [profile?.cidade, profile?.estado].filter(Boolean).join(', '), 'Região não informada');
  const avatarFallbackUrl = useMemo(() => createAvatarFallback(professionalName, specialty), [professionalName, specialty]);
  const resolvedAvatarUrl = resolveStorageUrl(profile?.avatar_url || '');
  const avatarUrl = resolvedAvatarUrl || avatarFallbackUrl;
  const approved = String(profile?.status_aprovacao || '').toLowerCase() === 'aprovado' || Boolean(profile?.aprovado || profile?.verificado);
  const issuedAt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date());
  const credentialCode = profileId ? `FCH-${String(profileId).slice(0, 8).toUpperCase()}` : 'FCH-PERFIL';
  const ratingText = ratingAverage && ratingAverage > 0 ? ratingAverage.toFixed(1).replace('.', ',') : 'Novo';
  const totalAppointmentsText = typeof appointmentsCount === 'number' ? String(appointmentsCount) : '—';
  const totalReviewsText = typeof reviewsCount === 'number' ? String(reviewsCount) : '0';
  const qrFallbackUrl = useMemo(() => createQrFallback(publicProfileUrl), [publicProfileUrl]);
  const qrCodeUrl = publicProfileUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=8&data=${encodeURIComponent(publicProfileUrl)}`
    : qrFallbackUrl;
  const isCompact = variant === 'compact';
  const serviceLabel = getServiceLabel(profile?.tipo_servico);

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

      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
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

  const handleCopyLink = async () => {
    if (!publicProfileUrl) return;

    try {
      await navigator.clipboard.writeText(publicProfileUrl);
      toast.success('Link copiado.');
    } catch {
      toast.error('Não foi possível copiar o link.');
    }
  };

  const handleDownloadCredential = async () => {
    if (downloading) return;
    setDownloading(true);

    let svgUrl = '';
    let pngUrl = '';

    try {
      const [avatarDataUrl, qrDataUrl] = await Promise.all([
        urlToDataUrl(avatarUrl).catch(() => avatarFallbackUrl),
        urlToDataUrl(qrCodeUrl).catch(() => qrFallbackUrl),
      ]);

      const svg = buildCredentialSvg({
        avatarDataUrl,
        qrDataUrl,
        approved,
        city,
        credentialCode,
        crefito,
        issuedAt,
        isPro,
        professionalName,
        publicProfileUrl,
        serviceLabel,
        specialty,
      });

      const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      svgUrl = URL.createObjectURL(svgBlob);
      const image = await loadImageElement(svgUrl);

      const canvas = document.createElement('canvas');
      canvas.width = 1016;
      canvas.height = 640;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas indisponível.');

      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png', 0.95));
      const fileName = `credencial-fisiocarehub-${fileNameFromName(professionalName)}.png`;

      if (blob) {
        pngUrl = URL.createObjectURL(blob);
        downloadBlobUrl(pngUrl, fileName);
      } else {
        downloadBlobUrl(canvas.toDataURL('image/png'), fileName);
      }

      toast.success('Credencial baixada como imagem.');
    } catch (error) {
      console.error('Erro ao baixar credencial:', error);
      toast.error('Não foi possível baixar a credencial agora. Tente novamente em alguns segundos.');
    } finally {
      if (svgUrl) URL.revokeObjectURL(svgUrl);
      if (pngUrl) URL.revokeObjectURL(pngUrl);
      setDownloading(false);
    }
  };

  return (
    <section
      className={cn(
        'relative mb-24 overflow-hidden rounded-[1.75rem] border border-sky-200/70 bg-white p-4 shadow-xl shadow-sky-100/70 dark:border-white/10 dark:bg-slate-900/50 dark:shadow-black/20 sm:rounded-[2.25rem] sm:p-5',
        isCompact && 'p-3 sm:p-4',
        className,
      )}
    >
      <div className="absolute -right-20 -top-20 h-44 w-44 rounded-full bg-sky-400/20 blur-3xl dark:bg-blue-500/20" />
      <div className="absolute -bottom-24 -left-16 h-52 w-52 rounded-full bg-emerald-400/20 blur-3xl dark:bg-emerald-500/10" />

      <div className="relative z-10 mb-4 space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.22em] text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300">
              <Crown size={13} fill="currentColor" />
              Credencial premium
            </div>
            {!isCompact && (
              <p className="mt-2 max-w-2xl text-xs font-semibold leading-relaxed text-slate-600 dark:text-slate-400">
                Carteira digital horizontal para compartilhar seu perfil profissional verificado.
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <button
            type="button"
            onClick={handleShareCredential}
            disabled={!publicProfileUrl || sharing}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-700 shadow-sm transition-all hover:border-sky-300 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
          >
            {sharing ? <Sparkles size={15} /> : <Share2 size={15} />}
            Compartilhar
          </button>
          <button
            type="button"
            onClick={handleDownloadCredential}
            disabled={downloading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-600 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-sky-500/20 transition-all hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Download size={15} />
            {downloading ? 'Gerando...' : 'Baixar imagem'}
          </button>
          <button
            type="button"
            onClick={handleCopyLink}
            disabled={!publicProfileUrl}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-700 shadow-sm transition-all hover:border-sky-300 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
          >
            <Copy size={14} />
            Copiar link
          </button>
        </div>
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[620px]">
        <div
          ref={cardRef}
          className="relative aspect-[1.586/1] w-full overflow-hidden rounded-[1.35rem] border border-white/60 bg-slate-950 p-3 text-white shadow-2xl shadow-slate-900/20 ring-1 ring-slate-950/5 dark:border-white/15 sm:rounded-[1.85rem] sm:p-5"
          style={{
            background: 'linear-gradient(135deg, #020617 0%, #07182f 48%, #083344 100%)',
          }}
        >
          <div className="absolute inset-0 opacity-70">
            <div className="absolute -right-12 -top-14 h-40 w-40 rounded-full blur-3xl" style={{ background: 'rgba(14, 165, 233, 0.30)' }} />
            <div className="absolute -bottom-16 -left-12 h-44 w-44 rounded-full blur-3xl" style={{ background: 'rgba(16, 185, 129, 0.20)' }} />
            <div className="absolute left-[39%] top-0 h-full w-px rotate-12 bg-white/10" />
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/35 to-transparent" />
          </div>

          <div className="relative flex h-full flex-col justify-between gap-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[7px] font-black uppercase tracking-[0.28em] text-sky-300 sm:text-[10px] sm:tracking-[0.34em]">FisioCareHub</p>
                <h3 className="mt-0.5 text-sm font-black leading-none tracking-tight sm:mt-1 sm:text-2xl">Credencial Digital</h3>
              </div>

              <div
                className={cn(
                  'inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[6px] font-black uppercase tracking-[0.11em] sm:gap-2 sm:px-3 sm:py-1.5 sm:text-[9px]',
                  approved
                    ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-100'
                    : 'border-amber-300/30 bg-amber-400/10 text-amber-100',
                )}
              >
                <ShieldCheck size={11} />
                <span>{approved ? 'Verificado' : 'Validação'}</span>
              </div>
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-[58px_minmax(0,1fr)_58px] items-center gap-2 sm:grid-cols-[112px_minmax(0,1fr)_112px] sm:gap-5">
              <div className="relative h-[58px] w-[58px] overflow-hidden rounded-[1.1rem] border-[3px] border-white/10 bg-white/10 shadow-2xl sm:h-[112px] sm:w-[112px] sm:rounded-[1.7rem] sm:border-4">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={professionalName}
                    data-fallback-src={avatarFallbackUrl}
                    crossOrigin="anonymous"
                    className="h-full w-full object-cover"
                    onError={(event) => {
                      const image = event.currentTarget;
                      if (image.src !== avatarFallbackUrl) image.src = avatarFallbackUrl;
                    }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sky-200">
                    <UserRound size={34} />
                  </div>
                )}
                <div className="absolute bottom-1 right-1 rounded-full border-2 border-slate-950 bg-emerald-500 p-0.5 text-white sm:bottom-2 sm:right-2 sm:p-1">
                  <CheckCircle2 size={10} className="sm:h-3 sm:w-3" />
                </div>
              </div>

              <div className="min-w-0 space-y-1.5 sm:space-y-3">
                <div>
                  <p className="text-[7px] font-black uppercase tracking-[0.2em] text-slate-400 sm:text-[10px] sm:tracking-[0.24em]">Fisioterapeuta</p>
                  <h4 className="mt-0.5 truncate text-[18px] font-black leading-none tracking-tight sm:mt-1 sm:text-3xl">{professionalName}</h4>
                  <p className="mt-0.5 truncate text-[9px] font-black uppercase tracking-[0.18em] text-sky-300 sm:mt-1 sm:text-sm sm:tracking-[0.2em]">{specialty}</p>
                </div>

                <div className="flex flex-wrap gap-1 sm:gap-2">
                  <span className="rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-[7px] font-black uppercase tracking-widest text-white/90 sm:px-3 sm:py-1.5 sm:text-[10px]">
                    CREFITO: {crefito}
                  </span>
                  {isPro && (
                    <span className="rounded-full border border-amber-300/30 bg-amber-400/15 px-2 py-0.5 text-[7px] font-black uppercase tracking-widest text-amber-200 sm:px-3 sm:py-1.5 sm:text-[10px]">
                      Pro
                    </span>
                  )}
                </div>

                <div className="hidden grid-cols-2 gap-2 sm:grid">
                  <div className="rounded-2xl border border-white/10 bg-white/10 px-3 py-2">
                    <div className="flex items-center gap-1 text-amber-300">
                      <span className="text-[9px] font-black uppercase tracking-widest">Aval.</span>
                    </div>
                    <p className="text-lg font-black">{ratingText}</p>
                    <p className="text-[8px] font-bold text-slate-400">{totalReviewsText} avaliações</p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/10 px-3 py-2">
                    <div className="flex items-center gap-1 text-emerald-300">
                      <span className="text-[9px] font-black uppercase tracking-widest">Sessões</span>
                    </div>
                    <p className="text-lg font-black">{totalAppointmentsText}</p>
                    <p className="text-[8px] font-bold text-slate-400">na plataforma</p>
                  </div>
                </div>
              </div>

              <div className="flex h-full min-w-0 flex-col items-center justify-center gap-1 rounded-[1rem] border border-white/10 bg-white/10 p-1.5 backdrop-blur-xl sm:gap-2 sm:rounded-[1.6rem] sm:p-3">
                <div className="flex h-[46px] w-[46px] items-center justify-center rounded-xl bg-white p-1 shadow-xl sm:h-[88px] sm:w-[88px] sm:rounded-2xl sm:p-2">
                  {qrCodeUrl ? (
                    <img
                      src={qrCodeUrl}
                      alt="QR Code do perfil profissional"
                      data-fallback-src={qrFallbackUrl}
                      crossOrigin="anonymous"
                      className="h-full w-full rounded-lg object-contain sm:rounded-xl"
                      onError={(event) => {
                        const image = event.currentTarget;
                        if (image.src !== qrFallbackUrl) image.src = qrFallbackUrl;
                      }}
                    />
                  ) : (
                    <QrCode className="text-slate-900" size={34} />
                  )}
                </div>
                <p className="max-w-[70px] truncate text-center text-[6px] font-bold text-slate-400 sm:max-w-[110px] sm:text-[8px]">{credentialCode}</p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-white/10 pt-1.5 text-[6px] font-bold text-slate-400 sm:pt-3 sm:text-[9px]">
              <span className="truncate">
                <span className="hidden sm:inline">{serviceLabel} • </span>
                {city}
              </span>
              <span className="shrink-0">Emissão {issuedAt}</span>
            </div>
          </div>
        </div>
      </div>

      {!isCompact && (
        <p className="relative z-10 mx-auto mt-3 max-w-[620px] text-[10px] font-semibold leading-relaxed text-slate-500 dark:text-slate-500">
          Esta credencial identifica o perfil profissional dentro da plataforma e não substitui consulta oficial junto ao CREFITO.
        </p>
      )}
    </section>
  );
}
