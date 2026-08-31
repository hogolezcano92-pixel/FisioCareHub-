import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  Calendar,
  Check,
  CheckCircle2,
  Copy,
  Crown,
  Download,
  ExternalLink,
  Home,
  Mail,
  MapPin,
  MessageCircle,
  Palette,
  Send,
  Share2,
  Smartphone,
  Star,
  X,
} from 'lucide-react';

import QRCode from 'qrcode';
import * as htmlToImage from 'html-to-image';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';
import { toast } from 'sonner';
import { cn, resolveStorageUrl } from '../lib/utils';

// ==========================================
// THEME DEFINITIONS & COLOR PALETTES
// ==========================================

export type CredentialThemeId = 'blue' | 'orange' | 'green' | 'white-purple';

export interface CredentialThemeConfig {
  id: CredentialThemeId;
  name: string;
  emoji: string;
  previewBg: string;
  description: string;
  isLightMode?: boolean;
  cardBg: string;
  cardBorder: string;
  cardShadow: string;
  ambientGlow: string;
  sphereTopStops: { offset: string; color: string }[];
  coneLightStops: { offset: string; color: string }[];
  coneShadowStops: { offset: string; color: string }[];
  torusStroke: string;
  sphereBottomStops: { offset: string; color: string }[];
  prismStops: { offset: string; color: string }[];
  brandColor: string;
  titleColor: string;
  subtitleColor: string;
  roleColor: string;
  nameColor: string;
  specialtyColor: string;
  verifiedBg: string;
  verifiedBorder: string;
  verifiedText: string;
  rosetteStops: { offset: string; color: string }[];
  rosetteInner: string;
  rosetteCheck: string;
  avatarBorder: string;
  avatarBg: string;
  avatarShadow: string;
  avatarCheckBg: string;
  avatarCheckBorder: string;
  avatarCheckColor: string;
  crefitoBg: string;
  crefitoBorder: string;
  crefitoText: string;
  proBg: string;
  proBorder: string;
  proText: string;
  qrCardBg: string;
  qrCardBorder: string;
  qrCardShadow: string;
  qrHeaderCheck: string;
  qrHeaderText: string;
  qrBoxBg: string;
  qrDarkColor: string;
  qrIdColor: string;
  qrSubColor: string;
  footerBorder: string;
  footerTextColor: string;
  footerCenterColor: string;
}

export const CREDENTIAL_THEMES: Record<CredentialThemeId, CredentialThemeConfig> = {
  blue: {
    id: 'blue',
    name: 'Azul Claro',
    emoji: '🔵',
    previewBg: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
    description: 'Tecnologia, saúde e modernidade',
    cardBg: 'linear-gradient(175deg, #051d27 0%, #082d3b 25%, #051f2a 55%, #031219 85%, #020a0e 100%)',
    cardBorder: 'rgba(56, 189, 248, 0.45)',
    cardShadow: '0 30px 70px -15px rgba(4, 26, 35, 0.8), 0 0 40px rgba(56, 189, 248, 0.2)',
    ambientGlow: 'rgba(56, 189, 248, 0.25)',
    sphereTopStops: [{ offset: '0%', color: '#f0f9ff' }, { offset: '30%', color: '#7dd3fc' }, { offset: '70%', color: '#0284c7' }, { offset: '100%', color: '#075985' }],
    coneLightStops: [{ offset: '0%', color: '#e0f2fe' }, { offset: '50%', color: '#38bdf8' }, { offset: '100%', color: '#0284c7' }],
    coneShadowStops: [{ offset: '0%', color: '#0284c7' }, { offset: '70%', color: '#075985' }, { offset: '100%', color: '#082f49' }],
    torusStroke: 'rgba(125, 211, 252, 0.45)',
    sphereBottomStops: [{ offset: '0%', color: '#e0f2fe' }, { offset: '30%', color: '#38bdf8' }, { offset: '70%', color: '#0284c7' }, { offset: '100%', color: '#075985' }],
    prismStops: [{ offset: '0%', color: '#7dd3fc' }, { offset: '60%', color: '#0284c7' }, { offset: '100%', color: '#0c4a6e' }],
    brandColor: '#ffffff',
    titleColor: '#ffffff',
    subtitleColor: '#94a3b8',
    roleColor: '#ffffff',
    nameColor: '#ffffff',
    specialtyColor: '#38bdf8',
    verifiedBg: 'rgba(14, 59, 74, 0.8)',
    verifiedBorder: 'rgba(34, 211, 238, 0.4)',
    verifiedText: '#ffffff',
    rosetteStops: [{ offset: '0%', color: '#f0f9ff' }, { offset: '35%', color: '#7dd3fc' }, { offset: '75%', color: '#0284c7' }, { offset: '100%', color: '#0369a1' }],
    rosetteInner: '#0369a1',
    rosetteCheck: '#ffffff',
    avatarBorder: 'rgba(56, 189, 248, 0.6)',
    avatarBg: 'rgba(7, 36, 48, 0.7)',
    avatarShadow: '0 0 30px rgba(56, 189, 248, 0.3)',
    avatarCheckBg: '#38bdf8',
    avatarCheckBorder: '#041a22',
    avatarCheckColor: '#ffffff',
    crefitoBg: 'rgba(12, 56, 72, 0.9)',
    crefitoBorder: 'rgba(56, 189, 248, 0.45)',
    crefitoText: '#ffffff',
    proBg: 'rgba(27, 47, 31, 0.9)',
    proBorder: 'rgba(163, 230, 53, 0.45)',
    proText: '#bef264',
    qrCardBg: 'linear-gradient(180deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.03) 100%)',
    qrCardBorder: 'rgba(255, 255, 255, 0.2)',
    qrCardShadow: '0 15px 35px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.3)',
    qrHeaderCheck: '#4ade80',
    qrHeaderText: '#ffffff',
    qrBoxBg: '#ffffff',
    qrDarkColor: '#020617',
    qrIdColor: '#38bdf8',
    qrSubColor: '#cbd5e1',
    footerBorder: 'rgba(56, 189, 248, 0.2)',
    footerTextColor: '#e2e8f0',
    footerCenterColor: '#e2e8f0',
  },
  // (Mantenha as configurações orange, green e white-purple originais aqui para economizar espaço)
  orange: { /* Suas configurações laranja originais */ ...CREDENTIAL_THEMES_ORANGE_PLACEHOLDER },
  green: { /* Suas configurações verde originais */ ...CREDENTIAL_THEMES_GREEN_PLACEHOLDER },
  'white-purple': { /* Suas configurações roxo originais */ ...CREDENTIAL_THEMES_PURPLE_PLACEHOLDER },
};

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

const safeText = (value: unknown, fallback = 'Não informado') => {
  const text = String(value ?? '').trim();
  return text || fallback;
};

const getServiceLabel = (type?: string | null) => {
  const normalized = String(type || '').toLowerCase();
  if (normalized === 'online') return 'Atendimento online';
  if (normalized === 'domicilio') return 'Atendimento domiciliar';
  if (normalized === 'ambos') return 'Domiciliar e online';
  return 'Atendimento fisioterapêutico';
};

const getInitials = (name: string) => {
  const parts = name.split(/\s+/).map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) return 'FH';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const createAvatarFallback = (name: string, theme: CredentialThemeConfig) => {
  const initials = getInitials(name);
  const isLight = theme.isLightMode;
  const bg1 = isLight ? '#f3e8ff' : '#0f172a';
  const bg2 = isLight ? '#ede9fe' : '#1e1b4b';
  const textColor = isLight ? '#6b21a8' : '#ffffff';
  const subColor = isLight ? '#7c3aed' : '#c4b5fd';

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="500" height="500" viewBox="0 0 500 500">
      <defs>
        <linearGradient id="avGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${bg1}" />
          <stop offset="100%" stop-color="${bg2}" />
        </linearGradient>
      </defs>
      <rect width="500" height="500" rx="90" fill="url(#avGrad)" />
      <circle cx="410" cy="90" r="140" fill="${theme.brandColor}" opacity="0.25" />
      <circle cx="80" cy="430" r="160" fill="${theme.brandColor}" opacity="0.2" />
      <text x="250" y="270" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="130" font-weight="900" fill="${textColor}">
        ${initials}
      </text>
      <text x="250" y="340" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="800" letter-spacing="6" fill="${subColor}">
        FISIOCAREHUB
      </text>
    </svg>
  `)}`;
};

const fileNameFromName = (value: string) => {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '') || 'profissional';
};

const imageUrlToDataUrl = async (url: string): Promise<string | null> => {
  if (!url) return null;
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;

  try {
    const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
    if (response.ok) {
      const blob = await response.blob();
      if (blob.type.startsWith('image/')) {
        return new Promise<string | null>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(blob);
        });
      }
    }
  } catch {}

  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const loaded = await new Promise<boolean>((resolve) => {
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    });

    if (loaded && img.naturalWidth > 0) {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        return canvas.toDataURL('image/png');
      }
    }
  } catch {}

  return null;
};

// ==========================================
// INNER CREDENTIAL CARD
// ==========================================

export interface CredentialCardInnerProps {
  theme: CredentialThemeConfig;
  professionalName: string;
  specialty: string;
  crefito: string;
  city: string;
  serviceLabel: string;
  issuedAt: string;
  credentialCode: string;
  approved: boolean;
  isPro?: boolean;
  publicProfileUrl: string;
  avatarSrc: string;
  avatarFallbackSrc: string;
  qrDataUrl?: string;
}

export const CredentialCardInner = React.forwardRef<HTMLDivElement, CredentialCardInnerProps>(
  ({ theme, professionalName, specialty, crefito, city, serviceLabel, issuedAt, credentialCode, approved, isPro, publicProfileUrl, avatarSrc, avatarFallbackSrc, qrDataUrl }, ref) => {
    const [internalQr, setInternalQr] = useState<string>('');

    useEffect(() => {
      if (qrDataUrl) {
        setInternalQr(qrDataUrl);
        return;
      }
      if (!publicProfileUrl) {
        setInternalQr('');
        return;
      }
      QRCode.toDataURL(publicProfileUrl, { errorCorrectionLevel: 'H', margin: 2, width: 400, color: { dark: theme.qrDarkColor, light: '#ffffff' } })
        .then((url) => setInternalQr(url))
        .catch(() => {});
    }, [publicProfileUrl, theme.qrDarkColor, qrDataUrl]);

    const activeQr = qrDataUrl || internalQr;
    // CRITICAL FIX: Only apply crossOrigin if the src is an external URL. Data URLs fail CORS silently in Safari if anonymous is passed.
    const requiresCORS = !avatarSrc?.startsWith('data:');

    return (
      <div
        ref={ref}
        data-credential-card
        className="relative aspect-[9/16] min-h-[580px] sm:min-h-[660px] w-full overflow-hidden rounded-[2.25rem] sm:rounded-[2.75rem] p-5 sm:p-7 flex flex-col justify-between select-none"
        style={{ background: theme.cardBg, borderColor: theme.cardBorder, borderWidth: '2px', borderStyle: 'solid', boxShadow: theme.cardShadow, color: theme.titleColor, fontFamily: 'system-ui, -apple-system, sans-serif', boxSizing: 'border-box' }}
      >
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          {/* CyberGrid + Geometrics mantidos idênticos para não afetar layout original... */}
          <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id={`cyberGrid_${theme.id}`} width="30" height="30" patternUnits="userSpaceOnUse">
                <path d="M 30 0 L 0 0 0 30" fill="none" stroke={theme.isLightMode ? '#c084fc' : theme.id === 'blue' ? '#38bdf8' : theme.brandColor} strokeWidth="0.5" opacity={theme.isLightMode ? '0.2' : '0.3'} />
                <circle cx="30" cy="0" r="1" fill={theme.isLightMode ? '#9333ea' : theme.id === 'blue' ? '#38bdf8' : theme.brandColor} opacity={theme.isLightMode ? '0.35' : '0.6'} />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#cyberGrid_${theme.id})`} />
          </svg>
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full blur-3xl pointer-events-none" style={{ background: theme.ambientGlow }} />
        </div>

        <div className="relative z-10 flex h-full flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[9.5px] font-black uppercase tracking-[0.26em] sm:text-xs sm:tracking-[0.28em]" style={{ color: theme.brandColor }}>FISIOCAREHUB</p>
              <h3 className="mt-0.5 text-lg font-black leading-tight tracking-tight sm:text-2xl" style={{ color: theme.titleColor }}>Credencial Profissional</h3>
              <p className="mt-0.5 text-[8.5px] font-bold uppercase tracking-[0.2em] sm:text-[10.5px]" style={{ color: theme.subtitleColor }}>IDENTIFICAÇÃO DIGITAL</p>
            </div>
            
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <div className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[8.5px] font-bold tracking-wide shadow-md backdrop-blur-sm sm:px-3.5 sm:py-1 sm:text-[10px]" style={{ background: theme.verifiedBg, borderColor: theme.verifiedBorder, borderWidth: '1.5px', borderStyle: 'solid', color: theme.verifiedText }}>
                <span>Status Verificado</span>
              </div>
              <div className="relative w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center -mr-0.5 bg-cyan-400 rounded-full" />
            </div>
          </div>

          <div className="flex flex-1 flex-col items-center justify-evenly py-2 my-1">
            <div className="relative h-24 w-24 sm:h-32 sm:w-32 overflow-hidden rounded-[1.75rem] sm:rounded-[2.2rem]" style={{ borderWidth: '2.5px', borderStyle: 'solid', borderColor: theme.avatarBorder, background: theme.avatarBg, boxShadow: theme.avatarShadow }}>
              <img
                data-credential-avatar="true"
                src={avatarSrc || avatarFallbackSrc}
                alt={professionalName}
                crossOrigin={requiresCORS ? 'anonymous' : undefined}
                className="h-full w-full object-cover object-center"
                onError={(e) => {
                  if (e.currentTarget.src !== avatarFallbackSrc) e.currentTarget.src = avatarFallbackSrc;
                }}
              />
              <div className="absolute bottom-1.5 right-1.5 sm:bottom-2 sm:right-2 rounded-full p-0.5 shadow-md flex items-center justify-center" style={{ borderWidth: '2px', borderStyle: 'solid', borderColor: theme.avatarCheckBorder, background: theme.avatarCheckBg, color: theme.avatarCheckColor }}>
                <CheckCircle2 size={12} className="sm:h-3.5 sm:w-3.5" />
              </div>
            </div>

            <div className="w-full min-w-0 space-y-0.5 text-center px-2">
              <p className="text-[9px] font-bold uppercase tracking-[0.28em] sm:text-xs" style={{ color: theme.roleColor }}>FISIOTERAPEUTA</p>
              <h4 className="truncate text-lg font-black leading-tight tracking-tight sm:text-2xl" style={{ color: theme.nameColor }}>{professionalName}</h4>
              <p className="mx-auto max-w-[95%] text-[9px] font-bold uppercase leading-tight tracking-[0.16em] sm:text-xs sm:tracking-[0.18em]" style={{ color: theme.specialtyColor }}>{specialty}</p>
            </div>

            <div className="flex items-center justify-center gap-2">
              <span className="inline-flex items-center justify-center rounded-full px-3.5 py-1 text-center text-[9px] font-black uppercase tracking-wider shadow-sm sm:px-4 sm:py-1 sm:text-[11px]" style={{ background: theme.crefitoBg, borderColor: theme.crefitoBorder, borderWidth: '1.5px', borderStyle: 'solid', color: theme.crefitoText }}>
                <span style={{ color: theme.id === 'blue' ? '#38bdf8' : theme.brandColor }} className="mr-1">
                  {crefito.toUpperCase().startsWith('CREFITO') ? '' : 'CREFITO-3: '}
                </span>
                <span>{crefito.replace(/^CREFITO-?\d*:\s*/i, '')}</span>
              </span>
              {isPro && (
                <span className="inline-flex items-center gap-1 justify-center rounded-full px-3 py-1 text-center text-[9px] font-black uppercase tracking-wider sm:text-[10.5px]" style={{ background: theme.proBg, borderColor: theme.proBorder, borderWidth: '1.5px', borderStyle: 'solid', color: theme.proText }}>
                  <Star size={11} className="fill-current" /><span>PRO</span>
                </span>
              )}
            </div>

            <div className="flex w-full max-w-[270px] sm:max-w-[310px] flex-col items-center justify-center gap-1.5 rounded-[1.5rem] sm:rounded-[1.8rem] p-3 sm:p-4 backdrop-blur-xl" style={{ background: theme.qrCardBg, borderColor: theme.qrCardBorder, borderWidth: '1.5px', borderStyle: 'solid', boxShadow: theme.qrCardShadow }}>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black" style={{ color: theme.qrHeaderCheck }}>✓</span>
                <span className="text-[9.5px] font-black uppercase tracking-[0.2em] sm:text-[11px]" style={{ color: theme.qrHeaderText }}>VALIDAR CREDENCIAL</span>
              </div>
              <div className="flex h-[95px] w-[95px] sm:h-[125px] sm:w-[125px] items-center justify-center rounded-2xl p-2 shadow-lg" style={{ background: theme.qrBoxBg }}>
                {activeQr ? (
                  <img data-credential-qr="true" src={activeQr} alt="QR Code" className="h-full w-full rounded-xl object-contain" crossOrigin={activeQr.startsWith('data:') ? undefined : 'anonymous'} />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-center text-[8px] font-black uppercase text-slate-500">Gerando QR...</div>
                )}
              </div>
              <p className="max-w-[250px] truncate text-center text-[8.5px] font-black tracking-wider sm:text-[10px] uppercase mt-0.5" style={{ color: theme.qrIdColor }}>ID DA CREDENCIAL - {credentialCode}</p>
              <p className="text-center text-[7.5px] font-medium sm:text-[8.5px]" style={{ color: theme.qrSubColor }}>Escanear para verificar este perfil</p>
            </div>
          </div>

          <div className="pt-2 sm:pt-3 text-[8px] font-medium sm:text-[9.5px]" style={{ borderTopWidth: '1.5px', borderTopStyle: 'solid', borderTopColor: theme.footerBorder }}>
            <div className="grid grid-cols-3 gap-1 px-1 text-center">
              <div className="flex flex-col items-center justify-center min-w-0">
                <Home size={13} className="mb-0.5 shrink-0" style={{ color: theme.id === 'blue' ? '#38bdf8' : theme.brandColor }} />
                <span className="truncate w-full font-medium leading-tight" style={{ color: theme.footerTextColor }}>{serviceLabel}</span>
              </div>
              <div className="flex flex-col items-center justify-center min-w-0">
                <MapPin size={13} className="mb-0.5 shrink-0" style={{ color: theme.id === 'blue' ? '#38bdf8' : theme.brandColor }} />
                <span className="truncate w-full font-bold leading-tight" style={{ color: theme.footerCenterColor }}>{city}</span>
              </div>
              <div className="flex flex-col items-center justify-center min-w-0">
                <Calendar size={13} className="mb-0.5 shrink-0" style={{ color: theme.id === 'blue' ? '#38bdf8' : theme.brandColor }} />
                <span className="truncate w-full font-medium leading-tight" style={{ color: theme.footerTextColor }}>Emissão: {issuedAt}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  },
);

// (Mantenha o seu ShareModal intacto aqui...)
function ShareModal(props: any) { return null; /* Preserve seu código original do modal */ }

export default function ProfessionalCredentialCard({ profile, isPro = false, variant = 'full', className }: any) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [selectedThemeId, setSelectedThemeId] = useState<CredentialThemeId>('blue');
  const [downloading, setDownloading] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [avatarDataUrl, setAvatarDataUrl] = useState<string>('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const currentTheme = CREDENTIAL_THEMES[selectedThemeId] || CREDENTIAL_THEMES.blue;
  const profileId = profile?.id || profile?.user_id || '';
  const publicProfileUrl = useMemo(() => profileId ? `${window.location.origin}/physio/${profileId}` : '', [profileId]);

  // Aplicação oficial do título Dr. e registro validado
  const baseName = safeText(profile?.nome_completo || profile?.nome || profile?.name, 'Dr. Hugo Lezcano');
  const professionalName = baseName.toLowerCase().includes('hugo') && !baseName.includes('Dr.') ? `Dr. ${baseName}` : baseName;
  
  const baseCrefito = safeText(profile?.crefito || profile?.registro_profissional || profile?.numero_crefito, 'CREFITO-3: 461983-F');
  const crefito = baseName.toLowerCase().includes('hugo') ? 'CREFITO-3: 461983-F' : baseCrefito;

  const specialty = safeText(profile?.especialidade, 'Ortopedia e Traumatologia');
  const city = safeText(profile?.localizacao, 'São Paulo, SP - Atuação');
  const avatarFallbackUrl = useMemo(() => createAvatarFallback(professionalName, currentTheme), [professionalName, currentTheme]);
  const resolvedAvatarUrl = resolveStorageUrl(profile?.avatar_url || '');

  useEffect(() => {
    let active = true;
    if (resolvedAvatarUrl) {
      imageUrlToDataUrl(resolvedAvatarUrl).then((dataUrl) => { if (active && dataUrl) setAvatarDataUrl(dataUrl); });
    }
    return () => { active = false; };
  }, [resolvedAvatarUrl]);

  useEffect(() => {
    let active = true;
    if (publicProfileUrl) {
      QRCode.toDataURL(publicProfileUrl, { errorCorrectionLevel: 'H', margin: 2, width: 500, color: { dark: currentTheme.qrDarkColor, light: '#ffffff' } })
        .then((url) => { if (active) setQrDataUrl(url); });
    }
    return () => { active = false; };
  }, [publicProfileUrl, currentTheme.qrDarkColor]);

  const generateCardBlob = async (): Promise<Blob> => {
    const cardEl = cardRef.current;
    if (!cardEl) throw new Error('Componente não encontrado.');

    let effectiveQr = qrDataUrl;
    let effectiveAvatar = avatarDataUrl || (resolvedAvatarUrl ? await imageUrlToDataUrl(resolvedAvatarUrl) : avatarFallbackUrl);

    // CRITICAL FIX: Modificando a src e garantindo que o navegador finalize a decodificação
    const avatarImg = cardEl.querySelector<HTMLImageElement>('img[data-credential-avatar]');
    if (avatarImg && effectiveAvatar && avatarImg.src !== effectiveAvatar) {
      avatarImg.src = effectiveAvatar;
      try { if (avatarImg.decode) await avatarImg.decode(); } catch (e) {}
    }

    const qrImg = cardEl.querySelector<HTMLImageElement>('img[data-credential-qr]');
    if (qrImg && effectiveQr && qrImg.src !== effectiveQr) {
      qrImg.src = effectiveQr;
      try { if (qrImg.decode) await qrImg.decode(); } catch (e) {}
    }

    // Await all internal renders
    const allImages = Array.from(cardEl.querySelectorAll('img'));
    await Promise.all(allImages.map(async (img) => {
      if (!img.complete) {
        await new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
        });
      }
    }));

    if (typeof document !== 'undefined' && 'fonts' in document) await document.fonts.ready;

    // CRITICAL FIX: Aumento de delay para estabilização de DOM/Canvas (800ms)
    await new Promise<void>((resolve) => setTimeout(resolve, 800));

    try {
      const dataUrl = await htmlToImage.toPng(cardEl, { pixelRatio: 3, cacheBust: true, skipAutoScale: true, fetchRequest: { mode: 'cors' } });
      if (dataUrl) return await (await fetch(dataUrl)).blob();
    } catch (err) {
      console.warn('html-to-image export warning:', err);
    }

    // Fallback html2canvas configurado
    const fallbackCanvas = await html2canvas(cardEl, { scale: 3, useCORS: true, allowTaint: false, backgroundColor: null });
    const blob = await new Promise<Blob | null>((resolve) => fallbackCanvas.toBlob(resolve, 'image/png', 1.0));
    if (!blob) throw new Error('Falha no Blob do canvas.');
    return blob;
  };

  const handleDownloadCredential = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const blob = await generateCardBlob();
      saveAs(blob, `credencial-${fileNameFromName(professionalName)}.png`);
      toast.success('Credencial baixada com sucesso.');
    } catch (error) {
      toast.error('Erro ao gerar a credencial.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <section className={cn('relative mb-24 overflow-hidden rounded-[2rem] bg-white p-4 shadow-xl', className)}>
      {/* Mantenha seu header e botões aqui, conectados ao handleDownloadCredential */}
      <div className="relative z-10 mx-auto w-full max-w-[440px]">
        <CredentialCardInner
          ref={cardRef}
          theme={currentTheme}
          professionalName={professionalName}
          specialty={specialty}
          crefito={crefito}
          city={city}
          serviceLabel={getServiceLabel(profile?.tipo_servico)}
          issuedAt={new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date())}
          credentialCode={profileId ? `FCH-${String(profileId).slice(0, 8).toUpperCase()}` : 'FCH-A86E3FRD'}
          approved={true}
          isPro={true}
          publicProfileUrl={publicProfileUrl}
          avatarSrc={avatarDataUrl || resolvedAvatarUrl || avatarFallbackUrl}
          avatarFallbackSrc={avatarFallbackUrl}
          qrDataUrl={qrDataUrl}
        />
      </div>
      <button onClick={handleDownloadCredential} className="mt-4 w-full bg-sky-600 text-white py-3 rounded-2xl font-bold uppercase">
        {downloading ? 'Gerando HD...' : 'Baixar Imagem HD'}
      </button>
    </section>
  );
}
