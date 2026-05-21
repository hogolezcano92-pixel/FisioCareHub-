import { jsPDF } from 'jspdf';

type AnyRecord = Record<string, any>;

type PdfDocumentPayload = {
  id?: string;
  type?: string;
  document_name?: string;
  patient_name?: string;
  patient_email?: string;
  physio_name?: string;
  content?: string;
  criado_em?: string;
  created_at?: string;
  [key: string]: any;
};

type PdfOptions = {
  profile?: AnyRecord | null;
  fileName?: string;
  download?: boolean;
};

type Rgb = [number, number, number];

const COLORS = {
  navy: [15, 23, 42] as Rgb,
  slate: [51, 65, 85] as Rgb,
  muted: [100, 116, 139] as Rgb,
  border: [226, 232, 240] as Rgb,
  paper: [248, 250, 252] as Rgb,
  white: [255, 255, 255] as Rgb,
  blue: [37, 99, 235] as Rgb,
  sky: [14, 165, 233] as Rgb,
  emerald: [16, 185, 129] as Rgb,
  amber: [245, 158, 11] as Rgb,
  rose: [244, 63, 94] as Rgb,
  purple: [124, 58, 237] as Rgb,
  softBlue: [239, 246, 255] as Rgb,
  softAmber: [255, 251, 235] as Rgb,
};

const MARGIN = 16;
const PAGE_W = 210;
const PAGE_H = 297;
const CONTENT_W = PAGE_W - MARGIN * 2;
const FOOTER_TOP = PAGE_H - 22;

const safe = (value: any, fallback = 'Não informado') => {
  const text = String(value ?? '').trim();
  return text || fallback;
};

const sanitizeFileName = (name: string) =>
  safe(name, 'documento')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase();

const formatDateTime = (value?: any) => {
  const date = value ? new Date(value) : new Date();
  const validDate = Number.isNaN(date.getTime()) ? new Date() : date;
  return validDate.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getDocTitle = (payload: PdfDocumentPayload) =>
  safe(payload.document_name || payload.type || 'Documento Fisioterapêutico');

const getAccent = (title: string): Rgb => {
  const lower = title.toLowerCase();
  if (lower.includes('contrato')) return COLORS.blue;
  if (lower.includes('atestado')) return COLORS.emerald;
  if (lower.includes('autoriz')) return COLORS.amber;
  if (lower.includes('laudo') || lower.includes('relatório') || lower.includes('relatorio')) return COLORS.purple;
  return COLORS.sky;
};

const getShortId = (payload: PdfDocumentPayload) => {
  const base = safe(payload.id, `FCH-${Date.now()}`);
  const clean = base.replace(/[^a-zA-Z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
  const parts = clean.split('-').filter(Boolean);
  if (parts.length >= 2) return `${parts[0]}-${parts[1]}`.slice(0, 17).replace(/-$/g, '');
  return clean.length > 16 ? clean.slice(0, 16).replace(/-$/g, '') : clean;
};

const getPhysioName = (payload: PdfDocumentPayload, profile?: AnyRecord | null) =>
  safe(payload.physio_name || profile?.nome_completo || profile?.name, 'Fisioterapeuta não informado');

const getCrefito = (profile?: AnyRecord | null) =>
  safe(profile?.crefito || profile?.registro_profissional || profile?.numero_registro || profile?.crefito_numero, 'CREFITO não informado');

const isMissing = (value: string) => {
  const lower = safe(value, '').toLowerCase();
  return !lower || lower === 'não informado' || lower === 'nao informado' || lower.includes('[não informado]') || lower.includes('[nao informado]');
};

function setColor(doc: jsPDF, color: Rgb, mode: 'text' | 'fill' | 'draw' = 'text') {
  if (mode === 'text') doc.setTextColor(color[0], color[1], color[2]);
  if (mode === 'fill') doc.setFillColor(color[0], color[1], color[2]);
  if (mode === 'draw') doc.setDrawColor(color[0], color[1], color[2]);
}

function addHeader(doc: jsPDF, title: string, accent: Rgb, documentId: string) {
  setColor(doc, COLORS.navy, 'fill');
  doc.rect(0, 0, PAGE_W, 39, 'F');

  setColor(doc, accent, 'fill');
  doc.roundedRect(MARGIN, 11, 11, 11, 3, 3, 'F');
  setColor(doc, COLORS.sky, 'fill');
  doc.circle(MARGIN + 8.5, 13.5, 1.2, 'F');

  setColor(doc, COLORS.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('FisioCareHub', MARGIN + 16, 18);

  setColor(doc, [203, 213, 225]);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.text('REABILITAÇÃO & PERFORMANCE', MARGIN + 16, 23);

  setColor(doc, COLORS.white);
  doc.setFontSize(12);
  doc.text(title, PAGE_W - MARGIN, 17, { align: 'right' });

  setColor(doc, [148, 163, 184]);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Documento fisioterapêutico', PAGE_W - MARGIN, 23, { align: 'right' });
  doc.text(`ID: ${documentId}`, PAGE_W - MARGIN, 29, { align: 'right' });
}

function addFooter(doc: jsPDF, payload: PdfDocumentPayload, profile?: AnyRecord | null, documentId?: string) {
  setColor(doc, [241, 245, 249], 'fill');
  doc.rect(0, FOOTER_TOP, PAGE_W, PAGE_H - FOOTER_TOP, 'F');

  setColor(doc, COLORS.border, 'draw');
  doc.line(MARGIN, FOOTER_TOP, PAGE_W - MARGIN, FOOTER_TOP);

  setColor(doc, COLORS.muted);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.3);
  doc.text('DOCUMENTO GERADO VIA FISIOCAREHUB', MARGIN, FOOTER_TOP + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.1);
  const footerLine = `Profissional: ${getPhysioName(payload, profile)} • ${getCrefito(profile)} • ID: ${safe(documentId, getShortId(payload))}`;
  doc.text(doc.splitTextToSize(footerLine, CONTENT_W - 32)[0], MARGIN, FOOTER_TOP + 11);
  doc.text(`Gerado em: ${formatDateTime(payload.criado_em || payload.created_at || new Date())}`, MARGIN, FOOTER_TOP + 16);

  const page = String(doc.getCurrentPageInfo().pageNumber);
  doc.text(`Página ${page}`, PAGE_W - MARGIN, FOOTER_TOP + 16, { align: 'right' });
}

function ensureSpace(doc: jsPDF, y: number, needed: number, payload: PdfDocumentPayload, profile: AnyRecord | null | undefined, documentId: string) {
  if (y + needed > FOOTER_TOP - 8) {
    addFooter(doc, payload, profile, documentId);
    doc.addPage();
    addHeader(doc, getDocTitle(payload), getAccent(getDocTitle(payload)), documentId);
    return 49;
  }
  return y;
}

function normalizeContent(content: string, payload: PdfDocumentPayload, profile?: AnyRecord | null) {
  const physio = getPhysioName(payload, profile);
  const crefito = getCrefito(profile);
  return safe(content, 'Nenhum conteúdo informado.')
    .replace(/\r\n/g, '\n')
    .replace(/\*\*/g, '')
    .replace(/^[#]+\s*/gm, '')
    .replace(/utilizândose/gi, 'utilizando-se')
    .replace(/utilizando-se de técnicas/gi, 'utilizando técnicas')
    .replace(/\[(Nome do Fisioterapeuta|Número de Registro|Numero de Registro|Data de Nascimento|Endereço Completo|Endereco Completo|Número de Telefone|Numero de Telefone|E-mail|Período de vigência|Periodo de vigencia|Período de antecedência|Periodo de antecedencia|Valor por Sessão|Valor por Sessao|Especificar forma de pagamento[^\]]*)\]/gi, 'A definir antes da assinatura')
    .replace(/(Fisioterapeuta:\s*)(Não informado|Nao informado)/gi, `$1${physio}`)
    .replace(/(CREFITO(?: do Fisioterapeuta)?:\s*)(Não informado|Nao informado)/gi, `$1${crefito}`)
    .replace(/(Paciente:\s*)(Não informado|Nao informado)/gi, `$1${safe(payload.patient_name)}`)
    .trim();
}

function extractField(content: string, labels: string[], fallback = 'A definir antes da assinatura') {
  for (const label of labels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = content.match(new RegExp(`${escaped}\\s*:?\\s*([^\\n•-]+)`, 'i'));
    if (match?.[1]) {
      const value = match[1].replace(/^[:\s-]+/, '').trim();
      return isMissing(value) ? fallback : value;
    }
  }
  return fallback;
}


function cleanExtractedValue(value: string) {
  let text = safe(value, 'A definir antes da assinatura')
    .replace(/^(é|e|será|sera|foi|ficou)\s+/i, '')
    .replace(/^o\s+tipo\s+de\s+servi[cç]o\s+a\s+ser\s+prestado\s+(é|e)\s*:?\s*/i, '')
    .replace(/^a\s+forma\s+de\s+pagamento\s+(é|e)\s*:?\s*/i, '')
    .replace(/^o\s+valor\s+(por\s+sess[aã]o\s+)?(é|e)\s*:?\s*/i, '')
    .replace(/^a\s+frequ[eê]ncia\s+(das\s+sessões|das\s+sessoes)?\s*(é|e)\s*:?\s*/i, '')
    .replace(/^o\s+local\s+do\s+atendimento\s+(é|e)\s*:?\s*/i, '')
    .replace(/^a\s+dura[cç][aã]o\s+da\s+sess[aã]o\s+(é|e)\s*:?\s*/i, '')
    .replace(/[.;]+$/g, '')
    .trim();
  return text || 'A definir antes da assinatura';
}

function contractField(content: string, labels: string[], fallback = 'A definir antes da assinatura') {
  return cleanExtractedValue(extractField(content, labels, fallback));
}

function moneyLabel(value: string) {
  const text = cleanExtractedValue(value);
  if (text === 'A definir antes da assinatura' || /^r\$/i.test(text)) return text;
  if (/^\d+(?:[.,]\d{1,2})?$/.test(text.trim())) return `R$ ${text.trim()}`;
  return text;
}

function parseBRLCurrency(value: string) {
  const raw = String(value || '').trim();
  if (!raw || raw === 'A definir antes da assinatura') return NaN;

  const normalized = raw
    .replace(/R\$|BRL/gi, '')
    .replace(/\s/g, '')
    .replace(/[^\d,.-]/g, '');

  if (!normalized) return NaN;

  const hasComma = normalized.includes(',');
  const hasDot = normalized.includes('.');

  let numericText = normalized;

  if (hasComma && hasDot) {
    // pt-BR: 1.250,00 -> 1250.00
    numericText = normalized.replace(/\./g, '').replace(',', '.');
  } else if (hasComma) {
    // pt-BR decimal: 250,00 -> 250.00
    numericText = normalized.replace(',', '.');
  } else if (hasDot) {
    const parts = normalized.split('.');
    const last = parts[parts.length - 1];
    // Treat 1.250 as thousands, but 250.50 as decimal.
    numericText = last.length === 3 && parts.length > 1 ? normalized.replace(/\./g, '') : normalized;
  }

  const parsed = Number(numericText);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function parseSessionCount(value: string) {
  const match = String(value || '').match(/\d+/);
  return match ? Number(match[0]) : NaN;
}

function formatCurrencyBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function estimateContractTotal(sessionValue: string, sessions: string) {
  const valueNumber = parseBRLCurrency(sessionValue);
  const sessionNumber = parseSessionCount(sessions);

  if (!Number.isFinite(valueNumber) || !Number.isFinite(sessionNumber) || valueNumber <= 0 || sessionNumber <= 0) {
    return 'Conforme sessões efetivamente realizadas/contratadas';
  }

  const total = valueNumber * sessionNumber;
  return `${formatCurrencyBRL(total)} no total para ${sessionNumber} sessões (${sessionNumber} x ${formatCurrencyBRL(valueNumber)})`;
}

function hasContractRequiredMissing(content: string) {
  const required = [
    extractField(content, ['Tipo de serviço', 'Tipo de servico', 'Serviço contratado', 'Servico contratado']),
    extractField(content, ['Número de Sessões', 'Numero de Sessoes', 'Quantidade de Sessões']),
    extractField(content, ['Valor da Sessão', 'Valor por Sessão', 'Valor da Sessao']),
    extractField(content, ['Forma de Pagamento', 'Pagamento']),
    extractField(content, ['Frequência das Sessões', 'Frequencia das Sessoes', 'Frequência']),
    extractField(content, ['Duração da sessão', 'Duracao da sessao', 'Tempo de sessão']),
    extractField(content, ['Local do atendimento', 'Local de atendimento', 'Modalidade']),
    extractField(content, ['Vigência', 'Vigencia', 'Período de vigência']),
    extractField(content, ['Política de cancelamento', 'Politica de cancelamento', 'Cancelamento']),
  ];
  return required.some((value) => value === 'A definir antes da assinatura' || isMissing(value));
}

function infoCard(doc: jsPDF, label: string, value: string, x: number, y: number, w: number, accent?: Rgb) {
  setColor(doc, COLORS.white, 'fill');
  setColor(doc, COLORS.border, 'draw');
  doc.roundedRect(x, y, w, 18, 4, 4, 'FD');
  if (accent) {
    setColor(doc, accent, 'fill');
    doc.roundedRect(x, y, 2.5, 18, 1.2, 1.2, 'F');
  }

  setColor(doc, COLORS.muted);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.4);
  doc.text(label.toUpperCase(), x + 5, y + 6);

  setColor(doc, COLORS.navy);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  const lines = doc.splitTextToSize(value, w - 10).slice(0, 2);
  doc.text(lines, x + 5, y + 12, { maxWidth: w - 10 });
}

function drawStatusPill(doc: jsPDF, text: string, x: number, y: number, color: Rgb) {
  const w = Math.max(25, doc.getTextWidth(text) + 8);
  setColor(doc, color, 'fill');
  doc.roundedRect(x, y, w, 7, 3.5, 3.5, 'F');
  setColor(doc, COLORS.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.3);
  doc.text(text, x + w / 2, y + 4.8, { align: 'center' });
  return w;
}

function drawTitleBlock(doc: jsPDF, payload: PdfDocumentPayload, profile: AnyRecord | null | undefined, accent: Rgb, isDraft: boolean) {
  const title = getDocTitle(payload);
  let y = 50;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  setColor(doc, COLORS.navy);
  doc.text(title, MARGIN, y);

  if (isDraft) drawStatusPill(doc, 'RASCUNHO • DADOS PENDENTES', PAGE_W - MARGIN - 48, y - 5.7, COLORS.amber);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  setColor(doc, accent);
  doc.text('DOCUMENTO PROFISSIONAL • FISIOTERAPIA', MARGIN, y + 7);

  setColor(doc, COLORS.muted);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.4);
  const subtitle = isDraft
    ? 'Modelo preliminar gerado automaticamente. Complete os campos pendentes antes de assinatura ou envio.'
    : 'Documento gerado para apoio administrativo fisioterapêutico.';
  doc.text(subtitle, MARGIN, y + 13, { maxWidth: CONTENT_W });

  y += 23;

  const gap = 6;
  const colW = (CONTENT_W - gap) / 2;
  infoCard(doc, 'Paciente', safe(payload.patient_name), MARGIN, y, colW, accent);
  infoCard(doc, 'Fisioterapeuta', getPhysioName(payload, profile), MARGIN + colW + gap, y, colW, accent);
  y += 22;
  infoCard(doc, 'E-mail do paciente', safe(payload.patient_email), MARGIN, y, colW, accent);
  infoCard(doc, 'Registro profissional', getCrefito(profile), MARGIN + colW + gap, y, colW, accent);

  return y + 27;
}

function addNoticeBox(doc: jsPDF, y: number, payload: PdfDocumentPayload, profile: AnyRecord | null | undefined, accent: Rgb, title: string, body: string, documentId: string) {
  const lines = doc.splitTextToSize(body, CONTENT_W - 20);
  const h = 18 + lines.length * 4.2;
  y = ensureSpace(doc, y, h + 8, payload, profile, documentId);

  setColor(doc, COLORS.softAmber, 'fill');
  setColor(doc, [253, 230, 138], 'draw');
  doc.roundedRect(MARGIN, y, CONTENT_W, h, 5, 5, 'FD');

  setColor(doc, accent, 'fill');
  doc.roundedRect(MARGIN + 5, y + 5, 3, h - 10, 1.5, 1.5, 'F');

  setColor(doc, COLORS.navy);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.8);
  doc.text(title, MARGIN + 13, y + 9);

  setColor(doc, COLORS.slate);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.1);
  doc.text(lines, MARGIN + 13, y + 16, { maxWidth: CONTENT_W - 20 });

  return y + h + 8;
}

function drawSection(doc: jsPDF, title: string, body: string, y: number, payload: PdfDocumentPayload, profile: AnyRecord | null | undefined, accent: Rgb, documentId: string) {
  const cleanBody = safe(body, 'Não informado');
  const lines = doc.splitTextToSize(cleanBody, CONTENT_W - 17);
  const h = Math.max(24, 16 + lines.length * 4.6);
  y = ensureSpace(doc, y, h + 8, payload, profile, documentId);

  setColor(doc, COLORS.white, 'fill');
  setColor(doc, COLORS.border, 'draw');
  doc.roundedRect(MARGIN, y, CONTENT_W, h, 5, 5, 'FD');

  setColor(doc, accent, 'fill');
  doc.roundedRect(MARGIN + 5, y + 5, 3, h - 10, 1.5, 1.5, 'F');

  setColor(doc, COLORS.navy);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.2);
  doc.text(title, MARGIN + 12, y + 9.5);

  setColor(doc, COLORS.slate);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.4);
  doc.text(lines, MARGIN + 12, y + 17, { maxWidth: CONTENT_W - 17 });

  return y + h + 8;
}

function drawMiniTable(doc: jsPDF, title: string, rows: Array<[string, string]>, y: number, payload: PdfDocumentPayload, profile: AnyRecord | null | undefined, accent: Rgb, documentId: string) {
  const labelW = 60;
  const valueW = CONTENT_W - labelW - 16;
  const preparedRows = rows.map(([label, value]) => {
    const cleanValue = safe(value, 'A definir antes da assinatura');
    const valueLines = doc.splitTextToSize(cleanValue, valueW).slice(0, 3);
    const rowH = Math.max(9.5, 5 + valueLines.length * 4.2);
    return { label, value: cleanValue, valueLines, rowH };
  });

  const h = 16 + preparedRows.reduce((sum, row) => sum + row.rowH, 0);
  y = ensureSpace(doc, y, h + 8, payload, profile, documentId);

  setColor(doc, COLORS.white, 'fill');
  setColor(doc, COLORS.border, 'draw');
  doc.roundedRect(MARGIN, y, CONTENT_W, h, 5, 5, 'FD');

  setColor(doc, COLORS.navy);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.2);
  doc.text(title, MARGIN + 6, y + 9.5);

  let rowY = y + 16;
  preparedRows.forEach((row, index) => {
    if (index % 2 === 0) {
      setColor(doc, [248, 250, 252], 'fill');
      doc.rect(MARGIN + 1, rowY - 6.3, CONTENT_W - 2, row.rowH, 'F');
    }
    setColor(doc, COLORS.muted);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.6);
    doc.text(row.label, MARGIN + 6, rowY);

    setColor(doc, isMissing(row.value) || row.value.includes('A definir') ? COLORS.amber : COLORS.navy);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.8);
    doc.text(row.valueLines, MARGIN + labelW + 6, rowY, { maxWidth: valueW });
    rowY += row.rowH;
  });

  return y + h + 8;
}

function parseSections(content: string) {
  const rawLines = content.split('\n').map((line) => line.trim()).filter(Boolean);
  const sections: Array<{ title: string; body: string }> = [];
  let currentTitle = 'Conteúdo do documento';
  let current: string[] = [];

  const skipHeading = /^(assinatura|assinaturas|identificação das partes|identificacao das partes|contrato de prestação|contrato de prestacao)$/i;

  for (const raw of rawLines) {
    const line = raw.replace(/^[-*]\s*/, '• ');
    const clean = line.replace(/^\d+\.\s*/, '').replace(/:$/, '').trim();
    if (skipHeading.test(clean)) continue;
    if (/^•\s*(Paciente|Fisioterapeuta|CREFITO|Assinatura|Paciente:|Fisioterapeuta:)\b/i.test(line)) continue;
    if (/^Documento sujeito à revisão/i.test(line)) continue;

    const isHeading =
      /^(\d+\.|[IVX]+\.)\s+/.test(raw) ||
      /^(Objeto|Sessões|Sessoes|Valores|Pagamento|Cancelamento|Responsabilidades|Confidencialidade|LGPD|Não Garantia|Nao Garantia|Foro|Solução|Solucao|Autorização|Autorizacao|Finalidade|Atestado|Declaração|Declaracao|Laudo|Relatório|Relatorio|Avaliação|Avaliacao|Conduta|Conclusão|Conclusao)/i.test(raw);

    if (isHeading && current.length > 0) {
      sections.push({ title: currentTitle, body: current.join('\n') });
      currentTitle = clean;
      current = [];
    } else if (isHeading && current.length === 0) {
      currentTitle = clean;
    } else {
      current.push(line);
    }
  }

  if (current.length > 0) sections.push({ title: currentTitle, body: current.join('\n') });
  return sections.filter((section) => section.body.trim().length > 0).slice(0, 14);
}

function drawContractBody(doc: jsPDF, y: number, payload: PdfDocumentPayload, profile: AnyRecord | null | undefined, accent: Rgb, documentId: string, cleanContent: string) {
  const physio = getPhysioName(payload, profile);
  const crefito = getCrefito(profile);
  const patient = safe(payload.patient_name);
  const patientEmail = safe(payload.patient_email, 'A definir antes da assinatura');

  const serviceType = contractField(cleanContent, ['Tipo de serviço', 'Tipo de servico', 'Serviço contratado', 'Servico contratado']);
  const location = contractField(cleanContent, ['Local do atendimento', 'Local de atendimento', 'Modalidade']);
  const duration = contractField(cleanContent, ['Duração da sessão', 'Duracao da sessao', 'Tempo de sessão']);
  const sessions = contractField(cleanContent, ['Número de Sessões', 'Numero de Sessoes', 'Quantidade de Sessões']);
  const frequency = contractField(cleanContent, ['Frequência das Sessões', 'Frequencia das Sessoes', 'Frequência']);
  const sessionValue = moneyLabel(contractField(cleanContent, ['Valor da Sessão', 'Valor por Sessão', 'Valor da Sessao']));
  const payment = contractField(cleanContent, ['Forma de Pagamento', 'Pagamento']);
  const validity = contractField(cleanContent, ['Vigência', 'Vigencia', 'Período de vigência']);
  const cancellation = contractField(cleanContent, ['Política de cancelamento', 'Politica de cancelamento', 'Cancelamento'], '24 horas de antecedência');
  const objective = contractField(cleanContent, ['Objetivo do tratamento', 'Objetivo terapêutico', 'Objetivo terapeutico'], 'Avaliação, tratamento, prevenção, reabilitação funcional e acompanhamento fisioterapêutico conforme necessidade clínica do paciente.');
  const estimatedTotal = estimateContractTotal(sessionValue, sessions);

  y = drawMiniTable(
    doc,
    '1. Identificação das Partes',
    [
      ['Paciente', patient],
      ['E-mail do paciente', patientEmail],
      ['Fisioterapeuta responsável', physio],
      ['Registro profissional', crefito],
    ],
    y,
    payload,
    profile,
    accent,
    documentId,
  );

  y = drawSection(
    doc,
    '2. Objeto do Contrato',
    `O presente contrato tem por objeto a prestação de serviços fisioterapêuticos na modalidade "${serviceType}", incluindo avaliação funcional, planejamento terapêutico, execução de condutas fisioterapêuticas, orientações domiciliares, acompanhamento da evolução clínica e registros profissionais necessários. Objetivo terapêutico informado: ${objective}`,
    y,
    payload,
    profile,
    accent,
    documentId,
  );

  y = drawMiniTable(
    doc,
    '3. Plano de Atendimento',
    [
      ['Tipo de serviço', serviceType],
      ['Local/modalidade', location],
      ['Duração da sessão', duration],
      ['Número de sessões', sessions],
      ['Frequência das sessões', frequency],
      ['Vigência', validity],
    ],
    y,
    payload,
    profile,
    accent,
    documentId,
  );

  y = drawMiniTable(
    doc,
    '4. Valores, Pagamento e Condições Comerciais',
    [
      ['Valor por sessão', sessionValue],
      ['Estimativa do pacote', estimatedTotal],
      ['Forma de pagamento', payment],
      ['Vencimento/condição', 'Conforme combinado entre as partes e registrado pelo profissional responsável'],
    ],
    y,
    payload,
    profile,
    accent,
    documentId,
  );

  y = drawSection(
    doc,
    '5. Cancelamento, Faltas e Reagendamento',
    `Cancelamentos e reagendamentos deverão ser comunicados com antecedência mínima de ${cancellation}. Quando houver ausência sem comunicação prévia dentro do prazo acordado, a sessão poderá ser considerada realizada para fins administrativos, conforme alinhamento entre as partes. Reagendamentos dependerão da disponibilidade de agenda do fisioterapeuta.`,
    y,
    payload,
    profile,
    accent,
    documentId,
  );

  y = drawSection(
    doc,
    '6. Responsabilidades do Fisioterapeuta',
    'O fisioterapeuta compromete-se a prestar atendimento com zelo, ética, diligência técnica, respeito à autonomia do paciente, sigilo profissional e observância das normas aplicáveis à fisioterapia. Também deverá orientar o paciente sobre objetivos, limites, riscos previsíveis, benefícios esperados e condutas propostas.',
    y,
    payload,
    profile,
    accent,
    documentId,
  );

  y = drawSection(
    doc,
    '7. Responsabilidades do Paciente',
    'O paciente compromete-se a fornecer informações verdadeiras sobre seu estado de saúde, histórico clínico, medicações, exames, dor, limitações e intercorrências; comparecer aos atendimentos agendados; seguir as orientações recebidas; comunicar piora, novos sintomas ou impedimentos; e efetuar os pagamentos conforme acordado.',
    y,
    payload,
    profile,
    accent,
    documentId,
  );

  y = drawSection(
    doc,
    '8. Consentimento, Segurança e Limites do Atendimento',
    'O paciente declara estar ciente de que o atendimento fisioterapêutico envolve avaliação funcional, procedimentos terapêuticos, exercícios, orientações e acompanhamento clínico-funcional. O fisioterapeuta poderá ajustar a conduta conforme evolução, tolerância, resposta ao tratamento e critérios técnicos. Havendo sinais de alerta, piora clínica ou necessidade de investigação complementar, poderá ser recomendado encaminhamento para avaliação médica ou outro profissional de saúde.',
    y,
    payload,
    profile,
    accent,
    documentId,
  );

  y = drawSection(
    doc,
    '9. LGPD, Confidencialidade e Registro Clínico',
    'As informações pessoais e dados de saúde serão tratados com confidencialidade e utilizados para fins assistenciais, administrativos, registro clínico, comunicação com o paciente e cumprimento de obrigações legais/profissionais. O acesso aos dados deverá observar segurança, finalidade, necessidade e demais princípios aplicáveis à proteção de dados.',
    y,
    payload,
    profile,
    accent,
    documentId,
  );

  y = drawSection(
    doc,
    '10. Não Garantia de Resultado',
    'A fisioterapia constitui prestação de serviço técnico-assistencial e não promessa de cura ou resultado específico. A evolução depende de fatores individuais, condição clínica, adesão ao tratamento, frequência, hábitos, resposta biológica e continuidade das orientações.',
    y,
    payload,
    profile,
    accent,
    documentId,
  );

  y = drawSection(
    doc,
    '11. Comunicação e Documentos',
    'As partes poderão utilizar meios eletrônicos para agendamento, confirmação de horários, envio de orientações, documentos, recibos e comunicações administrativas. Quando necessário, documentos complementares poderão ser emitidos pelo FisioCareHub ou pelo profissional responsável.',
    y,
    payload,
    profile,
    accent,
    documentId,
  );

  y = drawSection(
    doc,
    '12. Foro e Solução de Conflitos',
    'Eventuais dúvidas ou divergências deverão ser resolvidas preferencialmente por diálogo e negociação direta entre as partes. Persistindo o conflito, será utilizado o foro competente conforme a legislação brasileira aplicável.',
    y,
    payload,
    profile,
    accent,
    documentId,
  );

  y = drawSection(
    doc,
    '13. Declaração Final',
    'As partes declaram que leram, compreenderam e concordam com as condições deste contrato, autorizando a prestação dos serviços fisioterapêuticos nos termos aqui estabelecidos.',
    y,
    payload,
    profile,
    accent,
    documentId,
  );

  return y;
}

function addSignatureArea(doc: jsPDF, y: number, payload: PdfDocumentPayload, profile: AnyRecord | null | undefined, documentId: string) {
  y = ensureSpace(doc, y, 52, payload, profile, documentId);

  setColor(doc, COLORS.navy);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('Assinaturas', MARGIN, y);

  y += 17;
  const lineW = (CONTENT_W - 14) / 2;
  setColor(doc, COLORS.slate, 'draw');
  doc.line(MARGIN, y, MARGIN + lineW, y);
  doc.line(MARGIN + lineW + 14, y, MARGIN + lineW * 2 + 14, y);

  setColor(doc, COLORS.navy);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Paciente / Responsável', MARGIN, y + 6);
  doc.text('Fisioterapeuta', MARGIN + lineW + 14, y + 6);

  setColor(doc, COLORS.muted);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.text(safe(payload.patient_name), MARGIN, y + 11, { maxWidth: lineW });
  doc.text(getPhysioName(payload, profile), MARGIN + lineW + 14, y + 11, { maxWidth: lineW });
  doc.text('Data: ____/____/________', MARGIN, y + 21);
  doc.text(`CREFITO: ${getCrefito(profile)}`, MARGIN + lineW + 14, y + 21, { maxWidth: lineW });

  return y + 32;
}

export function generateLegalDocumentPDF(payload: PdfDocumentPayload, options: PdfOptions = {}) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const title = getDocTitle(payload);
  const accent = getAccent(title);
  const documentId = getShortId(payload);
  const cleanContent = normalizeContent(payload.content || '', payload, options.profile);
  const isContract = /contrato/i.test(title);
  const isDraft = isContract && hasContractRequiredMissing(cleanContent);

  setColor(doc, COLORS.paper, 'fill');
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F');
  addHeader(doc, title, accent, documentId);

  let y = drawTitleBlock(doc, payload, options.profile, accent, isDraft);

  if (isContract) {
    if (isDraft) {
      y = addNoticeBox(
        doc,
        y,
        payload,
        options.profile,
        accent,
        'Atenção: contrato em rascunho',
        'Este contrato possui dados obrigatórios pendentes. Complete tipo de serviço, local, duração, número de sessões, valor, pagamento, frequência, vigência e política de cancelamento antes de coletar assinatura.',
        documentId,
      );
    }
    y = drawContractBody(doc, y, payload, options.profile, accent, documentId, cleanContent);
  } else {
    y = addNoticeBox(
      doc,
      y,
      payload,
      options.profile,
      accent,
      'Observações de segurança documental',
      'Revise os dados antes de assinatura, envio ao paciente ou anexação ao prontuário. Este documento é um modelo administrativo gerado pelo sistema e pode precisar de adequação conforme o caso concreto.',
      documentId,
    );
    const sections = parseSections(cleanContent);
    if (sections.length === 0) {
      y = drawSection(doc, 'Conteúdo do documento', cleanContent, y, payload, options.profile, accent, documentId);
    } else {
      sections.forEach((section) => {
        y = drawSection(doc, section.title, section.body, y, payload, options.profile, accent, documentId);
      });
    }
  }

  if (/contrato|autorização|autorizacao|atestado|laudo|relatório|relatorio/i.test(title)) {
    y = addSignatureArea(doc, y, payload, options.profile, documentId);
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    addFooter(doc, payload, options.profile, documentId);
  }

  const fileName = options.fileName || `${title}-${safe(payload.patient_name, 'paciente')}`;
  if (options.download !== false) {
    doc.save(`${sanitizeFileName(fileName)}.pdf`);
  }
  return doc;
}

export function getLegalDocumentPdfBlob(payload: PdfDocumentPayload, options: PdfOptions = {}) {
  const pdf = generateLegalDocumentPDF(payload, { ...options, download: false });
  return pdf.output('blob');
}
