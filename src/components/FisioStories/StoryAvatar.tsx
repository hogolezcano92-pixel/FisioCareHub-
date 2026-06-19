import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Camera,
  Eye,
  Image as ImageIcon,
  Loader2,
  Plus,
  Send,
  Trash2,
  UploadCloud,
  Video,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { FisioStory, StoryGroup, storiesService } from '../../services/storiesService';
import StoryViewer from './StoryViewer';

type StoryAvatarProps = {
  physioId: string;
  name?: string | null;
  avatarUrl?: string | null;
  sizeClassName?: string;
  className?: string;
};

const getInitials = (name?: string | null) =>
  String(name || 'F')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || 'F';

const isClient = () => typeof window !== 'undefined' && typeof document !== 'undefined';

export default function StoryAvatar({
  physioId,
  name,
  avatarUrl,
  sizeClassName = 'w-16 h-16',
  className = '',
}: StoryAvatarProps) {
  const { user } = useAuth();
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const [stories, setStories] = useState<FisioStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');

  const isOwner = user?.id === physioId;
  const hasStories = stories.length > 0;
  const isDashboardCleanAvatar = className.includes('dashboard-story-avatar-clean');

  const storyGroups = useMemo<StoryGroup[]>(() => {
    if (!hasStories) return [];

    const physio = stories[0]?.physio || {
      id: physioId,
      nome_completo: name || 'Fisioterapeuta',
      foto_url: avatarUrl || null,
      avatar_url: avatarUrl || null,
      especialidade: null,
      cidade: null,
      estado: null,
    };

    return [{ physio_id: physioId, physio, stories }];
  }, [avatarUrl, hasStories, name, physioId, stories]);

  const loadStories = async () => {
    if (!physioId) return;
    setLoading(true);
    try {
      const data = await storiesService.listStoriesByPhysio(physioId, false);
      setStories(data);
    } catch (error) {
      console.warn('[StoryAvatar] Erro ao carregar stories:', error);
      setStories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStories();
  }, [physioId]);

  const openProfileAction = () => {
    if (isOwner) {
      setOptionsOpen(true);
      return;
    }

    if (hasStories) {
      setViewerOpen(true);
    }
  };

  const openGalleryDirectly = () => {
    if (!isOwner) return;
    galleryInputRef.current?.click();
  };

  const openCameraDirectly = () => {
    if (!isOwner) return;
    cameraInputRef.current?.click();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] || null;

    // Permite escolher o mesmo arquivo novamente depois.
    event.target.value = '';

    if (!nextFile) return;

    setFile(nextFile);
    setOptionsOpen(true);
  };

  const resetComposer = () => {
    setFile(null);
    setCaption('');
  };

  const closeComposer = () => {
    setOptionsOpen(false);
    resetComposer();
  };

  const publishStory = async () => {
    if (!isOwner) return;

    if (!file) {
      toast.error('Selecione uma foto ou vídeo para publicar.');
      return;
    }

    setPublishing(true);
    try {
      const uploaded = await storiesService.uploadStoryFile(file, physioId);
      await storiesService.createStory({
        physioId,
        title: 'Story profissional',
        caption,
        mediaUrl: uploaded.url,
        mediaType: uploaded.mediaType,
        ctaType: 'profile',
        ctaLabel: 'Ver perfil',
        ctaUrl: `/physio/${physioId}`,
        durationHours: 24,
      });

      toast.success('Story publicado.');
      resetComposer();
      setOptionsOpen(false);
      await loadStories();
    } catch (error: any) {
      console.error('[StoryAvatar] Erro ao publicar story:', error);
      toast.error(error?.message || 'Erro ao publicar story.');
    } finally {
      setPublishing(false);
    }
  };

  const deleteCurrentStories = async () => {
    if (!isOwner || stories.length === 0) return;

    const confirmed = window.confirm('Remover seus stories ativos?');
    if (!confirmed) return;

    try {
      await Promise.all(stories.map(story => storiesService.deleteStory(story.id)));
      setStories([]);
      toast.success('Stories removidos.');
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao remover stories.');
    }
  };

  const overlay = (
    <>
      {viewerOpen && storyGroups.length > 0 && (
        <StoryViewer groups={storyGroups} initialGroupIndex={0} onClose={() => setViewerOpen(false)} />
      )}

      <AnimatePresence>
        {optionsOpen && (
          <div className="fixed inset-0 z-[10050] flex items-end justify-center bg-slate-950/80 p-0 backdrop-blur-xl sm:items-center sm:p-4">
            <motion.div
              initial={{ opacity: 0, y: 60, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 60, scale: 0.98 }}
              className="w-full max-w-lg overflow-hidden rounded-t-[2rem] border border-white/10 bg-[#070B16] shadow-2xl shadow-sky-950/40 sm:rounded-[2rem]"
            >
              <div className="flex items-center justify-between border-b border-white/10 p-5">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-pink-300">Seu story</p>
                  <h3 className="text-xl font-black text-white">
                    {file ? 'Prévia do story' : 'Adicionar ao story'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={closeComposer}
                  className="rounded-full bg-white/5 p-2 text-slate-300 hover:bg-white/10"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-5 p-5">
                {!file && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={openGalleryDirectly}
                        className="flex min-h-[104px] flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-center hover:bg-white/[0.09]"
                      >
                        <UploadCloud className="mb-2 text-pink-300" size={28} />
                        <span className="text-sm font-black text-white">Galeria</span>
                        <span className="mt-1 text-[11px] font-semibold text-slate-400">Foto ou vídeo</span>
                      </button>

                      <button
                        type="button"
                        onClick={openCameraDirectly}
                        className="flex min-h-[104px] flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-center hover:bg-white/[0.09]"
                      >
                        <Camera className="mb-2 text-sky-300" size={28} />
                        <span className="text-sm font-black text-white">Câmera</span>
                        <span className="mt-1 text-[11px] font-semibold text-slate-400">Capturar agora</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => hasStories && setViewerOpen(true)}
                      disabled={!hasStories}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-4 text-xs font-black uppercase tracking-widest text-white hover:bg-white/[0.09] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Eye size={17} />
                      {hasStories ? `Ver story ativo (${stories.length})` : 'Nenhum story ativo'}
                    </button>

                    {hasStories && (
                      <button
                        type="button"
                        onClick={deleteCurrentStories}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-5 py-3 text-xs font-black uppercase tracking-widest text-rose-200 hover:bg-rose-500/15"
                      >
                        <Trash2 size={15} />
                        Remover stories ativos
                      </button>
                    )}
                  </>
                )}

                {file && (
                  <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.04]">
                    <div className="relative aspect-[9/14] max-h-[360px] w-full bg-black">
                      {file.type.startsWith('video/') ? (
                        <video src={URL.createObjectURL(file)} controls playsInline className="h-full w-full object-contain" />
                      ) : (
                        <img src={URL.createObjectURL(file)} alt="Prévia do story" className="h-full w-full object-contain" />
                      )}

                      <div className="absolute left-3 top-3 rounded-full bg-black/55 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white backdrop-blur">
                        {file.type.startsWith('video/') ? (
                          <span className="inline-flex items-center gap-1"><Video size={12} /> Vídeo</span>
                        ) : (
                          <span className="inline-flex items-center gap-1"><ImageIcon size={12} /> Foto</span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3 p-4">
                      <textarea
                        value={caption}
                        onChange={(event) => setCaption(event.target.value)}
                        placeholder="Escreva uma legenda curta..."
                        rows={2}
                        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white outline-none focus:border-pink-400"
                      />

                      <div className="grid grid-cols-[0.8fr_1.2fr] gap-3">
                        <button
                          type="button"
                          onClick={openGalleryDirectly}
                          disabled={publishing}
                          className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-4 text-xs font-black uppercase tracking-widest text-white hover:bg-white/[0.09] disabled:opacity-60"
                        >
                          Trocar
                        </button>

                        <button
                          type="button"
                          onClick={publishStory}
                          disabled={publishing}
                          className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-500 via-fuchsia-500 to-orange-400 px-5 py-4 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-pink-950/30 disabled:opacity-60"
                        >
                          {publishing ? <Loader2 className="animate-spin" size={18} /> : <Send size={17} />}
                          Postar story
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <p className="text-center text-[11px] font-semibold leading-relaxed text-slate-500">
                  O story fica visível na Home e no perfil público do fisioterapeuta por 24 horas.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );

  return (
    <>
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*,video/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className={`relative inline-flex flex-col items-center gap-1.5 ${className}`}>
        <div className="relative inline-flex">
          <button
            type="button"
            onClick={openProfileAction}
            className={`relative rounded-full transition-transform hover:scale-105 ${
              isDashboardCleanAvatar
                ? 'bg-transparent p-0 shadow-none'
                : hasStories
                  ? 'bg-gradient-to-tr from-purple-700 via-rose-600 to-red-500 p-[6px] shadow-[0_0_0_3px_rgba(126,34,206,0.22),0_0_26px_rgba(244,63,94,0.55)]'
                  : 'p-0'
            }`}
            aria-label={isOwner ? 'Abrir opções do story' : 'Ver story'}
          >
            <div
              className={`${sizeClassName} overflow-hidden rounded-full ${
                isDashboardCleanAvatar
                  ? 'bg-transparent ring-0 shadow-none'
                  : 'bg-slate-900 ring-[5px] ring-[#0B1120]'
              }`}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={name || 'Fisioterapeuta'}
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="grid h-full w-full place-items-center bg-gradient-to-br from-sky-500 to-violet-500 text-sm font-black text-white">
                  {getInitials(name)}
                </div>
              )}
            </div>
          </button>

          <span className="absolute bottom-0.5 right-0.5 h-4 w-4 rounded-full border-[2px] border-[#0B1120] bg-emerald-500 shadow-lg z-10" />

          {isOwner && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                openGalleryDirectly();
              }}
              className="absolute -bottom-1.5 -right-1.5 z-20 grid h-8 w-8 place-items-center rounded-full border-[3px] border-[#0B1120] bg-white text-slate-950 shadow-xl hover:scale-110 transition-transform"
              aria-label="Adicionar story"
            >
              <Plus size={19} className="stroke-[3.2px]" />
            </button>
          )}

          {loading && (
            <span className="absolute -top-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-slate-950/80">
              <Loader2 size={12} className="animate-spin text-sky-300" />
            </span>
          )}
        </div>

        {isOwner && (
          <button
            type="button"
            onClick={openProfileAction}
            className={`ml-1 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] shadow-lg transition-transform hover:scale-105 ${
              hasStories
                ? 'border-rose-400/30 bg-rose-500/15 text-rose-100 shadow-rose-950/20'
                : 'border-sky-400/20 bg-sky-500/10 text-sky-200 shadow-sky-950/20'
            }`}
          >
            {hasStories ? 'Story ativo' : 'Adicionar story'}
          </button>
        )}
      </div>

      {isClient() ? createPortal(overlay, document.body) : null}
    </>
  );
}
