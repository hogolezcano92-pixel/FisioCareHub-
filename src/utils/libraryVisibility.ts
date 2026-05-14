export type LibraryMaterialLike = Record<string, any>;

const normalize = (value: unknown) => String(value ?? '').trim().toLowerCase();

const truthy = (value: unknown) => {
  if (typeof value === 'boolean') return value;
  const text = normalize(value);
  return ['true', '1', 'sim', 'yes', 'ativo', 'active', 'publicado', 'published'].includes(text);
};

const falsy = (value: unknown) => {
  if (typeof value === 'boolean') return !value;
  const text = normalize(value);
  return ['false', '0', 'nao', 'não', 'no', 'inativo', 'inactive', 'oculto', 'hidden', 'arquivado', 'archived'].includes(text);
};

export const isPatientVisibleLibraryMaterial = (material: LibraryMaterialLike) => {
  if (!material) return false;

  const source = normalize(material.source || material.origem || material.created_by || material.created_by_type);
  const generatedByAI = Boolean(material.generated_by_ai || material.ai_generated || material.is_ai_generated)
    || ['ai', 'ia', 'groq', 'gemini', 'openai', 'kineai'].includes(source);

  if (generatedByAI) return false;

  const status = normalize(material.status || material.publication_status || material.visibility);

  if (status) {
    return ['publicado', 'published', 'ativo', 'active'].includes(status);
  }

  if ('is_published' in material) return truthy(material.is_published);
  if ('published' in material) return truthy(material.published);
  if ('ativo' in material) return truthy(material.ativo);
  if ('is_active' in material) return truthy(material.is_active);
  if ('active' in material) return truthy(material.active);

  if ('oculto' in material && truthy(material.oculto)) return false;
  if ('hidden' in material && truthy(material.hidden)) return false;
  if ('archived' in material && truthy(material.archived)) return false;
  if ('is_active' in material && falsy(material.is_active)) return false;

  return true;
};

export const sortLibraryMaterialsByTitle = <T extends LibraryMaterialLike>(materials: T[] = []) => {
  return [...materials].sort((a, b) =>
    String(a.title || '').localeCompare(String(b.title || ''), 'pt-BR', { sensitivity: 'base' })
  );
};

export const filterPatientVisibleLibraryMaterials = <T extends LibraryMaterialLike>(materials: T[] = []) => {
  return sortLibraryMaterialsByTitle(materials.filter(isPatientVisibleLibraryMaterial));
};
