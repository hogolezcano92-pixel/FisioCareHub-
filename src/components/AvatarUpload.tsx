import React, { useState, useRef } from 'react';
import { Camera, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { getSupabase } from '../lib/supabase';
import { toast } from 'sonner';

interface AvatarUploadProps {
  userId: string;
  currentAvatarUrl?: string;
  onUploadComplete: (newUrl: string) => void;
}

export default function AvatarUpload({ userId, currentAvatarUrl, onUploadComplete }: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 1. Validação de tipo (JPG ou PNG apenas)
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      setError('Por favor, selecione apenas arquivos JPG ou PNG.');
      toast.error('Tipo de arquivo não suportado.');
      return;
    }

    setError(null);
    setUploading(true);
    setProgress(0);

    try {
      // 2. Redimensionamento e Compressão
      // Opções: max 1024x1024, max 1MB
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1024,
        useWebWorker: true,
        fileType: file.type as any,
      };

      console.log('Comprimindo imagem...');
      const compressedFile = await imageCompression(file, options);
      console.log(`Imagem comprimida: de ${(file.size / 1024).toFixed(2)}KB para ${(compressedFile.size / 1024).toFixed(2)}KB`);

      // 3. Upload para Supabase Storage
      const supabase = getSupabase();
      const fileExt = file.name.split('.').pop();
      const fileName = `avatar-${userId}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      console.log('Iniciando upload para Supabase...');
      
      const { data, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, compressedFile, {
          upsert: true,
          contentType: compressedFile.type,
          // 4. Barra de progresso real
          onUploadProgress: (progressEvent: any) => {
            const percent = (progressEvent.loaded / progressEvent.total) * 100;
            setProgress(Math.round(percent));
          },
        } as any);

      if (uploadError) {
        console.error("Erro detalhado do Supabase Storage:", uploadError);
        
        if (uploadError.message === 'Bucket not found') {
          throw new Error('O bucket "avatars" não foi encontrado no seu Supabase. Por favor, crie um bucket público chamado "avatars".');
        }
        
        if (uploadError.message?.includes('row-level security') || uploadError.message?.includes('RLS')) {
          throw new Error('Erro de permissão (RLS) no bucket "avatars". Verifique as políticas de segurança no painel do Supabase.');
        }

        throw uploadError;
      }

      console.log('Upload concluído com sucesso:', data);

      // 5. Obter URL pública e atualizar
      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData?.publicUrl;
      if (!publicUrl) {
        throw new Error("Não foi possível obter a URL pública da imagem.");
      }

      // Adicionar timestamp para evitar cache do navegador
      const finalUrl = `${publicUrl}?t=${Date.now()}`;
      console.log('URL Final gerada:', finalUrl);
      
      // Atualizar metadados do usuário e tabela de perfis
      console.log('Atualizando metadados do usuário e tabela perfis...');
      
      const [authUpdate, dbUpdate] = await Promise.all([
        supabase.auth.updateUser({
          data: { avatar_url: finalUrl }
        }),
        supabase.from('perfis')
          .update({ avatar_url: finalUrl })
          .eq('id', userId)
      ]);

      if (authUpdate.error) console.warn('Erro ao atualizar metadados de auth:', authUpdate.error);
      if (dbUpdate.error) {
        console.error('Erro ao atualizar tabela perfis:', dbUpdate.error);
        throw new Error(`Erro ao salvar no banco de dados: ${dbUpdate.error.message}`);
      }

      onUploadComplete(finalUrl);
      toast.success('Foto de perfil atualizada!');
    } catch (err: any) {
      console.error('Erro completo no processo de upload:', err);
      const msg = err.message || 'Erro ao enviar a imagem.';
      setError(msg);
      toast.error(msg);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative group">
        <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white dark:border-slate-800 shadow-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
          {currentAvatarUrl ? (
            <img 
              src={currentAvatarUrl} 
              alt="Avatar" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`;
              }}
            />
          ) : (
            <Camera size={40} className="text-slate-400" />
          )}
          
          {uploading && (
            <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white backdrop-blur-sm">
              <Loader2 className="animate-spin mb-2" size={24} />
              <span className="text-xs font-bold">{progress}%</span>
            </div>
          )}
        </div>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="absolute bottom-0 right-0 p-2 bg-sky-500 hover:bg-sky-600 text-white rounded-full shadow-lg transition-all hover:scale-110 disabled:opacity-50 disabled:scale-100"
          title="Alterar foto"
        >
          <Camera size={20} />
        </button>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept=".jpg,.jpeg,.png"
        className="hidden"
      />

      {error && (
        <div className="flex items-center gap-2 text-red-500 text-sm font-medium bg-red-50 dark:bg-red-900/20 p-3 rounded-xl border border-red-100 dark:border-red-900/30">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {uploading && (
        <div className="w-full max-w-[200px] space-y-2">
          <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-sky-500 transition-all duration-300" 
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[10px] text-center text-slate-500 font-bold uppercase tracking-widest">
            Enviando... {progress}%
          </p>
        </div>
      )}
    </div>
  );
}
