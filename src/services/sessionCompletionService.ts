import { supabase } from '../lib/supabase';

export type SessionCompletionStatus =
  | 'confirmado'
  | 'aguardando_confirmacao_paciente'
  | 'concluido'
  | 'em_disputa'
  | 'cancelado';

const optionalColumnError = (error: any) => {
  const message = String(error?.message || '').toLowerCase();
  const details = String(error?.details || '').toLowerCase();
  const code = String(error?.code || '').toLowerCase();
  return code === '42703'
    || message.includes('column')
    || message.includes('schema cache')
    || details.includes('column')
    || details.includes('schema cache');
};

const updateAppointmentWithFallback = async (appointmentId: string, primaryPayload: Record<string, any>, fallbackPayload: Record<string, any>) => {
  let { error } = await supabase
    .from('agendamentos')
    .update(primaryPayload)
    .eq('id', appointmentId);

  if (error && optionalColumnError(error)) {
    const fallback = await supabase
      .from('agendamentos')
      .update(fallbackPayload)
      .eq('id', appointmentId);
    error = fallback.error;
  }

  if (error) throw error;
};

const updateSessionsWithFallback = async (appointmentId: string, primaryPayload: Record<string, any>, fallbackPayload: Record<string, any>) => {
  let { error } = await supabase
    .from('sessoes')
    .update(primaryPayload)
    .eq('agendamento_id', appointmentId);

  if (error && optionalColumnError(error)) {
    const fallback = await supabase
      .from('sessoes')
      .update(fallbackPayload)
      .eq('agendamento_id', appointmentId);
    error = fallback.error;
  }

  if (error) {
    console.warn('Não foi possível atualizar a tabela sessoes para o agendamento:', appointmentId, error);
  }
};

export const markAppointmentAsPerformed = async (appointmentId: string) => {
  const now = new Date().toISOString();

  await updateAppointmentWithFallback(
    appointmentId,
    {
      status: 'aguardando_confirmacao_paciente',
      fisioterapeuta_marcou_realizado_em: now,
      updated_at: now,
    },
    { status: 'aguardando_confirmacao_paciente' }
  );

  await updateSessionsWithFallback(
    appointmentId,
    {
      status_atendimento: 'aguardando_confirmacao_paciente',
      marcado_realizado_em: now,
      status_repasse: 'pendente',
    },
    { status_repasse: 'pendente' }
  );

  return now;
};

export const confirmAppointmentAsPatient = async (appointmentId: string) => {
  const now = new Date().toISOString();

  await updateAppointmentWithFallback(
    appointmentId,
    {
      status: 'concluido',
      concluido_em: now,
      paciente_confirmou_realizacao_em: now,
      repasse_liberado_em: now,
      updated_at: now,
    },
    { status: 'concluido' }
  );

  await updateSessionsWithFallback(
    appointmentId,
    {
      status_atendimento: 'concluido',
      confirmado_paciente_em: now,
      status_repasse: 'liberado',
    },
    { status_repasse: 'liberado' }
  );

  return now;
};

export const disputeAppointmentAsPatient = async (appointmentId: string, reason?: string) => {
  const now = new Date().toISOString();
  const contestReason = reason?.trim() || 'Paciente contestou a realização da sessão.';

  await updateAppointmentWithFallback(
    appointmentId,
    {
      status: 'em_disputa',
      paciente_contestou_em: now,
      contestacao_motivo: contestReason,
      updated_at: now,
    },
    { status: 'em_disputa' }
  );

  await updateSessionsWithFallback(
    appointmentId,
    {
      status_atendimento: 'em_disputa',
      contestado_em: now,
      status_repasse: 'bloqueado',
    },
    { status_repasse: 'bloqueado' }
  );

  return now;
};

export const getCompletionLabel = (status: string) => {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'aguardando_confirmacao_paciente') return 'Aguardando confirmação do paciente';
  if (normalized === 'em_disputa') return 'Em disputa';
  if (normalized === 'concluido' || normalized === 'realizado') return 'Concluído';
  return null;
};
