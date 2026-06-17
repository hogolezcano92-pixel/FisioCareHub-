import { useState, useEffect, type MouseEvent } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, 
  Video, 
  Loader2, 
  Dumbbell,
  Play,
  ClipboardList,
  Target,
  Info,
  ChevronRight,
  ChevronLeft,
  X,
  Zap,
  Calendar,
  Layers,
  Accessibility,
  FileText
} from 'lucide-react';
import { cn } from '../lib/utils';
import { getPatientVisibleIds } from '../services/patientLinkService';

interface ProtocolItem {
  id: string;
  exercicio: {
    nome: string;
    descricao: string;
    imagem_url: string;
    video_url: string;
    pdf_url?: string | null;
    arquivo_url?: string | null;
    gif_url?: string | null;
    gifUrl?: string | null;
    media_url?: string | null;
    mediaUrl?: string | null;
    demonstration_url?: string | null;
    demonstrationUrl?: string | null;
    animacao_url?: string | null;
    animation_url?: string | null;
    origem?: string | null;
    source?: string | null;
    externo_id?: string | null;
    external_id?: string | null;
    exerciseId?: string | null;
    indicacao_clinica: string;
    precaucoes: string;
    objetivo_principal: string;
    categoria_principal: string;
    series?: string | null;
    repeticoes?: string | null;
    frequencia?: string | null;
  };
  series: string;
  repeticoes: string;
  carga: string;
  frequencia: string;
  observacoes_especificas: string;
}

const cleanPrescriptionValue = (value: unknown) => {
  const text = String(value ?? '').trim();
  if (!text || text === 'null' || text === 'undefined') return '';
  return text;
};

const firstPrescriptionValue = (...values: unknown[]) => {
  for (const value of values) {
    const text = cleanPrescriptionValue(value);
    if (text) return text;
  }
  return '';
};

const getVideoEmbedInfo = (url: string) => {
  const videoUrl = String(url || '').trim();

  if (!videoUrl) {
    return { type: 'empty' as const, src: '' };
  }

  const youtubeMatch = videoUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/i);
  if (youtubeMatch?.[1]) {
    return {
      type: 'iframe' as const,
      src: `https://www.youtube.com/embed/${youtubeMatch[1]}`,
    };
  }

  const vimeoMatch = videoUrl.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vimeoMatch?.[1]) {
    return {
      type: 'iframe' as const,
      src: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
    };
  }

  return { type: 'video' as const, src: videoUrl };
};

const isPexelsVideoUrl = (url: string) => {
  const normalized = String(url || '').toLowerCase();
  return normalized.includes('pexels.com') || normalized.includes('videos.pexels.com');
};

const getVideoExternalUrl = (originalUrl?: string | null) => {
  const original = String(originalUrl || '').trim();
  if (!original) return '';

  const video = getVideoEmbedInfo(original);

  // Para YouTube/Vimeo, abrir a URL original é melhor do que abrir o embed.
  if (video.type === 'iframe') {
    return original;
  }

  // Para Pexels e arquivos mp4, usar exatamente o src que o player interno já consegue tocar.
  return video.src || original;
};

const escapeHtmlAttribute = (value: string) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const openVideoInNewTab = (event: MouseEvent<HTMLAnchorElement>, url: string, title?: string) => {
  event.preventDefault();
  event.stopPropagation();

  const externalUrl = String(url || '').trim();
  if (!externalUrl) return;

  const newTab = window.open('', '_blank');

  if (!newTab) {
    window.location.href = externalUrl;
    return;
  }

  const safeUrl = escapeHtmlAttribute(externalUrl);
  const safeTitle = escapeHtmlAttribute(title || 'Vídeo do exercício');

  newTab.document.write(`
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <title>${safeTitle} - FisioCareHub</title>
        <style>
          html, body {
            margin: 0;
            width: 100%;
            height: 100%;
            background: #020617;
            color: #ffffff;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          }

          .page {
            min-height: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: max(20px, env(safe-area-inset-top)) 18px max(24px, env(safe-area-inset-bottom));
            box-sizing: border-box;
          }

          .topbar {
            position: fixed;
            top: max(14px, env(safe-area-inset-top));
            left: 16px;
            right: 16px;
            z-index: 5;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            color: #e0f2fe;
          }

          .brand {
            display: flex;
            flex-direction: column;
            gap: 2px;
          }

          .brand strong {
            font-size: 13px;
            font-weight: 900;
            letter-spacing: .16em;
            text-transform: uppercase;
            color: #38bdf8;
          }

          .brand span {
            font-size: 11px;
            font-weight: 700;
            color: rgba(226, 232, 240, .72);
          }

          .close {
            border: 1px solid rgba(255,255,255,.14);
            background: rgba(255,255,255,.08);
            color: #fff;
            border-radius: 999px;
            padding: 10px 14px;
            font-weight: 900;
            cursor: pointer;
          }

          .player-card {
            width: 100%;
            max-width: 960px;
            border-radius: 28px;
            border: 1px solid rgba(125, 211, 252, .18);
            background: rgba(15, 23, 42, .78);
            box-shadow: 0 30px 90px rgba(14, 165, 233, .18);
            overflow: hidden;
          }

          video {
            display: block;
            width: 100%;
            max-height: 78vh;
            background: #000;
          }

          .footer {
            padding: 14px 16px 16px;
            display: flex;
            flex-direction: column;
            gap: 10px;
          }

          .title {
            margin: 0;
            font-size: 15px;
            line-height: 1.35;
            font-weight: 900;
            color: #ffffff;
          }

          .original {
            color: #7dd3fc;
            font-size: 12px;
            font-weight: 900;
            text-decoration: none;
            text-transform: uppercase;
            letter-spacing: .14em;
          }

          .hint {
            margin: 0;
            color: rgba(226, 232, 240, .62);
            font-size: 12px;
            line-height: 1.45;
            font-weight: 600;
          }
        </style>
      </head>

      <body>
        <div class="topbar">
          <div class="brand">
            <strong>FisioCareHub</strong>
            <span>Vídeo do exercício</span>
          </div>
          <button class="close" onclick="window.close()">Fechar</button>
        </div>

        <main class="page">
          <section class="player-card">
            <video src="${safeUrl}" controls playsinline autoplay></video>
            <div class="footer">
              <p class="title">${safeTitle}</p>
              <a class="original" href="${safeUrl}" target="_blank" rel="noopener noreferrer">
                Abrir arquivo original
              </a>
              <p class="hint">
                Caso o vídeo não carregue, toque em “Abrir arquivo original”.
              </p>
            </div>
          </section>
        </main>
      </body>
    </html>
  `);

  newTab.document.close();
};

const getExercisePdfUrl = (exercise?: ProtocolItem['exercicio'] | null) =>
  String(exercise?.pdf_url || exercise?.arquivo_url || '').trim();

const cleanMediaUrl = (value: unknown) => {
  const text = String(value ?? '').trim();
  if (!text || text === 'null' || text === 'undefined') return '';
  return text;
};

const getNestedMediaUrl = (value: unknown) => {
  if (!value || typeof value !== 'object') return '';
  const record = value as Record<string, unknown>;
  return cleanMediaUrl(
    record['1080p'] ||
    record['720p'] ||
    record['480p'] ||
    record['360p'] ||
    record['180p'] ||
    record.url ||
    record.src
  );
};

const getExerciseDbExternalId = (exercise?: ProtocolItem['exercicio'] | null) => {
  if (!exercise) return '';

  const directId = cleanMediaUrl(
    exercise.exerciseId ||
    exercise.external_id ||
    exercise.externo_id
  );

  if (directId) return directId;

  const text = [exercise.descricao, exercise.indicacao_clinica, exercise.precaucoes]
    .map((part) => String(part || ''))
    .join(' ');

  if (!/exercisedb/i.test(text)) return '';

  const match = text.match(/(?:exerciseId|exercício\s+externo\s+ID|exercicio\s+externo\s+ID|ID)\s*[:#-]?\s*([A-Za-z0-9_-]{5,})/i);
  return match?.[1] || '';
};

const getExerciseDemonstrationUrl = (exercise?: ProtocolItem['exercicio'] | null) => {
  if (!exercise) return '';

  const directMedia = cleanMediaUrl(
    exercise.video_url ||
    exercise.gif_url ||
    exercise.gifUrl ||
    exercise.demonstration_url ||
    exercise.demonstrationUrl ||
    exercise.media_url ||
    exercise.mediaUrl ||
    exercise.animacao_url ||
    exercise.animation_url ||
    getNestedMediaUrl((exercise as any).gifUrls) ||
    getNestedMediaUrl((exercise as any).imageUrls)
  );

  if (directMedia) return directMedia;

  const coverUrl = cleanMediaUrl(exercise.imagem_url);
  if (coverUrl && isImageLikeUrl(coverUrl) && isAnimatedImageUrl(coverUrl)) {
    return coverUrl;
  }

  const exerciseDbId = getExerciseDbExternalId(exercise);
  if (exerciseDbId) {
    return `https://static.exercisedb.dev/media/${encodeURIComponent(exerciseDbId)}.gif`;
  }

  return '';
};

const getExerciseCoverUrl = (exercise?: ProtocolItem['exercicio'] | null) => cleanMediaUrl(exercise?.imagem_url);

const isAnimatedImageUrl = (url: string) => /\.gif(?:$|[?#])/i.test(url) || /static\.exercisedb\.dev\/media\/[^/?#]+\.gif/i.test(url);

const isImageLikeUrl = (url: string) => {
  const normalized = String(url || '').toLowerCase();
  return (
    /\.(gif|png|jpe?g|webp|avif)(?:$|[?#])/i.test(normalized) ||
    normalized.includes('static.exercisedb.dev/media/') ||
    normalized.includes('/image?exerciseid=')
  );
};

const getDemonstrationLabel = (url: string) => {
  if (isAnimatedImageUrl(url)) return 'GIF do exercício';
  if (isImageLikeUrl(url)) return 'Imagem de referência';
  return 'Vídeo do exercício';
};

const normalizeProtocolItem = (item: any): ProtocolItem => {
  const exercise = item?.exercicio || {};

  return {
    ...item,
    exercicio: exercise,
    series: firstPrescriptionValue(
      item?.series,
      item?.serie,
      item?.qtd_series,
      item?.quantidade_series,
      item?.exercicio_series,
      exercise?.series,
      '3'
    ),
    repeticoes: firstPrescriptionValue(
      item?.repeticoes,
      item?.repeticao,
      item?.reps,
      item?.qtd_repeticoes,
      item?.quantidade_repeticoes,
      item?.exercicio_repeticoes,
      exercise?.repeticoes,
      '10 a 12'
    ),
    carga: firstPrescriptionValue(item?.carga, item?.peso, ''),
    frequencia: firstPrescriptionValue(
      item?.frequencia,
      item?.frequency,
      item?.periodicidade,
      exercise?.frequencia,
      '1x ao dia'
    ),
    observacoes_especificas: firstPrescriptionValue(
      item?.observacoes_especificas,
      item?.observacoes,
      item?.nota,
      ''
    ),
  };
};


export default function PatientExercises() {
  const { user } = useAuth();
  const [protocols, setProtocols] = useState<any[]>([]);
  const [selectedProtocol, setSelectedProtocol] = useState<any>(null);
  const [protocolItems, setProtocolItems] = useState<ProtocolItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItemDetail, setSelectedItemDetail] = useState<ProtocolItem | null>(null);
  const [videoAspectRatios, setVideoAspectRatios] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      fetchProtocols();
    }
  }, [user]);

  const fetchProtocols = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const visiblePatientIds = await getPatientVisibleIds(user.id, user.email);

      const { data: protocolData, error: protocolError } = await supabase
        .from('protocolos_prescricao')
        .select('*')
        .in('paciente_id', visiblePatientIds)
        .order('created_at', { ascending: false });

      if (protocolError) throw protocolError;

      // Prescrições rápidas feitas pela aba "Meus Pacientes" ficam em exercicios_paciente.
      // Elas também precisam aparecer para o paciente com conta ativa.
      // Em alguns fluxos a prescrição direta fica no ID clínico (pacientes.id),
      // em outros no ID da conta (perfis.id). Por isso usamos todos os IDs visíveis.
      const prescriptionPatientIds = visiblePatientIds;

      let directProtocol: any | null = null;
      if (prescriptionPatientIds.length > 0) {
        const { data: prescriptionsData, error: prescriptionsError } = await supabase
          .from('exercicios_paciente')
          .select('*')
          .in('paciente_id', prescriptionPatientIds)
          .order('created_at', { ascending: false });

        if (prescriptionsError) {
          console.error('Erro ao buscar exercícios prescritos diretamente:', prescriptionsError);
        }

        const exerciseIds = Array.from(new Set((prescriptionsData || []).map((item: any) => item.exercicio_id).filter(Boolean)));

        let exerciseMap: Record<string, any> = {};
        if (exerciseIds.length > 0) {
          const { data: exercisesData, error: exercisesError } = await supabase
            .from('exercicios')
            .select('*')
            .in('id', exerciseIds);

          if (exercisesError) {
            console.error('Erro ao buscar detalhes dos exercícios prescritos:', exercisesError);
          } else {
            exerciseMap = (exercisesData || []).reduce((acc: Record<string, any>, exercise: any) => {
              acc[exercise.id] = exercise;
              return acc;
            }, {});
          }
        }

        const directItems = (prescriptionsData || [])
          .map((prescription: any) => normalizeProtocolItem({
            id: prescription.id,
            exercicio: exerciseMap[prescription.exercicio_id] || null,
            series: prescription.series,
            repeticoes: prescription.repeticoes,
            carga: prescription.carga,
            frequencia: prescription.frequencia,
            observacoes_especificas: prescription.observacoes || prescription.observacoes_especificas,
            created_at: prescription.created_at,
          }))
          .filter((item: any) => item.exercicio);

        if (directItems.length > 0) {
          directProtocol = {
            id: 'direct-prescriptions',
            titulo: 'Exercícios prescritos pelo fisioterapeuta',
            created_at: directItems[0]?.created_at || new Date().toISOString(),
            source: 'direct',
            items: directItems,
          };
        }
      }

      const allProtocols = directProtocol ? [directProtocol, ...(protocolData || [])] : (protocolData || []);
      setProtocols(allProtocols);

      if (allProtocols.length > 0) {
        handleSelectProtocol(allProtocols[0]);
      } else {
        setProtocolItems([]);
        setSelectedProtocol(null);
      }
    } catch (err) {
      console.error('Erro ao buscar protocolos:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectProtocol = async (protocol: any) => {
    setSelectedProtocol(protocol);
    setIsLoading(true);
    try {
      if (protocol?.source === 'direct') {
        setProtocolItems((protocol.items || []).map(normalizeProtocolItem));
        return;
      }

      const { data, error } = await supabase
        .from('protocolo_itens')
        .select(`
          *,
          exercicio:exercicios (*)
        `)
        .eq('protocolo_id', protocol.id)
        .order('ordem');

      if (error) throw error;
      setProtocolItems((data || []).map(normalizeProtocolItem));
    } catch (err) {
      console.error('Erro ao buscar itens do protocolo:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && protocols.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="w-12 h-12 text-sky-500 animate-spin" />
        <p className="text-slate-500 font-bold animate-pulse">Carregando plano de treinos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full max-w-6xl mx-auto pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-3">
            <Activity className="text-sky-500" size={36} />
            Meu Plano de Treinos
          </h1>
          <p className="text-slate-400 font-medium">Siga as orientações do seu fisioterapeuta para uma melhor recuperação.</p>
        </div>

        {protocols.length > 1 && (
          <div className="w-full md:w-auto max-w-full flex flex-col sm:flex-row sm:items-center gap-2 bg-slate-900 p-1.5 rounded-2xl border border-white/10 overflow-hidden">
            <span className="shrink-0 text-[10px] font-black text-slate-500 uppercase tracking-widest px-3 pt-2 sm:pt-0">Histórico:</span>
            <select
              className="w-full sm:w-auto min-w-0 max-w-full bg-transparent text-white font-bold text-sm outline-none px-3 py-2 pr-10 truncate rounded-xl border border-white/10 sm:border-0"
              onChange={(e) => handleSelectProtocol(protocols.find(p => p.id === e.target.value))}
            >
              {protocols.map(p => (
                <option key={p.id} value={p.id} className="bg-slate-900">
                  {new Date(p.created_at).toLocaleDateString()} - {p.titulo}
                </option>
              ))}
            </select>
          </div>
        )}
      </header>

      {protocols.length === 0 ? (
        <div className="bg-slate-900/50 backdrop-blur-xl p-20 rounded-[3rem] border border-white/10 text-center">
          <Dumbbell size={64} className="text-slate-800 mx-auto mb-4" />
          <h3 className="text-2xl font-black text-white">Nenhum exercício ativo</h3>
          <p className="text-slate-400 mt-2 font-medium">Seu fisioterapeuta ainda não prescreveu um protocolo para você.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {protocolItems.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              onClick={() => setSelectedItemDetail(item)}
              className="bg-slate-900/50 backdrop-blur-xl rounded-[2.5rem] border border-white/10 shadow-lg overflow-hidden group cursor-pointer hover:border-sky-500/50 transition-all"
            >
              <div className="aspect-[16/9] relative bg-slate-950">
                {item.exercicio?.imagem_url ? (
                  <img 
                    src={item.exercicio.imagem_url} 
                    alt={item.exercicio.nome} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-800">
                    <Activity size={80} />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-60" />

                <div className="absolute bottom-6 left-6 right-6 flex flex-wrap items-center gap-2">
                  <span className="bg-sky-500 text-white text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest shadow-lg">
                    {item.exercicio?.categoria_principal}
                  </span>
                  {getExercisePdfUrl(item.exercicio) && (
                    <span className="inline-flex items-center gap-1 bg-rose-500 text-white text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest shadow-lg">
                      <FileText size={12} />
                      PDF
                    </span>
                  )}
                </div>
              </div>

              <div className="p-8 space-y-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="text-2xl font-black text-white leading-tight">{item.exercicio?.nome}</h3>
                    <p className="text-sm font-bold text-sky-400">{item.exercicio?.objetivo_principal}</p>
                  </div>
                  <div className="p-2 bg-white/5 rounded-xl text-slate-400">
                     <ChevronRight size={20} />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white/5 p-3 rounded-2xl border border-white/5 text-center">
                    <span className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Séries</span>
                    <span className="text-lg font-black text-white">{item.series || '0'}</span>
                  </div>
                  <div className="flex-1 bg-white/5 p-3 rounded-2xl border border-white/5 text-center">
                    <span className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Reps</span>
                    <span className="text-lg font-black text-white">{item.repeticoes || '0'}</span>
                  </div>
                  <div className="flex-1 bg-white/5 p-3 rounded-2xl border border-white/5 text-center">
                    <span className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Freq</span>
                    <span className="text-xs font-black text-white truncate px-1 mt-1 block">{item.frequencia || '1x'}</span>
                  </div>
                </div>

                {item.observacoes_especificas && (
                  <div className="p-4 bg-amber-500/5 rounded-2xl border border-amber-500/10">
                    <p className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-1">Nota do Fisioterapeuta</p>
                    <p className="text-slate-300 text-sm font-medium italic">"{item.observacoes_especificas}"</p>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Item Detail Modal */}
      <AnimatePresence>
        {selectedItemDetail && (
          <div className="fixed left-0 right-0 bottom-0 top-[calc(env(safe-area-inset-top)+5.75rem)] z-[10000] flex items-start justify-center px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-2 md:inset-0 md:items-center md:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedItemDetail(null)} className="absolute inset-0 bg-slate-950/95 backdrop-blur-md" />
            <motion.div 
              initial={{ opacity: 0, scale: 0.96, y: 18 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.96, y: 18 }}
              className="relative flex h-full w-full max-w-3xl flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900 shadow-2xl md:h-auto md:max-h-[90vh] md:rounded-[3rem]"
            >
              <div className="w-full flex-1 overflow-y-auto overscroll-contain bg-slate-900 p-5 pb-7 custom-scrollbar sm:p-6 md:p-12 md:space-y-8 space-y-6">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1 space-y-3">
                    <span className="inline-flex max-w-full text-[10px] font-black bg-sky-500/10 text-sky-400 px-3 py-1 rounded-full uppercase tracking-widest border border-sky-500/20 truncate">
                      {selectedItemDetail.exercicio?.categoria_principal}
                    </span>
                    <h2 className="text-[clamp(1.75rem,8vw,2.7rem)] md:text-4xl font-black text-white tracking-tight leading-[0.98] break-words pr-1">{selectedItemDetail.exercicio?.nome}</h2>
                  </div>
                  <button onClick={() => setSelectedItemDetail(null)} className="shrink-0 p-2 hover:bg-white/5 rounded-full text-slate-400 transition-all border border-white/10"><X size={22} /></button>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                   <div className="bg-white/5 p-4 rounded-2xl border border-white/5 min-w-0">
                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Prescrição</p>
                     <p className="text-lg sm:text-xl font-black text-white leading-tight break-words">{selectedItemDetail.series || '3'} x {selectedItemDetail.repeticoes || '10 a 12'}</p>
                   </div>
                   <div className="bg-white/5 p-4 rounded-2xl border border-white/5 min-w-0">
                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Frequência</p>
                     <p className="text-sm sm:text-base font-black text-white leading-tight break-words">{selectedItemDetail.frequencia || '1x ao dia'}</p>
                   </div>
                </div>

                {(() => {
                  const demonstrationUrl = getExerciseDemonstrationUrl(selectedItemDetail.exercicio);
                  const coverUrl = getExerciseCoverUrl(selectedItemDetail.exercicio);
                  const mediaUrl = demonstrationUrl || coverUrl;

                  if (!mediaUrl) return null;

                  const label = demonstrationUrl ? getDemonstrationLabel(demonstrationUrl) : 'Imagem de capa';

                  if (isImageLikeUrl(mediaUrl)) {
                    return (
                      <section className="space-y-3">
                        <div className="flex items-center gap-2 text-sky-300">
                          <Play size={18} fill="currentColor" />
                          <h4 className="text-xs font-black uppercase tracking-widest">{label}</h4>
                        </div>

                        <div className="overflow-hidden rounded-2xl border border-sky-400/20 bg-black shadow-xl shadow-sky-950/20">
                          <img
                            src={mediaUrl}
                            alt={selectedItemDetail.exercicio?.nome || label}
                            className="w-full max-h-[42vh] bg-black object-contain md:max-h-[70vh]"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                          />
                        </div>

                        {demonstrationUrl && (
                          <a
                            href={mediaUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest text-sky-300 hover:text-sky-200"
                          >
                            Abrir demonstração em nova aba
                            <ChevronRight size={14} />
                          </a>
                        )}
                      </section>
                    );
                  }

                  const video = getVideoEmbedInfo(mediaUrl);
                  const externalVideoUrl = getVideoExternalUrl(mediaUrl);

                  return (
                    <section className="space-y-3">
                      <div className="flex items-center gap-2 text-sky-300">
                        <Play size={18} fill="currentColor" />
                        <h4 className="text-xs font-black uppercase tracking-widest">Vídeo do exercício</h4>
                      </div>

                      <div
                        className={cn(
                          'overflow-hidden rounded-2xl border border-sky-400/20 shadow-xl shadow-sky-950/20',
                          video.type === 'video' && !isPexelsVideoUrl(video.src) ? 'bg-transparent' : 'bg-black'
                        )}
                      >
                        {video.type === 'iframe' ? (
                          <iframe
                            src={video.src}
                            title={selectedItemDetail.exercicio?.nome || 'Vídeo do exercício'}
                            className="aspect-video w-full max-h-[42vh] md:max-h-none"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                          />
                        ) : isPexelsVideoUrl(video.src) ? (
                          <video
                            src={video.src}
                            controls
                            playsInline
                            preload="metadata"
                            poster={coverUrl || undefined}
                            className="aspect-video w-full max-h-[42vh] bg-black object-contain md:max-h-none"
                          >
                            Seu navegador não conseguiu carregar este vídeo.
                          </video>
                        ) : (
                          <div className="flex w-full items-center justify-center bg-transparent p-0">
                            <video
                              src={video.src}
                              controls
                              playsInline
                              preload="metadata"
                              poster={coverUrl || undefined}
                              onLoadedMetadata={(event) => {
                                const target = event.currentTarget;
                                if (target.videoWidth && target.videoHeight) {
                                  setVideoAspectRatios((current) => ({
                                    ...current,
                                    [video.src]: `${target.videoWidth} / ${target.videoHeight}`,
                                  }));
                                }
                              }}
                              style={{
                                aspectRatio: videoAspectRatios[video.src],
                              }}
                              className="w-full max-h-[42vh] rounded-2xl bg-transparent object-contain md:max-h-[70vh]"
                            >
                              Seu navegador não conseguiu carregar este vídeo.
                            </video>
                          </div>
                        )}
                      </div>

                      <a
                        href={externalVideoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(event) => openVideoInNewTab(event, externalVideoUrl, selectedItemDetail.exercicio?.nome)}
                        className="inline-flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest text-sky-300 hover:text-sky-200"
                      >
                        Abrir vídeo em nova aba
                        <ChevronRight size={14} />
                      </a>
                    </section>
                  );
                })()}

                <section className="space-y-2">
                  <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">Caminho da Recuperação</h4>
                  <p className="text-slate-300 font-medium leading-relaxed">
                    {selectedItemDetail.exercicio?.descricao}
                  </p>
                </section>

                {selectedItemDetail.exercicio?.precaucoes && (
                  <section className="bg-rose-500/5 p-5 rounded-2xl border border-rose-500/10">
                    <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-2 font-black">Atenção / Cuidados</h4>
                    <p className="text-rose-400/80 text-sm font-medium">{selectedItemDetail.exercicio?.precaucoes}</p>
                  </section>
                )}

                {getExercisePdfUrl(selectedItemDetail.exercicio) && (
                  <section className="space-y-3 rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4">
                    <div className="flex items-center gap-2 text-rose-200">
                      <FileText size={18} />
                      <h4 className="text-xs font-black uppercase tracking-widest">PDF do exercício</h4>
                    </div>
                    <p className="text-sm font-semibold text-rose-100/80">
                      Material complementar vinculado a este exercício pelo FisioCareHub.
                    </p>
                    <a
                      href={getExercisePdfUrl(selectedItemDetail.exercicio)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-500 px-4 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-rose-400 transition-all"
                    >
                      <FileText size={16} />
                      Abrir PDF do exercício
                    </a>
                  </section>
                )}


              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
