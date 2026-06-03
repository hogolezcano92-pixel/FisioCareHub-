import { supabase } from '../lib/supabase';

export interface LinkedClinicalPatient {
  id: string;
  nome_completo?: string | null;
  fisioterapeuta_id?: string | null;
  perfil_id?: string | null;
  email?: string | null;
  convite_email?: string | null;
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

  // Mantém a busca simples e segura, mas considera os dois vínculos reais usados no app:
  // 1) pacientes.perfil_id apontando para perfis.id/auth.uid()
  // 2) pacientes.email igual ao e-mail da conta do paciente
  // Também aceitamos pacientes.id = userId para cobrir cadastros antigos/inconsistentes.
  let query = supabase
    .from('pacientes')
    .select('id, nome_completo, fisioterapeuta_id, perfil_id, email, convite_email');

  if (normalizedEmail) {
    query = query.or(`perfil_id.eq.${userId},id.eq.${userId},email.ilike.${normalizedEmail},convite_email.ilike.${normalizedEmail}`);
  } else {
    query = query.or(`perfil_id.eq.${userId},id.eq.${userId}`);
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
  return Array.from(
    new Set(
      [
        userId,
        ...linkedPatients
          .flatMap((patient) => [patient.id, patient.perfil_id])
          .filter(Boolean),
      ].map(String),
    ),
  );
}
