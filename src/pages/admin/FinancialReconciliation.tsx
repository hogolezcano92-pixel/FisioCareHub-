import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, ShieldCheck, AlertTriangle, Clock3, CheckCircle2, XCircle, CreditCard, Repeat2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  adminFinancialReconciliationService,
  FinancialReconciliationFilters,
  FinancialReconciliationMetrics,
  FinancialReconciliationRow,
  FinancialReconciliationStatus,
  FinancialReconciliationEntity,
} from '@/services/admin/adminFinancialReconciliationService';

const statusLabel: Record<FinancialReconciliationStatus, string> = {
  reconciled: 'Reconciliado',
  pending: 'Pendente',
  missing_event: 'Evento ausente',
  event_failed: 'Evento com falha',
};

const statusIcon: Record<FinancialReconciliationStatus, typeof CheckCircle2> = {
  reconciled: CheckCircle2,
  pending: Clock3,
  missing_event: AlertTriangle,
  event_failed: XCircle,
};

const statusClass: Record<FinancialReconciliationStatus, string> = {
  reconciled: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  pending: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  missing_event: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
  event_failed: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
};

const formatDate = (value: string | null) => value ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : '—';
const formatAmount = (value: number | null) => value == null ? '—' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export default function FinancialReconciliation() {
  const [rows, setRows] = useState<FinancialReconciliationRow[]>([]);
  const [metrics, setMetrics] = useState<FinancialReconciliationMetrics>({ total: 0, reconciled: 0, pending: 0, missingEvent: 0, eventFailed: 0 });
  const [provider, setProvider] = useState<FinancialReconciliationFilters['provider']>('all');
  const [status, setStatus] = useState<FinancialReconciliationFilters['status']>('all');
  const [entity, setEntity] = useState<FinancialReconciliationFilters['entity']>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (manual = false) => {
    try {
      manual ? setRefreshing(true) : setLoading(true);
      const result = await adminFinancialReconciliationService.refresh();
      setRows(result.rows);
      setMetrics(result.metrics);
    } catch (error: any) {
      console.error('[Admin] reconciliation load error', error);
      toast.error(error?.message || 'Não foi possível carregar a reconciliação financeira.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter(row => {
      if (provider !== 'all' && row.provider !== provider) return false;
      if (status !== 'all' && row.reconciliation_status !== status) return false;
      if (entity !== 'all' && row.entity_type !== entity) return false;
      if (!term) return true;
      return [row.provider, row.external_id, row.entity_id, row.internal_status, row.last_event_status]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(term));
    });
  }, [rows, provider, status, entity, search]);

  const cards = [
    { label: 'Registros', value: metrics.total, icon: CreditCard },
    { label: 'Reconciliados', value: metrics.reconciled, icon: CheckCircle2 },
    { label: 'Pendentes', value: metrics.pending, icon: Clock3 },
    { label: 'Eventos ausentes', value: metrics.missingEvent, icon: AlertTriangle },
    { label: 'Com falha', value: metrics.eventFailed, icon: XCircle },
  ];

  return (
    <div className="min-h-screen bg-bg-general text-text-main p-4 md:p-8 lg:p-10">
      <div className="max-w-[1800px] mx-auto space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-primary">
              <ShieldCheck size={13} /> Controle financeiro
            </div>
            <h1 className="mt-3 text-3xl md:text-4xl font-display font-black tracking-tight">Reconciliação Financeira</h1>
            <p className="mt-1 text-sm text-text-muted">Compare os registros internos com os eventos financeiros recebidos.</p>
          </div>
          <button onClick={() => void load(true)} disabled={refreshing} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-background px-4 py-3 text-sm font-black shadow-sm transition hover:bg-muted disabled:opacity-60">
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} /> Atualizar
          </button>
        </div>

        <div className="grid grid-cols-2 xl:grid-cols-5 gap-3 md:gap-4">
          {cards.map(card => {
            const Icon = card.icon;
            return <div key={card.label} className="rounded-3xl border border-border bg-background p-5 shadow-sm">
              <div className="flex items-center justify-between"><span className="text-[10px] font-black uppercase tracking-widest text-text-muted">{card.label}</span><Icon size={18} className="text-primary" /></div>
              <div className="mt-3 text-2xl font-black">{card.value}</div>
            </div>;
          })}
        </div>

        <div className="rounded-3xl border border-border bg-background p-4 md:p-5 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar ID, status ou provedor..." className="md:col-span-1 rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
            <select value={provider} onChange={e => setProvider(e.target.value as FinancialReconciliationFilters['provider'])} className="rounded-2xl border border-border bg-background px-4 py-3 text-sm">
              <option value="all">Todos os provedores</option><option value="stripe">Stripe</option><option value="asaas">Asaas</option>
            </select>
            <select value={entity} onChange={e => setEntity(e.target.value as FinancialReconciliationEntity | 'all')} className="rounded-2xl border border-border bg-background px-4 py-3 text-sm">
              <option value="all">Pagamentos + assinaturas</option><option value="payment">Pagamentos</option><option value="subscription">Assinaturas</option>
            </select>
            <select value={status} onChange={e => setStatus(e.target.value as FinancialReconciliationStatus | 'all')} className="rounded-2xl border border-border bg-background px-4 py-3 text-sm">
              <option value="all">Todos os estados</option><option value="reconciled">Reconciliado</option><option value="pending">Pendente</option><option value="missing_event">Evento ausente</option><option value="event_failed">Evento com falha</option>
            </select>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-background shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div><h2 className="font-black">Registros financeiros</h2><p className="text-xs text-text-muted mt-1">{filteredRows.length} registro(s) exibido(s)</p></div>
            <Repeat2 size={18} className="text-text-muted" />
          </div>
          {loading ? <div className="p-12 text-center text-sm text-text-muted">Carregando reconciliação...</div> : filteredRows.length === 0 ? <div className="p-12 text-center text-sm text-text-muted">Nenhum registro encontrado.</div> : <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-sm">
              <thead><tr className="border-b border-border text-left text-[10px] uppercase tracking-widest text-text-muted"><th className="px-5 py-4">Tipo / provedor</th><th className="px-5 py-4">ID externo</th><th className="px-5 py-4">Valor</th><th className="px-5 py-4">Status interno</th><th className="px-5 py-4">Último evento</th><th className="px-5 py-4">Reconciliação</th><th className="px-5 py-4">Atualizado</th></tr></thead>
              <tbody>
                {filteredRows.map(row => {
                  const Icon = statusIcon[row.reconciliation_status];
                  return <tr key={`${row.entity_type}-${row.entity_id}`} className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
                    <td className="px-5 py-4"><div className="font-black capitalize">{row.entity_type === 'payment' ? 'Pagamento' : 'Assinatura'}</div><div className="text-xs text-text-muted uppercase">{row.provider}</div></td>
                    <td className="px-5 py-4 font-mono text-xs max-w-[250px] truncate" title={row.external_id || row.entity_id}>{row.external_id || row.entity_id}</td>
                    <td className="px-5 py-4 font-bold">{formatAmount(row.amount)}</td>
                    <td className="px-5 py-4"><span className="text-xs font-semibold">{row.internal_status || '—'}</span></td>
                    <td className="px-5 py-4"><div className="text-xs font-semibold">{row.last_event_status || '—'}</div><div className="text-[11px] text-text-muted">{formatDate(row.last_event_at)}</div></td>
                    <td className="px-5 py-4"><span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${statusClass[row.reconciliation_status]}`}><Icon size={12} />{statusLabel[row.reconciliation_status]}</span></td>
                    <td className="px-5 py-4 text-xs text-text-muted">{formatDate(row.internal_at)}</td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>}
        </div>
      </div>
    </div>
  );
}
