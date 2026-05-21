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

const COLORS = {
  navy: [15, 23, 42] as [number, number, number],
  slate: [71, 85, 105] as [number, number, number],
  muted: [100, 116, 139] as [number, number, number],
  border: [226, 232, 240] as [number, number, number],
  paper: [248, 250, 252] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  blue: [37, 99, 235] as [number, number, number],
  sky: [14, 165, 233] as [number, number, number],
  emerald: [16, 185, 129] as [number, number, number],
  amber: [245, 158, 11] as [number, number, number],
  rose: [244, 63, 94] as [number, number, number],
  purple: [124, 58, 237] as [number, number, number],
};

const MARGIN = 16;
const PAGE_W = 210;
const PAGE_H = 297;
const CONTENT_W = PAGE_W - MARGIN * 2;
const FOOTER_TOP = PAGE_H - 24;

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
  if (Number.isNaN(date.getTime())) return new Date().toLocaleString('pt-BR');
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getDocTitle = (payload: PdfDocumentPayload) =>
  safe(payload.document_name || payload.type || 'Documento Fisioterapêutico');

const getAccent = (title: string): [number, number, number] => {
  const lower = title.toLowerCase();
  if (lower.includes('contrato')) return COLORS.blue;
  if (lower.includes('atestado')) return COLORS.emerald;
  if (lower.includes('autoriz')) return COLORS.amber;
  if (lower.includes('laudo') || lower.includes('relatório') || lower.includes('relatorio')) return COLORS.purple;
  return COLORS.sky;
};

function setColor(doc: jsPDF, color: [number, number, number], mode: 'text' | 'fill' | 'draw' = 'text') {
  if (mode === 'text') doc.setTextColor(color[0], color[1], color[2]);
  if (mode === 'fill') doc.setFillColor(color[0], color[1], color[2]);
  if (mode === 'draw') doc.setDrawColor(color[0], color[1], color[2]);
}

function addHeader(doc: jsPDF, title: string, subtitle: string, accent: [number, number, number], documentId: string) {
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
  doc.text(subtitle, PAGE_W - MARGIN, 23, { align: 'right' });
  doc.text(`ID: ${documentId}`, PAGE_W - MARGIN, 29, { align: 'right' });
}

function addFooter(doc: jsPDF, payload: PdfDocumentPayload, profile?: AnyRecord | null) {
  setColor(doc, [241, 245, 249], 'fill');
  doc.rect(0, FOOTER_TOP, PAGE_W, PAGE_H - FOOTER_TOP, 'F');

  setColor(doc, COLORS.border, 'draw');
  doc.line(MARGIN, FOOTER_TOP, PAGE_W - MARGIN, FOOTER_TOP);

  setColor(doc, COLORS.muted);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.text('DOCUMENTO GERADO VIA FISIOCAREHUB', MARGIN, FOOTER_TOP + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  const physio = safe(payload.physio_name || profile?.nome_completo || profile?.name, 'Fisioterapeuta não informado');
  const crefito = safe(profile?.crefito || profile?.registro_profissional || profile?.numero_registro, 'CREFITO não informado');
  doc.text(`Profissional: ${physio} • ${crefito}`, MARGIN, FOOTER_TOP + 11, { maxWidth: CONTENT_W });
  doc.text(`Gerado em: ${formatDateTime(new Date())}`, MARGIN, FOOTER_TOP + 16);

  const page = String(doc.getCurrentPageInfo().pageNumber);
  doc.text(`Página ${page}`, PAGE_W - MARGIN, FOOTER_TOP + 16, { align: 'right' });
}

function ensureSpace(doc: jsPDF, y: number, needed: number, payload: PdfDocumentPayload, profile?: AnyRecord | null) {
  if (y + needed > FOOTER_TOP - 8) {
    addFooter(doc, payload, profile);
    doc.addPage();
    addHeader(doc, getDocTitle(payload), 'Documento fisioterapêutico', getAccent(getDocTitle(payload)), safe(payload.id, 'sem-id').slice(0, 12));
    return 49;
  }
  return y;
}

function infoCard(doc: jsPDF, label: string, value: string, x: number, y: number, w: number, accent?: [number, number, number]) {
  setColor(doc, COLORS.white, 'fill');
  setColor(doc, COLORS.border, 'draw');
  doc.roundedRect(x, y, w, 16, 4, 4, 'FD');
  if (accent) {
    setColor(doc, accent, 'fill');
    doc.roundedRect(x, y, 2.4, 16, 1.2, 1.2, 'F');
  }

  setColor(doc, COLORS.muted);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.text(label.toUpperCase(), x + 5, y + 6);

  setColor(doc, COLORS.navy);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.4);
  const line = doc.splitTextToSize(value, w - 10)[0] || value;
  doc.text(line, x + 5, y + 12, { maxWidth: w - 10 });
}

function drawTitleBlock(doc: jsPDF, payload: PdfDocumentPayload, profile: AnyRecord | null | undefined, accent: [number, number, number]) {
  const title = getDocTitle(payload);
  let y = 50;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(21);
  setColor(doc, COLORS.navy);
  doc.text(title, MARGIN, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  setColor(doc, accent);
  doc.text('DOCUMENTO PROFISSIONAL • FISIOTERAPIA', MARGIN, y + 7);

  setColor(doc, COLORS.muted);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Modelo gerado para apoio administrativo. Revise todos os dados antes de assinatura ou envio.', MARGIN, y + 13, { maxWidth: CONTENT_W });

  y += 23;

  const gap = 6;
  const colW = (CONTENT_W - gap) / 2;
  infoCard(doc, 'Paciente', safe(payload.patient_name), MARGIN, y, colW, accent);
  infoCard(doc, 'Fisioterapeuta', safe(payload.physio_name || profile?.nome_completo || profile?.name), MARGIN + colW + gap, y, colW, accent);
  y += 21;
  infoCard(doc, 'E-mail do paciente', safe(payload.patient_email), MARGIN, y, colW, accent);
  infoCard(doc, 'Data de geração', formatDateTime(payload.criado_em || payload.created_at || new Date()), MARGIN + colW + gap, y, colW, accent);

  return y + 26;
}

function normalizeMarkdown(content: string) {
  return safe(content, 'Nenhum conteúdo informado.')
    .replace(/\r\n/g, '\n')
    .replace(/\[(Nome do Fisioterapeuta|Número de Registro|Numero de Registro|Data de Nascimento|Endereço Completo|Endereco Completo|Número de Telefone|Numero de Telefone|E-mail|Período de vigência|Periodo de vigencia|Período de antecedência|Periodo de antecedencia|Valor por Sessão|Valor por Sessao|Especificar forma de pagamento[^\]]*)\]/gi, 'Não informado')
    .replace(/\*\*/g, '')
    .replace(/^[#]+\s*/gm, '');
}

function drawSection(doc: jsPDF, title: string, body: string, y: number, payload: PdfDocumentPayload, profile: AnyRecord | null | undefined, accent: [number, number, number]) {
  const cleanBody = safe(body, 'Não informado');
  const lines = doc.splitTextToSize(cleanBody, CONTENT_W - 17);
  const h = Math.max(26, 17 + lines.length * 4.8);
  y = ensureSpace(doc, y, h + 8, payload, profile);

  setColor(doc, COLORS.white, 'fill');
  setColor(doc, COLORS.border, 'draw');
  doc.roundedRect(MARGIN, y, CONTENT_W, h, 5, 5, 'FD');

  setColor(doc, accent, 'fill');
  doc.roundedRect(MARGIN + 5, y + 5, 3, h - 10, 1.5, 1.5, 'F');

  setColor(doc, COLORS.navy);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.6);
  doc.text(title, MARGIN + 12, y + 10);

  setColor(doc, COLORS.slate);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.7);
  doc.text(lines, MARGIN + 12, y + 18, { maxWidth: CONTENT_W - 17 });

  return y + h + 8;
}

function parseSections(content: string) {
  const normalized = normalizeMarkdown(content);
  const rawLines = normalized.split('\n').map((line) => line.trim()).filter(Boolean);
  const sections: Array<{ title: string; body: string }> = [];
  let currentTitle = 'Conteúdo do documento';
  let current: string[] = [];

  for (const line of rawLines) {
    const isHeading =
      /^(\d+\.|[IVX]+\.|[A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ\s]{4,}:?$)/.test(line) ||
      /^(Objeto|Dados|Informações|Informacoes|Histórico|Historico|Objetivos|Responsabilidades|Pagamento|Cancelamento|Aceitação|Aceitacao|Condições|Condicoes|Autorização|Autorizacao|Finalidade|Uso de imagem|Declaração|Declaracao|Laudo|Relatório|Relatorio|Avaliação|Avaliacao|Conduta|Conclusão|Conclusao)/i.test(line);

    if (isHeading && current.length > 0) {
      sections.push({ title: currentTitle.replace(/:$/, ''), body: current.join('\n') });
      currentTitle = line.replace(/^\d+\.\s*/, '').replace(/:$/, '');
      current = [];
    } else if (isHeading && current.length === 0) {
      currentTitle = line.replace(/^\d+\.\s*/, '').replace(/:$/, '');
    } else {
      current.push(line.replace(/^[-*]\s*/, '• '));
    }
  }

  if (current.length > 0) sections.push({ title: currentTitle.replace(/:$/, ''), body: current.join('\n') });
  if (sections.length === 0) sections.push({ title: 'Conteúdo do documento', body: normalized });
  return sections.slice(0, 18);
}

function addComplianceBox(doc: jsPDF, y: number, payload: PdfDocumentPayload, profile: AnyRecord | null | undefined, accent: [number, number, number]) {
  const title = getDocTitle(payload).toLowerCase();
  let boxTitle = 'Observações de segurança documental';
  let body = 'Revise os dados antes de assinatura, envio ao paciente ou anexação ao prontuário. Este documento é um modelo administrativo gerado pelo sistema e pode precisar de adequação jurídica conforme o caso concreto.';

  if (title.includes('contrato')) {
    boxTitle = 'Checklist jurídico-operacional';
    body = 'Antes de usar como contrato final, confirme: identificação completa das partes, CREFITO, objeto, número/valor das sessões, forma de pagamento, política de cancelamento, vigência, LGPD, assinatura do paciente e assinatura do fisioterapeuta. Não prometa cura ou resultado garantido.';
  } else if (title.includes('atestado')) {
    boxTitle = 'Boas práticas para atestado';
    body = 'O atestado deve declarar comparecimento, data, horário/período e profissional responsável. Evite expor diagnóstico ou dados sensíveis além do necessário.';
  } else if (title.includes('autoriz')) {
    boxTitle = 'Consentimento e imagem';
    body = 'A autorização deve informar finalidade, canais de uso, possibilidade de revogação e separação entre uso clínico e uso comercial/publicitário. Para menor de idade, coletar autorização do responsável legal.';
  } else if (title.includes('laudo') || title.includes('relatório') || title.includes('relatorio')) {
    boxTitle = 'Registro técnico fisioterapêutico';
    body = 'Use linguagem técnica de fisioterapia: avaliação funcional, achados, conduta, evolução e recomendações. Evite diagnóstico médico definitivo quando não aplicável.';
  }

  const lines = doc.splitTextToSize(body, CONTENT_W - 20);
  const h = 21 + lines.length * 4.4;
  y = ensureSpace(doc, y, h + 8, payload, profile);

  setColor(doc, [255, 251, 235], 'fill');
  setColor(doc, [253, 230, 138], 'draw');
  doc.roundedRect(MARGIN, y, CONTENT_W, h, 5, 5, 'FD');

  setColor(doc, COLORS.amber, 'fill');
  doc.circle(MARGIN + 8, y + 10, 3.2, 'F');
  setColor(doc, COLORS.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('!', MARGIN + 8, y + 12.6, { align: 'center' });

  setColor(doc, COLORS.navy);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(boxTitle, MARGIN + 16, y + 10);

  setColor(doc, COLORS.slate);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.3);
  doc.text(lines, MARGIN + 16, y + 17, { maxWidth: CONTENT_W - 20 });

  return y + h + 8;
}

function addSignatureArea(doc: jsPDF, y: number, payload: PdfDocumentPayload, profile: AnyRecord | null | undefined) {
  y = ensureSpace(doc, y, 48, payload, profile);

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
  doc.text(safe(payload.physio_name || profile?.nome_completo || profile?.name), MARGIN + lineW + 14, y + 11, { maxWidth: lineW });
  doc.text(`Data: ____/____/________`, MARGIN, y + 20);
  doc.text(`CREFITO: ${safe(profile?.crefito || profile?.registro_profissional || profile?.numero_registro)}`, MARGIN + lineW + 14, y + 20, { maxWidth: lineW });

  return y + 30;
}

export function generateLegalDocumentPDF(payload: PdfDocumentPayload, options: PdfOptions = {}) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const title = getDocTitle(payload);
  const accent = getAccent(title);
  const id = safe(payload.id, `FCH-${Date.now()}`).slice(0, 18);

  setColor(doc, COLORS.paper, 'fill');
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F');
  addHeader(doc, title, 'Documento fisioterapêutico', accent, id);

  let y = drawTitleBlock(doc, payload, options.profile, accent);
  y = addComplianceBox(doc, y, payload, options.profile, accent);

  const sections = parseSections(payload.content || '');
  sections.forEach((section) => {
    y = drawSection(doc, section.title, section.body, y, payload, options.profile, accent);
  });

  if (/contrato|autorização|autorizacao|atestado|laudo|relatório|relatorio/i.test(title)) {
    y = addSignatureArea(doc, y, payload, options.profile);
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    addFooter(doc, payload, options.profile);
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
