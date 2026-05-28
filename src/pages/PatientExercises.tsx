import { useState, useEffect } from 'react';
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
  Accessibility
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
                
                <div className="absolute bottom-6 left-6">
                  <span className="bg-sky-500 text-white text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest shadow-lg">
                    {item.exercicio?.categoria_principal}
                  </span>
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
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedItemDetail(null)} className="absolute inset-0 bg-slate-950/95 backdrop-blur-md" />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-4xl bg-slate-900 rounded-[3rem] border border-white/10 overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh]"
            >
              <div className="md:w-1/2 bg-slate-950 relative">
                {selectedItemDetail.exercicio?.imagem_url ? (
                  <img src={selectedItemDetail.exercicio.imagem_url} alt={selectedItemDetail.exercicio.nome} className="w-full h-full object-contain p-8" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-800">
                    <Activity size={120} />
                  </div>
                )}
              </div>

              <div className="md:w-1/2 p-8 md:p-12 overflow-y-auto space-y-8 bg-slate-900 custom-scrollbar">
                <button onClick={() => setSelectedItemDetail(null)} className="absolute top-8 right-8 p-2 hover:bg-white/5 rounded-full text-slate-400 transition-all border border-white/10"><X size={24} /></button>
                
                <div className="space-y-3">
                  <span className="text-[10px] font-black bg-sky-500/10 text-sky-400 px-3 py-1 rounded-full uppercase tracking-widest border border-sky-500/20">
                    {selectedItemDetail.exercicio?.categoria_principal}
                  </span>
                  <h2 className="text-4xl font-black text-white tracking-tight leading-tight">{selectedItemDetail.exercicio?.nome}</h2>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Prescrição</p>
                     <p className="text-xl font-black text-white">{selectedItemDetail.series || '3'} x {selectedItemDetail.repeticoes || '10 a 12'}</p>
                   </div>
                   <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Freqüência</p>
                     <p className="text-sm font-black text-white">{selectedItemDetail.frequencia || '1x ao dia'}</p>
                   </div>
                </div>

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

                {selectedItemDetail.exercicio?.video_url && (() => {
                  const video = getVideoEmbedInfo(selectedItemDetail.exercicio.video_url);

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
                            className="aspect-video w-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                          />
                        ) : isPexelsVideoUrl(video.src) ? (
                          <video
                            src={video.src}
                            controls
                            playsInline
                            preload="metadata"
                            poster={selectedItemDetail.exercicio?.imagem_url || undefined}
                            className="aspect-video w-full bg-black object-contain"
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
                              poster={selectedItemDetail.exercicio?.imagem_url || undefined}
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
                              className="w-full max-h-[70vh] rounded-2xl bg-transparent object-contain"
                            >
                              Seu navegador não conseguiu carregar este vídeo.
                            </video>
                          </div>
                        )}
                      </div>

                      <a
                        href={selectedItemDetail.exercicio.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest text-sky-300 hover:text-sky-200"
                      >
                        Abrir vídeo em nova aba
                        <ChevronRight size={14} />
                      </a>
                    </section>
                  );
                })()}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
