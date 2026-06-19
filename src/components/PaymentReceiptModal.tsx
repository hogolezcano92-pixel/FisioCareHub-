import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Download,
  ExternalLink,
  Receipt,
  ShieldCheck,
  User,
  X,
} from "lucide-react";

export type PaymentReceiptData = {
  id: string;
  appointmentId?: string | number | null;
  patientName?: string | null;
  physioName?: string | null;
  service?: string | null;
  appointmentDate?: string | null;
  amount?: number | null;
  method?: string | null;
  gateway?: string | null;
  status?: string | null;
  externalId?: string | null;
  confirmedAt?: string | null;
  issuedAt?: string | null;
  invoiceUrl?: string | null;
};

type PaymentReceiptModalProps = {
  isOpen: boolean;
  onClose: () => void;
  receipt: PaymentReceiptData | null;
};

const formatCurrency = (value?: number | null) => {
  const numericValue = Number(value || 0);
  return numericValue.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
};

const formatDateTimeBR = (value?: string | null) => {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
};

const normalizeMethod = (method?: string | null) => {
  const normalized = String(method || "").toUpperCase();
  if (normalized.includes("PIX")) return "Pix";
  if (normalized.includes("CARD") || normalized.includes("CREDIT"))
    return "Cartão de crédito";
  if (normalized.includes("BOLETO")) return "Boleto";
  if (normalized.includes("STRIPE")) return "Cartão/Stripe";
  return method || "Plataforma";
};

const safeText = (value?: string | number | null) => String(value ?? "—");

const receiptRows = (receipt: PaymentReceiptData) => [
  ["Paciente", safeText(receipt.patientName)],
  ["Fisioterapeuta", safeText(receipt.physioName)],
  ["Serviço", safeText(receipt.service)],
  ["Data do atendimento", safeText(receipt.appointmentDate)],
  ["Valor pago", formatCurrency(receipt.amount)],
  ["Forma de pagamento", normalizeMethod(receipt.method)],
  ["Gateway", safeText(receipt.gateway || "FisioCareHub")],
  ["Status", safeText(receipt.status || "Pagamento confirmado")],
  ["ID do pagamento", safeText(receipt.externalId || receipt.id)],
  ["ID do agendamento", safeText(receipt.appointmentId)],
  ["Confirmação", formatDateTimeBR(receipt.confirmedAt)],
];

const downloadPaymentReceiptPDF = async (receipt: PaymentReceiptData) => {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const receiptId = safeText(receipt.externalId || receipt.id);
  const issuedAt = formatDateTimeBR(
    receipt.issuedAt || new Date().toISOString(),
  );

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 44, "F");
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageWidth, 8, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Comprovante de Pagamento", 14, 22);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("FisioCareHub • Pagamento processado com segurança", 14, 31);
  doc.text(`Emitido em ${issuedAt}`, 14, 38);

  doc.setFillColor(236, 253, 245);
  doc.rect(14, 54, pageWidth - 28, 24, "F");
  doc.setTextColor(5, 150, 105);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("PAGAMENTO CONFIRMADO", 20, 65);
  doc.setTextColor(71, 85, 105);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    "Este comprovante registra a confirmação do pagamento do agendamento informado.",
    20,
    72,
  );

  let y = 92;
  receiptRows(receipt).forEach(([label, value]) => {
    doc.setFillColor(248, 250, 252);
    doc.rect(14, y - 6, pageWidth - 28, 12, "F");
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(label, 20, y);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "normal");
    doc.text(String(value).slice(0, 74), 78, y);
    y += 14;
  });

  doc.setDrawColor(226, 232, 240);
  doc.line(14, y + 2, pageWidth - 14, y + 2);
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(8);
  doc.text(
    "Observação: este comprovante não substitui nota fiscal quando aplicável.",
    14,
    y + 12,
  );
  doc.text(
    "Documento gerado automaticamente pelo FisioCareHub com base nos registros de pagamento da plataforma.",
    14,
    y + 18,
  );

  doc.setTextColor(100, 116, 139);
  doc.text(`ID de verificação: ${receiptId}`, 14, pageHeight - 14);
  doc.text("fisiocarehub.company", pageWidth - 52, pageHeight - 14);

  doc.save(`comprovante-pagamento-fisiocarehub-${receiptId.slice(0, 10)}.pdf`);
};

export default function PaymentReceiptModal({
  isOpen,
  onClose,
  receipt,
}: PaymentReceiptModalProps) {
  if (!receipt) return null;

  const rows = receiptRows(receipt);

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[2147483000] flex items-start justify-center overflow-y-auto overscroll-contain p-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-[calc(env(safe-area-inset-bottom)+1rem)] md:items-center md:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/75 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            className="relative z-[2147483001] w-full max-w-2xl max-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-1.5rem)] overflow-y-auto overflow-x-hidden rounded-[2rem] border border-slate-300 bg-white shadow-2xl shadow-slate-950/25 dark:border-white/10 dark:bg-slate-950"
          >
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-6 text-white md:p-8">
              <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-blue-500/20 blur-3xl" />
              <div className="relative flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                  <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-blue-200 ring-1 ring-white/15 sm:flex">
                    <Receipt size={28} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-blue-200">
                      FisioCareHub
                    </p>
                    <h2 className="mt-1 text-[1.7rem] font-black leading-tight tracking-tight sm:text-3xl">
                      Comprovante de pagamento
                    </h2>
                    <p className="mt-2 max-w-md text-sm font-medium leading-relaxed text-slate-300">
                      Pagamento confirmado com segurança e vinculado ao
                      agendamento informado.
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="shrink-0 rounded-full bg-white/10 p-2 text-white/80 transition-all hover:bg-white/20 hover:text-white"
                  aria-label="Fechar comprovante"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="relative mt-6 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-emerald-200">
                <CheckCircle2 size={16} /> Pagamento confirmado
              </div>
            </div>

            <div className="grid gap-4 p-5 md:grid-cols-3 md:p-8">
              <div className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm shadow-slate-200/70 dark:border-white/10 dark:bg-white/5 dark:shadow-none">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                  <CreditCard size={20} />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400">
                  Valor pago
                </p>
                <p className="mt-1 text-xl font-black text-slate-950 dark:text-white">
                  {formatCurrency(receipt.amount)}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm shadow-slate-200/70 dark:border-white/10 dark:bg-white/5 dark:shadow-none">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                  <CalendarDays size={20} />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400">
                  Atendimento
                </p>
                <p className="mt-1 text-sm font-black text-slate-950 dark:text-white">
                  {receipt.appointmentDate || "—"}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm shadow-slate-200/70 dark:border-white/10 dark:bg-white/5 dark:shadow-none">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">
                  <ShieldCheck size={20} />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400">
                  Segurança
                </p>
                <p className="mt-1 text-sm font-black text-slate-950 dark:text-white">
                  Processado pela plataforma
                </p>
              </div>
            </div>

            <div className="px-5 pb-5 md:px-8 md:pb-8">
              <div className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm shadow-slate-200/70 dark:border-white/10 dark:bg-transparent dark:shadow-none">
                {rows.map(([label, value]) => (
                  <div
                    key={label}
                    className="grid gap-1 border-b border-slate-200 bg-white px-4 py-3 last:border-b-0 dark:border-white/10 dark:bg-white/[0.03] sm:grid-cols-[170px_1fr]"
                  >
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400">
                      {label}
                    </p>
                    <p className="break-words text-sm font-extrabold text-slate-900 dark:text-slate-200">
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-xs font-semibold leading-relaxed text-blue-900 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-100">
                Este comprovante foi gerado com base no registro interno de
                pagamento. Ele não substitui nota fiscal quando aplicável.
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                {receipt.invoiceUrl && (
                  <a
                    href={receipt.invoiceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-700 transition-all hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
                  >
                    <ExternalLink size={16} /> Link do gateway
                  </a>
                )}
                <button
                  onClick={() => downloadPaymentReceiptPDF(receipt)}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-blue-900/20 transition-all hover:bg-blue-700"
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

  if (typeof document === "undefined") {
    return modalContent;
  }

  return createPortal(modalContent, document.body);
}
