import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowDownToLine,
  CheckCircle2,
  Download,
  Receipt,
  ShieldCheck,
  UserCheck,
  Wallet,
  X,
} from 'lucide-react';

export type TransferReceiptData = {
  id: string;
  professionalName?: string | null;
  professionalEmail?: string | null;
  crefito?: string | null;
  amount?: number | null;
  status?: string | null;
  method?: string | null;
  requestedAt?: string | null;
  processedAt?: string | null;
  period?: string | null;
  appointmentsCount?: number | null;
  adminName?: string | null;
  notes?: string | null;
};

type TransferReceiptModalProps = {
  isOpen: boolean;
  onClose: () => void;
  receipt: TransferReceiptData | null;
};

const formatCurrency = (value?: number | null) => {
  const numericValue = Number(value || 0);
  return numericValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatDateTimeBR = (value?: string | null) => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
};

const safeText = (value?: string | number | null) => String(value ?? '—');

const receiptRows = (receipt: TransferReceiptData) => [
  ['Profissional', safeText(receipt.professionalName)],
  ['E-mail', safeText(receipt.professionalEmail)],
  ['CREFITO', safeText(receipt.crefito)],
  ['Valor repassado', formatCurrency(receipt.amount)],
  ['Método', safeText(receipt.method || 'Repasse manual/PIX')],
  ['Status', safeText(receipt.status || 'Repasse realizado')],
  ['Período referente', safeText(receipt.period)],
  ['Atendimentos incluídos', receipt.appointmentsCount != null ? String(receipt.appointmentsCount) : '—'],
  ['Solicitado em', formatDateTimeBR(receipt.requestedAt)],
  ['Processado em', formatDateTimeBR(receipt.processedAt)],
  ['ID do repasse', safeText(receipt.id)],
  ['Responsável', safeText(receipt.adminName || 'Admin FisioCareHub')],
];

const downloadTransferReceiptPDF = async (receipt: TransferReceiptData) => {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const receiptId = safeText(receipt.id);
  const issuedAt = formatDateTimeBR(new Date().toISOString());

  doc.setFillColor(4, 120, 87);
  doc.rect(0, 0, pageWidth, 44, 'F');
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 8, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Comprovante de Repasse', 14, 22);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('FisioCareHub • Repasse confirmado ao fisioterapeuta', 14, 31);
  doc.text(`Emitido em ${issuedAt}`, 14, 38);

  doc.setFillColor(236, 253, 245);
  doc.rect(14, 54, pageWidth - 28, 24, 'F');
  doc.setTextColor(5, 150, 105);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('REPASSE REALIZADO', 20, 65);
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Este comprovante registra o repasse financeiro processado pela plataforma.', 20, 72);

  let y = 92;
  receiptRows(receipt).forEach(([label, value]) => {
    doc.setFillColor(248, 250, 252);
    doc.rect(14, y - 6, pageWidth - 28, 12, 'F');
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(label, 20, y);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'normal');
    doc.text(String(value).slice(0, 74), 78, y);
    y += 14;
  });

  if (receipt.notes) {
    doc.setTextColor(71, 85, 105);
    doc.setFontSize(8);
    doc.text(`Observação: ${receipt.notes}`.slice(0, 110), 14, y + 8);
    y += 8;
  }

  doc.setDrawColor(226, 232, 240);
  doc.line(14, y + 2, pageWidth - 14, y + 2);
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(8);
  doc.text('Documento gerado automaticamente com base no registro de saque/repasse da plataforma.', 14, y + 12);
  doc.text('Valores sujeitos à conciliação administrativa e bancária quando aplicável.', 14, y + 18);

  doc.setTextColor(100, 116, 139);
  doc.text(`ID de verificação: ${receiptId}`, 14, pageHeight - 14);
  doc.text('fisiocarehub.company', pageWidth - 52, pageHeight - 14);

  doc.save(`comprovante-repasse-fisiocarehub-${receiptId.slice(0, 10)}.pdf`);
};

export default function TransferReceiptModal({ isOpen, onClose, receipt }: TransferReceiptModalProps) {
  if (!receipt) return null;

  const rows = receiptRows(receipt);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-start justify-center overflow-y-auto p-3 pt-[calc(env(safe-area-inset-top)+1rem)] md:items-center md:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            className="relative w-full max-w-2xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-950"
          >
            <div className="relative overflow-hidden bg-gradient-to-br from-emerald-950 via-slate-950 to-blue-950 p-6 text-white md:p-8">
              <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-emerald-400/20 blur-3xl" />
              <div className="relative flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-emerald-200 ring-1 ring-white/15">
                    <ArrowDownToLine size={28} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-emerald-200">FisioCareHub</p>
                    <h2 className="mt-1 text-2xl font-black tracking-tight">Comprovante de repasse</h2>
                    <p className="mt-2 max-w-md text-sm font-medium leading-relaxed text-slate-300">
                      Repasse confirmado pela plataforma ao fisioterapeuta.
                    </p>
                  </div>
                </div>
                <button onClick={onClose} className="rounded-full bg-white/10 p-2 text-white/80 transition-all hover:bg-white/20 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              <div className="relative mt-6 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-emerald-200">
                <CheckCircle2 size={16} /> Repasse realizado
              </div>
            </div>

            <div className="grid gap-4 p-5 md:grid-cols-3 md:p-8">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                  <Wallet size={20} />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Valor repassado</p>
                <p className="mt-1 text-xl font-black text-slate-950 dark:text-white">{formatCurrency(receipt.amount)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                  <UserCheck size={20} />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Profissional</p>
                <p className="mt-1 text-sm font-black text-slate-950 dark:text-white">{receipt.professionalName || 'Fisioterapeuta'}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">
                  <ShieldCheck size={20} />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Segurança</p>
                <p className="mt-1 text-sm font-black text-slate-950 dark:text-white">Registro financeiro interno</p>
              </div>
            </div>

            <div className="px-5 pb-5 md:px-8 md:pb-8">
              <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10">
                {rows.map(([label, value]) => (
                  <div key={label} className="grid gap-1 border-b border-slate-100 bg-white px-4 py-3 last:border-b-0 dark:border-white/10 dark:bg-white/[0.03] sm:grid-cols-[170px_1fr]">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
                    <p className="break-words text-sm font-bold text-slate-800 dark:text-slate-200">{value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold leading-relaxed text-emerald-900 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-100">
                Este comprovante confirma o registro de repasse na plataforma. Guarde este documento para controle financeiro.
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => downloadTransferReceiptPDF(receipt)}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-emerald-900/20 transition-all hover:bg-emerald-700"
                >
                  <Download size={16} /> Baixar PDF
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
