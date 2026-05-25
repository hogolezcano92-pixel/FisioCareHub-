import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  Plus, 
  Star, 
  Download, 
  Trash2, 
  Eye, 
  Wand2, 
  ChevronRight,
  FileCheck,
  FileSignature,
  ClipboardCheck,
  FileSearch,
  Library,
  X,
  Loader2,
  CheckCircle2,
  Printer,
  Lock,
  FileJson,
  AlertCircle,
  Crown
} from 'lucide-react';
import { generateDocument } from '../lib/groq';
import html2canvas from 'html2canvas';
import ReactMarkdown from 'react-markdown';
import { createRoot } from 'react-dom/client';
import ProGuard from '../components/ProGuard';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';
import { getLinkedClinicalPatients } from '../services/patientLinkService';
import { getPrivateDocumentUrl } from '../services/supabaseStorage';
import { generateLegalDocumentPDF } from '../lib/legalDocumentPdf';
import { FREE_DOCUMENT_MONTHLY_LIMIT, getEffectivePlan, isFreeDocumentTemplate } from '../lib/planAccess';

const FAVORITE_TEMPLATES = [
  { id: 'contrato', name: 'Contrato de Prestação', icon: FileSignature, color: 'text-blue-600', bg: 'bg-blue-50' },
  { id: 'atestado', name: 'Atestado de Comparecimento', icon: FileCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { id: 'autorizacao', name: 'Autorização de Imagem', icon: ClipboardCheck, color: 'text-amber-600', bg: 'bg-amber-50' },
  { id: 'laudo', name: 'Laudo/Relatório', icon: FileSearch, color: 'text-purple-600', bg: 'bg-purple-50' },
];

type DocumentField = {
  key: string;
  label: string;
  placeholder?: string;
  type?: 'text' | 'number' | 'date' | 'time' | 'select' | 'textarea';
  options?: string[];
  required?: boolean;
  cols?: 'full' | 'half';
};

const CONTRACT_FIELDS: DocumentField[] = [
  { key: 'tipoServico', label: 'Tipo de serviço', type: 'select', required: true, options: ['Avaliação fisioterapêutica', 'Sessão domiciliar', 'Reabilitação ortopédica', 'Reabilitação neurológica', 'Reabilitação cardiorrespiratória', 'Pilates terapêutico', 'Atendimento pós-operatório', 'Outro'] },
  { key: 'valorSessao', label: 'Valor por sessão', placeholder: 'Ex: R$ 120,00', required: true },
  { key: 'numeroSessoes', label: 'Número de sessões', placeholder: 'Ex: 10 sessões', required: true },
  { key: 'frequencia', label: 'Frequência', type: 'select', required: true, options: ['1x por semana', '2x por semana', '3x por semana', 'Semanal', 'Quinzenal', 'Mensal', 'Conforme evolução clínica'] },
  { key: 'duracaoSessao', label: 'Duração da sessão', type: 'select', required: true, options: ['30 minutos', '45 minutos', '50 minutos', '60 minutos', '90 minutos'] },
  { key: 'localAtendimento', label: 'Local do atendimento', type: 'select', required: true, options: ['Domiciliar', 'Clínica', 'Online', 'Hospitalar', 'Academia/Studio', 'Outro'] },
  { key: 'formaPagamento', label: 'Forma de pagamento', type: 'select', required: true, options: ['Pix', 'Cartão', 'Dinheiro', 'Transferência bancária', 'Mensal', 'Pacote antecipado'] },
  { key: 'vigencia', label: 'Vigência', placeholder: 'Ex: 60 dias ou até finalizar o pacote', required: true },
  { key: 'cancelamento', label: 'Política de cancelamento', type: 'select', required: true, options: ['24h de antecedência', '12h de antecedência', '48h de antecedência', 'Sem cobrança com aviso prévio', 'Conforme acordo entre as partes'] },
  { key: 'objetivoTratamento', label: 'Objetivo do tratamento', type: 'textarea', cols: 'full', placeholder: 'Ex: Reabilitação cervical, controle da dor e melhora da mobilidade funcional.' },
];

const ATTESTATION_FIELDS: DocumentField[] = [
  { key: 'dataAtendimento', label: 'Data do atendimento', type: 'date', required: true },
  { key: 'horaInicio', label: 'Horário de início', type: 'time', required: true },
  { key: 'horaFim', label: 'Horário de término', type: 'time' },
  { key: 'localAtendimento', label: 'Local/modalidade', type: 'select', required: true, options: ['Clínica', 'Domiciliar', 'Online', 'Hospitalar', 'Outro'] },
  { key: 'finalidade', label: 'Finalidade', type: 'select', options: ['Comprovação de comparecimento', 'Acompanhamento fisioterapêutico', 'Justificativa administrativa', 'Outro'] },
  { key: 'observacaoAtestado', label: 'Observações do atestado', type: 'textarea', cols: 'full', placeholder: 'Ex: Evitar informar diagnóstico quando não for necessário.' },
];

const IMAGE_AUTH_FIELDS: DocumentField[] = [
  { key: 'usoClinico', label: 'Uso clínico no prontuário', type: 'select', required: true, options: ['Autorizado', 'Não autorizado'] },
  { key: 'usoEducativo', label: 'Uso educativo/científico', type: 'select', required: true, options: ['Autorizado sem identificação', 'Autorizado com identificação', 'Não autorizado'] },
  { key: 'usoMarketing', label: 'Uso em divulgação/marketing', type: 'select', required: true, options: ['Não autorizado', 'Autorizado sem identificação', 'Autorizado com identificação'] },
  { key: 'canais', label: 'Canais permitidos', placeholder: 'Ex: prontuário, app, site, Instagram, materiais educativos' },
  { key: 'prazoAutorizacao', label: 'Prazo da autorização', type: 'select', options: ['Até revogação por escrito', '6 meses', '12 meses', '24 meses'] },
  { key: 'observacaoImagem', label: 'Observações da autorização', type: 'textarea', cols: 'full', placeholder: 'Ex: Paciente autoriza apenas imagens sem identificação facial.' },
];

const REPORT_FIELDS: DocumentField[] = [
  { key: 'tipoRelatorio', label: 'Tipo de relatório', type: 'select', required: true, options: ['Laudo fisioterapêutico', 'Relatório de evolução', 'Relatório funcional', 'Relatório para encaminhamento', 'Relatório para convênio'] },
  { key: 'queixaPrincipal', label: 'Queixa principal', placeholder: 'Ex: Dor cervical há 2 semanas', required: true },
  { key: 'avaliacaoFuncional', label: 'Avaliação funcional', type: 'textarea', cols: 'full', placeholder: 'Ex: Limitação de ADM, dor ao movimento, alterações posturais, testes funcionais.' },
  { key: 'conduta', label: 'Conduta realizada', type: 'textarea', cols: 'full', placeholder: 'Ex: Terapia manual, exercícios terapêuticos, orientações domiciliares.' },
  { key: 'evolucao', label: 'Evolução clínica', type: 'textarea', cols: 'full', placeholder: 'Ex: Paciente evoluiu com redução da dor e melhora funcional.' },
  { key: 'recomendacoes', label: 'Recomendações', type: 'textarea', cols: 'full', placeholder: 'Ex: Manter exercícios, retorno em X dias, reavaliação.' },
];

const GENERIC_FIELDS: DocumentField[] = [
  { key: 'objetivoDocumento', label: 'Objetivo do documento', type: 'textarea', cols: 'full', placeholder: 'Descreva o que precisa constar no documento.' },
];

const getFieldsForTemplate = (templateId?: string): DocumentField[] => {
  if (templateId === 'contrato') return CONTRACT_FIELDS;
  if (templateId === 'atestado') return ATTESTATION_FIELDS;
  if (templateId === 'autorizacao') return IMAGE_AUTH_FIELDS;
  if (templateId === 'laudo') return REPORT_FIELDS;
  return GENERIC_FIELDS;
};

const getInitialDocumentFields = (templateId?: string) =>
  getFieldsForTemplate(templateId).reduce<Record<string, string>>((acc, field) => {
    acc[field.key] = '';
    return acc;
  }, {});

const formatDocumentFieldsForAI = (templateId: string | undefined, fields: Record<string, string>, extraInfo: string) => {
  const fieldLines = getFieldsForTemplate(templateId)
    .map((field) => `- ${field.label}: ${fields[field.key]?.trim() || 'A definir antes da assinatura'}`)
    .join('\n');

  return `DADOS ESTRUTURADOS DO DOCUMENTO:\n${fieldLines}\n\nOBSERVAÇÕES ADICIONAIS DO PROFISSIONAL:\n${extraInfo?.trim() || 'Nenhuma observação adicional.'}`;
};

const getMissingRequiredDocumentFields = (templateId: string | undefined, fields: Record<string, string>) =>
  getFieldsForTemplate(templateId)
    .filter((field) => field.required && !fields[field.key]?.trim())
    .map((field) => field.label);

export default function Documents() {
  const { user, profile, subscription, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const isPhysio = profile?.tipo_usuario === 'fisioterapeuta';
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [patientName, setPatientName] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [documentFields, setDocumentFields] = useState<Record<string, string>>(getInitialDocumentFields());
  const [generating, setGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [viewingDoc, setViewingDoc] = useState<any>(null);
  const [viewingFileUrl, setViewingFileUrl] = useState<string | null>(null);
  const [loadingPreviewFile, setLoadingPreviewFile] = useState(false);
  const [docToDelete, setDocToDelete] = useState<string | null>(null);
  const [isEvolutionModalOpen, setIsEvolutionModalOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patients, setPatients] = useState<any[]>([]);
  const [patientRecords, setPatientRecords] = useState<any[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);

  const currentPlan = useMemo(() => getEffectivePlan(profile, subscription), [profile, subscription]);
  const isFreePhysio = isPhysio && currentPlan === 'free';

  const freeDocumentsUsedThisMonth = useMemo(() => {
    if (!isFreePhysio) return 0;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();

    return documents.filter((doc) => {
      if (doc?.isClinicalFile) return false;
      const createdAt = new Date(doc?.criado_em || doc?.created_at || 0).getTime();
      return createdAt >= monthStart && createdAt < nextMonthStart;
    }).length;
  }, [documents, isFreePhysio]);

  const hasReachedFreeDocumentLimit = isFreePhysio && freeDocumentsUsedThisMonth >= FREE_DOCUMENT_MONTHLY_LIMIT;

  const showUpgradeToast = (message: string) => {
    import('sonner').then(({ toast }) => toast.error(message));
  };

  const countFreeDocumentsCreatedThisMonth = async () => {
    if (!user) return 0;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();

    const { count, error } = await supabase
      .from('documentos_gerados')
      .select('id', { count: 'exact', head: true })
      .eq('physio_id', user.id)
      .gte('criado_em', monthStart)
      .lt('criado_em', nextMonthStart);

    if (error) {
      console.error('Erro ao contar documentos gratuitos do mês:', error);
      return freeDocumentsUsedThisMonth;
    }

    return count || 0;
  };

  useEffect(() => {
    if (authLoading || !isPhysio) return;
    
    // Fetch patients for evolution report
    const fetchPatients = async () => {
      const { data } = await supabase.from('pacientes').select('id, nome_completo');
      if (data) setPatients(data);
    };
    fetchPatients();
  }, [authLoading, isPhysio]);

  useEffect(() => {
    if (selectedPatientId) {
      fetchPatientRecords(selectedPatientId);
    }
  }, [selectedPatientId]);

  const fetchPatientRecords = async (pid: string) => {
    setLoadingRecords(true);
    try {
      const { data } = await supabase
        .from('soap_notes')
        .select('*')
        .eq('patient_id', pid)
        .order('created_at', { ascending: false });
      
      setPatientRecords(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRecords(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setLoading(false);
      return;
    }

    const fetchDocumentsData = async () => {
      if (!profile) {
        setLoading(false);
        return;
      }

      try {
        if (isPhysio) {
          const { data, error } = await supabase
            .from('documentos_gerados')
            .select('*')
            .eq('physio_id', user.id)
            .order('criado_em', { ascending: false });

          if (error) throw error;
          setDocuments(data || []);
        } else {
          const linkedPatients = await getLinkedClinicalPatients(user.id, user.email);
          const linkedEmails = Array.from(new Set([user.email, ...linkedPatients.map((p) => p.email)].filter(Boolean).map((email: any) => String(email).toLowerCase())));
          const linkedPatientIds = linkedPatients.map((p) => p.id).filter(Boolean);

          let generatedDocs: any[] = [];
          if (linkedEmails.length > 0) {
            const { data, error } = await supabase
              .from('documentos_gerados')
              .select('*')
              .in('patient_email', linkedEmails)
              .order('criado_em', { ascending: false });

            if (error) throw error;
            generatedDocs = data || [];
          }

          let clinicalFiles: any[] = [];
          if (linkedPatientIds.length > 0) {
            const { data: fileData, error: fileError } = await supabase
              .from('arquivos_paciente')
              .select('*')
              .in('paciente_id', linkedPatientIds)
              .order('created_at', { ascending: false });

            if (fileError) {
              console.error('Erro ao buscar arquivos clínicos do paciente:', fileError);
            } else {
              const patientById = new Map(linkedPatients.map((patient: any) => [String(patient.id), patient]));
              const physioIds = Array.from(
                new Set(
                  linkedPatients
                    .map((patient: any) => patient.fisioterapeuta_id)
                    .filter(Boolean)
                    .map(String)
                )
              );

              let physioById = new Map<string, any>();
              if (physioIds.length > 0) {
                const { data: physioProfiles, error: physioError } = await supabase
                  .from('perfis')
                  .select('id, nome_completo, email')
                  .in('id', physioIds);

                if (physioError) {
                  console.error('Erro ao buscar fisioterapeutas dos documentos:', physioError);
                } else {
                  physioById = new Map((physioProfiles || []).map((physio: any) => [String(physio.id), physio]));
                }
              }

              clinicalFiles = (fileData || []).map((file: any) => {
                const linkedPatient = patientById.get(String(file.paciente_id));
                const physioId = linkedPatient?.fisioterapeuta_id || file.fisioterapeuta_id || file.physio_id || file.fisio_id;
                const physio = physioId ? physioById.get(String(physioId)) : null;
                const fileName =
                  file.nome_arquivo ||
                  file.nome ||
                  file.titulo ||
                  file.name ||
                  file.file_name ||
                  file.filename ||
                  'Documento clínico';

                return {
                  id: `arquivo-${file.id}`,
                  type: fileName,
                  document_name: fileName,
                  document_category: file.tipo || file.categoria || 'Arquivo do prontuário',
                  patient_name: linkedPatient?.nome_completo || profile?.nome_completo || 'Paciente',
                  physio_name: physio?.nome_completo || file.nome_fisioterapeuta || 'Fisioterapeuta',
                  content: file.observacoes || file.descricao || '',
                  criado_em: file.created_at || file.criado_em,
                  arquivo_url: file.arquivo_url,
                  file_path: file.file_path,
                  mime_type: file.mime_type || file.tipo_arquivo || '',
                  isClinicalFile: true,
                };
              });
            }
          }

          setDocuments([...generatedDocs, ...clinicalFiles].sort((a, b) => new Date(b.criado_em || b.created_at || 0).getTime() - new Date(a.criado_em || a.created_at || 0).getTime()));
        }
      } catch (err) {
        console.error("Erro ao buscar documentos:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDocumentsData();
  }, [user, profile, authLoading]);

  const handleCreateNew = (template?: any) => {
    if (isFreePhysio) {
      if (!isFreeDocumentTemplate(template?.id)) {
        showUpgradeToast('Este modelo é liberado nos planos Basic ou PRO. No gratuito, use os modelos básicos para teste.');
        return;
      }

      if (hasReachedFreeDocumentLimit) {
        showUpgradeToast(`Você já usou os ${FREE_DOCUMENT_MONTHLY_LIMIT} documentos básicos do plano gratuito neste mês.`);
        return;
      }
    }

    setSelectedTemplate(template || null);
    setGeneratedContent('');
    setPatientName('');
    setPatientEmail('');
    setAdditionalInfo('');
    setDocumentFields(getInitialDocumentFields(template?.id));
    setIsModalOpen(true);
  };

  const updateDocumentField = (key: string, value: string) => {
    setDocumentFields((prev) => ({ ...prev, [key]: value }));
  };

  const selectedTemplateId = selectedTemplate?.id as string | undefined;
  const currentDocumentFields = getFieldsForTemplate(selectedTemplateId);

  const generateWithAI = async () => {
    if (!patientName) {
      import('sonner').then(({ toast }) => toast.error("Por favor, informe o nome do paciente."));
      return;
    }

    if (isFreePhysio) {
      if (!isFreeDocumentTemplate(selectedTemplateId)) {
        showUpgradeToast('Este modelo é liberado nos planos Basic ou PRO. Escolha um modelo básico para continuar no gratuito.');
        return;
      }

      const usedThisMonth = await countFreeDocumentsCreatedThisMonth();
      if (usedThisMonth >= FREE_DOCUMENT_MONTHLY_LIMIT) {
        showUpgradeToast(`Limite mensal atingido: você já gerou ${FREE_DOCUMENT_MONTHLY_LIMIT} documentos básicos neste mês.`);
        return;
      }
    }

    const missingRequired = getMissingRequiredDocumentFields(selectedTemplateId, documentFields);
    if (selectedTemplateId === 'contrato' && missingRequired.length > 0) {
      import('sonner').then(({ toast }) =>
        toast.error(`Complete os dados obrigatórios do contrato: ${missingRequired.slice(0, 3).join(', ')}${missingRequired.length > 3 ? '...' : ''}`)
      );
      return;
    }

    setGenerating(true);
    try {
      const structuredInfo = formatDocumentFieldsForAI(selectedTemplateId, documentFields, additionalInfo);
      const content = await generateDocument(
        selectedTemplate?.name || 'Documento Geral',
        patientName,
        structuredInfo
      );
      
      if (!content || content.trim().length === 0) {
        throw new Error("A IA não conseguiu gerar o conteúdo. Por favor, tente novamente com mais informações.");
      }
      
      setGeneratedContent(content);
    } catch (err: any) {
      console.error("Erro ao gerar com IA:", err);
      import('sonner').then(({ toast }) => toast.error(err.message || "Erro ao gerar documento. Tente novamente."));
    } finally {
      setGenerating(false);
    }
  };

  const saveDocument = async () => {
    if (!generatedContent || !user || !profile) return;

    try {
      if (isFreePhysio) {
        if (!isFreeDocumentTemplate(selectedTemplateId)) {
          showUpgradeToast('Este modelo é liberado nos planos Basic ou PRO.');
          return;
        }

        const usedThisMonth = await countFreeDocumentsCreatedThisMonth();
        if (usedThisMonth >= FREE_DOCUMENT_MONTHLY_LIMIT) {
          showUpgradeToast(`Limite mensal atingido: você já salvou ${FREE_DOCUMENT_MONTHLY_LIMIT} documentos básicos neste mês.`);
          return;
        }
      }

      const { data: newDoc, error } = await supabase
        .from('documentos_gerados')
        .insert({
          physio_id: user.id,
          physio_name: profile.nome_completo || 'Fisioterapeuta',
          patient_name: patientName,
          patient_email: patientEmail ? patientEmail.trim().toLowerCase() : null,
          type: selectedTemplate?.name || 'Documento Geral',
          content: generatedContent,
        })
        .select()
        .single();

      if (error) {
        console.error("Erro Supabase ao salvar:", error);
        throw error;
      }

      setDocuments([newDoc, ...documents]);
      setIsModalOpen(false);
      import('sonner').then(({ toast }) => toast.success("Documento salvo com sucesso!"));
    } catch (err: any) {
      console.error("Erro ao salvar documento:", err);
      import('sonner').then(({ toast }) => toast.error(`Erro ao salvar documento: ${err.message || 'Erro desconhecido'}`));
    }
  };

  const exportToWord = async (doc: any) => {
    try {
      // Basic markdown to docx conversion logic
      // We'll split the content by double newlines for paragraphs
      const sections = doc.content.split('\n\n');
      
      const children = [
        new Paragraph({
          text: doc.type,
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Paciente: ", bold: true }),
            new TextRun(doc.patient_name),
          ],
          spacing: { after: 200 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Data: ", bold: true }),
            new TextRun(new Date(doc.criado_em || new Date()).toLocaleString('pt-BR')),
          ],
          spacing: { after: 400 },
        }),
        ...sections.map((section: string) => {
          // Check for basic markdown headers
          if (section.startsWith('# ')) {
            return new Paragraph({ text: section.replace('# ', ''), heading: HeadingLevel.HEADING_1, spacing: { before: 200, after: 200 } });
          } else if (section.startsWith('## ')) {
            return new Paragraph({ text: section.replace('## ', ''), heading: HeadingLevel.HEADING_2, spacing: { before: 150, after: 150 } });
          } else if (section.startsWith('### ')) {
            return new Paragraph({ text: section.replace('### ', ''), heading: HeadingLevel.HEADING_3, spacing: { before: 100, after: 100 } });
          }
          
          return new Paragraph({
            children: [
              new TextRun(section.replace(/\*\*|\*/g, '')), // Basic bold/italic removal for now
            ],
            spacing: { after: 200 },
          });
        }),
        new Paragraph({
          text: `Documento oficial gerado via FisioCareHub em ${new Date().toLocaleDateString()}`,
          alignment: AlignmentType.CENTER,
          spacing: { before: 800 },
          border: { top: { color: "000000", space: 1, style: BorderStyle.SINGLE, size: 6 } },
        }),
      ];

      const wordDoc = new Document({
        sections: [{
          properties: {},
          children: children,
        }],
      });

      const blob = await Packer.toBlob(wordDoc);
      saveAs(blob, `${doc.type}-${doc.patient_name}.docx`);
      import('sonner').then(({ toast }) => toast.success("Documento Word (.docx) gerado com sucesso!"));
    } catch (err) {
      console.error("Erro ao exportar Word:", err);
      import('sonner').then(({ toast }) => toast.error("Erro ao exportar Documento Word."));
    }
  };

  const deleteDocument = async (id: string) => {
    try {
      const { error } = await supabase
        .from('documentos_gerados')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setDocuments(documents.filter(d => d.id !== id));
      if (viewingDoc?.id === id) {
        setViewingDoc(null);
        setViewingFileUrl(null);
        setLoadingPreviewFile(false);
      }
      import('sonner').then(({ toast }) => toast.success("Documento excluído com sucesso."));
    } catch (err) {
      console.error("Erro ao excluir documento:", err);
      import('sonner').then(({ toast }) => toast.error("Erro ao excluir documento."));
    } finally {
      setDocToDelete(null);
    }
  };

  const exportToPDF = async (docElementId: string, filename: string) => {
    const element = document.getElementById(docElementId);
    if (!element) {
      import('sonner').then(({ toast }) => toast.error("Erro interno: Elemento do documento não encontrado."));
      return;
    }

    try {
      // Ensure all images are loaded
      const images = element.getElementsByTagName('img');
      const imagePromises = Array.from(images).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      });
      
      await Promise.all(imagePromises);
      await document.fonts.ready;
      
      // Small delay to ensure React rendering cycle is complete
      await new Promise(resolve => setTimeout(resolve, 300));

      const canvas = await html2canvas(element, { 
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 800, // Force a standard document width for PDF capture
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.getElementById(docElementId);
          if (clonedElement) {
            clonedElement.style.height = 'auto';
            clonedElement.style.overflow = 'visible';
            clonedElement.style.backgroundColor = '#ffffff';
            clonedElement.style.color = '#000000';
            clonedElement.style.padding = '40px';
            clonedElement.style.width = '800px';

            // Scoped CSS injection to ensure child elements are captured correctly in the PDF
            const style = clonedDoc.createElement('style');
            style.innerHTML = `
              #${docElementId} { background-color: white !important; color: black !important; }
              #${docElementId} * { color: black !important; border-color: #000 !important; background-color: transparent !important; }
              #${docElementId} h1, #${docElementId} h2, #${docElementId} h3 { color: black !important; margin-bottom: 20px; text-align: center; }
              #${docElementId} p, #${docElementId} li { color: black !important; margin-bottom: 10px; font-size: 14px; }
              #${docElementId} strong { color: black !important; font-weight: bold; }
              #${docElementId} table { width: 100%; border-collapse: collapse; margin: 20px 0; }
              #${docElementId} th, #${docElementId} td { border: 1px solid black !important; padding: 10px; text-align: left; }
            `;
            clonedDoc.head.appendChild(style);
          }
        }
      });
      
      const imgData = canvas.toDataURL('image/png', 1.0);
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgProps = pdf.getImageProperties(imgData);
      const imgWidth = pdfWidth - 20; // 10mm margin on each side
      const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
      
      let heightLeft = imgHeight;
      let position = 10; // 10mm top margin

      // First page
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= (pdfHeight - 20);

      // Subsequent pages if height > A4
      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 10;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= (pdfHeight - 20);
      }

      pdf.save(`${filename.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
      import('sonner').then(({ toast }) => toast.success("PDF gerado com sucesso!"));
    } catch (err) {
      console.error("Erro ao exportar PDF:", err);
      import('sonner').then(({ toast }) => toast.error("Erro ao exportar PDF. Tente novamente."));
    }
  };


  const openClinicalFile = async (doc: any) => {
    try {
      const pathOrUrl = doc.file_path || doc.arquivo_url;
      if (!pathOrUrl) {
        import('sonner').then(({ toast }) => toast.error('Arquivo sem caminho para visualização.'));
        return;
      }

      const isUrl = /^https?:\/\//i.test(String(pathOrUrl));
      const url = isUrl ? String(pathOrUrl) : await getPrivateDocumentUrl(String(pathOrUrl));
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      console.error('Erro ao abrir arquivo clínico:', err);
      import('sonner').then(({ toast }) => toast.error(err?.message || 'Erro ao abrir arquivo.'));
    }
  };

  const getDocumentTitle = (doc: any) =>
    doc?.document_name ||
    doc?.nome_arquivo ||
    doc?.titulo ||
    doc?.type ||
    'Documento';

  const buildPremiumPdfPayload = (doc: any) => ({
    ...doc,
    document_name: getDocumentTitle(doc),
    type: doc?.type || getDocumentTitle(doc),
    patient_name: doc?.patient_name || doc?.paciente_nome || 'Paciente',
    physio_name: doc?.physio_name || profile?.nome_completo || 'Fisioterapeuta',
    criado_em: doc?.criado_em || doc?.created_at || new Date().toISOString(),
    content: doc?.content || doc?.conteudo || doc?.description || 'Conteúdo não informado.',
  });

  const downloadPremiumDocumentPDF = (doc: any, customFileName?: string) => {
    generateLegalDocumentPDF(buildPremiumPdfPayload(doc), {
      profile,
      fileName: customFileName || `${getDocumentTitle(doc)}-${doc?.patient_name || 'paciente'}`,
    });
  };

  const getClinicalFileUrl = async (doc: any) => {
    const pathOrUrl = doc?.file_path || doc?.arquivo_url;
    if (!pathOrUrl) throw new Error('Arquivo sem caminho para visualização.');

    const isUrl = /^https?:\/\//i.test(String(pathOrUrl));
    return isUrl ? String(pathOrUrl) : await getPrivateDocumentUrl(String(pathOrUrl));
  };

  const handleViewDocument = async (doc: any) => {
    setViewingDoc(doc);
    setViewingFileUrl(null);

    if (!doc?.isClinicalFile) return;

    setLoadingPreviewFile(true);
    try {
      const url = await getClinicalFileUrl(doc);
      setViewingFileUrl(url);
    } catch (err: any) {
      console.error('Erro ao preparar visualização do arquivo clínico:', err);
      import('sonner').then(({ toast }) => toast.error(err?.message || 'Erro ao preparar visualização do documento.'));
    } finally {
      setLoadingPreviewFile(false);
    }
  };

  const handleDownloadDocument = async (doc: any) => {
    if (!doc?.isClinicalFile) {
      try {
        downloadPremiumDocumentPDF(doc, `${getDocumentTitle(doc)}-${doc.patient_name || 'paciente'}`);
        import('sonner').then(({ toast }) => toast.success('PDF premium gerado com sucesso!'));
      } catch (err) {
        console.error('Erro ao gerar PDF premium:', err);
        import('sonner').then(({ toast }) => toast.error('Erro ao gerar PDF premium. Tente novamente.'));
      }
      return;
    }

    try {
      const url = await getClinicalFileUrl(doc);
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.download = getDocumentTitle(doc);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      console.error('Erro ao baixar arquivo clínico:', err);
      import('sonner').then(({ toast }) => toast.error(err?.message || 'Erro ao baixar documento.'));
    }
  };

  const handleExportFromTable = async (doc: any) => {
    try {
      downloadPremiumDocumentPDF(doc, `${getDocumentTitle(doc)}-${doc?.patient_name || 'paciente'}`);
      import('sonner').then(({ toast }) => toast.success('PDF premium gerado com sucesso!'));
    } catch (err) {
      console.error('Erro ao gerar PDF premium:', err);
      import('sonner').then(({ toast }) => toast.error('Erro ao gerar PDF premium. Tente novamente.'));
    }
  };

  const generateEvolutionReportPDF = async (record: any) => {
    try {
      const { jsPDF } = await import('jspdf');

      const doc = new jsPDF('p', 'mm', 'a4');
      const patient = patients.find(p => p.id === record.patient_id);
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 18;
      const contentWidth = pageWidth - margin * 2;

      const colors = {
        navy: [15, 23, 42] as [number, number, number],
        blue: [37, 99, 235] as [number, number, number],
        sky: [14, 165, 233] as [number, number, number],
        slate: [71, 85, 105] as [number, number, number],
        light: [248, 250, 252] as [number, number, number],
        border: [226, 232, 240] as [number, number, number],
        white: [255, 255, 255] as [number, number, number],
        green: [16, 185, 129] as [number, number, number],
      };

      const safeText = (value: any, fallback = 'Não informado') => {
        const textValue = String(value ?? '').trim();
        return textValue || fallback;
      };

      const formatDateTime = (value: any) => {
        if (!value) return 'Não informado';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return String(value);
        return date.toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      };

      const addPageBackground = () => {
        doc.setFillColor(...colors.light);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');

        doc.setFillColor(...colors.navy);
        doc.rect(0, 0, pageWidth, 36, 'F');

        doc.setFillColor(...colors.blue);
        doc.roundedRect(margin, 11, 10, 10, 3, 3, 'F');

        doc.setTextColor(...colors.white);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(15);
        doc.text('FisioCareHub', margin + 14, 18);

        doc.setFontSize(7);
        doc.setTextColor(203, 213, 225);
        doc.text('REABILITAÇÃO & PERFORMANCE', margin + 14, 23);

        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`ID_DOC: ${safeText(record.id, 'N/A').slice(0, 12)}`, pageWidth - margin, 16, { align: 'right' });
        doc.text(`Gerado em: ${formatDateTime(new Date())}`, pageWidth - margin, 21, { align: 'right' });
      };

      const addLegalFooter = () => {
        const footerY = pageHeight - 24;
        doc.setFillColor(241, 245, 249);
        doc.rect(0, footerY - 4, pageWidth, 28, 'F');

        doc.setFont('courier', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(71, 85, 105);
        doc.text('VERIFICAÇÃO DE INTEGRIDADE JURÍDICA', margin, footerY + 1);

        doc.setFont('courier', 'normal');
        doc.setFontSize(6.5);
        const hash = safeText(record.integrity_hash, 'DOCUMENTO_NÃO_HASHADO');
        const hashLines = doc.splitTextToSize(`HASH SHA-256: ${hash}`, contentWidth - 6);
        doc.text(hashLines.slice(0, 2), margin, footerY + 6);
        doc.text('Documento gerado pelo FisioCareHub com registro clínico e trilha de integridade.', margin, footerY + 16);
      };

      const ensureSpace = (neededHeight: number, currentY: number) => {
        if (currentY + neededHeight > pageHeight - 36) {
          addLegalFooter();
          doc.addPage();
          addPageBackground();
          return 48;
        }
        return currentY;
      };

      const drawInfoPill = (label: string, value: string, x: number, y: number, w: number) => {
        doc.setFillColor(...colors.white);
        doc.setDrawColor(...colors.border);
        doc.roundedRect(x, y, w, 16, 4, 4, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.8);
        doc.setTextColor(100, 116, 139);
        doc.text(label.toUpperCase(), x + 5, y + 6);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(...colors.navy);
        const lines = doc.splitTextToSize(value, w - 10);
        const firstLine = Array.isArray(lines) ? String(lines[0] || '') : String(lines || '');
        doc.text(firstLine, x + 5, y + 12, { maxWidth: w - 10 });
      };

      const drawSoapSection = (
        letter: string,
        title: string,
        text: string,
        y: number,
        accent: [number, number, number],
      ) => {
        const bodyLines = doc.splitTextToSize(safeText(text, 'Não há dados registrados para esta seção.'), contentWidth - 34);
        const boxHeight = Math.max(30, 20 + bodyLines.length * 5);
        y = ensureSpace(boxHeight + 8, y);

        doc.setFillColor(...colors.white);
        doc.setDrawColor(...colors.border);
        doc.roundedRect(margin, y, contentWidth, boxHeight, 5, 5, 'FD');

        doc.setFillColor(...accent);
        doc.roundedRect(margin + 6, y + 7, 14, 14, 4, 4, 'F');
        doc.setTextColor(...colors.white);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text(letter, margin + 13, y + 17, { align: 'center' });

        doc.setTextColor(...colors.navy);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text(title, margin + 26, y + 11);

        doc.setTextColor(...colors.slate);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.2);
        doc.text(bodyLines, margin + 26, y + 19);

        return y + boxHeight + 8;
      };

      addPageBackground();

      let y = 48;

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.navy);
      doc.setFontSize(20);
      doc.text('Relatório de Evolução Clínica', margin, y);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...colors.blue);
      doc.text('MODELO S.O.A.P. • DOCUMENTO CLÍNICO', margin, y + 7);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('Registro estruturado para acompanhamento terapêutico, evolução e continuidade do cuidado.', margin, y + 13);

      y += 25;

      doc.setFillColor(...colors.white);
      doc.setDrawColor(...colors.border);
      doc.roundedRect(margin, y, contentWidth, 64, 6, 6, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...colors.blue);
      doc.text('INFORMAÇÕES DO ATENDIMENTO', margin + 7, y + 10);

      // Grade 2x2 para evitar corte lateral em A4/mobile.
      // Antes o CREFITO ficava na terceira coluna e podia sair da página.
      const infoGap = 8;
      const infoColWidth = (contentWidth - 14 - infoGap) / 2;
      const infoX1 = margin + 7;
      const infoX2 = infoX1 + infoColWidth + infoGap;

      drawInfoPill('Paciente', safeText(patient?.nome_completo, 'Paciente não identificado'), infoX1, y + 16, infoColWidth);
      drawInfoPill('Data do registro', formatDateTime(record.created_at), infoX2, y + 16, infoColWidth);
      drawInfoPill('Profissional responsável', safeText(profile?.nome_completo, 'Fisioterapeuta'), infoX1, y + 38, infoColWidth);
      drawInfoPill('CREFITO', safeText(profile?.crefito, 'Não informado'), infoX2, y + 38, infoColWidth);

      y += 76;

      y = drawSoapSection('S', 'Subjetivo', record.subjective, y, colors.blue);
      y = drawSoapSection('O', 'Objetivo', record.objective, y, colors.sky);
      y = drawSoapSection('A', 'Avaliação', record.assessment, y, [124, 58, 237]);
      y = drawSoapSection('P', 'Plano Terapêutico', record.plan, y, colors.green);

      y = ensureSpace(44, y + 5);

      doc.setDrawColor(148, 163, 184);
      doc.line(pageWidth / 2 - 38, y + 14, pageWidth / 2 + 38, y + 14);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...colors.navy);
      doc.text(safeText(profile?.nome_completo, 'Fisioterapeuta'), pageWidth / 2, y + 22, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...colors.slate);
      doc.text(`CREFITO: ${safeText(profile?.crefito, '____________')}`, pageWidth / 2, y + 28, { align: 'center' });

      const totalPages = doc.getNumberOfPages();
      for (let page = 1; page <= totalPages; page += 1) {
        doc.setPage(page);
        addLegalFooter();

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text(`Página ${page} de ${totalPages}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
      }

      doc.save(`evolucao_${patient?.nome_completo || 'registro'}.pdf`);
      import('sonner').then(({ toast }) => toast.success("Relatório SOAP premium gerado com sucesso!"));
    } catch (err) {
      console.error(err);
      import('sonner').then(({ toast }) => toast.error("Erro ao gerar relatório PDF."));
    }
  };


  return (
    <ProGuard requiredPlan="free">
      <div className="space-y-8 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 tracking-tight">Documentos e Relatórios</h1>
          <p className="text-slate-400 font-medium">
            {isPhysio 
              ? 'Gerencie sua papelada de forma rápida e automática.' 
              : 'Visualize e baixe seus documentos e relatórios médicos.'}
          </p>
        </div>
        {isPhysio && (
          <div className="flex gap-3">
            <button 
              onClick={() => {
                if (isFreePhysio) {
                  showUpgradeToast('Relatório de evolução premium é liberado nos planos Basic ou PRO.');
                  return;
                }
                setIsEvolutionModalOpen(true);
              }}
              className="flex items-center gap-2 px-6 py-3 bg-white/5 text-blue-400 border border-blue-500/20 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-white/10 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <FileSearch size={20} /> RELATÓRIO DE EVOLUÇÃO
            </button>
            <button 
              onClick={() => handleCreateNew()}
              disabled={hasReachedFreeDocumentLimit}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-900/20 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Plus size={20} /> CRIAR NOVO DOCUMENTO
            </button>
          </div>
        )}
      </header>

      {isPhysio && isFreePhysio && (
        <section className="rounded-[2rem] border border-blue-500/20 bg-gradient-to-br from-blue-500/10 via-slate-900/80 to-indigo-500/10 p-5 sm:p-6 shadow-xl shadow-blue-950/20">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/15 text-blue-300 border border-blue-400/20 flex items-center justify-center shrink-0">
                <FileText size={24} />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-white font-black text-lg">Plano Gratuito: documentos básicos liberados</p>
                  <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10 text-[10px] font-black text-blue-200 uppercase tracking-widest">
                    {freeDocumentsUsedThisMonth}/{FREE_DOCUMENT_MONTHLY_LIMIT} usados neste mês
                  </span>
                </div>
                <p className="text-slate-300 text-sm font-medium mt-2 max-w-3xl">
                  Você pode gerar até {FREE_DOCUMENT_MONTHLY_LIMIT} documentos clínicos básicos por mês para testar o FisioCareHub.
                  Modelos avançados, documentos ilimitados e recursos completos ficam disponíveis nos planos Basic e PRO.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => navigate('/subscription')}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white text-slate-950 font-black text-xs uppercase tracking-widest hover:bg-blue-50 transition-all"
              >
                <Crown size={16} /> Ver planos
              </button>
            </div>
          </div>
        </section>
      )}

      {isPhysio && isFreePhysio && hasReachedFreeDocumentLimit && (
        <section className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-amber-300 shrink-0 mt-0.5" size={22} />
            <div>
              <p className="text-amber-100 font-black">Limite mensal atingido</p>
              <p className="text-amber-100/80 text-sm font-medium">
                Você já gerou os {FREE_DOCUMENT_MONTHLY_LIMIT} documentos básicos do plano gratuito neste mês.
                Assine o Basic para gerar documentos clínicos sem limite.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/subscription')}
            className="px-5 py-3 rounded-2xl bg-amber-300 text-slate-950 font-black text-xs uppercase tracking-widest hover:bg-amber-200 transition-all"
          >
            Fazer upgrade
          </button>
        </section>
      )}

      {/* Favorites Section - Only for Physio */}
      {isPhysio && (
        <section>
          <div className="flex items-center gap-2 mb-6">
            <Star className="text-amber-500 fill-amber-500" size={20} />
            <h2 className="text-xl font-black text-white tracking-tight">FAVORITOS</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FAVORITE_TEMPLATES.map((template) => {
              const isTemplateLockedForFree = isFreePhysio && !isFreeDocumentTemplate(template.id);

              return (
              <motion.div
                key={template.id}
                whileHover={{ scale: 1.02 }}
                className={`bg-slate-900/50 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-sm hover:shadow-md transition-all text-left flex flex-col gap-4 group relative overflow-hidden ${isTemplateLockedForFree ? 'opacity-75' : ''}`}
              >
                <div className={`w-12 h-12 ${template.bg.replace('bg-', 'bg-').replace('-50', '-500/10')} ${template.color.replace('text-', 'text-').replace('-600', '-400')} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform border border-white/5`}>
                  <template.icon size={24} />
                </div>
                <div className="flex-1 cursor-pointer" onClick={() => isTemplateLockedForFree ? navigate('/subscription') : handleCreateNew(template)}>
                  <h3 className="font-black text-white leading-tight">{template.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 font-bold uppercase tracking-widest">{isTemplateLockedForFree ? 'Basic/PRO' : 'Clique para iniciar'}</p>
                </div>
                <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-1.5 text-slate-500 hover:text-rose-500 transition-colors" title="Remover dos favoritos">
                    <X size={14} />
                  </button>
                  <div className="p-1.5 text-slate-500">
                    <FileText size={14} />
                  </div>
                </div>
              </motion.div>
              );
            })}
          </div>
        </section>
      )}

      {/* Recent Documents */}
      <section className="bg-slate-900/50 backdrop-blur-xl rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
            <Library size={20} className="text-blue-400 shrink-0" />
            BIBLIOTECA DE DOCUMENTOS
          </h2>
          <button className="text-blue-400 text-xs sm:text-sm font-black uppercase tracking-widest hover:text-blue-300 flex items-center gap-1 transition-colors">
            VER BIBLIOTECA COMPLETA <ChevronRight size={16} />
          </button>
        </div>

        {/* Mobile: cards, sem tabela horizontal */}
        <div className="md:hidden">
          {loading ? (
            <div className="px-6 py-12 text-center">
              <Loader2 className="animate-spin mx-auto text-blue-400" size={32} />
            </div>
          ) : documents.length === 0 ? (
            <div className="px-6 py-12 text-center text-slate-500 font-medium">
              Nenhum documento encontrado.
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {documents.map((doc) => (
                <div key={doc.id} className="p-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center border border-blue-500/20 shrink-0">
                      <FileText size={20} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-white font-black leading-tight truncate">
                        {getDocumentTitle(doc)}
                      </p>
                      <p className="text-slate-400 text-sm font-bold mt-1 truncate">
                        {isPhysio ? (doc.patient_name || 'Paciente') : (doc.physio_name || 'Fisioterapeuta')}
                      </p>
                      <p className="text-slate-500 text-xs font-black mt-2">
                        {new Date(doc.criado_em || doc.created_at).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button 
                      onClick={() => handleViewDocument(doc)}
                      className="h-12 text-white bg-white/5 hover:bg-blue-500/10 cursor-pointer rounded-2xl transition-colors border border-white/10 flex items-center justify-center"
                      title="Visualizar"
                      aria-label="Visualizar documento"
                    >
                      <Eye size={19} />
                    </button>
                    <button 
                      onClick={() => handleDownloadDocument(doc)}
                      className="h-12 text-white bg-white/5 hover:bg-emerald-500/10 cursor-pointer rounded-2xl transition-colors border border-white/10 flex items-center justify-center"
                      title={doc.isClinicalFile ? 'Abrir arquivo' : 'Baixar PDF'}
                      aria-label={doc.isClinicalFile ? 'Abrir arquivo' : 'Baixar PDF'}
                    >
                      <Download size={19} />
                    </button>
                    {!doc.isClinicalFile ? (
                      <button 
                        onClick={() => exportToWord(doc)}
                        className="h-12 text-white bg-white/5 hover:bg-indigo-500/10 cursor-pointer rounded-2xl transition-colors border border-white/10 flex items-center justify-center"
                        title="Baixar Word"
                        aria-label="Baixar Word"
                      >
                        <FileText size={19} />
                      </button>
                    ) : isPhysio ? (
                      <button 
                        onClick={() => setDocToDelete(doc.id)}
                        className="h-12 text-white bg-white/5 hover:bg-rose-500/10 cursor-pointer rounded-2xl transition-colors border border-white/10 flex items-center justify-center"
                        title="Excluir"
                        aria-label="Excluir documento"
                      >
                        <Trash2 size={19} />
                      </button>
                    ) : (
                      <div />
                    )}
                  </div>

                  {isPhysio && !doc.isClinicalFile && (
                    <button 
                      onClick={() => setDocToDelete(doc.id)}
                      className="w-full h-11 text-rose-300 bg-rose-500/10 hover:bg-rose-500/15 cursor-pointer rounded-2xl transition-colors border border-rose-500/20 flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest"
                      title="Excluir"
                    >
                      <Trash2 size={16} /> Excluir
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Desktop/tablet: tabela completa */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead className="bg-white/5 text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">
              <tr>
                <th className="px-6 py-4">Documento</th>
                <th className="px-6 py-4">{isPhysio ? 'Paciente' : 'Fisioterapeuta'}</th>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <Loader2 className="animate-spin mx-auto text-blue-400" size={32} />
                  </td>
                </tr>
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500 font-medium">
                    Nenhum documento encontrado.
                  </td>
                </tr>
              ) : (
                documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-500/10 text-blue-400 rounded-lg flex items-center justify-center border border-blue-500/20">
                          <FileText size={16} />
                        </div>
                        <span className="font-bold text-white">{getDocumentTitle(doc)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-400 font-medium">
                      {isPhysio ? (doc.patient_name || 'Paciente') : (doc.physio_name || 'Fisioterapeuta')}
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs font-bold">
                      {new Date(doc.criado_em || doc.created_at).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 transition-opacity">
                        <button 
                          onClick={() => handleViewDocument(doc)}
                          className="p-2 text-white hover:bg-gray-700 cursor-pointer rounded-lg transition-colors border border-transparent border-white/10"
                          title="Visualizar"
                        >
                          <Eye size={18} />
                        </button>
                        <button 
                          onClick={() => {
                            if (doc.isClinicalFile && (doc.arquivo_url || doc.file_path)) {
                              openClinicalFile(doc);
                              return;
                            }
                            handleExportFromTable(doc);
                          }}
                          className="p-2 text-white hover:bg-gray-700 cursor-pointer rounded-lg transition-colors border border-transparent border-white/10"
                          title={doc.isClinicalFile ? 'Abrir arquivo' : 'Baixar PDF'}
                        >
                          <Download size={18} />
                        </button>
                        {!doc.isClinicalFile && (
                          <button 
                            onClick={() => exportToWord(doc)}
                            className="p-2 text-white hover:bg-gray-700 cursor-pointer rounded-lg transition-colors border border-transparent border-white/10"
                            title="Baixar Word"
                          >
                            <FileText size={18} />
                          </button>
                        )}
                        {isPhysio && (
                          <button 
                            onClick={() => setDocToDelete(doc.id)}
                            className="p-2 text-white hover:bg-gray-700 cursor-pointer rounded-lg transition-colors border border-transparent border-white/10"
                            title="Excluir"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {docToDelete && (
          <div className="fixed inset-0 z-[50] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDocToDelete(null)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-slate-900 p-8 rounded-[2rem] shadow-2xl max-w-sm w-full text-center border border-white/10"
            >
              <div className="w-16 h-16 bg-rose-500/10 text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-rose-500/20">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-black text-white mb-2 tracking-tight">Excluir documento?</h3>
              <p className="text-slate-400 mb-8 font-medium">Esta ação não pode ser desfeita. O documento será removido permanentemente da biblioteca.</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setDocToDelete(null)}
                  className="py-3 px-4 bg-white/5 text-slate-300 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-white/10 transition-all border border-white/10"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => deleteDocument(docToDelete)}
                  className="py-3 px-4 bg-rose-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-rose-700 transition-all shadow-xl shadow-rose-900/20"
                >
                  Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Evolution Report Modal */}
      <AnimatePresence>
        {isEvolutionModalOpen && (
          <div className="fixed inset-0 z-[50] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEvolutionModalOpen(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-slate-900 w-full max-w-2xl max-h-[80vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col border border-white/10"
            >
              <div className="px-4 py-3 sm:p-5 border-b border-white/5 flex items-center justify-between gap-3 bg-white/5 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center shadow-lg">
                    <FileSearch size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white tracking-tight">Relatório de Evolução</h2>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Selecione um paciente e o registro para exportar com hash</p>
                  </div>
                </div>
                <button onClick={() => setIsEvolutionModalOpen(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors text-slate-400">
                  <X size={22} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                <div className="space-y-3">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Selecionar Paciente</label>
                  <select 
                    onChange={(e) => setSelectedPatientId(e.target.value)}
                    value={selectedPatientId || ''}
                    className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none transition-all font-bold text-white appearance-none"
                  >
                    <option value="" className="bg-slate-900">Selecione um paciente...</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id} className="bg-slate-900">{p.nome_completo}</option>
                    ))}
                  </select>
                </div>

                {selectedPatientId && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Evoluções Encontradas (SOAP)</label>
                      {loadingRecords && <Loader2 className="animate-spin text-slate-500" size={14} />}
                    </div>
                    
                    <div className="grid grid-cols-1 gap-3">
                      {patientRecords.length === 0 && !loadingRecords ? (
                        <div className="p-10 text-center bg-white/5 rounded-3xl border border-dashed border-white/10">
                          <p className="text-slate-500 font-medium">Nenhum registro SOAP encontrado para este paciente.</p>
                        </div>
                      ) : (
                        patientRecords.map(record => (
                          <div 
                            key={record.id}
                            className="bg-white/5 border border-white/10 p-5 rounded-3xl flex items-center justify-between group hover:bg-white/10 transition-all"
                          >
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-black text-white">{new Date(record.created_at).toLocaleDateString('pt-BR')}</span>
                                {record.integrity_hash && (
                                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[8px] font-black uppercase rounded-full border border-emerald-500/20">Hash Ativo</span>
                                )}
                              </div>
                              <p className="text-xs text-slate-400 font-medium line-clamp-1 max-w-[300px]">
                                {record.subjective ? `S: ${record.subjective.substring(0, 50)}...` : 'Sem conteúdo estruturado'}
                              </p>
                            </div>
                            <button 
                              onClick={() => generateEvolutionReportPDF(record)}
                              className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center gap-2"
                            >
                              <Download size={14} /> EXPORTAR
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-white/5 bg-white/5 flex justify-end">
                <button 
                  onClick={() => setIsEvolutionModalOpen(false)}
                  className="px-6 py-3 text-slate-400 font-black text-xs uppercase tracking-widest hover:bg-white/5 rounded-xl transition-colors"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[50] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col border border-white/10 mt-20"
            >
              <div className="px-4 py-3 sm:p-5 border-b border-white/5 flex items-center justify-between gap-3 bg-white/5 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg">
                    {selectedTemplate ? <selectedTemplate.icon size={20} /> : <FileText size={20} />}
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white tracking-tight">
                      {selectedTemplate ? `Novo ${selectedTemplate.name}` : 'Novo Documento'}
                    </h2>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Preencha os dados e use a IA para gerar o conteúdo</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors text-slate-400"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-8 grid md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="rounded-3xl border border-blue-500/20 bg-blue-500/10 p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-300 mb-1">Documento inteligente</p>
                    <p className="text-sm text-slate-300 font-semibold leading-relaxed">
                      Preencha os campos principais. A IA usa esses dados para gerar um documento mais completo, evitando rascunhos com “A definir”.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome do Paciente <span className="text-rose-400">*</span></label>
                      <input 
                        type="text"
                        value={patientName}
                        onChange={(e) => setPatientName(e.target.value)}
                        placeholder="Ex: João da Silva"
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none transition-all font-bold text-white placeholder:text-slate-600"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail do Paciente</label>
                      <input 
                        type="email"
                        value={patientEmail}
                        onChange={(e) => setPatientEmail(e.target.value)}
                        placeholder="paciente@email.com"
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none transition-all font-bold text-white placeholder:text-slate-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {currentDocumentFields.map((field) => (
                      <div key={field.key} className={`space-y-2 ${field.cols === 'full' || field.type === 'textarea' ? 'sm:col-span-2' : ''}`}>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                          {field.label} {field.required && <span className="text-rose-400">*</span>}
                        </label>
                        {field.type === 'select' ? (
                          <select
                            value={documentFields[field.key] || ''}
                            onChange={(e) => updateDocumentField(field.key, e.target.value)}
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none transition-all font-bold text-white appearance-none"
                          >
                            <option value="" className="bg-slate-900">Selecionar...</option>
                            {field.options?.map((option) => (
                              <option key={option} value={option} className="bg-slate-900">{option}</option>
                            ))}
                          </select>
                        ) : field.type === 'textarea' ? (
                          <textarea
                            rows={3}
                            value={documentFields[field.key] || ''}
                            onChange={(e) => updateDocumentField(field.key, e.target.value)}
                            placeholder={field.placeholder}
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none transition-all font-bold text-white placeholder:text-slate-600 resize-none"
                          />
                        ) : (
                          <input
                            type={field.type || 'text'}
                            value={documentFields[field.key] || ''}
                            onChange={(e) => updateDocumentField(field.key, e.target.value)}
                            placeholder={field.placeholder}
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none transition-all font-bold text-white placeholder:text-slate-600"
                          />
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Observações para a IA</label>
                    <textarea 
                      rows={4}
                      value={additionalInfo}
                      onChange={(e) => setAdditionalInfo(e.target.value)}
                      placeholder="Ex: detalhe especial do caso, preferência de texto, orientação ao paciente ou condição combinada."
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none transition-all font-bold text-white placeholder:text-slate-600 resize-none"
                    />
                  </div>
                  <button 
                    onClick={generateWithAI}
                    disabled={generating || !patientName}
                    className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-xl shadow-indigo-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="animate-spin" size={20} />
                        GERANDO DOCUMENTO...
                      </>
                    ) : (
                      <>
                        <Wand2 size={20} />
                        GERAR COM INTELIGÊNCIA ARTIFICIAL
                      </>
                    )}
                  </button>
                </div>

                <div className="bg-white/5 rounded-3xl border border-white/10 p-6 flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Pré-visualização</span>
                    {generatedContent && (
                      <span className="text-xs text-emerald-400 font-black uppercase tracking-widest flex items-center gap-1">
                        <CheckCircle2 size={14} /> Pronto para salvar
                      </span>
                    )}
                  </div>
                  <div 
                    className="flex-1 bg-white rounded-2xl p-8 overflow-y-auto prose prose-slate prose-sm max-w-none shadow-inner"
                    style={{ color: '#000000', backgroundColor: '#ffffff' }}
                  >
                    <style>{`
                      .report-preview-container * { color: #000000 !important; }
                      .report-preview-container h1, .report-preview-container h2, .report-preview-container h3 { color: #000000 !important; }
                      .report-preview-container p, .report-preview-container li, .report-preview-container td, .report-preview-container th { color: #000000 !important; }
                    `}</style>
                    <div className="report-preview-container">
                      {generatedContent ? (
                        <ReactMarkdown>{generatedContent}</ReactMarkdown>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 space-y-4">
                          <FileText size={48} className="opacity-20" />
                          <p className="text-sm font-bold uppercase tracking-widest">O conteúdo gerado aparecerá aqui.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-white/5 bg-white/5 flex justify-end gap-4">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 text-slate-400 font-black text-xs uppercase tracking-widest hover:bg-white/5 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={saveDocument}
                  disabled={!generatedContent}
                  className="px-8 py-3 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  SALVAR DOCUMENTO
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* View Modal */}
      <AnimatePresence>
        {viewingDoc && (
          <div className="fixed left-0 right-0 bottom-0 top-[132px] sm:inset-0 z-[9999] flex items-stretch sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setViewingDoc(null); setViewingFileUrl(null); setLoadingPreviewFile(false); }}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative z-[10000] bg-slate-900 w-full h-full sm:h-auto sm:max-w-4xl sm:max-h-[92vh] rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl overflow-hidden flex flex-col border border-white/10"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg shrink-0">
                    <FileText size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base sm:text-xl font-black text-white tracking-tight leading-tight line-clamp-2 break-words">{getDocumentTitle(viewingDoc)}</h2>
                    <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-widest line-clamp-1">
                      {viewingDoc.patient_name ? `Paciente: ${viewingDoc.patient_name}` : 'Documento clínico'}
                    </p>
                    <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-widest line-clamp-1">
                      {viewingDoc.physio_name ? `Fisioterapeuta: ${viewingDoc.physio_name}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 sm:gap-2 shrink-0">
{!viewingDoc.isClinicalFile && (
                  <button 
                    onClick={() => {
                      try {
                        downloadPremiumDocumentPDF(viewingDoc, `${getDocumentTitle(viewingDoc)}-${viewingDoc.patient_name || 'paciente'}`);
                        import('sonner').then(({ toast }) => toast.success('PDF premium gerado com sucesso!'));
                      } catch (err) {
                        console.error('Erro ao gerar PDF premium:', err);
                        import('sonner').then(({ toast }) => toast.error('Erro ao gerar PDF premium. Tente novamente.'));
                      }
                    }}
                    className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors border border-transparent hover:border-blue-500/20"
                    title="Gerar PDF premium"
                  >
                    <Printer size={18} />
                  </button>
                  )}
                  <button 
                    onClick={() => handleDownloadDocument(viewingDoc)}
                    className="p-2 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors border border-transparent hover:border-emerald-500/20"
                    title={viewingDoc.isClinicalFile ? 'Baixar arquivo original' : 'Baixar PDF'}
                  >
                    <Download size={18} />
                  </button>
                  {!viewingDoc.isClinicalFile && (
                    <button 
                      onClick={() => exportToWord(viewingDoc)}
                      className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors border border-transparent hover:border-blue-500/20"
                      title="Baixar Word"
                    >
                      <FileText size={20} />
                    </button>
                  )}
                  {isPhysio && (
                    <button 
                      onClick={() => setDocToDelete(viewingDoc.id)}
                      className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors border border-transparent hover:border-rose-500/20"
                      title="Excluir documento"
                      aria-label="Excluir documento"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                  <button 
                    onClick={() => { setViewingDoc(null); setViewingFileUrl(null); setLoadingPreviewFile(false); }}
                    className="p-2 hover:bg-white/5 rounded-full transition-colors text-slate-400"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-6 bg-slate-950">
                {viewingDoc.isClinicalFile ? (
                  <div className="max-w-5xl mx-auto">
                    <div className="mb-3 rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4">
                      <p className="text-white font-black text-base sm:text-lg leading-tight break-words">{getDocumentTitle(viewingDoc)}</p>
                      <p className="text-slate-400 text-xs sm:text-sm mt-1">
                        {viewingDoc.physio_name ? `Fisioterapeuta: ${viewingDoc.physio_name}` : 'Fisioterapeuta'}
                      </p>
                      <p className="text-slate-500 text-[11px] sm:text-xs font-bold mt-1">
                        {new Date(viewingDoc.criado_em || viewingDoc.created_at).toLocaleString('pt-BR')}
                      </p>
                    </div>

                    {loadingPreviewFile ? (
                      <div className="h-[calc(100dvh-190px)] sm:h-[72vh] flex items-center justify-center rounded-2xl border border-white/10 bg-slate-900">
                        <Loader2 className="animate-spin text-blue-400" size={36} />
                      </div>
                    ) : viewingFileUrl ? (
                      <div className="rounded-2xl border border-white/10 bg-slate-900 overflow-hidden h-[calc(100dvh-190px)] sm:h-[72vh]">
                        {String(getDocumentTitle(viewingDoc)).toLowerCase().match(/\.(png|jpg|jpeg|webp|gif|heic|heif)$/) ||
                        String(viewingDoc.mime_type || '').startsWith('image/') ? (
                          <img
                            src={viewingFileUrl}
                            alt={getDocumentTitle(viewingDoc)}
                            className="w-full h-full object-contain bg-black"
                          />
                        ) : (
                          <object
                            data={`${viewingFileUrl}#toolbar=1&navpanes=0&scrollbar=1&view=FitH`}
                            type="application/pdf"
                            className="w-full h-full bg-white"
                          >
                            <iframe
                              src={`${viewingFileUrl}#toolbar=1&navpanes=0&scrollbar=1&view=FitH`}
                              title={getDocumentTitle(viewingDoc)}
                              className="w-full h-full bg-white"
                            />
                          </object>
                        )}
                      </div>
                    ) : (
                      <div className="h-[calc(100dvh-190px)] sm:h-[calc(100%-92px)] sm:h-[60vh] flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-slate-900 text-center p-8">
                        <FileText className="text-blue-400 mb-4" size={42} />
                        <p className="text-white font-black">Não foi possível carregar a prévia.</p>
                        <button
                          onClick={() => handleDownloadDocument(viewingDoc)}
                          className="mt-5 px-6 py-3 rounded-xl bg-blue-600 text-white font-black text-xs uppercase tracking-widest"
                        >
                          Abrir/Baixar documento
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div 
                    id="view-content" 
                    className="bg-white p-5 sm:p-12 border border-slate-200 shadow-2xl rounded-2xl prose prose-slate w-full max-w-[794px] mx-auto min-h-[80vh] sm:min-h-[1123px] overflow-hidden"
                    style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
                  >
                    <style>{`
                      #view-content { font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
                      #view-content h1, #view-content h2, #view-content h3 { color: #0f172a !important; font-weight: 900; }
                      #view-content p, #view-content li, #view-content td, #view-content th { color: #334155 !important; }
                      #view-content strong { color: #0f172a !important; font-weight: 800; }
                      #view-content table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                      #view-content th, #view-content td { border: 1px solid #e2e8f0; padding: 10px; }
                    `}</style>
                    <h1 className="text-center mb-8 font-black" style={{ color: '#000000' }}>{getDocumentTitle(viewingDoc)}</h1>
                    <p className="mb-0 font-bold" style={{ color: '#000000' }}>Paciente: {viewingDoc.patient_name}</p>
                    <p className="mb-0 font-bold" style={{ color: '#000000' }}>Fisioterapeuta: {viewingDoc.physio_name || 'Fisioterapeuta'}</p>
                    <p className="mb-8 text-[10px] text-slate-500 font-bold uppercase tracking-widest" style={{ color: '#64748b' }}>Data: {new Date(viewingDoc.criado_em).toLocaleString('pt-BR')}</p>
                    <div style={{ color: '#000000' }}>
                      <ReactMarkdown>{viewingDoc.content}</ReactMarkdown>
                    </div>
                    <div className="mt-16 pt-8 border-t border-slate-200 text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest" style={{ color: '#94a3b8' }}>
                      Documento gerado oficialmente via FisioCareHub
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
    </ProGuard>
  );
}
