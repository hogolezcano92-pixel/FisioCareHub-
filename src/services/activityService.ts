import { supabase } from '../lib/supabase';

export type ActivityUserType = 'paciente' | 'fisio' | 'admin' | 'sistema';

export type ActivityType =
  | 'agendamento_criado'
  | 'agendamento_concluido'
  | 'agendamento_cancelado'
  | 'agendamento_excluido'
  | 'agendamento_atualizado'
  | 'avaliacao_enviada'
  | 'avaliacao_recebida'
  | 'perfil_atualizado'
  | 'mensagem_recebida'
  | 'mensagem_enviada'
  | 'triagem_realizada'
  | 'solicitacao_atendimento_criada'
  | 'solicitacao_atendimento_atualizada'
  | 'login'
  | 'logout'
  | 'prontuario_criado'
  | 'prontuario_editado'
  | 'prontuario_acessado'
  | 'evolucao_registrada'
  | 'diario_dor_registrado'
  | 'checkin_registrado'
  | 'exercicio_prescrito'
  | 'exercicio_concluido'
  | 'exercicio_desmarcado'
  | 'documento_gerado'
  | 'documento_assinado'
  | 'arquivo_enviado'
  | 'exclusao_registro'
  | 'pagamento_realizado'
  | 'pagamento_confirmado'
  | 'saque_solicitado'
  | 'plano_alterado'
  | 'upload_arquivo'
  | 'erro_sistema'
  | 'acao_suspicia'
  | 'admin_action'
  | 'suspensao_usuario';

export interface LogDetails {
  ip?: string;
  userAgent?: string;
  oldValue?: any;
  newValue?: any;
  metadata?: any;
  targetType?: string;
  source?: string;
  [key: string]: any;
}

export const getActivityUserType = (tipoUsuario?: string | null): ActivityUserType => {
  const value = String(tipoUsuario || '').toLowerCase();
  if (value.includes('fisio')) return 'fisio';
  if (value.includes('admin')) return 'admin';
  if (value.includes('paciente')) return 'paciente';
  return 'sistema';
};

const normalizeReferenceId = (referenceId?: string | number | null) => {
  if (referenceId === undefined || referenceId === null) return null;
  return String(referenceId);
};

const buildActivityPayload = (
  userId: string,
  userType: ActivityUserType,
  action: ActivityType,
  description: string,
  referenceId?: string | number | null,
  details?: LogDetails
) => ({
  usuario_id: userId,
  tipo_usuario: userType,
  tipo_acao: action,
  descricao: description,
  referencia_id: normalizeReferenceId(referenceId),
  detalhes: details || {},
  ip_address: details?.ip || null,
});

export const logActivity = async (
  userId: string | null | undefined,
  userType: ActivityUserType,
  action: ActivityType,
  description: string,
  referenceId?: string | number | null,
  details?: LogDetails
) => {
  if (!userId) return;

  const payload = buildActivityPayload(userId, userType, action, description, referenceId, details);

  try {
    const { error } = await supabase.from('historico_atividades').insert(payload);

    if (!error) return;

    // Fallback para instalações antigas da tabela sem tipo_usuario/detalhes/ip_address.
    const fallbackPayload = {
      usuario_id: payload.usuario_id,
      tipo_acao: payload.tipo_acao,
      descricao: payload.descricao,
      referencia_id: payload.referencia_id,
    };

    const { error: fallbackError } = await supabase.from('historico_atividades').insert(fallbackPayload);
    if (fallbackError) throw fallbackError;
  } catch (err) {
    console.error('[activityService] Erro ao logar atividade:', err);
  }
};

export const logActivities = async (
  activities: Array<{
    userId?: string | null;
    userType: ActivityUserType;
    action: ActivityType;
    description: string;
    referenceId?: string | number | null;
    details?: LogDetails;
  }>
) => {
  const validActivities = activities.filter((activity) => activity.userId);
  await Promise.all(
    validActivities.map((activity) =>
      logActivity(
        activity.userId,
        activity.userType,
        activity.action,
        activity.description,
        activity.referenceId,
        activity.details,
      )
    )
  );
};

export const logPatientAndPhysioActivity = async ({
  patientId,
  physioId,
  patientDescription,
  physioDescription,
  action,
  referenceId,
  details,
}: {
  patientId?: string | null;
  physioId?: string | null;
  patientDescription: string;
  physioDescription: string;
  action: ActivityType;
  referenceId?: string | number | null;
  details?: LogDetails;
}) => {
  await logActivities([
    {
      userId: patientId,
      userType: 'paciente',
      action,
      description: patientDescription,
      referenceId,
      details,
    },
    {
      userId: physioId,
      userType: 'fisio',
      action,
      description: physioDescription,
      referenceId,
      details,
    },
  ]);
};
