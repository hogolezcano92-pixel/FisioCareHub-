import { supabase } from '../lib/supabase';

export type OpportunityServiceType = 'domicilio' | 'online' | 'ambos';
export type OpportunityStatus = 'aberta' | 'em_negociacao' | 'convertida' | 'cancelada' | 'encerrada';

export interface PatientOpportunity {
  id: string;
  paciente_id: string;
  titulo: string;
  descricao?: string | null;
  queixa_principal: string;
  tipo_atendimento: OpportunityServiceType;
  cidade?: string | null;
  estado?: string | null;
  bairro?: string | null;
  preferencia_horario?: string | null;
  visivel_para_profissionais: boolean;
  status: OpportunityStatus;
  created_at: string;
  updated_at?: string;

  paciente_nome?: string;
  paciente_avatar_url?: string | null;
  paciente_tipo_usuario?: string | null;

  interesse_enviado?: boolean;
  interesse_id?: string | null;
}

export interface CreateOpportunityInput {
  titulo?: string;
  descricao?: string;
  queixa_principal: string;
  tipo_atendimento: OpportunityServiceType;
  cidade?: string;
  estado?: string;
  bairro?: string;
  preferencia_horario?: string;
  observacoes_privadas?: string;
  visivel_para_profissionais?: boolean;
}

export interface SendInterestInput {
  solicitacao_id: string;
  paciente_id: string;
  mensagem?: string;
}

const normalizeText = (value?: string | null) => value?.trim() || null;

const getCurrentSessionUser = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!session?.user) throw new Error('Usuário não autenticado.');
  return session.user;
};

const getCurrentProfile = async () => {
  const user = await getCurrentSessionUser();

  const { data, error } = await supabase
    .from('perfis')
    .select('id,nome_completo,email,tipo_usuario,role,status_aprovacao,plano,is_pro,avatar_url,foto_url,cidade,estado')
    .eq('id', user.id)
    .single();

  if (error) throw error;
  return data;
};

const attachPatientProfiles = async (items: any[]): Promise<PatientOpportunity[]> => {
  const patientIds = Array.from(new Set(items.map(item => item.paciente_id).filter(Boolean)));

  if (patientIds.length === 0) return items as PatientOpportunity[];

  const { data: patients, error } = await supabase
    .from('perfis')
    .select('id,nome_completo,avatar_url,foto_url,tipo_usuario')
    .in('id', patientIds);

  if (error) {
    console.warn('[OPPORTUNITIES_PATIENTS_LOAD_WARN]', error);
    return items as PatientOpportunity[];
  }

  const patientMap = new Map((patients || []).map((p: any) => [p.id, p]));

  return items.map((item: any) => {
    const patient = patientMap.get(item.paciente_id);
    return {
      ...item,
      paciente_nome: patient?.nome_completo || 'Paciente',
      paciente_avatar_url: patient?.avatar_url || patient?.foto_url || null,
      paciente_tipo_usuario: patient?.tipo_usuario || null,
    };
  }) as PatientOpportunity[];
};

export const opportunitiesService = {
  async getCurrentProfile() {
    return getCurrentProfile();
  },

  async getOpenOpportunities(filters?: {
    cidade?: string;
    estado?: string;
    tipo_atendimento?: OpportunityServiceType | 'todos';
    search?: string;
  }): Promise<PatientOpportunity[]> {
    const user = await getCurrentSessionUser();

    let query = supabase
      .from('solicitacoes_atendimento')
      .select('*')
      .eq('status', 'aberta')
      .eq('visivel_para_profissionais', true)
      .order('created_at', { ascending: false });

    if (filters?.estado?.trim()) {
      query = query.ilike('estado', filters.estado.trim());
    }

    if (filters?.cidade?.trim()) {
      query = query.ilike('cidade', `%${filters.cidade.trim()}%`);
    }

    if (filters?.tipo_atendimento && filters.tipo_atendimento !== 'todos') {
      query = query.in('tipo_atendimento', [filters.tipo_atendimento, 'ambos']);
    }

    const { data, error } = await query.limit(80);
    if (error) throw error;

    let items = data || [];

    const search = filters?.search?.trim().toLowerCase();
    if (search) {
      items = items.filter((item: any) => {
        const text = [
          item.titulo,
          item.descricao,
          item.queixa_principal,
          item.cidade,
          item.estado,
          item.bairro,
          item.preferencia_horario,
        ].filter(Boolean).join(' ').toLowerCase();

        return text.includes(search);
      });
    }

    const { data: interests, error: interestsError } = await supabase
      .from('interesses_solicitacao')
      .select('id,solicitacao_id,status')
      .eq('fisio_id', user.id);

    if (interestsError) {
      console.warn('[OPPORTUNITIES_INTERESTS_LOAD_WARN]', interestsError);
    }

    const interestMap = new Map((interests || []).map((interest: any) => [interest.solicitacao_id, interest]));

    const withInterests = items.map((item: any) => {
      const interest = interestMap.get(item.id);
      return {
        ...item,
        interesse_enviado: Boolean(interest),
        interesse_id: interest?.id || null,
      };
    });

    return attachPatientProfiles(withInterests);
  },

  async getMyPatientRequests(): Promise<PatientOpportunity[]> {
    const user = await getCurrentSessionUser();

    const { data, error } = await supabase
      .from('solicitacoes_atendimento')
      .select('*')
      .eq('paciente_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return attachPatientProfiles(data || []);
  },

  async createPatientRequest(input: CreateOpportunityInput): Promise<PatientOpportunity> {
    const user = await getCurrentSessionUser();

    const payload = {
      paciente_id: user.id,
      titulo: normalizeText(input.titulo) || 'Solicitação de atendimento',
      descricao: normalizeText(input.descricao),
      queixa_principal: input.queixa_principal.trim(),
      tipo_atendimento: input.tipo_atendimento || 'ambos',
      cidade: normalizeText(input.cidade),
      estado: input.estado?.trim().toUpperCase() || null,
      bairro: normalizeText(input.bairro),
      preferencia_horario: normalizeText(input.preferencia_horario),
      observacoes_privadas: normalizeText(input.observacoes_privadas),
      visivel_para_profissionais: input.visivel_para_profissionais ?? true,
      status: 'aberta',
    };

    if (!payload.queixa_principal) {
      throw new Error('Informe a queixa principal.');
    }

    const { data, error } = await supabase
      .from('solicitacoes_atendimento')
      .insert(payload)
      .select('*')
      .single();

    if (error) throw error;

    const [item] = await attachPatientProfiles([data]);
    return item;
  },

  async updatePatientRequestStatus(id: string, status: OpportunityStatus) {
    const { data, error } = await supabase
      .from('solicitacoes_atendimento')
      .update({ status })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return data as PatientOpportunity;
  },

  async sendInterest(input: SendInterestInput) {
    const user = await getCurrentSessionUser();
    const profile = await getCurrentProfile();

    const message = normalizeText(input.mensagem)
      || `Olá! Tenho interesse em atender sua solicitação pelo FisioCareHub. Podemos conversar pelo app e seguir com o agendamento e pagamento pela plataforma.`;

    const { data, error } = await supabase
      .from('interesses_solicitacao')
      .insert({
        solicitacao_id: input.solicitacao_id,
        fisio_id: user.id,
        mensagem: message,
        status: 'enviado',
      })
      .select('*')
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('Você já enviou interesse nessa solicitação.');
      }
      throw error;
    }

    // Notificação para o paciente abrir o app/chat. Se falhar, não bloqueia o interesse.
    try {
      await supabase
        .from('notificacoes')
        .insert({
          user_id: input.paciente_id,
          titulo: 'Fisioterapeuta interessado',
          mensagem: `${profile?.nome_completo || 'Um fisioterapeuta'} demonstrou interesse na sua solicitação. Continue pelo FisioCareHub para manter o pagamento seguro.`,
          tipo: 'opportunity_interest',
          link: '/chat',
          metadata: {
            solicitacao_id: input.solicitacao_id,
            fisio_id: user.id,
            interest_id: data.id,
          },
          lida: false,
        });
    } catch (notificationErr) {
      console.warn('[OPPORTUNITY_NOTIFICATION_WARN]', notificationErr);
    }

    // Mensagem inicial no chat interno para não liberar contato fora da plataforma.
    try {
      await supabase
        .from('mensagens')
        .insert({
          remetente: user.id,
          destinatario: input.paciente_id,
          mensagem: message,
          criado_em: new Date().toISOString(),
          lida: false,
        });
    } catch (messageErr) {
      console.warn('[OPPORTUNITY_CHAT_MESSAGE_WARN]', messageErr);
    }

    return data;
  },
};
