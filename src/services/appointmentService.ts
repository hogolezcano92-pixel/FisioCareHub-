import { supabase } from '../lib/supabase';

export const appointmentService = {
  /**
   * Busca agendamentos com joins otimizados e limites
   */
  async getAppointments(userId: string, role: 'paciente' | 'fisioterapeuta', limit = 10) {
    const roleField = role === 'paciente' ? 'paciente_id' : 'fisio_id';
    
    try {
      // Tenta o join principal primeiro
      const { data, error } = await supabase
        .from('agendamentos')
        .select(`
          id,
          data,
          hora,
          status,
          servico,
          paciente:perfis!paciente_id (nome_completo, avatar_url),
          fisioterapeuta:perfis!fisio_id (nome_completo, avatar_url)
        `)
        .eq(roleField, userId)
        .order('data', { ascending: false })
        .order('hora', { ascending: false })
        .limit(limit);

      if (error) {
        console.warn('Primary fetch failed, trying secondary fallback...', error.message);
        
        // Fallback: Busca básica sem join e depois busca os perfis relacionados
        const { data: baseData, error: baseError } = await supabase
          .from('agendamentos')
          .select('*')
          .eq(roleField, userId)
          .order('data', { ascending: false })
          .order('hora', { ascending: false })
          .limit(limit);

        if (baseError) throw baseError;
        if (!baseData || baseData.length === 0) return [];

        const pacienteIds = [...new Set(baseData.map(a => a.paciente_id))];
        const fisioIds = [...new Set(baseData.map(a => a.fisio_id))];

        const { data: profiles } = await supabase
          .from('perfis')
          .select('id, nome_completo, avatar_url')
          .in('id', [...pacienteIds, ...fisioIds]);

        const profileMap = (profiles || []).reduce((acc: any, p) => {
          acc[p.id] = p;
          return acc;
        }, {});

        return baseData.map(a => ({
          ...a,
          paciente: profileMap[a.paciente_id] || { nome_completo: 'Paciente Externo', avatar_url: null },
          fisioterapeuta: profileMap[a.fisio_id] || { nome_completo: 'Fisioterapeuta', avatar_url: null }
        }));
      }
      return data;
    } catch (error) {
      console.error('Error fetching appointments:', error);
      return [];
    }
  },

  /**
   * Busca estatísticas simplificadas para o dashboard
   */
  async getDashboardStats(userId: string, role: 'paciente' | 'fisioterapeuta') {
    const roleField = role === 'paciente' ? 'paciente_id' : 'fisio_id';
    
    try {
      const [appts, records, triages] = await Promise.all([
        supabase.from('agendamentos').select('id', { count: 'exact', head: true }).eq(roleField, userId),
        supabase.from('evolucoes').select('id', { count: 'exact', head: true }).eq('paciente_id', userId),
        supabase.from('triagens').select('id', { count: 'exact', head: true }).eq('paciente_id', userId)
      ]);

      return {
        appointments: appts.count || 0,
        records: records.count || 0,
        triages: triages.count || 0
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return { appointments: 0, records: 0, triages: 0 };
    }
  }
};
