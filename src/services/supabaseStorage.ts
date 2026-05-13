import { getSupabase } from '../lib/supabase';

export interface UploadProgress {
  progress: number;
}

const AVATARS_BUCKET = 'avatars';
const DOCUMENTS_BUCKET = 'documents';

const sanitizeFileName = (fileName: string) => {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
};

const normalizeDocumentPath = (path: string) => {
  if (!path) return path;
  return path.replace(/^documents\//, '');
};

export const uploadProfilePhoto = async (
  userId: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> => {
  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const fileName = `avatar-${userId}.${fileExt}`;
  const bucket = AVATARS_BUCKET;

  if (!file.type.startsWith('image/')) {
    throw new Error('O arquivo deve ser uma imagem.');
  }

  const supabase = getSupabase();
  console.log(`Tentando upload para o bucket "${bucket}"...`);

  onProgress?.(10);

  const { error } = await supabase.storage
    .from(bucket)
    .upload(fileName, file, {
      upsert: true,
      contentType: file.type,
      cacheControl: '3600',
    });

  if (error) {
    console.error('Erro retornado pelo Supabase Storage:', error);

    if (error.message === 'Load failed' || error.message?.includes('fetch')) {
      throw new Error('Falha na conexão com o Supabase. Verifique sua internet.');
    }

    if (error.message === 'Bucket not found') {
      throw new Error(`O bucket "${bucket}" não foi encontrado. Acesse o painel do Supabase > Storage e crie um bucket público chamado "${bucket}".`);
    }

    if (error.message?.includes('row-level security') || error.message?.includes('RLS')) {
      throw new Error(`Erro de permissão (RLS) no bucket "${bucket}". No painel do Supabase > Storage > Policies, adicione uma política permitindo INSERT e SELECT para usuários autenticados.`);
    }

    throw error;
  }

  onProgress?.(80);

  const { data: publicUrlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(fileName);

  if (!publicUrlData || !publicUrlData.publicUrl) {
    throw new Error('Não foi possível obter a URL pública da imagem.');
  }

  onProgress?.(100);

  return publicUrlData.publicUrl;
};

export const uploadDocument = async (
  userId: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> => {
  const safeName = sanitizeFileName(file.name);
  const fileName = `${Date.now()}-${safeName}`;
  const path = `fisioterapeutas/${userId}/${fileName}`;
  const bucket = DOCUMENTS_BUCKET;

  const supabase = getSupabase();
  console.log(`Tentando upload de documento para o bucket "${bucket}" no caminho "${path}"...`);

  onProgress?.(10);

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      upsert: true,
      contentType: file.type,
    });

  if (error) {
    console.error('Erro no upload de documento Supabase:', error);

    if (error.message === 'Load failed' || error.message?.includes('fetch')) {
      throw new Error('Falha na conexão com o Supabase.');
    }

    if (error.message === 'Bucket not found') {
      throw new Error(`O bucket "${bucket}" não foi encontrado. Acesse o painel do Supabase > Storage e crie um bucket chamado "${bucket}".`);
    }

    if (error.message?.includes('row-level security') || error.message?.includes('RLS')) {
      throw new Error(`Erro de permissão (RLS) no bucket "${bucket}". No painel do Supabase > Storage > Policies, verifique se usuários autenticados podem fazer upload e leitura dos próprios documentos.`);
    }

    throw error;
  }

  onProgress?.(100);

  // Como o bucket documents é privado, retornamos o PATH.
  // Depois, para visualizar, gere uma signed URL com getPrivateDocumentUrl().
  return path;
};

export const uploadPhysioDocument = async (
  userId: string,
  file: File,
  documentType: 'rg_frente' | 'rg_verso' | 'crefito_frente' | 'crefito_verso'
): Promise<string> => {
  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'bin';
  const fileName = `${documentType}.${fileExt}`;
  const path = `fisioterapeutas/${userId}/${fileName}`;
  const bucket = DOCUMENTS_BUCKET;

  const supabase = getSupabase();
  console.log(`Tentando upload de documento fisioterapeuta para o bucket "${bucket}" no caminho "${path}"...`);

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      upsert: true,
      contentType: file.type,
    });

  if (error) {
    console.error('Erro no upload de documento fisioterapeuta Supabase:', error);

    if (error.message === 'Load failed' || error.message?.includes('fetch')) {
      throw new Error('Falha na conexão com o Supabase.');
    }

    if (error.message === 'Bucket not found') {
      throw new Error(`O bucket "${bucket}" não foi encontrado. Certifique-se de que o bucket "${bucket}" existe no Storage.`);
    }

    if (error.message?.includes('row-level security') || error.message?.includes('RLS')) {
      throw new Error(`Erro de permissão (RLS) no bucket "${bucket}". Verifique as policies do Storage para usuários autenticados.`);
    }

    throw error;
  }

  // Como o bucket documents é privado, retornamos o PATH.
  // Depois, para visualizar, gere uma signed URL com getPrivateDocumentUrl().
  return path;
};

export const getPrivateDocumentUrl = async (
  path: string,
  expiresIn: number = 3600
): Promise<string> => {
  const bucket = DOCUMENTS_BUCKET;
  const normalizedPath = normalizeDocumentPath(path);
  const supabase = getSupabase();

  if (!normalizedPath) {
    throw new Error('Caminho do documento inválido.');
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(normalizedPath, expiresIn);

  if (error) {
    console.error('Erro ao gerar signed URL do documento:', error);

    if (error.message === 'Object not found') {
      throw new Error('Documento não encontrado no Storage.');
    }

    if (error.message?.includes('row-level security') || error.message?.includes('RLS')) {
      throw new Error('Sem permissão para visualizar este documento.');
    }

    throw error;
  }

  if (!data?.signedUrl) {
    throw new Error('Não foi possível gerar a URL temporária do documento.');
  }

  return data.signedUrl;
};

export const checkBuckets = async (): Promise<{ avatars: boolean; documents: boolean; physioDocs: boolean }> => {
  const supabase = getSupabase();
  const { data: buckets, error } = await supabase.storage.listBuckets();

  if (error) {
    console.error('Erro ao listar buckets:', error);
    throw error;
  }

  const avatarsExists = buckets.some(b => b.name === AVATARS_BUCKET);
  const documentsExists = buckets.some(b => b.name === DOCUMENTS_BUCKET);

  return {
    avatars: avatarsExists,
    documents: documentsExists,
    physioDocs: documentsExists,
  };
};
