import { jsPDF } from 'jspdf';

type AnyRecord = Record<string, any>;

export interface TriagePdfInput {
  triage?: AnyRecord | null;
  analysis?: AnyRecord | null;
  formData?: AnyRecord | null;
  patientName?: string;
  professionalName?: string;
  generatedAt?: string;
}

const PAGE = {
  width: 210,
  height: 297,
  margin: 14,
};

const COLORS = {
  navy: '#0f172a',
  slate: '#334155',
  muted: '#64748b',
  soft: '#e2e8f0',
  bg: '#f8fafc',
  card: '#ffffff',
  blue: '#2563eb',
  cyan: '#06b6d4',
  purple: '#4f46e5',
  amber: '#f59e0b',
  red: '#e11d48',
  green: '#10b981',
};

const normalize = (value: any, fallback = 'Não informado') => {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  if (Array.isArray(value)) return value.length ? value.join(', ') : fallback;
  return String(value);
};

const safeFileName = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w.-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

const stripMarkdown = (text: string) =>
  normalize(text, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*]\s+/gm, '• ')
    .replace(/^\s*\d+\.\s+/gm, '• ')
    .trim();

const getMainReport = (input: TriagePdfInput) =>
  stripMarkdown(input.triage?.relatorio || input.analysis?.relatorio || '');

const getSeverityColor = (severity: string) => {
  const value = severity.toLowerCase();
  if (value.includes('vermelho') || value.includes('grave') || value.includes('alto')) return COLORS.red;
  if (value.includes('amarelo') || value.includes('moderado') || value.includes('médio') || value.includes('medio')) return COLORS.amber;
  return COLORS.green;
};

const extractSection = (report: string, title: string) => {
  const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(?:^|\\n)\\s*(?:#+\\s*)?${escaped}\\s*\\n([\\s\\S]*?)(?=\\n\\s*(?:#+\\s*)?[A-ZÁÉÍÓÚÂÊÔÃÕÇ][^\\n]{2,80}\\n|$)`, 'i');
  const match = report.match(regex);
  return match?.[1]?.trim() || '';
};

const getRedFlagsLabel = (input: TriagePdfInput) => {
  const triage = input.triage || {};
  const form = input.formData || {};
  if (triage.red_flags) return normalize(triage.red_flags);
  if (triage.red_flag) return 'Sinais de alerta identificados';
  const flags = form.red_flags || {};
  const active = Object.entries(flags)
    .filter(([, value]) => Boolean(value))
    .map(([key]) => key.replace(/_/g, ' '));
  return active.length ? active.join(', ') : 'Não identificadas';
};

const addWrappedText = (
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  options?: {
    size?: number;
    color?: string;
    fontStyle?: 'normal' | 'bold' | 'italic';
    lineHeight?: number;
    maxLines?: number;
  }
) => {
  const size = options?.size ?? 10;
  const lineHeight = options?.lineHeight ?? size * 0.43 + 3.4;
  doc.setFont('helvetica', options?.fontStyle || 'normal');
  doc.setFontSize(size);
  doc.setTextColor(options?.color || COLORS.slate);
  const lines = doc.splitTextToSize(stripMarkdown(text), maxWidth);
  const finalLines = options?.maxLines ? lines.slice(0, options.maxLines) : lines;
  doc.text(finalLines, x, y);
  return y + finalLines.length * lineHeight;
};

const ensurePage = (doc: jsPDF, y: number, needed = 40) => {
  if (y + needed <= PAGE.height - PAGE.margin) return y;
  doc.addPage();
  addPageBackground(doc);
  return PAGE.margin + 6;
};

const addPageBackground = (doc: jsPDF) => {
  doc.setFillColor(COLORS.bg);
  doc.rect(0, 0, PAGE.width, PAGE.height, 'F');
  doc.setDrawColor('#dbeafe');
  doc.setLineWidth(0.2);
  for (let x = 12; x < PAGE.width; x += 22) {
    doc.line(x, 0, x + 35, PAGE.height);
  }
};

const addHeader = (doc: jsPDF, input: TriagePdfInput) => {
  const patientName = normalize(input.patientName || input.triage?.paciente?.nome_completo || input.triage?.paciente_nome || 'Paciente');
  const date = input.generatedAt || input.triage?.created_at || input.triage?.data_triagem || new Date().toISOString();

  doc.setFillColor(COLORS.navy);
  doc.roundedRect(PAGE.margin, 12, PAGE.width - PAGE.margin * 2, 42, 7, 7, 'F');

  doc.setFillColor(COLORS.blue);
  doc.roundedRect(22, 20, 18, 18, 5, 5, 'F');
  doc.setTextColor('#ffffff');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('FCH', 25, 31.5);

  doc.setFontSize(19);
  doc.text('Relatório de Triagem', 46, 27);
  doc.setFontSize(9);
  doc.setTextColor('#cbd5e1');
  doc.text('FisioCareHub • Triagem inteligente para fisioterapia', 46, 35);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor('#93c5fd');
  doc.text(`Paciente: ${patientName}`, 46, 43);
  doc.text(`Gerado em: ${new Date(date).toLocaleDateString('pt-BR')}`, 128, 43);

  doc.setFillColor(COLORS.cyan);
  doc.circle(180, 27, 3, 'F');
  doc.setDrawColor(COLORS.cyan);
  doc.setLineWidth(0.8);
  doc.line(160, 35, 166, 35);
  doc.line(166, 35, 169, 30);
  doc.line(169, 30, 174, 40);
  doc.line(174, 40, 178, 35);
  doc.line(178, 35, 190, 35);
};

const addSummaryCards = (doc: jsPDF, input: TriagePdfInput, y: number) => {
  const triage = input.triage || {};
  const analysis = input.analysis || {};
  const form = input.formData || {};
  const region = normalize(triage.regiao_dor || form.regiao_dor);
  const pain = normalize(triage.escala_dor ?? form.escala_dor, '—');
  const severity = normalize(triage.gravidade || analysis.gravidade, 'Não classificada');
  const classification = normalize(triage.classificacao || analysis.classificacao, 'Não classificada');

  const cards = [
    { label: 'Região', value: region, color: COLORS.blue },
    { label: 'Dor', value: pain === '—' ? pain : `${pain}/10`, color: COLORS.red },
    { label: 'Gravidade', value: severity, color: getSeverityColor(severity) },
    { label: 'Classificação', value: classification, color: COLORS.purple },
  ];

  const gap = 5;
  const cardW = (PAGE.width - PAGE.margin * 2 - gap * 3) / 4;
  cards.forEach((card, index) => {
    const x = PAGE.margin + index * (cardW + gap);
    doc.setFillColor('#ffffff');
    doc.roundedRect(x, y, cardW, 24, 4, 4, 'F');
    doc.setDrawColor('#e2e8f0');
    doc.roundedRect(x, y, cardW, 24, 4, 4, 'S');

    doc.setFillColor(card.color);
    doc.roundedRect(x + 4, y + 5, 3, 14, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(COLORS.muted);
    doc.text(card.label.toUpperCase(), x + 10, y + 9);
    doc.setFontSize(9);
    doc.setTextColor(COLORS.navy);
    const lines = doc.splitTextToSize(card.value, cardW - 13);
    doc.text(lines.slice(0, 2), x + 10, y + 16);
  });
  return y + 32;
};

const addSection = (
  doc: jsPDF,
  title: string,
  body: string,
  y: number,
  options?: { accent?: string; warning?: boolean }
) => {
  if (!body.trim()) return y;
  y = ensurePage(doc, y, 42);

  const x = PAGE.margin;
  const w = PAGE.width - PAGE.margin * 2;
  const cleanBody = stripMarkdown(body);
  const lines = doc.splitTextToSize(cleanBody, w - 18);
  const h = Math.max(22, 18 + lines.length * 5.2);

  y = ensurePage(doc, y, h + 8);
  doc.setFillColor(options?.warning ? '#fff1f2' : '#ffffff');
  doc.roundedRect(x, y, w, h, 5, 5, 'F');
  doc.setDrawColor(options?.warning ? '#fecdd3' : '#e2e8f0');
  doc.roundedRect(x, y, w, h, 5, 5, 'S');

  doc.setFillColor(options?.accent || COLORS.blue);
  doc.roundedRect(x + 5, y + 6, 4, 11, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(options?.warning ? COLORS.red : COLORS.navy);
  doc.text(title, x + 13, y + 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(COLORS.slate);
  doc.text(lines, x + 13, y + 24);
  return y + h + 8;
};

const splitReportIntoSections = (report: string) => {
  const headings = [
    'Resumo da Triagem',
    'Análise Clínica Inicial',
    'Hipóteses Funcionais',
    'Triagem de Risco',
    'Sugestões de Avaliação',
    'Recomendações Iniciais',
  ];

  const sections = headings
    .map((title) => ({ title, body: extractSection(report, title) }))
    .filter((section) => section.body.trim().length > 0);

  if (sections.length) return sections;
  return [{ title: 'Relatório Clínico', body: report }];
};

const addFooter = (doc: jsPDF) => {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setDrawColor('#dbeafe');
    doc.line(PAGE.margin, PAGE.height - 14, PAGE.width - PAGE.margin, PAGE.height - 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(COLORS.muted);
    doc.text('FisioCareHub • Documento gerado automaticamente. Não substitui avaliação clínica presencial.', PAGE.margin, PAGE.height - 8);
    doc.text(`${i}/${pageCount}`, PAGE.width - PAGE.margin - 8, PAGE.height - 8);
  }
};

export const generateTriagePdf = (input: TriagePdfInput) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  addPageBackground(doc);
  addHeader(doc, input);

  let y = 64;
  y = addSummaryCards(doc, input, y);

  const report = getMainReport(input);
  const triage = input.triage || {};
  const form = input.formData || {};
  const redFlags = getRedFlagsLabel(input);
  const hasRedFlags = Boolean(triage.red_flag || (form.red_flags && Object.values(form.red_flags).some(Boolean)) || (redFlags && redFlags !== 'Não identificadas'));

  if (hasRedFlags) {
    y = addSection(
      doc,
      'Atenção: Red Flags Detectadas',
      `Sinais de alerta: ${redFlags}. Esta triagem identificou informações que podem exigir prioridade na avaliação e, se necessário, encaminhamento para avaliação médica.`,
      y,
      { accent: COLORS.red, warning: true }
    );
  }

  const sections = splitReportIntoSections(report);
  sections.forEach((section) => {
    const accent = section.title.toLowerCase().includes('risco')
      ? getSeverityColor(normalize(triage.gravidade || input.analysis?.gravidade, ''))
      : section.title.toLowerCase().includes('recomenda')
        ? COLORS.green
        : section.title.toLowerCase().includes('hipótese') || section.title.toLowerCase().includes('hipotes')
          ? COLORS.purple
          : COLORS.blue;
    y = addSection(doc, section.title, section.body, y, { accent });
  });

  y = ensurePage(doc, y, 38);
  y = addSection(
    doc,
    'Observação Profissional',
    'Este documento organiza a triagem inicial e deve ser interpretado pelo fisioterapeuta junto à avaliação física, anamnese completa e evolução clínica do paciente.',
    y,
    { accent: COLORS.cyan }
  );

  addFooter(doc);

  const patient = normalize(input.patientName || input.triage?.paciente?.nome_completo || 'paciente', 'paciente');
  const date = new Date(input.generatedAt || input.triage?.created_at || new Date()).toISOString().slice(0, 10);
  doc.save(`triagem_${safeFileName(patient)}_${date}.pdf`);
};
