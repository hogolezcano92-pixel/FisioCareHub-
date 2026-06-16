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


export async function getPhysioLinkedClinicalPatients(physioId: string): Promise<LinkedClinicalPatient[]> {
  const { data: patients, error } = await supabase
    .from('pacientes')
    .select('id, nome_completo, fisioterapeuta_id, perfil_id, email, convite_email')
    .eq('fisioterapeuta_id', physioId);

  if (error) {
    console.error('Erro ao buscar pacientes vinculados ao fisioterapeuta:', error);
    return [];
  }

  return patients || [];
}

export async function getPhysioVisiblePatientIds(physioId: string): Promise<string[]> {
  const linkedPatients = await getPhysioLinkedClinicalPatients(physioId);
  const ids = new Set<string>();

  linkedPatients.forEach((patient) => {
    if (patient.id) ids.add(String(patient.id));
    if (patient.perfil_id) ids.add(String(patient.perfil_id));
  });

  const patientEmails = Array.from(
    new Set(
      linkedPatients
        .flatMap((patient) => [patient.email, patient.convite_email])
        .map((email) => String(email || '').trim().toLowerCase())
        .filter(Boolean),
    ),
  );

  if (patientEmails.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from('perfis')
      .select('id, email')
      .in('email', patientEmails);

    if (!profilesError) {
      (profiles || []).forEach((profile) => {
        if (profile.id) ids.add(String(profile.id));
      });
    }
  }

  const { data: appointments, error: appointmentsError } = await supabase
    .from('agendamentos')
    .select('paciente_id')
    .eq('fisio_id', physioId);

  if (!appointmentsError) {
    (appointments || []).forEach((appointment) => {
      if (appointment.paciente_id) ids.add(String(appointment.paciente_id));
    });
  }

  return Array.from(ids);
}
