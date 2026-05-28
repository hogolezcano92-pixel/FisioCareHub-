import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { Camera, Image as ImageIcon, Loader2, Plus, Video, X } from 'lucide-react';
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

export default function StoryAvatar({
  physioId,
  name,
  avatarUrl,
  sizeClassName = 'w-16 h-16',
  className = '',
}: StoryAvatarProps) {
  const { user } = useAuth();
  const [stories, setStories] = useState<FisioStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');

  const isOwner = user?.id === physioId;
  const hasStories = stories.length > 0;

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

  const handleAvatarClick = () => {
    if (hasStories) {
      setViewerOpen(true);
      return;
    }

    if (isOwner) {
      setCreatorOpen(true);
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] || null;
    setFile(nextFile);
  };

  const publishStory = async () => {
    if (!isOwner) return;

    if (!file) {
      toast.error('Selecione uma imagem ou vídeo para publicar.');
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
      setFile(null);
      setCaption('');
      setCreatorOpen(false);
      await loadStories();
      setViewerOpen(true);
    } catch (error: any) {
      console.error('[StoryAvatar] Erro ao publicar story:', error);
      toast.error(error?.message || 'Erro ao publicar story.');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <>
      <div className={`relative inline-flex ${className}`}>
        <button
          type="button"
          onClick={handleAvatarClick}
          className={`relative rounded-full ${hasStories ? 'bg-gradient-to-tr from-sky-400 via-violet-500 to-fuchsia-500 p-[3px]' : 'p-0'} transition-transform hover:scale-105`}
          aria-label={hasStories ? 'Ver FisioStories' : 'Criar FisioStory'}
        >
          <div className={`${sizeClassName} overflow-hidden rounded-full bg-slate-900 ring-4 ring-slate-950/50`}>
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

        <div className="absolute bottom-0.5 right-0.5 h-4 w-4 rounded-full border-[2px] border-[#0B1120] bg-emerald-500 shadow-lg z-10" />

        {isOwner && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setCreatorOpen(true);
            }}
            className="absolute -bottom-1 -right-1 z-20 grid h-7 w-7 place-items-center rounded-full border-2 border-[#0B1120] bg-white text-slate-950 shadow-xl hover:scale-110 transition-transform"
            aria-label="Adicionar story"
          >
            <Plus size={18} className="stroke-[3px]" />
          </button>
        )}

        {loading && (
          <span className="absolute -top-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-slate-950/80">
            <Loader2 size={12} className="animate-spin text-sky-300" />
          </span>
        )}
      </div>

      {viewerOpen && storyGroups.length > 0 && (
        <StoryViewer groups={storyGroups} initialGroupIndex={0} onClose={() => setViewerOpen(false)} />
      )}

      <AnimatePresence>
        {creatorOpen && (
          <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 20 }}
              className="w-full max-w-md overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 shadow-2xl shadow-sky-950/40"
            >
              <div className="flex items-center justify-between border-b border-white/10 p-5">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-sky-300">FisioStory</p>
                  <h3 className="text-xl font-black text-white">Publicar foto ou vídeo</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setCreatorOpen(false)}
                  className="rounded-full bg-white/5 p-2 text-slate-300 hover:bg-white/10"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4 p-5">
                <label className="flex min-h-[150px] cursor-pointer flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-sky-400/30 bg-sky-500/10 p-5 text-center hover:bg-sky-500/15">
                  {file?.type.startsWith('video/') ? (
                    <Video className="mb-3 text-sky-300" size={32} />
                  ) : (
                    <ImageIcon className="mb-3 text-sky-300" size={32} />
                  )}
                  <span className="text-sm font-black text-white">
                    {file ? file.name : 'Selecionar imagem ou vídeo'}
                  </span>
                  <span className="mt-1 text-xs font-semibold text-slate-400">
                    Imagem até 15 MB · Vídeo até 80 MB
                  </span>
                  <input type="file" accept="image/*,video/*" className="hidden" onChange={handleFileChange} />
                </label>

                <textarea
                  value={caption}
                  onChange={(event) => setCaption(event.target.value)}
                  placeholder="Legenda curta, dica, agenda disponível..."
                  rows={3}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white outline-none focus:border-sky-400"
                />

                <button
                  type="button"
                  onClick={publishStory}
                  disabled={publishing}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-violet-500 px-5 py-4 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-sky-950/30 disabled:opacity-60"
                >
                  {publishing ? <Loader2 className="animate-spin" size={18} /> : <Camera size={17} />}
                  Publicar Story
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
