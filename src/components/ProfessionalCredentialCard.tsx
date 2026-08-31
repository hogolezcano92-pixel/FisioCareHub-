import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

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
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';
import { toast } from 'sonner';
import {
  cn,
  resolveStorageUrl,
} from '../lib/utils';

const EXPORT_WIDTH = 1280;
const EXPORT_HEIGHT = 2048;

const safeText = (
  value: unknown,
  fallback = 'Não informado',
) => {
  const text = String(
    value ?? '',
  ).trim();

  return text || fallback;
};

const getServiceLabel = (
  type?: string | null,
) => {
  const normalized = String(
    type || '',
  ).toLowerCase();

  if (normalized === 'online') {
    return 'Atendimento online';
  }

  if (
    normalized === 'domicilio'
  ) {
    return 'Atendimento domiciliar';
  }

  if (normalized === 'ambos') {
    return 'Domiciliar e online';
  }

  return 'Atendimento fisioterapêutico';
};

const svgToDataUrl = (
  svg: string,
) =>
  `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    svg,
  )}`;

const escapeSvgText = (
  value: string,
) =>
  value
    .replace(/&/g, '&amp;')
    .replace(
      /</g,
      '&lt;',
    )
    .replace(
      />/g,
      '&gt;',
    )
    .replace(
      /"/g,
      '&quot;',
    )
    .replace(
      /'/g,
      '&apos;',
    );

const getInitials = (
  name: string,
) => {
  const parts = name
    .split(/\s+/)
    .map((part) =>
      part.trim(),
    )
    .filter(Boolean);

  if (parts.length === 0) {
    return 'FH';
  }

  if (parts.length === 1) {
    return parts[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return `${parts[0][0]}${
    parts[parts.length - 1][0]
  }`.toUpperCase();
};

const createAvatarFallback = (
  name: string,
) => {
  const initials =
    escapeSvgText(
      getInitials(name),
    );

  return svgToDataUrl(`
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="500"
      height="500"
      viewBox="0 0 500 500"
    >
      <defs>
        <linearGradient
          id="avatarGradient"
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
            offset="55%"
            stop-color="#075985"
          />
          <stop
            offset="100%"
            stop-color="#0f766e"
          />
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

const fileNameFromName = (
  value: string,
) => {
  const normalized = value
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      '',
    )
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/gi,
      '-',
    )
    .replace(
      /^-+|-+$/g,
      '',
    );

  return (
    normalized ||
    'profissional'
  );
};

const wait = (
  milliseconds: number,
) =>
  new Promise<void>(
    (resolve) => {
      window.setTimeout(
        resolve,
        milliseconds,
      );
    },
  );

const waitForImage = (
  image: HTMLImageElement,
  timeout = 7000,
) =>
  new Promise<void>(
    (resolve) => {
      if (
        image.complete &&
        image.naturalWidth > 0
      ) {
        resolve();
        return;
      }

      let finished = false;

      const finish = () => {
        if (finished) {
          return;
        }

        finished = true;

        image.removeEventListener(
          'load',
          finish,
        );

        image.removeEventListener(
          'error',
          finish,
        );

        resolve();
      };

      image.addEventListener(
        'load',
        finish,
      );

      image.addEventListener(
        'error',
        finish,
      );

      window.setTimeout(
        finish,
        timeout,
      );
    },
  );

const imageUrlToDataUrl =
  async (
    url: string,
  ): Promise<string | null> => {
    if (!url) {
      return null;
    }

    if (
      url.startsWith(
        'data:',
      ) ||
      url.startsWith(
        'blob:',
      )
    ) {
      return url;
    }

    try {
      const response =
        await fetch(url, {
          mode: 'cors',
          credentials: 'omit',
          cache: 'no-cache',
        });

      if (!response.ok) {
        return null;
      }

      const blob =
        await response.blob();

      if (
        !blob.type.startsWith(
          'image/',
        )
      ) {
        return null;
      }

      return await new Promise<
        string | null
      >((resolve) => {
        const reader =
          new FileReader();

        reader.onload = () => {
          resolve(
            typeof reader.result ===
              'string'
              ? reader.result
              : null,
          );
        };

        reader.onerror = () => {
          resolve(null);
        };

        reader.readAsDataURL(
          blob,
        );
      });
    } catch (error) {
      console.warn(
        'Não foi possível converter a imagem para Data URL:',
        error,
      );

      return null;
    }
  };

const createQrDataUrl =
  async (
    value: string,
  ) => {
    return QRCode.toDataURL(
      value,
      {
        errorCorrectionLevel:
          'H',
        margin: 2,
        width: 600,
        color: {
          dark: '#020617',
          light: '#ffffff',
        },
      },
    );
  };

const downloadFile = (
  blob: Blob,
  fileName: string,
) => {
  saveAs(blob, fileName);
};

type ProfessionalCredentialCardProps =
  {
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
  const cardRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const exportRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const [downloading, setDownloading] =
    useState(false);

  const [sharing, setSharing] =
    useState(false);

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
        ),
      [professionalName],
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
        `${professionalName} • ${specialty} • Credencial Profissional Digital FisioCareHub`;

      try {
        if (
          typeof navigator !==
            'undefined' &&
          navigator.share
        ) {
          await navigator.share({
            title:
              'Credencial Profissional Digital FisioCareHub',
            text: shareText,
            url: publicProfileUrl,
          });

          return;
        }

        if (
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
          (error as Error)
            ?.name !==
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
      if (!publicProfileUrl) {
        return;
      }

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

  /**
   * EXPORTAÇÃO
   *
   * A exportação NÃO captura mais
   * diretamente a credencial
   * responsiva exibida na tela.
   *
   * Existe uma versão própria,
   * fixa em 1280 x 2048, abaixo
   * da interface.
   */
  const handleDownloadCredential =
    async () => {
      if (
        downloading ||
        !exportRef.current
      ) {
        return;
      }

      setDownloading(true);

      try {
        if (
          typeof document !==
            'undefined' &&
          'fonts' in document
        ) {
          try {
            await document.fonts.ready;
          } catch {
            // Continua.
          }
        }

        /**
         * Gera um QR novo diretamente
         * como Data URL.
         *
         * Assim a exportação não
         * depende do estado visual
         * do componente QrPreview.
         */
        let qrDataUrl = '';

        if (publicProfileUrl) {
          qrDataUrl =
            await createQrDataUrl(
              publicProfileUrl,
            );
        }

        /**
         * Converte a foto para Data URL.
         *
         * Se o storage bloquear CORS,
         * utiliza o avatar interno.
         */
        let exportAvatar =
          avatarFallbackUrl;

        if (
          resolvedAvatarUrl
        ) {
          const converted =
            await imageUrlToDataUrl(
              resolvedAvatarUrl,
            );

          if (converted) {
            exportAvatar =
              converted;
          }
        }

        /**
         * Atualiza os elementos
         * da versão de exportação.
         */
        const exportElement =
          exportRef.current;

        const avatarImage =
          exportElement.querySelector(
            '[data-export-avatar]',
          ) as HTMLImageElement | null;

        if (avatarImage) {
          avatarImage.src =
            exportAvatar;
        }

        const qrImage =
          exportElement.querySelector(
            '[data-export-qr]',
          ) as HTMLImageElement | null;

        if (
          qrImage &&
          qrDataUrl
        ) {
          qrImage.src =
            qrDataUrl;
        }

        /**
         * Aguarda as imagens.
         */
        const images =
          Array.from(
            exportElement.querySelectorAll(
              'img',
            ),
          );

        await Promise.all(
          images.map((image) =>
            waitForImage(
              image,
              7000,
            ),
          ),
        );

        /**
         * Aguarda o navegador
         * terminar o layout.
         */
        await wait(100);

        void exportElement.offsetWidth;
        void exportElement.offsetHeight;

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

        /**
         * Captura DIRETAMENTE a
         * versão fixa 1280x2048.
         *
         * Não existe segundo canvas
         * nem redimensionamento posterior.
         */
        const canvas =
          await html2canvas(
            exportElement,
            {
              width: EXPORT_WIDTH,
              height: EXPORT_HEIGHT,

              scale: 1,

              backgroundColor:
                '#020617',

              useCORS: false,

              allowTaint: false,

              logging: false,

              imageTimeout: 15000,

              foreignObjectRendering:
                false,

              scrollX: 0,

              scrollY: 0,

              windowWidth:
                EXPORT_WIDTH,

              windowHeight:
                EXPORT_HEIGHT,

              removeContainer: true,
            },
          );

        if (
          !canvas ||
          canvas.width !==
            EXPORT_WIDTH ||
          canvas.height !==
            EXPORT_HEIGHT
        ) {
          throw new Error(
            `Canvas inválido: ${canvas?.width}x${canvas?.height}`,
          );
        }

        /**
         * PNG final.
         */
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

        if (!blob) {
          throw new Error(
            'Não foi possível criar o arquivo PNG.',
          );
        }

        if (
          blob.size < 5000
        ) {
          throw new Error(
            `Arquivo PNG inválido ou vazio: ${blob.size} bytes`,
          );
        }

        const fileName =
          `credencial-fisiocarehub-${fileNameFromName(
            professionalName,
          )}.png`;

        /**
         * Download usando FileSaver,
         * já disponível no projeto.
         */
        downloadFile(
          blob,
          fileName,
        );

        /**
         * Também permite compartilhar
         * o arquivo diretamente em
         * navegadores que suportam
         * Web Share com arquivos.
         *
         * Não executamos automaticamente
         * para não abrir o menu de
         * compartilhamento no desktop.
         */
        toast.success(
          'Credencial baixada com sucesso.',
        );
      } catch (error) {
        console.error(
          'Erro ao exportar credencial:',
          error,
        );

        toast.error(
          'Não foi possível gerar a credencial. Verifique o console para detalhes.',
        );
      } finally {
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
                Carteira digital profissional para identificação, compartilhamento e validação do perfil.
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
              <Sparkles size={15} />
            ) : (
              <Share2 size={15} />
            )}

            Compartilhar
          </button>

          <button
            type="button"
            onClick={
              handleDownloadCredential
            }
            disabled={downloading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-600 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-sky-500/20 transition-all hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Download size={15} />

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

      {/* CREDENCIAL VISUAL */}
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
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[7px] font-black uppercase tracking-[0.28em] text-sky-300 sm:text-[10px] sm:tracking-[0.34em]">
                  FisioCareHub
                </p>

                <h3 className="mt-0.5 text-sm font-black leading-none tracking-tight sm:mt-1 sm:text-2xl">
                  Credencial Profissional
                </h3>

                <p className="mt-1 text-[6px] font-bold uppercase tracking-[0.16em] text-slate-400 sm:text-[8px]">
                  Identificação digital
                </p>
              </div>

              <div
                className={cn(
                  'inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[6px] font-black uppercase tracking-[0.08em] sm:gap-2 sm:px-3 sm:py-1.5 sm:text-[9px]',
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

            <div className="flex min-h-0 flex-1 flex-col items-center gap-2 sm:gap-3">
              <div className="relative mt-1 h-[104px] w-[104px] overflow-hidden rounded-[1.4rem] border-[3px] border-sky-300/20 bg-white/10 shadow-2xl sm:h-[158px] sm:w-[158px] sm:rounded-[1.8rem] sm:border-4">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={professionalName}
                    className="h-full w-full object-cover object-center"
                    onError={(event) => {
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
                    <UserRound size={38} />
                  </div>
                )}

                <div className="absolute bottom-1 right-1 rounded-full border-2 border-slate-950 bg-emerald-500 p-0.5 text-white sm:bottom-2 sm:right-2 sm:p-1">
                  <CheckCircle2
                    size={10}
                    className="sm:h-3 sm:w-3"
                  />
                </div>
              </div>

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

              <div className="flex w-full flex-col items-center gap-1">
                <span className="inline-flex max-w-full items-center justify-center rounded-full border border-white/10 bg-white/10 px-3 py-1 text-center text-[7px] font-black uppercase tracking-widest text-white/90 sm:px-4 sm:py-1.5 sm:text-[10px]">
                  CREFITO: {crefito}
                </span>

                {isPro && (
                  <span className="inline-flex items-center justify-center rounded-full border border-amber-300/30 bg-amber-400/10 px-3 py-0.5 text-center text-[6px] font-black uppercase tracking-[0.16em] text-amber-200 sm:px-3 sm:py-1 sm:text-[8px]">
                    Plano Pro
                  </span>
                )}
              </div>

              <div className="flex w-full max-w-[280px] flex-col items-center justify-center gap-1 rounded-[1.15rem] border border-sky-300/15 bg-white/10 p-2.5 backdrop-blur-xl sm:max-w-[310px] sm:gap-2 sm:rounded-[1.5rem] sm:p-3.5">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck
                    size={11}
                    className="text-emerald-300 sm:h-3.5 sm:w-3.5"
                  />

                  <span className="text-[7px] font-black uppercase tracking-[0.18em] text-sky-200 sm:text-[9px]">
                    Validar credencial
                  </span>
                </div>

                <div className="flex h-[94px] w-[94px] items-center justify-center rounded-xl bg-white p-1.5 shadow-xl sm:h-[128px] sm:w-[128px] sm:rounded-2xl sm:p-2">
                  {publicProfileUrl ? (
                    <QrPreview
                      value={
                        publicProfileUrl
                      }
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-center text-[8px] font-black uppercase text-slate-500">
                      Perfil
                      indisponível
                    </div>
                  )}
                </div>

                <p className="max-w-[220px] truncate text-center text-[6px] font-black tracking-wide text-slate-200 sm:text-[8px]">
                  ID DA CREDENCIAL •{' '}
                  {credentialCode}
                </p>

                <p className="text-center text-[7px] font-bold text-slate-400 sm:text-[8px]">
                  Escaneie para verificar este perfil
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-1 border-t border-white/10 pt-1.5 text-[6px] font-bold text-slate-400 sm:pt-3 sm:text-[9px]">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate">
                  {serviceLabel}
                </span>

                <span className="shrink-0">
                  Emissão {issuedAt}
                </span>
              </div>

              <span className="truncate text-center text-slate-300">
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

      {/* =====================================================
          ÁREA EXCLUSIVA DE EXPORTAÇÃO
          
          Fica fora da área visual da aplicação, mas NÃO usa
          display:none, visibility:hidden ou opacity:0.
          
          É uma credencial FIXA de 1280 x 2048.
          ===================================================== */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          left: '-10000px',
          top: '0',
          width: `${EXPORT_WIDTH}px`,
          height: `${EXPORT_HEIGHT}px`,
          overflow: 'hidden',
          pointerEvents: 'none',
          zIndex: -9999,
        }}
      >
        <div
          ref={exportRef}
          data-credential-export
          style={{
            position: 'relative',
            width: `${EXPORT_WIDTH}px`,
            height: `${EXPORT_HEIGHT}px`,
            overflow: 'hidden',
            boxSizing: 'border-box',
            padding: '64px',
            color: '#ffffff',
            fontFamily:
              'Arial, Helvetica, sans-serif',
            background:
              'linear-gradient(135deg, #020617 0%, #07182f 48%, #083344 100%)',
          }}
        >
          {/* DECORAÇÃO */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                right: '-100px',
                top: '-100px',
                width: '430px',
                height: '430px',
                borderRadius: '50%',
                background:
                  'rgba(14,165,233,0.25)',
                filter:
                  'blur(70px)',
              }}
            />

            <div
              style={{
                position: 'absolute',
                left: '-120px',
                bottom: '-100px',
                width: '500px',
                height: '500px',
                borderRadius: '50%',
                background:
                  'rgba(16,185,129,0.18)',
                filter:
                  'blur(80px)',
              }}
            />

            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: 0,
                width: '2px',
                height: '100%',
                background:
                  'rgba(255,255,255,0.07)',
                transform:
                  'rotate(12deg)',
              }}
            />

            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                height: '50%',
                background:
                  'linear-gradient(to top, rgba(0,0,0,0.35), transparent)',
              }}
            />
          </div>

          <div
            style={{
              position: 'relative',
              zIndex: 2,
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection:
                'column',
            }}
          >
            {/* HEADER */}
            <div
              style={{
                display: 'flex',
                justifyContent:
                  'space-between',
                alignItems:
                  'flex-start',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: '24px',
                    fontWeight: 900,
                    letterSpacing:
                      '7px',
                    color:
                      '#7dd3fc',
                    textTransform:
                      'uppercase',
                  }}
                >
                  FisioCareHub
                </div>

                <div
                  style={{
                    marginTop:
                      '8px',
                    fontSize: '46px',
                    lineHeight: 1,
                    fontWeight: 900,
                    letterSpacing:
                      '-1.5px',
                  }}
                >
                  Credencial
                  Profissional
                </div>

                <div
                  style={{
                    marginTop:
                      '14px',
                    fontSize: '18px',
                    fontWeight: 700,
                    letterSpacing:
                      '4px',
                    color:
                      '#94a3b8',
                    textTransform:
                      'uppercase',
                  }}
                >
                  Identificação digital
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems:
                    'center',
                  gap: '10px',
                  padding:
                    '12px 20px',
                  borderRadius:
                    '999px',
                  border: approved
                    ? '2px solid rgba(110,231,183,0.30)'
                    : '2px solid rgba(252,211,77,0.30)',
                  background:
                    approved
                      ? 'rgba(52,211,153,0.10)'
                      : 'rgba(251,191,36,0.10)',
                  color:
                    approved
                      ? '#d1fae5'
                      : '#fef3c7',
                  fontSize: '17px',
                  fontWeight: 900,
                  textTransform:
                    'uppercase',
                  letterSpacing:
                    '2px',
                }}
              >
                <span
                  style={{
                    fontSize:
                      '20px',
                  }}
                >
                  ✓
                </span>

                {approved
                  ? 'Verificado'
                  : 'Validação'}
              </div>
            </div>

            {/* CORPO */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection:
                  'column',
                alignItems:
                  'center',
                paddingTop:
                  '70px',
              }}
            >
              {/* FOTO */}
              <div
                style={{
                  position:
                    'relative',
                  width: '360px',
                  height: '360px',
                  borderRadius:
                    '70px',
                  overflow:
                    'hidden',
                  border:
                    '8px solid rgba(125,211,252,0.20)',
                  background:
                    'rgba(255,255,255,0.08)',
                  boxShadow:
                    '0 30px 80px rgba(0,0,0,0.35)',
                }}
              >
                <img
                  data-export-avatar
                  src={
                    avatarFallbackUrl
                  }
                  alt=""
                  style={{
                    display:
                      'block',
                    width: '100%',
                    height: '100%',
                    objectFit:
                      'cover',
                    objectPosition:
                      'center',
                  }}
                />

                <div
                  style={{
                    position:
                      'absolute',
                    right: '20px',
                    bottom: '20px',
                    width: '46px',
                    height: '46px',
                    display:
                      'flex',
                    alignItems:
                      'center',
                    justifyContent:
                      'center',
                    borderRadius:
                      '50%',
                    border:
                      '4px solid #020617',
                    background:
                      '#10b981',
                    color:
                      '#ffffff',
                    fontSize:
                      '26px',
                    fontWeight: 900,
                  }}
                >
                  ✓
                </div>
              </div>

              {/* NOME */}
              <div
                style={{
                  width: '100%',
                  marginTop:
                    '36px',
                  textAlign:
                    'center',
                }}
              >
                <div
                  style={{
                    fontSize: '20px',
                    fontWeight: 900,
                    letterSpacing:
                      '6px',
                    color:
                      '#94a3b8',
                    textTransform:
                      'uppercase',
                  }}
                >
                  Fisioterapeuta
                </div>

                <div
                  style={{
                    marginTop:
                      '14px',
                    fontSize: '54px',
                    lineHeight:
                      '1.05',
                    fontWeight: 900,
                    letterSpacing:
                      '-1.5px',
                    color:
                      '#ffffff',
                    wordBreak:
                      'break-word',
                  }}
                >
                  {professionalName}
                </div>

                <div
                  style={{
                    marginTop:
                      '16px',
                    fontSize: '22px',
                    lineHeight:
                      '1.2',
                    fontWeight: 900,
                    letterSpacing:
                      '4px',
                    color:
                      '#7dd3fc',
                    textTransform:
                      'uppercase',
                  }}
                >
                  {specialty}
                </div>
              </div>

              {/* REGISTRO */}
              <div
                style={{
                  display:
                    'flex',
                  flexDirection:
                    'column',
                  alignItems:
                    'center',
                  gap: '12px',
                  marginTop:
                    '28px',
                }}
              >
                <div
                  style={{
                    padding:
                      '12px 26px',
                    borderRadius:
                      '999px',
                    border:
                      '2px solid rgba(255,255,255,0.10)',
                    background:
                      'rgba(255,255,255,0.08)',
                    fontSize: '19px',
                    fontWeight: 900,
                    letterSpacing:
                      '3px',
                    color:
                      '#f8fafc',
                    textTransform:
                      'uppercase',
                  }}
                >
                  CREFITO: {crefito}
                </div>

                {isPro && (
                  <div
                    style={{
                      padding:
                        '8px 20px',
                      borderRadius:
                        '999px',
                      border:
                        '2px solid rgba(252,211,77,0.30)',
                      background:
                        'rgba(251,191,36,0.10)',
                      color:
                        '#fde68a',
                      fontSize:
                        '15px',
                      fontWeight:
                        900,
                      letterSpacing:
                        '3px',
                      textTransform:
                        'uppercase',
                    }}
                  >
                    Plano Pro
                  </div>
                )}
              </div>

              {/* QR */}
              <div
                style={{
                  width: '520px',
                  marginTop:
                    '34px',
                  padding:
                    '26px',
                  borderRadius:
                    '34px',
                  border:
                    '2px solid rgba(125,211,252,0.15)',
                  background:
                    'rgba(255,255,255,0.08)',
                  display:
                    'flex',
                  flexDirection:
                    'column',
                  alignItems:
                    'center',
                  justifyContent:
                    'center',
                }}
              >
                <div
                  style={{
                    display:
                      'flex',
                    alignItems:
                      'center',
                    gap: '10px',
                    fontSize:
                      '17px',
                    fontWeight:
                      900,
                    letterSpacing:
                      '4px',
                    color:
                      '#bae6fd',
                    textTransform:
                      'uppercase',
                  }}
                >
                  <span
                    style={{
                      color:
                        '#6ee7b7',
                    }}
                  >
                    ✓
                  </span>

                  Validar credencial
                </div>

                <div
                  style={{
                    width: '250px',
                    height: '250px',
                    marginTop:
                      '18px',
                    padding:
                      '16px',
                    borderRadius:
                      '28px',
                    background:
                      '#ffffff',
                    boxShadow:
                      '0 20px 50px rgba(0,0,0,0.25)',
                    boxSizing:
                      'border-box',
                  }}
                >
                  {publicProfileUrl ? (
                    <img
                      data-export-qr
                      src=""
                      alt=""
                      style={{
                        display:
                          'block',
                        width: '100%',
                        height: '100%',
                        objectFit:
                          'contain',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width:
                          '100%',
                        height:
                          '100%',
                        display:
                          'flex',
                        alignItems:
                          'center',
                        justifyContent:
                          'center',
                        color:
                          '#64748b',
                        fontSize:
                          '16px',
                        fontWeight:
                          900,
                        textAlign:
                          'center',
                      }}
                    >
                      Perfil
                      indisponível
                    </div>
                  )}
                </div>

                <div
                  style={{
                    marginTop:
                      '16px',
                    maxWidth:
                      '420px',
                    overflow:
                      'hidden',
                    whiteSpace:
                      'nowrap',
                    textOverflow:
                      'ellipsis',
                    textAlign:
                      'center',
                    fontSize:
                      '14px',
                    fontWeight:
                      900,
                    letterSpacing:
                      '2px',
                    color:
                      '#e2e8f0',
                  }}
                >
                  ID DA CREDENCIAL •{' '}
                  {credentialCode}
                </div>

                <div
                  style={{
                    marginTop:
                      '8px',
                    fontSize:
                      '14px',
                    fontWeight:
                      700,
                    color:
                      '#94a3b8',
                  }}
                >
                  Escaneie para verificar este perfil
                </div>
              </div>
            </div>

            {/* FOOTER */}
            <div
              style={{
                paddingTop:
                  '22px',
                borderTop:
                  '2px solid rgba(255,255,255,0.10)',
                color:
                  '#94a3b8',
                fontSize:
                  '15px',
                fontWeight:
                  700,
              }}
            >
              <div
                style={{
                  display:
                    'flex',
                  alignItems:
                    'center',
                  justifyContent:
                    'space-between',
                  gap: '20px',
                }}
              >
                <span>
                  {serviceLabel}
                </span>

                <span>
                  Emissão {issuedAt}
                </span>
              </div>

              <div
                style={{
                  marginTop:
                    '8px',
                  textAlign:
                    'center',
                  color:
                    '#cbd5e1',
                }}
              >
                {city}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function QrPreview({
  value,
}: {
  value: string;
}) {
  const [src, setSrc] =
    useState('');

  useEffect(() => {
    let cancelled = false;

    setSrc('');

    QRCode.toDataURL(
      value,
      {
        errorCorrectionLevel:
          'H',
        margin: 2,
        width: 240,
        color: {
          dark: '#020617',
          light: '#ffffff',
        },
      },
    )
      .then((dataUrl) => {
        if (!cancelled) {
          setSrc(dataUrl);
        }
      })
      .catch((error) => {
        console.error(
          'Erro ao gerar QR Code:',
          error,
        );
      });

    return () => {
      cancelled = true;
    };
  }, [value]);

  if (!src) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-lg bg-slate-100 text-center text-[7px] font-black uppercase text-slate-500">
        Gerando QR...
      </div>
    );
  }

  return (
    <img
      src={src}
      alt="QR Code para validação da credencial profissional"
      className="h-full w-full rounded-lg object-contain sm:rounded-xl"
    />
  );
}
