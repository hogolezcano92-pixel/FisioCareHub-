import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  Check,
  CheckCircle2,
  Copy,
  Crown,
  Download,
  ExternalLink,
  Mail,
  MessageCircle,
  Palette,
  Send,
  Share2,
  Smartphone,
  UserRound,
  X,
} from 'lucide-react';

import QRCode from 'qrcode';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';
import { toast } from 'sonner';
import { cn, resolveStorageUrl } from '../lib/utils';

// ==========================================
// THEME DEFINITIONS & COLOR PALETTES
// ==========================================

export type CredentialThemeId =
  | 'blue'
  | 'orange'
  | 'green'
  | 'white-purple';

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

export const CREDENTIAL_THEMES: Record<
  CredentialThemeId,
  CredentialThemeConfig
> = {
  blue: {
    id: 'blue',
    name: 'Azul Claro',
    emoji: '🔵',
    previewBg: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
    description: 'Tecnologia, saúde e modernidade',
    cardBg:
      'linear-gradient(165deg, #031526 0%, #072846 30%, #0c3e69 60%, #062744 85%, #021220 100%)',
    cardBorder: 'rgba(56, 189, 248, 0.4)',
    cardShadow:
      '0 30px 70px -15px rgba(2, 132, 199, 0.45), 0 0 40px rgba(56, 189, 248, 0.15)',
    ambientGlow: 'rgba(14, 165, 233, 0.25)',
    sphereTopStops: [
      { offset: '0%', color: '#f0f9ff' },
      { offset: '30%', color: '#7dd3fc' },
      { offset: '70%', color: '#0284c7' },
      { offset: '100%', color: '#075985' },
    ],
    coneLightStops: [
      { offset: '0%', color: '#e0f2fe' },
      { offset: '50%', color: '#38bdf8' },
      { offset: '100%', color: '#0284c7' },
    ],
    coneShadowStops: [
      { offset: '0%', color: '#0284c7' },
      { offset: '70%', color: '#075985' },
      { offset: '100%', color: '#082f49' },
    ],
    torusStroke: 'rgba(125, 211, 252, 0.45)',
    sphereBottomStops: [
      { offset: '0%', color: '#e0f2fe' },
      { offset: '30%', color: '#38bdf8' },
      { offset: '70%', color: '#0284c7' },
      { offset: '100%', color: '#075985' },
    ],
    prismStops: [
      { offset: '0%', color: '#7dd3fc' },
      { offset: '60%', color: '#0284c7' },
      { offset: '100%', color: '#0c4a6e' },
    ],
    brandColor: '#7dd3fc',
    titleColor: '#ffffff',
    subtitleColor: '#bae6fd',
    roleColor: '#7dd3fc',
    nameColor: '#ffffff',
    specialtyColor: '#e0f2fe',
    verifiedBg: 'rgba(2, 132, 199, 0.95)',
    verifiedBorder: 'rgba(125, 211, 252, 0.55)',
    verifiedText: '#f0f9ff',
    rosetteStops: [
      { offset: '0%', color: '#f0f9ff' },
      { offset: '35%', color: '#7dd3fc' },
      { offset: '75%', color: '#0284c7' },
      { offset: '100%', color: '#0369a1' },
    ],
    rosetteInner: '#0369a1',
    rosetteCheck: '#ffffff',
    avatarBorder: 'rgba(125, 211, 252, 0.5)',
    avatarBg: 'rgba(12, 74, 110, 0.6)',
    avatarShadow: '0 16px 40px rgba(2, 132, 199, 0.4)',
    avatarCheckBg: '#0284c7',
    avatarCheckBorder: '#031526',
    avatarCheckColor: '#ffffff',
    crefitoBg: 'rgba(7, 43, 72, 0.95)',
    crefitoBorder: 'rgba(125, 211, 252, 0.45)',
    crefitoText: '#f0f9ff',
    proBg: 'rgba(251, 191, 36, 0.2)',
    proBorder: 'rgba(252, 211, 77, 0.5)',
    proText: '#fef08a',
    qrCardBg: 'rgba(12, 74, 110, 0.65)',
    qrCardBorder: 'rgba(125, 211, 252, 0.35)',
    qrCardShadow: '0 20px 45px rgba(2, 132, 199, 0.35)',
    qrHeaderCheck: '#34d399',
    qrHeaderText: '#bae6fd',
    qrBoxBg: '#ffffff',
    qrDarkColor: '#020617',
    qrIdColor: '#f0f9ff',
    qrSubColor: '#bae6fd',
    footerBorder: 'rgba(125, 211, 252, 0.25)',
    footerTextColor: '#93c5fd',
    footerCenterColor: '#f0f9ff',
  },

  orange: {
    id: 'orange',
    name: 'Laranja',
    emoji: '🟠',
    previewBg: 'linear-gradient(135deg, #ea580c 0%, #fb923c 100%)',
    description: 'Energia, calor e sofisticação',
    cardBg:
      'linear-gradient(165deg, #1a0a03 0%, #331406 30%, #4d1c08 60%, #2b0e03 85%, #150600 100%)',
    cardBorder: 'rgba(251, 146, 60, 0.4)',
    cardShadow:
      '0 30px 70px -15px rgba(234, 88, 12, 0.45), 0 0 40px rgba(251, 146, 60, 0.15)',
    ambientGlow: 'rgba(234, 88, 12, 0.25)',
    sphereTopStops: [
      { offset: '0%', color: '#fff7ed' },
      { offset: '30%', color: '#fdba74' },
      { offset: '70%', color: '#ea580c' },
      { offset: '100%', color: '#9a3412' },
    ],
    coneLightStops: [
      { offset: '0%', color: '#ffedd5' },
      { offset: '50%', color: '#fb923c' },
      { offset: '100%', color: '#ea580c' },
    ],
    coneShadowStops: [
      { offset: '0%', color: '#ea580c' },
      { offset: '70%', color: '#7c2d12' },
      { offset: '100%', color: '#431407' },
    ],
    torusStroke: 'rgba(253, 186, 116, 0.45)',
    sphereBottomStops: [
      { offset: '0%', color: '#ffedd5' },
      { offset: '30%', color: '#fb923c' },
      { offset: '70%', color: '#ea580c' },
      { offset: '100%', color: '#9a3412' },
    ],
    prismStops: [
      { offset: '0%', color: '#fdba74' },
      { offset: '60%', color: '#ea580c' },
      { offset: '100%', color: '#7c2d12' },
    ],
    brandColor: '#fdba74',
    titleColor: '#ffffff',
    subtitleColor: '#fed7aa',
    roleColor: '#fdba74',
    nameColor: '#ffffff',
    specialtyColor: '#ffedd5',
    verifiedBg: 'rgba(217, 83, 11, 0.95)',
    verifiedBorder: 'rgba(253, 186, 116, 0.55)',
    verifiedText: '#fff7ed',
    rosetteStops: [
      { offset: '0%', color: '#fff7ed' },
      { offset: '35%', color: '#fdba74' },
      { offset: '75%', color: '#ea580c' },
      { offset: '100%', color: '#9a3412' },
    ],
    rosetteInner: '#9a3412',
    rosetteCheck: '#ffffff',
    avatarBorder: 'rgba(253, 186, 116, 0.5)',
    avatarBg: 'rgba(77, 28, 8, 0.6)',
    avatarShadow: '0 16px 40px rgba(234, 88, 12, 0.4)',
    avatarCheckBg: '#ea580c',
    avatarCheckBorder: '#1a0a03',
    avatarCheckColor: '#ffffff',
    crefitoBg: 'rgba(51, 20, 6, 0.95)',
    crefitoBorder: 'rgba(253, 186, 116, 0.45)',
    crefitoText: '#fff7ed',
    proBg: 'rgba(251, 191, 36, 0.2)',
    proBorder: 'rgba(252, 211, 77, 0.5)',
    proText: '#fef08a',
    qrCardBg: 'rgba(77, 28, 8, 0.65)',
    qrCardBorder: 'rgba(253, 186, 116, 0.35)',
    qrCardShadow: '0 20px 45px rgba(234, 88, 12, 0.35)',
    qrHeaderCheck: '#4ade80',
    qrHeaderText: '#fed7aa',
    qrBoxBg: '#ffffff',
    qrDarkColor: '#1a0a03',
    qrIdColor: '#fff7ed',
    qrSubColor: '#fed7aa',
    footerBorder: 'rgba(251, 146, 60, 0.25)',
    footerTextColor: '#fdba74',
    footerCenterColor: '#fff7ed',
  },

  green: {
    id: 'green',
    name: 'Verde Claro',
    emoji: '🟢',
    previewBg: 'linear-gradient(135deg, #059669 0%, #34d399 100%)',
    description: 'Saúde, equilíbrio e frescor',
    cardBg:
      'linear-gradient(165deg, #021711 0%, #053324 30%, #094a34 60%, #062e20 85%, #01140e 100%)',
    cardBorder: 'rgba(52, 211, 153, 0.4)',
    cardShadow:
      '0 30px 70px -15px rgba(5, 150, 105, 0.45), 0 0 40px rgba(52, 211, 153, 0.15)',
    ambientGlow: 'rgba(16, 185, 129, 0.25)',
    sphereTopStops: [
      { offset: '0%', color: '#f0fdf4' },
      { offset: '30%', color: '#6ee7b7' },
      { offset: '70%', color: '#059669' },
      { offset: '100%', color: '#047857' },
    ],
    coneLightStops: [
      { offset: '0%', color: '#ecfdf5' },
      { offset: '50%', color: '#34d399' },
      { offset: '100%', color: '#059669' },
    ],
    coneShadowStops: [
      { offset: '0%', color: '#059669' },
      { offset: '70%', color: '#065f46' },
      { offset: '100%', color: '#022c22' },
    ],
    torusStroke: 'rgba(110, 231, 183, 0.45)',
    sphereBottomStops: [
      { offset: '0%', color: '#ecfdf5' },
      { offset: '30%', color: '#34d399' },
      { offset: '70%', color: '#059669' },
      { offset: '100%', color: '#047857' },
    ],
    prismStops: [
      { offset: '0%', color: '#6ee7b7' },
      { offset: '60%', color: '#059669' },
      { offset: '100%', color: '#064e3b' },
    ],
    brandColor: '#6ee7b7',
    titleColor: '#ffffff',
    subtitleColor: '#a7f3d0',
    roleColor: '#6ee7b7',
    nameColor: '#ffffff',
    specialtyColor: '#ecfdf5',
    verifiedBg: 'rgba(5, 150, 105, 0.95)',
    verifiedBorder: 'rgba(110, 231, 183, 0.55)',
    verifiedText: '#f0fdf4',
    rosetteStops: [
      { offset: '0%', color: '#f0fdf4' },
      { offset: '35%', color: '#6ee7b7' },
      { offset: '75%', color: '#059669' },
      { offset: '100%', color: '#047857' },
    ],
    rosetteInner: '#047857',
    rosetteCheck: '#ffffff',
    avatarBorder: 'rgba(110, 231, 183, 0.5)',
    avatarBg: 'rgba(9, 74, 52, 0.6)',
    avatarShadow: '0 16px 40px rgba(5, 150, 105, 0.4)',
    avatarCheckBg: '#059669',
    avatarCheckBorder: '#021711',
    avatarCheckColor: '#ffffff',
    crefitoBg: 'rgba(5, 51, 36, 0.95)',
    crefitoBorder: 'rgba(110, 231, 183, 0.45)',
    crefitoText: '#f0fdf4',
    proBg: 'rgba(251, 191, 36, 0.2)',
    proBorder: 'rgba(252, 211, 77, 0.5)',
    proText: '#fef08a',
    qrCardBg: 'rgba(9, 74, 52, 0.65)',
    qrCardBorder: 'rgba(110, 231, 183, 0.35)',
    qrCardShadow: '0 20px 45px rgba(5, 150, 105, 0.35)',
    qrHeaderCheck: '#6ee7b7',
    qrHeaderText: '#a7f3d0',
    qrBoxBg: '#ffffff',
    qrDarkColor: '#021711',
    qrIdColor: '#f0fdf4',
    qrSubColor: '#a7f3d0',
    footerBorder: 'rgba(52, 211, 153, 0.25)',
    footerTextColor: '#6ee7b7',
    footerCenterColor: '#f0fdf4',
  },

  'white-purple': {
    id: 'white-purple',
    name: 'Branco + Roxo',
    emoji: '🟣',
    previewBg:
      'linear-gradient(135deg, #ffffff 0%, #f3e8ff 45%, #7e22ce 100%)',
    description: 'Fundo branco com detalhes em roxo',
    isLightMode: true,
    cardBg:
      'linear-gradient(165deg, #ffffff 0%, #faf5ff 30%, #f3e8ff 65%, #e9d5ff 88%, #f8f5fe 100%)',
    cardBorder: 'rgba(147, 51, 234, 0.4)',
    cardShadow:
      '0 30px 70px -15px rgba(126, 34, 206, 0.3), 0 0 35px rgba(168, 85, 247, 0.12)',
    ambientGlow: 'rgba(168, 85, 247, 0.2)',
    sphereTopStops: [
      { offset: '0%', color: '#f3e8ff' },
      { offset: '30%', color: '#c084fc' },
      { offset: '70%', color: '#7e22ce' },
      { offset: '100%', color: '#581c87' },
    ],
    coneLightStops: [
      { offset: '0%', color: '#f3e8ff' },
      { offset: '50%', color: '#a855f7' },
      { offset: '100%', color: '#6b21a8' },
    ],
    coneShadowStops: [
      { offset: '0%', color: '#7e22ce' },
      { offset: '70%', color: '#581c87' },
      { offset: '100%', color: '#3b0764' },
    ],
    torusStroke: 'rgba(168, 85, 247, 0.5)',
    sphereBottomStops: [
      { offset: '0%', color: '#f3e8ff' },
      { offset: '30%', color: '#a855f7' },
      { offset: '70%', color: '#6b21a8' },
      { offset: '100%', color: '#4c1d95' },
    ],
    prismStops: [
      { offset: '0%', color: '#c084fc' },
      { offset: '60%', color: '#7e22ce' },
      { offset: '100%', color: '#3b0764' },
    ],
    brandColor: '#6b21a8',
    titleColor: '#1e1b4b',
    subtitleColor: '#7c3aed',
    roleColor: '#6b21a8',
    nameColor: '#1e1b4b',
    specialtyColor: '#4338ca',
    verifiedBg: 'rgba(126, 34, 206, 0.95)',
    verifiedBorder: 'rgba(147, 51, 234, 0.55)',
    verifiedText: '#ffffff',
    rosetteStops: [
      { offset: '0%', color: '#f3e8ff' },
      { offset: '35%', color: '#c084fc' },
      { offset: '75%', color: '#7e22ce' },
      { offset: '100%', color: '#4c1d95' },
    ],
    rosetteInner: '#581c87',
    rosetteCheck: '#ffffff',
    avatarBorder: 'rgba(147, 51, 234, 0.5)',
    avatarBg: 'rgba(243, 232, 255, 0.95)',
    avatarShadow: '0 16px 40px rgba(126, 34, 206, 0.22)',
    avatarCheckBg: '#7e22ce',
    avatarCheckBorder: '#ffffff',
    avatarCheckColor: '#ffffff',
    crefitoBg: 'rgba(243, 232, 255, 0.95)',
    crefitoBorder: 'rgba(147, 51, 234, 0.45)',
    crefitoText: '#581c87',
    proBg: 'rgba(251, 191, 36, 0.25)',
    proBorder: 'rgba(217, 119, 6, 0.55)',
    proText: '#92400e',
    qrCardBg: 'rgba(255, 255, 255, 0.92)',
    qrCardBorder: 'rgba(168, 85, 247, 0.38)',
    qrCardShadow: '0 20px 45px rgba(126, 34, 206, 0.15)',
    qrHeaderCheck: '#16a34a',
    qrHeaderText: '#6b21a8',
    qrBoxBg: '#ffffff',
    qrDarkColor: '#2e1065',
    qrIdColor: '#1e1b4b',
    qrSubColor: '#6b21a8',
    footerBorder: 'rgba(147, 51, 234, 0.25)',
    footerTextColor: '#6b21a8',
    footerCenterColor: '#1e1b4b',
  },
};

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

const safeText = (
  value: unknown,
  fallback = 'Não informado',
) => {
  const text = String(value ?? '').trim();
  return text || fallback;
};

const getServiceLabel = (type?: string | null) => {
  const normalized = String(type || '').toLowerCase();

  if (normalized === 'online') {
    return 'Atendimento online';
  }

  if (normalized === 'domicilio') {
    return 'Atendimento domiciliar';
  }

  if (normalized === 'ambos') {
    return 'Domiciliar e online';
  }

  return 'Atendimento fisioterapêutico';
};

const getInitials = (name: string) => {
  const parts = name
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return 'FH';
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${
    parts[parts.length - 1][0]
  }`.toUpperCase();
};

const createAvatarFallback = (
  name: string,
  theme: CredentialThemeConfig,
) => {
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
      <text x="250" y="270" text-anchor="middle"
        font-family="system-ui, -apple-system, sans-serif"
        font-size="130" font-weight="900" fill="${textColor}">
        ${initials}
      </text>
      <text x="250" y="340" text-anchor="middle"
        font-family="system-ui, -apple-system, sans-serif"
        font-size="24" font-weight="800"
        letter-spacing="6" fill="${subColor}">
        FISIOCAREHUB
      </text>
    </svg>
  `)}`;
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

const imageUrlToDataUrl = async (
  url: string,
): Promise<string | null> => {
  if (!url) {
    return null;
  }

  if (
    url.startsWith('data:') ||
    url.startsWith('blob:')
  ) {
    return url;
  }

  try {
    const response = await fetch(url, {
      mode: 'cors',
      credentials: 'omit',
      cache: 'no-cache',
    });

    if (!response.ok) {
      return null;
    }

    const blob = await response.blob();

    if (!blob.type.startsWith('image/')) {
      return null;
    }

    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();

      reader.onload = () => {
        resolve(
          typeof reader.result === 'string'
            ? reader.result
            : null,
        );
      };

      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

const waitForImages = async (
  root: HTMLElement,
) => {
  const images = Array.from(
    root.querySelectorAll('img'),
  );

  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (
            img.complete &&
            img.naturalWidth > 0
          ) {
            resolve();
            return;
          }

          let finished = false;

          const done = () => {
            if (finished) return;

            finished = true;

            img.removeEventListener(
              'load',
              done,
            );

            img.removeEventListener(
              'error',
              done,
            );

            resolve();
          };

          img.addEventListener('load', done);
          img.addEventListener('error', done);

          setTimeout(done, 5000);
        }),
    ),
  );
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
  exportMode?: boolean;
}

export const CredentialCardInner =
  React.forwardRef<
    HTMLDivElement,
    CredentialCardInnerProps
  >(
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
        exportMode = false,
      },
      ref,
    ) => {
      const [internalQr, setInternalQr] =
        useState<string>('');

      useEffect(() => {
        if (qrDataUrl) {
          setInternalQr(qrDataUrl);
          return;
        }

        let cancelled = false;

        if (!publicProfileUrl) {
          setInternalQr('');
          return;
        }

        QRCode.toDataURL(publicProfileUrl, {
          errorCorrectionLevel: 'H',
          margin: 2,
          width: 500,
          color: {
            dark: theme.qrDarkColor,
            light: '#ffffff',
          },
        })
          .then((url) => {
            if (!cancelled) {
              setInternalQr(url);
            }
          })
          .catch(() => {});

        return () => {
          cancelled = true;
        };
      }, [
        publicProfileUrl,
        theme.qrDarkColor,
        qrDataUrl,
      ]);

      const activeQr =
        qrDataUrl || internalQr;

      /*
       * No modo normal, o cartão continua exatamente
       * responsivo como antes.
       *
       * No modo exportação, ele recebe dimensões fixas
       * de 900 x 1600 px.
       */
      const cardStyle: React.CSSProperties = {
        background: theme.cardBg,
        borderColor: theme.cardBorder,
        borderWidth: '2px',
        borderStyle: 'solid',
        boxShadow: theme.cardShadow,
        color: theme.titleColor,
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        boxSizing: 'border-box',

        ...(exportMode
          ? {
              width: '900px',
              height: '1600px',
              minWidth: '900px',
              maxWidth: '900px',
              minHeight: '1600px',
              maxHeight: '1600px',
              aspectRatio: '9 / 16',
              borderRadius: '54px',
              padding: '42px',
            }
          : {}),
      };

      return (
        <div
          ref={ref}
          data-credential-card
          data-export-mode={
            exportMode ? 'true' : 'false'
          }
          className={cn(
            'relative aspect-[9/16] min-h-[580px] sm:min-h-[660px] w-full overflow-hidden rounded-[2.25rem] sm:rounded-[2.75rem] p-5 sm:p-7 flex flex-col justify-between select-none',
            exportMode &&
              '!w-[900px] !h-[1600px] !min-w-[900px] !max-w-[900px] !min-h-[1600px] !max-h-[1600px] !rounded-[54px] !p-[42px]',
          )}
          style={cardStyle}
        >
          {/* ==========================================
              BACKGROUND DECORATIONS
          ========================================== */}

          <div
            className="absolute inset-0 pointer-events-none overflow-hidden"
            aria-hidden="true"
          >
            {/* Top Right Sphere */}

            <svg
              className={cn(
                'absolute -right-10 -top-10 w-48 h-48 sm:w-60 sm:h-60 opacity-90',
                exportMode &&
                  '!right-[-50px] !top-[-50px] !w-[300px] !h-[300px]',
              )}
              viewBox="0 0 200 200"
              fill="none"
            >
              <defs>
                <radialGradient
                  id={`sphereTop_${theme.id}`}
                  cx="38%"
                  cy="32%"
                  r="65%"
                  fx="32%"
                  fy="28%"
                >
                  {theme.sphereTopStops.map(
                    (stop, idx) => (
                      <stop
                        key={idx}
                        offset={stop.offset}
                        stopColor={stop.color}
                      />
                    ),
                  )}
                </radialGradient>
              </defs>

              <circle
                cx="100"
                cy="100"
                r="70"
                fill={`url(#sphereTop_${theme.id})`}
              />
            </svg>

            {/* Left Cone */}

            <svg
              className={cn(
                'absolute -left-12 top-1/4 w-40 h-52 sm:w-52 sm:h-68 opacity-85',
                exportMode &&
                  '!left-[-65px] !top-[25%] !w-[260px] !h-[350px]',
              )}
              viewBox="0 0 160 220"
              fill="none"
            >
              <defs>
                <linearGradient
                  id={`coneLight_${theme.id}`}
                  x1="0"
                  y1="0"
                  x2="1"
                  y2="1"
                >
                  {theme.coneLightStops.map(
                    (stop, idx) => (
                      <stop
                        key={idx}
                        offset={stop.offset}
                        stopColor={stop.color}
                      />
                    ),
                  )}
                </linearGradient>

                <linearGradient
                  id={`coneShadow_${theme.id}`}
                  x1="0"
                  y1="0"
                  x2="1"
                  y2="1"
                >
                  {theme.coneShadowStops.map(
                    (stop, idx) => (
                      <stop
                        key={idx}
                        offset={stop.offset}
                        stopColor={stop.color}
                      />
                    ),
                  )}
                </linearGradient>
              </defs>

              <ellipse
                cx="60"
                cy="130"
                rx="55"
                ry="55"
                stroke={theme.torusStroke}
                strokeWidth="8"
                fill="none"
              />

              <polygon
                points="85,30 20,170 85,185"
                fill={`url(#coneLight_${theme.id})`}
              />

              <polygon
                points="85,30 85,185 140,160"
                fill={`url(#coneShadow_${theme.id})`}
              />
            </svg>

            {/* Bottom Right */}

            <svg
              className={cn(
                'absolute -right-12 -bottom-12 w-48 h-52 sm:w-60 sm:h-64 opacity-85',
                exportMode &&
                  '!right-[-65px] !bottom-[-65px] !w-[300px] !h-[320px]',
              )}
              viewBox="0 0 200 200"
              fill="none"
            >
              <defs>
                <radialGradient
                  id={`sphereBottom_${theme.id}`}
                  cx="35%"
                  cy="30%"
                  r="70%"
                  fx="30%"
                  fy="25%"
                >
                  {theme.sphereBottomStops.map(
                    (stop, idx) => (
                      <stop
                        key={idx}
                        offset={stop.offset}
                        stopColor={stop.color}
                      />
                    ),
                  )}
                </radialGradient>

                <linearGradient
                  id={`prismGrad_${theme.id}`}
                  x1="0"
                  y1="0"
                  x2="1"
                  y2="1"
                >
                  {theme.prismStops.map(
                    (stop, idx) => (
                      <stop
                        key={idx}
                        offset={stop.offset}
                        stopColor={stop.color}
                      />
                    ),
                  )}
                </linearGradient>
              </defs>

              <polygon
                points="110,40 190,140 100,180"
                fill={`url(#prismGrad_${theme.id})`}
                opacity="0.9"
              />

              <circle
                cx="70"
                cy="120"
                r="56"
                fill={`url(#sphereBottom_${theme.id})`}
              />
            </svg>

            {/* Ambient Glow */}

            <div
              className={cn(
                'absolute top-1/3 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full blur-3xl pointer-events-none',
                exportMode &&
                  '!w-[500px] !h-[500px]',
              )}
              style={{
                background:
                  theme.ambientGlow,
              }}
            />
          </div>

          {/* ==========================================
              FOREGROUND
          ========================================== */}

          <div
            className={cn(
              'relative z-10 flex h-full flex-col justify-between',
              exportMode &&
                '!h-full !justify-between',
            )}
          >
            {/* HEADER */}

            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p
                  className={cn(
                    'text-[9px] font-black uppercase tracking-[0.28em] sm:text-xs sm:tracking-[0.32em]',
                    exportMode &&
                      '!text-[16px] !tracking-[0.32em]',
                  )}
                  style={{
                    color: theme.brandColor,
                  }}
                >
                  FisioCareHub
                </p>

                <h3
                  className={cn(
                    'mt-0.5 text-lg font-black leading-tight tracking-tight sm:text-2xl',
                    exportMode &&
                      '!mt-1 !text-[32px]',
                  )}
                  style={{
                    color: theme.titleColor,
                  }}
                >
                  Credencial Profissional
                </h3>

                <p
                  className={cn(
                    'mt-0.5 text-[8px] font-bold uppercase tracking-[0.2em] sm:text-[10px]',
                    exportMode &&
                      '!mt-1 !text-[13px] !tracking-[0.2em]',
                  )}
                  style={{
                    color:
                      theme.subtitleColor,
                  }}
                >
                  Identificação digital
                </p>
              </div>

              {/* VERIFIED */}

              <div className="flex flex-col items-end gap-1 shrink-0">
                <div
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-3 py-1 text-[8px] font-black uppercase tracking-wider shadow-md backdrop-blur-sm sm:px-3.5 sm:py-1 sm:text-[10px]',
                    exportMode &&
                      '!gap-2 !px-5 !py-2 !text-[13px]',
                  )}
                  style={{
                    background:
                      theme.verifiedBg,
                    borderColor:
                      theme.verifiedBorder,
                    borderWidth: '1.5px',
                    borderStyle: 'solid',
                    color:
                      theme.verifiedText,
                  }}
                >
                  <span>✓</span>
                  <span>Verificado</span>
                </div>

                <div
                  className={cn(
                    'relative w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center -mr-0.5',
                    exportMode &&
                      '!w-[54px] !h-[54px]',
                  )}
                >
                  <svg
                    viewBox="0 0 48 48"
                    className="w-full h-full drop-shadow-md"
                  >
                    <defs>
                      <linearGradient
                        id={`rosetteGrad_${theme.id}`}
                        x1="0"
                        y1="0"
                        x2="1"
                        y2="1"
                      >
                        {theme.rosetteStops.map(
                          (stop, idx) => (
                            <stop
                              key={idx}
                              offset={stop.offset}
                              stopColor={
                                stop.color
                              }
                            />
                          ),
                        )}
                      </linearGradient>
                    </defs>

                    <path
                      d="M24 2 C26.2 2 28 4.2 29.5 5.5 C31.5 5.3 33.7 6.1 35 7.7 C36.1 9.2 36.1 11.4 36.8 13.1 C38.5 14.3 39.7 16.4 39.7 18.5 C39.7 20.3 38.8 22.1 39.5 23.9 C39.5 26.1 38.3 28.2 36.8 29.5 C36.1 31.2 36.1 33.4 34.8 34.9 C33.3 36.3 31.2 36.9 29.5 36.7 C28 38 26.2 40.2 24 40.2 C21.8 40.2 20 38 18.5 36.7 C16.8 36.9 14.7 36.3 13.2 34.9 C11.9 33.4 11.9 31.2 11.2 29.5 C9.7 28.2 8.5 26.1 8.5 23.9 C9.2 22.1 8.3 20.3 8.3 18.5 C8.3 16.4 9.5 14.3 11.2 13.1 C11.9 11.4 11.9 9.2 13 7.7 C14.3 6.1 16.5 5.3 18.5 5.5 C20 4.2 21.8 2 24 2 Z"
                      fill={`url(#rosetteGrad_${theme.id})`}
                      stroke="rgba(255,255,255,0.4)"
                      strokeWidth="1.5"
                    />

                    <circle
                      cx="24"
                      cy="21"
                      r="11"
                      fill={
                        theme.rosetteInner
                      }
                      opacity="0.4"
                    />

                    <path
                      d="M19 21 L22.5 24.5 L29 17.5"
                      stroke={
                        theme.rosetteCheck
                      }
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* ==========================================
                MIDDLE
            ========================================== */}

            <div
              className={cn(
                'flex flex-1 flex-col items-center justify-evenly py-2 my-1',
                exportMode &&
                  '!py-4 !my-2 !justify-evenly',
              )}
            >
              {/* PHOTO */}

              <div
                className={cn(
                  'relative h-24 w-24 sm:h-32 sm:w-32 overflow-hidden rounded-[1.75rem] sm:rounded-[2.2rem]',
                  exportMode &&
                    '!h-[180px] !w-[180px] !rounded-[36px]',
                )}
                style={{
                  borderWidth: '2.5px',
                  borderStyle: 'solid',
                  borderColor:
                    theme.avatarBorder,
                  background:
                    theme.avatarBg,
                  boxShadow:
                    theme.avatarShadow,
                }}
              >
                {avatarSrc ? (
                  <img
                    src={avatarSrc}
                    alt={professionalName}
                    crossOrigin="anonymous"
                    className="h-full w-full object-cover object-center"
                    onError={(e) => {
                      const img =
                        e.currentTarget;

                      if (
                        img.src !==
                        avatarFallbackSrc
                      ) {
                        img.src =
                          avatarFallbackSrc;
                      }
                    }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-current opacity-75">
                    <UserRound
                      size={
                        exportMode
                          ? 64
                          : 36
                      }
                    />
                  </div>
                )}

                <div
                  className={cn(
                    'absolute bottom-1.5 right-1.5 sm:bottom-2 sm:right-2 rounded-full p-0.5 shadow-md flex items-center justify-center',
                    exportMode &&
                      '!bottom-3 !right-3 !p-1',
                  )}
                  style={{
                    borderWidth: '2px',
                    borderStyle: 'solid',
                    borderColor:
                      theme.avatarCheckBorder,
                    background:
                      theme.avatarCheckBg,
                    color:
                      theme.avatarCheckColor,
                  }}
                >
                  <CheckCircle2
                    size={
                      exportMode
                        ? 25
                        : 12
                    }
                  />
                </div>
              </div>

              {/* NAME */}

              <div
                className={cn(
                  'w-full min-w-0 space-y-0.5 text-center px-2',
                  exportMode &&
                    '!space-y-1 !px-4',
                )}
              >
                <p
                  className={cn(
                    'text-[9px] font-black uppercase tracking-[0.26em] sm:text-xs',
                    exportMode &&
                      '!text-[16px] !tracking-[0.26em]',
                  )}
                  style={{
                    color:
                      theme.roleColor,
                  }}
                >
                  Fisioterapeuta
                </p>

                <h4
                  className={cn(
                    'truncate text-lg font-black leading-tight tracking-tight sm:text-2xl',
                    exportMode &&
                      '!text-[34px]',
                  )}
                  style={{
                    color:
                      theme.nameColor,
                  }}
                >
                  {professionalName}
                </h4>

                <p
                  className={cn(
                    'mx-auto max-w-[95%] text-[9px] font-bold uppercase leading-tight tracking-[0.15em] sm:text-xs sm:tracking-[0.18em]',
                    exportMode &&
                      '!max-w-[850px] !text-[15px] !tracking-[0.18em]',
                  )}
                  style={{
                    color:
                      theme.specialtyColor,
                  }}
                >
                  {specialty}
                </p>
              </div>

              {/* CREFITO */}

              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'inline-flex items-center justify-center rounded-full px-3.5 py-1 text-center text-[9px] font-black uppercase tracking-widest shadow-inner sm:px-5 sm:py-1.5 sm:text-xs',
                    exportMode &&
                      '!px-7 !py-2.5 !text-[15px]',
                  )}
                  style={{
                    background:
                      theme.crefitoBg,
                    borderColor:
                      theme.crefitoBorder,
                    borderWidth: '1.5px',
                    borderStyle: 'solid',
                    color:
                      theme.crefitoText,
                  }}
                >
                  CREFITO: {crefito}
                </span>

                {isPro && (
                  <span
                    className={cn(
                      'inline-flex items-center justify-center rounded-full px-3 py-1 text-center text-[8px] font-black uppercase tracking-wider sm:text-[10px]',
                      exportMode &&
                        '!px-5 !py-2 !text-[13px]',
                    )}
                    style={{
                      background:
                        theme.proBg,
                      borderColor:
                        theme.proBorder,
                      borderWidth: '1.5px',
                      borderStyle: 'solid',
                      color:
                        theme.proText,
                    }}
                  >
                    Pro
                  </span>
                )}
              </div>

              {/* QR */}

              <div
                className={cn(
                  'flex w-full max-w-[260px] sm:max-w-[300px] flex-col items-center justify-center gap-1.5 rounded-[1.4rem] sm:rounded-[1.7rem] p-2.5 sm:p-3.5 backdrop-blur-md',
                  exportMode &&
                    '!max-w-[540px] !gap-3 !rounded-[34px] !p-6',
                )}
                style={{
                  background:
                    theme.qrCardBg,
                  borderColor:
                    theme.qrCardBorder,
                  borderWidth: '1.5px',
                  borderStyle: 'solid',
                  boxShadow:
                    theme.qrCardShadow,
                }}
              >
                <div
                  className={cn(
                    'flex items-center gap-1.5',
                    exportMode &&
                      '!gap-2',
                  )}
                >
                  <span
                    className={cn(
                      'text-xs font-black',
                      exportMode &&
                        '!text-[18px]',
                    )}
                    style={{
                      color:
                        theme.qrHeaderCheck,
                    }}
                  >
                    ✓
                  </span>

                  <span
                    className={cn(
                      'text-[9px] font-black uppercase tracking-[0.2em] sm:text-[11px]',
                      exportMode &&
                        '!text-[17px]',
                    )}
                    style={{
                      color:
                        theme.qrHeaderText,
                    }}
                  >
                    Validar credencial
                  </span>
                </div>

                <div
                  className={cn(
                    'flex h-[92px] w-[92px] sm:h-[120px] sm:w-[120px] items-center justify-center rounded-2xl p-2 shadow-lg',
                    exportMode &&
                      '!h-[270px] !w-[270px] !rounded-[30px] !p-5',
                  )}
                  style={{
                    background:
                      theme.qrBoxBg,
                  }}
                >
                  {activeQr ? (
                    <img
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
                  className={cn(
                    'max-w-[240px] truncate text-center text-[8px] font-black tracking-wider sm:text-[9.5px] uppercase mt-0.5',
                    exportMode &&
                      '!max-w-[500px] !text-[14px] !tracking-wider !mt-1',
                  )}
                  style={{
                    color:
                      theme.qrIdColor,
                  }}
                >
                  ID DA CREDENCIAL -{' '}
                  {credentialCode}
                </p>

                <p
                  className={cn(
                    'text-center text-[7.5px] font-medium sm:text-[8.5px]',
                    exportMode &&
                      '!text-[13px]',
                  )}
                  style={{
                    color:
                      theme.qrSubColor,
                  }}
                >
                  Escanear para verificar
                  este perfil
                </p>
              </div>
            </div>

            {/* ==========================================
                FOOTER
            ========================================== */}

            <div
              className={cn(
                'pt-2 text-[8px] font-medium sm:pt-3 sm:text-[9.5px]',
                exportMode &&
                  '!pt-5 !text-[14px]',
              )}
              style={{
                borderTopWidth: '1.5px',
                borderTopStyle: 'solid',
                borderTopColor:
                  theme.footerBorder,
              }}
            >
              <div className="flex items-center justify-between gap-1 px-1">
                <span
                  className={cn(
                    'truncate text-left font-semibold max-w-[34%]',
                    exportMode &&
                      '!max-w-[34%]',
                  )}
                  style={{
                    color:
                      theme.footerTextColor,
                  }}
                >
                  {serviceLabel}
                </span>

                <span
                  className="truncate text-center font-bold max-w-[34%]"
                  style={{
                    color:
                      theme.footerCenterColor,
                  }}
                >
                  {city}
                </span>

                <span
                  className="truncate text-right font-semibold max-w-[32%]"
                  style={{
                    color:
                      theme.footerTextColor,
                  }}
                >
                  Emissão {issuedAt}
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    },
  );

CredentialCardInner.displayName =
  'CredentialCardInner';

// ==========================================
// SHARE MODAL
// ==========================================

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  publicProfileUrl: string;
  professionalName: string;
  specialty: string;
  qrDataUrl: string;
  onDownloadImage: () => void;
  downloading: boolean;
}

function ShareModal({
  isOpen,
  onClose,
  publicProfileUrl,
  professionalName,
  specialty,
  onDownloadImage,
  downloading,
}: ShareModalProps) {
  const [copied, setCopied] =
    useState(false);

  if (!isOpen) {
    return null;
  }

  const shareText =
    `Confira a Credencial Digital Profissional de ${professionalName} (${specialty}) no FisioCareHub:`;

  const whatsappUrl =
    `https://api.whatsapp.com/send?text=${encodeURIComponent(
      `${shareText} ${publicProfileUrl}`,
    )}`;

  const telegramUrl =
    `https://t.me/share/url?url=${encodeURIComponent(
      publicProfileUrl,
    )}&text=${encodeURIComponent(
      shareText,
    )}`;

  const linkedinUrl =
    `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
      publicProfileUrl,
    )}`;

  const emailUrl =
    `mailto:?subject=${encodeURIComponent(
      `Credencial Profissional • ${professionalName}`,
    )}&body=${encodeURIComponent(
      `${shareText}\n\n${publicProfileUrl}`,
    )}`;

  const handleCopy =
    async () => {
      try {
        if (
          typeof navigator !==
            'undefined' &&
          navigator.clipboard?.writeText
        ) {
          await navigator.clipboard.writeText(
            publicProfileUrl,
          );
        } else {
          const textArea =
            document.createElement(
              'textarea',
            );

          textArea.value =
            publicProfileUrl;

          textArea.style.position =
            'fixed';
          textArea.style.left =
            '-99999px';

          document.body.appendChild(
            textArea,
          );

          textArea.select();

          document.execCommand(
            'copy',
          );

          document.body.removeChild(
            textArea,
          );
        }

        setCopied(true);

        toast.success(
          'Link copiado para a área de transferência!',
        );

        setTimeout(
          () => setCopied(false),
          3000,
        );
      } catch {
        toast.error(
          'Erro ao copiar link.',
        );
      }
    };

  const handleNativeShare =
    async () => {
      if (
        typeof navigator !==
          'undefined' &&
        typeof navigator.share ===
          'function'
      ) {
        try {
          await navigator.share({
            title: `Credencial Profissional • ${professionalName}`,
            text: shareText,
            url: publicProfileUrl,
          });

          toast.success(
            'Compartilhado com sucesso!',
          );

          onClose();
        } catch (err: any) {
          if (
            err?.name !==
            'AbortError'
          ) {
            await handleCopy();
          }
        }
      } else {
        await handleCopy();
      }
    };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 sm:p-7 shadow-2xl dark:border-white/10 dark:bg-slate-900 text-slate-900 dark:text-slate-100"
        onClick={(e) =>
          e.stopPropagation()
        }
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-slate-200 transition-colors"
        >
          <X size={20} />
        </button>

        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-600 dark:bg-sky-400/10 dark:text-sky-400">
            <Share2 size={24} />
          </div>

          <div>
            <h3 className="text-lg font-black tracking-tight sm:text-xl">
              Compartilhar Credencial
            </h3>

            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Envie sua identificação
              digital oficial para
              pacientes e parceiros.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-50/60 p-3.5 text-center text-emerald-800 transition-all hover:bg-emerald-100/80 hover:scale-[1.02] dark:border-emerald-500/30 dark:bg-emerald-950/30 dark:text-emerald-300"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md">
                <MessageCircle
                  size={20}
                />
              </div>

              <span className="text-[11px] font-black uppercase tracking-wider">
                WhatsApp
              </span>
            </a>

            <button
              type="button"
              onClick={
                handleNativeShare
              }
              className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-sky-500/20 bg-sky-50/60 p-3.5 text-center text-sky-800 transition-all hover:bg-sky-100/80 hover:scale-[1.02]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-500 text-white shadow-md">
                <Smartphone
                  size={20}
                />
              </div>

              <span className="text-[11px] font-black uppercase tracking-wider">
                Outros Apps
              </span>
            </button>

            <a
              href={telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-blue-500/20 bg-blue-50/60 p-3.5 text-center text-blue-800 transition-all hover:bg-blue-100/80 hover:scale-[1.02]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 text-white shadow-md">
                <Send size={18} />
              </div>

              <span className="text-[11px] font-black uppercase tracking-wider">
                Telegram
              </span>
            </a>

            <a
              href={emailUrl}
              className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-indigo-500/20 bg-indigo-50/60 p-3.5 text-center text-indigo-800 transition-all hover:bg-indigo-100/80 hover:scale-[1.02]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500 text-white shadow-md">
                <Mail size={18} />
              </div>

              <span className="text-[11px] font-black uppercase tracking-wider">
                E-mail
              </span>
            </a>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              Link de Acesso Público
            </label>

            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2">
              <input
                type="text"
                readOnly
                value={
                  publicProfileUrl
                }
                className="w-full bg-transparent px-2 text-xs font-mono font-medium text-slate-700 outline-none truncate"
              />

              <button
                type="button"
                onClick={
                  handleCopy
                }
                className="inline-flex items-center gap-1.5 shrink-0 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-black uppercase tracking-wider text-white"
              >
                {copied ? (
                  <Check size={14} />
                ) : (
                  <Copy size={14} />
                )}

                {copied
                  ? 'Copiado'
                  : 'Copiar'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                onClose();
                onDownloadImage();
              }}
              disabled={
                downloading
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-md hover:bg-sky-700 transition-all disabled:opacity-60"
            >
              <Download
                size={15}
              />

              {downloading
                ? 'Baixando...'
                : 'Baixar Imagem HD'}
            </button>

            <a
              href={
                publicProfileUrl
              }
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black uppercase tracking-wider text-slate-700 hover:bg-slate-50 transition-all"
            >
              <ExternalLink
                size={15}
              />

              Visualizar Página
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// MAIN COMPONENT
// ==========================================

export interface ProfessionalCredentialCardProps {
  profile: any;
  isPro?: boolean;
  appointmentsCount?: number;
  ratingAverage?: number;
  reviewsCount?: number;
  variant?: 'full' | 'compact';
  className?: string;
}

export default function ProfessionalCredentialCard({
  profile,
  isPro = false,
  variant = 'full',
  className,
}: ProfessionalCredentialCardProps) {
  const cardRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const exportCardRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const [selectedThemeId, setSelectedThemeId] =
    useState<CredentialThemeId>(() => {
      if (
        typeof window !==
        'undefined'
      ) {
        const saved =
          localStorage.getItem(
            'fisiocare_credential_theme',
          ) as CredentialThemeId;

        if (
          saved &&
          CREDENTIAL_THEMES[saved]
        ) {
          return saved;
        }
      }

      return 'blue';
    });

  const [downloading, setDownloading] =
    useState(false);

  const [
    isShareModalOpen,
    setIsShareModalOpen,
  ] = useState(false);

  const [avatarDataUrl, setAvatarDataUrl] =
    useState<string>('');

  const [qrDataUrl, setQrDataUrl] =
    useState<string>('');

  const [
    exportReady,
    setExportReady,
  ] = useState(false);

  const currentTheme =
    CREDENTIAL_THEMES[
      selectedThemeId
    ] ||
    CREDENTIAL_THEMES.blue;

  const profileId =
    profile?.id ||
    profile?.user_id ||
    '';

  const publicProfileUrl =
    useMemo(() => {
      if (
        !profileId ||
        typeof window ===
          'undefined'
      ) {
        return '';
      }

      return `${window.location.origin}/physio/${profileId}`;
    }, [profileId]);

  const professionalName =
    safeText(
      profile?.nome_completo ||
        profile?.nome ||
        profile?.name,
      'Fisioterapeuta',
    );

  const specialty =
    safeText(
      profile?.especialidade ||
        profile?.especialidade_principal ||
        profile?.specialty,
      'Fisioterapia',
    );

  const crefito =
    safeText(
      profile?.crefito ||
        profile?.registro_profissional ||
        profile?.numero_crefito,
      'Pendente',
    );

  const city =
    safeText(
      profile?.localizacao ||
        [
          profile?.cidade,
          profile?.estado,
        ]
          .filter(Boolean)
          .join(', '),
      'Região não informada',
    );

  const avatarFallbackUrl =
    useMemo(
      () =>
        createAvatarFallback(
          professionalName,
          currentTheme,
        ),
      [
        professionalName,
        currentTheme,
      ],
    );

  const resolvedAvatarUrl =
    resolveStorageUrl(
      profile?.avatar_url || '',
    );

  // ==========================================
  // AVATAR DATA URL
  // ==========================================

  useEffect(() => {
    let active = true;

    if (resolvedAvatarUrl) {
      imageUrlToDataUrl(
        resolvedAvatarUrl,
      ).then((dataUrl) => {
        if (
          active &&
          dataUrl
        ) {
          setAvatarDataUrl(
            dataUrl,
          );
        }
      });
    } else {
      setAvatarDataUrl('');
    }

    return () => {
      active = false;
    };
  }, [resolvedAvatarUrl]);

  // ==========================================
  // QR CODE
  // ==========================================

  useEffect(() => {
    let active = true;

    setExportReady(false);

    if (!publicProfileUrl) {
      setQrDataUrl('');
      return () => {
        active = false;
      };
    }

    QRCode.toDataURL(
      publicProfileUrl,
      {
        errorCorrectionLevel: 'H',
        margin: 2,
        width: 900,
        color: {
          dark:
            currentTheme.qrDarkColor,
          light: '#ffffff',
        },
      },
    )
      .then((url) => {
        if (active) {
          setQrDataUrl(url);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [
    publicProfileUrl,
    currentTheme.qrDarkColor,
  ]);

  const finalAvatarSrc =
    avatarDataUrl ||
    resolvedAvatarUrl ||
    avatarFallbackUrl;

  const approved =
    String(
      profile?.status_aprovacao ||
        '',
    ).toLowerCase() ===
      'aprovado' ||
    Boolean(
      profile?.aprovado ||
        profile?.verificado,
    );

  const issuedAt =
    new Intl.DateTimeFormat(
      'pt-BR',
      {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      },
    ).format(new Date());

  const credentialCode =
    profileId
      ? `FCH-${String(
          profileId,
        )
          .slice(0, 8)
          .toUpperCase()}`
      : 'FCH-PERFIL';

  const serviceLabel =
    getServiceLabel(
      profile?.tipo_servico,
    );

  const isCompact =
    variant === 'compact';

  // ==========================================
  // THEME
  // ==========================================

  const handleSelectTheme = (
    themeId: CredentialThemeId,
  ) => {
    setSelectedThemeId(
      themeId,
    );

    if (
      typeof window !==
      'undefined'
    ) {
      localStorage.setItem(
        'fisiocare_credential_theme',
        themeId,
      );
    }
  };

  // ==========================================
  // WAIT FOR EXPORT CARD
  // ==========================================

  const waitForExportRender =
    async () => {
      setExportReady(true);

      await new Promise<void>(
        (resolve) => {
          requestAnimationFrame(
            () => {
              requestAnimationFrame(
                () => resolve(),
              );
            },
          );
        },
      );

      if (
        exportCardRef.current
      ) {
        await waitForImages(
          exportCardRef.current,
        );
      }

      if (
        typeof document !==
          'undefined' &&
        'fonts' in document
      ) {
        try {
          await document.fonts.ready;
        } catch {}
      }
    };

  // ==========================================
  // GENERATE HD IMAGE
  // ==========================================

  const generateCardBlob =
    async (): Promise<Blob> => {
      await waitForExportRender();

      const exportCard =
        exportCardRef.current;

      if (!exportCard) {
        setExportReady(false);

        throw new Error(
          'Componente de exportação não encontrado.',
        );
      }

      /*
       * Força o navegador a calcular
       * todas as dimensões antes da captura.
       */
      void exportCard.offsetWidth;
      void exportCard.offsetHeight;

      await new Promise<void>(
        (resolve) => {
          requestAnimationFrame(
            () => resolve(),
          );
        },
      );

      await waitForImages(
        exportCard,
      );

      const canvas =
        await html2canvas(
          exportCard,
          {
            width: 900,
            height: 1600,

            windowWidth: 900,
            windowHeight: 1600,

            scale: 1,

            useCORS: true,

            /*
             * Não usamos allowTaint.
             * A foto já é convertida
             * para Data URL.
             */
            allowTaint: false,

            backgroundColor: null,

            logging: false,

            imageTimeout: 20000,

            scrollX: 0,
            scrollY: 0,

            removeContainer: true,

            onclone: (
              clonedDocument,
            ) => {
              const style =
                clonedDocument.createElement(
                  'style',
                );

              style.innerHTML = `
                *,
                *::before,
                *::after {
                  animation: none !important;
                  transition: none !important;
                  caret-color: transparent !important;
                }

                html,
                body {
                  margin: 0 !important;
                  padding: 0 !important;
                  background: transparent !important;
                }

                [data-export-mode="true"] {
                  width: 900px !important;
                  height: 1600px !important;
                  min-width: 900px !important;
                  max-width: 900px !important;
                  min-height: 1600px !important;
                  max-height: 1600px !important;
                  aspect-ratio: 9 / 16 !important;
                  overflow: hidden !important;
                }
              `;

              clonedDocument.head.appendChild(
                style,
              );
            },
          },
        );

      if (!canvas) {
        setExportReady(false);

        throw new Error(
          'Não foi possível renderizar a credencial.',
        );
      }

      /*
       * A imagem precisa manter exatamente
       * a proporção 9:16.
       */
      if (
        canvas.width !== 900 ||
        canvas.height !== 1600
      ) {
        setExportReady(false);

        throw new Error(
          'Dimensões da credencial inválidas.',
        );
      }

      const blob =
        await new Promise<Blob | null>(
          (resolve) => {
            canvas.toBlob(
              resolve,
              'image/png',
              1,
            );
          },
        );

      setExportReady(false);

      if (
        !blob ||
        blob.size < 5000
      ) {
        throw new Error(
          'Arquivo de imagem gerado está incompleto.',
        );
      }

      return blob;
    };

  // ==========================================
  // DOWNLOAD
  // ==========================================

  const handleDownloadCredential =
    async () => {
      if (downloading) {
        return;
      }

      if (!publicProfileUrl) {
        toast.error(
          'O perfil público ainda não está disponível.',
        );
        return;
      }

      setDownloading(true);

      try {
        const blob =
          await generateCardBlob();

        const fileName =
          `credencial-fisiocarehub-${fileNameFromName(
            professionalName,
          )}.png`;

        saveAs(
          blob,
          fileName,
        );

        toast.success(
          'Credencial HD baixada com sucesso.',
        );
      } catch (error) {
        console.error(
          'Erro ao baixar credencial:',
          error,
        );

        toast.error(
          'Não foi possível gerar o download da credencial.',
        );
      } finally {
        setExportReady(false);
        setDownloading(false);
      }
    };

  // ==========================================
  // SHARE
  // ==========================================

  const handleOpenShare =
    () => {
      setIsShareModalOpen(
        true,
      );
    };

  // ==========================================
  // COPY LINK
  // ==========================================

  const handleCopyLink =
    async () => {
      if (!publicProfileUrl) {
        return;
      }

      try {
        if (
          typeof navigator !==
            'undefined' &&
          navigator.clipboard?.writeText
        ) {
          await navigator.clipboard.writeText(
            publicProfileUrl,
          );
        } else {
          const textArea =
            document.createElement(
              'textarea',
            );

          textArea.value =
            publicProfileUrl;

          textArea.style.position =
            'fixed';
          textArea.style.left =
            '-99999px';

          document.body.appendChild(
            textArea,
          );

          textArea.select();

          document.execCommand(
            'copy',
          );

          document.body.removeChild(
            textArea,
          );
        }

        toast.success(
          'Link da credencial copiado com sucesso!',
        );
      } catch {
        toast.error(
          'Não foi possível copiar o link.',
        );
      }
    };

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <section
      className={cn(
        'relative mb-24 overflow-hidden rounded-[2rem] border border-sky-200/70 bg-white p-4 shadow-xl shadow-sky-100/70 dark:border-white/10 dark:bg-slate-900/50 dark:shadow-black/20 sm:rounded-[2.5rem] sm:p-6',
        isCompact &&
          'p-3 sm:p-4',
        className,
      )}
    >
      {/* Background */}

      <div className="absolute -right-20 -top-20 h-44 w-44 rounded-full bg-sky-400/20 blur-3xl dark:bg-blue-500/20 pointer-events-none" />

      <div className="absolute -bottom-24 -left-16 h-52 w-52 rounded-full bg-emerald-400/20 blur-3xl dark:bg-emerald-500/10 pointer-events-none" />

      {/* ==========================================
          HEADER
      ========================================== */}

      <div className="relative z-10 mb-6 space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300">
              <Crown
                size={13}
                fill="currentColor"
              />

              Credencial premium
            </div>

            {!isCompact && (
              <p className="mt-2 max-w-2xl text-xs font-semibold leading-relaxed text-slate-600 dark:text-slate-400">
                Carteira digital
                profissional para
                identificação,
                compartilhamento em
                aplicativos e validação
                do perfil.
              </p>
            )}
          </div>
        </div>

        {/* COLOR SELECTOR */}

        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3.5 dark:border-white/10 dark:bg-slate-800/50 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-2.5">
            <Palette
              size={15}
              className="text-primary"
            />

            <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
              Personalizar credencial
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(
              Object.keys(
                CREDENTIAL_THEMES,
              ) as CredentialThemeId[]
            ).map((themeKey) => {
              const themeItem =
                CREDENTIAL_THEMES[
                  themeKey
                ];

              const isSelected =
                selectedThemeId ===
                themeKey;

              return (
                <button
                  key={themeKey}
                  type="button"
                  onClick={() =>
                    handleSelectTheme(
                      themeKey,
                    )
                  }
                  className={cn(
                    'flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all duration-200 cursor-pointer',
                    isSelected
                      ? 'border-primary ring-2 ring-primary/30 bg-white shadow-md dark:bg-slate-700/90 dark:border-primary'
                      : 'border-slate-200 bg-white/70 hover:border-slate-300 hover:bg-white dark:border-white/5 dark:bg-slate-800/40',
                  )}
                >
                  <div
                    className="w-5 h-5 rounded-full shrink-0 border border-black/10 shadow-sm"
                    style={{
                      background:
                        themeItem.previewBg,
                    }}
                  />

                  <div className="min-w-0">
                    <p className="text-[11px] font-black text-slate-800 dark:text-slate-100 truncate">
                      {themeItem.name}
                    </p>

                    <p className="text-[9px] font-medium text-slate-500 dark:text-slate-400 truncate">
                      {
                        themeItem.description
                      }
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ACTIONS */}

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <button
            type="button"
            onClick={
              handleOpenShare
            }
            disabled={
              !publicProfileUrl
            }
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-600 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-sky-500/20 transition-all hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Share2 size={15} />

            Compartilhar no WhatsApp /
            Apps
          </button>

          <button
            type="button"
            onClick={
              handleDownloadCredential
            }
            disabled={downloading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-700 shadow-sm transition-all hover:border-sky-300 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
          >
            <Download size={15} />

            {downloading
              ? 'Gerando...'
              : 'Baixar credencial (HD)'}
          </button>

          <button
            type="button"
            onClick={
              handleCopyLink
            }
            disabled={
              !publicProfileUrl
            }
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-700 shadow-sm transition-all hover:border-sky-300 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
          >
            <Copy size={14} />

            Copiar link
          </button>
        </div>
      </div>

      {/* ==========================================
          ON SCREEN PREVIEW
      ========================================== */}

      <div className="relative z-10 mx-auto w-full max-w-[440px]">
        <CredentialCardInner
          ref={cardRef}
          theme={currentTheme}
          professionalName={
            professionalName
          }
          specialty={specialty}
          crefito={crefito}
          city={city}
          serviceLabel={
            serviceLabel
          }
          issuedAt={issuedAt}
          credentialCode={
            credentialCode
          }
          approved={approved}
          isPro={isPro}
          publicProfileUrl={
            publicProfileUrl
          }
          avatarSrc={
            finalAvatarSrc
          }
          avatarFallbackSrc={
            avatarFallbackUrl
          }
          qrDataUrl={qrDataUrl}
          exportMode={false}
        />
      </div>

      {/* ==========================================
          INVISIBLE HD EXPORT CARD
          
          Esta versão NÃO aparece na tela.
          Ela só é montada quando o usuário
          clica em "Baixar credencial".
      ========================================== */}

      {exportReady && (
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            left: '-10000px',
            top: '0',
            width: '900px',
            height: '1600px',
            overflow: 'hidden',
            pointerEvents: 'none',
            opacity: 1,
            zIndex: -9999,
          }}
        >
          <CredentialCardInner
            ref={exportCardRef}
            theme={currentTheme}
            professionalName={
              professionalName
            }
            specialty={specialty}
            crefito={crefito}
            city={city}
            serviceLabel={
              serviceLabel
            }
            issuedAt={issuedAt}
            credentialCode={
              credentialCode
            }
            approved={approved}
            isPro={isPro}
            publicProfileUrl={
              publicProfileUrl
            }
            avatarSrc={
              finalAvatarSrc
            }
            avatarFallbackSrc={
              avatarFallbackUrl
            }
            qrDataUrl={qrDataUrl}
            exportMode={true}
          />
        </div>
      )}

      {/* ==========================================
          SHARE MODAL
      ========================================== */}

      <ShareModal
        isOpen={
          isShareModalOpen
        }
        onClose={() =>
          setIsShareModalOpen(
            false,
          )
        }
        publicProfileUrl={
          publicProfileUrl
        }
        professionalName={
          professionalName
        }
        specialty={specialty}
        qrDataUrl={qrDataUrl}
        onDownloadImage={
          handleDownloadCredential
        }
        downloading={
          downloading
        }
      />

      {!isCompact && (
        <p className="relative z-10 mx-auto mt-4 max-w-[520px] text-[10px] font-semibold leading-relaxed text-slate-500 text-center">
          Esta credencial identifica o
          perfil profissional dentro da
          plataforma e não substitui
          consulta oficial junto ao
          CREFITO.
        </p>
      )}
    </section>
  );
}
