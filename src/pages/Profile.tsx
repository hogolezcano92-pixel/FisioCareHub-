import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { 
  User, 
  Mail, 
  Camera, 
  FileText, 
  CheckCircle, 
  Loader2, 
  Upload,
  ShieldCheck,
  Settings,
  Trash2,
  Lock,
  Bell,
  Globe,
  AlertTriangle,
  Zap,
  ExternalLink,
  LogOut,
  CreditCard,
  Building2,
  DollarSign,
  Wallet,
  TrendingUp,
  Receipt,
  CalendarDays,
  ArrowDownToLine,
  Shield,
  Eye,
  Crown,
  Download,
  Palette,
} from 'lucide-react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { cn, resolveStorageUrl, formatCPF, validateCPF } from '../lib/utils';
import { getEffectivePlan, hasPlanAccess } from '../lib/planAccess';
import { THEMES } from '../lib/themes';
import { uploadDocument, uploadPhysioDocument, getPrivateDocumentUrl } from '../services/supabaseStorage';
import { logActivity } from '../services/activityService';
import { getSupabase, invokeFunction, supabase } from '../lib/supabase';
import AvatarUpload from '../components/AvatarUpload';
import PaymentMethods from '../components/PaymentMethods';
import PhysioPaymentData from '../components/PhysioPaymentData';
import PhysioWithdrawal from '../components/PhysioWithdrawal';
import FloatingHelpMenu from '../components/FloatingHelpMenu';
import { isBiometricsSupported, registerBiometrics } from '../lib/webauthn';
import { generateEmailHTML } from '../services/emailTemplate';

type Tab = 
  | 'profile' | 'security' | 'notifications' | 'payments' | 'privacy' | 'theme' // Patient tabs
  | 'profile_prof' | 'clinic' | 'subscription' | 'earnings'; // Physio tabs

export default function Profile() {
  const { user, profile, subscription, theme: currentThemeId, language: currentLang, loading: authLoading, refreshProfile, signOut, updateTheme, updateLanguage } = useAuth();
  const { t, i18n } = useTranslation();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const isPhysio = profile?.tipo_usuario === 'fisioterapeuta';
  const isRejectedPhysio = isPhysio && (
    profile?.status_aprovacao === 'reprovado' ||
    profile?.status_aprovacao === 'rejeitado'
  );
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>((searchParams.get('tab') as Tab) || (isPhysio ? 'profile_prof' : 'profile'));
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [biometricsSupported, setBiometricsSupported] = useState(false);
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [loadingBiometrics, setLoadingBiometrics] = useState(false);
  const navigate = useNavigate();

  type ProfessionalDocumentField =
    | 'rg_frente_url'
    | 'rg_verso_url'
    | 'crefito_frente_url'
    | 'crefito_verso_url';

  type ProfessionalDocumentUploadType =
    | 'rg_frente'
    | 'rg_verso'
    | 'crefito_frente'
    | 'crefito_verso';

  const professionalDocuments: Array<{
    label: string;
    description: string;
    field: ProfessionalDocumentField;
    uploadType: ProfessionalDocumentUploadType;
  }> = [
    {
      label: 'RG Frente',
      description: 'Documento de identidade — frente',
      field: 'rg_frente_url',
      uploadType: 'rg_frente',
    },
    {
      label: 'RG Verso',
      description: 'Documento de identidade — verso',
      field: 'rg_verso_url',
      uploadType: 'rg_verso',
    },
    {
      label: 'CREFITO Frente',
      description: 'Carteira profissional — frente',
      field: 'crefito_frente_url',
      uploadType: 'crefito_frente',
    },
    {
      label: 'CREFITO Verso',
      description: 'Carteira profissional — verso',
      field: 'crefito_verso_url',
      uploadType: 'crefito_verso',
    },
  ];

  const languages = [
    { code: 'pt', name: t('settings.portuguese'), flag: '🇧🇷' },
    { code: 'en', name: t('settings.english'), flag: '🇺🇸' },
    { code: 'es', name: t('settings.spanish'), flag: '🇪🇸' },
  ];

  const changeLanguage = async (lng: string) => {
    if (updateLanguage) {
      await updateLanguage(lng);
      import('sonner').then(({ toast }) => toast.success(t('common.language_changed')));
    }
  };

  // Form fields
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    telefone: '',
    gender: '' as 'male' | 'female' | 'other' | '',
    specialty: '',
    city: '',
    state: '',
    address: '',
    zipCode: '',
    country: '',
    cpf: '',
    crefito: '',
    preco_sessao: 0,
    stripe_account_id: '',
    serviceType: 'ambos' as 'domicilio' | 'online' | 'ambos',
    data_nascimento: '',
    experiencia_profissional: '',
    observacoes_saude: '',
    formacao_academica: [] as string[],
    servicos_ofertados: [] as string[],
  });

  const [newEducation, setNewEducation] = useState('');
  const [newService, setNewService] = useState('');

  const commonServices = [
    "Pilates", "RPG", "Drenagem Linfática", "Acupuntura", "Ventosaterapia", 
    "Liberação Miofascial", "Osteopatia", "Quiropraxia", "Fisioterapia Esportiva",
    "Pédiatrica", "Geriátrica", "Neurológica", "Respiratória", "Cardiologia",
    "Dermatofuncional", "Hidroterapia", "Dry Needling", "Bandagens"
  ];

  const addEducation = () => {
    if (newEducation.trim()) {
      setFormData(prev => ({
        ...prev,
        formacao_academica: [...prev.formacao_academica, newEducation.trim()]
      }));
      setNewEducation('');
    }
  };

  const removeEducation = (index: number) => {
    setFormData(prev => ({
      ...prev,
      formacao_academica: prev.formacao_academica.filter((_, i) => i !== index)
    }));
  };

  const toggleService = (service: string) => {
    setFormData(prev => {
      const exists = prev.servicos_ofertados.includes(service);
      if (exists) {
        return {
          ...prev,
          servicos_ofertados: prev.servicos_ofertados.filter(s => s !== service)
        };
      } else {
        return {
          ...prev,
          servicos_ofertados: [...prev.servicos_ofertados, service]
        };
      }
    });
  };

  const addCustomService = () => {
    if (newService.trim() && !formData.servicos_ofertados.includes(newService.trim())) {
      setFormData(prev => ({
        ...prev,
        servicos_ofertados: [...prev.servicos_ofertados, newService.trim()]
      }));
      setNewService('');
    }
  };

  const removeService = (index: number) => {
    setFormData(prev => ({
      ...prev,
      servicos_ofertados: prev.servicos_ofertados.filter((_, i) => i !== index)
    }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === 'cpf') {
      setFormData(prev => ({ ...prev, [name]: formatCPF(value) }));
      return;
    }

    if (name === 'state') {
      setFormData(prev => ({ ...prev, [name]: value.toUpperCase().slice(0, 2) }));
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const isPro = hasPlanAccess(getEffectivePlan(profile, subscription), 'pro');

  useEffect(() => {
    const tab = searchParams.get('tab') as Tab;
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [searchParams, activeTab]);

  useEffect(() => {
    if (!authLoading) {
      if (profile) {
        setUserData(profile);
        setFormData({
          name: profile.nome_completo || '',
          bio: profile.bio || '',
          telefone: profile.telefone || '',
          gender: profile.genero || '',
          specialty: profile.especialidade || '',
          city: profile.cidade || profile.localizacao || '',
          state: profile.estado || '',
          address: profile.endereco || '',
          zipCode: profile.cep || '',
          country: profile.pais || '',
          cpf: profile.cpf_cnpj ? formatCPF(profile.cpf_cnpj) : '',
          crefito: profile.crefito || '',
          preco_sessao: profile.preco_sessao || 0,
          stripe_account_id: profile.stripe_account_id || '',
          serviceType: profile.tipo_servico || 'ambos',
          data_nascimento: profile.data_nascimento || '',
          experiencia_profissional: profile.experiencia_profissional || '',
          observacoes_saude: profile.observacoes_saude || '',
          formacao_academica: profile.formacao_academica || [],
          servicos_ofertados: profile.servicos_ofertados || [],
        });
        setLoading(false);
      } else if (!user) {
        navigate('/login');
      } else {
        // User is logged in but profile is null (maybe error fetching)
        setLoading(false);
      }
    }
  }, [profile, user, authLoading, navigate]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);

  const formatDateBR = (date?: string | null) => {
    if (!date) return '—';
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return '—';

    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(parsed);
  };

  const getMonthKey = (date?: string | null) => {
    if (!date) return new Date().toISOString().slice(0, 7);
    if (/^\d{4}-\d{2}/.test(date)) return date.slice(0, 7);

    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return new Date().toISOString().slice(0, 7);
    return parsed.toISOString().slice(0, 7);
  };

  const getMonthLabel = (monthKey: string) => {
    const [year, month] = monthKey.split('-').map(Number);
    const date = new Date(year, (month || 1) - 1, 1);

    return new Intl.DateTimeFormat('pt-BR', {
      month: 'long',
      year: 'numeric',
    }).format(date);
  };

  const [earningsStats, setEarningsStats] = useState({
    balance: 0,
    pending: 0,
    grossTotal: 0,
    commissionTotal: 0,
    netTotal: 0,
    paidWithdrawals: 0,
    commissionRate: 12,
  });
  const [earningsList, setEarningsList] = useState<any[]>([]);
  const [withdrawalList, setWithdrawalList] = useState<any[]>([]);
  const [loadingEarnings, setLoadingEarnings] = useState(false);
  const [financeSubTab, setFinanceSubTab] = useState<'summary' | 'payments' | 'withdrawals' | 'reports'>('summary');
  const [selectedFinanceMonth, setSelectedFinanceMonth] = useState(new Date().toISOString().slice(0, 7));
  const [downloadingFinanceReport, setDownloadingFinanceReport] = useState(false);

  useEffect(() => {
    if (activeTab === 'earnings' && user) {
      fetchEarnings();
    }
  }, [activeTab, user]);

  const monthlyPayments = useMemo(() => (
    earningsList.filter((item) => item.monthKey === selectedFinanceMonth)
  ), [earningsList, selectedFinanceMonth]);

  const monthlyWithdrawals = useMemo(() => (
    withdrawalList.filter((item) => item.monthKey === selectedFinanceMonth)
  ), [withdrawalList, selectedFinanceMonth]);

  const availableFinanceMonths = useMemo(() => {
    const months = new Set<string>([selectedFinanceMonth, new Date().toISOString().slice(0, 7)]);
    earningsList.forEach((item) => item.monthKey && months.add(item.monthKey));
    withdrawalList.forEach((item) => item.monthKey && months.add(item.monthKey));

    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [earningsList, withdrawalList, selectedFinanceMonth]);

  const monthlySummary = useMemo(() => {
    const gross = monthlyPayments.reduce((acc, item) => acc + item.gross, 0);
    const commission = monthlyPayments.reduce((acc, item) => acc + item.commission, 0);
    const net = monthlyPayments.reduce((acc, item) => acc + item.net, 0);
    const withdrawals = monthlyWithdrawals.reduce((acc, item) => acc + item.amount, 0);

    return {
      gross,
      commission,
      net,
      withdrawals,
      availableInMonth: Math.max(0, net - withdrawals),
      paidAppointments: monthlyPayments.length,
    };
  }, [monthlyPayments, monthlyWithdrawals]);

  const fetchEarnings = async () => {
    if (!user) return;
    setLoadingEarnings(true);
    try {
      // Taxa da plataforma: FisioCareHub retém 12% e o fisioterapeuta recebe 88%.
      // Mantém fallback em 12 caso a tabela system_settings não exista ou não tenha esse registro.
      let commissionRate = 12;
      try {
        const { data: settings } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'commission_rate')
          .maybeSingle();

        const parsedRate = Number(settings?.value);
        if (!Number.isNaN(parsedRate) && parsedRate >= 0 && parsedRate <= 100) {
          commissionRate = parsedRate;
        }
      } catch (settingsError) {
        console.warn('Não foi possível carregar commission_rate. Usando 12%.', settingsError);
      }

      const netFactor = (100 - commissionRate) / 100;
      const getGrossAmount = (appointment: any) => Number(appointment?.valor_cobrado ?? appointment?.valor ?? 0) || 0;

      // Atendimentos concluídos entram como saldo líquido do fisioterapeuta.
      const { data: completed } = await supabase
        .from('agendamentos')
        .select('*')
        .eq('fisio_id', user.id)
        .eq('status', 'concluido')
        .order('data', { ascending: false });

      // Saques já pagos saem do saldo disponível.
      const { data: withdrawals } = await supabase
        .from('solicitacoes_saque')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      const totalPaidWithdrawals = withdrawals
        ?.filter((curr) => curr.status === 'pago')
        .reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0) || 0;

      // A receber também precisa ser líquido, não bruto.
      const { data: pending } = await supabase
        .from('agendamentos')
        .select('valor, valor_cobrado')
        .eq('fisio_id', user.id)
        .in('status', ['pendente', 'confirmado']);

      const patientIds = Array.from(new Set((completed || []).map((a: any) => a.paciente_id))).filter(Boolean);
      const { data: patients } = patientIds.length > 0
        ? await supabase
            .from('perfis')
            .select('id, nome_completo, avatar_url')
            .in('id', patientIds)
        : { data: [] as any[] };

      const list = (completed || []).map((a: any) => {
        const gross = getGrossAmount(a);
        const commission = gross * (commissionRate / 100);
        const net = gross * netFactor;
        const patient = patients?.find((p: any) => p.id === a.paciente_id);
        const dateISO = a.data || a.created_at || a.updated_at;

        return {
          id: a.id,
          patient: patient?.nome_completo || 'Paciente',
          avatar: patient?.avatar_url,
          service: a.tipo_servico || a.servico || a.tipo_atendimento || 'Consulta fisioterapêutica',
          method: a.metodo_pagamento || a.payment_method || a.forma_pagamento || 'Plataforma',
          status: a.status_pagamento || a.pagamento_status || 'pago',
          dateISO,
          date: formatDateBR(dateISO),
          monthKey: getMonthKey(dateISO),
          gross,
          commission,
          net,
          val: net,
        };
      });

      const grossTotal = list.reduce((acc, curr) => acc + curr.gross, 0);
      const commissionTotal = list.reduce((acc, curr) => acc + curr.commission, 0);
      const netCompleted = list.reduce((acc, curr) => acc + curr.net, 0);
      const netPending = pending?.reduce((acc, curr) => acc + (getGrossAmount(curr) * netFactor), 0) || 0;
      const availableBalance = netCompleted - totalPaidWithdrawals;

      setEarningsStats({
        balance: Math.max(0, availableBalance),
        pending: Math.max(0, netPending),
        grossTotal,
        commissionTotal,
        netTotal: netCompleted,
        paidWithdrawals: totalPaidWithdrawals,
        commissionRate,
      });

      setEarningsList(list);
      setWithdrawalList((withdrawals || []).map((item: any) => {
        const displayDate = item.status === 'pago' ? (item.pago_em || item.processado_em || item.updated_at || item.created_at) : item.created_at;

        return {
          id: item.id,
          amount: Number(item.valor) || 0,
          status: item.status || 'pendente',
          dateISO: displayDate,
          date: formatDateBR(displayDate),
          monthKey: getMonthKey(displayDate),
        };
      }));
    } catch (err) {
      console.error("Erro ao buscar ganhos:", err);
    } finally {
      setLoadingEarnings(false);
    }
  };

  const handleDownloadFinanceReport = async () => {
    if (downloadingFinanceReport) return;
    setDownloadingFinanceReport(true);

    try {
      const { jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const doc = new jsPDF();
      const monthLabel = getMonthLabel(selectedFinanceMonth);
      const professionalName = profile?.nome_completo || formData.name || 'Fisioterapeuta';

      doc.setFillColor(37, 99, 235);
      doc.rect(0, 0, 210, 32, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(17);
      doc.text('Relatório Financeiro Mensal', 14, 15);
      doc.setFontSize(10);
      doc.text(`FisioCareHub • ${monthLabel}`, 14, 23);

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(11);
      doc.text(`Profissional: ${professionalName}`, 14, 44);
      doc.text(`E-mail: ${user?.email || '—'}`, 14, 51);
      doc.text(`CREFITO: ${profile?.crefito || formData.crefito || '—'}`, 14, 58);
      doc.text(`Período: ${monthLabel}`, 14, 65);

      autoTable(doc, {
        startY: 74,
        head: [['Resumo do mês', 'Valor']],
        body: [
          ['Receita bruta', formatCurrency(monthlySummary.gross)],
          [`Comissão da plataforma (${earningsStats.commissionRate}%)`, formatCurrency(monthlySummary.commission)],
          ['Receita líquida estimada', formatCurrency(monthlySummary.net)],
          ['Consultas pagas/concluídas', String(monthlySummary.paidAppointments)],
          ['Saques no período', formatCurrency(monthlySummary.withdrawals)],
          ['Saldo estimado do período', formatCurrency(monthlySummary.availableInMonth)],
        ],
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [37, 99, 235] },
      });

      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [['Data', 'Paciente', 'Serviço', 'Bruto', 'Comissão', 'Líquido', 'Status']],
        body: monthlyPayments.length > 0
          ? monthlyPayments.map((item) => [
              item.date,
              item.patient,
              item.service,
              formatCurrency(item.gross),
              formatCurrency(item.commission),
              formatCurrency(item.net),
              item.status,
            ])
          : [['—', 'Nenhum pagamento no período', '—', '—', '—', '—', '—']],
        styles: { fontSize: 8, cellPadding: 2.5 },
        headStyles: { fillColor: [15, 23, 42] },
      });

      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [['Data', 'Valor', 'Status']],
        body: monthlyWithdrawals.length > 0
          ? monthlyWithdrawals.map((item) => [item.date, formatCurrency(item.amount), item.status])
          : [['—', 'Nenhum saque no período', '—']],
        styles: { fontSize: 8, cellPadding: 2.5 },
        headStyles: { fillColor: [2, 132, 199] },
      });

      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('Relatório gerado automaticamente pela FisioCareHub. Valores sujeitos à conciliação administrativa.', 14, pageHeight - 12);

      doc.save(`relatorio-financeiro-fisiocarehub-${selectedFinanceMonth}.pdf`);
    } catch (err) {
      console.error('Erro ao gerar relatório financeiro:', err);
      const { toast } = await import('sonner');
      toast.error('Não foi possível gerar o relatório financeiro em PDF.');
    } finally {
      setDownloadingFinanceReport(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || updating) return;

    setUpdating(true);

    try {
      const cleanZip = formData.zipCode.replace(/\D/g, '');
      const cleanCpf = formData.cpf.replace(/\D/g, '');
      const cleanCity = formData.city.trim();
      const cleanState = formData.state.trim().toUpperCase();
      const cleanAddress = formData.address.trim();
      const normalizedCountry = formData.country.trim();
      const cleanCountry =
        normalizedCountry === '' || normalizedCountry.toLowerCase() === 'brasi'
          ? 'Brasil'
          : normalizedCountry;

      if (formData.zipCode && cleanZip.length > 0 && cleanZip.length !== 8) {
        const { toast } = await import('sonner');
        toast.error("Por favor, insira um CEP válido com 8 dígitos.");
        setUpdating(false);
        return;
      }

      if (formData.cpf && !validateCPF(formData.cpf)) {
        const { toast } = await import('sonner');
        toast.error("CPF inválido. Por favor, verifique os dígitos.");
        setUpdating(false);
        return;
      }

      if (cleanState && cleanState.length !== 2) {
        const { toast } = await import('sonner');
        toast.error("Informe a sigla do estado com 2 letras. Exemplo: SP.");
        setUpdating(false);
        return;
      }

      const updateData: Record<string, any> = {
        nome_completo: formData.name.trim(),
        bio: formData.bio.trim(),
        telefone: formData.telefone.trim() || null,

        cidade: cleanCity || null,
        estado: cleanState || null,
        endereco: cleanAddress || null,
        cep: cleanZip || null,
        pais: cleanCountry || 'Brasil',
        localizacao: cleanCity && cleanState ? `${cleanCity}, ${cleanState}` : null,

        cpf: cleanCpf || null,
        cpf_cnpj: cleanCpf || null,

        genero: formData.gender || null,
        data_nascimento: formData.data_nascimento || null,

        updated_at: new Date().toISOString(),
      };

      if (isPhysio) {
        updateData.crefito = formData.crefito.trim() || null;
        updateData.preco_sessao = formData.preco_sessao ? Number(formData.preco_sessao) : null;
        updateData.stripe_account_id = formData.stripe_account_id || null;
        updateData.especialidade = formData.specialty.trim() || null;
        updateData.tipo_servico = formData.serviceType || null;
        updateData.experiencia_profissional = formData.experiencia_profissional.trim() || null;
        updateData.formacao_academica = formData.formacao_academica || [];
        updateData.servicos_ofertados = formData.servicos_ofertados || [];

        // Se o fisioterapeuta foi reprovado, ao salvar correções ele volta para análise.
        if (isRejectedPhysio) {
          updateData.status_aprovacao = 'pendente';
          updateData.motivo_reprovacao = null;
        }
      } else {
        updateData.observacoes_saude = formData.observacoes_saude.trim() || null;
      }

      // Não enviar role nem tipo_usuario em edição normal de perfil.
      // Isso evita converter admin em paciente ou fisioterapeuta em user.
      console.log("Atualizando perfil no Supabase:", updateData);

      const { data: updatedProfile, error } = await supabase
        .from('perfis')
        .update(updateData)
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        console.error('[PROFILE_UPDATE_ERROR]', {
          userId: user.id,
          payload: updateData,
          error,
        });

        throw error;
      }

      if (!updatedProfile) {
        throw new Error('O perfil não foi atualizado corretamente.');
      }

      if (formData.name !== user.user_metadata?.full_name) {
        const { error: authError } = await supabase.auth.updateUser({
          data: { full_name: formData.name }
        });

        if (authError) {
          console.warn("Erro ao atualizar metadados de autenticação:", authError);
        }
      }

      setUserData((prev: any) => ({
        ...prev,
        ...updatedProfile
      }));

      if (refreshProfile) await refreshProfile();

      await logActivity(
        user.id,
        isPhysio ? 'fisio' : 'paciente',
        'perfil_atualizado',
        isRejectedPhysio
          ? 'Seus dados foram corrigidos e enviados para nova análise administrativa.'
          : 'Seus dados de perfil foram atualizados com sucesso.'
      );

      const { toast } = await import('sonner');
      toast.success(
        isRejectedPhysio
          ? 'Dados atualizados. Seu cadastro voltou para análise administrativa.'
          : t('profile.update_success')
      );
    } catch (err: any) {
      console.error("Erro ao atualizar perfil:", err);
      const { toast } = await import('sonner');
      toast.error(err.message || "Erro ao atualizar perfil. Tente novamente.");
    } finally {
      setUpdating(false);
    }
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUpdating(true);

    try {
      console.log("Iniciando upload de documento para Supabase...");

      const path = await uploadDocument(user.id, file);

      let currentDocs: string[] = [];

      if (Array.isArray(userData?.documentos)) {
        currentDocs = userData.documentos;
      } else if (typeof userData?.documentos === 'string' && userData.documentos.trim()) {
        try {
          const parsed = JSON.parse(userData.documentos);
          currentDocs = Array.isArray(parsed) ? parsed : [];
        } catch {
          currentDocs = [];
        }
      }

      const newDocs = [...currentDocs, path];

      const { data: updatedProfile, error } = await supabase
        .from('perfis')
        .update({
          documentos: JSON.stringify(newDocs),
          ...(isRejectedPhysio ? {
            status_aprovacao: 'pendente',
            motivo_reprovacao: null,
          } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        console.error('[PROFILE_DOCUMENT_UPLOAD_ERROR]', {
          userId: user.id,
          path,
          error,
        });

        throw error;
      }

      if (!updatedProfile) {
        throw new Error('O documento foi enviado, mas o perfil não foi atualizado corretamente.');
      }

      setUserData((prev: any) => ({
        ...prev,
        ...updatedProfile,
      }));

      if (refreshProfile) await refreshProfile();

      const { toast } = await import('sonner');
      toast.success(
        isRejectedPhysio
          ? 'Documento enviado. Seu cadastro voltou para análise administrativa.'
          : 'Documento enviado com sucesso!'
      );
    } catch (err: any) {
      console.error("Erro no upload de documento para Supabase:", err);
      const { toast } = await import('sonner');
      toast.error("Erro ao enviar documento: " + (err.message || "Erro desconhecido"));
    } finally {
      setUpdating(false);
    }
  };

  const handleViewProfessionalDocument = async (path?: string | null) => {
    if (!path) {
      const { toast } = await import('sonner');
      toast.error('Documento ainda não enviado.');
      return;
    }

    try {
      const signedUrl = await getPrivateDocumentUrl(path, 60 * 10);
      window.open(signedUrl, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      console.error('[VIEW_PROFESSIONAL_DOCUMENT_ERROR]', err);
      const { toast } = await import('sonner');
      toast.error(err.message || 'Não foi possível abrir o documento.');
    }
  };

  const handleReplaceProfessionalDocument = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: ProfessionalDocumentField,
    uploadType: ProfessionalDocumentUploadType
  ) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUpdating(true);

    try {
      const path = await uploadPhysioDocument(user.id, file, uploadType);

      const { data: updatedProfile, error } = await supabase
        .from('perfis')
        .update({
          [field]: path,
          ...(isRejectedPhysio ? {
            status_aprovacao: 'pendente',
            motivo_reprovacao: null,
          } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        console.error('[REPLACE_PROFESSIONAL_DOCUMENT_ERROR]', {
          userId: user.id,
          field,
          uploadType,
          path,
          error,
        });

        throw error;
      }

      if (!updatedProfile) {
        throw new Error('O documento foi enviado, mas o perfil não foi atualizado corretamente.');
      }

      setUserData((prev: any) => ({
        ...prev,
        ...updatedProfile,
      }));

      if (refreshProfile) await refreshProfile();

      const { toast } = await import('sonner');
      toast.success(
        isRejectedPhysio
          ? 'Documento atualizado. Seu cadastro voltou para análise administrativa.'
          : 'Documento atualizado com sucesso!'
      );
    } catch (err: any) {
      console.error('[REPLACE_PROFESSIONAL_DOCUMENT_FATAL]', err);
      const { toast } = await import('sonner');
      toast.error(err.message || 'Erro ao atualizar documento.');
    } finally {
      setUpdating(false);
      e.target.value = '';
    }
  };


  const loadBiometricStatus = async () => {
    if (!user) return;

    try {
      const supported = await isBiometricsSupported();
      setBiometricsSupported(supported);

      const { count, error } = await supabase
        .from('webauthn_credentials')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (error) throw error;
      setBiometricsEnabled((count || 0) > 0);
    } catch (err) {
      console.error('[BIOMETRICS_STATUS_ERROR]', err);
      setBiometricsEnabled(false);
    }
  };

  useEffect(() => {
    if (user && activeTab === 'security') {
      loadBiometricStatus();
    }
  }, [user, activeTab]);

  const handleEnableBiometrics = async () => {
    if (!user || loadingBiometrics) return;

    setLoadingBiometrics(true);
    try {
      const supported = await isBiometricsSupported();
      setBiometricsSupported(supported);

      if (!supported) {
        const { toast } = await import('sonner');
        toast.error('Este dispositivo ou navegador não suporta biometria/Face ID.');
        return;
      }

      await registerBiometrics();
      await loadBiometricStatus();

      const { toast } = await import('sonner');
      toast.success('Biometria ativada com sucesso neste dispositivo!');
    } catch (err: any) {
      console.error('[ENABLE_BIOMETRICS_ERROR]', err);
      const { toast } = await import('sonner');
      toast.error(err.message || 'Não foi possível ativar a biometria.');
    } finally {
      setLoadingBiometrics(false);
    }
  };

  const handleDisableBiometrics = async () => {
    if (!user || loadingBiometrics) return;

    const confirmed = window.confirm(
      'Deseja remover a biometria cadastrada para esta conta? Você ainda poderá entrar com e-mail e senha.'
    );

    if (!confirmed) return;

    setLoadingBiometrics(true);
    try {
      const { error } = await supabase
        .from('webauthn_credentials')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setBiometricsEnabled(false);
      const { toast } = await import('sonner');
      toast.success('Biometria removida com sucesso.');
    } catch (err: any) {
      console.error('[DISABLE_BIOMETRICS_ERROR]', err);
      const { toast } = await import('sonner');
      toast.error(err.message || 'Não foi possível remover a biometria.');
    } finally {
      setLoadingBiometrics(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      import('sonner').then(({ toast }) => toast.success("E-mail de redefinição de senha enviado!"));
    } catch (err: any) {
      import('sonner').then(({ toast }) => toast.error("Erro ao enviar e-mail: " + err.message));
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    const { toast } = await import('sonner');
    let loadingToast: string | number | undefined;
    setUpdating(true);

    try {
      console.log('Iniciando exclusão definitiva da própria conta:', user.id);
      loadingToast = toast.loading('Excluindo sua conta e todos os dados vinculados...');

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (sessionError || !accessToken) {
        throw new Error('Sessão expirada. Faça login novamente antes de apagar a conta.');
      }

      const response = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ userId: user.id, accessToken, selfDelete: true }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        throw new Error(result?.error || `Erro ao apagar conta (HTTP ${response.status}).`);
      }

      if (loadingToast) toast.dismiss(loadingToast);
      await signOut();
      toast.success('Sua conta e todos os seus dados foram apagados permanentemente.');
      navigate('/');
    } catch (err: any) {
      if (loadingToast) toast.dismiss(loadingToast);
      console.error('Erro fatal ao excluir conta:', err);
      toast.error(err?.message || 'Erro ao apagar conta. Tente novamente.');
    } finally {
      setUpdating(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleTestEmail = async () => {
    if (!userData?.email) {
      import('sonner').then(({ toast }) => toast.error("Erro: Dados do usuário não carregados."));
      return;
    }
    setTestingEmail(true);
    try {
      const data = await invokeFunction('Send-email', {
        to: userData.email,
        subject: "Teste de Notificação - FisioCareHub",
        html: generateEmailHTML({
          nome_do_usuario: userData.nome_completo || 'Usuário',
          mensagem_principal_da_notificacao: `<h2 style="margin:0 0 16px;color:#2563eb;font-size:24px;line-height:31px;font-weight:900;">Teste de Notificação</h2><p style="margin:0;color:#475569;font-size:16px;line-height:26px;">Este é um e-mail de teste enviado via Supabase Edge Functions.</p>`
        }),
        type: "email"
      });

      if (data.error) {
        throw new Error(data.error);
      }

      import('sonner').then(({ toast }) => toast.success("Sucesso! Um e-mail de teste foi enviado para: " + userData.email));
    } catch (err: any) {
      console.error("Erro ao enviar e-mail de teste:", err);
      import('sonner').then(({ toast }) => toast.error("Erro na configuração: " + (err.message || "Verifique suas credenciais de e-mail.")));
    } finally {
      setTestingEmail(false);
    }
  };

  const patientTabs = [
    { id: 'profile', label: t('nav.profile'), icon: User, color: 'text-sky-500 dark:text-sky-300' },
    { id: 'clinic', label: t('clinic.patient_data'), icon: Building2, color: 'text-blue-500 dark:text-blue-300' },
    { id: 'security', label: t('security.title'), icon: Lock, color: 'text-violet-500 dark:text-violet-300' },
    { id: 'notifications', label: t('notifications.title'), icon: Bell, color: 'text-amber-500 dark:text-amber-300' },
    { id: 'payments', label: t('payments.title'), icon: CreditCard, color: 'text-emerald-500 dark:text-emerald-300' },
    { id: 'theme', label: t('settings.preferences'), icon: Globe, color: 'text-cyan-500 dark:text-cyan-300' },
    { id: 'privacy', label: t('privacy.title'), icon: Eye, color: 'text-purple-500 dark:text-purple-300' },
  ];

  const physioTabs = [
    { id: 'profile_prof', label: t('nav.profile'), icon: User, color: 'text-sky-500 dark:text-sky-300' },
    { id: 'clinic', label: t('clinic.clinic_data'), icon: Building2, color: 'text-blue-500 dark:text-blue-300' },
    { id: 'subscription', label: t('nav.subscription'), icon: Crown, color: 'text-amber-500 dark:text-amber-300' },
    { id: 'earnings', label: t('payments.received'), icon: DollarSign, color: 'text-emerald-500 dark:text-emerald-300' },
    { id: 'theme', label: t('settings.preferences'), icon: Globe, color: 'text-cyan-500 dark:text-cyan-300' },
    { id: 'security', label: t('security.title'), icon: Lock, color: 'text-violet-500 dark:text-violet-300' },
  ];

  const currentTabs = isPhysio ? physioTabs : patientTabs;

  const renderLoadingSkeleton = () => (
    <div className="space-y-8 animate-pulse">
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="w-32 h-32 bg-slate-100 rounded-full" />
          <div className="flex-1 space-y-4">
            <div className="h-8 bg-slate-100 rounded-lg w-1/2" />
            <div className="h-4 bg-slate-100 rounded-lg w-1/3" />
          </div>
        </div>
        <div className="mt-10 space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="h-14 bg-slate-50 rounded-2xl" />
            <div className="h-14 bg-slate-50 rounded-2xl" />
          </div>
          <div className="h-32 bg-slate-50 rounded-2xl" />
          <div className="h-14 bg-blue-100 rounded-2xl w-40" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 px-4 sm:px-6 lg:px-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400 tracking-tight">{t('profile.title')}</h1>
          <p className="text-slate-400 font-medium">Gerencie seu perfil, segurança e preferências do sistema.</p>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Navigation Sidebar */}
        <aside className="lg:w-72 space-y-2">
          <div className="bg-sky-50/90 backdrop-blur-xl p-4 rounded-[2rem] border border-sky-200/70 shadow-sm shadow-sky-100/60 space-y-1 dark:bg-slate-900/50 dark:border-white/10 dark:shadow-none">
            {currentTabs.map((tab) => {
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => navigate(`/profile?tab=${tab.id}`)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-4 rounded-2xl font-bold transition-all text-sm border",
                    isActive
                      ? "bg-gradient-to-r from-sky-100 to-emerald-100 text-slate-900 border-sky-200 shadow-lg shadow-sky-100/80 dark:from-primary dark:to-blue-600 dark:text-white dark:border-white/10 dark:shadow-premium"
                      : "text-slate-700 border-transparent hover:bg-sky-100/80 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
                  )}
                >
                  <tab.icon
                    size={20}
                    className={cn(
                      "shrink-0 transition-colors",
                      isActive
                        ? "text-white"
                        : tab.color
                    )}
                  />
                  <span className="text-inherit">{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="bg-emerald-50/85 backdrop-blur-xl p-4 rounded-[2rem] border border-emerald-200/70 shadow-sm shadow-emerald-100/60 space-y-1 dark:bg-slate-900/50 dark:border-white/10 dark:shadow-none">
            <button
              onClick={() => signOut()}
              className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl font-bold text-sm text-emerald-700 border border-transparent hover:bg-emerald-100/80 hover:text-emerald-900 transition-all dark:text-rose-500 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
            >
              <LogOut size={20} className="text-emerald-500 dark:text-rose-500" />
              Sair da Conta
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl font-bold text-sm text-slate-700 border border-transparent hover:text-red-600 hover:bg-red-50 transition-all dark:text-slate-500 dark:hover:text-red-500 dark:hover:bg-red-500/10"
            >
              <Trash2 size={20} className="text-red-500 dark:text-red-500" />
              Excluir Conta
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0">
          {loading ? renderLoadingSkeleton() : (
            <div className="space-y-8">
              <AnimatePresence mode="wait">
                {(activeTab === 'profile' || activeTab === 'profile_prof') && (
                  <motion.div
                    key="profile"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-8"
                  >
                    {/* Profile Header Card */}
                    <div className="bg-slate-900/50 backdrop-blur-xl p-10 rounded-[3rem] border border-white/10 shadow-xl shadow-premium/5 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full -mr-32 -mt-32 opacity-50" />

                      <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                        <AvatarUpload 
                          userId={user?.id || ''}
                          currentAvatarUrl={userData?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`}
                          onUploadComplete={(newUrl) => {
                            setUserData((prev: any) => prev ? { ...prev, avatar_url: newUrl } : { ...userData, avatar_url: newUrl });
                            if (refreshProfile) refreshProfile();
                          }}
                        />

                        <div className="flex-1 text-center md:text-left space-y-4">
                          <div className="space-y-1">
                            <div className="flex items-center justify-center md:justify-start gap-3">
                              <h2 className="text-3xl font-black text-white tracking-tight">
                                {userData?.nome_completo || 'Usuário'}
                              </h2>
                              {isPro && (
                                <span className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-amber-400 to-orange-500 text-[10px] font-black text-white uppercase tracking-widest rounded-full shadow-lg shadow-orange-500/20 border border-white/20">
                                  <Crown size={10} fill="currentColor" />
                                  Pro
                                </span>
                              )}
                            </div>
                            <p className="text-slate-400 font-medium">{userData?.email}</p>
                            <div className="flex justify-center md:justify-start pt-2">
                              <span className="px-4 py-1.5 bg-primary/20 text-primary rounded-full text-[10px] font-black uppercase tracking-[0.15em] border border-primary/30">
                                {isPhysio ? 'Fisioterapeuta' : 'Paciente'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Profile Form */}
                    <div className="bg-slate-900/50 backdrop-blur-xl p-10 rounded-[3rem] border border-white/10 shadow-sm">
                      {isRejectedPhysio && (
                        <div className="mb-8 p-6 rounded-[2rem] bg-rose-500/10 border border-rose-500/20">
                          <div className="flex items-start gap-4">
                            <AlertTriangle className="text-rose-400 shrink-0 mt-1" size={22} />
                            <div>
                              <h4 className="text-white font-black text-sm uppercase tracking-widest mb-2">
                                Correção necessária
                              </h4>
                              <p className="text-rose-100/90 text-sm font-medium leading-relaxed">
                                Seu cadastro profissional foi reprovado temporariamente. Revise seus dados e documentos.
                                Ao salvar as alterações, seu cadastro voltará automaticamente para análise administrativa.
                              </p>

                              {(profile as any)?.motivo_reprovacao && (
                                <div className="mt-4 p-4 rounded-2xl bg-black/20 border border-rose-400/20">
                                  <p className="text-[10px] font-black text-rose-300 uppercase tracking-widest mb-1">
                                    Motivo informado pela análise
                                  </p>
                                  <p className="text-sm text-white font-bold leading-relaxed">
                                    {(profile as any).motivo_reprovacao}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      <h3 className="text-xl font-black text-white mb-8 flex items-center gap-3">
                        <User className="text-blue-500" size={24} />
                        {t('profile.personal_info')}
                      </h3>

                      <form onSubmit={handleUpdateProfile} className="space-y-8">
                        <div className="grid md:grid-cols-2 gap-8">
                          <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">{t('profile.form_name')}</label>
                            <input
                              type="text"
                              name="name"
                              value={formData.name}
                              onChange={handleChange}
                              className="w-full p-5 bg-white/5 border border-white/10 rounded-[2rem] focus:ring-2 focus:ring-blue-600 outline-none transition-all font-bold text-white"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">{t('profile.form_phone')}</label>
                            <input
                              type="tel"
                              name="telefone"
                              value={formData.telefone}
                              onChange={handleChange}
                              className="w-full p-5 bg-white/5 border border-white/10 rounded-[2rem] focus:ring-2 focus:ring-blue-600 outline-none transition-all font-bold text-white"
                              placeholder="(00) 00000-0000"
                            />
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8">
                          <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">{t('profile.form_cpf')}</label>
                            <input
                              type="text"
                              name="cpf"
                              value={formData.cpf}
                              onChange={handleChange}
                              className="w-full p-5 bg-white/5 border border-white/10 rounded-[2rem] focus:ring-2 focus:ring-blue-600 outline-none transition-all font-bold text-white"
                              placeholder="000.000.000-00"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">{t('profile.form_birth')}</label>
                            <input
                              type="date"
                              name="data_nascimento"
                              value={formData.data_nascimento}
                              onChange={handleChange}
                              className="w-full p-5 bg-white/5 border border-white/10 rounded-[2rem] focus:ring-2 focus:ring-blue-600 outline-none transition-all font-bold text-white"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">{t('profile.form_gender')}</label>
                            <select
                              name="gender"
                              value={formData.gender}
                              onChange={handleChange}
                              className="w-full p-5 bg-white/5 border border-white/10 rounded-[2rem] focus:ring-2 focus:ring-blue-600 outline-none transition-all font-bold text-white appearance-none"
                            >
                              <option value="" className="bg-slate-900">{t('profile.gender_select')}</option>
                              <option value="male" className="bg-slate-900">{t('profile.gender_male')}</option>
                              <option value="female" className="bg-slate-900">{t('profile.gender_female')}</option>
                              <option value="other" className="bg-slate-900">{t('profile.gender_other')}</option>
                            </select>
                          </div>
                        </div>

                        {isPhysio && (
                          <div className="grid md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                              <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">CREFITO</label>
                              <input
                                type="text"
                                name="crefito"
                                value={formData.crefito}
                                onChange={handleChange}
                                className="w-full p-5 bg-white/5 border border-white/10 rounded-[2rem] focus:ring-2 focus:ring-blue-600 outline-none transition-all font-bold text-white"
                                placeholder="Ex: 12345-F"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Especialidade Principal</label>
                              <input
                                type="text"
                                name="specialty"
                                value={formData.specialty}
                                onChange={handleChange}
                                className="w-full p-5 bg-white/5 border border-white/10 rounded-[2rem] focus:ring-2 focus:ring-blue-600 outline-none transition-all font-bold text-white"
                                placeholder="Ex: Ortopedia, Neuro..."
                              />
                            </div>
                          </div>
                        )}

                        {isPhysio && (
                          <>
                            <div className="space-y-2">
                              <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Experiência Profissional</label>
                              <textarea
                                name="experiencia_profissional"
                                value={formData.experiencia_profissional}
                                onChange={handleChange}
                                className="w-full h-32 p-5 bg-white/5 border border-white/10 rounded-[2rem] focus:ring-2 focus:ring-blue-600 outline-none resize-none transition-all font-bold text-white"
                                placeholder="Descreva sua trajetória profissional..."
                              />
                            </div>

                            <div className="grid md:grid-cols-2 gap-8">
                              <div className="space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Preço da Sessão (R$)</label>
                                <input
                                  type="number"
                                  name="preco_sessao"
                                  value={formData.preco_sessao}
                                  onChange={handleChange}
                                  className="w-full p-5 bg-white/5 border border-white/10 rounded-[2rem] focus:ring-2 focus:ring-blue-600 outline-none transition-all font-bold text-white"
                                  placeholder="0.00"
                                  step="0.01"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Modalidade de Atendimento</label>
                                <select
                                  name="serviceType"
                                  value={formData.serviceType}
                                  onChange={handleChange}
                                  className="w-full p-5 bg-white/5 border border-white/10 rounded-[2rem] focus:ring-2 focus:ring-blue-600 outline-none transition-all font-bold text-white appearance-none"
                                >
                                  <option value="domicilio" className="bg-slate-900">Domiciliar</option>
                                  <option value="online" className="bg-slate-900">Online</option>
                                  <option value="ambos" className="bg-slate-900">Ambos (Clínica/Domicílio/Online)</option>
                                </select>
                              </div>
                            </div>
                          </>
                        )}

                        {!isPhysio && (
                          <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Observações de Saúde</label>
                            <textarea
                              name="observacoes_saude"
                              value={formData.observacoes_saude}
                              onChange={handleChange}
                              className="w-full h-32 p-5 bg-white/5 border border-white/10 rounded-[2rem] focus:ring-2 focus:ring-blue-600 outline-none resize-none transition-all font-bold text-white"
                              placeholder="Alergias, condições crônicas, cirurgias anteriores..."
                            />
                          </div>
                        )}

                        {isPhysio && (
                          <div className="grid md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                              <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Formação Acadêmica</label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={newEducation}
                                  onChange={(e) => setNewEducation(e.target.value)}
                                  placeholder="Ex: Graduação em Fisioterapia - USP"
                                  className="flex-1 p-5 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none transition-all font-bold text-white text-sm"
                                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addEducation())}
                                />
                                <button
                                  type="button"
                                  onClick={addEducation}
                                  className="px-6 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all font-bold"
                                >
                                  Add
                                </button>
                              </div>
                              <div className="space-y-2">
                                {formData.formacao_academica.map((item, i) => (
                                  <div key={i} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-xl group hover:border-white/20 transition-all">
                                    <div className="flex items-center gap-3">
                                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                                      <span className="text-sm font-medium text-slate-300">{item}</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => removeEducation(i)}
                                      className="text-slate-500 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-all"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                ))}
                                {formData.formacao_academica.length === 0 && (
                                  <p className="text-xs text-slate-600 font-medium italic ml-1">Nenhuma formação adicionada.</p>
                                )}
                              </div>
                            </div>

                            <div className="space-y-4">
                              <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Serviços Oferecidos</label>

                              <div className="flex flex-wrap gap-2 mb-4">
                                {commonServices.map(service => {
                                  const isSelected = formData.servicos_ofertados.includes(service);
                                  return (
                                    <button
                                      key={service}
                                      type="button"
                                      onClick={() => toggleService(service)}
                                      className={cn(
                                        "px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all",
                                        isSelected 
                                          ? "bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-900/20" 
                                          : "bg-white/5 border-white/10 text-slate-400 hover:border-white/30"
                                      )}
                                    >
                                      {service}
                                    </button>
                                  );
                                })}
                              </div>

                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={newService}
                                  onChange={(e) => setNewService(e.target.value)}
                                  placeholder="Outro serviço..."
                                  className="flex-1 p-5 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none transition-all font-bold text-white text-sm"
                                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomService())}
                                />
                                <button
                                  type="button"
                                  onClick={addCustomService}
                                  className="px-6 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all font-bold"
                                >
                                  Add
                                </button>
                              </div>

                              <div className="space-y-2">
                                {formData.servicos_ofertados.filter(s => !commonServices.includes(s)).map((item, i) => (
                                  <div key={i} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-xl group hover:border-white/20 transition-all">
                                    <div className="flex items-center gap-3">
                                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                                      <span className="text-sm font-medium text-slate-300">{item}</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => removeService(formData.servicos_ofertados.indexOf(item))}
                                      className="text-slate-500 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-all"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {isPhysio && (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between gap-4">
                              <div>
                                <h4 className="text-lg font-black text-white flex items-center gap-3">
                                  <FileText className="text-blue-500" size={22} />
                                  Documentos Profissionais
                                </h4>
                                <p className="text-xs text-slate-500 font-medium mt-1">
                                  Visualize ou atualize os documentos enviados para aprovação do seu perfil.
                                </p>
                              </div>

                              <span className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                {userData?.status_aprovacao || 'pendente'}
                              </span>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                              {professionalDocuments.map((doc) => {
                                const currentPath = userData?.[doc.field];
                                const hasDocument = Boolean(currentPath);

                                return (
                                  <div
                                    key={doc.field}
                                    className="p-5 bg-white/5 border border-white/10 rounded-[2rem] space-y-4"
                                  >
                                    <div className="flex items-start justify-between gap-4">
                                      <div>
                                        <p className="font-black text-white text-sm">{doc.label}</p>
                                        <p className="text-xs text-slate-500 font-medium">{doc.description}</p>
                                      </div>

                                      <span
                                        className={cn(
                                          "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                                          hasDocument
                                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                        )}
                                      >
                                        {hasDocument ? 'Enviado' : 'Pendente'}
                                      </span>
                                    </div>

                                    <div className="flex flex-col sm:flex-row gap-3">
                                      <button
                                        type="button"
                                        disabled={!hasDocument || updating}
                                        onClick={() => handleViewProfessionalDocument(currentPath)}
                                        className="flex-1 px-4 py-3 bg-white/10 border border-white/10 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                      >
                                        <Eye size={16} />
                                        Visualizar
                                      </button>

                                      <label className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all cursor-pointer flex items-center justify-center gap-2">
                                        {updating ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                                        Substituir
                                        <input
                                          type="file"
                                          accept="image/*,application/pdf"
                                          className="hidden"
                                          disabled={updating}
                                          onChange={(e) => handleReplaceProfessionalDocument(e, doc.field, doc.uploadType)}
                                        />
                                      </label>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <div className="space-y-2">
                          <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">{isPhysio ? 'Biografia Profissional' : 'Sobre Você'}</label>
                          <textarea
                            name="bio"
                            value={formData.bio}
                            onChange={handleChange}
                            className="w-full h-32 p-5 bg-white/5 border border-white/10 rounded-[2rem] focus:ring-2 focus:ring-blue-600 outline-none resize-none transition-all font-bold text-white"
                            placeholder={isPhysio ? "Conte sobre sua formação e áreas de atuação..." : "Conte um pouco sobre você..."}
                          />
                        </div>

                        <div className="flex justify-end">
                          <button
                            type="submit"
                            disabled={updating}
                            className="px-12 py-5 bg-blue-600 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-900/20 flex items-center gap-3 disabled:opacity-50"
                          >
                            {updating ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />}
                            Salvar Alterações
                          </button>
                        </div>
                      </form>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'security' && (
                  <motion.div
                    key="security"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-8"
                  >
                    <div className="bg-slate-900/50 backdrop-blur-xl p-10 rounded-[3rem] border border-white/10 shadow-sm">
                      <h3 className="text-xl font-black text-white mb-8 flex items-center gap-3">
                        <Lock className="text-blue-500" size={24} />
                        Segurança e Acesso
                      </h3>

                      <div className="space-y-6">
                        <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/10 flex flex-col md:flex-row items-center justify-between gap-6">
                          <div className="text-center md:text-left">
                            <p className="text-lg font-black text-white">Alterar Senha</p>
                            <p className="text-sm text-slate-400 font-medium">Enviaremos um link de redefinição para seu e-mail de cadastro.</p>
                          </div>
                          <button
                            onClick={handlePasswordReset}
                            className="px-8 py-4 bg-white/10 border border-white/10 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/20 transition-all shadow-sm"
                          >
                            Redefinir Senha
                          </button>
                        </div>

                        <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/10 flex flex-col lg:flex-row items-center justify-between gap-6">
                          <div className="text-center lg:text-left max-w-2xl">
                            <div className="flex items-center justify-center lg:justify-start gap-3 mb-2">
                              <div className="w-11 h-11 rounded-2xl bg-blue-500/10 border border-blue-400/20 flex items-center justify-center">
                                <ShieldCheck className="text-blue-400" size={22} />
                              </div>
                              <div>
                                <p className="text-lg font-black text-white">Face ID / Biometria</p>
                                <p className="text-[10px] font-black uppercase tracking-widest text-blue-300">
                                  {biometricsEnabled ? 'Ativa neste login' : 'Disponível para ativar'}
                                </p>
                              </div>
                            </div>
                            <p className="text-sm text-slate-400 font-medium">
                              Entre com mais rapidez usando Face ID, Touch ID ou a biometria do dispositivo. A biometria fica vinculada à sua conta e pode ser removida a qualquer momento.
                            </p>
                            {!biometricsSupported && (
                              <p className="mt-3 text-xs font-bold text-amber-300 bg-amber-500/10 border border-amber-400/20 rounded-2xl px-4 py-3">
                                Este navegador/dispositivo pode não oferecer suporte à biometria. No iPhone, teste pelo Safari com Face ID ativo.
                              </p>
                            )}
                          </div>

                          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                            <button
                              type="button"
                              onClick={handleEnableBiometrics}
                              disabled={loadingBiometrics || biometricsEnabled}
                              className="w-full lg:w-auto px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {loadingBiometrics ? <Loader2 className="animate-spin" size={18} /> : <ShieldCheck size={18} />}
                              {biometricsEnabled ? 'Biometria Ativa' : 'Ativar Biometria'}
                            </button>

                            {biometricsEnabled && (
                              <button
                                type="button"
                                onClick={handleDisableBiometrics}
                                disabled={loadingBiometrics}
                                className="w-full lg:w-auto px-8 py-4 bg-red-500/10 border border-red-400/20 text-red-300 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-500/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                              >
                                {loadingBiometrics ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                                Remover
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/10 flex flex-col md:flex-row items-center justify-between gap-6">
                          <div className="text-center md:text-left">
                            <p className="text-lg font-black text-white">Autenticação em Duas Etapas</p>
                            <p className="text-sm text-slate-400 font-medium">Adicione uma camada extra de segurança à sua conta.</p>
                          </div>
                          <span className="px-4 py-2 bg-white/5 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest">Em Breve</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'notifications' && (
                  <motion.div
                    key="notifications"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-8"
                  >
                    <div className="bg-slate-900/50 backdrop-blur-xl p-10 rounded-[3rem] border border-white/10 shadow-sm">
                      <h3 className="text-xl font-black text-white mb-8 flex items-center gap-3">
                        <Bell className="text-blue-500" size={24} />
                        Preferências de Notificação
                      </h3>

                      <div className="space-y-4">
                        {[
                          { label: 'Notificações Push', desc: 'Alertas em tempo real no navegador/celular.' },
                          { label: 'E-mails de Agendamento', desc: 'Confirmações e lembretes de consultas.' },
                          { label: 'Novas Mensagens', desc: 'Avisos de novas mensagens no chat.' },
                          { label: 'Materiais Educativos', desc: 'Novidades na biblioteca de saúde.' }
                        ].map((item, i) => (
                          <div key={i} className="p-6 bg-white/5 rounded-[2rem] border border-white/10 flex items-center justify-between">
                            <div>
                              <p className="font-black text-white">{item.label}</p>
                              <p className="text-xs text-slate-400 font-medium">{item.desc}</p>
                            </div>
                            <div className="w-12 h-6 bg-blue-600 rounded-full relative cursor-pointer">
                              <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'payments' && (
                  <motion.div
                    key="payments"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-8"
                  >
                    <div className="bg-slate-900/50 backdrop-blur-xl p-6 md:p-10 rounded-[2.5rem] md:rounded-[3rem] border border-white/10 shadow-xl overflow-hidden">
                      <PaymentMethods userId={user?.id || ''} />
                    </div>
                  </motion.div>
                )}

                {activeTab === 'privacy' && (
                  <motion.div
                    key="privacy"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-8"
                  >
                    <div className="bg-slate-900/50 backdrop-blur-xl p-10 rounded-[3rem] border border-white/10 shadow-sm">
                      <h3 className="text-xl font-black text-white mb-8 flex items-center gap-3">
                        <Eye className="text-blue-500" size={24} />
                        Privacidade e Dados
                      </h3>

                      <div className="space-y-6">
                        <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/10 space-y-4">
                          <p className="font-black text-white">{t('profile.visibility')}</p>
                          <p className="text-sm text-slate-400 font-medium leading-relaxed">
                            Seu perfil é visível apenas para os fisioterapeutas com quem você agenda consultas. 
                            Seus dados de saúde são protegidos por criptografia de ponta a ponta.
                          </p>
                        </div>

                        <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/10 flex items-center justify-between">
                          <div>
                            <p className="font-black text-white">Exportar Meus Dados</p>
                            <p className="text-xs text-slate-400 font-medium">Baixe uma cópia de todo o seu histórico em formato JSON.</p>
                          </div>
                          <button className="p-4 bg-white/10 text-white rounded-2xl hover:bg-white/20 transition-all shadow-sm">
                            <Download size={20} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'theme' && (
                  <motion.div
                    key="theme"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-8"
                  >
                    {/* Language Selection Section */}
                    <div className="bg-slate-900/50 backdrop-blur-xl p-10 rounded-[3rem] border border-white/10 shadow-sm">
                      <h3 className="text-xl font-black text-white mb-2 flex items-center gap-3">
                        <Globe className="text-blue-500" size={24} />
                        {t('settings.language')}
                      </h3>
                      <p className="text-slate-400 font-medium mb-8 ml-9">{t('settings.language_description')}</p>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        {languages.map((lang) => (
                          <button
                            key={lang.code}
                            onClick={() => changeLanguage(lang.code)}
                            className={cn(
                              "relative group p-6 rounded-[2.5rem] border-2 transition-all duration-500 text-left overflow-hidden",
                              i18n.language.startsWith(lang.code)
                                ? "border-blue-500 bg-blue-500/10 shadow-xl shadow-blue-500/20" 
                                : "border-white/5 bg-white/5 hover:border-white/20"
                            )}
                          >
                            <div className="flex items-center gap-4">
                              <span className="text-3xl">{lang.flag}</span>
                              <div>
                                <p className={cn(
                                  "font-black text-lg tracking-tight",
                                  i18n.language.startsWith(lang.code) ? "text-white" : "text-slate-300"
                                )}>
                                  {lang.name}
                                </p>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                  {lang.code === 'pt' ? 'Português' : lang.code === 'en' ? 'English' : 'Español'}
                                </p>
                              </div>
                            </div>

                            {i18n.language.startsWith(lang.code) && (
                              <div className="absolute top-4 right-4">
                                <CheckCircle className="text-blue-500" size={20} />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Theme Selection Section */}
                    <div className="bg-slate-900/50 backdrop-blur-xl p-10 rounded-[3rem] border border-white/10 shadow-sm">
                      <h3 className="text-xl font-black text-white mb-2 flex items-center gap-3">
                        <Palette className="text-blue-500" size={24} />
                        Personalização de Tema
                      </h3>
                      <p className="text-slate-400 font-medium mb-8 ml-9">Escolha o tema que melhor combina com seu estilo.</p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {Object.values(THEMES).map((t) => (
                          <button
                            key={t.id}
                            onClick={() => updateTheme?.(t.id)}
                            className={cn(
                              "relative group p-6 rounded-[2.5rem] border-2 transition-all duration-500 text-left overflow-hidden",
                              currentThemeId === t.id 
                                ? "border-blue-500 bg-blue-500/10 shadow-xl shadow-blue-500/20" 
                                : "border-white/5 bg-white/5 hover:border-white/20"
                            )}
                          >
                            {/* Theme Preview Dot */}
                            <div 
                              className="w-12 h-12 rounded-2xl mb-4 shadow-lg flex items-center justify-center text-white"
                              style={{ backgroundColor: t.primary }}
                            >
                              {currentThemeId === t.id && <CheckCircle size={24} />}
                            </div>

                            <p className={cn(
                              "font-black text-lg tracking-tight mb-1",
                              currentThemeId === t.id ? "text-white" : "text-slate-300"
                            )}>
                              {t.name}
                            </p>

                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                              {t.id === 'light' ? 'Visual claro e limpo' : t.id === 'blue' ? 'Padrão Profissional' : t.id === 'green' ? 'Bem-estar Profundo' : 'Visual Exclusivo'}
                            </p>

                            {/* Active Indicator */}
                            {currentThemeId === t.id && (
                              <div className="absolute top-4 right-4 animate-pulse">
                                <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>

                      <div className="mt-12 p-8 bg-primary/5 rounded-[2.5rem] border border-primary/10">
                        <div className="flex gap-4">
                          <Zap className="text-primary/70 shrink-0" size={24} />
                          <div>
                            <p className="font-black text-white text-sm mb-1 uppercase tracking-tight">Mudança Instantânea</p>
                            <p className="text-xs text-slate-400 font-medium leading-relaxed">
                              Ao selecionar um tema, as cores do sistema, botões e destaques são atualizados imediatamente em todo o aplicativo. Sua preferência é salva automaticamente.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}


                {activeTab === 'clinic' && (
                  <motion.div
                    key="clinic"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-8"
                  >
                    <div className="bg-slate-900/50 backdrop-blur-xl p-10 rounded-[3rem] border border-white/10 shadow-sm">
                      <h3 className="text-xl font-black text-white mb-8 flex items-center gap-3">
                        <Building2 className="text-blue-500" size={24} />
                        {isPhysio ? t('clinic.clinic_data') : t('clinic.patient_data')}
                      </h3>

                      <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                          <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">CEP</label>
                          <input
                            type="text"
                            name="zipCode"
                            value={formData.zipCode}
                            onChange={handleChange}
                            className="w-full p-5 bg-white/5 border border-white/10 rounded-[2rem] focus:ring-2 focus:ring-blue-600 outline-none transition-all font-bold text-white"
                            placeholder="00000-000"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Cidade</label>
                          <input
                            type="text"
                            name="city"
                            value={formData.city}
                            onChange={handleChange}
                            className="w-full p-5 bg-white/5 border border-white/10 rounded-[2rem] focus:ring-2 focus:ring-blue-600 outline-none transition-all font-bold text-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Estado</label>
                          <input
                            type="text"
                            name="state"
                            value={formData.state}
                            onChange={handleChange}
                            className="w-full p-5 bg-white/5 border border-white/10 rounded-[2rem] focus:ring-2 focus:ring-blue-600 outline-none transition-all font-bold text-white"
                            placeholder="Ex: SP, RJ..."
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">País</label>
                          <input
                            type="text"
                            name="country"
                            value={formData.country}
                            onChange={handleChange}
                            className="w-full p-5 bg-white/5 border border-white/10 rounded-[2rem] focus:ring-2 focus:ring-blue-600 outline-none transition-all font-bold text-white"
                          />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                          <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Endereço Completo</label>
                          <input
                            type="text"
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            className="w-full p-5 bg-white/5 border border-white/10 rounded-[2rem] focus:ring-2 focus:ring-blue-600 outline-none transition-all font-bold text-white"
                            placeholder="Rua, número, complemento..."
                          />
                        </div>
                      </div>

                      <div className="flex justify-end mt-8">
                        <button
                          onClick={handleUpdateProfile}
                          disabled={updating}
                          className="px-12 py-5 bg-blue-600 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-900/20 flex items-center gap-3 disabled:opacity-50"
                        >
                          {updating ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />}
                          {t('profile.update_address')}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'subscription' && (
                  <motion.div
                    key="subscription"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-8"
                  >
                    <div className="bg-slate-900/50 backdrop-blur-xl p-10 rounded-[3rem] border border-white/10 shadow-xl shadow-blue-900/5 overflow-hidden relative">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full -mr-32 -mt-32 opacity-50" />

                      <div className="relative z-10 space-y-8">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-amber-500/20 text-amber-400 rounded-3xl flex items-center justify-center shadow-lg shadow-amber-500/10">
                            <Crown size={32} fill="currentColor" />
                          </div>
                          <div>
                            <h3 className="text-2xl font-black text-white">Plano FisioCare Pro</h3>
                            <p className="text-slate-400 font-medium">Sua assinatura atual está {isPro ? 'Ativa' : 'Inativa'}.</p>
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/10 space-y-4">
                            <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Próximo Vencimento</p>
                            <p className="text-2xl font-black text-white">15 de Maio, 2026</p>
                            <p className="text-sm text-slate-400 font-medium">Valor: R$ 149,90/mês</p>
                          </div>
                          <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/10 space-y-4">
                            <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Método de Pagamento</p>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-6 bg-white/10 rounded flex items-center justify-center text-[8px] text-white font-bold">VISA</div>
                              <p className="text-lg font-black text-white">**** 4242</p>
                            </div>
                            <button className="text-blue-400 font-black text-xs uppercase tracking-widest hover:underline">Alterar Cartão</button>
                          </div>
                        </div>

                        <div className="flex flex-col md:flex-row gap-4 pt-4">
                          <Link 
                            to="/subscription"
                            className="flex-1 py-5 bg-blue-600 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest text-center shadow-xl shadow-blue-900/20 hover:bg-blue-700 transition-all"
                          >
                            {t('subscription.manage')}
                          </Link>
                          <button className="flex-1 py-5 bg-white/5 border border-white/10 text-rose-500 rounded-[2rem] font-black text-sm uppercase tracking-widest hover:bg-rose-500/10 transition-all">
                            {t('subscription.cancel_plan')}
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'earnings' && (
                  <motion.div
                    key="earnings"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-8"
                  >
                    <div className="relative overflow-hidden rounded-[2rem] sm:rounded-[3rem] border border-slate-200/80 bg-white p-5 shadow-xl shadow-slate-200/60 dark:border-white/10 dark:bg-slate-900/60 dark:shadow-black/20 sm:p-8 lg:p-10">
                      <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl dark:bg-blue-500/20" />
                      <div className="absolute -bottom-28 -left-24 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl dark:bg-emerald-500/20" />

                      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-3">
                          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
                            <Wallet size={14} /> Central Financeira
                          </div>
                          <div>
                            <h3 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                              Financeiro do fisioterapeuta
                            </h3>
                            <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                              Acompanhe ganhos, pagamentos recebidos, comissão da plataforma, saques e relatórios mensais em PDF.
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                          <select
                            value={selectedFinanceMonth}
                            onChange={(event) => setSelectedFinanceMonth(event.target.value)}
                            className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 dark:border-white/10 dark:bg-slate-950/60 dark:text-white"
                          >
                            {availableFinanceMonths.map((month) => (
                              <option key={month} value={month}>{getMonthLabel(month)}</option>
                            ))}
                          </select>
                          <button
                            onClick={handleDownloadFinanceReport}
                            disabled={downloadingFinanceReport}
                            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-xs font-black uppercase tracking-[0.18em] text-white shadow-xl shadow-slate-300/60 transition-all hover:-translate-y-0.5 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:shadow-black/20 dark:hover:bg-blue-100"
                          >
                            {downloadingFinanceReport ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
                            Baixar PDF
                          </button>
                        </div>
                      </div>

                      <div className="relative mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        {[
                          {
                            label: 'Saldo disponível',
                            value: formatCurrency(earningsStats.balance),
                            helper: 'líquido após saques pagos',
                            icon: Wallet,
                            tone: 'emerald',
                          },
                          {
                            label: `Ganhos de ${getMonthLabel(selectedFinanceMonth)}`,
                            value: formatCurrency(monthlySummary.gross),
                            helper: `${monthlySummary.paidAppointments} consultas pagas`,
                            icon: TrendingUp,
                            tone: 'blue',
                          },
                          {
                            label: `Comissão ${earningsStats.commissionRate}%`,
                            value: formatCurrency(monthlySummary.commission),
                            helper: 'retida pela plataforma',
                            icon: Receipt,
                            tone: 'amber',
                          },
                          {
                            label: 'Líquido do mês',
                            value: formatCurrency(monthlySummary.net),
                            helper: 'estimativa para o profissional',
                            icon: DollarSign,
                            tone: 'violet',
                          },
                        ].map((card) => {
                          const Icon = card.icon;
                          const toneClass = card.tone === 'emerald'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20'
                            : card.tone === 'blue'
                              ? 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20'
                              : card.tone === 'amber'
                                ? 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20'
                                : 'bg-violet-50 text-violet-700 border-violet-100 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/20';

                          return (
                            <div key={card.label} className="rounded-[2rem] border border-slate-200 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
                              <div className="mb-5 flex items-center justify-between gap-3">
                                <div className={cn('flex h-12 w-12 items-center justify-center rounded-2xl border', toneClass)}>
                                  <Icon size={22} />
                                </div>
                              </div>
                              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">{card.label}</p>
                              <p className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white">{card.value}</p>
                              <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">{card.helper}</p>
                            </div>
                          );
                        })}
                      </div>

                      <div className="relative mt-8 flex flex-wrap gap-2 rounded-[1.75rem] border border-slate-200 bg-slate-50 p-2 dark:border-white/10 dark:bg-slate-950/40">
                        {[
                          { id: 'summary', label: 'Resumo', icon: TrendingUp },
                          { id: 'payments', label: 'Pagamentos', icon: Receipt },
                          { id: 'withdrawals', label: 'Saques', icon: ArrowDownToLine },
                          { id: 'reports', label: 'Relatórios', icon: FileText },
                        ].map((tab) => {
                          const Icon = tab.icon;
                          const active = financeSubTab === tab.id;

                          return (
                            <button
                              key={tab.id}
                              onClick={() => setFinanceSubTab(tab.id as typeof financeSubTab)}
                              className={cn(
                                'flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] transition-all sm:flex-none',
                                active
                                  ? 'bg-white text-blue-700 shadow-lg shadow-slate-200/70 dark:bg-white/10 dark:text-white dark:shadow-black/10'
                                  : 'text-slate-500 hover:bg-white/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white'
                              )}
                            >
                              <Icon size={15} />
                              {tab.label}
                            </button>
                          );
                        })}
                      </div>

                      <div className="relative mt-8">
                        {loadingEarnings ? (
                          <div className="flex flex-col items-center justify-center rounded-[2rem] border border-dashed border-slate-200 bg-slate-50 py-16 dark:border-white/10 dark:bg-white/5">
                            <Loader2 className="animate-spin text-blue-500" size={32} />
                            <p className="mt-4 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Carregando financeiro...</p>
                          </div>
                        ) : financeSubTab === 'summary' ? (
                          <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
                            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/5">
                              <div className="mb-6 flex items-center justify-between gap-4">
                                <div>
                                  <h4 className="text-lg font-black text-slate-950 dark:text-white">Resumo mensal</h4>
                                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{getMonthLabel(selectedFinanceMonth)}</p>
                                </div>
                                <CalendarDays className="text-blue-500" size={24} />
                              </div>

                              <div className="grid gap-3 sm:grid-cols-2">
                                {[
                                  ['Receita bruta', monthlySummary.gross],
                                  ['Comissão da plataforma', monthlySummary.commission],
                                  ['Receita líquida', monthlySummary.net],
                                  ['Saques no período', monthlySummary.withdrawals],
                                  ['Saldo estimado do mês', monthlySummary.availableInMonth],
                                  ['A receber geral', earningsStats.pending],
                                ].map(([label, value]) => (
                                  <div key={String(label)} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-950/40">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">{label}</p>
                                    <p className="mt-1 text-xl font-black text-slate-950 dark:text-white">{formatCurrency(Number(value))}</p>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-6 dark:border-white/10 dark:bg-slate-950/40">
                              <div className="mb-5 flex items-center justify-between gap-4">
                                <div>
                                  <h4 className="text-lg font-black text-slate-950 dark:text-white">Últimos lançamentos</h4>
                                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Movimentações mais recentes</p>
                                </div>
                                <Receipt className="text-emerald-500" size={22} />
                              </div>

                              <div className="space-y-3">
                                {earningsList.slice(0, 5).length > 0 ? earningsList.slice(0, 5).map((item, i) => (
                                  <div key={item.id || i} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
                                    <div className="flex items-center gap-3">
                                      <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-emerald-100 text-sm font-black text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                                        {item.avatar ? <img src={item.avatar} alt="" className="h-full w-full object-cover" /> : item.patient[0]}
                                      </div>
                                      <div>
                                        <p className="text-sm font-black text-slate-900 dark:text-white">{item.patient}</p>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{item.date}</p>
                                      </div>
                                    </div>
                                    <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">+ {formatCurrency(item.net)}</p>
                                  </div>
                                )) : (
                                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center dark:border-white/10 dark:bg-white/5">
                                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Nenhum lançamento encontrado.</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : financeSubTab === 'payments' ? (
                          <div className="rounded-[2rem] border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
                            <div className="flex flex-col gap-3 border-b border-slate-200 p-6 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <h4 className="text-lg font-black text-slate-950 dark:text-white">Pagamentos recebidos</h4>
                                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Consultas concluídas no período selecionado.</p>
                              </div>
                              <span className="rounded-full bg-emerald-50 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                                {monthlyPayments.length} registros
                              </span>
                            </div>

                            <div className="overflow-x-auto">
                              <table className="w-full min-w-[760px] text-left">
                                <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:bg-slate-950/40 dark:text-slate-500">
                                  <tr>
                                    <th className="px-6 py-4">Data</th>
                                    <th className="px-6 py-4">Paciente</th>
                                    <th className="px-6 py-4">Serviço</th>
                                    <th className="px-6 py-4">Bruto</th>
                                    <th className="px-6 py-4">Comissão</th>
                                    <th className="px-6 py-4">Líquido</th>
                                    <th className="px-6 py-4">Status</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                                  {monthlyPayments.length > 0 ? monthlyPayments.map((item, i) => (
                                    <tr key={item.id || i} className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                      <td className="px-6 py-5">{item.date}</td>
                                      <td className="px-6 py-5 text-slate-950 dark:text-white">{item.patient}</td>
                                      <td className="px-6 py-5">{item.service}</td>
                                      <td className="px-6 py-5">{formatCurrency(item.gross)}</td>
                                      <td className="px-6 py-5 text-amber-600 dark:text-amber-400">-{formatCurrency(item.commission)}</td>
                                      <td className="px-6 py-5 text-emerald-600 dark:text-emerald-400">{formatCurrency(item.net)}</td>
                                      <td className="px-6 py-5">
                                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                                          {item.status}
                                        </span>
                                      </td>
                                    </tr>
                                  )) : (
                                    <tr>
                                      <td colSpan={7} className="px-6 py-12 text-center text-sm font-bold text-slate-500 dark:text-slate-400">
                                        Nenhum pagamento encontrado para {getMonthLabel(selectedFinanceMonth)}.
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ) : financeSubTab === 'withdrawals' ? (
                          <div className="space-y-8 rounded-[2rem] border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/5">
                            <PhysioWithdrawal
                              userId={user?.id || ''}
                              availableBalance={earningsStats.balance}
                              onSuccess={() => fetchEarnings()}
                            />
                          </div>
                        ) : (
                          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/5">
                              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                                <FileText size={26} />
                              </div>
                              <h4 className="text-xl font-black text-slate-950 dark:text-white">Relatório mensal em PDF</h4>
                              <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                                Baixe um relatório com resumo financeiro, pagamentos, comissão da plataforma, valor líquido e saques do mês selecionado.
                              </p>

                              <div className="mt-6 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-950/40">
                                <div className="flex items-center justify-between gap-4 text-sm font-bold">
                                  <span className="text-slate-500 dark:text-slate-400">Período</span>
                                  <span className="text-slate-950 dark:text-white">{getMonthLabel(selectedFinanceMonth)}</span>
                                </div>
                                <div className="flex items-center justify-between gap-4 text-sm font-bold">
                                  <span className="text-slate-500 dark:text-slate-400">Receita líquida</span>
                                  <span className="text-emerald-600 dark:text-emerald-400">{formatCurrency(monthlySummary.net)}</span>
                                </div>
                                <div className="flex items-center justify-between gap-4 text-sm font-bold">
                                  <span className="text-slate-500 dark:text-slate-400">Consultas</span>
                                  <span className="text-slate-950 dark:text-white">{monthlySummary.paidAppointments}</span>
                                </div>
                              </div>

                              <button
                                onClick={handleDownloadFinanceReport}
                                disabled={downloadingFinanceReport}
                                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-4 text-xs font-black uppercase tracking-[0.18em] text-white shadow-xl shadow-blue-900/20 transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {downloadingFinanceReport ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
                                Baixar relatório em PDF
                              </button>
                            </div>

                            <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-6 dark:border-white/10 dark:bg-slate-950/40">
                              <h4 className="text-lg font-black text-slate-950 dark:text-white">Dados de pagamento</h4>
                              <p className="mb-6 mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">Confira a chave PIX e dados usados para repasse.</p>
                              <PhysioPaymentData userId={user?.id || ''} />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </main>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[50] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteConfirm(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-slate-900 p-8 rounded-[3rem] shadow-2xl max-w-md w-full text-center border border-white/10"
            >
              <div className="w-20 h-20 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle size={40} />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Tem certeza absoluta?</h3>
              <p className="text-slate-400 mb-8">
                Esta ação é irreversível. Todos os seus dados serão apagados para sempre.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleDeleteAccount}
                  disabled={updating}
                  className="w-full py-4 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition-all flex items-center justify-center gap-2"
                >
                  {updating ? <Loader2 className="animate-spin" /> : t('profile.delete_confirm')}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="w-full py-4 bg-white/5 text-slate-400 rounded-xl font-bold hover:bg-white/10 transition-all"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <FloatingHelpMenu />
    </div>
  );
}
