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
  const clean = base.replace(/[^a-zA-Z0-9-]/g, '');
  return clean.length > 14 ? clean.slice(0, 14) : clean;
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
  else drawStatusPill(doc, 'PRONTO PARA REVISÃO', PAGE_W - MARGIN - 39, y - 5.7, COLORS.emerald);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  setColor(doc, accent);
  doc.text('DOCUMENTO PROFISSIONAL • FISIOTERAPIA', MARGIN, y + 7);

  setColor(doc, COLORS.muted);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.4);
  const subtitle = isDraft
    ? 'Modelo preliminar gerado automaticamente. Complete os campos pendentes antes de assinatura ou envio.'
    : 'Modelo gerado para apoio administrativo. Revise todos os dados antes de assinatura ou envio.';
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
  const rowH = 9.5;
  const h = 16 + rows.length * rowH;
  y = ensureSpace(doc, y, h + 8, payload, profile, documentId);

  setColor(doc, COLORS.white, 'fill');
  setColor(doc, COLORS.border, 'draw');
  doc.roundedRect(MARGIN, y, CONTENT_W, h, 5, 5, 'FD');

  setColor(doc, COLORS.navy);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.2);
  doc.text(title, MARGIN + 6, y + 9.5);

  let rowY = y + 16;
  rows.forEach(([label, value], index) => {
    if (index % 2 === 0) {
      setColor(doc, [248, 250, 252], 'fill');
      doc.rect(MARGIN + 1, rowY - 6.3, CONTENT_W - 2, rowH, 'F');
    }
    setColor(doc, COLORS.muted);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.6);
    doc.text(label, MARGIN + 6, rowY);

    setColor(doc, isMissing(value) || value.includes('A definir') ? COLORS.amber : COLORS.navy);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.8);
    const v = doc.splitTextToSize(value, CONTENT_W - 74)[0];
    doc.text(v, MARGIN + 72, rowY, { maxWidth: CONTENT_W - 78 });
    rowY += rowH;
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

  y = drawMiniTable(
    doc,
    '1. Identificação das Partes',
    [
      ['Paciente', patient],
      ['E-mail do paciente', patientEmail],
      ['Fisioterapeuta', physio],
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
    'Prestação de serviços de fisioterapia, incluindo avaliação funcional, planejamento terapêutico, execução de condutas fisioterapêuticas, orientações domiciliares e acompanhamento da evolução clínica conforme necessidade do paciente e critérios técnicos do profissional.',
    y,
    payload,
    profile,
    accent,
    documentId,
  );

  y = drawMiniTable(
    doc,
    '3. Plano de Atendimento, Valores e Pagamento',
    [
      ['Tipo de serviço', extractField(cleanContent, ['Tipo de serviço', 'Tipo de servico', 'Serviço contratado', 'Servico contratado'])],
      ['Local do atendimento', extractField(cleanContent, ['Local do atendimento', 'Local de atendimento', 'Modalidade'])],
      ['Duração da sessão', extractField(cleanContent, ['Duração da sessão', 'Duracao da sessao', 'Tempo de sessão'])],
      ['Número de sessões', extractField(cleanContent, ['Número de Sessões', 'Numero de Sessoes', 'Quantidade de Sessões'])],
      ['Frequência das sessões', extractField(cleanContent, ['Frequência das Sessões', 'Frequencia das Sessoes', 'Frequência'])],
      ['Valor por sessão', extractField(cleanContent, ['Valor da Sessão', 'Valor por Sessão', 'Valor da Sessao'])],
      ['Forma de pagamento', extractField(cleanContent, ['Forma de Pagamento', 'Pagamento'])],
      ['Vigência', extractField(cleanContent, ['Vigência', 'Vigencia', 'Período de vigência'])],
      ['Política de cancelamento', extractField(cleanContent, ['Política de cancelamento', 'Politica de cancelamento', 'Cancelamento'])],
    ],
    y,
    payload,
    profile,
    accent,
    documentId,
  );

  const relevantSections = parseSections(cleanContent).filter((section) => !/sessões|sessoes|valores|pagamento|identificação|identificacao|objeto|assinatura/i.test(section.title));
  if (relevantSections.length > 0) {
    relevantSections.forEach((section, index) => {
      y = drawSection(doc, `${index + 4}. ${section.title}`, section.body, y, payload, profile, accent, documentId);
    });
  } else {
    y = drawSection(doc, '4. Cancelamento e Reagendamento', 'Cancelamentos ou reagendamentos devem ser comunicados com antecedência mínima acordada entre as partes. Na ausência de regra específica, recomenda-se antecedência mínima de 24 horas.', y, payload, profile, accent, documentId);
    y = drawSection(doc, '5. Responsabilidades das Partes', 'O fisioterapeuta compromete-se a atuar com ética, zelo técnico e sigilo profissional. O paciente compromete-se a fornecer informações verdadeiras, comparecer às sessões e seguir as orientações recebidas.', y, payload, profile, accent, documentId);
    y = drawSection(doc, '6. LGPD e Confidencialidade', 'Os dados pessoais e dados de saúde serão tratados apenas para fins assistenciais, administrativos e de registro clínico, observando confidencialidade, segurança e finalidade adequada.', y, payload, profile, accent, documentId);
    y = drawSection(doc, '7. Não Garantia de Resultado', 'A fisioterapia é uma prestação de serviço técnico-assistencial. A evolução depende de fatores clínicos, adesão do paciente, frequência, condição de saúde e resposta individual ao tratamento, não havendo promessa de cura ou resultado específico.', y, payload, profile, accent, documentId);
  }

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
    y = addNoticeBox(
      doc,
      y,
      payload,
      options.profile,
      accent,
      isDraft ? 'Atenção: contrato em rascunho' : 'Checklist antes da assinatura',
      isDraft
        ? 'Este contrato possui dados obrigatórios pendentes. Complete tipo de serviço, local, duração, número de sessões, valor, pagamento, frequência, vigência e política de cancelamento antes de coletar assinatura.'
        : 'Revise identificação das partes, CREFITO, objeto, valores, forma de pagamento, política de cancelamento, vigência, LGPD e assinaturas. O documento não deve prometer cura ou resultado garantido.',
      documentId,
    );
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
