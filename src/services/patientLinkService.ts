import { supabase } from '../lib/supabase';

export interface LinkedClinicalPatient {
  id: string;
  nome_completo?: string | null;
  fisioterapeuta_id?: string | null;
  perfil_id?: string | null;
  email?: string | null;
}

/**
 * Retorna os IDs clínicos da tabela pacientes vinculados à conta do paciente.
 *
 * No FisioCareHub existem 2 identificadores:
 * - user.id / perfis.id: conta real do paciente
 * - pacientes.id: prontuário clínico usado pelo fisioterapeuta
 *
 * A área do paciente precisa consultar os dois mundos para enxergar
 * avaliações, evoluções, prescrições e documentos feitos pelo fisioterapeuta.
 */
export async function getLinkedClinicalPatients(userId: string, email?: string | null): Promise<LinkedClinicalPatient[]> {
  const normalizedEmail = email?.trim().toLowerCase();

  let query = supabase
    .from('pacientes')
    .select('id, nome_completo, fisioterapeuta_id, perfil_id, email');

  if (normalizedEmail) {
    query = query.or(`perfil_id.eq.${userId},email.eq.${normalizedEmail}`);
  } else {
    query = query.eq('perfil_id', userId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Erro ao buscar vínculos clínicos do paciente:', error);
    return [];
  }

  return data || [];
}

export async function getPatientVisibleIds(userId: string, email?: string | null): Promise<string[]> {
  const linkedPatients = await getLinkedClinicalPatients(userId, email);
  return Array.from(new Set([userId, ...linkedPatients.map((patient) => patient.id).filter(Boolean)]));
}
