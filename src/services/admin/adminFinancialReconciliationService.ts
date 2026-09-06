import { supabase } from '@/lib/supabase';

export type FinancialReconciliationStatus =
  | 'reconciled'
  | 'pending'
  | 'missing_event'
  | 'event_failed';

export type FinancialReconciliationEntity = 'payment' | 'subscription';

export interface FinancialReconciliationRow {
  entity_type: FinancialReconciliationEntity;
  entity_id: string;
  provider: 'stripe' | 'asaas' | string;
  external_id: string | null;
  user_id: string | null;
  internal_status: string | null;
  amount: number | null;
  internal_at: string | null;
  event_count: number;
  last_event_status: string | null;
  last_event_at: string | null;
  reconciliation_status: FinancialReconciliationStatus;
}

export interface FinancialReconciliationFilters {
  provider?: 'stripe' | 'asaas' | 'all';
  status?: FinancialReconciliationStatus | 'all';
  entity?: FinancialReconciliationEntity | 'all';
  limit?: number;
}

export interface FinancialReconciliationMetrics {
  total: number;
  reconciled: number;
  pending: number;
  missingEvent: number;
  eventFailed: number;
}

const VIEW = 'admin_financial_reconciliation';

export const adminFinancialReconciliationService = {
  async list(filters: FinancialReconciliationFilters = {}) {
    const limit = Math.min(Math.max(filters.limit ?? 200, 1), 1000);

    let query = supabase
      .from(VIEW)
      .select('*')
      .order('internal_at', { ascending: false })
      .limit(limit);

    if (filters.provider && filters.provider !== 'all') {
      query = query.eq('provider', filters.provider);
    }

    if (filters.status && filters.status !== 'all') {
      query = query.eq('reconciliation_status', filters.status);
    }

    if (filters.entity && filters.entity !== 'all') {
      query = query.eq('entity_type', filters.entity);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as FinancialReconciliationRow[];
  },

  async metrics(): Promise<FinancialReconciliationMetrics> {
    const { data, error } = await supabase
      .from(VIEW)
      .select('reconciliation_status');

    if (error) throw error;

    const rows = data ?? [];
    return {
      total: rows.length,
      reconciled: rows.filter(row => row.reconciliation_status === 'reconciled').length,
      pending: rows.filter(row => row.reconciliation_status === 'pending').length,
      missingEvent: rows.filter(row => row.reconciliation_status === 'missing_event').length,
      eventFailed: rows.filter(row => row.reconciliation_status === 'event_failed').length,
    };
  },

  async refresh() {
    const [rows, metrics] = await Promise.all([
      this.list({ limit: 200 }),
      this.metrics(),
    ]);

    return { rows, metrics };
  },
};
