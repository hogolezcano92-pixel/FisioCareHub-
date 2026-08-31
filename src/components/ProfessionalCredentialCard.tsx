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
  QrCode,
  Send,
  Share2,
  Smartphone,
  Sparkles,
  Star,
  UserRound,
  X,
} from 'lucide-react';

import QRCode from 'qrcode';
import { toPng } from 'html-to-image';
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

  // Background & Borders
  cardBg: string;
  cardBorder: string;
  cardShadow: string;
  ambientGlow: string;

  // 3D Geometric Accents (SVG Gradients)
  sphereTopStops: { offset: string; color: string }[];
  coneLightStops: { offset: string; color: string }[];
  coneShadowStops: { offset: string; color: string }[];
  torusStroke: string;
  sphereBottomStops: { offset: string; color: string }[];
  prismStops: { offset: string; color: string }[];

  // Typography
  brandColor: string;
  titleColor: string;
  subtitleColor: string;
  roleColor: string;
  nameColor: string;
  specialtyColor: string;

  // Verified Badge & Rosette Seal
  verifiedBg: string;
  verifiedBorder: string;
  verifiedText: string;
  rosetteStops: { offset: string; color: string }[];
  rosetteInner: string;
  rosetteCheck: string;

  // Photo Avatar Frame
  avatarBorder: string;
  avatarBg: string;
  avatarShadow: string;
  avatarCheckBg: string;
  avatarCheckBorder: string;
  avatarCheckColor: string;

  // CREFITO & PRO Pills
  crefitoBg: string;
  crefitoBorder: string;
  crefitoText: string;
  proBg: string;
  proBorder: string;
  proText: string;

  // Glassmorphic QR Panel
  qrCardBg: string;
  qrCardBorder: string;
  qrCardShadow: string;
  qrBoxBg: string;
  qrHeaderCheck: string;
  qrHeaderText: string;
  qrIdColor: string;
  qrSubColor: string;
  qrDarkColor: string;

  // Footer 3-Column Info Bar
  footerBorder: string;
  footerIconColor: string;
  footerLabelColor: string;
  footerValueColor: string;
}

export const CREDENTIAL_THEMES: Record<CredentialThemeId, CredentialThemeConfig> = {
  // ==========================================
  // THEME 1: AZUL CLARO (CYAN / ELECTRIC BLUE)
  // ==========================================
  blue: {
    id: 'blue',
    name: 'Azul Claro',
    emoji: '💎',
    previewBg: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
    description: 'Cyberpunk Neon e Ciano Elétrico',
    isLightMode: false,

    cardBg: 'linear-gradient(165deg, #091326 0%, #0c1c38 45%, #050b17 100%)',
    cardBorder: 'rgba(56, 189, 248, 0.45)',
    cardShadow: '0 25px 60px -15px rgba(2, 132, 199, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.25)',
    ambientGlow: 'radial-gradient(circle at 50% 20%, rgba(56, 189, 248, 0.22) 0%, transparent 70%)',

    sphereTopStops: [
      { offset: '0%', color: '#e0f2fe' },
      { offset: '30%', color: '#38bdf8' },
      { offset: '70%', color: '#0284c7' },
      { offset: '100%', color: '#082f49' },
    ],
    coneLightStops: [
      { offset: '0%', color: '#7dd3fc' },
      { offset: '50%', color: '#0284c7' },
      { offset: '100%', color: '#0c4a6e' },
    ],
    coneShadowStops: [
      { offset: '0%', color: '#0369a1' },
      { offset: '100%', color: '#082f49' },
    ],
    torusStroke: 'url(#torusGrad_blue)',
    sphereBottomStops: [
      { offset: '0%', color: '#bae6fd' },
      { offset: '40%', color: '#0ea5e9' },
      { offset: '100%', color: '#075985' },
    ],
    prismStops: [
      { offset: '0%', color: '#38bdf8' },
      { offset: '100%', color: '#0369a1' },
    ],

    brandColor: '#38bdf8',
    titleColor: '#ffffff',
    subtitleColor: '#bae6fd',
    roleColor: '#38bdf8',
    nameColor: '#ffffff',
    specialtyColor: '#e0f2fe',

    verifiedBg: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
    verifiedBorder: 'rgba(255, 255, 255, 0.6)',
    verifiedText: '#ffffff',
    rosetteStops: [
      { offset: '0%', color: '#7dd3fc' },
      { offset: '50%', color: '#0284c7' },
      { offset: '100%', color: '#0369a1' },
    ],
    rosetteInner: '#0c4a6e',
    rosetteCheck: '#ffffff',

    avatarBorder: '#38bdf8',
    avatarBg: 'linear-gradient(135deg, #0c4a6e 0%, #0369a1 100%)',
    avatarShadow: '0 0 30px rgba(56, 189, 248, 0.4), inset 0 0 15px rgba(56, 189, 248, 0.3)',
    avatarCheckBg: '#0284c7',
    avatarCheckBorder: '#ffffff',
    avatarCheckColor: '#ffffff',

    crefitoBg: 'rgba(12, 74, 110, 0.75)',
    crefitoBorder: 'rgba(56, 189, 248, 0.55)',
    crefitoText: '#ffffff',
    proBg: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
    proBorder: 'rgba(255, 255, 255, 0.7)',
    proText: '#ffffff',

    qrCardBg: 'linear-gradient(160deg, rgba(8, 47, 73, 0.82) 0%, rgba(3, 105, 161, 0.45) 100%)',
    qrCardBorder: 'rgba(56, 189, 248, 0.5)',
    qrCardShadow: '0 15px 35px rgba(2, 132, 199, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.25)',
    qrBoxBg: '#ffffff',
    qrHeaderCheck: '#38bdf8',
    qrHeaderText: '#e0f2fe',
    qrIdColor: '#ffffff',
    qrSubColor: '#bae6fd',
    qrDarkColor: '#082f49',

    footerBorder: 'rgba(56, 189, 248, 0.25)',
    footerIconColor: '#38bdf8',
    footerLabelColor: '#7dd3fc',
    footerValueColor: '#ffffff',
  },

  // ==========================================
  // THEME 2: LARANJA (VIBRANT AMBER & ORANGE)
  // ==========================================
  orange: {
    id: 'orange',
    name: 'Laranja',
    emoji: '🔥',
    previewBg: 'linear-gradient(135deg, #ea580c 0%, #fb923c 100%)',
    description: 'Energia Solar e Âmbar Holográfico',
    isLightMode: false,

    cardBg: 'linear-gradient(165deg, #240e05 0%, #331407 45%, #140702 100%)',
    cardBorder: 'rgba(251, 146, 60, 0.5)',
    cardShadow: '0 25px 60px -15px rgba(234, 88, 12, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.25)',
    ambientGlow: 'radial-gradient(circle at 50% 20%, rgba(249, 115, 22, 0.25) 0%, transparent 70%)',

    sphereTopStops: [
      { offset: '0%', color: '#ffedd5' },
      { offset: '30%', color: '#fb923c' },
      { offset: '70%', color: '#ea580c' },
      { offset: '100%', color: '#7c2d12' },
    ],
    coneLightStops: [
      { offset: '0%', color: '#fdba74' },
      { offset: '50%', color: '#f97316' },
      { offset: '100%', color: '#9a3412' },
    ],
    coneShadowStops: [
      { offset: '0%', color: '#c2410c' },
      { offset: '100%', color: '#7c2d12' },
    ],
    torusStroke: 'url(#torusGrad_orange)',
    sphereBottomStops: [
      { offset: '0%', color: '#fed7aa' },
      { offset: '40%', color: '#f97316' },
      { offset: '100%', color: '#9a3412' },
    ],
    prismStops: [
      { offset: '0%', color: '#fb923c' },
      { offset: '100%', color: '#c2410c' },
    ],

    brandColor: '#fb923c',
    titleColor: '#ffffff',
    subtitleColor: '#fed7aa',
    roleColor: '#fb923c',
    nameColor: '#ffffff',
    specialtyColor: '#ffedd5',

    verifiedBg: 'linear-gradient(135deg, #ea580c 0%, #fb923c 100%)',
    verifiedBorder: 'rgba(255, 255, 255, 0.6)',
    verifiedText: '#ffffff',
    rosetteStops: [
      { offset: '0%', color: '#fdba74' },
      { offset: '50%', color: '#ea580c' },
      { offset: '100%', color: '#c2410c' },
    ],
    rosetteInner: '#7c2d12',
    rosetteCheck: '#ffffff',

    avatarBorder: '#fb923c',
    avatarBg: 'linear-gradient(135deg, #7c2d12 0%, #c2410c 100%)',
    avatarShadow: '0 0 30px rgba(249, 115, 22, 0.4), inset 0 0 15px rgba(251, 146, 60, 0.3)',
    avatarCheckBg: '#ea580c',
    avatarCheckBorder: '#ffffff',
    avatarCheckColor: '#ffffff',

    crefitoBg: 'rgba(124, 45, 18, 0.8)',
    crefitoBorder: 'rgba(251, 146, 60, 0.6)',
    crefitoText: '#ffffff',
    proBg: 'linear-gradient(135deg, #ea580c 0%, #fb923c 100%)',
    proBorder: 'rgba(255, 255, 255, 0.7)',
    proText: '#ffffff',

    qrCardBg: 'linear-gradient(160deg, rgba(124, 45, 18, 0.85) 0%, rgba(194, 65, 12, 0.5) 100%)',
    qrCardBorder: 'rgba(251, 146, 60, 0.55)',
    qrCardShadow: '0 15px 35px rgba(234, 88, 12, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.25)',
    qrBoxBg: '#ffffff',
    qrHeaderCheck: '#fb923c',
    qrHeaderText: '#ffedd5',
    qrIdColor: '#ffffff',
    qrSubColor: '#fed7aa',
    qrDarkColor: '#431407',

    footerBorder: 'rgba(251, 146, 60, 0.3)',
    footerIconColor: '#fb923c',
    footerLabelColor: '#fdba74',
    footerValueColor: '#ffffff',
  },

  // ==========================================
  // THEME 3: VERDE CLARO (MINT & ESMERALD)
  // ==========================================
  green: {
    id: 'green',
    name: 'Verde Claro',
    emoji: '🌿',
    previewBg: 'linear-gradient(135deg, #059669 0%, #34d399 100%)',
    description: 'Menta Fresca e Esmeralda Tecnológica',
    isLightMode: false,

    cardBg: 'linear-gradient(165deg, #042217 0%, #073324 45%, #02140e 100%)',
    cardBorder: 'rgba(52, 211, 153, 0.5)',
    cardShadow: '0 25px 60px -15px rgba(16, 185, 129, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.25)',
    ambientGlow: 'radial-gradient(circle at 50% 20%, rgba(52, 211, 153, 0.25) 0%, transparent 70%)',

    sphereTopStops: [
      { offset: '0%', color: '#d1fae5' },
      { offset: '30%', color: '#34d399' },
      { offset: '70%', color: '#059669' },
      { offset: '100%', color: '#064e3b' },
    ],
    coneLightStops: [
      { offset: '0%', color: '#6ee7b7' },
      { offset: '50%', color: '#10b981' },
      { offset: '100%', color: '#047857' },
    ],
    coneShadowStops: [
      { offset: '0%', color: '#059669' },
      { offset: '100%', color: '#064e3b' },
    ],
    torusStroke: 'url(#torusGrad_green)',
    sphereBottomStops: [
      { offset: '0%', color: '#a7f3d0' },
      { offset: '40%', color: '#10b981' },
      { offset: '100%', color: '#047857' },
    ],
    prismStops: [
      { offset: '0%', color: '#34d399' },
      { offset: '100%', color: '#047857' },
    ],

    brandColor: '#34d399',
    titleColor: '#ffffff',
    subtitleColor: '#a7f3d0',
    roleColor: '#34d399',
    nameColor: '#ffffff',
    specialtyColor: '#d1fae5',

    verifiedBg: 'linear-gradient(135deg, #059669 0%, #34d399 100%)',
    verifiedBorder: 'rgba(255, 255, 255, 0.6)',
    verifiedText: '#ffffff',
    rosetteStops: [
      { offset: '0%', color: '#6ee7b7' },
      { offset: '50%', color: '#059669' },
      { offset: '100%', color: '#047857' },
    ],
    rosetteInner: '#064e3b',
    rosetteCheck: '#ffffff',

    avatarBorder: '#34d399',
    avatarBg: 'linear-gradient(135deg, #064e3b 0%, #047857 100%)',
    avatarShadow: '0 0 30px rgba(16, 185, 129, 0.4), inset 0 0 15px rgba(52, 211, 153, 0.3)',
    avatarCheckBg: '#059669',
    avatarCheckBorder: '#ffffff',
    avatarCheckColor: '#ffffff',

    crefitoBg: 'rgba(6, 78, 59, 0.8)',
    crefitoBorder: 'rgba(52, 211, 153, 0.6)',
    crefitoText: '#ffffff',
    proBg: 'linear-gradient(135deg, #059669 0%, #34d399 100%)',
    proBorder: 'rgba(255, 255, 255, 0.7)',
    proText: '#ffffff',

    qrCardBg: 'linear-gradient(160deg, rgba(6, 78, 59, 0.85) 0%, rgba(4, 120, 87, 0.5) 100%)',
    qrCardBorder: 'rgba(52, 211, 153, 0.55)',
    qrCardShadow: '0 15px 35px rgba(16, 185, 129, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.25)',
    qrBoxBg: '#ffffff',
    qrHeaderCheck: '#34d399',
    qrHeaderText: '#d1fae5',
    qrIdColor: '#ffffff',
    qrSubColor: '#a7f3d0',
    qrDarkColor: '#022c22',

    footerBorder: 'rgba(52, 211, 153, 0.3)',
    footerIconColor: '#34d399',
    footerLabelColor: '#6ee7b7',
    footerValueColor: '#ffffff',
  },

  // ==========================================
  // THEME 4: BRANCO COM ROXO (LIGHT MODE LUXURY)
  // ==========================================
  'white-purple': {
    id: 'white-purple',
    name: 'Branco com Roxo',
    emoji: '💜',
    previewBg: 'linear-gradient(135deg, #7e22ce 0%, #c084fc 50%, #fdf4ff 100%)',
    description: 'Light Mode Sofisticado com Acentos Violeta',
    isLightMode: true,

    cardBg: 'linear-gradient(165deg, #ffffff 0%, #faf5ff 40%, #f3e8ff 100%)',
    cardBorder: 'rgba(168, 85, 247, 0.4)',
    cardShadow: '0 25px 60px -15px rgba(147, 51, 234, 0.25), inset 0 1px 2px rgba(255, 255, 255, 0.9)',
    ambientGlow: 'radial-gradient(circle at 50% 20%, rgba(192, 132, 252, 0.2) 0%, transparent 70%)',

    sphereTopStops: [
      { offset: '0%', color: '#faf5ff' },
      { offset: '30%', color: '#c084fc' },
      { offset: '70%', color: '#7e22ce' },
      { offset: '100%', color: '#3b0764' },
    ],
    coneLightStops: [
      { offset: '0%', color: '#e9d5ff' },
      { offset: '50%', color: '#a855f7' },
      { offset: '100%', color: '#6b21a8' },
    ],
    coneShadowStops: [
      { offset: '0%', color: '#7e22ce' },
      { offset: '100%', color: '#3b0764' },
    ],
    torusStroke: 'url(#torusGrad_white_purple)',
    sphereBottomStops: [
      { offset: '0%', color: '#f3e8ff' },
      { offset: '40%', color: '#a855f7' },
      { offset: '100%', color: '#581c87' },
    ],
    prismStops: [
      { offset: '0%', color: '#c084fc' },
      { offset: '100%', color: '#6b21a8' },
    ],

    brandColor: '#7e22ce',
    titleColor: '#1e1b4b',
    subtitleColor: '#6b21a8',
    roleColor: '#7e22ce',
    nameColor: '#1e1b4b',
    specialtyColor: '#4c1d95',

    verifiedBg: 'linear-gradient(135deg, #7e22ce 0%, #a855f7 100%)',
    verifiedBorder: 'rgba(255, 255, 255, 0.8)',
    verifiedText: '#ffffff',
    rosetteStops: [
      { offset: '0%', color: '#e9d5ff' },
      { offset: '50%', color: '#7e22ce' },
      { offset: '100%', color: '#581c87' },
    ],
    rosetteInner: '#3b0764',
    rosetteCheck: '#ffffff',

    avatarBorder: '#9333ea',
    avatarBg: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)',
    avatarShadow: '0 0 30px rgba(168, 85, 247, 0.35), inset 0 0 15px rgba(147, 51, 234, 0.2)',
    avatarCheckBg: '#7e22ce',
    avatarCheckBorder: '#ffffff',
    avatarCheckColor: '#ffffff',

    crefitoBg: 'rgba(243, 232, 255, 0.95)',
    crefitoBorder: 'rgba(168, 85, 247, 0.5)',
    crefitoText: '#4c1d95',
    proBg: 'linear-gradient(135deg, #7e22ce 0%, #a855f7 100%)',
    proBorder: 'rgba(255, 255, 255, 0.8)',
    proText: '#ffffff',

    qrCardBg: 'linear-gradient(160deg, rgba(255, 255, 255, 0.95) 0%, rgba(243, 232, 255, 0.9) 100%)',
    qrCardBorder: 'rgba(168, 85, 247, 0.45)',
    qrCardShadow: '0 15px 35px rgba(126, 34, 206, 0.15), inset 0 1px 2px rgba(255, 255, 255, 1)',
    qrBoxBg: '#ffffff',
    qrHeaderCheck: '#7e22ce',
    qrHeaderText: '#3b0764',
    qrIdColor: '#1e1b4b',
    qrSubColor: '#6b21a8',
    qrDarkColor: '#3b0764',

    footerBorder: 'rgba(168, 85, 247, 0.25)',
    footerIconColor: '#7e22ce',
    footerLabelColor: '#6b21a8',
    footerValueColor: '#1e1b4b',
  },
};

// ==========================================
// HELPER UTILITIES
// ==========================================

const safeText = (value: unknown, fallback = ''): string => {
  if (value === null || value === undefined) return fallback;
  const str = String(value).trim();
  return str.length > 0 ? str : fallback;
};

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'FC';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const getServiceLabel = (serviceType: unknown): string => {
  const val = String(serviceType || '').toLowerCase();
  if (val.includes('ambos') || val.includes('hibrido') || val.includes('híbrido')) {
    return 'Consultório e Domiciliar';
  }
  if (val.includes('domiciliar') || val.includes('home') || val.includes('casa')) {
    return 'Atendimento Domiciliar';
  }
  return 'Atendimento em Consultório';
};

const createAvatarFallback = (name: string, theme: CredentialThemeConfig): string => {
  const initials = getInitials(name);
  const bg = theme.isLightMode ? '%23f3e8ff' : '%230c4a6e';
  const text = theme.isLightMode ? '%23581c87' : '%23ffffff';
  const border = theme.isLightMode ? '%239333ea' : '%2338bdf8';

  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240"><rect width="240" height="240" rx="40" fill="${bg}"/><rect x="6" y="6" width="228" height="228" rx="34" fill="none" stroke="${border}" stroke-width="4" stroke-opacity="0.5"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="${text}" font-family="system-ui,-apple-system,sans-serif" font-size="80" font-weight="900" letter-spacing="2">${initials}</text></svg>`;
};

const fileNameFromName = (value: string): string => {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || 'profissional';
};

const imageUrlToDataUrl = async (url: string): Promise<string | null> => {
  if (!url) return null;
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;

  // Strategy 1: Fetch as blob and convert via FileReader
  try {
    const response = await fetch(url, {
      mode: 'cors',
      credentials: 'omit',
    });
    if (response.ok) {
      const blob = await response.blob();
      if (blob.type.startsWith('image/')) {
        const dataUrl = await new Promise<string | null>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(blob);
        });
        if (dataUrl) return dataUrl;
      }
    }
  } catch {}

  // Strategy 2: Image object with crossOrigin anonymous + Canvas
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
// INNER CREDENTIAL CARD (ON-SCREEN PREVIEW)
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
  (
    {
      theme,
      professionalName,
      specialty,
      crefito,
      city,
      serviceLabel,
      issuedAt,
      credentialCode,
      approved,
      isPro,
      publicProfileUrl,
      avatarSrc,
      avatarFallbackSrc,
      qrDataUrl,
    },
    ref,
  ) => {
    const [internalQr, setInternalQr] = useState<string>('');

    // Generate QR code data URL matching theme if not provided
    useEffect(() => {
      if (qrDataUrl) {
        setInternalQr(qrDataUrl);
        return;
      }
      let cancelled = false;
      const targetUrl = publicProfileUrl || 'https://fisiocarehub.app';

      QRCode.toDataURL(targetUrl, {
        errorCorrectionLevel: 'H',
        margin: 2,
        width: 400,
        color: {
          dark: theme.qrDarkColor,
          light: '#ffffff',
        },
      })
        .then((url) => {
          if (!cancelled) setInternalQr(url);
        })
        .catch(() => {});

      return () => {
        cancelled = true;
      };
    }, [publicProfileUrl, theme.qrDarkColor, qrDataUrl]);

    const activeQr = qrDataUrl || internalQr;

    return (
      <div
        ref={ref}
        data-credential-card
        className="relative aspect-[9/16] min-h-[580px] sm:min-h-[660px] w-full overflow-hidden rounded-[2.25rem] sm:rounded-[2.75rem] p-5 sm:p-7 flex flex-col justify-between select-none"
        style={{
          background: theme.cardBg,
          borderColor: theme.cardBorder,
          borderWidth: '2px',
          borderStyle: 'solid',
          boxShadow: theme.cardShadow,
          color: theme.titleColor,
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          boxSizing: 'border-box',
        }}
      >
        {/* Cybernetic Tech Grid & 3D Abstract Geometric Elements */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute inset-0" style={{ background: theme.ambientGlow }} />

          {/* Isometric Micro-Grid Layer */}
          <svg className="absolute inset-0 h-full w-full opacity-15" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id={`gridPattern_${theme.id}`} width="28" height="28" patternUnits="userSpaceOnUse">
                <path
                  d="M 28 0 L 0 0 0 28"
                  fill="none"
                  stroke={theme.brandColor}
                  strokeWidth="0.75"
                  strokeOpacity="0.4"
                />
                <circle cx="28" cy="28" r="1" fill={theme.brandColor} fillOpacity="0.6" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#gridPattern_${theme.id})`} />
          </svg>

          {/* High-Tech Geometric 3D Shapes */}
          <svg
            className="absolute -right-12 -top-12 h-64 w-64 sm:h-72 sm:w-72"
            viewBox="0 0 300 300"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <radialGradient id={`sphereTop_${theme.id}`} cx="35%" cy="30%" r="65%">
                {theme.sphereTopStops.map((stop, idx) => (
                  <stop key={idx} offset={stop.offset} stopColor={stop.color} />
                ))}
              </radialGradient>
              <linearGradient id={`coneLight_${theme.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                {theme.coneLightStops.map((stop, idx) => (
                  <stop key={idx} offset={stop.offset} stopColor={stop.color} />
                ))}
              </linearGradient>
              <linearGradient id={`coneShadow_${theme.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                {theme.coneShadowStops.map((stop, idx) => (
                  <stop key={idx} offset={stop.offset} stopColor={stop.color} />
                ))}
              </linearGradient>
              <linearGradient id={`torusGrad_${theme.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={theme.brandColor} stopOpacity="0.8" />
                <stop offset="50%" stopColor="#ffffff" stopOpacity="0.9" />
                <stop offset="100%" stopColor={theme.brandColor} stopOpacity="0.3" />
              </linearGradient>
            </defs>

            {/* Glowing 3D Glass Sphere Top Right */}
            <circle cx="180" cy="110" r="75" fill={`url(#sphereTop_${theme.id})`} />
            <circle
              cx="180"
              cy="110"
              r="75"
              fill="none"
              stroke="rgba(255,255,255,0.45)"
              strokeWidth="1.5"
            />

            {/* Orbiting Tech Rings / Torus */}
            <ellipse
              cx="180"
              cy="110"
              rx="105"
              ry="32"
              transform="rotate(-28 180 110)"
              fill="none"
              stroke={`url(#torusGrad_${theme.id})`}
              strokeWidth="3.5"
              strokeDasharray="4 8 16 8"
            />

            {/* Geometric Futuristic Polyhedral Cone Accent */}
            <path d="M75 145 L135 60 L145 155 Z" fill={`url(#coneLight_${theme.id})`} opacity="0.85" />
            <path d="M135 60 L180 140 L145 155 Z" fill={`url(#coneShadow_${theme.id})`} opacity="0.9" />
          </svg>

          {/* Bottom Left 3D Floating Geometry */}
          <svg
            className="absolute -bottom-16 -left-16 h-60 w-60 sm:h-68 sm:w-68"
            viewBox="0 0 300 300"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <radialGradient id={`sphereBottom_${theme.id}`} cx="30%" cy="30%" r="70%">
                {theme.sphereBottomStops.map((stop, idx) => (
                  <stop key={idx} offset={stop.offset} stopColor={stop.color} />
                ))}
              </radialGradient>
              <linearGradient id={`prismGrad_${theme.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                {theme.prismStops.map((stop, idx) => (
                  <stop key={idx} offset={stop.offset} stopColor={stop.color} />
                ))}
              </linearGradient>
            </defs>

            {/* Bottom 3D Sphere */}
            <circle cx="110" cy="190" r="65" fill={`url(#sphereBottom_${theme.id})`} opacity="0.8" />
            <circle
              cx="110"
              cy="190"
              r="65"
              fill="none"
              stroke="rgba(255,255,255,0.4)"
              strokeWidth="1.5"
            />

            {/* Abstract Floating Cylinder / Bar */}
            <rect
              x="145"
              y="90"
              width="24"
              height="85"
              rx="12"
              transform="rotate(42 145 90)"
              fill={`url(#prismGrad_${theme.id})`}
              stroke="rgba(255,255,255,0.5)"
              strokeWidth="1"
              opacity="0.8"
            />

            <ellipse
              cx="110"
              cy="190"
              rx="88"
              ry="24"
              transform="rotate(35 110 190)"
              fill="none"
              stroke="rgba(255,255,255,0.4)"
              strokeWidth="2"
              strokeDasharray="6 6"
            />
          </svg>
        </div>

        {/* Content Container (Layered above 3D graphics) */}
        <div className="relative z-10 flex h-full flex-col justify-between">
          {/* Top Header: Logo + Brand + Rosette Verified Seal */}
          <div className="flex items-center justify-between gap-2 border-b pb-2.5 sm:pb-3.5" style={{ borderColor: theme.footerBorder }}>
            <div className="flex items-center gap-2">
              {/* FisioCare Minimal Logo Icon */}
              <div
                className="flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-2xl shadow-lg"
                style={{
                  background: theme.verifiedBg,
                  border: '1.5px solid rgba(255,255,255,0.6)',
                }}
              >
                <Sparkles className="h-5 w-5 text-white" />
              </div>

              <div>
                <h3
                  className="text-xs sm:text-sm font-black tracking-tight uppercase leading-none"
                  style={{ color: theme.titleColor }}
                >
                  FISIOCARE<span style={{ color: theme.brandColor }}>HUB</span>
                </h3>
                <p
                  className="text-[8.5px] sm:text-[10px] font-bold uppercase tracking-[0.2em] mt-0.5"
                  style={{ color: theme.subtitleColor }}
                >
                  CARTEIRA DIGITAL
                </p>
              </div>
            </div>

            {/* Official Scalloped Rosette Seal / Verified Emblem */}
            <div className="flex items-center gap-1.5">
              <div className="relative flex items-center justify-center">
                <svg
                  className="h-10 w-10 sm:h-12 sm:w-12 animate-pulse"
                  viewBox="0 0 48 48"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  style={{
                    filter: theme.isLightMode
                      ? 'drop-shadow(0 0 8px rgba(168, 85, 247, 0.4))'
                      : theme.id === 'blue'
                      ? 'drop-shadow(0 0 12px rgba(56, 189, 248, 0.6))'
                      : theme.id === 'orange'
                      ? 'drop-shadow(0 0 12px rgba(234, 88, 12, 0.6))'
                      : 'drop-shadow(0 0 12px rgba(16, 185, 129, 0.6))',
                  }}
                >
                  <defs>
                    <linearGradient id={`rosetteGrad_${theme.id}`} x1="0" y1="0" x2="1" y2="1">
                      {theme.rosetteStops.map((stop, idx) => (
                        <stop key={idx} offset={stop.offset} stopColor={stop.color} />
                      ))}
                    </linearGradient>
                  </defs>
                  <path
                    d="M24 2 C26.2 2 28 4.2 29.5 5.5 C31.5 5.3 33.7 6.1 35 7.7 C36.1 9.2 36.1 11.4 36.8 13.1 C38.5 14.3 39.7 16.4 39.7 18.5 C39.7 20.3 38.8 22.1 39.5 23.9 C39.5 26.1 38.3 28.2 36.8 29.5 C36.1 31.2 36.1 33.4 34.8 34.9 C33.3 36.3 31.2 36.9 29.5 36.7 C28 38 26.2 40.2 24 40.2 C21.8 40.2 20 38 18.5 36.7 C16.8 36.9 14.7 36.3 13.2 34.9 C11.9 33.4 11.9 31.2 11.2 29.5 C9.7 28.2 8.5 26.1 8.5 23.9 C9.2 22.1 8.3 20.3 8.3 18.5 C8.3 16.4 9.5 14.3 11.2 13.1 C11.9 11.4 11.9 9.2 13 7.7 C14.3 6.1 16.5 5.3 18.5 5.5 C20 4.2 21.8 2 24 2 Z"
                    fill={`url(#rosetteGrad_${theme.id})`}
                    stroke="rgba(255,255,255,0.6)"
                    strokeWidth="1.5"
                  />
                  <circle cx="24" cy="21" r="11" fill={theme.rosetteInner} opacity="0.5" />
                  <path
                    d="M19 21 L22.5 24.5 L29 17.5"
                    stroke={theme.rosetteCheck}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Middle Section: Avatar + Name + Specialization + Registration Pills + Validation Panel */}
          <div className="flex flex-1 flex-col items-center justify-evenly py-2 my-1">
            {/* Photo Frame */}
            <div
              className="relative h-24 w-24 sm:h-32 sm:w-32 overflow-hidden rounded-[1.75rem] sm:rounded-[2.2rem]"
              style={{
                borderWidth: '2.5px',
                borderStyle: 'solid',
                borderColor: theme.avatarBorder,
                background: theme.avatarBg,
                boxShadow: theme.avatarShadow,
              }}
            >
              <img
                data-credential-avatar="true"
                src={avatarSrc || avatarFallbackSrc}
                alt={professionalName}
                crossOrigin="anonymous"
                className="h-full w-full object-cover object-center"
                onError={(e) => {
                  const img = e.currentTarget;
                  if (img.src !== avatarFallbackSrc) {
                    img.src = avatarFallbackSrc;
                  }
                }}
              />

              {/* Cyan / Theme Verified Badge on Photo */}
              <div
                className="absolute bottom-1.5 right-1.5 sm:bottom-2 sm:right-2 rounded-full p-0.5 shadow-md flex items-center justify-center"
                style={{
                  borderWidth: '2px',
                  borderStyle: 'solid',
                  borderColor: theme.avatarCheckBorder,
                  background: theme.avatarCheckBg,
                  color: theme.avatarCheckColor,
                }}
              >
                <CheckCircle2 size={12} className="sm:h-3.5 sm:w-3.5" />
              </div>
            </div>

            {/* Title, Name, Specialization */}
            <div className="w-full min-w-0 space-y-0.5 text-center px-2">
              <p
                className="text-[9px] font-bold uppercase tracking-[0.28em] sm:text-xs"
                style={{ color: theme.roleColor }}
              >
                FISIOTERAPEUTA
              </p>

              <h4
                className="truncate text-lg font-black leading-tight tracking-tight sm:text-2xl"
                style={{ color: theme.nameColor }}
              >
                {professionalName}
              </h4>

              <p
                className="mx-auto max-w-[95%] text-[9px] font-bold uppercase leading-tight tracking-[0.16em] sm:text-xs sm:tracking-[0.18em]"
                style={{ color: theme.specialtyColor }}
              >
                {specialty}
              </p>
            </div>

            {/* Registration Pills Side-by-Side: CREFITO + PRO */}
            <div className="flex items-center justify-center gap-2">
              <span
                className="inline-flex items-center justify-center rounded-full px-3.5 py-1 text-center text-[9px] font-black uppercase tracking-wider shadow-sm sm:px-4 sm:py-1 sm:text-[11px]"
                style={{
                  background: theme.crefitoBg,
                  borderColor: theme.crefitoBorder,
                  borderWidth: '1.5px',
                  borderStyle: 'solid',
                  color: theme.crefitoText,
                }}
              >
                <span
                  style={{ color: theme.id === 'blue' ? '#38bdf8' : theme.brandColor }}
                  className="mr-1"
                >
                  {crefito.toUpperCase().startsWith('CREFITO') ? '' : 'CREFITO-3: '}
                </span>
                <span>{crefito.replace(/^CREFITO-?\d*:\s*/i, '')}</span>
              </span>

              {isPro && (
                <span
                  className="inline-flex items-center gap-1 justify-center rounded-full px-3 py-1 text-center text-[9px] font-black uppercase tracking-wider sm:text-[10.5px]"
                  style={{
                    background: theme.proBg,
                    borderColor: theme.proBorder,
                    borderWidth: '1.5px',
                    borderStyle: 'solid',
                    color: theme.proText,
                  }}
                >
                  <Star size={11} className="fill-current" />
                  <span>PRO</span>
                </span>
              )}
            </div>

            {/* Central Glassmorphism Validation Panel */}
            <div
              className="flex w-full max-w-[270px] sm:max-w-[310px] flex-col items-center justify-center gap-1.5 rounded-[1.5rem] sm:rounded-[1.8rem] p-3 sm:p-4 backdrop-blur-xl"
              style={{
                background: theme.qrCardBg,
                borderColor: theme.qrCardBorder,
                borderWidth: '1.5px',
                borderStyle: 'solid',
                boxShadow: theme.qrCardShadow,
              }}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black" style={{ color: theme.qrHeaderCheck }}>
                  ✓
                </span>
                <span
                  className="text-[9.5px] font-black uppercase tracking-[0.2em] sm:text-[11px]"
                  style={{ color: theme.qrHeaderText }}
                >
                  VALIDAR CREDENCIAL
                </span>
              </div>

              <div
                className="flex h-[95px] w-[95px] sm:h-[125px] sm:w-[125px] items-center justify-center rounded-2xl p-2 shadow-lg"
                style={{ background: theme.qrBoxBg }}
              >
                {activeQr ? (
                  <img
                    data-credential-qr="true"
                    src={activeQr}
                    alt="QR Code"
                    className="h-full w-full rounded-xl object-contain"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-center text-[8px] font-black uppercase text-slate-500">
                    Gerando QR...
                  </div>
                )}
              </div>

              <p
                className="max-w-[250px] truncate text-center text-[8.5px] font-black tracking-wider sm:text-[10px] uppercase mt-0.5"
                style={{ color: theme.qrIdColor }}
              >
                ID DA CREDENCIAL - {credentialCode}
              </p>

              <p
                className="text-center text-[7.5px] font-medium sm:text-[8.5px]"
                style={{ color: theme.qrSubColor }}
              >
                Escanear para verificar este perfil
              </p>
            </div>
          </div>

          {/* Bottom Footer 3-Column Info Bar with Icons */}
          <div
            className="pt-2 sm:pt-3 text-[8px] font-medium sm:text-[9.5px]"
            style={{
              borderTopWidth: '1.5px',
              borderTopStyle: 'solid',
              borderTopColor: theme.footerBorder,
            }}
          >
            <div className="grid grid-cols-3 gap-1 text-center">
              {/* Modalidade */}
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1" style={{ color: theme.footerIconColor }}>
                  <Home size={11} />
                  <span className="text-[7.5px] sm:text-[8.5px] uppercase font-bold" style={{ color: theme.footerLabelColor }}>
                    MODALIDADE
                  </span>
                </div>
                <span className="truncate max-w-full font-bold mt-0.5" style={{ color: theme.footerValueColor }}>
                  {serviceLabel.includes('Domiciliar') && serviceLabel.includes('Consultório')
                    ? 'Híbrido'
                    : serviceLabel.replace('Atendimento ', '')}
                </span>
              </div>

              {/* Localidade */}
              <div className="flex flex-col items-center border-x" style={{ borderColor: theme.footerBorder }}>
                <div className="flex items-center gap-1" style={{ color: theme.footerIconColor }}>
                  <MapPin size={11} />
                  <span className="text-[7.5px] sm:text-[8.5px] uppercase font-bold" style={{ color: theme.footerLabelColor }}>
                    LOCALIDADE
                  </span>
                </div>
                <span className="truncate max-w-full font-bold mt-0.5" style={{ color: theme.footerValueColor }}>
                  {city}
                </span>
              </div>

              {/* Emissão */}
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1" style={{ color: theme.footerIconColor }}>
                  <Calendar size={11} />
                  <span className="text-[7.5px] sm:text-[8.5px] uppercase font-bold" style={{ color: theme.footerLabelColor }}>
                    EMISSÃO
                  </span>
                </div>
                <span className="font-bold mt-0.5" style={{ color: theme.footerValueColor }}>
                  {issuedAt}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  },
);

CredentialCardInner.displayName = 'CredentialCardInner';

// ==========================================
// MULTI-APP SHARE MODAL (WHATSAPP, INSTAGRAM, TELEGRAM, LINK)
// ==========================================

export interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  publicProfileUrl: string;
  professionalName: string;
  specialty: string;
  qrDataUrl?: string;
  onDownloadImage: () => Promise<void>;
  downloading: boolean;
}

export function ShareModal({
  isOpen,
  onClose,
  publicProfileUrl,
  professionalName,
  specialty,
  onDownloadImage,
  downloading,
}: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const shareText = `Confira minha Credencial Digital Profissional no FisioCareHub:\n\n*${professionalName}*\n${specialty}\n\nAcesse o perfil completo e valide minha credencial:\n${publicProfileUrl}`;

  const handleShareWhatsApp = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
  };

  const handleShareTelegram = () => {
    const url = `https://t.me/share/url?url=${encodeURIComponent(publicProfileUrl)}&text=${encodeURIComponent(`Credencial Profissional - ${professionalName} (${specialty})`)}`;
    window.open(url, '_blank');
  };

  const handleCopy = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(publicProfileUrl);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = publicProfileUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-99999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      toast.success('Link copiado para a área de transferência!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Não foi possível copiar o link.');
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Credencial - ${professionalName}`,
          text: `Valide a credencial profissional de ${professionalName} (${specialty}) no FisioCareHub.`,
          url: publicProfileUrl,
        });
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          handleCopy();
        }
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/20 bg-slate-900/95 p-6 text-white shadow-2xl backdrop-blur-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative Top Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-40 w-72 rounded-full bg-sky-500/25 blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400 border border-sky-400/30">
              <Share2 size={18} />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight text-white">Compartilhar Credencial</h3>
              <p className="text-xs text-slate-400">Divulgue seu cartão digital verificado</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Share Options Grid */}
        <div className="my-5 space-y-3">
          {/* WhatsApp Direct Share */}
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="flex w-full items-center justify-between rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-left transition-all hover:bg-emerald-500/20 hover:border-emerald-500/50 group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
                <MessageCircle size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-emerald-300">WhatsApp</p>
                <p className="text-xs text-slate-400">Enviar link e mensagem formatada</p>
              </div>
            </div>
            <ExternalLink size={16} className="text-emerald-400 opacity-60 group-hover:opacity-100 transition-opacity" />
          </button>

          {/* Telegram Share */}
          <button
            type="button"
            onClick={handleShareTelegram}
            className="flex w-full items-center justify-between rounded-2xl border border-sky-500/30 bg-sky-500/10 p-3.5 text-left transition-all hover:bg-sky-500/20 hover:border-sky-500/50 group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500 text-white shadow-lg shadow-sky-500/30">
                <Send size={18} />
              </div>
              <div>
                <p className="text-sm font-bold text-sky-300">Telegram</p>
                <p className="text-xs text-slate-400">Compartilhar com contatos e grupos</p>
              </div>
            </div>
            <ExternalLink size={16} className="text-sky-400 opacity-60 group-hover:opacity-100 transition-opacity" />
          </button>

          {/* Download Image Action */}
          <button
            type="button"
            onClick={onDownloadImage}
            disabled={downloading}
            className="flex w-full items-center justify-between rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-3.5 text-left transition-all hover:bg-indigo-500/20 hover:border-indigo-500/50 group cursor-pointer disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500 text-white shadow-lg shadow-indigo-500/30">
                <Download size={18} />
              </div>
              <div>
                <p className="text-sm font-bold text-indigo-300">
                  {downloading ? 'Gerando Imagem HD...' : 'Baixar Imagem da Credencial'}
                </p>
                <p className="text-xs text-slate-400">Salvar PNG em alta resolução</p>
              </div>
            </div>
            <Download size={16} className="text-indigo-400 opacity-60 group-hover:opacity-100 transition-opacity" />
          </button>

          {/* Native System Share (Mobile) */}
          <button
            type="button"
            onClick={handleNativeShare}
            className="flex w-full items-center justify-between rounded-2xl border border-purple-500/30 bg-purple-500/10 p-3.5 text-left transition-all hover:bg-purple-500/20 hover:border-purple-500/50 group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500 text-white shadow-lg shadow-purple-500/30">
                <Smartphone size={18} />
              </div>
              <div>
                <p className="text-sm font-bold text-purple-300">Mais Opções no Celular</p>
                <p className="text-xs text-slate-400">Instagram Stories, e-mail e outros apps</p>
              </div>
            </div>
            <Share2 size={16} className="text-purple-400 opacity-60 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>

        {/* Copy Direct Link Section */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <p className="text-[11px] font-bold text-slate-300 mb-1.5 uppercase tracking-wider">Link direto da credencial</p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={publicProfileUrl}
              className="flex-1 rounded-xl bg-black/40 px-3 py-2 text-xs text-slate-300 border border-white/10 focus:outline-none select-all font-mono truncate"
            />
            <button
              type="button"
              onClick={handleCopy}
              className={cn(
                'flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-black transition-all cursor-pointer shadow-md',
                copied
                  ? 'bg-emerald-500 text-white'
                  : 'bg-sky-500 hover:bg-sky-600 text-white shadow-sky-500/30',
              )}
            >
              {copied ? (
                <>
                  <Check size={14} />
                  <span>Copiado!</span>
                </>
              ) : (
                <>
                  <Copy size={14} />
                  <span>Copiar</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// MAIN COMPONENT EXPORT
// ==========================================

export interface ProfessionalCredentialCardProps {
  profile?: any;
  className?: string;
  variant?: 'full' | 'compact';
}

export function ProfessionalCredentialCard({
  profile,
  className,
  variant = 'full',
}: ProfessionalCredentialCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  // Persistent Theme State from localStorage
  const [selectedThemeId, setSelectedThemeId] = useState<CredentialThemeId>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('fisiocare_credential_theme') as CredentialThemeId;
      if (saved && CREDENTIAL_THEMES[saved]) return saved;
    }
    return 'blue';
  });

  const [downloading, setDownloading] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [avatarDataUrl, setAvatarDataUrl] = useState<string>('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const currentTheme = CREDENTIAL_THEMES[selectedThemeId] || CREDENTIAL_THEMES.blue;

  const profileId = profile?.id || profile?.user_id || '';

  const publicProfileUrl = useMemo(() => {
    if (typeof window === 'undefined') return 'https://fisiocarehub.app';
    if (profileId) {
      return `${window.location.origin}/physio/${profileId}`;
    }
    return `${window.location.origin}/physio/preview`;
  }, [profileId]);

  const professionalName = safeText(
    profile?.nome_completo || profile?.nome || profile?.name,
    'Fisioterapeuta',
  );

  const specialty = safeText(
    profile?.especialidade || profile?.especialidade_principal || profile?.specialty,
    'Fisioterapia',
  );

  const crefito = safeText(
    profile?.crefito || profile?.registro_profissional || profile?.numero_crefito,
    'Pendente',
  );

  const city = safeText(
    profile?.localizacao || [profile?.cidade, profile?.estado].filter(Boolean).join(', '),
    'Região não informada',
  );

  const avatarFallbackUrl = useMemo(
    () => createAvatarFallback(professionalName, currentTheme),
    [professionalName, currentTheme],
  );

  const rawAvatar =
    profile?.avatar_url ||
    profile?.foto_url ||
    profile?.foto ||
    profile?.foto_perfil ||
    profile?.avatar ||
    profile?.photoURL ||
    profile?.fotoUrl ||
    '';

  const resolvedAvatarUrl = useMemo(
    () => (rawAvatar ? resolveStorageUrl(rawAvatar) : ''),
    [rawAvatar],
  );

  // Pre-convert avatar to Data URL so export capture never suffers from CORS or network issues
  useEffect(() => {
    let active = true;
    if (resolvedAvatarUrl) {
      imageUrlToDataUrl(resolvedAvatarUrl).then((dataUrl) => {
        if (active && dataUrl) {
          setAvatarDataUrl(dataUrl);
        }
      });
    } else {
      setAvatarDataUrl('');
    }
    return () => {
      active = false;
    };
  }, [resolvedAvatarUrl]);

  // Generate high-resolution QR code (600x600 px) matching the current theme
  useEffect(() => {
    let active = true;
    const targetUrl = publicProfileUrl || 'https://fisiocarehub.app';
    QRCode.toDataURL(targetUrl, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 600,
      color: {
        dark: currentTheme.qrDarkColor,
        light: '#ffffff',
      },
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [publicProfileUrl, currentTheme.qrDarkColor]);

  const finalAvatarSrc = avatarDataUrl || resolvedAvatarUrl || avatarFallbackUrl;

  const approved =
    String(profile?.status_aprovacao || '').toLowerCase() === 'aprovado' ||
    Boolean(profile?.aprovado || profile?.verificado);

  const issuedAt = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date());

  const credentialCode = profileId
    ? `FCH-${String(profileId).slice(0, 8).toUpperCase()}`
    : 'FCH-PERFIL';

  const serviceLabel = getServiceLabel(profile?.tipo_servico);
  const isCompact = variant === 'compact';

  const handleSelectTheme = (themeId: CredentialThemeId) => {
    setSelectedThemeId(themeId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('fisiocare_credential_theme', themeId);
    }
  };

  // Capture the EXACT on-screen credential card with high-resolution scale
  const generateCardBlob = async (): Promise<Blob> => {
    const cardEl = cardRef.current;
    if (!cardEl) {
      throw new Error('Componente da credencial não encontrado.');
    }

    // PREPARATION PHASE:
    // 1. Ensure QR Code is generated as high-resolution Data URL (600x600)
    let effectiveQr = qrDataUrl;
    if (!effectiveQr || !effectiveQr.startsWith('data:image/')) {
      try {
        const qrTarget =
          publicProfileUrl ||
          `${typeof window !== 'undefined' ? window.location.origin : 'https://fisiocarehub.app'}/physio/${profileId || 'preview'}`;
        const generatedQr = await QRCode.toDataURL(qrTarget, {
          errorCorrectionLevel: 'H',
          margin: 2,
          width: 600,
          color: {
            dark: currentTheme.qrDarkColor,
            light: '#ffffff',
          },
        });
        if (generatedQr) {
          effectiveQr = generatedQr;
          setQrDataUrl(generatedQr);
        }
      } catch (qrErr) {
        console.warn('QR Code export prep warning:', qrErr);
      }
    }

    // 2. Ensure Professional Photo is converted to a base64 Data URL or fallback SVG data URL
    let effectiveAvatar = avatarDataUrl;
    if (!effectiveAvatar && resolvedAvatarUrl) {
      try {
        effectiveAvatar = (await imageUrlToDataUrl(resolvedAvatarUrl)) || '';
        if (effectiveAvatar) {
          setAvatarDataUrl(effectiveAvatar);
        }
      } catch {}
    }
    if (!effectiveAvatar) {
      effectiveAvatar = avatarFallbackUrl;
    }

    // 3. Directly assign verified Data URLs to card DOM images to ensure zero CORS or network latency issues
    const avatarImg = cardEl.querySelector<HTMLImageElement>('img[data-credential-avatar]');
    if (avatarImg && effectiveAvatar) {
      avatarImg.src = effectiveAvatar;
    }

    const qrImg = cardEl.querySelector<HTMLImageElement>('img[data-credential-qr]');
    if (qrImg && effectiveQr) {
      qrImg.src = effectiveQr;
    }

    // 4. Wait for all <img> elements inside cardEl to complete and decode
    const allImages = Array.from(cardEl.querySelectorAll('img'));
    await Promise.all(
      allImages.map(async (img) => {
        if (!img.complete || img.naturalWidth === 0) {
          await new Promise<void>((resolve) => {
            const timer = setTimeout(resolve, 2500);
            img.onload = () => {
              clearTimeout(timer);
              resolve();
            };
            img.onerror = () => {
              clearTimeout(timer);
              resolve();
            };
          });
        }
        try {
          await img.decode?.();
        } catch {}
      }),
    );

    // 5. Wait for web fonts to be completely ready
    if (typeof document !== 'undefined' && 'fonts' in document) {
      try {
        await document.fonts.ready;
      } catch {}
    }

    // 6. Wait for animation frame and layout stabilization
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTimeout(resolve, 120);
        });
      });
    });

    // CAPTURE PHASE:
    // 1. Primary: Use toPng from html-to-image which natively supports CSS gradients and SVG filters
    try {
      const dataUrl = await toPng(cardEl, {
        pixelRatio: 3,
        cacheBust: false,
        skipAutoScale: true,
      });

      if (dataUrl && dataUrl.length > 500) {
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        if (blob && blob.size > 5000) {
          return blob;
        }
      }
    } catch (err) {
      console.warn('html-to-image export warning, attempting fallback:', err);
    }

    // 2. Fallback: html2canvas
    const fallbackCanvas = await html2canvas(cardEl, {
      scale: 3,
      useCORS: true,
      allowTaint: true,
      backgroundColor: null,
      logging: false,
      imageTimeout: 15000,
      scrollX: 0,
      scrollY: 0,
    });

    if (!fallbackCanvas) {
      throw new Error('Não foi possível renderizar a credencial.');
    }

    const blob = await new Promise<Blob | null>((resolve) => {
      fallbackCanvas.toBlob(resolve, 'image/png', 1.0);
    });

    if (!blob || blob.size < 2000) {
      throw new Error('Arquivo de imagem gerado está incompleto.');
    }

    return blob;
  };

  const handleDownloadCredential = async () => {
    if (downloading) return;
    setDownloading(true);

    try {
      const blob = await generateCardBlob();
      const fileName = `credencial-fisiocarehub-${fileNameFromName(professionalName)}.png`;
      saveAs(blob, fileName);
      toast.success('Credencial baixada com sucesso.');
    } catch (error) {
      console.error('Erro ao baixar credencial:', error);
      toast.error('Não foi possível gerar o download da credencial.');
    } finally {
      setDownloading(false);
    }
  };

  const handleOpenShare = () => {
    setIsShareModalOpen(true);
  };

  const handleCopyLink = async () => {
    if (!publicProfileUrl) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(publicProfileUrl);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = publicProfileUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-99999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      toast.success('Link da credencial copiado com sucesso!');
    } catch {
      toast.error('Não foi possível copiar o link.');
    }
  };

  return (
    <section
      className={cn(
        'relative mb-24 overflow-hidden rounded-[2rem] border border-sky-200/70 bg-white p-4 shadow-xl shadow-sky-100/70 dark:border-white/10 dark:bg-slate-900/50 dark:shadow-black/20 sm:rounded-[2.5rem] sm:p-6',
        isCompact && 'p-3 sm:p-4',
        className,
      )}
    >
      {/* Background Decorative Blurs */}
      <div className="absolute -right-20 -top-20 h-44 w-44 rounded-full bg-sky-400/20 blur-3xl dark:bg-blue-500/20 pointer-events-none" />
      <div className="absolute -bottom-24 -left-16 h-52 w-52 rounded-full bg-emerald-400/20 blur-3xl dark:bg-emerald-500/10 pointer-events-none" />

      {/* Top Header & Actions */}
      <div className="relative z-10 mb-6 space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300">
              <Crown size={13} fill="currentColor" />
              Credencial premium
            </div>

            {!isCompact && (
              <p className="mt-2 max-w-2xl text-xs font-semibold leading-relaxed text-slate-600 dark:text-slate-400">
                Carteira digital profissional para identificação, compartilhamento em aplicativos e validação do perfil.
              </p>
            )}
          </div>
        </div>

        {/* Color Theme Selector ("Personalizar credencial") */}
        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3.5 dark:border-white/10 dark:bg-slate-800/50 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-2.5">
            <Palette size={15} className="text-primary" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
              Personalizar credencial
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(Object.keys(CREDENTIAL_THEMES) as CredentialThemeId[]).map((themeKey) => {
              const themeItem = CREDENTIAL_THEMES[themeKey];
              const isSelected = selectedThemeId === themeKey;

              return (
                <button
                  key={themeKey}
                  type="button"
                  onClick={() => handleSelectTheme(themeKey)}
                  className={cn(
                    'flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all duration-200 cursor-pointer',
                    isSelected
                      ? 'border-primary ring-2 ring-primary/30 bg-white shadow-md dark:bg-slate-700/90 dark:border-primary'
                      : 'border-slate-200 bg-white/70 hover:border-slate-300 hover:bg-white dark:border-white/5 dark:bg-slate-800/40 dark:hover:bg-slate-800',
                  )}
                >
                  {/* Swatch Preview Pill */}
                  <div
                    className="w-5 h-5 rounded-full shrink-0 border border-black/10 shadow-sm"
                    style={{ background: themeItem.previewBg }}
                  />
                  <div className="min-w-0">
                    <p className="text-[11px] font-black text-slate-800 dark:text-slate-100 truncate">
                      {themeItem.name}
                    </p>
                    <p className="text-[9px] font-medium text-slate-500 dark:text-slate-400 truncate">
                      {themeItem.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Buttons: Compartilhar, Baixar Imagem, Copiar Link */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <button
            type="button"
            onClick={handleOpenShare}
            disabled={!publicProfileUrl}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-600 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-sky-500/20 transition-all hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Share2 size={15} />
            Compartilhar no WhatsApp / Apps
          </button>

          <button
            type="button"
            onClick={handleDownloadCredential}
            disabled={downloading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-700 shadow-sm transition-all hover:border-sky-300 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
          >
            <Download size={15} />
            {downloading ? 'Gerando...' : 'Baixar credencial (HD)'}
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

      {/* On-Screen Credential Component */}
      <div className="relative z-10 mx-auto w-full max-w-[440px]">
        <CredentialCardInner
          ref={cardRef}
          theme={currentTheme}
          professionalName={professionalName}
          specialty={specialty}
          crefito={crefito}
          city={city}
          serviceLabel={serviceLabel}
          issuedAt={issuedAt}
          credentialCode={credentialCode}
          approved={approved}
          isPro={isPro}
          publicProfileUrl={publicProfileUrl}
          avatarSrc={finalAvatarSrc}
          avatarFallbackSrc={avatarFallbackUrl}
          qrDataUrl={qrDataUrl}
        />
      </div>

      {/* Interactive Multi-App Share Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        publicProfileUrl={publicProfileUrl}
        professionalName={professionalName}
        specialty={specialty}
        qrDataUrl={qrDataUrl}
        onDownloadImage={handleDownloadCredential}
        downloading={downloading}
      />

      {!isCompact && (
        <p className="relative z-10 mx-auto mt-4 max-w-[520px] text-[10px] font-semibold leading-relaxed text-slate-500 dark:text-slate-500 text-center">
          Esta credencial identifica o perfil profissional dentro da plataforma e não substitui consulta oficial junto ao CREFITO.
        </p>
      )}
    </section>
  );
}
