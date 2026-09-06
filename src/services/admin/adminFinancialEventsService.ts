import { supabase } from '@/lib/supabase';

export type AdminFinancialEventProvider = 'stripe' | 'asaas' | 'resend' | 'internal' | 'other';
export type AdminFinancialEventStatus = 'received' | 'processed' | 'failed' | 'ignored';

export interface AdminFinancialEvent {
  id: string;
  provider: AdminFinancialEventProvider;
  event_type: string;
  external_id: string | null;
  status: AdminFinancialEventStatus;
  attempts: number;
  occurred_at: string | null;
  processed_at: string | null;
  error_message: string | null;
  payload_summary: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AdminFinancialEventFilters {
  provider?: AdminFinancialEventProvider | 'all';
  status?: AdminFinancialEventStatus | 'all';
  search?: string;
  limit?: number;
}

export interface AdminFinancialEventMetrics {
  total: number;
  received: number;
  processed: number;
  failed: number;
  ignored: number;
}

const TABLE = 'admin_financial_events';

function normalizeError(error: unknown) {
  if (!error) return null;
  return error instanceof Error ? error.message : String(error);
}

export const adminFinancialEventsService = {
  async list(filters: AdminFinancialEventFilters = {}) {
    const limit = Math.min(Math.max(filters.limit ?? 100, 1), 500);
    let query = supabase
      .from(TABLE)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (filters.provider && filters.provider !== 'all') query = query.eq('provider', filters.provider);
    if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status);

    const search = filters.search?.trim();
    if (search) {
      const escaped = search.replace(/[%_]/g, '\\$&');
      query = query.or(`event_type.ilike.%${escaped}%,external_id.ilike.%${escaped}%,error_message.ilike.%${escaped}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as AdminFinancialEvent[];
  },

  async metrics(): Promise<AdminFinancialEventMetrics> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('status');

    if (error) throw error;

    const rows = data ?? [];
    return {
      total: rows.length,
      received: rows.filter(row => row.status === 'received').length,
      processed: rows.filter(row => row.status === 'processed').length,
      failed: rows.filter(row => row.status === 'failed').length,
      ignored: rows.filter(row => row.status === 'ignored').length,
    };
  },

  async refresh() {
    const [events, metrics] = await Promise.all([this.list({ limit: 100 }), this.metrics()]);
    return { events, metrics };
  },

  async retry(id: string) {
    const { data, error } = await supabase.functions.invoke('admin-reprocess-financial-event', {
      body: { eventId: id },
    });

    if (error) throw error;
    if (!data?.success) {
      throw new Error(data?.error ?? 'Falha ao reprocessar evento financeiro');
    }

    return data.event as AdminFinancialEvent;
  },

  formatError(error: unknown) {
    return normalizeError(error) ?? 'Erro desconhecido';
  },
};
