import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../lib/supabase';

export type PatientPdfProfile = {
  nome_completo?: string | null;
  crefito?: string | null;
  email?: string | null;
  telefone?: string | null;
};

type PdfPatient = {
  id: string;
  nome_completo: string;
  data_nascimento?: string | null;
  telefone?: string | null;
  email?: string | null;
  observacoes?: string | null;
  tipo_paciente?: string | null;
};

type PdfProtocol = {
  id: string;
  fisioterapeuta_id: string;
  paciente_id: string;
  titulo: string;
  observacoes_gerais?: string | null;
  status?: string | null;
  created_at?: string | null;
};

type PdfProtocolItem = {
  id: string;
  series?: string | null;
  repeticoes?: string | null;
  carga?: string | null;
  frequencia?: string | null;
  observacoes_especificas?: string | null;
  ordem?: number | null;
  exercicio?: {
    nome?: string | null;
    descricao?: string | null;
    objetivo_principal?: string | null;
    subcategoria?: string | null;
    indicacao_clinica?: string | null;
    precaucoes?: string | null;
    dificuldade?: string | null;
  } | null;
};

const valueOrDash = (value?: string | number | null) => {
  if (value === null || value === undefined || value === '') return '-';
  return String(value);
};

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('pt-BR');
};

const sanitizeFileName = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

const addWrappedText = (doc: jsPDF, text: string, x: number, y: number, maxWidth: number, lineHeight = 6) => {
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
};

const addFooter = (doc: jsPDF) => {
  const pageCount = doc.getNumberOfPages();
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();

  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text('Gerado pelo FisioCareHub', 14, height - 10);
    doc.text(`Página ${page} de ${pageCount}`, width - 14, height - 10, { align: 'right' });
  }
};

async function getPatient(patientId: string): Promise<PdfPatient> {
  const { data, error } = await supabase
    .from('pacientes')
    .select('*')
    .eq('id', patientId)
    .single();

  if (error) throw error;
  return data as PdfPatient;
}

async function getLatestProtocol(patientId: string, protocolId?: string): Promise<PdfProtocol> {
  let query = supabase
    .from('protocolos_prescricao')
    .select('*')
    .eq('paciente_id', patientId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (protocolId) {
    query = supabase
      .from('protocolos_prescricao')
      .select('*')
      .eq('id', protocolId)
      .limit(1);
  }

  const { data, error } = await query;
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('Este paciente ainda não tem protocolo de exercícios para gerar PDF.');
  }

  return data[0] as PdfProtocol;
}

async function getProtocolItems(protocolId: string): Promise<PdfProtocolItem[]> {
  const { data, error } = await supabase
    .from('protocolo_itens')
    .select(`
      *,
      exercicio:exercicios (
        nome,
        descricao,
        objetivo_principal,
        subcategoria,
        indicacao_clinica,
        precaucoes,
        dificuldade
      )
    `)
    .eq('protocolo_id', protocolId)
    .order('ordem', { ascending: true });

  if (error) throw error;
  return (data || []) as PdfProtocolItem[];
}

async function getPhysioProfile(fisioterapeutaId: string, fallback?: PatientPdfProfile | null): Promise<PatientPdfProfile> {
  if (fallback?.nome_completo || fallback?.crefito) return fallback;

  const { data } = await supabase
    .from('perfis')
    .select('nome_completo, crefito, email, telefone')
    .eq('id', fisioterapeutaId)
    .maybeSingle();

  return (data as PatientPdfProfile) || fallback || {};
}

export async function downloadPrescriptionPdf(params: {
  patientId: string;
  protocolId?: string;
  physioProfile?: PatientPdfProfile | null;
}) {
  const patient = await getPatient(params.patientId);
  const protocol = await getLatestProtocol(params.patientId, params.protocolId);
  const [items, physio] = await Promise.all([
    getProtocolItems(protocol.id),
    getPhysioProfile(protocol.fisioterapeuta_id, params.physioProfile)
  ]);

  if (items.length === 0) {
    throw new Error('O protocolo existe, mas ainda não possui exercícios vinculados.');
  }

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 16;

  doc.setFillColor(2, 132, 199);
  doc.rect(0, 0, pageWidth, 34, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Prescrição de Exercícios', 14, 15);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('FisioCareHub', 14, 23);
  doc.text(formatDate(protocol.created_at || new Date().toISOString()), pageWidth - 14, 23, { align: 'right' });

  y = 44;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Dados do paciente', 14, y);
  y += 7;

  autoTable(doc, {
    startY: y,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 2.5, textColor: [15, 23, 42] },
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
    head: [['Paciente', 'Nascimento', 'Telefone', 'E-mail']],
    body: [[
      valueOrDash(patient.nome_completo),
      formatDate(patient.data_nascimento),
      valueOrDash(patient.telefone),
      valueOrDash(patient.email),
    ]],
  });

  y = ((doc as any).lastAutoTable?.finalY || y + 18) + 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Dados do fisioterapeuta', 14, y);
  y += 7;

  autoTable(doc, {
    startY: y,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 2.5, textColor: [15, 23, 42] },
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
    head: [['Fisioterapeuta', 'CREFITO', 'Contato']],
    body: [[
      valueOrDash(physio.nome_completo),
      valueOrDash(physio.crefito),
      valueOrDash(physio.telefone || physio.email),
    ]],
  });

  y = ((doc as any).lastAutoTable?.finalY || y + 18) + 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(valueOrDash(protocol.titulo), 14, y);
  y += 7;

  if (protocol.observacoes_gerais) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    y = addWrappedText(doc, `Observações gerais: ${protocol.observacoes_gerais}`, 14, y, pageWidth - 28);
    y += 4;
  }

  autoTable(doc, {
    startY: y,
    theme: 'striped',
    styles: { fontSize: 8.5, cellPadding: 2.2, valign: 'top', textColor: [15, 23, 42] },
    headStyles: { fillColor: [2, 132, 199], textColor: [255, 255, 255] },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 38 },
      2: { cellWidth: 48 },
      3: { cellWidth: 18 },
      4: { cellWidth: 22 },
      5: { cellWidth: 20 },
      6: { cellWidth: 28 },
    },
    head: [['#', 'Exercício', 'Descrição', 'Séries', 'Repetições', 'Carga', 'Frequência']],
    body: items.map((item, index) => [
      String(index + 1),
      valueOrDash(item.exercicio?.nome),
      valueOrDash(item.exercicio?.descricao),
      valueOrDash(item.series),
      valueOrDash(item.repeticoes),
      valueOrDash(item.carga),
      valueOrDash(item.frequencia),
    ]),
  });

  y = ((doc as any).lastAutoTable?.finalY || y + 20) + 10;

  items.forEach((item, index) => {
    const details = [
      item.observacoes_especificas ? `Orientação específica: ${item.observacoes_especificas}` : '',
      item.exercicio?.indicacao_clinica ? `Indicação clínica: ${item.exercicio.indicacao_clinica}` : '',
      item.exercicio?.precaucoes ? `Precauções: ${item.exercicio.precaucoes}` : '',
    ].filter(Boolean).join('\n');

    if (!details) return;

    if (y > 260) {
      doc.addPage();
      y = 16;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(`${index + 1}. ${valueOrDash(item.exercicio?.nome)}`, 14, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    y = addWrappedText(doc, details, 14, y, pageWidth - 28, 5);
    y += 5;
  });

  if (patient.observacoes) {
    if (y > 250) {
      doc.addPage();
      y = 16;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Observações do paciente', 14, y);
    y += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    addWrappedText(doc, patient.observacoes, 14, y, pageWidth - 28, 5);
  }

  addFooter(doc);

  const fileName = `prescricao-${sanitizeFileName(patient.nome_completo || 'paciente')}-${formatDate(protocol.created_at || new Date().toISOString()).replace(/\//g, '-')}.pdf`;
  doc.save(fileName);

  return { patient, protocol, items, fileName };
}

export function openWhatsAppShare(params: { patientName?: string | null; phone?: string | null }) {
  const message = `Olá${params.patientName ? ` ${params.patientName}` : ''}! Estou enviando sua prescrição de exercícios em PDF. Siga as orientações e me avise se tiver qualquer dúvida.`;
  const onlyDigits = (params.phone || '').replace(/\D/g, '');
  const phoneWithCountry = onlyDigits.startsWith('55') ? onlyDigits : `55${onlyDigits}`;
  const baseUrl = onlyDigits ? `https://wa.me/${phoneWithCountry}` : 'https://wa.me/';
  window.open(`${baseUrl}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
}

type FullRecordSection = {
  title: string;
  rows: Record<string, any>[];
};

const formatAnyValue = (value: any): string => {
  if (value === null || value === undefined || value === '') return '-';
  if (Array.isArray(value)) return value.length ? value.map(formatAnyValue).join(', ') : '-';
  if (typeof value === 'object') return JSON.stringify(value);
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return formatDate(value);
  return String(value);
};

const addSectionTitle = (doc: jsPDF, title: string, y: number) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  if (y > 260) {
    doc.addPage();
    y = 16;
  }
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(14, y - 5, pageWidth - 28, 10, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(title, 18, y + 2);
  return y + 10;
};

const addKeyValueTable = (doc: jsPDF, y: number, rows: Array<[string, string]>) => {
  autoTable(doc, {
    startY: y,
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2.2, textColor: [15, 23, 42], valign: 'top' },
    columnStyles: { 0: { cellWidth: 48, fontStyle: 'bold' }, 1: { cellWidth: 132 } },
    body: rows,
  });
  return ((doc as any).lastAutoTable?.finalY || y + 16) + 8;
};

async function safeSelect(table: string, patientId: string, patientColumn = 'paciente_id') {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq(patientColumn, patientId)
    .limit(100);

  if (error) {
    console.warn(`Não foi possível carregar ${table}:`, error.message);
    return [];
  }

  return data || [];
}

export async function downloadPatientRecordPdf(params: {
  patientId: string;
  physioProfile?: PatientPdfProfile | null;
}) {
  const patient = await getPatient(params.patientId);

  const [
    evolucoes,
    avaliacoes,
    prontuarios,
    registrosDor,
    documentos,
    protocolos,
  ] = await Promise.all([
    safeSelect('evolucoes', params.patientId),
    safeSelect('fichas_avaliacao', params.patientId),
    safeSelect('prontuarios', params.patientId),
    safeSelect('registros_paciente', params.patientId),
    safeSelect('documentos_gerados', params.patientId),
    supabase
      .from('protocolos_prescricao')
      .select(`
        *,
        itens:protocolo_itens (
          *,
          exercicio:exercicios (*)
        )
      `)
      .eq('paciente_id', params.patientId)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.warn('Não foi possível carregar protocolos_prescricao:', error.message);
          return [];
        }
        return data || [];
      })
  ]);

  const firstProtocol = Array.isArray(protocolos) && protocolos.length > 0 ? protocolos[0] : null;
  const physio = await getPhysioProfile(firstProtocol?.fisioterapeuta_id || '', params.physioProfile);

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 16;

  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageWidth, 36, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Prontuário Completo do Paciente', 14, 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('FisioCareHub', 14, 25);
  doc.text(new Date().toLocaleDateString('pt-BR'), pageWidth - 14, 25, { align: 'right' });

  y = 46;
  y = addSectionTitle(doc, 'Dados do paciente', y);
  y = addKeyValueTable(doc, y, [
    ['Nome', valueOrDash(patient.nome_completo)],
    ['Nascimento', formatDate(patient.data_nascimento)],
    ['Telefone', valueOrDash(patient.telefone)],
    ['E-mail', valueOrDash(patient.email)],
    ['Tipo de paciente', valueOrDash(patient.tipo_paciente || 'interno')],
    ['Observações', valueOrDash(patient.observacoes)],
  ]);

  y = addSectionTitle(doc, 'Dados do fisioterapeuta', y);
  y = addKeyValueTable(doc, y, [
    ['Nome', valueOrDash(physio.nome_completo)],
    ['CREFITO', valueOrDash(physio.crefito)],
    ['Contato', valueOrDash(physio.telefone || physio.email)],
  ]);

  const sections: FullRecordSection[] = [
    { title: 'Avaliações', rows: avaliacoes as Record<string, any>[] },
    { title: 'Evoluções', rows: evolucoes as Record<string, any>[] },
    { title: 'Prontuários SOAP / Clínicos', rows: prontuarios as Record<string, any>[] },
    { title: 'Diário de dor e registros do paciente', rows: registrosDor as Record<string, any>[] },
    { title: 'Documentos gerados', rows: documentos as Record<string, any>[] },
  ];

  sections.forEach((section) => {
    y = addSectionTitle(doc, section.title, y);

    if (!section.rows.length) {
      doc.setTextColor(71, 85, 105);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('Nenhum registro encontrado.', 14, y);
      y += 10;
      return;
    }

    section.rows.forEach((row, index) => {
      if (y > 245) {
        doc.addPage();
        y = 16;
      }

      const ignoredKeys = new Set(['id', 'paciente_id', 'fisioterapeuta_id', 'user_id', 'updated_at']);
      const pairs = Object.entries(row)
        .filter(([key, value]) => !ignoredKeys.has(key) && value !== null && value !== undefined && value !== '')
        .slice(0, 12)
        .map(([key, value]) => [key.replace(/_/g, ' '), formatAnyValue(value)] as [string, string]);

      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(`${index + 1}. Registro`, 14, y);
      y += 5;
      y = addKeyValueTable(doc, y, pairs.length ? pairs : [['Registro', 'Sem detalhes preenchidos']]);
    });
  });

  y = addSectionTitle(doc, 'Prescrições de exercícios', y);

  if (!protocolos.length) {
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Nenhuma prescrição encontrada.', 14, y);
    y += 10;
  } else {
    protocolos.forEach((protocol: any, protocolIndex: number) => {
      if (y > 235) {
        doc.addPage();
        y = 16;
      }

      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(`${protocolIndex + 1}. ${valueOrDash(protocol.titulo)}`, 14, y);
      y += 6;

      const items = protocol.itens || [];
      if (!items.length) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text('Protocolo sem exercícios vinculados.', 14, y);
        y += 9;
        return;
      }

      autoTable(doc, {
        startY: y,
        theme: 'striped',
        styles: { fontSize: 8, cellPadding: 2, valign: 'top', textColor: [15, 23, 42] },
        headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255] },
        head: [['Exercício', 'Séries', 'Repetições', 'Carga', 'Frequência', 'Orientação']],
        body: items.map((item: any) => [
          valueOrDash(item.exercicio?.nome),
          valueOrDash(item.series),
          valueOrDash(item.repeticoes),
          valueOrDash(item.carga),
          valueOrDash(item.frequencia),
          valueOrDash(item.observacoes_especificas || item.exercicio?.descricao),
        ]),
      });
      y = ((doc as any).lastAutoTable?.finalY || y + 18) + 8;
    });
  }

  addFooter(doc);

  const fileName = `prontuario-completo-${sanitizeFileName(patient.nome_completo || 'paciente')}-${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`;
  doc.save(fileName);

  return { fileName, patient };
}
