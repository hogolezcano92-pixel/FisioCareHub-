import jsPDF from 'jspdf';

type PdfPatient = {
  id?: string | null;
  nome_completo?: string | null;
  email?: string | null;
  telefone?: string | null;
  data_nascimento?: string | null;
  diagnostico?: string | null;
  observacoes?: string | null;
  origem?: string | null;
  tipo_paciente?: string | null;
};

type PdfPhysio = {
  nome_completo?: string | null;
  crefito?: string | null;
  email?: string | null;
  telefone?: string | null;
};

type PdfRecord = Record<string, any>;

const NAVY: [number, number, number] = [7, 20, 50];
const BLUE: [number, number, number] = [37, 99, 235];
const SKY: [number, number, number] = [14, 165, 233];
const SLATE: [number, number, number] = [51, 65, 85];
const LIGHT: [number, number, number] = [239, 246, 255];
const BORDER: [number, number, number] = [191, 219, 254];

const safe = (value: any, fallback = 'Não informado') => {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
};

const formatDateTime = (value?: string | null) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return safe(value);
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
};

const formatDate = (value?: string | null) => {
  if (!value) return 'Não informada';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return safe(value);
  return date.toLocaleDateString('pt-BR');
};

const fileName = (title: string, patient?: PdfPatient | null) => {
  const clean = `${title}-${safe(patient?.nome_completo, 'paciente')}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  return `${clean}.pdf`;
};

const documentId = (prefix: string, record?: PdfRecord) => {
  const raw = record?.id || crypto?.randomUUID?.() || `${Date.now()}`;
  return `${prefix}-${String(raw).slice(0, 8).toUpperCase()}`;
};

const addWrapped = (doc: jsPDF, text: any, x: number, y: number, width: number, lineHeight = 5) => {
  const lines = doc.splitTextToSize(safe(text), width);
  doc.text(lines, x, y);
  return y + Math.max(lines.length * lineHeight, lineHeight);
};

const checkPage = (doc: jsPDF, y: number, minSpace = 34) => {
  if (y > doc.internal.pageSize.getHeight() - minSpace) {
    doc.addPage();
    addPageFrame(doc);
    return 22;
  }
  return y;
};

const addPageFrame = (doc: jsPDF) => {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.25);
  doc.roundedRect(6, 6, w - 12, h - 12, 2, 2, 'S');
  doc.setFillColor(248, 250, 252);
  doc.rect(0, 0, w, h, 'F');
};

const addHeader = (doc: jsPDF, title: string, kind: string, issuedAt?: string | null) => {
  const w = doc.internal.pageSize.getWidth();

  doc.setFillColor(248, 250, 252);
  doc.rect(0, 0, w, 297, 'F');

  doc.setFillColor(...NAVY);
  doc.roundedRect(0, 0, 38, 32, 0, 0, 'F');
  doc.setFillColor(...BLUE);
  doc.circle(18, 16, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('FCH', 18, 17.5, { align: 'center' });

  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(25);
  doc.text('FisioCareHub', 45, 17);
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8.5);
  doc.setCharSpace(1.5);
  doc.text('REABILITAÇÃO & PERFORMANCE', 45, 24);
  doc.setCharSpace(0);

  doc.setFillColor(...NAVY);
  doc.roundedRect(w - 78, 8, 72, 18, 9, 9, 'F');
  doc.setTextColor(219, 234, 254);
  doc.setFontSize(7.5);
  doc.text('DATA E HORA DE EMISSÃO', w - 42, 14, { align: 'center' });
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text(formatDateTime(issuedAt || new Date().toISOString()), w - 42, 21, { align: 'center' });

  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.text(title, 14, 52);
  doc.setDrawColor(...BLUE);
  doc.setLineWidth(1.5);
  doc.line(14, 58, 30, 58);

  doc.setTextColor(...BLUE);
  doc.setFontSize(8);
  doc.text(kind.toUpperCase(), w - 14, 46, { align: 'right' });
};

const addFooter = (doc: jsPDF, id: string, physio?: PdfPhysio | null) => {
  const pages = doc.getNumberOfPages();
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= pages; i += 1) {
    doc.setPage(i);
    doc.setFillColor(...NAVY);
    doc.rect(0, h - 14, w, 14, 'F');
    doc.setTextColor(226, 232, 240);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Documento gerado oficialmente via FisioCareHub', 14, h - 6);
    doc.text(`Página ${i} de ${pages}`, w - 14, h - 6, { align: 'right' });

    doc.setDrawColor(203, 213, 225);
    doc.line(14, h - 30, w - 14, h - 30);
    doc.setTextColor(...BLUE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('ID DO DOCUMENTO', 14, h - 24);
    doc.setTextColor(...SLATE);
    doc.setFont('helvetica', 'normal');
    doc.text(id, 14, h - 19);

    doc.setTextColor(...BLUE);
    doc.setFont('helvetica', 'bold');
    doc.text('VALIDAÇÃO', 76, h - 24);
    doc.setTextColor(...SLATE);
    doc.setFont('helvetica', 'normal');
    doc.text('Hash e registro de emissão preservados no FisioCareHub.', 76, h - 19);

    doc.setTextColor(...BLUE);
    doc.setFont('helvetica', 'bold');
    doc.text('FISIOTERAPEUTA RESPONSÁVEL', w - 14, h - 24, { align: 'right' });
    doc.setTextColor(...NAVY);
    doc.setFont('helvetica', 'normal');
    doc.text(safe(physio?.nome_completo, 'Profissional responsável'), w - 14, h - 19, { align: 'right' });
  }
};

const addPatientHero = (doc: jsPDF, patient?: PdfPatient | null, physio?: PdfPhysio | null, meta?: Array<[string, string]>) => {
  const w = doc.internal.pageSize.getWidth();
  let y = 68;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...BORDER);
  doc.roundedRect(14, y, w - 28, 32, 4, 4, 'FD');

  doc.setFillColor(219, 234, 254);
  doc.circle(29, y + 16, 10, 'F');
  doc.setTextColor(...BLUE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('P', 29, y + 18, { align: 'center' });

  doc.setTextColor(...BLUE);
  doc.setFontSize(7.5);
  doc.text('PACIENTE', 43, y + 12);
  doc.setTextColor(...NAVY);
  doc.setFontSize(18);
  doc.text(safe(patient?.nome_completo || patient?.email, 'Paciente'), 43, y + 22);

  doc.setDrawColor(203, 213, 225);
  doc.line(w / 2 + 10, y + 7, w / 2 + 10, y + 25);

  doc.setFillColor(...BLUE);
  doc.circle(w / 2 + 25, y + 16, 6, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text('+', w / 2 + 25, y + 19, { align: 'center' });
  doc.setTextColor(...BLUE);
  doc.setFontSize(7.5);
  doc.text('FISIOTERAPEUTA', w / 2 + 36, y + 12);
  doc.setTextColor(...NAVY);
  doc.setFontSize(12);
  doc.text(safe(physio?.nome_completo, 'Fisioterapeuta'), w / 2 + 36, y + 21);

  y += 42;
  if (meta?.length) {
    const cardWidth = (w - 28 - 6 * (meta.length - 1)) / meta.length;
    meta.forEach(([label, value], idx) => {
      const x = 14 + idx * (cardWidth + 6);
      doc.setFillColor(...LIGHT);
      doc.setDrawColor(...BORDER);
      doc.roundedRect(x, y, cardWidth, 18, 3, 3, 'FD');
      doc.setTextColor(...BLUE);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.text(label.toUpperCase(), x + 4, y + 7);
      doc.setTextColor(...NAVY);
      doc.setFontSize(9);
      doc.text(safe(value), x + 4, y + 14, { maxWidth: cardWidth - 8 });
    });
    y += 27;
  }
  return y;
};

const addSection = (doc: jsPDF, title: string, value: any, y: number, icon = '•') => {
  y = checkPage(doc, y, 42);
  const w = doc.internal.pageSize.getWidth();
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(219, 234, 254);
  doc.roundedRect(14, y, w - 28, 24, 4, 4, 'FD');
  doc.setFillColor(...BLUE);
  doc.circle(23, y + 12, 5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text(icon, 23, y + 14, { align: 'center' });
  doc.setTextColor(...NAVY);
  doc.setFontSize(10.5);
  doc.text(title.toUpperCase(), 34, y + 9);
  doc.setDrawColor(...BLUE);
  doc.setLineWidth(0.4);
  doc.line(34, y + 12, w - 18, y + 12);
  doc.setTextColor(...SLATE);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const newY = addWrapped(doc, value, 34, y + 18, w - 52, 4.5);
  return Math.max(y + 30, newY + 4);
};

const addInfoGrid = (doc: jsPDF, rows: Array<[string, any]>, y: number) => {
  const w = doc.internal.pageSize.getWidth();
  const colW = (w - 34) / 2;
  rows.forEach(([label, value], idx) => {
    y = checkPage(doc, y, 28);
    const x = idx % 2 === 0 ? 14 : 20 + colW;
    if (idx % 2 === 0 && idx > 0) y += 2;
    const cy = y + Math.floor(idx / 2) * 0;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, cy, colW, 18, 3, 3, 'FD');
    doc.setFillColor(219, 234, 254);
    doc.circle(x + 8, cy + 9, 5, 'F');
    doc.setTextColor(...BLUE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.text(label, x + 17, cy + 7);
    doc.setTextColor(...NAVY);
    doc.setFontSize(8.5);
    doc.text(safe(value), x + 17, cy + 13, { maxWidth: colW - 21 });
    if (idx % 2 === 1) y += 21;
  });
  if (rows.length % 2 === 1) y += 21;
  return y + 4;
};

export const downloadFichaClinicaPremiumPdf = (patient?: PdfPatient | null, physio?: PdfPhysio | null) => {
  const id = documentId('FCH-FICHA');
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  addHeader(doc, 'Ficha clínica', 'Resumo clínico', new Date().toISOString());
  let y = addPatientHero(doc, patient, physio, [
    ['ID paciente', safe(patient?.id, 'FCH paciente')],
    ['Origem', safe(patient?.origem || patient?.tipo_paciente)],
    ['Emissão', formatDateTime()],
  ]);
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('INFORMAÇÕES DO PACIENTE', 14, y);
  doc.setDrawColor(...BLUE);
  doc.line(61, y - 1, 196, y - 1);
  y += 7;
  y = addInfoGrid(doc, [
    ['Nome', patient?.nome_completo],
    ['Telefone', patient?.telefone],
    ['E-mail', patient?.email],
    ['Nascimento', formatDate(patient?.data_nascimento)],
    ['Diagnóstico', patient?.diagnostico],
    ['Observações', patient?.observacoes],
  ], y);
  y = addSection(doc, 'Fisioterapeuta responsável', `${safe(physio?.nome_completo)}\nCREFITO: ${safe(physio?.crefito)}`, y + 4, '+');
  addFooter(doc, id, physio);
  doc.save(fileName('ficha-clinica-premium', patient));
};

export const downloadAvaliacaoPremiumPdf = (evaluation: PdfRecord, patient?: PdfPatient | null, physio?: PdfPhysio | null) => {
  const id = documentId('FCH-AVF', evaluation);
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  addHeader(doc, 'Avaliação fisioterapêutica', 'Avaliação', evaluation.created_at);
  let y = addPatientHero(doc, patient, physio, [
    ['Data da avaliação', formatDate(evaluation.created_at)],
    ['Paciente', safe(patient?.nome_completo)],
    ['Dor', evaluation.escala_dor !== undefined && evaluation.escala_dor !== null ? `${evaluation.escala_dor}/10` : 'Não informado'],
  ]);
  y = addSection(doc, 'Queixa principal', evaluation.queixa_principal, y, '1');
  y = addSection(doc, 'História da doença atual', evaluation.historia_doenca_atual, y, '2');
  y = addSection(doc, 'Diagnóstico fisioterapêutico', evaluation.diagnostico_fisio, y, '3');
  y = addSection(doc, 'Objetivos terapêuticos', evaluation.objetivos_terapeuticos, y, '4');
  y = addSection(doc, 'Conduta', evaluation.conduta, y, '5');
  y = addSection(doc, 'Prognóstico', evaluation.prognostico, y, '6');
  y = addSection(doc, 'Observações finais', evaluation.observacoes_finais, y, '7');
  addFooter(doc, id, physio);
  doc.save(fileName('avaliacao-fisioterapeutica-premium', patient));
};

export const downloadEvolucaoPremiumPdf = (evolution: PdfRecord, patient?: PdfPatient | null, physio?: PdfPhysio | null) => {
  const id = documentId('FCH-EVOL', evolution);
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  addHeader(doc, 'Evolução clínica', 'Evolução', evolution.created_at);
  let y = addPatientHero(doc, patient, physio, [
    ['Data da sessão', formatDate(evolution.created_at)],
    ['Horário', formatDateTime(evolution.created_at).split(',').pop()?.trim() || 'Não informado'],
    ['Dor', evolution.dor_escala !== undefined && evolution.dor_escala !== null ? `${evolution.dor_escala}/10` : 'Não informado'],
  ]);
  y = addSection(doc, 'Descrição', evolution.descricao, y, 'D');
  y = addSection(doc, 'Exercícios realizados', evolution.exercicios_realizados, y, 'E');
  y = addSection(doc, 'Observações', evolution.observacoes, y, 'O');
  y = addSection(doc, 'Plano terapêutico', evolution.plano, y, 'P');
  const resumo = `Paciente em acompanhamento fisioterapêutico. Registro de dor: ${safe(evolution.dor_escala, '-')}/10. Conduta e progressão descritas conforme evolução clínica.`;
  y = addSection(doc, 'Resumo da evolução', resumo, y, 'R');
  addFooter(doc, id, physio);
  doc.save(fileName('evolucao-clinica-premium', patient));
};

export const downloadGeneratedDocumentPremiumPdf = (documentData: PdfRecord, physio?: PdfPhysio | null) => {
  const patient: PdfPatient = { nome_completo: documentData.patient_name, email: documentData.patient_email };
  const id = documentId('FCH-DOC', documentData);
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  addHeader(doc, safe(documentData.type, 'Documento'), 'Documento clínico', documentData.criado_em || documentData.created_at);
  let y = addPatientHero(doc, patient, { nome_completo: documentData.physio_name || physio?.nome_completo, crefito: physio?.crefito }, [
    ['Tipo', safe(documentData.type, 'Documento')],
    ['Paciente', safe(documentData.patient_name)],
    ['Emissão', formatDateTime(documentData.criado_em || documentData.created_at)],
  ]);
  const content = safe(documentData.content || documentData.conteudo || documentData.texto, 'Documento sem conteúdo textual.');
  y = addSection(doc, 'Conteúdo do documento', content, y, 'DOC');
  addFooter(doc, id, { nome_completo: documentData.physio_name || physio?.nome_completo, crefito: physio?.crefito });
  doc.save(fileName(`${safe(documentData.type, 'documento')}-premium`, patient));
};

export const downloadSoapEvolutionPremiumPdf = (record: PdfRecord, patient?: PdfPatient | null, physio?: PdfPhysio | null) => {
  const id = documentId('FCH-SOAP', record);
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  addHeader(doc, 'Relatório de evolução SOAP', 'SOAP', record.created_at);
  let y = addPatientHero(doc, patient, physio, [
    ['Data', formatDate(record.created_at)],
    ['Paciente', safe(patient?.nome_completo)],
    ['Profissional', safe(physio?.nome_completo)],
  ]);
  y = addSection(doc, 'S - Subjetivo', record.subjective || record.raw_text, y, 'S');
  y = addSection(doc, 'O - Objetivo', record.objective, y, 'O');
  y = addSection(doc, 'A - Avaliação', record.assessment, y, 'A');
  y = addSection(doc, 'P - Plano', record.plan, y, 'P');
  addFooter(doc, id, physio);
  doc.save(fileName('relatorio-evolucao-soap-premium', patient));
};
