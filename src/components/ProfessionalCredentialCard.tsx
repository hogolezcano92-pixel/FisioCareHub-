import { useMemo, useRef, useState } from 'react';
import {
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

const waitForImage = (image: HTMLImageElement) =>
  new Promise<void>((resolve) => {
    if (image.complete && image.naturalWidth > 0) {
      resolve();
      return;
    }

    const cleanup = () => {
      image.onload = null;
      image.onerror = null;
    };

    image.onload = () => {
      cleanup();
      resolve();
    };
    image.onerror = () => {
      cleanup();
      resolve();
    };
  });

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
  const services = Array.isArray(profile?.servicos_ofertados) ? profile.servicos_ofertados.filter(Boolean).slice(0, 2) : [];
  const qrFallbackUrl = useMemo(() => createQrFallback(publicProfileUrl), [publicProfileUrl]);
  const qrCodeUrl = publicProfileUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=8&data=${encodeURIComponent(publicProfileUrl)}`
    : qrFallbackUrl;
  const isCompact = variant === 'compact';

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

  const prepareImagesForExport = async (node: HTMLElement) => {
    const images = Array.from(node.querySelectorAll('img')) as HTMLImageElement[];

    await Promise.all(
      images.map(async (image) => {
        const fallbackSrc = image.dataset.fallbackSrc || avatarFallbackUrl;
        const source = image.currentSrc || image.src;

        try {
          if (source && !source.startsWith('data:') && !source.startsWith('blob:')) {
            image.src = await urlToDataUrl(source);
          }
        } catch {
          image.src = fallbackSrc;
        }

        await waitForImage(image);
      }),
    );
  };

  const handleDownloadCredential = async () => {
    if (!cardRef.current || downloading) return;
    setDownloading(true);

    let exportNode: HTMLElement | null = null;

    try {
      const html2canvas = (await import('html2canvas')).default;
      exportNode = cardRef.current.cloneNode(true) as HTMLElement;
      exportNode.style.position = 'fixed';
      exportNode.style.left = '-10000px';
      exportNode.style.top = '0';
      exportNode.style.width = `${cardRef.current.offsetWidth}px`;
      exportNode.style.maxWidth = `${cardRef.current.offsetWidth}px`;
      exportNode.style.pointerEvents = 'none';
      exportNode.style.zIndex = '-1';
      document.body.appendChild(exportNode);

      await prepareImagesForExport(exportNode);

      const canvas = await html2canvas(exportNode, {
        scale: Math.min(3, window.devicePixelRatio || 2),
        backgroundColor: null,
        useCORS: true,
        allowTaint: false,
        logging: false,
        imageTimeout: 15000,
        removeContainer: true,
        width: exportNode.scrollWidth,
        height: exportNode.scrollHeight,
        windowWidth: Math.max(document.documentElement.clientWidth, exportNode.scrollWidth),
      });

      const imageUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = `credencial-fisiocarehub-${fileNameFromName(professionalName)}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Credencial baixada como imagem.');
    } catch (error) {
      console.error('Erro ao baixar credencial:', error);
      toast.error('Não foi possível baixar a credencial agora. Tente novamente em alguns segundos.');
    } finally {
      exportNode?.remove();
      setDownloading(false);
    }
  };

  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-[2rem] border border-sky-200/70 bg-white p-4 shadow-xl shadow-sky-100/70 dark:border-white/10 dark:bg-slate-900/50 dark:shadow-black/20 sm:rounded-[2.5rem] sm:p-5',
        isCompact && 'p-3 sm:p-4',
        className,
      )}
    >
      <div className="absolute -right-20 -top-20 h-44 w-44 rounded-full bg-sky-400/20 blur-3xl dark:bg-blue-500/20" />
      <div className="absolute -bottom-24 -left-16 h-52 w-52 rounded-full bg-emerald-400/20 blur-3xl dark:bg-emerald-500/10" />

      <div className="relative z-10 mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" data-html2canvas-ignore="true">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.22em] text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300">
            <Crown size={13} fill="currentColor" />
            Credencial premium
          </div>
          {!isCompact && (
            <p className="mt-2 max-w-2xl text-xs font-semibold leading-relaxed text-slate-600 dark:text-slate-400">
              Carteira digital horizontal para compartilhar o perfil profissional verificado dentro do FisioCareHub.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
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
        </div>
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[720px]">
        <div
          ref={cardRef}
          className="relative aspect-[1.586/1] w-full overflow-hidden rounded-[1.65rem] border border-white/60 bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950 p-4 text-white shadow-2xl shadow-slate-900/20 ring-1 ring-slate-950/5 dark:border-white/15 sm:rounded-[2rem] sm:p-5"
        >
          <div className="absolute inset-0 opacity-70">
            <div className="absolute -right-12 -top-14 h-40 w-40 rounded-full bg-sky-400/30 blur-3xl" />
            <div className="absolute -bottom-16 -left-12 h-44 w-44 rounded-full bg-emerald-400/20 blur-3xl" />
            <div className="absolute left-[38%] top-0 h-full w-px rotate-12 bg-white/10" />
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/35 to-transparent" />
          </div>

          <div className="relative flex h-full flex-col justify-between gap-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[8px] font-black uppercase tracking-[0.34em] text-sky-300 sm:text-[10px]">FisioCareHub</p>
                <h3 className="mt-1 text-base font-black leading-none tracking-tight sm:text-2xl">Credencial Digital</h3>
              </div>

              <div
                className={cn(
                  'inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[7px] font-black uppercase tracking-[0.13em] sm:gap-2 sm:px-3 sm:py-1.5 sm:text-[9px]',
                  approved
                    ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-100'
                    : 'border-amber-300/30 bg-amber-400/10 text-amber-100',
                )}
              >
                <ShieldCheck size={12} />
                <span className="hidden sm:inline">{approved ? 'Profissional verificado' : 'Em validação'}</span>
                <span className="sm:hidden">{approved ? 'Verificado' : 'Validação'}</span>
              </div>
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-[76px_minmax(0,1fr)_76px] items-center gap-3 sm:grid-cols-[118px_minmax(0,1fr)_130px] sm:gap-5">
              <div className="relative h-[76px] w-[76px] overflow-hidden rounded-[1.4rem] border-4 border-white/10 bg-white/10 shadow-2xl sm:h-[118px] sm:w-[118px] sm:rounded-[1.8rem]">
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
                    <UserRound size={42} />
                  </div>
                )}
                <div className="absolute bottom-1.5 right-1.5 rounded-full border-2 border-slate-950 bg-emerald-500 p-1 text-white sm:bottom-2 sm:right-2">
                  <CheckCircle2 size={12} />
                </div>
              </div>

              <div className="min-w-0 space-y-2 sm:space-y-3">
                <div>
                  <p className="text-[8px] font-black uppercase tracking-[0.24em] text-slate-400 sm:text-[10px]">Fisioterapeuta</p>
                  <h4 className="mt-1 truncate text-xl font-black leading-none tracking-tight sm:text-3xl">{professionalName}</h4>
                  <p className="mt-1 truncate text-[10px] font-black uppercase tracking-[0.2em] text-sky-300 sm:text-sm">{specialty}</p>
                </div>

                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[8px] font-black uppercase tracking-widest text-white/90 sm:px-3 sm:py-1.5 sm:text-[10px]">
                    CREFITO: {crefito}
                  </span>
                  {isPro && (
                    <span className="rounded-full border border-amber-300/30 bg-amber-400/15 px-2.5 py-1 text-[8px] font-black uppercase tracking-widest text-amber-200 sm:px-3 sm:py-1.5 sm:text-[10px]">
                      Plano Pro
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2">
                  <div className="rounded-2xl border border-white/10 bg-white/10 px-2 py-1.5 sm:px-3 sm:py-2">
                    <div className="flex items-center gap-1 text-amber-300">
                      <Star size={12} fill="currentColor" />
                      <span className="text-[7px] font-black uppercase tracking-widest sm:text-[9px]">Aval.</span>
                    </div>
                    <p className="text-sm font-black sm:text-lg">{ratingText}</p>
                    <p className="hidden text-[8px] font-bold text-slate-400 sm:block">{totalReviewsText} avaliações</p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/10 px-2 py-1.5 sm:px-3 sm:py-2">
                    <div className="flex items-center gap-1 text-emerald-300">
                      <CheckCircle2 size={12} />
                      <span className="text-[7px] font-black uppercase tracking-widest sm:text-[9px]">Sessões</span>
                    </div>
                    <p className="text-sm font-black sm:text-lg">{totalAppointmentsText}</p>
                    <p className="hidden text-[8px] font-bold text-slate-400 sm:block">na plataforma</p>
                  </div>

                  <div className="col-span-2 hidden rounded-2xl border border-white/10 bg-white/10 px-3 py-2 sm:col-span-1 sm:block">
                    <div className="flex items-center gap-1 text-sky-300">
                      <MapPin size={12} />
                      <span className="text-[9px] font-black uppercase tracking-widest">Região</span>
                    </div>
                    <p className="truncate text-xs font-black">{city}</p>
                  </div>
                </div>
              </div>

              <div className="flex h-full min-w-0 flex-col items-center justify-center gap-2 rounded-[1.25rem] border border-white/10 bg-white/10 p-2 backdrop-blur-xl sm:rounded-[1.6rem] sm:p-3">
                <div className="flex h-[58px] w-[58px] items-center justify-center rounded-2xl bg-white p-1.5 shadow-xl sm:h-[100px] sm:w-[100px] sm:p-2">
                  {qrCodeUrl ? (
                    <img
                      src={qrCodeUrl}
                      alt="QR Code do perfil profissional"
                      data-fallback-src={qrFallbackUrl}
                      crossOrigin="anonymous"
                      className="h-full w-full rounded-xl object-contain"
                      onError={(event) => {
                        const image = event.currentTarget;
                        if (image.src !== qrFallbackUrl) image.src = qrFallbackUrl;
                      }}
                    />
                  ) : (
                    <QrCode className="text-slate-900" size={46} />
                  )}
                </div>
                <p className="hidden text-center text-[8px] font-black uppercase tracking-[0.18em] text-slate-300 sm:block">Validar perfil</p>
                <p className="max-w-[110px] truncate text-center text-[7px] font-bold text-slate-400 sm:text-[8px]">{credentialCode}</p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-2 text-[7px] font-bold text-slate-400 sm:pt-3 sm:text-[9px]">
              <span className="truncate">{getServiceLabel(profile?.tipo_servico)} • {city}</span>
              <span className="shrink-0">Emissão {issuedAt}</span>
            </div>
          </div>
        </div>
      </div>

      {services.length > 0 && !isCompact && (
        <div className="relative z-10 mt-3 flex flex-wrap justify-center gap-2">
          {services.map((service: string) => (
            <span key={service} className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-sky-700 dark:border-sky-300/20 dark:bg-sky-300/10 dark:text-sky-100">
              {service}
            </span>
          ))}
        </div>
      )}

      {!isCompact && (
        <p className="relative z-10 mx-auto mt-3 max-w-[720px] text-[10px] font-semibold leading-relaxed text-slate-500 dark:text-slate-500">
          Esta credencial identifica o perfil profissional dentro da plataforma FisioCareHub. Ela não substitui documento oficial ou consulta de regularidade junto ao CREFITO.
        </p>
      )}

      {!isCompact && publicProfileUrl && (
        <div className="relative z-10 mt-3 flex flex-col gap-3 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-3 text-xs font-semibold text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex min-w-0 items-center gap-2">
            <ExternalLink size={15} className="shrink-0 text-sky-600 dark:text-sky-300" />
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
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-700 transition-all hover:border-sky-300 hover:text-sky-700 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-200 dark:hover:bg-white/10"
          >
            <Copy size={14} />
            Copiar link
          </button>
        </div>
      )}
    </section>
  );
}
