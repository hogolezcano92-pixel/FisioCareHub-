import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase: any = createClient<any>(supabaseUrl, supabaseKey);

const APP_URL = (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.VITE_APP_URL || 'https://fisiocarehub.company').replace(/\/$/, '');
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const RESEND_FROM = process.env.RESEND_FROM || 'FisioCareHub <onboarding@resend.dev>';

const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const formatDateBR = (value: any) => {
  if (!value) return 'Data não informada';

  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleDateString('pt-BR');
  }

  return String(value);
};

const formatTimeBR = (appointment: any) => {
  if (appointment?.hora) return String(appointment.hora).slice(0, 5);

  const source = appointment?.data_servico || appointment?.data;
  if (!source) return 'Horário não informado';

  const date = new Date(source);
  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  return 'Horário não informado';
};

const formatMoneyBR = (value: any) => {
  const amount = Number(value || 0);
  return amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const getAppointmentDate = (appointment: any) => appointment?.data_servico || appointment?.data || appointment?.created_at;

const buildEmailLayout = (title: string, content: string) => `
  <div style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#1e293b;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#f8fafc;">
      <tr>
        <td align="center" style="padding:28px 14px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;border-collapse:collapse;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e2e8f0;">
            <tr>
              <td style="background:#0f172a;padding:26px 24px;text-align:center;">
                <h1 style="margin:0;color:#38bdf8;font-size:28px;line-height:34px;font-weight:900;">FisioCareHub</h1>
                <p style="margin:8px 0 0;color:#cbd5e1;font-size:13px;letter-spacing:.08em;text-transform:uppercase;">Reabilitação & Performance</p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 24px;">
                <h2 style="margin:0 0 18px;color:#0f172a;font-size:24px;line-height:30px;">${escapeHtml(title)}</h2>
                ${content}
              </td>
            </tr>
            <tr>
              <td style="background:#f1f5f9;padding:18px 24px;text-align:center;color:#64748b;font-size:12px;line-height:18px;">
                Documento automático gerado pelo FisioCareHub.<br/>
                Suporte: suporte@fisiocarehub.company
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>
`;

const sendEmail = async (to: string | null | undefined, subject: string, html: string) => {
  if (!to) {
    console.warn('[Asaas Webhook] E-mail não enviado: destinatário vazio.');
    return { ok: false, reason: 'missing_to' };
  }

  if (!RESEND_API_KEY) {
    console.warn('[Asaas Webhook] RESEND_API_KEY ausente na Vercel. Notificação interna foi criada, mas e-mail real não foi enviado.');
    return { ok: false, reason: 'missing_resend_key' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to,
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('[Asaas Webhook] Erro Resend:', text);
      return { ok: false, reason: text };
    }

    return { ok: true };
  } catch (error) {
    console.error('[Asaas Webhook] Falha ao enviar e-mail:', error);
    return { ok: false, reason: error };
  }
};

const getProfilesForAppointment = async (appointment: any) => {
  const patientId = appointment?.paciente_id;
  const physioId = appointment?.fisio_id || appointment?.fisioterapeuta_id;

  const ids = [patientId, physioId].filter(Boolean).map(String);

  if (ids.length === 0) {
    return { patient: null, physio: null };
  }

  const { data, error } = await supabase
    .from('perfis')
    .select('id, nome_completo, email, telefone')
    .in('id', ids);

  if (error) {
    console.error('[Asaas Webhook] Erro ao buscar perfis:', error);
  }

  const profiles = Array.isArray(data) ? data : [];
  const findProfile = (id: any) => profiles.find((p: any) => String(p.id) === String(id)) || null;

  return {
    patient: findProfile(patientId),
    physio: findProfile(physioId),
  };
};

const ensureClinicalPatientForAppointment = async (appointment: any) => {
  const patientProfileId = appointment.paciente_id;
  const physioId = appointment.fisio_id || appointment.fisioterapeuta_id;

  if (!patientProfileId || !physioId) {
    console.warn('[Asaas Webhook] Sem paciente_id ou fisio_id no agendamento:', appointment?.id);
    return null;
  }

  const { data: existingPatient, error: existingError } = await supabase
    .from('pacientes')
    .select('id')
    .eq('perfil_id', patientProfileId)
    .eq('fisioterapeuta_id', physioId)
    .maybeSingle();

  if (existingError) {
    console.error('[Asaas Webhook] Erro ao buscar paciente clínico vinculado:', existingError);
  }

  if (existingPatient?.id) {
    return existingPatient.id;
  }

  const { data: profile } = await supabase
    .from('perfis')
    .select('id, nome_completo, email, telefone, data_nascimento, avatar_url, foto_url')
    .eq('id', patientProfileId)
    .maybeSingle();

  const { data: createdPatient, error: createError } = await supabase
    .from('pacientes')
    .insert({
      perfil_id: patientProfileId,
      fisioterapeuta_id: physioId,
      nome_completo: profile?.nome_completo || appointment.nome_paciente || 'Paciente',
      email: profile?.email || appointment.email_paciente || null,
      telefone: profile?.telefone || appointment.telefone_paciente || null,
      data_nascimento: profile?.data_nascimento || null,
      foto_url: profile?.foto_url || profile?.avatar_url || null,
      avatar_url: profile?.avatar_url || profile?.foto_url || null,
      tipo_paciente: 'externo',
      origem: 'agendamento',
      status: 'ativo',
      updated_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (createError) {
    console.error('[Asaas Webhook] Erro ao criar paciente clínico vinculado:', createError);
    return null;
  }

  return createdPatient?.id || null;
};

const notifyAfterPaidAppointment = async (appointment: any, payment: any) => {
  const { patient, physio } = await getProfilesForAppointment(appointment);

  const appointmentId = String(appointment.id);
  const confirmLink = `${APP_URL}/agendamento/confirmar?id=${encodeURIComponent(appointmentId)}`;
  const patientName = patient?.nome_completo || appointment.nome_paciente || 'Paciente';
  const physioName = physio?.nome_completo || 'Fisioterapeuta';
  const serviceName = appointment.servico || appointment.tipo || 'Sessão de fisioterapia';
  const date = formatDateBR(getAppointmentDate(appointment));
  const time = formatTimeBR(appointment);
  const amount = formatMoneyBR(payment?.value || appointment.valor);

  await supabase.from('notificacoes').insert([
    {
      user_id: appointment.paciente_id,
      titulo: 'Pagamento recebido',
      mensagem: 'Recebemos seu pagamento. O agendamento agora aguarda confirmação do fisioterapeuta.',
      tipo: 'payment',
      lida: false,
      link: '/appointments',
    },
    {
      user_id: appointment.fisio_id || appointment.fisioterapeuta_id,
      titulo: 'Nova consulta paga',
      mensagem: 'Um paciente pagou o serviço e aguarda sua confirmação de atendimento.',
      tipo: 'appointment',
      lida: false,
      link: `/agendamento/confirmar?id=${appointmentId}`,
    },
  ]);

  const physioHtml = buildEmailLayout(
    'Novo agendamento pago aguardando confirmação',
    `
      <p style="margin:0 0 16px;color:#475569;font-size:16px;line-height:25px;">Olá, <strong>${escapeHtml(physioName)}</strong>.</p>
      <p style="margin:0 0 16px;color:#475569;font-size:16px;line-height:25px;">Um paciente realizou o pagamento de um agendamento e aguarda sua confirmação.</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin:18px 0;">
        <tr><td style="padding:16px;color:#334155;font-size:15px;line-height:24px;">
          <p style="margin:0 0 8px;"><strong>Paciente:</strong> ${escapeHtml(patientName)}</p>
          <p style="margin:0 0 8px;"><strong>Serviço:</strong> ${escapeHtml(serviceName)}</p>
          <p style="margin:0 0 8px;"><strong>Data:</strong> ${escapeHtml(date)}</p>
          <p style="margin:0 0 8px;"><strong>Horário:</strong> ${escapeHtml(time)}</p>
          <p style="margin:0;"><strong>Valor pago:</strong> ${escapeHtml(amount)}</p>
        </td></tr>
      </table>
      <p style="margin:22px 0;text-align:center;">
        <a href="${confirmLink}" style="display:inline-block;background:#0284c7;color:#ffffff;text-decoration:none;font-weight:800;padding:14px 20px;border-radius:12px;">Confirmar atendimento</a>
      </p>
      <p style="margin:0;color:#64748b;font-size:13px;line-height:20px;">Caso o botão não funcione, acesse: ${escapeHtml(confirmLink)}</p>
    `
  );

  const patientHtml = buildEmailLayout(
    'Pagamento recebido',
    `
      <p style="margin:0 0 16px;color:#475569;font-size:16px;line-height:25px;">Olá, <strong>${escapeHtml(patientName)}</strong>.</p>
      <p style="margin:0 0 16px;color:#475569;font-size:16px;line-height:25px;">Recebemos seu pagamento pelo Asaas. Seu agendamento agora aguarda confirmação do fisioterapeuta.</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin:18px 0;">
        <tr><td style="padding:16px;color:#334155;font-size:15px;line-height:24px;">
          <p style="margin:0 0 8px;"><strong>Fisioterapeuta:</strong> ${escapeHtml(physioName)}</p>
          <p style="margin:0 0 8px;"><strong>Serviço:</strong> ${escapeHtml(serviceName)}</p>
          <p style="margin:0 0 8px;"><strong>Data:</strong> ${escapeHtml(date)}</p>
          <p style="margin:0 0 8px;"><strong>Horário:</strong> ${escapeHtml(time)}</p>
          <p style="margin:0;"><strong>Valor pago:</strong> ${escapeHtml(amount)}</p>
        </td></tr>
      </table>
      <p style="margin:0;color:#475569;font-size:16px;line-height:25px;">Você será notificado quando o fisioterapeuta confirmar o atendimento.</p>
    `
  );

  const physioEmailResult = await sendEmail(
    physio?.email,
    'Novo agendamento pago aguardando confirmação - FisioCareHub',
    physioHtml
  );

  const patientEmailResult = await sendEmail(
    patient?.email,
    'Pagamento recebido - FisioCareHub',
    patientHtml
  );

  console.log('[Asaas Webhook] Resultado e-mails:', {
    physioEmail: physio?.email,
    physioEmailResult,
    patientEmail: patient?.email,
    patientEmailResult,
  });
};


const notifyAfterPhysioConfirmedAppointment = async (appointment: any, confirmedByUserId?: string) => {
  const appointmentId = String(appointment.id);
  const physioId = appointment.fisio_id || appointment.fisioterapeuta_id;

  if (confirmedByUserId && physioId && String(confirmedByUserId) !== String(physioId)) {
    throw new Error('Usuário autenticado não é o fisioterapeuta deste agendamento.');
  }

  const { patient, physio } = await getProfilesForAppointment(appointment);

  const patientName = patient?.nome_completo || appointment.nome_paciente || 'Paciente';
  const patientEmail = patient?.email || appointment.email_paciente;
  const physioName = physio?.nome_completo || 'Fisioterapeuta';
  const serviceName = appointment.servico || appointment.tipo || 'Sessão de fisioterapia';
  const date = formatDateBR(getAppointmentDate(appointment));
  const time = formatTimeBR(appointment);
  const amount = formatMoneyBR(appointment.valor);
  const appointmentsLink = `${APP_URL}/appointments`;

  await supabase.from('notificacoes').insert({
    user_id: appointment.paciente_id,
    titulo: 'Agendamento confirmado',
    mensagem: `Seu agendamento de ${serviceName} foi confirmado pelo fisioterapeuta.`,
    tipo: 'appointment',
    lida: false,
    link: '/appointments',
  });

  const patientHtml = buildEmailLayout(
    'Agendamento confirmado pelo fisioterapeuta',
    `
      <p style="margin:0 0 16px;color:#475569;font-size:16px;line-height:25px;">Olá, <strong>${escapeHtml(patientName)}</strong>.</p>
      <p style="margin:0 0 16px;color:#475569;font-size:16px;line-height:25px;">Seu agendamento foi confirmado pelo fisioterapeuta. Confira os dados abaixo:</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin:18px 0;">
        <tr><td style="padding:16px;color:#334155;font-size:15px;line-height:24px;">
          <p style="margin:0 0 8px;"><strong>Status:</strong> Confirmado</p>
          <p style="margin:0 0 8px;"><strong>Fisioterapeuta:</strong> ${escapeHtml(physioName)}</p>
          <p style="margin:0 0 8px;"><strong>Serviço:</strong> ${escapeHtml(serviceName)}</p>
          <p style="margin:0 0 8px;"><strong>Data:</strong> ${escapeHtml(date)}</p>
          <p style="margin:0 0 8px;"><strong>Horário:</strong> ${escapeHtml(time)}</p>
          <p style="margin:0;"><strong>Valor pago:</strong> ${escapeHtml(amount)}</p>
        </td></tr>
      </table>
      <p style="margin:0 0 16px;color:#475569;font-size:16px;line-height:25px;">No dia e horário combinados, acompanhe sua agenda pelo FisioCareHub.</p>
      <p style="margin:22px 0;text-align:center;">
        <a href="${appointmentsLink}" style="display:inline-block;background:#0284c7;color:#ffffff;text-decoration:none;font-weight:800;padding:14px 20px;border-radius:12px;">Ver minha agenda</a>
      </p>
      <p style="margin:0;color:#64748b;font-size:13px;line-height:20px;">Caso o botão não funcione, acesse: ${escapeHtml(appointmentsLink)}</p>
    `
  );

  const patientEmailResult = await sendEmail(
    patientEmail,
    'Agendamento confirmado pelo fisioterapeuta - FisioCareHub',
    patientHtml
  );

  console.log('[Asaas Webhook] Resultado e-mail confirmação do paciente:', {
    appointmentId,
    patientEmail,
    patientEmailResult,
  });

  return { patientEmailResult, patientEmail };
};

const validateUserFromAuthorization = async (authorization?: string) => {
  const token = authorization?.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    throw new Error('Token de autenticação ausente.');
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user?.id) {
    throw new Error('Token de autenticação inválido.');
  }

  return data.user;
};

const upsertSessionForAppointment = async (appointment: any, payment: any) => {
  const agendamentoId = String(appointment.id);
  const amountPaid = Number(payment.value || appointment.valor || 0);

  const clinicalPatientId = await ensureClinicalPatientForAppointment(appointment);

  const { error: updateError } = await supabase
    .from('agendamentos')
    .update({
      status: 'pendente',
      status_pagamento: 'pago',
      updated_at: new Date().toISOString(),
    })
    .eq('id', agendamentoId);

  if (updateError) {
    throw updateError;
  }

  const { error: paymentError } = await supabase
    .from('pagamentos')
    .upsert({
      external_id: payment.id,
      user_id: appointment.paciente_id,
      external_reference: agendamentoId,
      amount: amountPaid,
      status: 'paid',
      gateway: 'asaas',
      method: payment.billingType,
      confirmed_at: new Date().toISOString(),
    }, { onConflict: 'external_id' });

  if (paymentError) {
    console.error('[Asaas Webhook] Erro ao registrar pagamento:', paymentError);
  }

  const { data: existingSessions } = await supabase
    .from('sessoes')
    .select('id')
    .eq('agendamento_id', agendamentoId)
    .limit(1);

  const sessionPayload = {
    paciente_id: appointment.paciente_id,
    fisioterapeuta_id: appointment.fisio_id || appointment.fisioterapeuta_id,
    agendamento_id: agendamentoId,
    data: appointment.data || appointment.data_servico || null,
    hora: appointment.hora || formatTimeBR(appointment),
    valor_sessao: amountPaid,
    status_pagamento: 'pago_app',
    stripe_payment_intent: payment.id,
    status_repasse: 'pendente',
  };

  if (existingSessions && existingSessions.length > 0) {
    const { error: sessionUpdateError } = await supabase.from('sessoes').update(sessionPayload).eq('id', existingSessions[0].id);
    if (sessionUpdateError) console.error('[Asaas Webhook] Erro ao atualizar sessão:', sessionUpdateError);
  } else {
    const { error: sessionInsertError } = await supabase.from('sessoes').insert(sessionPayload);
    if (sessionInsertError) console.error('[Asaas Webhook] Erro ao criar sessão:', sessionInsertError);
  }

  console.log('[Asaas Webhook] Paciente clínico vinculado:', clinicalPatientId);

  await notifyAfterPaidAppointment(appointment, payment);
};


const processLibraryPayment = async (payment: any) => {
  const externalReference = String(payment?.externalReference || '');
  const match = externalReference.match(/^library:([^:]+):(.+)$/);

  if (!match) return { processed: false };

  const patientId = match[1];
  const materialIds = match[2].split(',').map((id: string) => id.trim()).filter(Boolean);

  if (!patientId || materialIds.length === 0) {
    throw new Error('Referência de biblioteca inválida no Asaas.');
  }

  const { error: paymentError } = await supabase
    .from('pagamentos')
    .upsert({
      external_id: payment.id,
      user_id: patientId,
      external_reference: externalReference,
      amount: Number(payment.value || 0),
      status: 'paid',
      gateway: 'asaas',
      method: payment.billingType,
      confirmed_at: new Date().toISOString(),
    }, { onConflict: 'external_id' });

  if (paymentError) {
    console.error('[Asaas Webhook] Erro ao atualizar pagamento da biblioteca:', paymentError);
  }

  let insertedCount = 0;

  for (const materialId of materialIds) {
    const { data: existing, error: existingError } = await supabase
      .from('material_purchases')
      .select('id')
      .eq('patient_id', patientId)
      .eq('material_id', materialId)
      .maybeSingle();

    if (existingError) {
      console.error('[Asaas Webhook] Erro ao verificar compra existente:', existingError);
    }

    if (existing?.id) continue;

    const { error: insertError } = await supabase
      .from('material_purchases')
      .insert({
        patient_id: patientId,
        material_id: materialId,
        purchased_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('[Asaas Webhook] Erro ao liberar material comprado:', { patientId, materialId, insertError });
      throw insertError;
    }

    insertedCount += 1;
  }

  await supabase.from('notificacoes').insert({
    user_id: patientId,
    titulo: 'Material liberado',
    mensagem: 'Seu material foi liberado na Minha biblioteca de saúde.',
    tipo: 'library',
    lida: false,
    link: '/patient/library?checkout=success',
  });

  console.log('[Asaas Webhook] Materiais da biblioteca liberados:', { patientId, materialIds, insertedCount });

  return { processed: true, patientId, materialIds, insertedCount };
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { event, payment, appointmentId } = req.body || {};
  console.log(`[Asaas Webhook] Event: ${event}`, payment?.id || appointmentId);


  if (event === 'APPOINTMENT_CONFIRMED_BY_PHYSIO') {
    try {
      const authenticatedUser = await validateUserFromAuthorization(req.headers.authorization);
      const agendamentoId = appointmentId || payment?.externalReference;

      if (!agendamentoId) {
        return res.status(400).json({ received: false, error: 'appointmentId ausente' });
      }

      const { data: appointment, error: appError } = await supabase
        .from('agendamentos')
        .select('*')
        .eq('id', agendamentoId)
        .maybeSingle();

      if (appError || !appointment) {
        return res.status(404).json({ received: false, error: 'Agendamento não encontrado' });
      }

      await notifyAfterPhysioConfirmedAppointment(appointment, authenticatedUser.id);
      return res.status(200).json({ received: true, email: 'patient_confirmation_attempted' });
    } catch (err: any) {
      console.error('[Asaas Webhook] Erro ao enviar confirmação ao paciente:', err);
      return res.status(400).json({ received: false, error: err?.message || 'Erro ao enviar confirmação' });
    }
  }

  if (event === 'PAYMENT_CREATED') {
    return res.status(200).json({ received: true, ignored: true });
  }

  if (['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED', 'PAYMENT_APPROVED', 'RECEIVED'].includes(event)) {
    const externalReference = payment?.externalReference;

    if (!externalReference) {
      console.warn('[Asaas Webhook] No externalReference found');
      return res.status(200).json({ received: true, error: 'Missing externalReference' });
    }

    try {
      const libraryResult = await processLibraryPayment(payment);
      if (libraryResult.processed) {
        return res.status(200).json({ received: true, type: 'library', ...libraryResult });
      }

      const agendamentoId = externalReference;

      const { data: appointment, error: appError } = await supabase
        .from('agendamentos')
        .select('*')
        .eq('id', agendamentoId)
        .maybeSingle();

      if (appError || !appointment) {
        console.warn('[Asaas Webhook] Appointment not found:', agendamentoId, appError);
        return res.status(200).json({ received: true, error: 'Appointment not found' });
      }

      await upsertSessionForAppointment(appointment, payment);
      console.log(`[Asaas Webhook] Appointment ${agendamentoId} processed successfully.`);
    } catch (err: any) {
      console.error('[Asaas Webhook] Internal Error:', err);
      return res.status(200).json({ received: true, error: err?.message || 'Internal Error' });
    }
  }

  return res.status(200).json({ received: true });
}
