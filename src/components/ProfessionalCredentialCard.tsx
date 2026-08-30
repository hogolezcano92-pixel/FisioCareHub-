import { useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Copy,
  Crown,
  Download,
  Share2,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react';
import QRCode from 'qrcode';
import { toast } from 'sonner';
import { cn, resolveStorageUrl } from '../lib/utils';

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

const escapeSvgText = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const svgToDataUrl = (svg: string) =>
  `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;

const getInitials = (name: string) => {
  const parts = name
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) return 'FH';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const createAvatarFallback = (
  name: string,
  subtitle: string,
) => {
  const initials = escapeSvgText(getInitials(name));

  return svgToDataUrl(`
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="500"
      height="500"
      viewBox="0 0 500 500"
    >
      <defs>
        <linearGradient id="avatarGradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#020617"/>
          <stop offset="55%" stop-color="#075985"/>
          <stop offset="100%" stop-color="#0f766e"/>
        </linearGradient>
      </defs>

      <rect
        width="500"
        height="500"
        rx="110"
        fill="url(#avatarGradient)"
      />

      <circle
        cx="420"
        cy="80"
        r="150"
        fill="#38bdf8"
        opacity="0.16"
      />

      <circle
        cx="60"
        cy="440"
        r="170"
        fill="#34d399"
        opacity="0.13"
      />

      <circle
        cx="250"
        cy="205"
        r="110"
        fill="#ffffff"
        opacity="0.08"
      />

      <text
        x="250"
        y="235"
        text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif"
        font-size="120"
        font-weight="900"
        fill="#ffffff"
      >
        ${initials}
      </text>

      <text
        x="250"
        y="315"
        text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif"
        font-size="22"
        font-weight="800"
        letter-spacing="4"
        fill="#bae6fd"
      >
        FISIOCAREHUB
      </text>
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

  const response = await fetch(url, {
    mode: 'cors',
    cache: 'force-cache',
  });

  if (!response.ok) {
    throw new Error('Falha ao carregar imagem.');
  }

  const blob = await response.blob();

  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onloadend = () => {
      resolve(String(reader.result || ''));
    };

    reader.onerror = () => {
      reject(new Error('Falha ao converter imagem.'));
    };

    reader.readAsDataURL(blob);
  });
};

const generateQrDataUrl = async (profileUrl: string) => {
  if (!profileUrl) return '';

  try {
    return await QRCode.toDataURL(profileUrl, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 520,
      color: {
        dark: '#020617',
        light: '#ffffff',
      },
    });
  } catch (error) {
    console.error('Erro ao gerar QR Code:', error);
    return '';
  }
};

const loadImageElement = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);

    image.onerror = () =>
      reject(
        new Error(
          'Falha ao carregar imagem para exportação.',
        ),
      );

    image.src = src;
  });

const downloadBlobUrl = (
  url: string,
  fileName: string,
) => {
  const link = document.createElement('a');

  link.href = url;
  link.download = fileName;

  document.body.appendChild(link);
  link.click();
  link.remove();
};

const shortenForCard = (
  value: string,
  maxLength = 28,
) => {
  if (value.length <= maxLength) return value;

  return `${value
    .slice(0, maxLength - 1)
    .trim()}…`;
};

const splitSpecialty = (
  value: string,
  maxLength = 25,
) => {
  const normalized = value.trim();

  if (normalized.length <= maxLength) {
    return [normalized];
  }

  const words = normalized.split(/\s+/);

  const first: string[] = [];
  const second: string[] = [];

  let firstLength = 0;

  for (const word of words) {
    if (
      firstLength + word.length + 1 <=
      maxLength
    ) {
      first.push(word);
      firstLength +=
        word.length + (first.length > 1 ? 1 : 0);
    } else {
      second.push(word);
    }
  }

  if (second.length === 0) {
    return [
      shortenForCard(normalized, maxLength),
    ];
  }

  return [
    first.join(' '),
    second.join(' '),
  ];
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
  serviceLabel,
  specialty,
}: ExportCredentialData) => {
  const safeName = escapeSvgText(
    shortenForCard(professionalName, 25),
  );

  const specialtyLines = splitSpecialty(
    specialty.toUpperCase(),
    27,
  );

  const safeSpecialty1 = escapeSvgText(
    specialtyLines[0] || 'FISIOTERAPIA',
  );

  const safeSpecialty2 = escapeSvgText(
    specialtyLines[1] || '',
  );

  const safeCrefito = escapeSvgText(
    crefito,
  );

  const safeCity = escapeSvgText(
    shortenForCard(city, 28),
  );

  const safeCode = escapeSvgText(
    credentialCode,
  );

  const safeIssuedAt = escapeSvgText(
    issuedAt,
  );

  const safeService = escapeSvgText(
    serviceLabel,
  );

  const verifiedLabel = approved
    ? 'VERIFICADO'
    : 'EM VALIDAÇÃO';

  /*
   * IMPORTANTE:
   * O cartão continua em 640x1016.
   * Todos os elementos agora ficam dentro dessa área.
   *
   * Antes, o QR do plano PRO chegava até aproximadamente
   * y=1164, ultrapassando a altura real do SVG.
   */

  const qrBoxY = isPro ? 715 : 700;
  const qrImageY = qrBoxY + 22;
  const qrImageSize = 205;

  const qrCodeY = qrImageY + qrImageSize + 19;
  const qrLabelY = qrCodeY + 19;

  return `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1280"
      height="2032"
      viewBox="0 0 640 1016"
    >

      <defs>

        <linearGradient
          id="cardBg"
          x1="0"
          y1="0"
          x2="1"
          y2="1"
        >
          <stop
            offset="0%"
            stop-color="#020617"
          />

          <stop
            offset="48%"
            stop-color="#07182f"
          />

          <stop
            offset="100%"
            stop-color="#083344"
          />
        </linearGradient>

        <linearGradient
          id="accent"
          x1="0"
          y1="0"
          x2="1"
          y2="1"
        >
          <stop
            offset="0%"
            stop-color="#38bdf8"
          />

          <stop
            offset="100%"
            stop-color="#34d399"
          />
        </linearGradient>

        <clipPath id="cardClip">
          <rect
            x="24"
            y="24"
            width="592"
            height="968"
            rx="58"
          />
        </clipPath>

        <clipPath id="avatarClip">
          <rect
            x="182"
            y="192"
            width="276"
            height="276"
            rx="62"
          />
        </clipPath>

        <filter
          id="softShadow"
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
        >
          <feDropShadow
            dx="0"
            dy="18"
            stdDeviation="18"
            flood-color="#000000"
            flood-opacity="0.35"
          />
        </filter>

      </defs>

      <!-- FUNDO -->

      <rect
        x="0"
        y="0"
        width="640"
        height="1016"
        fill="#020617"
      />

      <rect
        x="16"
        y="16"
        width="608"
        height="984"
        rx="66"
        fill="#020617"
        opacity="0.85"
      />

      <rect
        x="24"
        y="24"
        width="592"
        height="968"
        rx="58"
        fill="url(#cardBg)"
        stroke="#7dd3fc"
        stroke-opacity="0.45"
        stroke-width="2"
        filter="url(#softShadow)"
      />

      <g clip-path="url(#cardClip)">

        <circle
          cx="555"
          cy="80"
          r="210"
          fill="#0ea5e9"
          opacity="0.17"
        />

        <circle
          cx="75"
          cy="930"
          r="220"
          fill="#10b981"
          opacity="0.12"
        />

        <path
          d="M65 24 L570 992"
          stroke="#ffffff"
          stroke-opacity="0.045"
          stroke-width="3"
        />

        <path
          d="M24 800 C180 735 325 785 470 840 C535 865 575 860 616 845 L616 992 L24 992 Z"
          fill="#000000"
          opacity="0.18"
        />

        <!-- CABEÇALHO -->

        <text
          x="64"
          y="78"
          font-family="Arial, Helvetica, sans-serif"
          font-size="18"
          font-weight="900"
          letter-spacing="8"
          fill="#7dd3fc"
        >
          FISIOCAREHUB
        </text>

        <text
          x="64"
          y="120"
          font-family="Arial, Helvetica, sans-serif"
          font-size="34"
          font-weight="900"
          fill="#ffffff"
        >
          Credencial Digital
        </text>

        <!-- STATUS -->

        <rect
          x="64"
          y="140"
          width="190"
          height="42"
          rx="21"
          fill="${
            approved
              ? '#064e3b'
              : '#78350f'
          }"
          fill-opacity="0.65"
          stroke="${
            approved
              ? '#5eead4'
              : '#fbbf24'
          }"
          stroke-opacity="0.50"
        />

        <circle
          cx="89"
          cy="161"
          r="12"
          fill="${
            approved
              ? '#10b981'
              : '#f59e0b'
          }"
        />

        <path
          d="M83 161 L88 166 L97 155"
          fill="none"
          stroke="#ffffff"
          stroke-width="3.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />

        <text
          x="110"
          y="167"
          font-family="Arial, Helvetica, sans-serif"
          font-size="13"
          font-weight="900"
          letter-spacing="1.5"
          fill="${
            approved
              ? '#d1fae5'
              : '#fef3c7'
          }"
        >
          ${verifiedLabel}
        </text>

        <!-- FOTO -->

        <rect
          x="174"
          y="184"
          width="292"
          height="292"
          rx="70"
          fill="#020617"
          stroke="url(#accent)"
          stroke-opacity="0.40"
          stroke-width="3"
        />

        <rect
          x="182"
          y="192"
          width="276"
          height="276"
          rx="62"
          fill="#0f172a"
        />

        <image
          href="${avatarDataUrl}"
          x="182"
          y="192"
          width="276"
          height="276"
          preserveAspectRatio="xMidYMid slice"
          clip-path="url(#avatarClip)"
        />

        <!-- selo -->

        <circle
          cx="441"
          cy="450"
          r="29"
          fill="#10b981"
          stroke="#020617"
          stroke-width="7"
        />

        <path
          d="M429 450 L438 459 L454 440"
          fill="none"
          stroke="#ffffff"
          stroke-width="5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />

        <!-- IDENTIFICAÇÃO -->

        <text
          x="320"
          y="515"
          text-anchor="middle"
          font-family="Arial, Helvetica, sans-serif"
          font-size="14"
          font-weight="900"
          letter-spacing="5"
          fill="#94a3b8"
        >
          FISIOTERAPEUTA
        </text>

        <text
          x="320"
          y="554"
          text-anchor="middle"
          font-family="Arial, Helvetica, sans-serif"
          font-size="30"
          font-weight="900"
          fill="#ffffff"
        >
          ${safeName}
        </text>

        <!-- ESPECIALIDADE -->

        <text
          x="320"
          y="584"
          text-anchor="middle"
          font-family="Arial, Helvetica, sans-serif"
          font-size="14"
          font-weight="900"
          letter-spacing="2.5"
          fill="#67e8f9"
        >
          ${safeSpecialty1}
        </text>

        ${
          safeSpecialty2
            ? `
        <text
          x="320"
          y="603"
          text-anchor="middle"
          font-family="Arial, Helvetica, sans-serif"
          font-size="14"
          font-weight="900"
          letter-spacing="2.5"
          fill="#67e8f9"
        >
          ${safeSpecialty2}
        </text>
        `
            : ''
        }

        <!-- CREFITO -->

        <rect
          x="126"
          y="620"
          width="388"
          height="48"
          rx="24"
          fill="#ffffff"
          fill-opacity="0.08"
          stroke="#ffffff"
          stroke-opacity="0.14"
        />

        <text
          x="320"
          y="651"
          text-anchor="middle"
          font-family="Arial, Helvetica, sans-serif"
          font-size="16"
          font-weight="900"
          letter-spacing="1.5"
          fill="#f8fafc"
        >
          CREFITO: ${safeCrefito}
        </text>

        ${
          isPro
            ? `
        <rect
          x="246"
          y="676"
          width="148"
          height="30"
          rx="15"
          fill="#f59e0b"
          fill-opacity="0.16"
          stroke="#facc15"
          stroke-opacity="0.45"
        />

        <text
          x="320"
          y="696"
          text-anchor="middle"
          font-family="Arial, Helvetica, sans-serif"
          font-size="11"
          font-weight="900"
          letter-spacing="2"
          fill="#fde68a"
        >
          PLANO PRO
        </text>
        `
            : ''
        }

        <!-- QR CONTAINER -->

        <rect
          x="150"
          y="${qrBoxY}"
          width="340"
          height="275"
          rx="38"
          fill="#ffffff"
          fill-opacity="0.075"
          stroke="#ffffff"
          stroke-opacity="0.16"
        />

        <rect
          x="217"
          y="${qrImageY}"
          width="${qrImageSize}"
          height="${qrImageSize}"
          rx="24"
          fill="#ffffff"
        />

        ${
          qrDataUrl
            ? `
        <image
          href="${qrDataUrl}"
          x="225"
          y="${qrImageY + 8}"
          width="189"
          height="189"
          preserveAspectRatio="xMidYMid meet"
        />
        `
            : `
        <rect
          x="225"
          y="${qrImageY + 8}"
          width="189"
          height="189"
          rx="14"
          fill="#f8fafc"
        />

        <text
          x="320"
          y="${qrImageY + 110}"
          text-anchor="middle"
          font-family="Arial, Helvetica, sans-serif"
          font-size="14"
          font-weight="900"
          fill="#475569"
        >
          QR indisponível
        </text>
        `
        }

        <text
          x="320"
          y="${qrCodeY}"
          text-anchor="middle"
          font-family="Arial, Helvetica, sans-serif"
          font-size="12"
          font-weight="900"
          letter-spacing="1.4"
          fill="#e2e8f0"
        >
          ${safeCode}
        </text>

        <text
          x="320"
          y="${qrLabelY}"
          text-anchor="middle"
          font-family="Arial, Helvetica, sans-serif"
          font-size="11"
          font-weight="700"
          fill="#94a3b8"
        >
          Aponte a câmera para validar o perfil
        </text>

        <!-- RODAPÉ -->

        <rect
          x="64"
          y="955"
          width="512"
          height="1"
          fill="#ffffff"
          opacity="0.12"
        />

        <text
          x="64"
          y="977"
          font-family="Arial, Helvetica, sans-serif"
          font-size="10"
          font-weight="800"
          fill="#cbd5e1"
        >
          ${safeService}
        </text>

        <text
          x="576"
          y="977"
          text-anchor="end"
          font-family="Arial, Helvetica, sans-serif"
          font-size="10"
          font-weight="800"
          fill="#cbd5e1"
        >
          ${safeCity}
        </text>

        <text
          x="320"
          y="994"
          text-anchor="middle"
          font-family="Arial, Helvetica, sans-serif"
          font-size="8"
          font-weight="700"
          fill="#64748b"
        >
          Emissão ${safeIssuedAt}
        </text>

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

  const [downloading, setDownloading] =
    useState(false);

  const [sharing, setSharing] =
    useState(false);

  const profileId =
    profile?.id ||
    profile?.user_id ||
    '';

  const publicProfileUrl = useMemo(() => {
    if (
      !profileId ||
      typeof window === 'undefined'
    ) {
      return '';
    }

    return `${window.location.origin}/physio/${profileId}`;
  }, [profileId]);

  const professionalName = safeText(
    profile?.nome_completo ||
      profile?.nome ||
      profile?.name,
    'Fisioterapeuta',
  );

  const specialty = safeText(
    profile?.especialidade ||
      profile?.especialidade_principal ||
      profile?.specialty,
    'Fisioterapia',
  );

  const crefito = safeText(
    profile?.crefito ||
      profile?.registro_profissional ||
      profile?.numero_crefito,
    'Pendente',
  );

  const city = safeText(
    profile?.localizacao ||
      [profile?.cidade, profile?.estado]
        .filter(Boolean)
        .join(', '),
    'Região não informada',
  );

  const avatarFallbackUrl = useMemo(
    () =>
      createAvatarFallback(
        professionalName,
        specialty,
      ),
    [
      professionalName,
      specialty,
    ],
  );

  const resolvedAvatarUrl =
    resolveStorageUrl(
      profile?.avatar_url || '',
    );

  const avatarUrl =
    resolvedAvatarUrl ||
    avatarFallbackUrl;

  const approved =
    String(
      profile?.status_aprovacao || '',
    ).toLowerCase() === 'aprovado' ||
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
      ? `FCH-${String(profileId)
          .slice(0, 8)
          .toUpperCase()}`
      : 'FCH-PERFIL';

  const serviceLabel =
    getServiceLabel(
      profile?.tipo_servico,
    );

  const isCompact =
    variant === 'compact';

  const handleShareCredential =
    async () => {
      if (
        !publicProfileUrl ||
        sharing
      ) {
        return;
      }

      setSharing(true);

      const shareText =
        `${professionalName} • ${specialty} • Credencial Digital FisioCareHub`;

      try {
        if (
          typeof navigator !==
            'undefined' &&
          navigator.share
        ) {
          await navigator.share({
            title:
              'Credencial Digital FisioCareHub',
            text: shareText,
            url: publicProfileUrl,
          });

          return;
        }

        if (
          typeof navigator !==
            'undefined' &&
          navigator.clipboard
            ?.writeText
        ) {
          await navigator.clipboard.writeText(
            publicProfileUrl,
          );

          toast.success(
            'Link da credencial copiado.',
          );

          return;
        }

        toast.info(
          'Copie o link do perfil público para compartilhar a credencial.',
        );
      } catch (error) {
        if (
          (error as Error)?.name !==
          'AbortError'
        ) {
          console.error(
            'Erro ao compartilhar credencial:',
            error,
          );

          toast.error(
            'Não foi possível compartilhar a credencial agora.',
          );
        }
      } finally {
        setSharing(false);
      }
    };

  const handleCopyLink =
    async () => {
      if (!publicProfileUrl) return;

      try {
        await navigator.clipboard.writeText(
          publicProfileUrl,
        );

        toast.success(
          'Link copiado.',
        );
      } catch {
        toast.error(
          'Não foi possível copiar o link.',
        );
      }
    };

  const handleDownloadCredential =
    async () => {
      if (downloading) return;

      setDownloading(true);

      let svgUrl = '';
      let pngUrl = '';

      try {
        /*
         * QR GERADO LOCALMENTE
         *
         * Isso elimina a dependência do
         * api.qrserver.com durante a exportação
         * e resolve o QR branco no PNG.
         */

        const qrDataUrl =
          await generateQrDataUrl(
            publicProfileUrl,
          );

        const avatarDataUrl =
          await urlToDataUrl(
            avatarUrl,
          ).catch(
            () => avatarFallbackUrl,
          );

        if (!qrDataUrl) {
          throw new Error(
            'Não foi possível gerar o QR Code.',
          );
        }

        const svg =
          buildCredentialSvg({
            avatarDataUrl,
            qrDataUrl,
            approved,
            city,
            credentialCode,
            crefito,
            issuedAt,
            isPro,
            professionalName,
            serviceLabel,
            specialty,
          });

        const svgBlob =
          new Blob(
            [svg],
            {
              type: 'image/svg+xml;charset=utf-8',
            },
          );

        svgUrl =
          URL.createObjectURL(
            svgBlob,
          );

        const image =
          await loadImageElement(
            svgUrl,
          );

        /*
         * EXPORTAÇÃO 2X
         *
         * O SVG é 1280x2032 e o viewBox
         * continua 640x1016.
         *
         * O PNG final fica mais nítido
         * em celular, WhatsApp e redes sociais.
         */

        const canvas =
          document.createElement(
            'canvas',
          );

        canvas.width = 1280;
        canvas.height = 2032;

        const context =
          canvas.getContext(
            '2d',
          );

        if (!context) {
          throw new Error(
            'Canvas indisponível.',
          );
        }

        context.imageSmoothingEnabled =
          true;

        context.imageSmoothingQuality =
          'high';

        context.drawImage(
          image,
          0,
          0,
          canvas.width,
          canvas.height,
        );

        const blob =
          await new Promise<Blob | null>(
            (resolve) =>
              canvas.toBlob(
                resolve,
                'image/png',
                1,
              ),
          );

        const fileName =
          `credencial-fisiocarehub-${fileNameFromName(
            professionalName,
          )}.png`;

        if (blob) {
          pngUrl =
            URL.createObjectURL(
              blob,
            );

          downloadBlobUrl(
            pngUrl,
            fileName,
          );
        } else {
          downloadBlobUrl(
            canvas.toDataURL(
              'image/png',
              1,
            ),
            fileName,
          );
        }

        toast.success(
          'Credencial baixada com sucesso.',
        );
      } catch (error) {
        console.error(
          'Erro ao baixar credencial:',
          error,
        );

        toast.error(
          'Não foi possível baixar a credencial agora. Tente novamente em alguns segundos.',
        );
      } finally {
        if (svgUrl) {
          URL.revokeObjectURL(
            svgUrl,
          );
        }

        if (pngUrl) {
          URL.revokeObjectURL(
            pngUrl,
          );
        }

        setDownloading(false);
      }
    };

  return (
    <section
      className={cn(
        'relative mb-24 overflow-hidden rounded-[1.75rem] border border-sky-200/70 bg-white p-4 shadow-xl shadow-sky-100/70 dark:border-white/10 dark:bg-slate-900/50 dark:shadow-black/20 sm:rounded-[2.25rem] sm:p-5',
        isCompact &&
          'p-3 sm:p-4',
        className,
      )}
    >
      <div className="absolute -right-20 -top-20 h-44 w-44 rounded-full bg-sky-400/20 blur-3xl dark:bg-blue-500/20" />

      <div className="absolute -bottom-24 -left-16 h-52 w-52 rounded-full bg-emerald-400/20 blur-3xl dark:bg-emerald-500/10" />

      <div className="relative z-10 mb-4 space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.22em] text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300">
              <Crown
                size={13}
                fill="currentColor"
              />

              Credencial premium
            </div>

            {!isCompact && (
              <p className="mt-2 max-w-2xl text-xs font-semibold leading-relaxed text-slate-600 dark:text-slate-400">
                Carteira digital vertical para compartilhar seu perfil profissional verificado.
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <button
            type="button"
            onClick={
              handleShareCredential
            }
            disabled={
              !publicProfileUrl ||
              sharing
            }
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-700 shadow-sm transition-all hover:border-sky-300 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
          >
            {sharing ? (
              <Sparkles
                size={15}
              />
            ) : (
              <Share2
                size={15}
              />
            )}

            Compartilhar
          </button>

          <button
            type="button"
            onClick={
              handleDownloadCredential
            }
            disabled={
              downloading
            }
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-600 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-sky-500/20 transition-all hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Download
              size={15}
            />

            {downloading
              ? 'Gerando...'
              : 'Baixar imagem'}
          </button>

          <button
            type="button"
            onClick={
              handleCopyLink
            }
            disabled={
              !publicProfileUrl
            }
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-700 shadow-sm transition-all hover:border-sky-300 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
          >
            <Copy size={14} />

            Copiar link
          </button>
        </div>
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[520px]">
        <div
          ref={cardRef}
          className="relative aspect-[5/8] w-full overflow-hidden rounded-[1.35rem] border border-white/60 bg-slate-950 p-3 text-white shadow-2xl shadow-slate-900/20 ring-1 ring-slate-950/5 dark:border-white/15 sm:rounded-[1.85rem] sm:p-5"
          style={{
            background:
              'linear-gradient(135deg, #020617 0%, #07182f 48%, #083344 100%)',
          }}
        >
          <div className="absolute inset-0 opacity-70">
            <div
              className="absolute -right-12 -top-14 h-40 w-40 rounded-full blur-3xl"
              style={{
                background:
                  'rgba(14, 165, 233, 0.30)',
              }}
            />

            <div
              className="absolute -bottom-16 -left-12 h-44 w-44 rounded-full blur-3xl"
              style={{
                background:
                  'rgba(16, 185, 129, 0.20)',
              }}
            />

            <div className="absolute left-1/2 top-0 h-full w-px rotate-12 bg-white/10" />

            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/35 to-transparent" />
          </div>

          <div className="relative flex h-full flex-col gap-2">
            <!-- HEADER -->

            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[7px] font-black uppercase tracking-[0.28em] text-sky-300 sm:text-[10px] sm:tracking-[0.34em]">
                  FisioCareHub
                </p>

                <h3 className="mt-0.5 text-sm font-black leading-none tracking-tight sm:mt-1 sm:text-2xl">
                  Credencial Digital
                </h3>
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

                <span>
                  {approved
                    ? 'Verificado'
                    : 'Validação'}
                </span>
              </div>
            </div>

            <!-- CONTEÚDO -->

            <div className="flex min-h-0 flex-1 flex-col items-center gap-2 sm:gap-3">

              <!-- FOTO -->

              <div className="relative mt-1 h-[104px] w-[104px] overflow-hidden rounded-[1.4rem] border-[3px] border-sky-300/20 bg-white/10 shadow-2xl sm:h-[158px] sm:w-[158px] sm:rounded-[1.8rem] sm:border-4">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={professionalName}
                    data-fallback-src={
                      avatarFallbackUrl
                    }
                    crossOrigin="anonymous"
                    className="h-full w-full object-cover object-center"
                    onError={(
                      event,
                    ) => {
                      const image =
                        event.currentTarget;

                      if (
                        image.src !==
                        avatarFallbackUrl
                      ) {
                        image.src =
                          avatarFallbackUrl;
                      }
                    }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sky-200">
                    <UserRound
                      size={38}
                    />
                  </div>
                )}

                <div className="absolute bottom-1 right-1 rounded-full border-2 border-slate-950 bg-emerald-500 p-0.5 text-white sm:bottom-2 sm:right-2 sm:p-1">
                  <CheckCircle2
                    size={10}
                    className="sm:h-3 sm:w-3"
                  />
                </div>
              </div>

              <!-- IDENTIDADE -->

              <div className="w-full min-w-0 space-y-1 text-center sm:space-y-1.5">
                <p className="text-[7px] font-black uppercase tracking-[0.2em] text-slate-400 sm:text-[10px] sm:tracking-[0.24em]">
                  Fisioterapeuta
                </p>

                <h4 className="truncate text-[18px] font-black leading-none tracking-tight sm:text-3xl">
                  {professionalName}
                </h4>

                <p className="mx-auto max-w-[95%] text-[8px] font-black uppercase leading-tight tracking-[0.14em] text-sky-300 sm:text-xs sm:tracking-[0.18em]">
                  {specialty}
                </p>
              </div>

              <!-- REGISTRO -->

              <div className="flex w-full flex-col items-center gap-1">
                <span className="inline-flex max-w-full items-center justify-center rounded-full border border-white/10 bg-white/10 px-3 py-1 text-center text-[7px] font-black uppercase tracking-widest text-white/90 sm:px-4 sm:py-1.5 sm:text-[10px]">
                  CREFITO: {crefito}
                </span>

                {isPro && (
                  <span className="inline-flex items-center justify-center rounded-full border border-amber-300/30 bg-amber-400/15 px-3 py-1 text-center text-[7px] font-black uppercase tracking-widest text-amber-200 sm:px-4 sm:py-1.5 sm:text-[10px]">
                    Plano Pro
                  </span>
                )}
              </div>

              <!-- QR -->

              <div className="flex w-full max-w-[270px] flex-col items-center justify-center gap-1 rounded-[1rem] border border-white/10 bg-white/10 p-2 backdrop-blur-xl sm:max-w-[310px] sm:gap-2 sm:rounded-[1.4rem] sm:p-3">

                <div className="flex h-[94px] w-[94px] items-center justify-center rounded-xl bg-white p-1.5 shadow-xl sm:h-[128px] sm:w-[128px] sm:rounded-2xl sm:p-2">

                  {publicProfileUrl ? (
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=${encodeURIComponent(
                        publicProfileUrl,
                      )}`}
                      alt="QR Code do perfil profissional"
                      className="h-full w-full rounded-lg object-contain sm:rounded-xl"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-center text-[8px] font-black uppercase text-slate-500">
                      Perfil
                      indisponível
                    </div>
                  )}
                </div>

                <p className="max-w-[180px] truncate text-center text-[6px] font-black tracking-wide text-slate-300 sm:text-[8px]">
                  {credentialCode}
                </p>

                <p className="text-center text-[7px] font-bold text-slate-400 sm:text-[8px]">
                  Aponte a câmera para validar
                </p>
              </div>
            </div>

            <!-- FOOTER -->

            <div className="flex flex-col gap-1 border-t border-white/10 pt-1.5 text-[6px] font-bold text-slate-400 sm:pt-3 sm:text-[9px]">

              <div className="flex items-center justify-between gap-2">
                <span className="truncate">
                  {serviceLabel}
                </span>

                <span className="shrink-0">
                  Emissão {issuedAt}
                </span>
              </div>

              <span className="truncate text-center">
                {city}
              </span>
            </div>
          </div>
        </div>
      </div>

      {!isCompact && (
        <p className="relative z-10 mx-auto mt-3 max-w-[520px] text-[10px] font-semibold leading-relaxed text-slate-500 dark:text-slate-500">
          Esta credencial identifica o perfil profissional dentro da plataforma e não substitui consulta oficial junto ao CREFITO.
        </p>
      )}
    </section>
  );
}
