import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

type DeleteReport = {
  tables: Record<string, number | 'ignored' | 'unknown'>;
  warnings: string[];
  storage: Record<string, number>;
};

const IGNORED_DB_ERROR_CODES = new Set([
  '42P01', // undefined_table
  '42703', // undefined_column
  'PGRST204',
  'PGRST116',
]);

const normalizeSupabaseUrl = (value: string): string => {
  const raw = String(value || '').trim().replace(/\/+$/, '');
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^[a-z0-9]{20}$/i.test(raw)) return `https://${raw}.supabase.co`;
  if (/^[a-z0-9-]+\.supabase\.co$/i.test(raw)) return `https://${raw}`;
  return raw;
};

const getSupabaseAdmin = (): SupabaseClient => {
  const supabaseUrl = normalizeSupabaseUrl(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://exciqetztunqgxbwwodo.supabase.co'
  );
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Configuração ausente: SUPABASE_URL/VITE_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};

const getBearerToken = (request: VercelRequest) => {
  const authHeader = request.headers.authorization || request.headers.Authorization;
  const rawHeader = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  const bearer = rawHeader?.startsWith('Bearer ') ? rawHeader.slice(7).trim() : '';
  return bearer || request.body?.accessToken || '';
};

const unique = (values: Array<string | null | undefined>) =>
  Array.from(new Set(values.filter(Boolean).map(String)));

const shouldIgnoreDbError = (error: any) => {
  if (!error) return false;
  const code = String(error.code || '');
  const message = String(error.message || '').toLowerCase();
  return (
    IGNORED_DB_ERROR_CODES.has(code) ||
    message.includes('does not exist') ||
    message.includes('could not find') ||
    message.includes('schema cache') ||
    message.includes('column') && message.includes('not found')
  );
};

async function safeDeleteIn(
  supabase: SupabaseClient,
  report: DeleteReport,
  table: string,
  column: string,
  values: string[]
) {
  const cleanValues = unique(values);
  if (!cleanValues.length) return;

  try {
    const { count, error } = await supabase
      .from(table)
      .delete({ count: 'exact' })
      .in(column, cleanValues);

    if (error) {
      if (shouldIgnoreDbError(error)) {
        report.tables[`${table}.${column}`] = 'ignored';
        return;
      }
      report.warnings.push(`${table}.${column}: ${error.message}`);
      return;
    }

    report.tables[`${table}.${column}`] = count ?? 'unknown';
  } catch (error: any) {
    if (shouldIgnoreDbError(error)) {
      report.tables[`${table}.${column}`] = 'ignored';
      return;
    }
    report.warnings.push(`${table}.${column}: ${error?.message || String(error)}`);
  }
}

async function safeSelectIds(
  supabase: SupabaseClient,
  table: string,
  idColumn: string,
  filterColumn: string,
  values: string[]
): Promise<string[]> {
  const cleanValues = unique(values);
  if (!cleanValues.length) return [];

  try {
    const { data, error } = await supabase
      .from(table)
      .select(idColumn)
      .in(filterColumn, cleanValues);

    if (error) return [];
    return unique((data || []).map((row: any) => row?.[idColumn]));
  } catch {
    return [];
  }
}

async function safeSelectPatients(supabase: SupabaseClient, userId: string) {
  const rows: any[] = [];

  for (const filter of [
    { column: 'perfil_id', values: [userId] },
    { column: 'id', values: [userId] },
    { column: 'fisioterapeuta_id', values: [userId] },
    { column: 'fisio_id', values: [userId] },
  ]) {
    try {
      const { data, error } = await supabase
        .from('pacientes')
        .select('id, perfil_id, fisioterapeuta_id, fisio_id')
        .in(filter.column, filter.values);
      if (!error && data) rows.push(...data);
    } catch {
      // tabela/coluna pode não existir em alguns ambientes
    }
  }

  const byId = new Map<string, any>();
  for (const row of rows) {
    if (row?.id) byId.set(String(row.id), row);
  }
  return Array.from(byId.values());
}

async function collectAppointmentIds(supabase: SupabaseClient, patientIds: string[], userId: string) {
  const ids: string[] = [];

  for (const filter of [
    { column: 'paciente_id', values: patientIds },
    { column: 'fisioterapeuta_id', values: [userId] },
    { column: 'fisio_id', values: [userId] },
    { column: 'profissional_id', values: [userId] },
    { column: 'user_id', values: [userId] },
  ]) {
    ids.push(...await safeSelectIds(supabase, 'agendamentos', 'id', filter.column, filter.values));
  }

  return unique(ids);
}

async function listStorageFilesRecursive(
  supabase: SupabaseClient,
  bucket: string,
  prefix = '',
  collected: string[] = []
): Promise<string[]> {
  try {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000 });
    if (error || !data) return collected;

    for (const item of data) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      const metadata = (item as any).metadata;
      const isFolder = !metadata || (item as any).id === null;
      if (isFolder) {
        await listStorageFilesRecursive(supabase, bucket, path, collected);
      } else {
        collected.push(path);
      }
    }
  } catch {
    // ignorar buckets ausentes ou sem permissão de listagem
  }
  return collected;
}

async function removeStorageForUser(
  supabase: SupabaseClient,
  report: DeleteReport,
  userId: string,
  patientIds: string[]
) {
  const buckets = ['avatars', 'documents', 'exam-files', 'fisio-stories'];
  const ids = unique([userId, ...patientIds]);

  for (const bucket of buckets) {
    const pathsToRemove = new Set<string>();

    for (const prefix of [
      userId,
      `fisioterapeutas/${userId}`,
      `pacientes/${userId}`,
      `patient-avatars/${userId}`,
      ...patientIds.map((id) => `pacientes/${id}`),
      ...patientIds.map((id) => `${userId}/pacientes/${id}`),
    ]) {
      const files = await listStorageFilesRecursive(supabase, bucket, prefix);
      files.forEach((path) => pathsToRemove.add(path));
    }

    const rootFiles = await listStorageFilesRecursive(supabase, bucket, '');
    for (const path of rootFiles) {
      if (ids.some((id) => path.includes(id))) pathsToRemove.add(path);
    }

    const paths = Array.from(pathsToRemove);
    if (!paths.length) {
      report.storage[bucket] = 0;
      continue;
    }

    try {
      const { error } = await supabase.storage.from(bucket).remove(paths);
      if (error) {
        report.warnings.push(`storage.${bucket}: ${error.message}`);
        report.storage[bucket] = 0;
      } else {
        report.storage[bucket] = paths.length;
      }
    } catch (error: any) {
      report.warnings.push(`storage.${bucket}: ${error?.message || String(error)}`);
      report.storage[bucket] = 0;
    }
  }
}

async function deleteUserDataCascade(supabase: SupabaseClient, userId: string): Promise<DeleteReport> {
  const report: DeleteReport = { tables: {}, warnings: [], storage: {} };

  const patientRows = await safeSelectPatients(supabase, userId);
  const patientIds = unique([
    userId,
    ...patientRows.map((row) => row.id),
    ...patientRows.map((row) => row.perfil_id),
  ]);
  const appointmentIds = await collectAppointmentIds(supabase, patientIds, userId);
  const protocolIds = unique([
    ...await safeSelectIds(supabase, 'protocolos_prescricao', 'id', 'paciente_id', patientIds),
    ...await safeSelectIds(supabase, 'protocolos_prescricao', 'id', 'fisioterapeuta_id', [userId]),
    ...await safeSelectIds(supabase, 'protocolos_prescricao', 'id', 'fisio_id', [userId]),
  ]);
  const ticketIds = unique([
    ...await safeSelectIds(supabase, 'suporte_tickets', 'id', 'usuario_id', [userId]),
    ...await safeSelectIds(supabase, 'suporte_tickets', 'id', 'user_id', [userId]),
    ...await safeSelectIds(supabase, 'suporte_tickets', 'id', 'paciente_id', patientIds),
  ]);
  const storyIds = unique([
    ...await safeSelectIds(supabase, 'fisio_stories', 'id', 'user_id', [userId]),
    ...await safeSelectIds(supabase, 'fisio_stories', 'id', 'fisioterapeuta_id', [userId]),
  ]);

  await removeStorageForUser(supabase, report, userId, patientIds);

  for (const table of ['protocolo_itens']) {
    await safeDeleteIn(supabase, report, table, 'protocolo_id', protocolIds);
  }

  for (const table of ['mensagens']) {
    await safeDeleteIn(supabase, report, table, 'ticket_id', ticketIds);
    await safeDeleteIn(supabase, report, table, 'remetente_id', [userId]);
    await safeDeleteIn(supabase, report, table, 'destinatario_id', [userId]);
    await safeDeleteIn(supabase, report, table, 'user_id', [userId]);
  }

  for (const table of ['fisio_story_events']) {
    await safeDeleteIn(supabase, report, table, 'story_id', storyIds);
    await safeDeleteIn(supabase, report, table, 'user_id', [userId]);
  }

  for (const table of [
    'checklist_exercicios',
    'diario_dor',
    'registros_paciente',
    'exercicios_paciente',
    'evolucoes',
    'arquivos_paciente',
    'triagens',
    'prontuarios',
    'avaliacoes',
    'documentos_gerados',
    'fichas_avaliacao',
    'sessoes',
    'patient_exercises',
    'exam_analyses',
    'soap_notes',
    'material_purchases',
    'solicitacoes_atendimento',
    'video_calls',
    'protocolos_prescricao',
  ]) {
    await safeDeleteIn(supabase, report, table, 'paciente_id', patientIds);
    await safeDeleteIn(supabase, report, table, 'patient_id', patientIds);
  }

  for (const table of [
    'configuracao_servicos',
    'service_packages',
    'opcoes_precos',
    'servicos_fisio',
    'physiotherapist_services',
    'physio_availability_rules',
    'physio_schedule_blocks',
    'solicitacoes_saque',
    'clinical_updates',
    'protocolos_prescricao',
    'exercicios_paciente',
    'evolucoes',
    'documentos_gerados',
    'fichas_avaliacao',
    'prontuarios',
    'sessoes',
    'soap_notes',
    'fisio_stories',
  ]) {
    await safeDeleteIn(supabase, report, table, 'fisioterapeuta_id', [userId]);
    await safeDeleteIn(supabase, report, table, 'fisio_id', [userId]);
    await safeDeleteIn(supabase, report, table, 'profissional_id', [userId]);
  }

  for (const table of [
    'webauthn_credentials',
    'assinaturas',
    'payment_methods',
    'pagamentos',
    'material_purchases',
    'notificacoes',
    'notificacoes_admin',
    'historico_atividades',
    'suporte_tickets',
    'interesses_solicitacao',
    'fisio_story_events',
    'fisio_stories',
    'exam_analyses',
    'clinical_updates',
  ]) {
    await safeDeleteIn(supabase, report, table, 'usuario_id', [userId]);
    await safeDeleteIn(supabase, report, table, 'user_id', [userId]);
    await safeDeleteIn(supabase, report, table, 'perfil_id', [userId]);
    await safeDeleteIn(supabase, report, table, 'created_by', [userId]);
    await safeDeleteIn(supabase, report, table, 'remetente_id', [userId]);
    await safeDeleteIn(supabase, report, table, 'destinatario_id', [userId]);
  }

  await safeDeleteIn(supabase, report, 'pagamentos', 'agendamento_id', appointmentIds);
  await safeDeleteIn(supabase, report, 'pagamentos', 'external_reference', appointmentIds);
  await safeDeleteIn(supabase, report, 'notificacoes', 'referencia_id', unique([...patientIds, ...appointmentIds]));
  await safeDeleteIn(supabase, report, 'historico_atividades', 'referencia_id', unique([...patientIds, ...appointmentIds]));

  await safeDeleteIn(supabase, report, 'agendamentos', 'id', appointmentIds);
  await safeDeleteIn(supabase, report, 'agendamentos', 'paciente_id', patientIds);
  await safeDeleteIn(supabase, report, 'agendamentos', 'fisioterapeuta_id', [userId]);
  await safeDeleteIn(supabase, report, 'agendamentos', 'fisio_id', [userId]);

  await safeDeleteIn(supabase, report, 'pacientes', 'id', patientRows.map((row) => row.id));
  await safeDeleteIn(supabase, report, 'pacientes', 'perfil_id', [userId]);
  await safeDeleteIn(supabase, report, 'pacientes', 'fisioterapeuta_id', [userId]);
  await safeDeleteIn(supabase, report, 'pacientes', 'fisio_id', [userId]);

  await safeDeleteIn(supabase, report, 'profiles', 'id', [userId]);
  await safeDeleteIn(supabase, report, 'perfis', 'id', [userId]);

  return report;
}


export default async function handler(request: VercelRequest, response: VercelResponse) {
  console.log('[FUNCTION START] /api/admin/delete-user');

  if (request.method !== 'POST') {
    return response.status(405).json({ success: false, error: 'Method Not Allowed. Use POST.' });
  }

  try {
    const accessToken = getBearerToken(request);
    if (!accessToken) {
      return response.status(401).json({ success: false, error: 'Sessão ausente. Faça login novamente.' });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data: { user: requester }, error: authError } = await supabaseAdmin.auth.getUser(accessToken);

    if (authError || !requester) {
      return response.status(401).json({ success: false, error: 'Sessão inválida ou expirada. Faça login novamente.' });
    }

    const requestedUserId = String(request.body?.userId || requester.id);

    const { data: profile } = await supabaseAdmin
      .from('perfis')
      .select('tipo_usuario, role, plano')
      .eq('id', requester.id)
      .maybeSingle();

    const isAdmin =
      profile?.tipo_usuario === 'admin' ||
      profile?.role === 'admin' ||
      profile?.plano === 'admin' ||
      requester.email?.toLowerCase() === 'hogolezcano92@gmail.com';

    const isSelfDelete = requestedUserId === requester.id;

    if (!isAdmin && !isSelfDelete) {
      return response.status(403).json({
        success: false,
        error: 'Acesso negado. Usuário comum só pode apagar a própria conta.',
      });
    }

    console.log(`[Delete User] target=${requestedUserId}; requestedBy=${requester.email}; mode=${isSelfDelete ? 'self' : 'admin'}`);

    const report = await deleteUserDataCascade(supabaseAdmin, requestedUserId);

    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(requestedUserId, false as any);
    if (authDeleteError) {
      return response.status(500).json({
        success: false,
        error: `Os dados foram processados, mas a conta Auth não foi apagada: ${authDeleteError.message}`,
        report,
      });
    }

    return response.status(200).json({
      success: true,
      message: isSelfDelete
        ? 'Sua conta e todos os dados vinculados foram apagados permanentemente.'
        : 'Usuário e dados vinculados apagados permanentemente.',
      deletedUserId: requestedUserId,
      mode: isSelfDelete ? 'self' : 'admin',
      report,
    });
  } catch (error: any) {
    console.error('[delete-user] Fatal error:', error);
    return response.status(500).json({
      success: false,
      error: error?.message || 'Erro fatal ao apagar usuário.',
    });
  }
}
