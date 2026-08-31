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
import { toast } from 'sonner';
import { cn, resolveStorageUrl } from '../lib/utils';

const safeText = (
  value: unknown,
  fallback = 'Não informado',
) => {
  const text = String(value ?? '').trim();
  return text || fallback;
};

const getServiceLabel = (
  type?: string | null,
) => {
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

const svgToDataUrl = (svg: string) =>
  `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;

const escapeSvgText = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const getInitials = (name: string) => {
  const parts = name
    .split(/\s+/)
    .map((part) => part.trim())
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
  subtitle: string,
) => {
  const initials = escapeSvgText(
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
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'profissional';
};

const downloadBlobUrl = (
  url: string,
  fileName: string,
) => {
  const link =
    document.createElement('a');

  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';

  document.body.appendChild(link);
  link.click();
  link.remove();
};

/**
 * Converte uma imagem acessível para
 * Data URL.
 *
 * Se a imagem não permitir CORS,
 * retorna null em vez de quebrar
 * toda a exportação.
 */
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
    const response = await fetch(
      url,
      {
        mode: 'cors',
        credentials: 'omit',
        cache: 'force-cache',
      },
    );

    if (!response.ok) {
      return null;
    }

    const blob =
      await response.blob();

    if (!blob.type.startsWith('image/')) {
      return null;
    }

    return await new Promise<string | null>(
      (resolve) => {
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

        reader.readAsDataURL(blob);
      },
    );
  } catch (error) {
    console.warn(
      'Não foi possível converter imagem externa para Data URL:',
      error,
    );

    return null;
  }
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
  const cardRef =
    useRef<HTMLDivElement | null>(null);

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
        typeof window === 'undefined'
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
   * EXPORTAÇÃO DA CREDENCIAL
   *
   * A exportação usa um clone da credencial.
   *
   * Isso é importante porque:
   *
   * 1. Não altera a credencial que está
   *    aparecendo na tela.
   *
   * 2. Permite tratar imagens externas
   *    individualmente.
   *
   * 3. Evita que uma imagem com CORS
   *    impeça a criação do PNG.
   *
   * 4. Mantém o tamanho final em
   *    1280 x 2048 pixels.
   */
  const handleDownloadCredential =
    async () => {
      if (
        downloading ||
        !cardRef.current
      ) {
        return;
      }

      setDownloading(true);

      let temporaryContainer:
        HTMLDivElement | null = null;

      try {
        const sourceElement =
          cardRef.current;

        /**
         * Verifica se a credencial
         * realmente está renderizada.
         */
        const rect =
          sourceElement.getBoundingClientRect();

        if (
          !rect.width ||
          !rect.height
        ) {
          throw new Error(
            'Não foi possível determinar o tamanho da credencial.',
          );
        }

        /**
         * Aguarda as fontes.
         */
        if (
          typeof document !==
            'undefined' &&
          'fonts' in document
        ) {
          try {
            await document.fonts.ready;
          } catch {
            // Continua normalmente.
          }
        }

        /**
         * Aguarda imagens existentes.
         */
        const sourceImages =
          Array.from(
            sourceElement.querySelectorAll(
              'img',
            ),
          );

        await Promise.all(
          sourceImages.map(
            async (image) => {
              if (
                image.complete
              ) {
                return;
              }

              await new Promise<void>(
                (resolve) => {
                  const finish =
                    () => {
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

                  setTimeout(
                    finish,
                    5000,
                  );
                },
              );
            },
          ),
        );

        /**
         * Cria clone da credencial.
         */
        const clone =
          sourceElement.cloneNode(
            true,
          ) as HTMLDivElement;

        /**
         * Remove referência ao React.
         */
        clone.removeAttribute('id');

        /**
         * Container temporário.
         */
        temporaryContainer =
          document.createElement(
            'div',
          );

        temporaryContainer.style.position =
          'fixed';

        temporaryContainer.style.left =
          '-100000px';

        temporaryContainer.style.top =
          '0';

        temporaryContainer.style.width =
          `${rect.width}px`;

        temporaryContainer.style.height =
          `${rect.height}px`;

        temporaryContainer.style.margin =
          '0';

        temporaryContainer.style.padding =
          '0';

        temporaryContainer.style.background =
          'transparent';

        temporaryContainer.style.pointerEvents =
          'none';

        temporaryContainer.style.zIndex =
          '-9999';

        temporaryContainer.appendChild(
          clone,
        );

        document.body.appendChild(
          temporaryContainer,
        );

        /**
         * Trata todas as imagens
         * existentes dentro do clone.
         */
        const cloneImages =
          Array.from(
            clone.querySelectorAll(
              'img',
            ),
          );

        await Promise.all(
          cloneImages.map(
            async (image) => {
              const originalSrc =
                image.getAttribute(
                  'src',
                ) || '';

              /**
               * Data URLs já são seguras
               * para o html2canvas.
               */
              if (
                originalSrc.startsWith(
                  'data:',
                )
              ) {
                image.removeAttribute(
                  'crossorigin',
                );

                return;
              }

              /**
               * Tenta transformar a
               * imagem externa em Data URL.
               */
              const dataUrl =
                await imageUrlToDataUrl(
                  originalSrc,
                );

              if (dataUrl) {
                image.setAttribute(
                  'src',
                  dataUrl,
                );

                image.removeAttribute(
                  'crossorigin',
                );

                return;
              }

              /**
               * Se a imagem externa
               * não permitir CORS,
               * usamos o avatar SVG
               * interno como fallback.
               */
              image.setAttribute(
                'src',
                avatarFallbackUrl,
              );

              image.removeAttribute(
                'crossorigin',
              );
            },
          ),
        );

        /**
         * Garante que as imagens
         * do clone foram processadas.
         */
        const finalImages =
          Array.from(
            clone.querySelectorAll(
              'img',
            ),
          );

        await Promise.all(
          finalImages.map(
            (image) =>
              new Promise<void>(
                (resolve) => {
                  if (
                    image.complete
                  ) {
                    resolve();
                    return;
                  }

                  const finish =
                    () => {
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

                  setTimeout(
                    finish,
                    3000,
                  );
                },
              ),
          ),
        );

        /**
         * Força o clone a permanecer
         * exatamente no tamanho visual
         * original.
         */
        clone.style.width =
          `${rect.width}px`;

        clone.style.height =
          `${rect.height}px`;

        clone.style.maxWidth =
          'none';

        clone.style.maxHeight =
          'none';

        clone.style.transform =
          'none';

        clone.style.margin =
          '0';

        /**
         * Pequeno tempo para o navegador
         * recalcular layout e imagens.
         */
        await new Promise<void>(
          (resolve) =>
            requestAnimationFrame(
              () =>
                requestAnimationFrame(
                  () => resolve(),
                ),
            ),
        );

        /**
         * Captura o CLONE.
         *
         * O elemento original não é
         * alterado.
         */
        const capturedCanvas =
          await html2canvas(
            clone,
            {
              backgroundColor:
                null,

              scale: Math.min(
                4,
                Math.max(
                  2,
                  1280 /
                    rect.width,
                ),
              ),

              useCORS: true,

              allowTaint: false,

              logging: false,

              imageTimeout: 15000,

              foreignObjectRendering:
                false,

              width: rect.width,

              height: rect.height,

              scrollX: 0,

              scrollY: 0,

              onclone: (
                clonedDocument,
              ) => {
                /**
                 * Remove qualquer
                 * crossorigin restante.
                 */
                const clonedImages =
                  clonedDocument.querySelectorAll(
                    'img',
                  );

                clonedImages.forEach(
                  (image) => {
                    image.removeAttribute(
                      'crossorigin',
                    );
                  },
                );
              },
            },
          );

        if (
          !capturedCanvas ||
          !capturedCanvas.width ||
          !capturedCanvas.height
        ) {
          throw new Error(
            'A captura da credencial retornou um canvas vazio.',
          );
        }

        /**
         * Dimensões finais.
         */
        const outputWidth =
          1280;

        const outputHeight =
          2048;

        const finalCanvas =
          document.createElement(
            'canvas',
          );

        finalCanvas.width =
          outputWidth;

        finalCanvas.height =
          outputHeight;

        const context =
          finalCanvas.getContext(
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

        /**
         * Fundo transparente.
         *
         * A própria credencial já
         * possui o fundo escuro.
         */
        context.clearRect(
          0,
          0,
          outputWidth,
          outputHeight,
        );

        /**
         * Mantém exatamente a proporção
         * 5:8.
         */
        context.drawImage(
          capturedCanvas,
          0,
          0,
          capturedCanvas.width,
          capturedCanvas.height,
          0,
          0,
          outputWidth,
          outputHeight,
        );

        /**
         * Converte para PNG.
         */
        const blob =
          await new Promise<Blob | null>(
            (resolve) => {
              finalCanvas.toBlob(
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

        if (blob.size < 1000) {
          throw new Error(
            'O arquivo PNG gerado está vazio ou inválido.',
          );
        }

        const fileName =
          `credencial-fisiocarehub-${fileNameFromName(
            professionalName,
          )}.png`;

        /**
         * Download.
         */
        const pngUrl =
          URL.createObjectURL(
            blob,
          );

        try {
          downloadBlobUrl(
            pngUrl,
            fileName,
          );
        } finally {
          setTimeout(
            () => {
              URL.revokeObjectURL(
                pngUrl,
              );
            },
            1500,
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
        /**
         * Remove o clone temporário.
         */
        if (
          temporaryContainer &&
          temporaryContainer.parentNode
        ) {
          temporaryContainer.parentNode.removeChild(
            temporaryContainer,
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
            onClick={handleCopyLink}
            disabled={!publicProfileUrl}
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

            {/* HEADER */}

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

            {/* CONTEÚDO */}

            <div className="flex min-h-0 flex-1 flex-col items-center gap-2 sm:gap-3">

              {/* FOTO */}

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

              {/* IDENTIDADE */}

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

              {/* REGISTRO */}

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

              {/* QR / VALIDAÇÃO */}

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

            {/* FOOTER */}

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
    </section>
  );
}

function QrPreview({
  value,
}: {
  value: string;
}) {
  const [src, setSrc] = useState('');

  useEffect(() => {
    let cancelled = false;

    setSrc('');

    QRCode.toDataURL(value, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 240,
      color: {
        dark: '#020617',
        light: '#ffffff',
      },
    })
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
