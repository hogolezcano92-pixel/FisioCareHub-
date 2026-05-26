import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  ArrowLeft, 
  Calendar, 
  Phone, 
  Mail, 
  FileText, 
  Plus, 
  Upload, 
  Activity, 
  Trash2, 
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Paperclip,
  Dna,
  X,
  Send,
  Stethoscope,
  FileSignature,
  Edit3,
  Eye,
  EyeOff,
  ClipboardList,
  ShieldCheck,
  HeartPulse
} from 'lucide-react';
import { formatDate, cn, resolveStorageUrl } from '../lib/utils';
import { formatDateBR, formatHourBR, formatOnlyDateBR } from '../utils/date';
import { toast } from 'sonner';
import { uploadPatientDocument, getPrivateDocumentUrl } from '../services/supabaseStorage';
import ProGuard from '../components/ProGuard';
import FisioJourney from '../components/FisioJourney';

const getSupabaseErrorMessage = (err: unknown, fallback: string) => {
  if (!err) return fallback;

  if (err instanceof Error && err.message) {
    return err.message;
  }

  if (typeof err === 'object') {
    const anyErr = err as {
      message?: string;
      error_description?: string;
      details?: string;
      hint?: string;
      code?: string;
      statusCode?: string | number;
      name?: string;
    };

    const parts = [
      anyErr.message,
      anyErr.error_description,
      anyErr.details,
      anyErr.hint,
      anyErr.code ? `Código: ${anyErr.code}` : undefined,
      anyErr.statusCode ? `Status: ${anyErr.statusCode}` : undefined,
    ].filter(Boolean);

    if (parts.length > 0) {
      return parts.join(' | ');
    }
  }

  if (typeof err === 'string') return err;

  return fallback;
};


export default function PatientDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ficha');
  
  // Data States
  const [evolucoes, setEvolucoes] = useState<any[]>([]);
  const [arquivos, setArquivos] = useState<any[]>([]);
  const [prescricoes, setPrescricoes] = useState<any[]>([]);
  const [agendamentos, setAgendamentos] = useState<any[]>([]);
  const [avaliacoes, setAvaliacoes] = useState<any[]>([]);
  const [dailyJournals, setDailyJournals] = useState<any[]>([]);
  const [documentosGerados, setDocumentosGerados] = useState<any[]>([]);
  const [timelineFilter, setTimelineFilter] = useState('todos');

  // Modal States
  const [showEvolucaoModal, setShowEvolucaoModal] = useState(false);
  const [showArquivoModal, setShowArquivoModal] = useState(false);
  const [showEditEvolucaoModal, setShowEditEvolucaoModal] = useState(false);
  const [editingEvolucao, setEditingEvolucao] = useState<any>(null);
  const [showEditArquivoModal, setShowEditArquivoModal] = useState(false);
  const [editingArquivo, setEditingArquivo] = useState<any>(null);
  const [showPrescricaoModal, setShowPrescricaoModal] = useState(false);
  const [showEditPrescricaoModal, setShowEditPrescricaoModal] = useState(false);
  const [editingPrescricao, setEditingPrescricao] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [patientAccessStatus, setPatientAccessStatus] = useState<'checking' | 'active' | 'invited' | 'inactive' | 'no_email'>('checking');
  const [invitingPatientAccess, setInvitingPatientAccess] = useState(false);

  // Form States
  const [evolucaoForm, setEvolucaoForm] = useState({
    atendimento_id: '',
    dor_escala: 0,
    descricao: '',
    exercicios_realizados: '',
    observacoes: '',
    plano: ''
  });

  const [arquivoForm, setArquivoForm] = useState({
    tipo: 'Exame',
    nome_arquivo: '',
    visible_to_patient: true,
    file: null as File | null
  });

  const [prescricaoForm, setPrescricaoForm] = useState({
    exercicio_id: '',
    observacoes: ''
  });

  const [bibliotecaExercicios, setBibliotecaExercicios] = useState<any[]>([]);

  useEffect(() => {
    if (profile && profile.tipo_usuario !== 'fisioterapeuta') {
      navigate('/dashboard');
      return;
    }
    if (id && user) {
      fetchPatientData();
    }
  }, [id, user, profile]);

  const normalizeEmail = (value: unknown) => String(value || '').trim().toLowerCase();

  const getPatientProfileCandidates = (patientData: any) => [
    patientData?.perfil_id,
    patientData?.profile_id,
    patientData?.user_id,
    patientData?.auth_user_id,
    patientData?.paciente_id,
  ].filter(Boolean).map(String);

  const fetchLinkedPatientProfile = async (patientData: any) => {
    const candidateIds = getPatientProfileCandidates(patientData);
    const patientEmail = normalizeEmail(patientData?.email);

    if (candidateIds.length > 0) {
      const { data: profilesById, error: profilesByIdError } = await supabase
        .from('perfis')
        .select('id, nome_completo, email, telefone, data_nascimento, avatar_url, foto_url, tipo_usuario, role')
        .in('id', candidateIds)
        .limit(1);

      if (profilesByIdError) {
        console.warn('Erro ao buscar perfil real do paciente por ID:', profilesByIdError);
      }

      if (Array.isArray(profilesById) && profilesById[0]?.id) {
        return profilesById[0];
      }
    }

    if (patientEmail) {
      const { data: profileByEmail, error: profileByEmailError } = await supabase
        .from('perfis')
        .select('id, nome_completo, email, telefone, data_nascimento, avatar_url, foto_url, tipo_usuario, role')
        .ilike('email', patientEmail)
        .maybeSingle();

      if (profileByEmailError) {
        console.warn('Erro ao buscar perfil real do paciente por e-mail:', profileByEmailError);
      }

      if (profileByEmail?.id) return profileByEmail;
    }

    return null;
  };

  const mergePatientWithProfile = (patientData: any, linkedProfile: any) => ({
    ...patientData,
    perfil_id: patientData?.perfil_id || linkedProfile?.id || null,
    nome_completo: patientData?.nome_completo || linkedProfile?.nome_completo || 'Paciente',
    email: patientData?.email || linkedProfile?.email || null,
    telefone: patientData?.telefone || linkedProfile?.telefone || null,
    data_nascimento: patientData?.data_nascimento || linkedProfile?.data_nascimento || null,
    foto_url: patientData?.foto_url || patientData?.avatar_url || linkedProfile?.foto_url || linkedProfile?.avatar_url || null,
    avatar_url: patientData?.avatar_url || linkedProfile?.avatar_url || linkedProfile?.foto_url || null,
    linked_profile: linkedProfile || null,
  });

  const getAllPatientDataIds = (patientData: any, linkedProfile?: any) => Array.from(new Set([
    patientData?.id,
    patientData?.perfil_id,
    patientData?.profile_id,
    patientData?.user_id,
    patientData?.auth_user_id,
    patientData?.paciente_id,
    linkedProfile?.id,
  ].filter(Boolean).map(String)));

  const resolvePatientAccessStatus = (patientData: any) => {
    const status = String(patientData?.acesso_status || '').trim().toLowerCase();
    const accessReleased = patientData?.acesso_liberado === true || Boolean(patientData?.acesso_liberado_em);

    if (status === 'ativo' || accessReleased) return 'active' as const;
    if (status === 'convite_enviado' || Boolean(patientData?.convite_enviado_em) || Boolean(patientData?.ultimo_convite_em)) return 'invited' as const;
    return null;
  };

  const checkPatientAccessStatus = async (patientData: any) => {
    const patientEmail = normalizeEmail(patientData?.email);
    const explicitStatus = resolvePatientAccessStatus(patientData);

    if (explicitStatus) {
      setPatientAccessStatus(explicitStatus);
      return;
    }

    const possibleProfileIds = [
      patientData?.perfil_id,
      patientData?.profile_id,
      patientData?.user_id,
      patientData?.auth_user_id,
      patientData?.paciente_id,
    ].filter(Boolean).map(String);

    if (!patientEmail && possibleProfileIds.length === 0) {
      setPatientAccessStatus('no_email');
      return;
    }

    try {
      let profileFound = false;

      if (possibleProfileIds.length > 0) {
        const { data: profilesById, error: profilesByIdError } = await supabase
          .from('perfis')
          .select('id, email, tipo_usuario, role')
          .in('id', possibleProfileIds)
          .limit(1);

        if (profilesByIdError) {
          console.warn('Erro ao verificar perfil do paciente por ID:', profilesByIdError);
        }

        profileFound = Array.isArray(profilesById) && profilesById.length > 0;
      }

      if (!profileFound && patientEmail) {
        const { data: profileByEmail, error: profileByEmailError } = await supabase
          .from('perfis')
          .select('id, email, tipo_usuario, role')
          .ilike('email', patientEmail)
          .maybeSingle();

        if (profileByEmailError) {
          console.warn('Erro ao verificar perfil do paciente por e-mail:', profileByEmailError);
        }

        profileFound = Boolean(profileByEmail?.id);
      }

      setPatientAccessStatus(profileFound ? 'active' : 'inactive');
    } catch (error) {
      console.error('Erro ao verificar acesso ativo do paciente:', error);
      setPatientAccessStatus(patientEmail ? 'inactive' : 'no_email');
    }
  };

  const handleInvitePatientAccess = async () => {
    if (!patient?.id || invitingPatientAccess || patientAccessStatus === 'active') return;

    if (!patient?.email) {
      toast.error('Este paciente não possui e-mail cadastrado.');
      setPatientAccessStatus('no_email');
      return;
    }

    setInvitingPatientAccess(true);

    try {
      const { data, error } = await supabase.functions.invoke('invite-patient-access', {
        body: {
          patientId: patient.id,
          pacienteId: patient.id,
          email: patient.email,
        },
      });

      if (error) throw error;

      const message =
        data?.message ||
        (data?.alreadyActive
          ? 'Paciente já possui acesso ativo.'
          : 'Convite de acesso enviado com sucesso.');

      toast.success(message);

      if (data?.status === 'invite_sent' || data?.status === 'invite_pending') {
        const updatedPatient = {
          ...patient,
          perfil_id: data?.profileId || patient?.perfil_id,
          acesso_status: 'convite_enviado',
          convite_enviado_em: new Date().toISOString(),
          ultimo_convite_em: new Date().toISOString(),
        };
        setPatient(updatedPatient);
        setPatientAccessStatus('invited');
      } else if (data?.status === 'linked_existing_account') {
        const updatedPatient = {
          ...patient,
          perfil_id: data?.profileId || patient?.perfil_id,
          acesso_status: 'ativo',
          acesso_liberado_em: new Date().toISOString(),
        };
        setPatient(updatedPatient);
        setPatientAccessStatus('active');
      } else {
        await checkPatientAccessStatus(patient);
      }
    } catch (err: any) {
      console.error('Erro ao enviar convite para o paciente:', err);
      toast.error(getSupabaseErrorMessage(err, 'Não foi possível enviar o convite para este paciente.'));
    } finally {
      setInvitingPatientAccess(false);
    }
  };

  const ignoreMissingRelationError = (error: any) => {
    const message = String(error?.message || error?.details || error?.hint || '').toLowerCase();
    return (
      message.includes('does not exist') ||
      message.includes('could not find') ||
      message.includes('schema cache') ||
      message.includes('relation') ||
      message.includes('column')
    );
  };

  const deletePatientLinkedRows = async (patientId: string) => {
    const linkedTables = [
      'exercicios_paciente',
      'evolucoes',
      'arquivos_paciente',
      'triagens',
      'prontuarios',
      'avaliacoes',
      'diario_dor',
      'documentos_gerados',
      'fichas_avaliacao',
      'registros_paciente'
    ];

    for (const table of linkedTables) {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('paciente_id', patientId);

      if (error && !ignoreMissingRelationError(error)) {
        throw error;
      }
    }
  };

  const handleDeletePatient = async () => {
    if (!user || !patient?.id) return;

    const confirmed = window.confirm(`Deseja apagar o paciente ${patient.nome_completo || 'selecionado'}? Essa ação não pode ser desfeita.`);
    if (!confirmed) return;

    setSubmitting(true);

    try {
      await deletePatientLinkedRows(patient.id);

      const { error: deleteError } = await supabase
        .from('pacientes')
        .delete()
        .eq('id', patient.id)
        .eq('fisioterapeuta_id', user.id);

      if (deleteError) throw deleteError;

      toast.success('Paciente apagado com sucesso!');
      navigate('/patients');
    } catch (err: any) {
      console.error('Erro ao apagar paciente:', err);
      toast.error(getSupabaseErrorMessage(err, 'Erro ao apagar paciente. Verifique se existem registros vinculados.'));
    } finally {
      setSubmitting(false);
    }
  };

  const fetchPatientData = async () => {
    try {
      // Fetch Patient
      const { data: patientData, error: pError } = await supabase
        .from('pacientes')
        .select('*')
        .eq('id', id)
        .single();
      if (pError) throw pError;

      const linkedProfile = await fetchLinkedPatientProfile(patientData);
      const resolvedPatient = mergePatientWithProfile(patientData, linkedProfile);
      const patientDataIds = getAllPatientDataIds(patientData, linkedProfile);
      const patientEmailForDocs = normalizeEmail(resolvedPatient.email);

      setPatient(resolvedPatient);
      await checkPatientAccessStatus(resolvedPatient);

      // Fetch Evoluções
      const { data: evData } = await supabase
        .from('evolucoes')
        .select('*')
        .in('paciente_id', patientDataIds)
        .order('created_at', { ascending: false });
      setEvolucoes(evData || []);

      // Fetch Arquivos
      const { data: arData } = await supabase
        .from('arquivos_paciente')
        .select('*')
        .in('paciente_id', patientDataIds)
        .order('created_at', { ascending: false });
      setArquivos(arData || []);

      // Fetch Documentos Gerados (vínculo por paciente_id/profile_id + fallback por e-mail)
      let docsQuery = supabase
        .from('documentos_gerados')
        .select('*')
        .order('criado_em', { ascending: false });

      if (patientEmailForDocs) {
        docsQuery = docsQuery.or(`paciente_id.in.(${patientDataIds.join(',')}),patient_email.eq.${patientEmailForDocs}`);
      } else {
        docsQuery = docsQuery.in('paciente_id', patientDataIds);
      }

      const { data: docsData, error: docsError } = await docsQuery;
      if (docsError) {
        // Compatibilidade com bancos que ainda não receberam a coluna paciente_id
        console.warn('Busca por paciente_id em documentos_gerados falhou, tentando fallback por e-mail:', docsError);
        if (patientEmailForDocs) {
          const { data: fallbackDocs } = await supabase
            .from('documentos_gerados')
            .select('*')
            .eq('patient_email', patientEmailForDocs)
            .order('criado_em', { ascending: false });
          setDocumentosGerados(fallbackDocs || []);
        } else {
          setDocumentosGerados([]);
        }
      } else {
        setDocumentosGerados(docsData || []);
      }

      // Fetch Agendamentos (for linking evolutions)
      const { data: atData } = await supabase
        .from('agendamentos')
        .select('*')
        .in('paciente_id', patientDataIds)
        .eq('status', 'realizado')
        .order('data', { ascending: false });
      setAgendamentos(atData || []);

      // Fetch Prescrições
      // Busca em 2 etapas para não depender de foreign key/cache do Supabase.
      // Sem isso, o insert pode dar sucesso, mas a lista continuar vazia quando o join falha.
      const { data: preData, error: preError } = await supabase
        .from('exercicios_paciente')
        .select('*')
        .in('paciente_id', patientDataIds)
        .order('created_at', { ascending: false });

      if (preError) {
        console.error('Erro ao buscar prescrições:', preError);
        setPrescricoes([]);
      } else {
        const exercicioIds = Array.from(
          new Set((preData || []).map((pres: any) => pres.exercicio_id).filter(Boolean))
        );

        let exerciciosMap: Record<string, any> = {};

        if (exercicioIds.length > 0) {
          const { data: exerciciosData, error: exerciciosError } = await supabase
            .from('exercicios')
            .select('*')
            .in('id', exercicioIds);

          if (exerciciosError) {
            console.error('Erro ao buscar dados dos exercícios:', exerciciosError);
          } else {
            exerciciosMap = (exerciciosData || []).reduce((acc: Record<string, any>, exercicio: any) => {
              acc[exercicio.id] = exercicio;
              return acc;
            }, {});
          }
        }

        setPrescricoes((preData || []).map((pres: any) => ({
          ...pres,
          exercicio: exerciciosMap[pres.exercicio_id] || null
        })));
      }

      // Fetch Avaliações
      const { data: avaData } = await supabase
        .from('fichas_avaliacao')
        .select('*')
        .in('paciente_id', patientDataIds)
        .order('created_at', { ascending: false });
      setAvaliacoes(avaData || []);

      // Fetch Daily Journals
      // O diário do paciente é salvo usando o ID da conta real do paciente
      // (perfis.id/auth.uid). Já o prontuário do fisioterapeuta usa o ID
      // clínico da tabela pacientes. Por isso buscamos pelos dois vínculos.
      const uniqueJournalPatientIds = patientDataIds;

      if (uniqueJournalPatientIds.length > 0) {
        const { data: journalData, error: journalError } = await supabase
          .from('registros_paciente')
          .select('*')
          .in('paciente_id', uniqueJournalPatientIds)
          .order('data_registro', { ascending: false });

        if (journalError) {
          console.error('Erro ao buscar diário do paciente:', journalError);
          setDailyJournals([]);
        } else {
          setDailyJournals(journalData || []);
        }
      } else {
        setDailyJournals([]);
      }

      // Fetch Biblioteca de Exercícios
      const { data: bibData } = await supabase
        .from('exercicios')
        .select('*')
        .order('nome');
      setBibliotecaExercicios(bibData || []);

    } catch (err) {
      console.error('Erro ao buscar dados do paciente:', err);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleExportProntuario = async () => {
    if (!patient) return;

    try {
      toast.info('Gerando prontuário profissional em PDF...');

      const { jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 14;
      let y = 18;

      const safeText = (value: unknown, fallback = 'Não informado') => {
        if (value === null || value === undefined || value === '') return fallback;
        return String(value);
      };

      const cleanFileName = (value: unknown) => {
        const raw = safeText(value, '-');
        if (raw === '-') return raw;
        try {
          const withoutQuery = raw.split('?')[0];
          const decoded = decodeURIComponent(withoutQuery);
          return decoded.split('/').pop() || decoded;
        } catch {
          return raw.split('/').pop() || raw;
        }
      };

      const formatLongDate = (value: unknown) => {
        if (!value) return '-';
        try {
          return new Date(String(value)).toLocaleString('pt-BR');
        } catch {
          return String(value);
        }
      };

      const physioName = safeText(
        profile?.nome_completo || profile?.nome || profile?.full_name || user?.email,
        'Fisioterapeuta responsável'
      );
      const physioCrefito = safeText(profile?.crefito || profile?.registro_profissional || profile?.numero_crefito, 'Não informado');
      const physioEmail = safeText(profile?.email || user?.email, 'Não informado');
      const physioPhone = safeText(profile?.telefone || profile?.whatsapp, 'Não informado');
      const clinicName = safeText(profile?.clinica || profile?.nome_clinica || 'FisioCareHub', 'FisioCareHub');

      const checkPage = (needed = 24) => {
        if (y + needed > pageHeight - 24) {
          doc.addPage();
          y = 18;
        }
      };

      const addHeader = () => {
        doc.setFillColor(14, 165, 233);
        doc.rect(0, 0, pageWidth, 19, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(15);
        doc.text('FisioCareHub', margin, 12);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text('Prontuário Fisioterapêutico', pageWidth - margin, 12, { align: 'right' });
        doc.setTextColor(15, 23, 42);
      };

      const addFooter = () => {
        const pages = doc.getNumberOfPages();
        for (let i = 1; i <= pages; i += 1) {
          doc.setPage(i);
          doc.setDrawColor(226, 232, 240);
          doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(100, 116, 139);
          doc.text(
            'Documento gerado pelo FisioCareHub com base nos registros cadastrados pelo profissional.',
            margin,
            pageHeight - 8
          );
          doc.text(`Página ${i} de ${pages}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
        }
        doc.setTextColor(15, 23, 42);
      };

      const addSectionTitle = (title: string, color: [number, number, number] = [2, 132, 199]) => {
        checkPage(18);
        doc.setFillColor(color[0], color[1], color[2]);
        doc.roundedRect(margin, y, pageWidth - margin * 2, 8, 1.5, 1.5, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(title, margin + 3, y + 5.5);
        doc.setTextColor(15, 23, 42);
        y += 12;
      };

      const addParagraph = (textValue: string, fallback = 'Não informado') => {
        checkPage(16);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(51, 65, 85);
        const lines = doc.splitTextToSize(textValue || fallback, pageWidth - margin * 2);
        checkPage(lines.length * 4.5 + 6);
        doc.text(lines, margin, y);
        y += lines.length * 4.5 + 5;
        doc.setTextColor(15, 23, 42);
      };

      const addKeyValueTable = (rows: Array<[string, string]>, headColor: [number, number, number] = [20, 184, 166]) => {
        checkPage(30);
        autoTable(doc, {
          startY: y,
          theme: 'grid',
          styles: { fontSize: 8.5, cellPadding: 2.2, overflow: 'linebreak', valign: 'top' },
          headStyles: { fillColor: headColor, textColor: 255, fontStyle: 'bold' },
          columnStyles: { 0: { cellWidth: 48, fontStyle: 'bold' }, 1: { cellWidth: pageWidth - margin * 2 - 48 } },
          margin: { left: margin, right: margin },
          head: [['Campo', 'Informação']],
          body: rows,
        });
        y = (doc as any).lastAutoTable.finalY + 8;
      };

      addHeader();
      y = 28;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('Prontuário Fisioterapêutico', margin, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, margin, y);
      y += 10;
      doc.setTextColor(15, 23, 42);

      addSectionTitle('1. Identificação do paciente', [20, 184, 166]);
      addKeyValueTable([
        ['Nome', safeText(patient.nome_completo)],
        ['Data de nascimento', patient.data_nascimento ? formatOnlyDateBR(patient.data_nascimento) : 'Não informado'],
        ['Telefone/WhatsApp', safeText(patient.telefone)],
        ['E-mail', safeText(patient.email)],
        ['Diagnóstico clínico informado', safeText(patient.diagnostico)],
        ['Observações iniciais', safeText(patient.observacoes)],
      ], [20, 184, 166]);

      addSectionTitle('2. Profissional responsável', [37, 99, 235]);
      addKeyValueTable([
        ['Nome', physioName],
        ['CREFITO', physioCrefito],
        ['E-mail', physioEmail],
        ['Telefone/WhatsApp', physioPhone],
        ['Serviço/Clínica', clinicName],
      ], [37, 99, 235]);

      addSectionTitle('3. Avaliações fisioterapêuticas', [2, 132, 199]);
      if (avaliacoes.length === 0) {
        addParagraph('Nenhuma avaliação fisioterapêutica registrada.');
      } else {
        avaliacoes.forEach((ava, index) => {
          checkPage(40);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.text(`Avaliação ${index + 1} — ${ava.created_at ? formatLongDate(ava.created_at) : 'Data não informada'}`, margin, y);
          y += 5;
          addKeyValueTable([
            ['Queixa principal', safeText(ava.queixa_principal)],
            ['História da doença atual', safeText(ava.historia_doenca_atual)],
            ['Escala de dor', ava.escala_dor !== undefined && ava.escala_dor !== null ? `${ava.escala_dor}/10` : 'Não informado'],
            ['Limitações / nível funcional', safeText(ava.nivel_funcional || ava.limitacoes_funcionais)],
            ['Marcha', safeText(ava.marcha)],
            ['Postura', safeText(ava.postura)],
            ['Inspeção', safeText(ava.inspecao)],
            ['Palpação', safeText(ava.palpacao)],
            ['Amplitude de movimento', safeText(ava.amplitude_movimento)],
            ['Força muscular', safeText(ava.forca_muscular)],
            ['Testes especiais', safeText(ava.testes_especiais)],
            ['Diagnóstico fisioterapêutico', safeText(ava.diagnostico_fisio)],
            ['Objetivos terapêuticos', safeText(ava.objetivos_terapeuticos)],
            ['Conduta inicial', safeText(ava.conduta)],
            ['Prognóstico', safeText(ava.prognostico)],
            ['Observações finais', safeText(ava.observacoes_finais)],
          ], [2, 132, 199]);
        });
      }

      addSectionTitle('4. Evoluções de atendimento', [14, 165, 233]);
      if (evolucoes.length === 0) {
        addParagraph('Nenhuma evolução registrada.');
      } else {
        autoTable(doc, {
          startY: y,
          theme: 'striped',
          styles: { fontSize: 7.8, cellPadding: 2, overflow: 'linebreak', valign: 'top' },
          headStyles: { fillColor: [14, 165, 233], textColor: 255, fontStyle: 'bold' },
          margin: { left: margin, right: margin },
          head: [['Data', 'Dor', 'Descrição da sessão', 'Exercícios/condutas', 'Plano/próximos passos']],
          body: evolucoes.map((ev) => [
            ev.created_at ? formatLongDate(ev.created_at) : '-',
            ev.dor_escala !== undefined && ev.dor_escala !== null ? `${ev.dor_escala}/10` : '-',
            safeText(ev.descricao, '-'),
            safeText(ev.exercicios_realizados, '-'),
            safeText(ev.plano || ev.observacoes, '-'),
          ]),
          columnStyles: {
            0: { cellWidth: 28 },
            1: { cellWidth: 13 },
            2: { cellWidth: 48 },
            3: { cellWidth: 50 },
            4: { cellWidth: pageWidth - margin * 2 - 139 },
          },
        });
        y = (doc as any).lastAutoTable.finalY + 10;
      }

      addSectionTitle('5. Prescrições de exercícios', [79, 70, 229]);
      if (prescricoes.length === 0) {
        addParagraph('Nenhum exercício prescrito.');
      } else {
        autoTable(doc, {
          startY: y,
          theme: 'striped',
          styles: { fontSize: 7.8, cellPadding: 2, overflow: 'linebreak', valign: 'top' },
          headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
          margin: { left: margin, right: margin },
          head: [['Data', 'Exercício', 'Categoria', 'Dificuldade', 'Orientações/observações']],
          body: prescricoes.map((pres) => [
            pres.created_at ? formatLongDate(pres.created_at) : '-',
            safeText(pres.exercicio?.nome, 'Exercício não encontrado'),
            safeText(pres.exercicio?.categoria || pres.exercicio?.categoria_principal, '-'),
            safeText(pres.exercicio?.dificuldade || pres.exercicio?.nivel, '-'),
            safeText(pres.observacoes, '-'),
          ]),
        });
        y = (doc as any).lastAutoTable.finalY + 10;
      }

      addSectionTitle('6. Arquivos anexados', [100, 116, 139]);
      if (arquivos.length === 0) {
        addParagraph('Nenhum arquivo anexado.');
      } else {
        autoTable(doc, {
          startY: y,
          theme: 'striped',
          styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak', valign: 'top' },
          headStyles: { fillColor: [100, 116, 139], textColor: 255, fontStyle: 'bold' },
          margin: { left: margin, right: margin },
          head: [['Data', 'Tipo', 'Arquivo']],
          body: arquivos.map((arq) => [
            arq.created_at ? formatLongDate(arq.created_at) : '-',
            safeText(arq.tipo, '-'),
            cleanFileName(arq.nome_arquivo || arq.file_path || arq.arquivo_url),
          ]),
        });
        y = (doc as any).lastAutoTable.finalY + 10;
      }

      addSectionTitle('7. Documentos gerados', [245, 158, 11]);
      if (documentosGerados.length === 0) {
        addParagraph('Nenhum documento gerado vinculado a este paciente.');
      } else {
        autoTable(doc, {
          startY: y,
          theme: 'striped',
          styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak', valign: 'top' },
          headStyles: { fillColor: [245, 158, 11], textColor: 255, fontStyle: 'bold' },
          margin: { left: margin, right: margin },
          head: [['Data', 'Tipo', 'Status', 'Aceite']],
          body: documentosGerados.map((documento) => [
            documento.criado_em ? formatLongDate(documento.criado_em) : '-',
            safeText(documento.document_name || documento.type || documento.titulo, 'Documento'),
            documento.visible_to_patient === false ? 'Privado' : 'Visível ao paciente',
            documento.accepted_at ? `Aceito em ${formatLongDate(documento.accepted_at)}` : 'Pendente/não aplicável',
          ]),
        });
        y = (doc as any).lastAutoTable.finalY + 10;
      }

      addSectionTitle('8. Diário do paciente', [16, 185, 129]);
      if (dailyJournals.length === 0) {
        addParagraph('Nenhum registro de diário do paciente encontrado.');
      } else {
        autoTable(doc, {
          startY: y,
          theme: 'striped',
          styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak', valign: 'top' },
          headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
          margin: { left: margin, right: margin },
          head: [['Data', 'Dor', 'Adesão', 'Notas']],
          body: dailyJournals.map((journal) => [
            journal.data_registro ? formatOnlyDateBR(journal.data_registro) : '-',
            journal.nivel_dor !== undefined && journal.nivel_dor !== null ? `${journal.nivel_dor}/10` : '-',
            `${journal.concluidos_count || 0}/${journal.total_exercicios || 0}`,
            safeText(journal.notas, '-'),
          ]),
        });
        y = (doc as any).lastAutoTable.finalY + 10;
      }

      addSectionTitle('9. Observações legais e validação', [15, 23, 42]);
      addParagraph('Este prontuário reúne os registros cadastrados no FisioCareHub pelo profissional responsável. As informações devem ser interpretadas dentro do contexto clínico e não substituem a avaliação presencial e o raciocínio fisioterapêutico. A visualização pelo paciente depende das permissões definidas pelo profissional.');

      checkPage(36);
      y += 8;
      doc.setDrawColor(15, 23, 42);
      doc.line(margin, y, margin + 75, y);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(physioName, margin, y + 5);
      doc.setFont('helvetica', 'normal');
      doc.text(`CREFITO: ${physioCrefito}`, margin, y + 10);
      doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, margin, y + 15);

      addFooter();

      const filename = `prontuario_${safeText(patient.nome_completo, 'paciente')}`
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .toLowerCase();

      const pdfFileName = `${filename}.pdf`;
      const pdfBlob = doc.output('blob');
      doc.save(pdfFileName);

      if (user?.id && id) {
        try {
          const pdfFile = new File([pdfBlob], pdfFileName, { type: 'application/pdf' });
          const uploadedPath = await uploadPatientDocument(user.id, id, pdfFile);

          const { error: arquivoError } = await supabase
            .from('arquivos_paciente')
            .insert({
              paciente_id: id,
              arquivo_url: uploadedPath,
              file_path: uploadedPath,
              nome_arquivo: pdfFileName,
              mime_type: 'application/pdf',
              tamanho_bytes: pdfBlob.size,
              tipo: 'Prontuário completo',
              visible_to_patient: true
            });

          if (arquivoError) throw arquivoError;
          toast.success('Prontuário gerado, baixado e salvo para o paciente!');
          fetchPatientData();
        } catch (saveErr) {
          console.error('Prontuário baixado, mas não foi salvo para o paciente:', saveErr);
          toast.warning('PDF baixado. Não foi possível salvar automaticamente em Documentos do paciente.');
        }
      } else {
        toast.success('Prontuário profissional gerado em PDF!');
      }
    } catch (err) {
      console.error('Erro ao gerar prontuário:', err);
      toast.error(getSupabaseErrorMessage(err, 'Erro ao gerar prontuário em PDF'));
    }
  };

  const handleCreateEvolucao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || submitting) return;

    setSubmitting(true);
    try {
      const payload = {
        ...evolucaoForm,
        atendimento_id: evolucaoForm.atendimento_id || null,
        paciente_id: id
      };

      const { error } = await supabase
        .from('evolucoes')
        .insert(payload);

      if (error) throw error;

      toast.success('Evolução registrada!');
      setShowEvolucaoModal(false);
      setEvolucaoForm({
        atendimento_id: '',
        dor_escala: 0,
        descricao: '',
        exercicios_realizados: '',
        observacoes: '',
        plano: ''
      });
      fetchPatientData();
    } catch (err) {
      console.error('Erro ao salvar evolução:', err);
      toast.error(getSupabaseErrorMessage(err, 'Erro ao salvar evolução'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUploadArquivo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || submitting) return;
    if (!user) {
      toast.error('Usuário não autenticado. Faça login novamente.');
      return;
    }
    if (!arquivoForm.file) {
      toast.error('Selecione um arquivo antes de iniciar o upload.');
      return;
    }

    setSubmitting(true);
    try {
      const url = await uploadPatientDocument(user.id, id, arquivoForm.file);
      
      const insertPayload = {
        paciente_id: id,
        arquivo_url: url,
        file_path: url,
        nome_arquivo: arquivoForm.nome_arquivo?.trim() || arquivoForm.file.name,
        mime_type: arquivoForm.file.type || 'application/octet-stream',
        tamanho_bytes: arquivoForm.file.size,
        tipo: arquivoForm.tipo,
        visible_to_patient: arquivoForm.visible_to_patient
      };

      const { error } = await supabase
        .from('arquivos_paciente')
        .insert(insertPayload);

      if (error) {
        console.warn('Insert com visible_to_patient falhou, tentando compatibilidade:', error);
        const { visible_to_patient, ...legacyPayload } = insertPayload;
        const { error: legacyError } = await supabase
          .from('arquivos_paciente')
          .insert(legacyPayload);
        if (legacyError) throw legacyError;
      }

      toast.success('Arquivo enviado com sucesso!');
      setShowArquivoModal(false);
      setArquivoForm({ tipo: 'Exame', nome_arquivo: '', visible_to_patient: true, file: null });
      fetchPatientData();
    } catch (err) {
      console.error('Erro ao enviar arquivo:', err);
      toast.error(getSupabaseErrorMessage(err, 'Erro ao enviar arquivo'));
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrescreverExercicio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || submitting) return;

    setSubmitting(true);
    try {
      const { data: insertedData, error } = await supabase
        .from('exercicios_paciente')
        .insert({
          ...prescricaoForm,
          paciente_id: id
        })
        .select('*')
        .single();

      if (error) throw error;

      const selectedExercise = bibliotecaExercicios.find((ex) => ex.id === prescricaoForm.exercicio_id) || null;

      if (insertedData) {
        setPrescricoes((current) => [
          {
            ...insertedData,
            exercicio: selectedExercise
          },
          ...current
        ]);
      }

      toast.success('Exercício prescrito!');
      setShowPrescricaoModal(false);
      setPrescricaoForm({ exercicio_id: '', observacoes: '' });
      fetchPatientData();
    } catch (err) {
      console.error('Erro ao prescrever exercício:', err);
      toast.error(getSupabaseErrorMessage(err, 'Erro ao prescrever exercício'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEditPrescricao = (prescricao: any) => {
    setEditingPrescricao(prescricao);
    setPrescricaoForm({
      exercicio_id: prescricao.exercicio_id || '',
      observacoes: prescricao.observacoes || ''
    });
    setShowEditPrescricaoModal(true);
  };

  const handleUpdatePrescricao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !editingPrescricao || submitting) return;

    setSubmitting(true);
    try {
      const { data: updatedData, error } = await supabase
        .from('exercicios_paciente')
        .update({
          exercicio_id: prescricaoForm.exercicio_id,
          observacoes: prescricaoForm.observacoes,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingPrescricao.id)
        .eq('paciente_id', id)
        .select('*')
        .single();

      if (error) throw error;

      const selectedExercise = bibliotecaExercicios.find((ex) => ex.id === prescricaoForm.exercicio_id) || null;

      setPrescricoes((current) =>
        current.map((pres) =>
          pres.id === editingPrescricao.id
            ? { ...pres, ...updatedData, exercicio: selectedExercise }
            : pres
        )
      );

      toast.success('Prescrição atualizada!');
      setShowEditPrescricaoModal(false);
      setEditingPrescricao(null);
      setPrescricaoForm({ exercicio_id: '', observacoes: '' });
      fetchPatientData();
    } catch (err) {
      console.error('Erro ao atualizar prescrição:', err);
      toast.error(getSupabaseErrorMessage(err, 'Erro ao atualizar prescrição'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePrescricao = async (prescricaoId: string) => {
    if (!id || submitting) return;

    const confirmar = window.confirm('Deseja remover este exercício prescrito do paciente?');
    if (!confirmar) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('exercicios_paciente')
        .delete()
        .eq('id', prescricaoId)
        .eq('paciente_id', id);

      if (error) throw error;

      setPrescricoes((current) => current.filter((pres) => pres.id !== prescricaoId));
      if (editingPrescricao?.id === prescricaoId) {
        setShowEditPrescricaoModal(false);
        setEditingPrescricao(null);
        setPrescricaoForm({ exercicio_id: '', observacoes: '' });
      }
      toast.success('Exercício removido!');
    } catch (err) {
      console.error('Erro ao apagar prescrição:', err);
      toast.error(getSupabaseErrorMessage(err, 'Erro ao apagar prescrição'));
    } finally {
      setSubmitting(false);
    }
  };


  const buildTimelineItems = () => {
    const items = [
      ...avaliacoes.map((item) => ({ id: `avaliacao-${item.id}`, tipo: 'avaliação', title: item.diagnostico_fisio || 'Avaliação fisioterapêutica', date: item.created_at, description: item.queixa_principal || item.observacoes_finais || 'Ficha de avaliação cadastrada.', icon: Stethoscope })),
      ...evolucoes.map((item) => ({ id: `evolucao-${item.id}`, tipo: 'evolução', title: 'Evolução clínica', date: item.created_at, description: item.descricao || item.plano || 'Evolução registrada.', icon: Activity })),
      ...prescricoes.map((item) => ({ id: `prescricao-${item.id}`, tipo: 'prescrição', title: item.exercicio?.nome || 'Exercício prescrito', date: item.created_at, description: item.observacoes || 'Prescrição de exercício.', icon: Dna })),
      ...arquivos.map((item) => ({ id: `arquivo-${item.id}`, tipo: 'anexo', title: item.nome_arquivo || item.tipo || 'Arquivo anexado', date: item.created_at, description: item.visible_to_patient === false ? 'Arquivo privado do fisioterapeuta.' : 'Visível para o paciente.', icon: Paperclip })),
      ...documentosGerados.map((item) => ({ id: `doc-${item.id}`, tipo: 'documento', title: item.document_name || item.type || 'Documento gerado', date: item.criado_em || item.created_at, description: item.accepted_at ? 'Aceito pelo paciente.' : (item.visible_to_patient === false ? 'Documento privado.' : 'Documento visível ao paciente.'), icon: FileText })),
      ...dailyJournals.map((item) => ({ id: `diario-${item.id}`, tipo: 'diário', title: `Diário de dor: ${item.nivel_dor ?? '-'}/10`, date: item.data_registro || item.created_at, description: item.notas || 'Registro do diário do paciente.', icon: ClipboardList })),
    ];

    return items
      .filter((item) => timelineFilter === 'todos' || item.tipo === timelineFilter)
      .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
  };

  const handleOpenEditEvolucao = (evolucao: any) => {
    setEditingEvolucao(evolucao);
    setEvolucaoForm({
      atendimento_id: evolucao.atendimento_id || '',
      dor_escala: Number(evolucao.dor_escala || 0),
      descricao: evolucao.descricao || '',
      exercicios_realizados: evolucao.exercicios_realizados || '',
      observacoes: evolucao.observacoes || '',
      plano: evolucao.plano || ''
    });
    setShowEditEvolucaoModal(true);
  };

  const handleUpdateEvolucao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !editingEvolucao || submitting) return;
    setSubmitting(true);
    try {
      const payload = { ...evolucaoForm, atendimento_id: evolucaoForm.atendimento_id || null, updated_at: new Date().toISOString() };
      const { data, error } = await supabase
        .from('evolucoes')
        .update(payload)
        .eq('id', editingEvolucao.id)
        .eq('paciente_id', id)
        .select('*')
        .single();
      if (error) throw error;
      setEvolucoes((current) => current.map((ev) => ev.id === editingEvolucao.id ? { ...ev, ...data } : ev));
      toast.success('Evolução atualizada!');
      setShowEditEvolucaoModal(false);
      setEditingEvolucao(null);
      setEvolucaoForm({ atendimento_id: '', dor_escala: 0, descricao: '', exercicios_realizados: '', observacoes: '', plano: '' });
      fetchPatientData();
    } catch (err) {
      console.error('Erro ao atualizar evolução:', err);
      toast.error(getSupabaseErrorMessage(err, 'Erro ao atualizar evolução'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEvolucao = async (evolucaoId: string) => {
    if (!id || submitting) return;
    if (!window.confirm('Deseja apagar esta evolução clínica?')) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('evolucoes').delete().eq('id', evolucaoId).eq('paciente_id', id);
      if (error) throw error;
      setEvolucoes((current) => current.filter((ev) => ev.id !== evolucaoId));
      if (editingEvolucao?.id === evolucaoId) {
        setShowEditEvolucaoModal(false);
        setEditingEvolucao(null);
      }
      toast.success('Evolução apagada!');
    } catch (err) {
      console.error('Erro ao apagar evolução:', err);
      toast.error(getSupabaseErrorMessage(err, 'Erro ao apagar evolução'));
    } finally {
      setSubmitting(false);
    }
  };

  const openPatientArquivo = async (arquivo: any) => {
    try {
      const pathOrUrl = arquivo?.file_path || arquivo?.arquivo_url;
      if (!pathOrUrl) {
        toast.error('Arquivo sem caminho para visualização.');
        return;
      }

      const raw = String(pathOrUrl).trim();
      const isUrl = /^https?:\/\//i.test(raw);
      const url = isUrl ? raw : await getPrivateDocumentUrl(raw);

      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error('Erro ao abrir arquivo do paciente:', err);
      toast.error(getSupabaseErrorMessage(err, 'Erro ao abrir arquivo. Verifique se o bucket documents existe e se o arquivo ainda está no Storage.'));
    }
  };

  const handleOpenEditArquivo = (arquivo: any) => {
    setEditingArquivo(arquivo);
    setArquivoForm({
      tipo: arquivo.tipo || 'Documento',
      nome_arquivo: arquivo.nome_arquivo || arquivo.nome || '',
      visible_to_patient: arquivo.visible_to_patient !== false,
      file: null
    });
    setShowEditArquivoModal(true);
  };

  const handleUpdateArquivo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !editingArquivo || submitting) return;
    setSubmitting(true);
    try {
      const payload = {
        tipo: arquivoForm.tipo,
        nome_arquivo: arquivoForm.nome_arquivo || editingArquivo.nome_arquivo || editingArquivo.nome || 'Documento',
        visible_to_patient: arquivoForm.visible_to_patient,
        updated_at: new Date().toISOString()
      };
      const { data, error } = await supabase
        .from('arquivos_paciente')
        .update(payload)
        .eq('id', editingArquivo.id)
        .eq('paciente_id', id)
        .select('*')
        .single();
      if (error) throw error;
      setArquivos((current) => current.map((arq) => arq.id === editingArquivo.id ? { ...arq, ...data } : arq));
      toast.success('Arquivo atualizado!');
      setShowEditArquivoModal(false);
      setEditingArquivo(null);
      setArquivoForm({ tipo: 'Exame', nome_arquivo: '', visible_to_patient: true, file: null });
      fetchPatientData();
    } catch (err) {
      console.error('Erro ao atualizar arquivo:', err);
      toast.error(getSupabaseErrorMessage(err, 'Erro ao atualizar arquivo'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteArquivo = async (arquivoId: string) => {
    if (!id || submitting) return;
    if (!window.confirm('Deseja apagar este arquivo do prontuário?')) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('arquivos_paciente').delete().eq('id', arquivoId).eq('paciente_id', id);
      if (error) throw error;
      setArquivos((current) => current.filter((arq) => arq.id !== arquivoId));
      if (editingArquivo?.id === arquivoId) {
        setShowEditArquivoModal(false);
        setEditingArquivo(null);
      }
      toast.success('Arquivo apagado!');
    } catch (err) {
      console.error('Erro ao apagar arquivo:', err);
      toast.error(getSupabaseErrorMessage(err, 'Erro ao apagar arquivo'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleDocumentoVisibility = async (documento: any) => {
    const nextValue = documento.visible_to_patient === false;
    try {
      const { data, error } = await supabase
        .from('documentos_gerados')
        .update({ visible_to_patient: nextValue, updated_at: new Date().toISOString() })
        .eq('id', documento.id)
        .select('*')
        .single();
      if (error) throw error;
      setDocumentosGerados((current) => current.map((doc) => doc.id === documento.id ? { ...doc, ...data } : doc));
      toast.success(nextValue ? 'Documento visível para o paciente.' : 'Documento privado para o fisioterapeuta.');
    } catch (err) {
      console.error('Erro ao alterar visibilidade do documento:', err);
      toast.error(getSupabaseErrorMessage(err, 'Erro ao alterar visibilidade do documento'));
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-sky-500" size={48} /></div>;
  if (!patient) return <div className="text-center py-20 font-black text-2xl">Paciente não encontrado</div>;

  return (
    <div className="space-y-8">
      <button 
        onClick={() => navigate('/patients')}
        className="flex items-center gap-2 text-slate-500 font-black hover:text-sky-600 transition-all"
      >
        <ArrowLeft size={20} /> Voltar para lista
      </button>

      <header className="bg-slate-900/50 backdrop-blur-xl p-8 rounded-[3rem] border border-white/10 shadow-2xl flex flex-col md:flex-row items-center gap-8">
        <div className="w-32 h-32 bg-white/5 rounded-[2rem] flex items-center justify-center text-blue-400 border-4 border-white/5 shadow-xl overflow-hidden">
          {(patient.foto_url || patient.avatar_url) ? (
            <img src={resolveStorageUrl(patient.foto_url || patient.avatar_url)} alt={patient.nome_completo} className="w-full h-full object-cover" />
          ) : (
            <User size={64} />
          )}
        </div>
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-4xl font-black text-white tracking-tight mb-2">{patient.nome_completo}</h1>
          <div className="flex flex-wrap justify-center md:justify-start gap-4 text-slate-400 font-medium">
            <span className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/5">
              <Calendar size={16} className="text-blue-400" />
              {patient.data_nascimento ? formatOnlyDateBR(patient.data_nascimento) : 'Sem data'}
            </span>
            <span className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/5">
              <Phone size={16} className="text-blue-400" />
              {patient.telefone || 'Sem telefone'}
            </span>
            <span className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/5">
              <Mail size={16} className="text-blue-400" />
              {patient.email || 'Sem e-mail'}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <ProGuard variant="inline">
            {patientAccessStatus === 'active' ? (
              <button
                type="button"
                disabled
                className="px-6 py-2 bg-emerald-600/20 text-emerald-300 rounded-2xl border border-emerald-600/20 font-black text-xs uppercase tracking-widest flex items-center gap-2 cursor-default"
                title="Paciente já possui conta ativa no FisioCareHub"
              >
                <CheckCircle2 size={18} /> Acesso Ativo
              </button>
            ) : patientAccessStatus === 'checking' ? (
              <button
                type="button"
                disabled
                className="px-6 py-2 bg-white/5 text-slate-400 rounded-2xl border border-white/5 font-black text-xs uppercase tracking-widest flex items-center gap-2"
              >
                <Loader2 size={18} className="animate-spin" /> Verificando
              </button>
            ) : patientAccessStatus === 'invited' ? (
              <button
                type="button"
                disabled={invitingPatientAccess}
                onClick={handleInvitePatientAccess}
                className="px-6 py-2 bg-sky-600/20 text-sky-300 rounded-2xl border border-sky-600/20 font-black text-xs uppercase tracking-widest flex items-center gap-2 disabled:opacity-60"
                title="Convite enviado. O acesso ficará ativo quando o paciente concluir o cadastro."
              >
                {invitingPatientAccess ? <Loader2 size={18} className="animate-spin" /> : <Mail size={18} />} Convite Enviado
              </button>
            ) : patientAccessStatus === 'no_email' ? (
              <button
                type="button"
                disabled
                className="px-6 py-2 bg-white/5 text-slate-400 rounded-2xl border border-white/5 font-black text-xs uppercase tracking-widest flex items-center gap-2"
                title="Cadastre um e-mail para enviar convite de acesso"
              >
                <AlertCircle size={18} /> Sem E-mail
              </button>
            ) : (
              <button 
                type="button"
                onClick={handleInvitePatientAccess}
                disabled={invitingPatientAccess}
                className="px-6 py-2 bg-emerald-600/20 text-emerald-400 rounded-2xl hover:bg-emerald-600/30 transition-all border border-emerald-600/20 font-black text-xs uppercase tracking-widest flex items-center gap-2 disabled:opacity-60"
              >
                {invitingPatientAccess ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                Enviar Convite
              </button>
            )}
          </ProGuard>
          <button
            type="button"
            onClick={handleDeletePatient}
            disabled={submitting}
            className="p-4 bg-white/5 text-slate-500 rounded-2xl hover:bg-red-500/10 hover:text-red-300 transition-all border border-white/5 disabled:opacity-50"
            title="Apagar paciente"
            aria-label="Apagar paciente"
          >
            {submitting ? <Loader2 size={24} className="animate-spin" /> : <Trash2 size={24} />}
          </button>
          <ProGuard variant="inline">
            <button 
              onClick={handleExportProntuario}
              className="p-4 bg-blue-600/20 text-blue-400 rounded-2xl hover:bg-blue-600/30 transition-all border border-blue-600/20"
              title="Exportar prontuário em PDF"
            >
              <FileText size={24} />
            </button>
          </ProGuard>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 p-2 bg-slate-900/50 backdrop-blur-xl rounded-[2rem] border border-white/10 overflow-x-auto no-scrollbar shadow-lg">
        {[
          { id: 'jornada', label: 'Jornada', icon: HeartPulse },
          { id: 'prontuario', label: 'Prontuário Completo', icon: ClipboardList },
          { id: 'ficha', label: 'Dados do Paciente', icon: User },
          { id: 'avaliacoes', label: 'Avaliações', icon: Stethoscope },
          { id: 'evolucoes', label: 'Evoluções', icon: Activity },
          { id: 'diario', label: 'Diário de Dor', icon: Activity },
          { id: 'arquivos', label: 'Exames/Anexos', icon: Paperclip },
          { id: 'documentos', label: 'Documentos Gerados', icon: FileText },
          { id: 'prescricoes', label: 'Prescrições', icon: Dna },
          { id: 'historico', label: 'Histórico Completo', icon: ShieldCheck },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-full font-black text-sm whitespace-nowrap transition-all",
              activeTab === tab.id 
                ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20" 
                : "text-slate-500 hover:text-slate-400 hover:bg-white/5"
            )}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        <AnimatePresence mode="wait">

          {activeTab === 'jornada' && (
            <motion.div
              key="jornada"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <FisioJourney compact mode="physio" patientId={id} patient={patient} />
            </motion.div>
          )}

          {activeTab === 'prontuario' && (
            <motion.div
              key="prontuario"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="bg-slate-900/50 backdrop-blur-xl p-8 rounded-[3rem] border border-white/10 shadow-2xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                  <div>
                    <h3 className="text-3xl font-black text-white flex items-center gap-3"><ClipboardList className="text-blue-400" /> Prontuário completo do paciente</h3>
                    <p className="text-slate-400 font-medium mt-2">Visão única com dados clínicos, avaliações, evoluções, prescrições, anexos, documentos e diário.</p>
                  </div>
                  <button onClick={handleExportProntuario} className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-700 transition-all flex items-center gap-2"><Download size={18} /> Baixar prontuário completo</button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    ['Avaliações', avaliacoes.length, Stethoscope, 'avaliacoes'],
                    ['Evoluções', evolucoes.length, Activity, 'evolucoes'],
                    ['Prescrições', prescricoes.length, Dna, 'prescricoes'],
                    ['Anexos', arquivos.length, Paperclip, 'arquivos'],
                    ['Documentos', documentosGerados.length, FileText, 'documentos'],
                    ['Diário', dailyJournals.length, ClipboardList, 'diario'],
                    ['Sessões', agendamentos.length, Calendar, 'ficha'],
                    ['Histórico', buildTimelineItems().length, ShieldCheck, 'historico'],
                  ].map(([label, value, Icon, tab]: any) => (
                    <button key={label} type="button" onClick={() => setActiveTab(tab)} className="p-5 bg-white/5 rounded-3xl text-left border border-white/5 hover:border-blue-500/30 hover:bg-white/10 transition-all">
                      <Icon size={24} className="text-blue-400 mb-3" />
                      <span className="block text-3xl font-black text-white">{value}</span>
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'ficha' && (
            <motion.div
              key="ficha"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid md:grid-cols-2 gap-8"
            >
              <div className="bg-slate-900/50 backdrop-blur-xl p-8 rounded-[3rem] border border-white/10 shadow-2xl space-y-6">
                <h3 className="text-2xl font-black text-white flex items-center gap-3">
                  <div className="p-2 bg-blue-600/20 text-blue-400 rounded-xl"><FileText size={20} /></div>
                  Diagnóstico e Notas
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Diagnóstico Clínico</label>
                    <p className="text-lg font-bold text-slate-300 mt-1">{patient.diagnostico || 'Não informado'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Observações Gerais</label>
                    <p className="text-slate-400 font-medium leading-relaxed mt-1">{patient.observacoes || 'Nenhuma observação registrada.'}</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/50 backdrop-blur-xl p-8 rounded-[3rem] border border-white/10 shadow-2xl space-y-6">
                <h3 className="text-2xl font-black text-white flex items-center gap-3">
                  <div className="p-2 bg-emerald-600/20 text-emerald-400 rounded-xl"><CheckCircle2 size={20} /></div>
                  Status do Tratamento
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-6 bg-white/5 rounded-3xl text-center border border-white/5">
                    <span className="text-3xl font-black text-white">{agendamentos.length}</span>
                    <p className="text-xs font-bold text-slate-500 uppercase mt-1">Sessões Realizadas</p>
                  </div>
                  <div className="p-6 bg-white/5 rounded-3xl text-center border border-white/5">
                    <span className="text-3xl font-black text-white">{evolucoes.length}</span>
                    <p className="text-xs font-bold text-slate-500 uppercase mt-1">Evoluções</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'avaliacoes' && (
            <motion.div
              key="avaliacoes"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-black text-white">Fichas de Avaliação</h3>
                <button 
                  onClick={() => navigate(`/physio/evaluation?pacienteId=${id}`)}
                  className="flex items-center gap-2 px-6 py-3 bg-sky-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-sky-600 transition-all shadow-lg shadow-sky-900/20"
                >
                  <Plus size={20} /> Nova Avaliação
                </button>
              </div>

              {avaliacoes.length === 0 ? (
                <div className="bg-slate-900/50 backdrop-blur-xl p-20 rounded-[3rem] border border-white/10 text-center shadow-2xl">
                  <Stethoscope size={48} className="text-slate-700 mx-auto mb-4" />
                  <p className="text-slate-500 font-bold">Nenhuma avaliação clínica realizada ainda.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {avaliacoes.map((ava) => (
                    <div key={ava.id} className="bg-slate-900/50 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white/10 shadow-2xl flex flex-col gap-4 hover:border-sky-500/30 transition-all group">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-sky-600/20 text-sky-400 rounded-2xl">
                            <FileText size={20} />
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Avaliação Realizada</p>
                            <p className="text-sm font-bold text-white">{formatDateBR(ava.created_at)}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => navigate(`/physio/evaluation/${ava.id}`)}
                          className="p-2 bg-white/5 text-slate-400 rounded-xl hover:bg-sky-500 hover:text-white transition-all border border-white/5"
                        >
                          <FileSignature size={18} />
                        </button>
                      </div>
                      
                      <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 line-clamp-1">Diagnóstico Fisio.</h4>
                        <p className="text-xs font-medium text-slate-300 line-clamp-2">{ava.diagnostico_fisio || 'Não preenchido'}</p>
                      </div>

                      <div className="flex gap-2">
                         <button 
                            onClick={() => navigate(`/physio/evaluation/${ava.id}`)}
                            className="flex-1 py-3 bg-white/5 text-sky-400 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all border border-white/5"
                          >
                            Ver / Editar
                          </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'evolucoes' && (
            <motion.div
              key="evolucoes"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-black text-white">Histórico de Evoluções</h3>
                <button 
                  onClick={() => setShowEvolucaoModal(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-700 transition-all shadow-lg shadow-blue-900/20"
                >
                  <Plus size={20} /> Nova Evolução
                </button>
              </div>

              {evolucoes.length === 0 ? (
                <div className="bg-slate-900/50 backdrop-blur-xl p-20 rounded-[3rem] border border-white/10 text-center shadow-2xl">
                  <Activity size={48} className="text-slate-700 mx-auto mb-4" />
                  <p className="text-slate-500 font-bold">Nenhuma evolução registrada ainda.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {evolucoes.map((ev) => (
                    <div key={ev.id} className="bg-slate-900/50 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/10 shadow-2xl hover:border-blue-500/30 transition-all">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-blue-600/20 text-blue-400 rounded-2xl flex items-center justify-center font-black">
                            {ev.dor_escala}
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Escala de Dor</p>
                            <p className="text-sm font-bold text-white">{formatDateBR(ev.created_at)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => handleOpenEditEvolucao(ev)} className="p-2 bg-white/5 text-slate-400 rounded-xl hover:text-blue-300 hover:bg-blue-500/10 border border-white/5 transition-all" title="Editar evolução"><Edit3 size={16} /></button>
                          <button type="button" onClick={() => handleDeleteEvolucao(ev.id)} className="p-2 bg-white/5 text-slate-400 rounded-xl hover:text-red-300 hover:bg-red-500/10 border border-white/5 transition-all" title="Apagar evolução"><Trash2 size={16} /></button>
                          <div className="px-4 py-2 bg-white/5 text-slate-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/5">
                            Sessão #{evolucoes.length - evolucoes.indexOf(ev)}
                          </div>
                        </div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Descrição</h4>
                            <p className="text-slate-300 font-medium leading-relaxed">{ev.descricao}</p>
                          </div>
                          <div>
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Exercícios Realizados</h4>
                            <p className="text-slate-300 font-medium leading-relaxed">{ev.exercicios_realizados}</p>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Observações</h4>
                            <p className="text-slate-300 font-medium leading-relaxed">{ev.observacoes}</p>
                          </div>
                          <div>
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Plano Terapêutico</h4>
                            <p className="text-blue-400 font-bold leading-relaxed">{ev.plano}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'diario' && (
            <motion.div
              key="diario"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <h3 className="text-2xl font-black text-white">Diário de Dor e Adesão</h3>
              
              {dailyJournals.length === 0 ? (
                <div className="bg-slate-900/50 backdrop-blur-xl p-20 rounded-[3rem] border border-white/10 text-center shadow-2xl">
                  <Activity size={48} className="text-slate-700 mx-auto mb-4" />
                  <p className="text-slate-500 font-bold">O paciente ainda não registrou nada no diário.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {dailyJournals.map((journal) => (
                    <div 
                      key={journal.id} 
                      className={cn(
                        "bg-slate-900/50 backdrop-blur-xl p-8 rounded-[2.5rem] border shadow-2xl transition-all relative overflow-hidden group",
                        journal.visualizado_por_fisio ? "border-white/5" : "border-blue-500/30 ring-2 ring-blue-500/10"
                      )}
                    >
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg transition-colors",
                            journal.nivel_dor > 7 ? "bg-rose-500 text-white" : journal.nivel_dor > 4 ? "bg-yellow-500 text-slate-950" : "bg-emerald-500 text-white"
                          )}>
                            {journal.nivel_dor}
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nível de Dor</p>
                            <p className="text-sm font-bold text-white">{formatOnlyDateBR(journal.data_registro)}</p>
                          </div>
                        </div>
                        {!journal.visualizado_por_fisio && (
                          <button 
                            onClick={async () => {
                              const { error } = await supabase
                                .from('registros_paciente')
                                .update({ 
                                  visualizado_por_fisio: true, 
                                  visualizado_em: new Date().toISOString() 
                                })
                                .eq('id', journal.id);
                              if (!error) fetchPatientData();
                            }}
                            className="bg-blue-600 text-white p-2 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-900/20"
                            title="Marcar como Visualizado"
                          >
                            <CheckCircle2 size={16} />
                          </button>
                        )}
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                           <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Adesão Prescrita</p>
                           <span className="text-sm font-black text-emerald-400">
                             {journal.concluidos_count}/{journal.total_exercicios}
                           </span>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                           <div 
                             className="h-full bg-emerald-500" 
                             style={{ width: `${(journal.concluidos_count / (journal.total_exercicios || 1)) * 100}%` }} 
                           />
                        </div>

                        {journal.notas && (
                          <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Notas do Dia</p>
                            <p className="text-xs font-medium text-slate-300 italic">"{journal.notas}"</p>
                          </div>
                        )}
                        
                        {journal.visualizado_por_fisio && (
                           <p className="text-[9px] font-black text-emerald-500/50 uppercase tracking-widest flex items-center gap-1">
                              <CheckCircle2 size={10} />
                              Visualizado em {formatDateBR(journal.visualizado_em)}
                           </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'arquivos' && (
            <motion.div
              key="arquivos"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-black text-white">Exames e Documentos</h3>
                <button 
                  onClick={() => setShowArquivoModal(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-700 transition-all shadow-lg shadow-blue-900/20"
                >
                  <Upload size={20} /> Upload Arquivo
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {arquivos.length === 0 ? (
                  <div className="col-span-full bg-slate-900/50 backdrop-blur-xl p-20 rounded-[3rem] border border-white/10 text-center shadow-2xl">
                    <Paperclip size={48} className="text-slate-700 mx-auto mb-4" />
                    <p className="text-slate-500 font-bold">Nenhum arquivo anexado.</p>
                  </div>
                ) : (
                  arquivos.map((arq) => (
                    <div key={arq.id} className="bg-slate-900/50 backdrop-blur-xl p-6 rounded-[2rem] border border-white/10 shadow-2xl hover:border-blue-500/30 transition-all group">
                      <div className="w-full aspect-square bg-white/5 rounded-2xl flex items-center justify-center text-slate-600 mb-4 group-hover:bg-blue-600/10 transition-colors border border-white/5">
                        <FileText size={40} />
                      </div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{arq.tipo}</p>
                        {arq.visible_to_patient === false ? <EyeOff size={14} className="text-amber-400" /> : <Eye size={14} className="text-emerald-400" />}
                      </div>
                      <p className="text-sm font-bold text-white truncate">{arq.nome_arquivo || 'Documento clínico'}</p>
                      <p className="text-xs font-bold text-slate-500 truncate mb-4">{formatDateBR(arq.created_at)}</p>
                      <button
                        type="button"
                        onClick={() => openPatientArquivo(arq)}
                        className="flex items-center justify-center gap-2 w-full py-3 bg-white/5 text-slate-400 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all border border-white/5"
                      >
                        <Eye size={14} /> Visualizar documento
                      </button>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <button type="button" onClick={() => handleOpenEditArquivo(arq)} className="flex items-center justify-center gap-1 w-full py-2 bg-white/5 text-slate-400 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-blue-600/20 hover:text-blue-300 transition-all border border-white/5"><Edit3 size={12} /> Editar</button>
                        <button type="button" onClick={() => handleDeleteArquivo(arq.id)} className="flex items-center justify-center gap-1 w-full py-2 bg-white/5 text-slate-400 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-red-600/20 hover:text-red-300 transition-all border border-white/5"><Trash2 size={12} /> Apagar</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'documentos' && (
            <motion.div
              key="documentos"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-black text-white">Documentos Gerados</h3>
                <button onClick={() => navigate('/documents')} className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-700 transition-all"><Plus size={20} /> Novo Documento</button>
              </div>
              {documentosGerados.length === 0 ? (
                <div className="bg-slate-900/50 backdrop-blur-xl p-20 rounded-[3rem] border border-white/10 text-center shadow-2xl">
                  <FileText size={48} className="text-slate-700 mx-auto mb-4" />
                  <p className="text-slate-500 font-bold">Nenhum documento gerado vinculado a este paciente.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {documentosGerados.map((docGerado) => (
                    <div key={docGerado.id} className="bg-slate-900/50 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white/10 shadow-2xl hover:border-blue-500/30 transition-all">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">{docGerado.type || docGerado.document_name || 'Documento'}</p>
                          <h4 className="text-lg font-black text-white truncate">{docGerado.document_name || docGerado.type || 'Documento gerado'}</h4>
                          <p className="text-xs font-bold text-slate-500 mt-1">{formatDateBR(docGerado.criado_em || docGerado.created_at)}</p>
                          <p className={cn("text-[10px] font-black uppercase tracking-widest mt-3 flex items-center gap-1", docGerado.visible_to_patient === false ? "text-amber-400" : "text-emerald-400")}>
                            {docGerado.visible_to_patient === false ? 'Privado do fisioterapeuta' : 'Visível para paciente'}
                          </p>
                          {docGerado.accepted_at && <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mt-1">Aceito em {formatDateBR(docGerado.accepted_at)}</p>}
                        </div>
                        <button type="button" onClick={() => handleToggleDocumentoVisibility(docGerado)} className="p-3 bg-white/5 text-slate-400 rounded-2xl hover:bg-white/10 hover:text-white border border-white/5" title="Alternar visibilidade">
                          {docGerado.visible_to_patient === false ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'historico' && (
            <motion.div
              key="historico"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h3 className="text-2xl font-black text-white">Timeline clínica completa</h3>
                <select value={timelineFilter} onChange={(e) => setTimelineFilter(e.target.value)} className="px-4 py-3 bg-slate-900 border border-white/10 rounded-2xl text-white font-bold outline-none">
                  {['todos', 'avaliação', 'evolução', 'prescrição', 'anexo', 'documento', 'diário'].map((tipo) => <option key={tipo} value={tipo} className="bg-slate-900">{tipo === 'todos' ? 'Todos os registros' : tipo}</option>)}
                </select>
              </div>
              <div className="space-y-3">
                {buildTimelineItems().length === 0 ? (
                  <div className="bg-slate-900/50 backdrop-blur-xl p-20 rounded-[3rem] border border-white/10 text-center shadow-2xl"><ShieldCheck size={48} className="text-slate-700 mx-auto mb-4" /><p className="text-slate-500 font-bold">Nenhum registro encontrado para este filtro.</p></div>
                ) : buildTimelineItems().map((item: any) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.id} className="bg-slate-900/50 backdrop-blur-xl p-5 rounded-3xl border border-white/10 shadow-xl flex items-start gap-4">
                      <div className="w-12 h-12 bg-blue-600/20 text-blue-400 rounded-2xl flex items-center justify-center border border-blue-600/20"><Icon size={20} /></div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1"><span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{item.tipo}</span><span className="text-[10px] font-bold text-slate-600">{item.date ? formatDateBR(item.date) : 'Sem data'}</span></div>
                        <h4 className="text-white font-black truncate">{item.title}</h4>
                        <p className="text-sm text-slate-400 font-medium line-clamp-2">{item.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {activeTab === 'prescricoes' && (
            <motion.div
              key="prescricoes"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-black text-white">Exercícios Prescritos</h3>
                <button 
                  onClick={() => setShowPrescricaoModal(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-700 transition-all shadow-lg shadow-blue-900/20"
                >
                  <Plus size={20} /> Prescrever Exercício
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {prescricoes.length === 0 ? (
                  <div className="col-span-full bg-slate-900/50 backdrop-blur-xl p-20 rounded-[3rem] border border-white/10 text-center shadow-2xl">
                    <Dna size={48} className="text-slate-700 mx-auto mb-4" />
                    <p className="text-slate-500 font-bold">Nenhum exercício prescrito para este paciente.</p>
                  </div>
                ) : (
                  prescricoes.map((pres) => (
                    <button
                      key={pres.id}
                      type="button"
                      onClick={() => handleOpenEditPrescricao(pres)}
                      className="w-full text-left bg-slate-900/50 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white/10 shadow-2xl flex items-center gap-6 hover:border-blue-500/40 hover:bg-slate-900/70 transition-all"
                    >
                      <div className="w-20 h-20 bg-blue-600/20 text-blue-400 rounded-3xl flex items-center justify-center border border-blue-600/20 shrink-0">
                        <Activity size={32} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-lg font-black text-white">{pres.exercicio?.nome || 'Exercício prescrito'}</h4>
                        <p className="text-sm text-slate-400 font-medium line-clamp-2">{pres.observacoes || 'Sem observações adicionais'}</p>
                        <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest mt-2">Toque para editar observações</p>
                        <div className="flex gap-2 mt-2 flex-wrap">
                          <span className="text-[9px] font-black bg-white/5 text-slate-500 px-2 py-1 rounded-md uppercase tracking-widest border border-white/5">
                            {pres.exercicio?.categoria || pres.exercicio?.categoria_principal || 'Sem categoria'}
                          </span>
                          <span className="text-[9px] font-black bg-white/5 text-slate-500 px-2 py-1 rounded-md uppercase tracking-widest border border-white/5">
                            {pres.exercicio?.dificuldade || pres.exercicio?.nivel || 'Sem nível'}
                          </span>
                        </div>
                      </div>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDeletePrescricao(pres.id);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            event.stopPropagation();
                            handleDeletePrescricao(pres.id);
                          }
                        }}
                        className="p-3 text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded-2xl transition-colors shrink-0"
                        aria-label="Apagar exercício prescrito"
                      >
                        <Trash2 size={20} />
                      </span>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modais */}
      <AnimatePresence>
        {showPrescricaoModal && (
          <div className="fixed inset-0 z-[50] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPrescricaoModal(false)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-md bg-slate-900 rounded-[3rem] shadow-2xl p-8 overflow-hidden flex flex-col border border-white/10">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black text-white tracking-tight">Prescrever Exercício</h2>
                <button onClick={() => setShowPrescricaoModal(false)} className="p-2 hover:bg-white/5 text-slate-400 rounded-full transition-all"><X size={24} /></button>
              </div>

              <form onSubmit={handlePrescreverExercicio} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Selecionar Exercício</label>
                  <select
                    required
                    value={prescricaoForm.exercicio_id}
                    onChange={(e) => setPrescricaoForm({...prescricaoForm, exercicio_id: e.target.value})}
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-white"
                  >
                    <option value="" className="bg-slate-900">Selecione da biblioteca...</option>
                    {bibliotecaExercicios.map(ex => (
                      <option key={ex.id} value={ex.id} className="bg-slate-900">{ex.nome}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Observações Específicas</label>
                  <textarea
                    value={prescricaoForm.observacoes}
                    onChange={(e) => setPrescricaoForm({...prescricaoForm, observacoes: e.target.value})}
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all h-32 resize-none text-white"
                    placeholder="Ex: Realizar com carga leve, manter postura ereta..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-900/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="animate-spin" /> : 'Prescrever'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
        {showEditPrescricaoModal && editingPrescricao && (
          <div className="fixed inset-0 z-[50] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setShowEditPrescricaoModal(false); setEditingPrescricao(null); setPrescricaoForm({ exercicio_id: '', observacoes: '' }); }} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-md bg-slate-900 rounded-[3rem] shadow-2xl p-8 overflow-hidden flex flex-col border border-white/10">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tight">Editar Prescrição</h2>
                  <p className="text-xs font-bold text-slate-500 mt-1">Altere o exercício ou adicione observações.</p>
                </div>
                <button onClick={() => { setShowEditPrescricaoModal(false); setEditingPrescricao(null); setPrescricaoForm({ exercicio_id: '', observacoes: '' }); }} className="p-2 hover:bg-white/5 text-slate-400 rounded-full transition-all"><X size={24} /></button>
              </div>

              <form onSubmit={handleUpdatePrescricao} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Exercício Prescrito</label>
                  <select
                    required
                    value={prescricaoForm.exercicio_id}
                    onChange={(e) => setPrescricaoForm({...prescricaoForm, exercicio_id: e.target.value})}
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-white"
                  >
                    <option value="" className="bg-slate-900">Selecione da biblioteca...</option>
                    {bibliotecaExercicios.map(ex => (
                      <option key={ex.id} value={ex.id} className="bg-slate-900">{ex.nome}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Observações / Orientações</label>
                  <textarea
                    value={prescricaoForm.observacoes}
                    onChange={(e) => setPrescricaoForm({...prescricaoForm, observacoes: e.target.value})}
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all h-36 resize-none text-white"
                    placeholder="Ex: 3 séries de 12 repetições, carga leve, evitar dor..."
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleDeletePrescricao(editingPrescricao.id)}
                    className="px-5 py-4 bg-red-500/10 text-red-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-500/20 transition-all border border-red-500/20 disabled:opacity-50"
                  >
                    Apagar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-900/20 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitting ? <Loader2 className="animate-spin" /> : 'Salvar Alterações'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
        {showEvolucaoModal && (
          <div className="fixed inset-0 z-[50] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setShowEvolucaoModal(false); }} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-2xl bg-slate-900 rounded-[3rem] shadow-2xl p-8 overflow-hidden flex flex-col max-h-[90vh] border border-white/10">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black text-white tracking-tight">Registrar Evolução Clínica</h2>
                <button onClick={() => setShowEvolucaoModal(false)} className="p-2 hover:bg-white/5 text-slate-400 rounded-full transition-all"><X size={24} /></button>
              </div>

              <form onSubmit={handleCreateEvolucao} className="space-y-6 overflow-y-auto pr-2">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Vincular ao Paciente</label>
                  <select
                    value={id || ''}
                    disabled
                    className="w-full min-h-[56px] p-4 bg-white/5 border border-white/10 rounded-2xl outline-none transition-all text-white opacity-90 cursor-not-allowed"
                  >
                    <option value={id || ''} className="bg-slate-900">
                      {patient?.nome_completo || patient?.nome || 'Paciente cadastrado'}
                    </option>
                  </select>
                  <p className="text-[11px] font-bold text-slate-500 ml-1">A evolução será salva no prontuário deste paciente cadastrado.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Vincular ao Atendimento Realizado <span className="text-slate-600 normal-case tracking-normal">(opcional)</span></label>
                  <select
                    value={evolucaoForm.atendimento_id}
                    onChange={(e) => setEvolucaoForm({...evolucaoForm, atendimento_id: e.target.value})}
                    className="w-full min-h-[56px] p-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-white appearance-none"
                  >
                    <option value="" className="bg-slate-900">Sem vínculo com atendimento</option>
                    {agendamentos.map(at => (
                      <option key={at.id} value={at.id} className="bg-slate-900">{formatOnlyDateBR(at.data)} - {at.hora.slice(0, 5)}</option>
                    ))}
                  </select>
                  {agendamentos.length === 0 && (
                    <p className="text-[11px] font-bold text-slate-500 ml-1">Nenhum atendimento realizado foi encontrado. O vínculo com o paciente acima continua ativo.</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Escala de Dor (0 a 10)</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="0"
                      max="10"
                      step="1"
                      value={evolucaoForm.dor_escala}
                      onChange={(e) => setEvolucaoForm({...evolucaoForm, dor_escala: parseInt(e.target.value)})}
                      className="flex-1 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                    <span className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center font-black text-xl shadow-lg shadow-blue-900/20">
                      {evolucaoForm.dor_escala}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Descrição da Sessão</label>
                  <textarea
                    required
                    value={evolucaoForm.descricao}
                    onChange={(e) => setEvolucaoForm({...evolucaoForm, descricao: e.target.value})}
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all h-24 resize-none text-white"
                    placeholder="Como o paciente chegou? Quais as queixas?"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Exercícios Realizados</label>
                  <textarea
                    value={evolucaoForm.exercicios_realizados}
                    onChange={(e) => setEvolucaoForm({...evolucaoForm, exercicios_realizados: e.target.value})}
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all h-24 resize-none text-white"
                    placeholder="Liste os exercícios e condutas aplicadas..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Plano Terapêutico / Próximos Passos</label>
                  <input
                    type="text"
                    value={evolucaoForm.plano}
                    onChange={(e) => setEvolucaoForm({...evolucaoForm, plano: e.target.value})}
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-white"
                    placeholder="O que será feito na próxima sessão?"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-900/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="animate-spin" /> : 'Salvar Evolução'}
                </button>
              </form>
            </motion.div>
          </div>
        )}


        {showEditEvolucaoModal && editingEvolucao && (
          <div className="fixed inset-0 z-[50] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setShowEditEvolucaoModal(false); setEditingEvolucao(null); }} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-2xl bg-slate-900 rounded-[3rem] shadow-2xl p-8 overflow-hidden flex flex-col max-h-[90vh] border border-white/10">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black text-white tracking-tight">Editar Evolução Clínica</h2>
                <button onClick={() => { setShowEditEvolucaoModal(false); setEditingEvolucao(null); }} className="p-2 hover:bg-white/5 text-slate-400 rounded-full transition-all"><X size={24} /></button>
              </div>
              <form onSubmit={handleUpdateEvolucao} className="space-y-6 overflow-y-auto pr-2">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Escala de Dor (0 a 10)</label>
                  <div className="flex items-center gap-4"><input type="range" min="0" max="10" step="1" value={evolucaoForm.dor_escala} onChange={(e) => setEvolucaoForm({...evolucaoForm, dor_escala: parseInt(e.target.value)})} className="flex-1 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500" /><span className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center font-black text-xl">{evolucaoForm.dor_escala}</span></div>
                </div>
                <textarea required value={evolucaoForm.descricao} onChange={(e) => setEvolucaoForm({...evolucaoForm, descricao: e.target.value})} className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none h-28 resize-none text-white" placeholder="Descrição da sessão" />
                <textarea value={evolucaoForm.exercicios_realizados} onChange={(e) => setEvolucaoForm({...evolucaoForm, exercicios_realizados: e.target.value})} className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none text-white" placeholder="Exercícios/condutas realizadas" />
                <textarea value={evolucaoForm.observacoes} onChange={(e) => setEvolucaoForm({...evolucaoForm, observacoes: e.target.value})} className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none text-white" placeholder="Observações" />
                <input type="text" value={evolucaoForm.plano} onChange={(e) => setEvolucaoForm({...evolucaoForm, plano: e.target.value})} className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-white" placeholder="Plano terapêutico/próximos passos" />
                <div className="flex gap-3"><button type="button" disabled={submitting} onClick={() => handleDeleteEvolucao(editingEvolucao.id)} className="px-5 py-4 bg-red-500/10 text-red-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-500/20 border border-red-500/20 disabled:opacity-50">Apagar</button><button type="submit" disabled={submitting} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">{submitting ? <Loader2 className="animate-spin" /> : 'Salvar Alterações'}</button></div>
              </form>
            </motion.div>
          </div>
        )}

        {showArquivoModal && (
          <div className="fixed inset-0 z-[50] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowArquivoModal(false)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-md bg-slate-900 rounded-[3rem] shadow-2xl p-8 overflow-hidden flex flex-col border border-white/10">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black text-white tracking-tight">Upload de Documento</h2>
                <button onClick={() => setShowArquivoModal(false)} className="p-2 hover:bg-white/5 text-slate-400 rounded-full transition-all"><X size={24} /></button>
              </div>

              <form onSubmit={handleUploadArquivo} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Tipo de Arquivo</label>
                  <select
                    value={arquivoForm.tipo}
                    onChange={(e) => setArquivoForm({...arquivoForm, tipo: e.target.value})}
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-white"
                  >
                    <option value="Exame" className="bg-slate-900">Exame (PDF/Imagem)</option>
                    <option value="Ressonância" className="bg-slate-900">Ressonância</option>
                    <option value="Raio-X" className="bg-slate-900">Raio-X</option>
                    <option value="Foto" className="bg-slate-900">Foto do Paciente</option>
                    <option value="Documento" className="bg-slate-900">Documento Geral</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nome do documento <span className="text-slate-600 normal-case tracking-normal">(opcional)</span></label>
                  <input
                    type="text"
                    value={arquivoForm.nome_arquivo}
                    onChange={(e) => setArquivoForm({...arquivoForm, nome_arquivo: e.target.value})}
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-white"
                    placeholder="Ex: Exame de joelho, laudo de imagem..."
                  />
                </div>

                <label className="flex items-center justify-between gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl cursor-pointer">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Visível para o paciente</span>
                  <input
                    type="checkbox"
                    checked={arquivoForm.visible_to_patient}
                    onChange={(e) => setArquivoForm({...arquivoForm, visible_to_patient: e.target.checked})}
                    className="h-5 w-5 accent-blue-600"
                  />
                </label>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Selecionar Arquivo</label>
                  <input
                    id="arquivo-paciente-upload"
                    type="file"
                    required
                    accept=".pdf,image/*"
                    onChange={(e) => setArquivoForm({...arquivoForm, file: e.target.files?.[0] || null})}
                    className="sr-only"
                  />
                  <label
                    htmlFor="arquivo-paciente-upload"
                    className="flex min-h-[118px] cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-white/10 bg-white/5 px-4 py-6 text-center transition-all hover:border-blue-500 hover:bg-white/10"
                  >
                    <Upload size={32} className="mb-3 text-slate-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Clique para escolher arquivo</span>
                    <span className="mt-2 max-w-full truncate text-sm font-bold text-white">
                      {arquivoForm.file ? arquivoForm.file.name : 'Nenhum arquivo selecionado'}
                    </span>
                  </label>
                  {arquivoForm.file && (
                    <p className="text-[10px] font-bold text-blue-400 mt-2 text-center break-all">Arquivo selecionado: {arquivoForm.file.name}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submitting || !arquivoForm.file}
                  className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-900/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="animate-spin" /> : 'Iniciar Upload'}
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {showEditArquivoModal && editingArquivo && (
          <div className="fixed inset-0 z-[50] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setShowEditArquivoModal(false); setEditingArquivo(null); }} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-md bg-slate-900 rounded-[3rem] shadow-2xl p-8 overflow-hidden flex flex-col border border-white/10">
              <div className="flex items-center justify-between mb-8"><h2 className="text-2xl font-black text-white tracking-tight">Editar Arquivo</h2><button onClick={() => { setShowEditArquivoModal(false); setEditingArquivo(null); }} className="p-2 hover:bg-white/5 text-slate-400 rounded-full transition-all"><X size={24} /></button></div>
              <form onSubmit={handleUpdateArquivo} className="space-y-6">
                <input type="text" value={arquivoForm.nome_arquivo} onChange={(e) => setArquivoForm({...arquivoForm, nome_arquivo: e.target.value})} className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-white" placeholder="Nome do documento" />
                <select value={arquivoForm.tipo} onChange={(e) => setArquivoForm({...arquivoForm, tipo: e.target.value})} className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-white"><option value="Exame" className="bg-slate-900">Exame</option><option value="Ressonância" className="bg-slate-900">Ressonância</option><option value="Raio-X" className="bg-slate-900">Raio-X</option><option value="Foto" className="bg-slate-900">Foto</option><option value="Documento" className="bg-slate-900">Documento</option><option value="Prontuário completo" className="bg-slate-900">Prontuário completo</option></select>
                <label className="flex items-center justify-between gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl cursor-pointer"><span className="text-xs font-black text-slate-400 uppercase tracking-widest">Visível para o paciente</span><input type="checkbox" checked={arquivoForm.visible_to_patient} onChange={(e) => setArquivoForm({...arquivoForm, visible_to_patient: e.target.checked})} className="h-5 w-5 accent-blue-600" /></label>
                <div className="flex gap-3"><button type="button" disabled={submitting} onClick={() => handleDeleteArquivo(editingArquivo.id)} className="px-5 py-4 bg-red-500/10 text-red-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-500/20 border border-red-500/20 disabled:opacity-50">Apagar</button><button type="submit" disabled={submitting} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">{submitting ? <Loader2 className="animate-spin" /> : 'Salvar'}</button></div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
