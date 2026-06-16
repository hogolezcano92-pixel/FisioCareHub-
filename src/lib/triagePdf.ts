import { jsPDF } from 'jspdf';

type AnyRecord = Record<string, any>;

export interface TriagePdfInput {
  triage?: AnyRecord | null;
  analysis?: AnyRecord | null;
  formData?: AnyRecord | null;
  patientName?: string;
  professionalName?: string;
  generatedAt?: string;
  signatures?: TriagePdfSignature[];
}

export interface TriagePdfSignature {
  signer_role?: string | null;
  signer_name?: string | null;
  signer_email?: string | null;
  signature_level?: string | null;
  signature_status?: string | null;
  certificate_type?: string | null;
  document_hash?: string | null;
  verification_code?: string | null;
  verification_url?: string | null;
  signed_at?: string | null;
  created_at?: string | null;
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

const fixPortugueseTypos = (text: string) =>
  text
    .replace(/\bmedico\b/gi, (match) => (match[0] === 'M' ? 'Médico' : 'médico'))
    .replace(/Musculoesquelétic\s+o/gi, 'Musculoesquelético')
    .replace(/Musculoesqueletico/gi, 'Musculoesquelético')
    .replace(/\bmedio\b/gi, (match) => (match[0] === 'M' ? 'Médio' : 'médio'));

const safeFileName = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w.-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

const stripMarkdown = (text: string) =>
  fixPortugueseTypos(normalize(text, ''))
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*]\s+/gm, '• ')
    .replace(/^\s*\d+\.\s+/gm, '• ')
    .trim();

const formatDateBR = (dateValue?: string | Date) => {
  const date = dateValue ? new Date(dateValue) : new Date();
  const validDate = Number.isNaN(date.getTime()) ? new Date() : date;
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(validDate);
};

const formatDateTimeBR = (dateValue?: string | Date) => {
  const date = dateValue ? new Date(dateValue) : new Date();
  const validDate = Number.isNaN(date.getTime()) ? new Date() : date;
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(validDate);
};

const localDateForFileName = (dateValue?: string | Date) => {
  const date = dateValue ? new Date(dateValue) : new Date();
  const validDate = Number.isNaN(date.getTime()) ? new Date() : date;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(validDate);
  const get = (type: string) => parts.find((part) => part.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
};

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

const extractRedFlagsFromReport = (report: string) => {
  const riskSection = extractSection(report, 'Triagem de Risco');
  const source = riskSection || report;
  const match = source.match(/Red\s*Flags?\s*:\s*([^\n]+)/i);
  return match?.[1]?.replace(/[.;]+$/g, '').trim() || '';
};

const humanizeFlagKey = (key: string) => {
  const labels: Record<string, string> = {
    fraqueza_muscular: 'Fraqueza muscular presente',
    perda_forca: 'Perda de força presente',
    dormencia: 'Dormência ou alteração de sensibilidade',
    formigamento: 'Formigamento ou alteração neurológica',
    febre: 'Febre associada ao quadro',
    trauma: 'Histórico de trauma',
    perda_peso: 'Perda de peso inexplicada',
    dor_noturna: 'Dor noturna importante',
    incontinencia: 'Alteração urinária ou intestinal',
    tontura: 'Tontura associada ao quadro',
  };
  return labels[key] || key.replace(/_/g, ' ');
};

const getRedFlagsLabel = (input: TriagePdfInput, report = '') => {
  const triage = input.triage || {};
  const form = input.formData || {};
  const fromReport = extractRedFlagsFromReport(report);

  if (fromReport && !/sinais de alerta identificados/i.test(fromReport)) {
    return fixPortugueseTypos(fromReport);
  }

  if (triage.red_flags && !/sinais de alerta identificados/i.test(normalize(triage.red_flags))) {
    return fixPortugueseTypos(normalize(triage.red_flags));
  }

  const flags = form.red_flags || triage.red_flags_map || {};
  const active = Object.entries(flags)
    .filter(([, value]) => Boolean(value))
    .map(([key]) => humanizeFlagKey(key));

  if (active.length) return active.join(', ');
  if (triage.red_flag) return 'Sinais de alerta identificados';
  return 'Não identificadas';
};

const getPatientName = (input: TriagePdfInput) =>
  normalize(input.patientName || input.triage?.paciente?.nome_completo || input.triage?.paciente_nome || 'Paciente');

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
  const patientName = getPatientName(input);
  const generatedDate = input.generatedAt || new Date().toISOString();

  doc.setFillColor(COLORS.navy);
  doc.roundedRect(PAGE.margin, 12, PAGE.width - PAGE.margin * 2, 44, 7, 7, 'F');

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
  doc.text(`Paciente: ${patientName}`, 46, 44);
  doc.text(`Gerado em: ${formatDateBR(generatedDate)}`, 128, 44);

  doc.setFillColor(COLORS.cyan);
  doc.circle(180, 27, 3, 'F');
  doc.setDrawColor(COLORS.cyan);
  doc.setLineWidth(0.8);
  doc.line(160, 36, 166, 36);
  doc.line(166, 36, 169, 31);
  doc.line(169, 31, 174, 41);
  doc.line(174, 41, 178, 36);
  doc.line(178, 36, 190, 36);
};

const drawSummaryCard = (
  doc: jsPDF,
  card: { label: string; value: string; color: string },
  x: number,
  y: number,
  w: number,
  h: number
) => {
  doc.setFillColor('#ffffff');
  doc.roundedRect(x, y, w, h, 5, 5, 'F');
  doc.setDrawColor('#e2e8f0');
  doc.roundedRect(x, y, w, h, 5, 5, 'S');

  doc.setFillColor(card.color);
  doc.roundedRect(x + 5, y + 6, 3.2, h - 12, 1.6, 1.6, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(COLORS.muted);
  doc.text(card.label.toUpperCase(), x + 12, y + 10);

  const value = stripMarkdown(card.value);
  doc.setFont('helvetica', 'bold');
  let fontSize = 11;
  doc.setFontSize(fontSize);
  const maxTextWidth = w - 18;
  while (doc.getTextWidth(value) > maxTextWidth && fontSize > 8) {
    fontSize -= 0.5;
    doc.setFontSize(fontSize);
  }
  doc.setTextColor(COLORS.navy);
  const lines = doc.splitTextToSize(value, maxTextWidth).slice(0, 2);
  doc.text(lines, x + 12, y + 19);
};

const addSummaryCards = (doc: jsPDF, input: TriagePdfInput, y: number) => {
  const triage = input.triage || {};
  const analysis = input.analysis || {};
  const form = input.formData || {};
  const region = normalize(triage.regiao_dor || form.regiao_dor);
  const pain = normalize(triage.escala_dor ?? form.escala_dor, '—');
  const severity = normalize(triage.gravidade || analysis.gravidade, 'Não classificada');
  const classification = fixPortugueseTypos(normalize(triage.classificacao || analysis.classificacao, 'Não classificada'));

  const cards = [
    { label: 'Região', value: region, color: COLORS.blue },
    { label: 'Dor', value: pain === '—' ? pain : `${pain}/10`, color: COLORS.red },
    { label: 'Gravidade', value: severity, color: getSeverityColor(severity) },
    { label: 'Classificação', value: classification, color: COLORS.purple },
  ];

  const gap = 6;
  const cardW = (PAGE.width - PAGE.margin * 2 - gap) / 2;
  const cardH = 26;
  cards.forEach((card, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = PAGE.margin + col * (cardW + gap);
    const cardY = y + row * (cardH + gap);
    drawSummaryCard(doc, card, x, cardY, cardW, cardH);
  });
  return y + cardH * 2 + gap + 10;
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
  const lines = doc.splitTextToSize(cleanBody, w - 22);
  const h = Math.max(26, 20 + lines.length * 5.2);

  y = ensurePage(doc, y, h + 8);
  doc.setFillColor(options?.warning ? '#fff1f2' : '#ffffff');
  doc.roundedRect(x, y, w, h, 5, 5, 'F');
  doc.setDrawColor(options?.warning ? '#fecdd3' : '#e2e8f0');
  doc.roundedRect(x, y, w, h, 5, 5, 'S');

  doc.setFillColor(options?.accent || COLORS.blue);
  doc.roundedRect(x + 6, y + 6, 4, 12, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(options?.warning ? COLORS.red : COLORS.navy);
  doc.text(title, x + 15, y + 14.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(COLORS.slate);
  doc.text(lines, x + 15, y + 25);
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


const shortHash = (hash?: string | null) => {
  const clean = normalize(hash, '').replace(/\s+/g, '');
  if (!clean) return 'Hash não informado';
  return clean.length > 18 ? `${clean.slice(0, 10)}...${clean.slice(-8)}` : clean;
};

const roleLabel = (role?: string | null) => {
  const value = normalize(role, '').toLowerCase();
  if (value.includes('fisio')) return 'Fisioterapeuta';
  if (value.includes('paciente')) return 'Paciente';
  if (value.includes('admin')) return 'Admin';
  return normalize(role, 'Assinante');
};

const statusLabel = (status?: string | null) => {
  if (status === 'pending_external') return 'Pendente em provedor externo';
  if (status === 'signed') return 'Assinado eletronicamente';
  if (status === 'revoked') return 'Revogado';
  return normalize(status, 'Registrado');
};

const addDigitalSignatureSection = (doc: jsPDF, y: number, signatures?: TriagePdfSignature[]) => {
  const rows = (signatures || []).filter(Boolean);
  if (!rows.length) return y;

  y = ensurePage(doc, y, 50);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(COLORS.navy);
  doc.text('Assinaturas eletrônicas FisioCareHub', PAGE.margin, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(COLORS.muted);
  doc.text('Registro com identidade do assinante, data/hora, hash SHA-256 e código público de verificação.', PAGE.margin, y + 5.5, { maxWidth: PAGE.width - PAGE.margin * 2 });
  y += 12;

  rows.forEach((signature) => {
    y = ensurePage(doc, y, 36);
    const boxH = 31;
    const isPhysio = normalize(signature.signer_role, '').toLowerCase().includes('fisio');
    const accent = isPhysio ? COLORS.cyan : COLORS.purple;

    doc.setFillColor('#ffffff');
    doc.roundedRect(PAGE.margin, y, PAGE.width - PAGE.margin * 2, boxH, 5, 5, 'F');
    doc.setDrawColor('#e2e8f0');
    doc.roundedRect(PAGE.margin, y, PAGE.width - PAGE.margin * 2, boxH, 5, 5, 'S');
    doc.setFillColor(accent);
    doc.roundedRect(PAGE.margin + 5, y + 5, 3.2, boxH - 10, 1.6, 1.6, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(COLORS.navy);
    doc.text(`${roleLabel(signature.signer_role)} • ${normalize(signature.signer_name, 'Nome não informado')}`, PAGE.margin + 12, y + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(COLORS.slate);
    const signedAt = signature.signed_at || signature.created_at;
    doc.text(`Status: ${statusLabel(signature.signature_status)}${signedAt ? ` em ${formatDateTimeBR(signedAt)}` : ''}`, PAGE.margin + 12, y + 14);
    doc.text(`E-mail: ${normalize(signature.signer_email, 'Não informado')}`, PAGE.margin + 12, y + 19);
    doc.text(`Hash: ${shortHash(signature.document_hash)} • Código: ${normalize(signature.verification_code, 'Não informado')}`, PAGE.margin + 12, y + 24, { maxWidth: PAGE.width - PAGE.margin * 2 - 24 });

    if (signature.verification_url) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(COLORS.blue);
      doc.text(`Verificar: ${signature.verification_url}`, PAGE.margin + 12, y + 29, { maxWidth: PAGE.width - PAGE.margin * 2 - 24 });
    }
    y += boxH + 8;
  });

  return y + 2;
};

const addFooter = (doc: jsPDF, generatedAt?: string) => {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setDrawColor('#dbeafe');
    doc.line(PAGE.margin, PAGE.height - 14, PAGE.width - PAGE.margin, PAGE.height - 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(COLORS.muted);
    doc.text(`FisioCareHub • Triagem inteligente • Gerado em ${formatDateBR(generatedAt || new Date().toISOString())}`, PAGE.margin, PAGE.height - 8);
    doc.text(`${i}/${pageCount}`, PAGE.width - PAGE.margin - 8, PAGE.height - 8);
  }
};

export const generateTriagePdf = (input: TriagePdfInput) => {
  const generatedAt = input.generatedAt || new Date().toISOString();
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  addPageBackground(doc);
  addHeader(doc, { ...input, generatedAt });

  let y = 66;
  y = addSummaryCards(doc, input, y);

  const report = getMainReport(input);
  const triage = input.triage || {};
  const form = input.formData || {};
  const redFlags = getRedFlagsLabel(input, report);
  const hasRedFlags = Boolean(
    triage.red_flag ||
    (form.red_flags && Object.values(form.red_flags).some(Boolean)) ||
    (redFlags && redFlags !== 'Não identificadas')
  );

  if (hasRedFlags) {
    const redFlagText = redFlags === 'Sinais de alerta identificados'
      ? 'Sinais de alerta identificados. Priorizar avaliação clínica e investigar possíveis critérios de encaminhamento.'
      : `Red flag identificada: ${redFlags}. Priorizar avaliação clínica e considerar encaminhamento médico se houver piora, déficit neurológico progressivo ou sinais associados.`;

    y = addSection(
      doc,
      'Atenção: Red Flags Detectadas',
      redFlagText,
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

  y = addDigitalSignatureSection(doc, y, input.signatures);

  y = ensurePage(doc, y, 38);
  addSection(
    doc,
    'Observação Profissional',
    'Este documento organiza a triagem inicial e deve ser interpretado pelo fisioterapeuta junto à avaliação física, anamnese completa e evolução clínica do paciente. Não substitui avaliação presencial nem diagnóstico médico.',
    y,
    { accent: COLORS.cyan }
  );

  addFooter(doc, generatedAt);

  const patient = normalize(input.patientName || input.triage?.paciente?.nome_completo || 'paciente', 'paciente');
  const date = localDateForFileName(generatedAt);
  doc.save(`triagem_${safeFileName(patient)}_${date}.pdf`);
};
