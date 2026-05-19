import { jsPDF } from 'jspdf';

type AnyRecord = Record<string, any>;

export type PremiumDocumentKind =
  | 'ficha'
  | 'avaliacao'
  | 'evolucao'
  | 'documento'
  | 'soap';

export interface PremiumPdfPayload {
  kind: PremiumDocumentKind;
  title?: string;
  patient?: AnyRecord | null;
  physiotherapist?: AnyRecord | null;
  record?: AnyRecord | null;
  fileName?: string;
}

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const NAVY = '#071B3A';
const BLUE = '#2563EB';
const BLUE_2 = '#0EA5E9';
const TEXT = '#0F172A';
const MUTED = '#64748B';
const BORDER = '#D8E6F8';
const SOFT = '#F6FAFF';
const WHITE = '#FFFFFF';

const value = (v: unknown, fallback = 'Não informado') => {
  if (v === null || v === undefined || v === '') return fallback;
  return String(v);
};

const dateBR = (input?: string | Date | null) => {
  const d = input ? new Date(input) : new Date();
  if (Number.isNaN(d.getTime())) return value(input);
  return d.toLocaleDateString('pt-BR');
};

const timeBR = (input?: string | Date | null) => {
  const d = input ? new Date(input) : new Date();
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

const dateTimeBR = (input?: string | Date | null) => {
  const d = input ? new Date(input) : new Date();
  if (Number.isNaN(d.getTime())) return `${dateBR()} ${timeBR()}`;
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const shortId = (prefix: string) =>
  `${prefix}-${Math.random().toString(16).slice(2, 10).toUpperCase()}`;

const safeName = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w.-]+/g, '_')
    .replace(/_+/g, '_');

const patientName = (patient?: AnyRecord | null) =>
  value(patient?.nome_completo || patient?.nome || patient?.name, 'Paciente');

const physioName = (physio?: AnyRecord | null) =>
  value(
    physio?.nome_completo ||
      physio?.nome ||
      physio?.name ||
      physio?.display_name ||
      physio?.full_name,
    'Fisioterapeuta'
  );

const physioCrefito = (physio?: AnyRecord | null) =>
  value(physio?.crefito || physio?.registro_profissional || physio?.professional_id, 'Não informado');

function rounded(doc: jsPDF, x: number, y: number, w: number, h: number, r = 3, stroke = BORDER, fill = WHITE) {
  doc.setDrawColor(stroke);
  doc.setFillColor(fill);
  doc.roundedRect(x, y, w, h, r, r, 'FD');
}

function text(doc: jsPDF, str: string, x: number, y: number, opts: AnyRecord = {}) {
  const {
    size = 10,
    color = TEXT,
    weight = 'normal',
    maxWidth,
    align,
    lineHeightFactor = 1.18,
  } = opts;

  doc.setFont('helvetica', weight);
  doc.setFontSize(size);
  doc.setTextColor(color);

  if (maxWidth) {
    const lines = doc.splitTextToSize(str, maxWidth);
    doc.text(lines, x, y, { align, lineHeightFactor });
    return lines.length * size * 0.36 * lineHeightFactor;
  }

  doc.text(str, x, y, { align });
  return size * 0.36;
}

function labelValue(
  doc: jsPDF,
  label: string,
  val: string,
  x: number,
  y: number,
  w: number,
  iconLetter = ''
) {
  rounded(doc, x, y, w, 17, 3.5, '#E2EAF6', WHITE);
  doc.setFillColor('#EAF3FF');
  doc.circle(x + 8, y + 8.5, 4.5, 'F');
  if (iconLetter) text(doc, iconLetter, x + 8, y + 10, { size: 6, color: BLUE, weight: 'bold', align: 'center' });
  text(doc, label, x + 16, y + 6, { size: 6.5, color: BLUE, weight: 'bold' });
  text(doc, val, x + 16, y + 12.5, { size: 8.5, color: TEXT, weight: 'bold', maxWidth: w - 20 });
}

function sectionHeader(doc: jsPDF, title: string, x: number, y: number, w = 170) {
  text(doc, title.toUpperCase(), x, y, { size: 8.5, color: TEXT, weight: 'bold' });
  doc.setDrawColor(BLUE);
  doc.setLineWidth(0.8);
  doc.line(x, y + 2.2, x + w, y + 2.2);
}

function wrapBlock(doc: jsPDF, title: string, body: string, x: number, y: number, w: number, minH = 18) {
  const bodyLines = doc.splitTextToSize(body || 'Não informado', w - 14);
  const h = Math.max(minH, 12 + bodyLines.length * 4.4);
  rounded(doc, x, y, w, h, 3, '#DFEAF7', WHITE);
  doc.setFillColor(NAVY);
  doc.circle(x + 7, y + 7, 4.2, 'F');
  text(doc, title.toUpperCase(), x + 14, y + 7.5, { size: 8, color: NAVY, weight: 'bold' });
  doc.setDrawColor(BLUE);
  doc.setLineWidth(0.35);
  doc.line(x + 14, y + 10, x + w - 7, y + 10);
  text(doc, body || 'Não informado', x + 7, y + 16, { size: 8.5, color: TEXT, maxWidth: w - 14 });
  return h;
}

function premiumHeader(doc: jsPDF, title: string, subtitle?: string) {
  doc.setFillColor(WHITE);
  doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, 'F');

  doc.setFillColor(NAVY);
  doc.rect(0, 0, 39, 31, 'F');
  doc.setFillColor(BLUE);
  doc.circle(20, 16, 7.5, 'F');
  text(doc, 'FCH', 20, 18.2, { size: 8, color: WHITE, weight: 'bold', align: 'center' });

  text(doc, 'FisioCareHub', 47, 14, { size: 18, color: NAVY, weight: 'bold' });
  text(doc, 'R E A B I L I T A Ç Ã O   &   P E R F O R M A N C E', 47, 22, {
    size: 7,
    color: MUTED,
    weight: 'bold',
  });

  doc.setFillColor(NAVY);
  doc.roundedRect(132, 7, 62, 17, 7, 7, 'F');
  text(doc, 'DATA E HORA DE EMISSÃO', 163, 13, { size: 5.8, color: WHITE, weight: 'bold', align: 'center' });
  text(doc, dateTimeBR(), 163, 19, { size: 7.5, color: WHITE, weight: 'bold', align: 'center' });

  text(doc, title, 18, 48, { size: 20, color: NAVY, weight: 'bold' });
  doc.setFillColor(BLUE);
  doc.roundedRect(18, 53, 16, 1.5, 0.7, 0.7, 'F');

  if (subtitle) {
    text(doc, subtitle.toUpperCase(), 178, 47, { size: 6, color: BLUE, weight: 'bold', align: 'right' });
  }
}

function premiumFooter(doc: jsPDF, id: string, physio?: AnyRecord | null) {
  doc.setDrawColor('#CFDAEA');
  doc.line(18, 268, 192, 268);

  text(doc, 'ID DO DOCUMENTO', 18, 274, { size: 6.2, color: BLUE, weight: 'bold' });
  text(doc, id, 18, 280, { size: 7, color: TEXT });

  text(doc, 'VALIDAÇÃO', 78, 274, { size: 6.2, color: BLUE, weight: 'bold' });
  text(doc, 'Hash e registro de emissão preservados no FisioCareHub.', 78, 280, {
    size: 5.5,
    color: MUTED,
    maxWidth: 58,
  });

  text(doc, 'FISIOTERAPEUTA RESPONSÁVEL', 152, 274, { size: 6.2, color: BLUE, weight: 'bold' });
  text(doc, physioName(physio), 192, 280, { size: 7, color: TEXT, align: 'right' });

  doc.setFillColor(NAVY);
  doc.rect(0, 287, PAGE_WIDTH, 10, 'F');
  text(doc, 'Documento gerado oficialmente via FisioCareHub', 18, 293, { size: 6.5, color: WHITE });
  text(doc, 'Página 1 de 1', 192, 293, { size: 6.5, color: WHITE, align: 'right' });
}

function generateFicha(doc: jsPDF, payload: PremiumPdfPayload) {
  const p = payload.patient || {};
  const f = payload.physiotherapist || {};
  const id = shortId('FCH-FICHA');

  premiumHeader(doc, 'Ficha clínica', 'Resumo clínico');

  // Main patient card, fixed and aligned
  rounded(doc, 18, 66, 174, 31, 4.5, '#BBD7FF', WHITE);
  doc.setFillColor('#E8F2FF');
  doc.circle(32, 81.5, 9.5, 'F');
  text(doc, 'P', 32, 84, { size: 9, color: BLUE, weight: 'bold', align: 'center' });

  text(doc, 'PACIENTE', 45, 76, { size: 6, color: BLUE, weight: 'bold' });
  text(doc, patientName(p), 45, 84.5, { size: 13, color: NAVY, weight: 'bold' });

  doc.setDrawColor('#CBD5E1');
  doc.setLineWidth(0.8);
  doc.line(110, 70, 110, 93);

  doc.setFillColor(BLUE);
  doc.circle(124, 81.5, 6.2, 'F');
  text(doc, '+', 124, 83.8, { size: 9, color: WHITE, weight: 'bold', align: 'center' });

  text(doc, 'FISIOTERAPEUTA', 138, 76, { size: 6, color: BLUE, weight: 'bold' });
  text(doc, physioName(f), 138, 84.2, { size: 10, color: NAVY, weight: 'bold', maxWidth: 46 });

  const chipY = 106;
  labelValue(doc, 'ID PACIENTE', value(p.id || p.paciente_clinico_id, id), 18, chipY, 54, '#');
  labelValue(doc, 'ORIGEM', value(p.origem), 77, chipY, 54, 'O');
  labelValue(doc, 'EMISSÃO', dateTimeBR(), 136, chipY, 56, 'D');

  sectionHeader(doc, 'Informações do paciente', 18, 132, 174);

  const leftX = 18;
  const rightX = 108;
  let y = 140;
  labelValue(doc, 'Nome', patientName(p), leftX, y, 84, 'N');
  labelValue(doc, 'Telefone', value(p.telefone || p.phone), rightX, y, 84, 'T');

  y += 22;
  labelValue(doc, 'E-mail', value(p.email), leftX, y, 84, '@');
  labelValue(doc, 'Nascimento', value(p.data_nascimento || p.birthdate, 'Não informada'), rightX, y, 84, 'D');

  y += 22;
  labelValue(doc, 'Diagnóstico', value(p.diagnostico || p.diagnostico_clinico), leftX, y, 84, 'D');
  labelValue(doc, 'Observações', value(p.observacoes || p.observacoes_iniciais), rightX, y, 84, 'O');

  y += 28;
  rounded(doc, 18, y, 174, 26, 4, '#D3E7FF', WHITE);
  doc.setFillColor(BLUE);
  doc.circle(28, y + 13, 5.5, 'F');
  text(doc, '+', 28, y + 15.3, { size: 8, color: WHITE, weight: 'bold', align: 'center' });
  text(doc, 'FISIOTERAPEUTA RESPONSÁVEL', 38, y + 9, { size: 9, color: NAVY, weight: 'bold' });
  doc.setDrawColor(BLUE);
  doc.setLineWidth(0.35);
  doc.line(38, y + 12, 186, y + 12);
  text(doc, physioName(f), 38, y + 18, { size: 8.5, color: TEXT, weight: 'bold' });
  text(doc, `CREFITO: ${physioCrefito(f)}`, 38, y + 23, { size: 7, color: MUTED });

  premiumFooter(doc, id, f);
}

function generateAvaliacao(doc: jsPDF, payload: PremiumPdfPayload) {
  const r = payload.record || {};
  const p = payload.patient || {};
  const f = payload.physiotherapist || {};
  const id = shortId('FCH-AVAL');

  premiumHeader(doc, 'Avaliação fisioterapêutica', 'Avaliação');
  rounded(doc, 18, 66, 174, 24, 4, '#CFE3FF', SOFT);
  text(doc, 'Paciente', 28, 76, { size: 6.5, color: BLUE, weight: 'bold' });
  text(doc, patientName(p), 28, 84, { size: 11, color: NAVY, weight: 'bold' });
  text(doc, 'Fisioterapeuta', 104, 76, { size: 6.5, color: BLUE, weight: 'bold' });
  text(doc, physioName(f), 104, 84, { size: 11, color: NAVY, weight: 'bold' });
  doc.setFillColor(NAVY);
  doc.roundedRect(156, 73, 28, 10, 5, 5, 'F');
  text(doc, `Dor: ${value(r.dor_escala || r.escala_dor, '-')}/10`, 170, 80, { size: 8, color: WHITE, weight: 'bold', align: 'center' });

  let y = 102;
  y += wrapBlock(doc, 'Queixa principal', value(r.queixa_principal), 18, y, 174, 20) + 7;
  y += wrapBlock(doc, 'História da doença atual', value(r.historia_doenca_atual), 18, y, 174, 20) + 7;
  y += wrapBlock(doc, 'Diagnóstico fisioterapêutico', value(r.diagnostico_fisio), 18, y, 174, 20) + 7;
  y += wrapBlock(doc, 'Objetivos terapêuticos', value(r.objetivos_terapeuticos), 18, y, 174, 20) + 7;
  y += wrapBlock(doc, 'Conduta', value(r.conduta), 18, y, 174, 20) + 7;
  y += wrapBlock(doc, 'Prognóstico', value(r.prognostico), 18, y, 174, 16) + 5;

  premiumFooter(doc, id, f);
}

function generateEvolucao(doc: jsPDF, payload: PremiumPdfPayload) {
  const r = payload.record || {};
  const p = payload.patient || {};
  const f = payload.physiotherapist || {};
  const id = shortId('FCH-EVOL');

  premiumHeader(doc, 'Evolução clínica', 'Evolução');
  rounded(doc, 18, 66, 174, 31, 4, '#CFE3FF', WHITE);
  text(doc, 'PACIENTE', 32, 76, { size: 6, color: BLUE, weight: 'bold' });
  text(doc, patientName(p), 32, 84, { size: 12, color: NAVY, weight: 'bold' });
  text(doc, 'FISIOTERAPEUTA', 112, 76, { size: 6, color: BLUE, weight: 'bold' });
  text(doc, physioName(f), 112, 84, { size: 12, color: NAVY, weight: 'bold', maxWidth: 55 });

  doc.setFillColor(NAVY);
  doc.roundedRect(152, 86, 31, 10, 5, 5, 'F');
  text(doc, `Dor: ${value(r.dor_escala || r.nivel_dor || r.dor_nivel, '-')}/10`, 167.5, 93, {
    size: 8,
    color: WHITE,
    weight: 'bold',
    align: 'center',
  });

  const data = dateBR(r.created_at || r.data || r.data_registro);
  const hora = timeBR(r.created_at || r.data || r.data_registro);
  labelValue(doc, 'Data da sessão', data, 18, 105, 54, 'D');
  labelValue(doc, 'Horário', hora || 'Não informado', 78, 105, 54, 'H');

  let y = 132;
  const h1 = wrapBlock(doc, 'Descrição', value(r.descricao), 18, y, 78, 35);
  const h2 = wrapBlock(doc, 'Exercícios realizados', value(r.exercicios_realizados), 103, y, 89, 35);
  y += Math.max(h1, h2) + 8;
  y += wrapBlock(doc, 'Observações', value(r.observacoes), 18, y, 174, 22) + 7;
  y += wrapBlock(doc, 'Plano terapêutico', value(r.plano), 18, y, 174, 22) + 7;
  y += wrapBlock(
    doc,
    'Resumo da evolução',
    `Registro clínico de evolução do paciente ${patientName(p)}, com escala de dor ${
      r.dor_escala || r.nivel_dor || r.dor_nivel || 'não informada'
    }/10.`,
    18,
    y,
    174,
    24
  );

  premiumFooter(doc, id, f);
}

function generateDocumento(doc: jsPDF, payload: PremiumPdfPayload) {
  const r = payload.record || {};
  const p = payload.patient || {};
  const f = payload.physiotherapist || {};
  const id = shortId('FCH-DOC');

  premiumHeader(doc, payload.title || 'Documento clínico', value(r.tipo || 'Documento'));
  rounded(doc, 18, 66, 174, 35, 4, '#CFE3FF', WHITE);
  text(doc, 'PACIENTE', 30, 78, { size: 6.5, color: BLUE, weight: 'bold' });
  text(doc, patientName(p), 30, 88, { size: 13, color: NAVY, weight: 'bold' });
  text(doc, 'FISIOTERAPEUTA', 116, 78, { size: 6.5, color: BLUE, weight: 'bold' });
  text(doc, physioName(f), 116, 88, { size: 11, color: NAVY, weight: 'bold', maxWidth: 60 });

  let y = 118;
  y += wrapBlock(doc, 'Arquivo', value(r.nome_arquivo || r.fileName || payload.fileName), 18, y, 174, 22) + 7;
  y += wrapBlock(doc, 'Tipo', value(r.tipo || r.document_type || 'Documento'), 18, y, 174, 18) + 7;
  y += wrapBlock(doc, 'Descrição', value(r.descricao || r.observacoes), 18, y, 174, 35);

  premiumFooter(doc, id, f);
}

export function generatePremiumPdf(payload: PremiumPdfPayload) {
  const doc = new jsPDF('p', 'mm', 'a4');

  if (payload.kind === 'ficha') generateFicha(doc, payload);
  else if (payload.kind === 'avaliacao') generateAvaliacao(doc, payload);
  else if (payload.kind === 'evolucao') generateEvolucao(doc, payload);
  else generateDocumento(doc, payload);

  const nameBase =
    payload.fileName ||
    `${payload.kind}_${patientName(payload.patient)}_${new Date().toISOString().slice(0, 10)}.pdf`;

  doc.save(safeName(nameBase));
}

export function openPremiumPdf(payload: PremiumPdfPayload) {
  const doc = new jsPDF('p', 'mm', 'a4');

  if (payload.kind === 'ficha') generateFicha(doc, payload);
  else if (payload.kind === 'avaliacao') generateAvaliacao(doc, payload);
  else if (payload.kind === 'evolucao') generateEvolucao(doc, payload);
  else generateDocumento(doc, payload);

  const url = doc.output('bloburl');
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function createPremiumPdfBlob(payload: PremiumPdfPayload): Blob {
  const doc = new jsPDF('p', 'mm', 'a4');

  if (payload.kind === 'ficha') generateFicha(doc, payload);
  else if (payload.kind === 'avaliacao') generateAvaliacao(doc, payload);
  else if (payload.kind === 'evolucao') generateEvolucao(doc, payload);
  else generateDocumento(doc, payload);

  return doc.output('blob');
}


// Compatibilidade com Records.tsx antigo/atual
// Mantém os nomes que a página de Prontuários já importa.
export function downloadFichaClinicaPremiumPdf(patient: Record<string, any>, physiotherapist?: Record<string, any> | null) {
  generatePremiumPdf({
    kind: 'ficha',
    patient,
    physiotherapist: physiotherapist || patient?.fisioterapeuta || patient?.physiotherapist || null,
    fileName: `ficha_clinica_${patient?.nome_completo || patient?.nome || 'paciente'}.pdf`,
  });
}

export function downloadAvaliacaoPremiumPdf(
  evaluation: Record<string, any>,
  patient?: Record<string, any> | null,
  physiotherapist?: Record<string, any> | null
) {
  generatePremiumPdf({
    kind: 'avaliacao',
    patient: patient || evaluation?.paciente || null,
    physiotherapist: physiotherapist || evaluation?.fisioterapeuta || null,
    record: evaluation,
    fileName: `avaliacao_${patient?.nome_completo || patient?.nome || 'paciente'}.pdf`,
  });
}

export function downloadEvolucaoPremiumPdf(
  evolution: Record<string, any>,
  patient?: Record<string, any> | null,
  physiotherapist?: Record<string, any> | null
) {
  generatePremiumPdf({
    kind: 'evolucao',
    patient: patient || evolution?.paciente || null,
    physiotherapist: physiotherapist || evolution?.fisioterapeuta || null,
    record: evolution,
    fileName: `evolucao_${patient?.nome_completo || patient?.nome || 'paciente'}.pdf`,
  });
}

export function openFichaClinicaPremiumPdf(patient: Record<string, any>, physiotherapist?: Record<string, any> | null) {
  openPremiumPdf({
    kind: 'ficha',
    patient,
    physiotherapist: physiotherapist || patient?.fisioterapeuta || patient?.physiotherapist || null,
    fileName: `ficha_clinica_${patient?.nome_completo || patient?.nome || 'paciente'}.pdf`,
  });
}

export function openAvaliacaoPremiumPdf(
  evaluation: Record<string, any>,
  patient?: Record<string, any> | null,
  physiotherapist?: Record<string, any> | null
) {
  openPremiumPdf({
    kind: 'avaliacao',
    patient: patient || evaluation?.paciente || null,
    physiotherapist: physiotherapist || evaluation?.fisioterapeuta || null,
    record: evaluation,
    fileName: `avaliacao_${patient?.nome_completo || patient?.nome || 'paciente'}.pdf`,
  });
}

export function openEvolucaoPremiumPdf(
  evolution: Record<string, any>,
  patient?: Record<string, any> | null,
  physiotherapist?: Record<string, any> | null
) {
  openPremiumPdf({
    kind: 'evolucao',
    patient: patient || evolution?.paciente || null,
    physiotherapist: physiotherapist || evolution?.fisioterapeuta || null,
    record: evolution,
    fileName: `evolucao_${patient?.nome_completo || patient?.nome || 'paciente'}.pdf`,
  });
}
