import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../lib/firebase';
import { supabase } from '../lib/supabase';
import { useDebounce } from '@/src/hooks/useDebounce';
import { 
  doc, 
  getDoc, 
  collection, 
  onSnapshot, 
  query, 
  where, 
  updateDoc, 
  addDoc, 
  serverTimestamp,
  orderBy,
  limit
} from 'firebase/firestore';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { 
  Users, 
  UserCheck, 
  UserPlus, 
  Calendar, 
  FileText, 
  LayoutDashboard, 
  ShieldCheck, 
  Settings, 
  Search, 
  MoreVertical, 
  CheckCircle2, 
  XCircle, 
  Edit3,
  Eye,
  Filter,
  Download,
  Clock,
  Activity,
  Menu,
  X,
  Lock,
  DollarSign,
  CreditCard,
  MessageSquare,
  Send,
  Bell,
  Trash2,
  Save,
  AlertTriangle,
  AlertCircle,
  LogIn,
  LogOut,
  ArrowLeft,
  Sparkles,
  Smartphone,
  Stethoscope,
  User,
  Crown,
  BookOpen,
  Plus,
  Image as ImageIcon,
  Tag,
  FileText as FileIcon,
  Upload,
  Loader2,
  History,
  Shield,
  Brain
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDate, cn, resolveStorageUrl } from '../lib/utils';
import { categorizeContent } from '../lib/groq';
import { sendProfessionalApprovalEmail } from '../services/emailService';
import Logo from '../components/Logo';
import SplashScreen from '../components/SplashScreen';
import AvatarUpload from '../components/AvatarUpload';
import AdminDashboard from '../components/Admin/AdminDashboard';
import AdminLogs from '../components/Admin/AdminLogs';
import AdminSecurity from '../components/Admin/AdminSecurity';
import AdminViva from '../components/Admin/AdminViva';

export default function Admin() {
  const { t } = useTranslation();
  const { user: supabaseUser, loading: loadingSupabase, signOut, profile: authProfile, refreshProfile } = useAuth();
  const [firebaseUser, loadingFirebase] = useAuthState(auth);
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [firebaseLoginLoading, setFirebaseLoginLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Real Data States
  const [users, setUsers] = useState<any[]>([]);
  const [supabaseProfiles, setSupabaseProfiles] = useState<any[]>([]);
  const [materiais, setMateriais] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [pendingPhysios, setPendingPhysios] = useState<any[]>([]);
  const [selectedUserDetail, setSelectedUserDetail] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [selectedChatUser, setSelectedChatUser] = useState<any>(null);
  const [newMessage, setNewMessage] = useState('');
  const [commissionRate, setCommissionRate] = useState(12);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [adminNotifications, setAdminNotifications] = useState<any[]>([]);
  const [withdrawalFilter, setWithdrawalFilter] = useState<'pendente' | 'pago' | 'recusado' | 'todos'>('todos');
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [materialFile, setMaterialFile] = useState<File | null>(null);
  const [newMaterial, setNewMaterial] = useState({
    title: '',
    description: '',
    clinical_objective: '',
    level: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
    type: 'educational' as 'educational' | 'exercise' | 'alert',
    price: '',
    is_premium: false,
    cover_image: '',
    file_url: '',
    category: 'Sendo categorizado...',
    sections: [] as any[]
  });
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [aiGenForm, setAiGenForm] = useState({
    theme: '',
    type: 'educational',
    level: 'beginner'
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activePhysios: 0,
    newPatients: 0,
    pendingAppointments: 0,
    totalRevenue: 0,
    totalPaidByPatients: 0,
    totalCommission: 0,
    totalNetPhysio: 0,
    pendingWithdrawals: 0
  });

  const [testPhoneNumber, setTestPhoneNumber] = useState('');
  const [testWhatsAppLoading, setTestWhatsAppLoading] = useState(false);

  const [testEmailLoading, setTestEmailLoading] = useState(false);

  const handleTestEmail = async () => {
    setTestEmailLoading(true);
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (!currentSession) {
        import('sonner').then(({ toast }) => toast.error("Sua sessão expirou."));
        return;
      }

      const response = await fetch('/api/admin/test-template-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentSession.access_token}`
        }
      });

      let data;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        console.error("Non-JSON response:", text);
        data = { error: `Server returned ${response.status}: ${text.substring(0, 100)}...` };
      }

      if (response.ok) {
        import('sonner').then(({ toast }) => toast.success("E-mail de teste enviado com sucesso!"));
      } else {
        import('sonner').then(({ toast }) => toast.error("Falha no envio: " + (data.error || "Erro desconhecido")));
      }
    } catch (err: any) {
      console.error("Erro no teste de email:", err);
      import('sonner').then(({ toast }) => toast.error("Erro na conexão com o servidor."));
    } finally {
      setTestEmailLoading(false);
    }
  };

  const handleTestWhatsApp = async () => {
    if (!testPhoneNumber.trim()) {
      import('sonner').then(({ toast }) => toast.error("Informe um número de telefone com DDD (ex: 5511999999999)"));
      return;
    }

    setTestWhatsAppLoading(true);
    try {
      const response = await fetch('/api/notifications/test-whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ to: testPhoneNumber }),
      });

      const data = await response.json();

      if (response.ok) {
        import('sonner').then(({ toast }) => toast.success("Mensagem de teste enviada via WhatsApp!"));
      } else {
        import('sonner').then(({ toast }) => toast.error("Falha no envio: " + (data.error || "Erro desconhecido")));
      }
    } catch (err: any) {
      console.error("Erro no teste de WhatsApp:", err);
      import('sonner').then(({ toast }) => toast.error("Erro na conexão com o servidor."));
    } finally {
      setTestWhatsAppLoading(false);
    }
  };

  // Ensure client-side rendering
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [searchParams, activeTab]);

  // Strict Role Check to prevent "flash"
  useEffect(() => {
    if (!loadingSupabase && supabaseUser) {
      const userRole = authProfile?.tipo_usuario || supabaseUser.user_metadata?.role;
      const isAdminEmail = supabaseUser.email?.toLowerCase() === 'hogolezcano92@gmail.com';
      
      if (userRole === 'admin' || isAdminEmail) {
        setIsAdmin(true);
        setCheckingAdmin(false);
      } else if (userRole) {
        // If they have a role but it's not admin, get them out
        navigate('/dashboard', { replace: true });
      }
    } else if (!loadingSupabase && !supabaseUser) {
      navigate('/login', { replace: true });
    }
  }, [supabaseUser, loadingSupabase, authProfile, navigate]);

  useEffect(() => {
    if (isAdmin && authProfile && authProfile.tipo_usuario !== 'admin') {
      // Self-promote to admin in the database if the email matches the hardcoded admin
      const selfPromote = async () => {
        try {
          console.log("Self-promoting to admin in Supabase...");
          await supabase
            .from('perfis')
            .update({ tipo_usuario: 'admin', plano: 'admin' })
            .eq('id', authProfile.id);
          if (refreshProfile) refreshProfile();
        } catch (err) {
          console.warn("Self-promotion failed:", err);
        }
      };
      selfPromote();
    }

    if (isAdmin && !loadingFirebase) {
      const checkFirebaseAdmin = async () => {
        if (firebaseUser) {
          try {
            const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
            if (userDoc.exists() && userDoc.data().role === 'admin') {
              // Already confirmed
            }
          } catch (err) {
            console.error("Error checking admin status in Firestore:", err);
          }
        }
      };
      checkFirebaseAdmin();
    }
  }, [isAdmin, firebaseUser, loadingFirebase]);

  const handleFirebaseLogin = async () => {
    setFirebaseLoginLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      // Força a seleção de conta para garantir que o popup seja percebido
      provider.setCustomParameters({ prompt: 'select_account' });
      
      await signInWithPopup(auth, provider);
      import('sonner').then(({ toast }) => toast.success("Conectado ao Firebase com sucesso!"));
    } catch (err: any) {
      console.error("Erro no login Firebase:", err);
      let errorMessage = "Erro ao conectar ao Firebase";
      
      if (err.code === 'auth/popup-closed-by-user') {
        errorMessage = "O login foi cancelado. Por favor, mantenha a janela de login aberta até o fim.";
      } else if (err.code === 'auth/popup-blocked') {
        errorMessage = "O popup de login foi bloqueado pelo seu navegador. Por favor, permita popups para este site.";
      } else {
        errorMessage += ": " + err.message;
      }
      
      import('sonner').then(({ toast }) => toast.error(errorMessage));
    } finally {
      setFirebaseLoginLoading(false);
    }
  };

  const processProfiles = useCallback((profiles: any[]) => {
    // Apply normalization rules
    const normalizedProfiles = profiles.map(p => {
      const documentos_limpos = (() => {
        if (typeof p.documentos === 'string') {
          if (p.documentos.trim().startsWith('[')) {
            try {
              return JSON.parse(p.documentos);
            } catch (e) {
              return p.documentos.split(',').map((s: string) => s.trim()).filter(Boolean);
            }
          }
          return p.documentos.split(',').map((s: string) => s.trim()).filter(Boolean);
        }
        return Array.isArray(p.documentos) ? p.documentos : [];
      })();

      const status_aprovacao = p.tipo_usuario === 'paciente' ? 'aprovado' : (p.status_aprovacao || 'pendente');
      const avatar_display = p.foto_url || p.avatar_url;

      const all_docs = [
        ...(p.rg_frente_url ? [{ url: p.rg_frente_url, label: 'RG Frente' }] : []),
        ...(p.rg_verso_url ? [{ url: p.rg_verso_url, label: 'RG Verso' }] : []),
        ...(p.crefito_frente_url ? [{ url: p.crefito_frente_url, label: 'CREFITO Frente' }] : []),
        ...(p.crefito_verso_url ? [{ url: p.crefito_verso_url, label: 'CREFITO Verso' }] : []),
        ...(documentos_limpos.map((d: string, i: number) => ({ url: d, label: `Documento Adicional ${i + 1}` })))
      ];

      return {
        ...p,
        status_aprovacao,
        avatar_display,
        documentos_limpos,
        all_docs
      };
    });

    setSupabaseProfiles(normalizedProfiles);
    
    // Update Stats from Supabase Profiles
    const physios = normalizedProfiles.filter((u: any) => u.tipo_usuario === 'fisioterapeuta');
    const patients = normalizedProfiles.filter((u: any) => u.tipo_usuario === 'paciente');
    
    setStats(prev => ({
      ...prev,
      totalUsers: normalizedProfiles.length,
      activePhysios: physios.filter((p: any) => p.status_aprovacao === 'aprovado').length,
      newPatients: patients.length,
      pendingAppointments: prev.pendingAppointments // Keep existing
    }));
  }, []);

  const fetchSupabaseProfiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch profiles using the new view for administrative overview
      // Explicitly selecting id to ensure it's always returned
      const { data, error } = await supabase
        .from('admin_perfis_with_documents')
        .select('*, id');
      
      if (error) {
        console.error("Erro ao buscar perfis Supabase (view):", error);
        // Fallback retry with basic profile data
        const { data: retryData, error: retryError } = await supabase.from('perfis').select('*, id');
        if (retryError) throw retryError;
        processProfiles(retryData || []);
      } else {
        processProfiles(data || []);
      }
    } catch (err: any) {
      console.error("Erro fatal ao buscar perfis:", err);
      setError("Falha ao carregar perfis. Verifique sua conexão.");
    } finally {
      setLoading(false);
    }
  }, [processProfiles]);

  const fetchSessions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('sessoes')
        .select(`
          *,
          paciente:perfis!paciente_id (nome_completo, email),
          fisioterapeuta:perfis!fisioterapeuta_id (nome_completo, email)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setSessions(data || []);

      // Since valor_sessao in DB is now the net amount, we derive the others using commissionRate
      const paidSessions = (data || []).filter(s => s.status_pagamento === 'pago_app');
      
      const netPhysioArea = paidSessions.reduce((acc, curr) => acc + Number(curr.valor_sessao || curr.valor || 0), 0);
      const rateFactor = (100 - commissionRate) / 100;
      const totalPaidArea = netPhysioArea / (rateFactor || 0.88);
      const commissionArea = totalPaidArea * (commissionRate / 100);
      
      setStats(prev => ({ 
        ...prev, 
        totalRevenue: totalPaidArea,
        totalPaidByPatients: totalPaidArea,
        totalCommission: commissionArea,
        totalNetPhysio: netPhysioArea
      }));
    } catch (err) {
      console.error("Erro ao buscar sessões:", err);
    }
  }, [commissionRate]);

  const fetchMateriais = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('library_materials')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setMateriais(data || []);
    } catch (err) {
      console.error("Erro ao buscar materiais:", err);
    }
  }, []);

  const fetchWithdrawals = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('solicitacoes_saque')
        .select(`
          *,
          fisioterapeuta:perfis!user_id (nome_completo, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWithdrawals(data || []);
      
      const pendingCount = (data || []).filter(w => w.status === 'pendente').length;
      setStats(prev => ({ ...prev, pendingWithdrawals: pendingCount }));
    } catch (err) {
      console.error("Erro ao buscar solicitações de saque:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleUpdateWithdrawalStatus = async (id: string, newStatus: 'pago' | 'recusado') => {
    try {
      setLoading(true);
      const updateData: any = { status: newStatus };
      if (newStatus === 'pago') {
        updateData.processado_em = new Date().toISOString();
      }

      const { error } = await supabase
        .from('solicitacoes_saque')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      import('sonner').then(({ toast }) => toast.success(`Solicitação marcada como ${newStatus}!`));
      await fetchWithdrawals();
    } catch (err: any) {
      console.error("Erro ao atualizar status de saque:", err);
      import('sonner').then(({ toast }) => toast.error("Erro ao atualizar status: " + err.message));
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminNotifications = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('notificacoes_admin')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAdminNotifications(data || []);
    } catch (err) {
      console.error("Erro ao buscar notificações administrativas:", err);
    }
  }, []);

  const fetchTickets = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('suporte_tickets')
        .select(`
          *,
          usuario:perfis!usuario_id (nome_completo, email, avatar_url, foto_url)
        `)
        .order('criado_em', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (err) {
      console.error("Erro ao buscar tickets:", err);
    }
  }, []);

  const handleUpdateTicketStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('suporte_tickets')
        .update({ status: newStatus, atualizado_em: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      
      setTickets(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
      import('sonner').then(({ toast }) => toast.success("Status do ticket atualizado!"));
      
      // Notify the user about the update
      const ticket = tickets.find(t => t.id === id);
      if (ticket) {
        await supabase.from('notificacoes').insert({
          user_id: ticket.usuario_id,
          titulo: 'Atualização no seu Ticket',
          mensagem: `O status do seu ticket "${ticket.assunto}" foi alterado para: ${newStatus}`,
          tipo: 'support_update'
        });
      }
    } catch (err) {
      console.error("Erro ao atualizar ticket:", err);
      import('sonner').then(({ toast }) => toast.error("Erro ao atualizar ticket."));
    }
  };

  const handleMarkNotificationAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notificacoes_admin')
        .update({ lida: true })
        .eq('id', id);

      if (error) throw error;
      setAdminNotifications(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n));
    } catch (err) {
      console.error("Erro ao marcar notificação como lida:", err);
    }
  };

  // Real-time Data Listeners
  useEffect(() => {
    if (!isAdmin || !firebaseUser) return;

    // Listen for Users
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(usersData);
    }, (error) => {
      console.error("Erro ao ouvir usuários:", error);
    });

    fetchSupabaseProfiles();
    fetchMateriais();
    fetchSessions();
    fetchWithdrawals();
    fetchTickets();
    fetchAdminNotifications();

    // Fetch System Settings
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'commission_rate')
          .single();
        
        if (error) {
          console.warn("Could not fetch commission_rate from system_settings (expected if table not created):", error.message);
          return;
        }

        if (data) {
          setCommissionRate(Number(data.value));
        }
      } catch (err) {
        console.warn("Exception fetching system settings:", err);
      }
    };
    fetchSettings();

    // Set up a simple poll or realtime subscription for Supabase
    const channel = supabase
      .channel(`perfis-changes-${Math.random().toString(36).substring(7)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'perfis' }, () => {
        fetchSupabaseProfiles();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'library_materials' }, () => {
        fetchMateriais();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'solicitacoes_saque' }, () => {
        fetchWithdrawals();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'suporte_tickets' }, () => {
        fetchTickets();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notificacoes_admin' }, () => {
        fetchAdminNotifications();
      })
      .subscribe();

    // Listen for Payments
    const unsubPayments = onSnapshot(collection(db, 'payments'), (snapshot) => {
      const paymentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPayments(paymentsData);
      
      const revenue = paymentsData.reduce((acc, curr: any) => acc + (curr.amount || 0), 0);
      setStats(prev => ({ ...prev, totalRevenue: revenue }));
    }, (error) => {
      console.error("Erro ao ouvir pagamentos:", error);
    });

    // Listen for Pending Approvals
    const unsubApprovals = onSnapshot(
      query(collection(db, 'physiotherapists'), where('status', '==', 'pending_approval')),
      (snapshot) => {
        setPendingPhysios(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      },
      (error) => {
        console.error("Erro ao ouvir aprovações:", error);
      }
    );

    // Listen for Appointments
    const unsubAppointments = onSnapshot(
      query(collection(db, 'appointments'), where('status', '==', 'waiting')),
      (snapshot) => {
        setStats(prev => ({ ...prev, pendingAppointments: snapshot.docs.length }));
      },
      (error) => {
        console.error("Erro ao ouvir agendamentos:", error);
      }
    );

    return () => {
      unsubUsers();
      unsubPayments();
      unsubApprovals();
      unsubAppointments();
      supabase.removeChannel(channel);
    };
  }, [isAdmin, firebaseUser]);

  // Chat Listener
  useEffect(() => {
    if (!isAdmin || !selectedChatUser || !supabaseUser) return;

    let subscriptionSupabase: any;

    const fetchMessages = async () => {
      const { data: msgs, error } = await supabase
        .from('mensagens')
        .select('*')
        .or(`and(remetente.eq.${supabaseUser.id},destinatario.eq.${selectedChatUser.id}),and(remetente.eq.${selectedChatUser.id},destinatario.eq.${supabaseUser.id})`)
        .order('criado_em', { ascending: true });

      if (msgs) {
        setMessages(msgs);
      }

      subscriptionSupabase = supabase
        .channel(`admin_chat_${selectedChatUser.id}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'mensagens'
        }, (payload) => {
          const newMsg = payload.new;
          const isRelevant = 
            (newMsg.remetente === supabaseUser.id && newMsg.destinatario === selectedChatUser.id) ||
            (newMsg.remetente === selectedChatUser.id && newMsg.destinatario === supabaseUser.id);
          
          if (isRelevant) {
            fetchMessages();
          }
        })
        .subscribe();
    };

    fetchMessages();

    return () => {
      if (subscriptionSupabase) supabase.removeChannel(subscriptionSupabase);
    };
  }, [isAdmin, selectedChatUser, supabaseUser]);

  if (!mounted || loadingSupabase || checkingAdmin) return <SplashScreen />;

  if (!isAdmin) return null;

  // Se for admin mas não estiver logado no Firebase, mostra tela de conexão
  if (!firebaseUser) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4 bg-[#0B1120]">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/5 p-12 rounded-[3rem] shadow-2xl border border-white/10 max-w-md w-full text-center space-y-8 backdrop-blur-xl"
        >
          <div className="w-24 h-24 bg-blue-600/10 text-blue-400 rounded-full flex items-center justify-center mx-auto border border-blue-500/20">
            <ShieldCheck size={48} />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-white tracking-tight">{t('admin.restricted_access', 'Acesso Restrito')}</h2>
            <p className="text-slate-400 font-medium leading-relaxed">
              {t('admin.restricted_access_desc', 'Você é um administrador, mas precisa conectar sua conta ao banco de dados administrativo para ver as informações.')}
            </p>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-left">
            <div className="flex gap-3">
              <AlertTriangle className="text-amber-400 flex-shrink-0" size={20} />
              <p className="text-xs text-amber-200/70 leading-relaxed font-medium">
                {t('admin.login_popup_notice', 'Importante: Uma janela (popup) será aberta para o login. Certifique-se de que seu navegador permite popups e não feche a janela antes de concluir o processo.')}
              </p>
            </div>
          </div>

          <button
            onClick={handleFirebaseLogin}
            disabled={firebaseLoginLoading}
            className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-xl hover:bg-blue-700 transition-all shadow-2xl shadow-blue-900/40 flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {firebaseLoginLoading ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <LogIn size={24} />}
            {t('admin.connect_database', 'Conectar ao Banco de Dados')}
          </button>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">
            Use o mesmo e-mail: {supabaseUser?.email}
          </p>
        </motion.div>
      </div>
    );
  }

  const handleApprovePhysio = async (profileId: string, userId: string) => {
    if (!profileId || profileId === 'undefined') {
      console.error("ID inválido para aprovação:", profileId);
      import('sonner').then(({ toast }) => toast.error("Erro: ID de usuário inválido."));
      return;
    }

    try {
      console.log(`Aprovando fisioterapeuta: ${profileId}`);
      
      // Update Supabase - Update status_aprovacao
      const { data: updateData, error: supabaseError } = await supabase
        .from('perfis')
        .update({ status_aprovacao: 'aprovado' })
        .eq('id', profileId)
        .select();

      if (supabaseError) {
        console.error("Supabase update error:", supabaseError);
        if (supabaseError.message.includes('column')) {
          import('sonner').then(({ toast }) => toast.error("Erro: Colunas de aprovação não encontradas no banco de dados."));
        } else if (supabaseError.message.includes('permission') || supabaseError.message.includes('row-level security')) {
          import('sonner').then(({ toast }) => toast.error("Erro de permissão: Verifique se as políticas RLS do Supabase permitem que administradores editem perfis."));
        } else {
          throw supabaseError;
        }
        return;
      }

      if (!updateData || updateData.length === 0) {
        console.warn("Nenhum perfil foi atualizado no Supabase. Verifique as permissões RLS.");
        import('sonner').then(({ toast }) => toast.error("Aviso: O perfil não foi atualizado no banco de dados. Verifique as permissões RLS."));
      }

      // Update Firebase (if exists)
      try {
        await updateDoc(doc(db, 'physiotherapists', profileId), {
          status: 'approved',
          approved: true,
          status_aprovacao: 'aprovado'
        });
        await updateDoc(doc(db, 'users', userId), {
          status: 'approved',
          status_aprovacao: 'aprovado'
        });
      } catch (fbErr) {
        console.warn("Firebase update failed (might not exist):", fbErr);
      }
      
      // Create notification
      try {
        await addDoc(collection(db, 'notifications'), {
          userId,
          title: t('admin.profile_approved'),
          message: t('admin_actions.notifications.approved_msg', 'Seu perfil de fisioterapeuta foi aprovado pela administração.'),
          type: 'system',
          read: false,
          createdAt: serverTimestamp()
        });
      } catch (notifErr) {
        console.warn("Notification creation failed:", notifErr);
      }

      // Manual refresh to ensure UI updates
      await fetchSupabaseProfiles();

      // Disparar e-mail de aprovação
      const userProfile = supabaseProfiles.find(p => p.id === profileId);
      if (userProfile && userProfile.email) {
        console.log(`[Admin] [FLOW-AUDIT] Triggering approval email for ${userProfile.email}`);
        sendProfessionalApprovalEmail(userProfile.email, userProfile.nome_completo || userProfile.nome || 'Profissional', true)
          .then(res => console.log(`[Admin] [FLOW-AUDIT] Approval email result:`, res))
          .catch(err => console.error(`[Admin] [FLOW-AUDIT] Approval email error:`, err));
      } else {
        console.warn(`[Admin] [FLOW-AUDIT] Could not send approval email: User profile or email not found in state`, { profileId });
      }

      import('sonner').then(({ toast }) => toast.success(t('admin_actions.approve_success', "Fisioterapeuta aprovado com sucesso!")));
    } catch (err: any) {
      console.error("Error approving physio:", err);
      import('sonner').then(({ toast }) => toast.error(t('admin_actions.approve_error', { defaultValue: "Erro ao aprovar fisioterapeuta: " + (err.message || ""), error: err.message })));
    }
  };

  const handleRejectPhysio = async (profileId: string, userId: string) => {
    if (!profileId || profileId === 'undefined') {
      console.error("ID inválido para rejeição:", profileId);
      import('sonner').then(({ toast }) => toast.error(t('admin_actions.invalid_id', "Erro: ID de usuário inválido.")));
      return;
    }

    try {
      console.log(`Rejeitando fisioterapeuta: ${profileId}`);
      
      // Update Supabase
      const { data: updateData, error: supabaseError } = await supabase
        .from('perfis')
        .update({ status_aprovacao: 'rejeitado' })
        .eq('id', profileId)
        .select();

      if (supabaseError) {
        console.error("Supabase update error:", supabaseError);
        throw supabaseError;
      }

      if (!updateData || updateData.length === 0) {
        import('sonner').then(({ toast }) => toast.error(t('admin_actions.rls_warning', "Aviso: O perfil não foi atualizado no banco de dados. Verifique as permissões RLS.")));
      }

      // Update Firebase (if exists)
      try {
        await updateDoc(doc(db, 'physiotherapists', profileId), {
          status: 'rejected',
          approved: false,
          status_aprovacao: 'rejeitado'
        });
        await updateDoc(doc(db, 'users', userId), {
          status: 'rejected',
          status_aprovacao: 'rejeitado'
        });
      } catch (fbErr) {
        console.warn("Firebase update failed (might not exist):", fbErr);
      }
      
      // Create notification
      try {
        await addDoc(collection(db, 'notifications'), {
          userId,
          title: t('admin.profile_rejected'),
          message: t('admin_actions.notifications.rejected_msg', 'Infelizmente seu perfil não foi aprovado. Entre em contato com o suporte para mais detalhes.'),
          type: 'system',
          read: false,
          createdAt: serverTimestamp()
        });
      } catch (notifErr) {
        console.warn("Notification creation failed:", notifErr);
      }

      // Manual refresh
      await fetchSupabaseProfiles();

      // Disparar e-mail de rejeição
      const userProfile = supabaseProfiles.find(p => p.id === profileId);
      if (userProfile && userProfile.email) {
        console.log(`[Admin] [FLOW-AUDIT] Triggering rejection email for ${userProfile.email}`);
        sendProfessionalApprovalEmail(userProfile.email, userProfile.nome_completo || userProfile.nome || 'Profissional', false)
          .then(res => console.log(`[Admin] [FLOW-AUDIT] Rejection email result:`, res))
          .catch(err => console.error(`[Admin] [FLOW-AUDIT] Rejection email error:`, err));
      }

      import('sonner').then(({ toast }) => toast.success(t('admin_actions.reject_success', "Fisioterapeuta rejeitado.")));
    } catch (err: any) {
      console.error("Error rejecting physio:", err);
      import('sonner').then(({ toast }) => toast.error(t('admin_actions.reject_error', { defaultValue: "Erro ao rejeitar fisioterapeuta: " + (err.message || ""), error: err.message })));
    }
  };

  const handleBlockUser = async (userId: string, currentStatus: string) => {
    if (!userId || userId === 'undefined') {
      console.error("ID inválido para bloquear usuário:", userId);
      import('sonner').then(({ toast }) => toast.error(t('admin_actions.invalid_id', "Erro: ID de usuário inválido.")));
      return;
    }

    const isBlocked = currentStatus === 'rejeitado' || currentStatus === 'blocked' || currentStatus === 'bloqueado';
    const newAction = isBlocked ? t('admin_actions.unblock_action', 'desbloquear') : t('admin_actions.block_action', 'bloquear');
    
    if (!window.confirm(t('admin_actions.block_confirm', { defaultValue: `Deseja realmente ${newAction} este usuário?`, action: newAction }))) return;

    setLoading(true);
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (!currentSession) {
        import('sonner').then(({ toast }) => toast.error(t('admin_actions.session_expired', "Sua sessão expirou.")));
        return;
      }

      console.log(`[Admin] Solicitando ${newAction} para usuário: ${userId}`);

      const response = await fetch('/api/admin/block-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentSession.access_token}`
        },
        body: JSON.stringify({ 
          userId,
          accessToken: currentSession.access_token,
          block: !isBlocked
        })
      });

      const data = await response.json();

      if (response.ok) {
        import('sonner').then(({ toast }) => toast.success(isBlocked ? t('admin_actions.unblock_success', 'Usuário desbloqueado com sucesso!') : t('admin_actions.block_success', 'Usuário bloqueado com sucesso!')));
        await fetchSupabaseProfiles();
      } else {
        console.error("[Admin] Erro ao bloquear via API:", data);
        import('sonner').then(({ toast }) => toast.error(t('admin_actions.block_error', { defaultValue: "Erro ao alterar status: " + (data.error || "Erro desconhecido"), error: data.error })));
      }
    } catch (err: any) {
      console.error("Erro fatal ao bloquear usuário:", err);
      import('sonner').then(({ toast }) => toast.error(t('admin_actions.server_error', "Erro na conexão com o servidor.")));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!userId || userId === 'undefined') {
      console.error("ID inválido para exclusão:", userId);
      import('sonner').then(({ toast }) => toast.error(t('admin_actions.invalid_id', "Erro: ID de usuário inválido.")));
      return;
    }
    
    if (!window.confirm(t('admin_actions.delete_confirm', "Tem certeza que deseja excluir permanentemente este usuário da plataforma e do banco de dados de autenticação? Esta ação não pode ser desfeita."))) return;
    
    setLoading(true);
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (!currentSession) {
        import('sonner').then(({ toast }) => toast.error("Sua sessão expirou."));
        return;
      }

      console.log(`[Admin] Solicitando exclusão completa do usuário: ${userId}`);

      let response;
      try {
        response = await fetch('/api/admin/delete-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentSession.access_token}`
          },
          body: JSON.stringify({ 
            userId,
            accessToken: currentSession.access_token
          })
        });
      } catch (fetchErr: any) {
        console.error("[Admin] Falha crítica no fetch:", fetchErr);
        throw new Error(`Falha de rede/conexão: ${fetchErr.message}`);
      }

      let data;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const textError = await response.text();
        console.error("[Admin] Resposta não-JSON recebida:", textError);
        throw new Error(`Erro do servidor (${response.status}): ${textError.slice(0, 100)}`);
      }

      if (response.ok) {
        setSupabaseProfiles(prev => prev.filter(p => p.id !== userId));
        import('sonner').then(({ toast }) => toast.success(t('admin_actions.delete_success', "Usuário removido com sucesso de todo o sistema.")));
        console.log("[Admin] Usuário deletado com sucesso:", data);
      } else {
        console.error("[Admin] Erro na exclusão via API:", data);
        import('sonner').then(({ toast }) => toast.error(t('admin_actions.delete_error', { defaultValue: "Erro ao excluir usuário: " + (data.error || "Erro desconhecido"), error: data.error })));
      }
    } catch (err: any) {
      console.error("Erro fatal ao excluir usuário:", err);
      const detail = err.message || "Erro desconhecido";
      import('sonner').then(({ toast }) => toast.error(t('admin_actions.delete_fail', { defaultValue: `Falha na exclusão: ${detail}`, error: detail })));
    } finally {
      setLoading(false);
    }
  };

  const handleCleanupOrphans = async () => {
    if (!window.confirm(t('admin_actions.cleanup.confirm', "Deseja remover perfis incompletos (sem nome ou email)? Isso ajuda a limpar registros de testes ou falhas no cadastro."))) return;
    
    try {
      const { data: orphans, error: fetchError } = await supabase
        .from('perfis')
        .select('id')
        .or('nome_completo.is.null,email.is.null,nome.is.null');
      
      if (fetchError) throw fetchError;
      
      if (!orphans || orphans.length === 0) {
        import('sonner').then(({ toast }) => toast.info(t('admin_actions.cleanup.none_found', "Nenhum registro órfão encontrado.")));
        return;
      }

      const idsToDelete = orphans.map(o => o.id);
      const { error: deleteError } = await supabase
        .from('perfis')
        .delete()
        .in('id', idsToDelete);

      if (deleteError) throw deleteError;

      setSupabaseProfiles(prev => prev.filter(p => !idsToDelete.includes(p.id)));
      import('sonner').then(({ toast }) => toast.success(t('admin_actions.cleanup.success', { defaultValue: `${idsToDelete.length} registros órfãos removidos!`, count: idsToDelete.length })));
    } catch (err) {
      console.error("Error cleaning orphans:", err);
      import('sonner').then(({ toast }) => toast.error(t('admin_actions.cleanup.error', "Erro ao limpar registros.")));
    }
  };

  const handleFixAdminRoleConflict = async () => {
    const adminEmail = 'hogolezcano92@gmail.com';
    if (!window.confirm(t('admin_actions.conflict.confirm', { defaultValue: `Deseja corrigir o conflito de papéis para ${adminEmail}? Isso garantirá que o usuário seja apenas Administrador em todos os bancos de dados.`, email: adminEmail }))) return;

    setLoading(true);
    try {
      // 1. Localizar usuário no Supabase
      const { data: profile, error: profileError } = await supabase
        .from('perfis')
        .select('id')
        .eq('email', adminEmail)
        .maybeSingle();

      if (profileError) throw profileError;

      if (profile) {
        // Atualizar papel no Supabase
        await supabase
          .from('perfis')
          .update({ tipo_usuario: 'admin', plano: 'admin' })
          .eq('id', profile.id);
        console.log("Admin role updated in Supabase.");
      }

      // 2. Limpar Firestore
      const { deleteDoc, doc: firestoreDoc, getDocs, query, collection, where, updateDoc: firestoreUpdateDoc } = await import('firebase/firestore');
      
      // Coleções para limpar (onde o admin não deve estar como fisio)
      const collectionsToClean = ['physiotherapists', 'therapists', 'fisios', 'fisioterapeutas'];
      
      for (const collName of collectionsToClean) {
        try {
          const q = query(collection(db, collName), where('email', '==', adminEmail));
          const snapshot = await getDocs(q);
          for (const docSnap of snapshot.docs) {
            await deleteDoc(firestoreDoc(db, collName, docSnap.id));
            console.log(`Deleted admin from Firestore collection: ${collName}`);
          }
          
          // Tentar também deletar por ID se o ID do perfil for igual ao ID do documento
          if (profile) {
            await deleteDoc(firestoreDoc(db, collName, profile.id)).catch(() => {});
          }
        } catch (err) {
          console.warn(`Error cleaning collection ${collName}:`, err);
        }
      }

      // 3. Garantir role admin no users do Firestore
      try {
        const userQ = query(collection(db, 'users'), where('email', '==', adminEmail));
        const userSnapshot = await getDocs(userQ);
        for (const docSnap of userSnapshot.docs) {
          await firestoreUpdateDoc(firestoreDoc(db, 'users', docSnap.id), { role: 'admin' });
          console.log(`Updated admin role in Firestore users collection.`);
        }
      } catch (err) {
        console.warn("Error updating users collection in Firestore:", err);
      }

      await fetchSupabaseProfiles();
      if (refreshProfile) await refreshProfile();
      
      import('sonner').then(({ toast }) => toast.success(t('admin_actions.conflict.success', "Conflito de papéis resolvido com sucesso!")));
    } catch (err: any) {
      console.error("Erro ao resolver conflito:", err);
      import('sonner').then(({ toast }) => toast.error(t('admin_actions.conflict.error', { defaultValue: "Erro ao resolver conflito: " + err.message, error: err.message })));
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChatUser || !supabaseUser) return;

    try {
      const { error } = await supabase
        .from('mensagens')
        .insert({
          remetente: supabaseUser.id,
          destinatario: selectedChatUser.id,
          mensagem: newMessage,
          criado_em: new Date().toISOString(),
          lida: false
        });

      if (error) throw error;
      
      // Notify user
      await supabase
        .from('notificacoes')
        .insert({
          user_id: selectedChatUser.id,
          titulo: t('admin_actions.support_msg.title', 'Nova mensagem do Suporte'),
          mensagem: t('admin_actions.support_msg.message', 'A administração respondeu ao seu chamado.'),
          tipo: 'message',
          lida: false,
          link: '/chat'
        });

      setNewMessage('');
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  const handleSaveSettings = async () => {
    try {
      // Update Supabase
      const { error: supabaseError } = await supabase
        .from('system_settings')
        .upsert({ key: 'commission_rate', value: commissionRate.toString() }, { onConflict: 'key' });

      if (supabaseError) throw supabaseError;

      // Update Firebase for redundancy/realtime
      await addDoc(collection(db, 'settings'), {
        commissionRate,
        updatedAt: serverTimestamp(),
        updatedBy: firebaseUser?.uid
      });
      import('sonner').then(({ toast }) => toast.success(t('admin_actions.settings.success', "Configurações salvas com sucesso!")));
    } catch (err) {
      console.error("Error saving settings:", err);
      import('sonner').then(({ toast }) => toast.error(t('admin_actions.settings.error', "Erro ao salvar configurações.")));
    }
  };

  const uploadFile = async (file: File, bucket: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleMarkAsRepassado = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('sessoes')
        .update({ status_repasse: 'repassado_fisio' })
        .eq('id', sessionId);
      
      if (error) throw error;
      
      import('sonner').then(({ toast }) => toast.success(t('admin_actions.repasse.success', "Repasse marcado como concluído!")));
      fetchSessions();
    } catch (err) {
      console.error("Erro ao marcar repasse:", err);
      import('sonner').then(({ toast }) => toast.error(t('admin_actions.repasse.error', "Erro ao atualizar status de repasse.")));
    }
  };

  const handleAutoCategorize = async () => {
    if (!newMaterial.title || !newMaterial.description) {
      import('sonner').then(({ toast }) => toast.error(t('admin_actions.material.fill_fields', "Preencha título e descrição primeiro.")));
      return;
    }
    setIsCategorizing(true);
    try {
      const category = await categorizeContent(newMaterial.title, newMaterial.description);
      setNewMaterial(prev => ({ ...prev, category }));
      import('sonner').then(({ toast }) => toast.success(t('admin_actions.material.categorized_as', { defaultValue: `Categorizado como: ${category}`, category })));
    } catch (error) {
      console.error(error);
    } finally {
      setIsCategorizing(false);
    }
  };

  const handleGenerateAIContent = async () => {
    if (!aiGenForm.theme) {
      import('sonner').then(({ toast }) => toast.error(t('admin_actions.ai_generation.enter_theme', "Digite um tema para o conteúdo.")));
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch('/api/library/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          theme: aiGenForm.theme,
          type: aiGenForm.type,
          level: aiGenForm.level
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMsg = t('admin_actions.ai_generation.error', "Erro ao gerar conteúdo");
        try {
          const errorData = JSON.parse(errorText);
          errorMsg = errorData.error || errorMsg;
        } catch (e) {
          errorMsg = errorText || errorMsg;
        }
        throw new Error(errorMsg);
      }

      const material = await response.json();
      
      import('sonner').then(({ toast }) => toast.success(t('admin_actions.ai_generation.success', "Conteúdo gerado e publicado com sucesso!")));
      setAiGenForm({ ...aiGenForm, theme: '' });
      fetchMateriais();
    } catch (error: any) {
      console.error(error);
      import('sonner').then(({ toast }) => toast.error(t('admin_actions.ai_generation.gen_error', { defaultValue: `Erro ao gerar: ${error.message}`, error: error.message })));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddMaterial = async () => {
    const precoNum = parseFloat(newMaterial.price);
    
    if (!newMaterial.title || (newMaterial.is_premium && isNaN(precoNum))) {
      import('sonner').then(({ toast }) => toast.error(t('admin_actions.material.fill_fields', "Preencha o título e o preço corretamente.")));
      return;
    }

    setUploading(true);
    try {
      let finalImageUrl = newMaterial.cover_image;
      let finalArquivoUrl = newMaterial.file_url;

      // Upload image if selected
      if (imageFile) {
        finalImageUrl = await uploadFile(imageFile, 'materiais');
      }

      // Upload file if selected
      if (materialFile) {
        finalArquivoUrl = await uploadFile(materialFile, 'materiais');
      }

      const { error } = await supabase
        .from('library_materials')
        .insert([{
          title: newMaterial.title,
          description: newMaterial.description,
          clinical_objective: newMaterial.clinical_objective,
          level: newMaterial.level,
          type: newMaterial.type,
          price: newMaterial.is_premium ? precoNum : 0,
          is_premium: newMaterial.is_premium,
          cover_image: finalImageUrl,
          file_url: finalArquivoUrl,
          category: newMaterial.category === 'Sendo categorizado...' ? 'Reabilitação' : newMaterial.category,
          sections: newMaterial.sections
        }]);
      
      if (error) {
        console.error("Erro Supabase:", error);
        throw new Error(error.message);
      }
      
      import('sonner').then(({ toast }) => toast.success(t('admin_actions.material.add_success', "Material adicionado com sucesso!")));
      setShowMaterialModal(false);
      setImageFile(null);
      setMaterialFile(null);
      setNewMaterial({
        title: '',
        description: '',
        clinical_objective: '',
        level: 'beginner',
        type: 'educational',
        price: '',
        is_premium: false,
        cover_image: '',
        file_url: '',
        category: 'Sendo categorizado...',
        sections: []
      });
      fetchMateriais();
    } catch (err: any) {
      console.error("Erro ao adicionar material:", err);
      import('sonner').then(({ toast }) => toast.error(t('admin_actions.material.add_error', { defaultValue: `Erro ao adicionar: ${err.message || 'Verifique se a tabela e o bucket materiais existem no Supabase'}`, error: err.message || t('admin_actions.material.check_supabase') })));
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteMaterial = async (id: string) => {
    if (!window.confirm(t('admin_actions.material.delete_confirm', "Tem certeza que deseja excluir este material?"))) return;
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (!currentSession) {
        import('sonner').then(({ toast }) => toast.error(t('admin_actions.session_expired', "Sua sessão expirou. Por favor, faça login novamente.")));
        return;
      }

      // Use the new secure server-side endpoint to avoid RLS/JWT issues on the frontend
      const response = await fetch('/api/library/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          accessToken: currentSession.access_token
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || t('admin_actions.material.delete_error', "Erro ao excluir material"));
      }
      
      fetchMateriais();
      import('sonner').then(({ toast }) => toast.success(t('admin_actions.material.delete_success', "Material excluído com sucesso!")));
    } catch (err: any) {
      console.error("Erro ao excluir material:", err);
      import('sonner').then(({ toast }) => toast.error(t('admin_actions.material.delete_error', { defaultValue: `Erro ao excluir: ${err.message || 'Erro desconhecido'}`, error: err.message })));
    }
  };

  // Memoized Filtered Lists for Performance
  const filteredSupabaseProfiles = useMemo(() => {
    return supabaseProfiles.filter(p => {
      const search = debouncedSearch.toLowerCase();
      const name = (p.nome_completo || '').toLowerCase();
      const email = (p.email || '').toLowerCase();
      return name.includes(search) || email.includes(search);
    });
  }, [supabaseProfiles, debouncedSearch]);

  const filteredPhysios = useMemo(() => {
    return supabaseProfiles.filter(p => 
      (p.tipo_usuario || '').toLowerCase() === 'fisioterapeuta' &&
      ((p.nome_completo || '').toLowerCase().includes(debouncedSearch.toLowerCase()) ||
       (p.crefito || '').toLowerCase().includes(debouncedSearch.toLowerCase()))
    );
  }, [supabaseProfiles, debouncedSearch]);

  const filteredPatients = useMemo(() => {
    return supabaseProfiles.filter(p => 
      (p.tipo_usuario || '').toLowerCase() === 'paciente' &&
      ((p.nome_completo || '').toLowerCase().includes(debouncedSearch.toLowerCase()) ||
       (p.email || '').toLowerCase().includes(debouncedSearch.toLowerCase()))
    );
  }, [supabaseProfiles, debouncedSearch]);

  const filteredApprovals = useMemo(() => {
    return supabaseProfiles.filter(p => 
      (p.tipo_usuario === 'fisioterapeuta') && 
      (p.status_aprovacao === 'pendente' || !p.status_aprovacao)
    );
  }, [supabaseProfiles]);

  const filteredMaterials = useMemo(() => {
    return materiais.filter(m => 
      (m.title || '').toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      (m.category || '').toLowerCase().includes(debouncedSearch.toLowerCase())
    );
  }, [materiais, debouncedSearch]);

  const filteredWithdrawals = useMemo(() => {
    return withdrawals.filter(w => {
      if (withdrawalFilter === 'todos') return true;
      return w.status === withdrawalFilter;
    });
  }, [withdrawals, withdrawalFilter]);

  const filteredTickets = useMemo(() => {
    return tickets.filter(t => 
      (t.assunto || t.subject || '').toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      (t.usuario?.nome_completo || '').toLowerCase().includes(debouncedSearch.toLowerCase())
    );
  }, [tickets, debouncedSearch]);

  const STATS_CARDS = useMemo(() => [
    { label: t('admin.dashboard.kpi.users', 'Total de Usuários'), value: stats.totalUsers.toString(), icon: Users, color: 'blue' },
    { label: t('admin.dashboard.kpi.physios', 'Fisios Ativos'), value: stats.activePhysios.toString(), icon: UserCheck, color: 'emerald' },
    { label: t('admin.dashboard.kpi.revenue', 'Total Faturado'), value: `R$ ${stats.totalPaidByPatients.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: DollarSign, color: 'indigo' },
    { label: t('admin.dashboard.kpi.net_physio', 'Líquido Fisio'), value: `R$ ${stats.totalNetPhysio.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: Activity, color: 'emerald' },
  ], [stats, t]);

  if (!mounted || checkingAdmin) {
    return <SplashScreen />;
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="flex min-h-screen admin-dashboard font-sans -mx-4 sm:-mx-6 lg:-mx-8 -my-8 overflow-x-hidden relative">
      {/* User Detail Modal */}
      <AnimatePresence>
        {selectedUserDetail && (
          <div className="fixed inset-0 z-[50] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedUserDetail(null)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white/90 backdrop-blur-xl w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-white/20"
            >
              {/* Modal Header */}
              <div className="p-8 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-black text-2xl overflow-hidden shadow-lg shadow-blue-500/20">
                    {selectedUserDetail.foto_url || selectedUserDetail.avatar_url ? (
                      <img src={selectedUserDetail.foto_url || selectedUserDetail.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      selectedUserDetail.nome_completo?.charAt(0)
                    )}
                  </div>
                  <div>
                    <h3 className="text-2xl admin-title tracking-tight">{selectedUserDetail.nome_completo}</h3>
                    <p className="admin-text-secondary font-bold uppercase tracking-widest text-[10px]">{selectedUserDetail.tipo_usuario}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedUserDetail(null)}
                  className="p-3 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-2xl border border-slate-100 transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                {/* Basic Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">E-mail</p>
                    <p className="text-sm font-bold text-slate-900 break-all">{selectedUserDetail.email}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Telefone</p>
                    <p className="text-sm font-bold text-slate-900">{selectedUserDetail.telefone || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CPF</p>
                    <p className="text-sm font-bold text-slate-900">{selectedUserDetail.cpf_cnpj || selectedUserDetail.cpf || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CREFITO</p>
                    <p className="text-sm font-bold text-slate-900">{selectedUserDetail.crefito || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Especialidade</p>
                    <p className="text-sm font-bold text-slate-900">{selectedUserDetail.especialidade || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cidade/UF</p>
                    <p className="text-sm font-bold text-slate-900">
                      {selectedUserDetail.cidade || 'N/A'}{selectedUserDetail.estado ? ` - ${selectedUserDetail.estado}` : ''}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CEP</p>
                    <p className="text-sm font-bold text-slate-900">{selectedUserDetail.cep || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('admin_users.details.country', 'País')}</p>
                    <p className="text-sm font-bold text-slate-900">{selectedUserDetail.pais || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('admin_users.details.registered_at', 'Cadastro em')}</p>
                    <p className="text-sm font-bold text-slate-900">
                      {selectedUserDetail.created_at ? new Date(selectedUserDetail.created_at).toLocaleDateString('pt-BR') : 'N/A'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('admin_users.details.birth_date', 'Data de Nascimento')}</p>
                    <p className="text-sm font-bold text-slate-900">
                      {selectedUserDetail.data_nascimento ? new Date(selectedUserDetail.data_nascimento).toLocaleDateString('pt-BR') : 'N/A'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('admin_users.details.session_price', 'Preço Sessão')}</p>
                    <p className="text-sm font-bold text-slate-900">
                      {selectedUserDetail.preco_sessao ? `R$ ${selectedUserDetail.preco_sessao}` : 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Bio */}
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('admin_users.details.bio', 'Sobre / Bio')}</p>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm text-slate-600 leading-relaxed italic">
                    {selectedUserDetail.bio || t('admin_users.details.no_bio', 'Nenhuma biografia informada.')}
                  </div>
                </div>

                {/* Academic & Services */}
                {selectedUserDetail.tipo_usuario === 'fisioterapeuta' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('admin_users.details.education', 'Formação Acadêmica')}</p>
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm text-slate-700">
                        {Array.isArray(selectedUserDetail.formacao_academica) && selectedUserDetail.formacao_academica.length > 0 ? (
                          <ul className="list-disc list-inside space-y-1">
                            {selectedUserDetail.formacao_academica.map((item: string, i: number) => (
                              <li key={i}>{item}</li>
                            ))}
                          </ul>
                        ) : t('admin_users.details.not_informed', 'Não informada')}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('admin_users.details.services', 'Serviços Ofertados')}</p>
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm text-slate-700">
                        {Array.isArray(selectedUserDetail.servicos_ofertados) && selectedUserDetail.servicos_ofertados.length > 0 ? (
                          <ul className="list-disc list-inside space-y-1">
                            {selectedUserDetail.servicos_ofertados.map((item: string, i: number) => (
                              <li key={i}>{item}</li>
                            ))}
                          </ul>
                        ) : t('admin_users.details.not_informed', 'Não informada')}
                      </div>
                    </div>
                  </div>
                )}

                {/* Documents */}
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('admin_users.details.documents', 'Documentos (Obrigatórios e Adicionais)')}</p>
                  {(() => {
                    const docs = selectedUserDetail.all_docs;
                    
                    if (docs && docs.length > 0) {
                      return (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {docs.map((doc: { url: string, label: string }, idx: number) => (
                            <a 
                              key={idx} 
                              href={resolveStorageUrl(doc.url)} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl hover:border-blue-500/50 hover:bg-white transition-all group"
                            >
                              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
                                <FileIcon size={20} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-slate-900 truncate">{doc.label}</p>
                                <p className="text-[10px] text-slate-400 font-medium truncate">{t('admin_users.details.click_to_view', 'Clique para visualizar')}</p>
                              </div>
                              <Download size={16} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
                            </a>
                          ))}
                        </div>
                      );
                    }
                    
                    return (
                      <div className="p-8 border-2 border-dashed border-slate-200 rounded-[2rem] text-center">
                        <p className="text-sm text-slate-400 font-bold uppercase tracking-widest text-[10px]">{t('admin_users.details.no_docs', 'Sem documentos de cadastro')}</p>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-8 border-t border-slate-100 flex gap-4">
                {selectedUserDetail.status_aprovacao === 'pendente' ? (
                  <>
                    <button 
                      onClick={() => {
                        handleApprovePhysio(selectedUserDetail?.id, selectedUserDetail?.id);
                        setSelectedUserDetail(null);
                      }}
                      className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20"
                    >
                      {t('admin_users.details.approve_btn', 'Aprovar Cadastro')}
                    </button>
                    <button 
                      onClick={() => {
                        handleRejectPhysio(selectedUserDetail?.id, selectedUserDetail?.id);
                        setSelectedUserDetail(null);
                      }}
                      className="flex-1 py-4 bg-rose-50 text-rose-600 rounded-2xl font-black text-sm hover:bg-rose-100 transition-all"
                    >
                      {t('admin_users.details.reject_btn', 'Rejeitar')}
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => setSelectedUserDetail(null)}
                    className="w-full py-4 bg-slate-100 text-slate-900 rounded-2xl font-black text-sm hover:bg-slate-200 transition-all border border-slate-200"
                  >
                    {t('admin_users.details.close_btn', 'Fechar Detalhes')}
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile Sidebar Backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-slate-950/20 backdrop-blur-sm z-[40] lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-[45] w-64 admin-sidebar transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0",
          !sidebarOpen ? "-translate-x-full lg:w-20" : "translate-x-0"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="h-20 flex items-center justify-between px-6 border-b border-white/5">
            <div className={cn("flex items-center gap-2 overflow-visible transition-all whitespace-nowrap min-w-0 flex-1", !sidebarOpen && "lg:hidden")}>
              <Logo size="sm" variant="light" />
            </div>
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-xl hover:bg-white/5 text-white/40 transition-all active:scale-95 flex-shrink-0"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>

          {/* Nav Links */}
          <nav className="flex-1 py-6 px-3 space-y-1 custom-scrollbar overflow-y-auto">
            {[
              { id: 'dashboard', label: t('admin.sidebar.dashboard', 'Dashboard'), icon: LayoutDashboard },
              { id: 'viva', label: t('admin.sidebar.viva', 'Viva AI Platform'), icon: Brain, isAI: true },
              { id: 'logs', label: t('admin.sidebar.logs', 'Audit Timeline'), icon: History },
              { id: 'security', label: t('admin.sidebar.security', 'Security & LGPD'), icon: Shield },
              { id: 'materiais', label: t('admin.sidebar.library', 'Library Assets'), icon: BookOpen },
              { id: 'physios', label: t('admin.sidebar.professionals', 'Professionals'), icon: Stethoscope },
              { id: 'patients', label: t('admin.sidebar.patients', 'Patient Base'), icon: User },
              { id: 'approvals', label: t('admin.sidebar.approvals', 'Verification Queue'), icon: UserCheck },
              { id: 'users', label: t('admin.sidebar.users', 'Global Directory'), icon: Users },
              { id: 'financial', label: t('admin.sidebar.financial', 'Revenue Center'), icon: DollarSign },
              { id: 'saques', label: t('admin.sidebar.payouts', 'Payout Requests'), icon: CreditCard },
              { id: 'tickets', label: t('admin.sidebar.tickets', 'Support Desk'), icon: AlertTriangle },
              { id: 'chat', label: t('admin.sidebar.support', 'Central Chat'), icon: MessageSquare },
              { id: 'notifications', label: t('admin.sidebar.notifications', 'System Alerts'), icon: Bell },
              { id: 'settings', label: t('admin.sidebar.settings', 'Global Settings'), icon: Settings },
            ].map((item: any) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  navigate(`/admin?tab=${item.id}`);
                  if (window.innerWidth < 1024) setSidebarOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all group",
                  activeTab === item.id 
                    ? "sidebar-item-active shadow-sm" 
                    : "text-white/60 hover:text-white hover:bg-white/5"
                )}
              >
                <item.icon size={20} className={cn("flex-shrink-0", activeTab === item.id ? "text-[#06b6d4]" : "text-white/40 group-hover:text-[#06b6d4]")} />
                <span className={cn("transition-opacity", !sidebarOpen && "lg:hidden")}>{item.label}</span>
              </button>
            ))}

            {/* Logout Button moved inside Nav */}
            <div className="pt-2 mt-2 border-t border-white/5">
              <button
                onClick={() => {
                  signOut().then(() => navigate('/'));
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-rose-400 hover:bg-rose-400/10 transition-all",
                  !sidebarOpen && "lg:justify-center"
                )}
              >
                <LogOut size={20} className="flex-shrink-0" />
                <span className={cn(!sidebarOpen && "lg:hidden")}>{t('admin.sidebar.logout', 'Sair da Conta')}</span>
              </button>
            </div>
          </nav>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-white/5">
            <div className={cn(
              "flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5 transition-all",
              !sidebarOpen && "lg:justify-center lg:p-2"
            )}>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-lg flex-shrink-0 shadow-lg overflow-hidden">
                {authProfile?.avatar_url || authProfile?.foto_url ? (
                  <img 
                    src={authProfile.avatar_url || authProfile.foto_url} 
                    alt="" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  firebaseUser?.email?.charAt(0).toUpperCase() || 'H'
                )}
              </div>
              <div className={cn("flex-1 min-w-0 transition-all duration-300", !sidebarOpen && "lg:hidden lg:opacity-0 lg:w-0")}>
                <p className="text-sm font-black text-white truncate">Admin Master</p>
                <p className="text-[10px] font-bold text-white/40 truncate uppercase tracking-widest">{firebaseUser?.email || 'hogolezcano92@gmail.com'}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 w-full overflow-x-hidden">
        {/* Header */}
        <header className="sticky top-0 z-40 w-full bg-white/60 backdrop-blur-xl border-b border-slate-200/40 shadow-sm pt-[env(safe-area-inset-top)]">
          <div className="w-full px-4 sm:px-10 h-16 sm:h-20 flex items-center justify-between gap-4">
            {/* Left Section */}
            <div className="flex-1 flex items-center min-w-0">
              <button 
                className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-all active:scale-95" 
                onClick={() => setSidebarOpen(true)}
              >
                <Menu size={24} />
              </button>
            </div>

            {/* Center Section - Title */}
            <div className="flex-[2] flex justify-center min-w-0">
              <h2 className="text-sm md:text-base admin-title tracking-[0.15em] uppercase text-center truncate px-2">
                {activeTab === 'dashboard' ? t('admin.header.overview', 'Overview') : 
                 activeTab === 'materiais' ? t('admin.header.library', 'Library') :
                 activeTab === 'physios' ? t('admin.header.professionals', 'Professionals') :
                 activeTab === 'patients' ? t('admin.header.patients', 'Patients') :
                 activeTab === 'approvals' ? t('admin.header.approvals', 'Approvals') :
                 activeTab === 'users' ? t('admin.header.user_directory', 'User Directory') :
                 activeTab === 'financial' ? t('admin.header.financials', 'Financials') :
                 activeTab === 'chat' ? t('admin.header.support', 'Support') :
                 activeTab === 'logs' ? t('admin.header.audit_logs', 'Audit Logs') :
                 activeTab === 'security' ? t('admin.header.security', 'Security') :
                 activeTab === 'viva' ? t('admin.header.viva_ai', 'Viva AI') :
                 activeTab === 'settings' ? t('admin.header.settings', 'Settings') :
                 activeTab.replace(/([A-Z])/g, ' $1').trim()}
              </h2>
            </div>

            {/* Right Section - Actions */}
            <div className="flex-1 flex items-center justify-end gap-2 sm:gap-4 min-w-0">
              <div className="relative hidden md:block">
                <Search 
                  className="absolute pointer-events-none z-20" 
                  style={{ left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#94a3b8' }}
                />
                <input 
                  type="text" 
                  placeholder={t('admin.header.search_placeholder', 'Universal Search...')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white focus:border-blue-500/30 transition-all w-32 lg:w-64"
                />
              </div>

              <div className="flex items-center gap-2">
                <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-all relative">
                  <Bell size={20} />
                  <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-8 space-y-8 overflow-x-hidden custom-scrollbar">
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="admin-text-secondary font-bold uppercase tracking-widest text-[10px]">{t('admin.status.syncing', 'Syncing Core Systems...')}</p>
            </div>
          )}

          {error && !loading && (
            <div className="bg-rose-50 p-8 rounded-[2.5rem] border border-rose-100 text-center space-y-4">
              <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">{t('admin.status.outage', 'System Outage')}</h3>
              <p className="admin-text-secondary text-sm max-w-md mx-auto">{error}</p>
              <button 
                onClick={() => fetchSupabaseProfiles()}
                className="px-8 py-3 bg-white text-slate-900 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all border border-slate-200"
              >
                {t('admin.status.reconnect', 'Reconnect')}
              </button>
            </div>
          )}

          {!loading && !error && activeTab === 'dashboard' && (
            <AdminDashboard />
          )}

          {!loading && !error && activeTab === 'logs' && (
            <AdminLogs />
          )}

          {!loading && !error && activeTab === 'security' && (
            <AdminSecurity />
          )}

          {!loading && !error && activeTab === 'viva' && (
            <AdminViva />
          )}

          {activeTab === 'materiais' && (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl admin-title tracking-tight">{t('admin.library.title', 'Biblioteca de Saúde')}</h3>
                  <p className="admin-text-secondary font-medium">{t('admin.library.desc', 'Gerencie os materiais disponíveis para venda aos pacientes.')}</p>
                </div>
                <button 
                  onClick={() => setShowMaterialModal(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20"
                >
                  <Plus size={20} />
                  {t('admin.library.new_material', 'Novo Material (Manual)')}
                </button>
              </div>

              {/* AI GENERATOR SECTION */}
              <div className="p-8 admin-card relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                   <Sparkles size={120} className="text-[#06b6d4]" />
                </div>
                <div className="relative z-10 flex flex-col lg:flex-row gap-8 items-start">
                  <div className="space-y-4 max-w-sm">
                    <div className="inline-flex items-center gap-2 px-3 py-1 sidebar-item-active rounded-lg text-[10px] font-black uppercase tracking-widest">
                      <Sparkles size={12} />
                      {t('admin.library.ai_generator', 'IA Content Creator')}
                    </div>
                    <h3 className="text-xl admin-title">{t('admin.library.ai_gen_title', 'Geração Automática')}</h3>
                    <p className="admin-text-secondary text-sm leading-relaxed font-medium">
                      {t('admin.library.ai_gen_desc', 'Crie materiais educativos completos apenas informando o tema. A IA gerará títulos, descrições e roteiros clínicos prontos para o paciente.')}
                    </p>
                  </div>

                  <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1 md:col-span-3">
                       <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('admin.library.theme_label', 'Tema do Conteúdo')}</label>
                       <input 
                        type="text"
                        value={aiGenForm.theme}
                        onChange={(e) => setAiGenForm({ ...aiGenForm, theme: e.target.value })}
                        placeholder="Ex: Exercícios para dor ciática em casa ou Prevenção de lesões no corredor"
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/40"
                      />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{t('admin.library.type_label', 'Tipo')}</label>
                        <select 
                          value={aiGenForm.type}
                          onChange={(e) => setAiGenForm({...aiGenForm, type: e.target.value})}
                          className="w-full px-4 py-3 bg-slate-950/80 border border-white/10 rounded-xl text-white outline-none"
                        >
                          <option value="educational">{t('admin.library.educational', 'Educativo')}</option>
                          <option value="exercise">{t('admin.library.exercise', 'Exercício')}</option>
                          <option value="alert">{t('admin.library.alert', 'Alerta/Prevenção')}</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{t('admin.library.level_label', 'Nível')}</label>
                        <select 
                          value={aiGenForm.level}
                          onChange={(e) => setAiGenForm({...aiGenForm, level: e.target.value})}
                          className="w-full px-4 py-3 bg-slate-950/80 border border-white/10 rounded-xl text-white outline-none"
                        >
                          <option value="beginner">{t('admin.library.beginner', 'Iniciante')}</option>
                          <option value="intermediate">{t('admin.library.intermediate', 'Intermediário')}</option>
                          <option value="advanced">{t('admin.library.advanced', 'Avançado')}</option>
                        </select>
                    </div>
                    <div className="flex items-end">
                      <button 
                        onClick={handleGenerateAIContent}
                        disabled={isGenerating || !aiGenForm.theme}
                        className="w-full h-[48px] bg-sky-500 hover:bg-sky-400 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-3 disabled:opacity-50"
                      >
                        {isGenerating ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                        {isGenerating ? t('admin.library.generating', 'Gerando...') : t('admin.library.generate', 'Gerar')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {materiais.map((m) => (
                  <div key={m.id} className="admin-card overflow-hidden group hover:shadow-blue-900/10">
                    <div className="h-40 relative overflow-hidden">
                      <img 
                        src={m.cover_image || 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=1200'} 
                        alt={m.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-4 left-4">
                        <span className="px-3 py-1 bg-blue-600 text-white text-[10px] font-black rounded-full uppercase tracking-widest shadow-lg">
                          {m.category}
                        </span>
                      </div>
                    </div>
                    <div className="p-6 space-y-4">
                      <div>
                        <h4 className="font-black text-white text-lg leading-tight mb-1">{m.title}</h4>
                        <p className="text-xs text-slate-500 font-medium line-clamp-2">{m.description}</p>
                      </div>
                      <div className="flex items-center justify-between pt-4 border-t border-white/5">
                        <p className="text-xl font-black text-blue-400">R$ {m.price?.toLocaleString()}</p>
                        <button 
                          onClick={() => handleDeleteMaterial(m.id)}
                          className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {materiais.length === 0 && (
                <div className="p-12 border-2 border-dashed border-white/5 rounded-[3rem] text-center space-y-4">
                  <div className="w-16 h-16 bg-white/5 text-slate-600 rounded-full flex items-center justify-center mx-auto">
                    <BookOpen size={32} />
                  </div>
                  <p className="text-slate-500 font-bold">{t('admin.library.no_materials', 'Nenhum material cadastrado ainda.')}</p>
                </div>
              )}

              {/* Modal Novo Material */}
              <AnimatePresence>
                {showMaterialModal && (
                  <div className="fixed inset-0 z-[50] flex items-center justify-center p-4">
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setShowMaterialModal(false)}
                      className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: 20 }}
                      className="relative bg-white/90 backdrop-blur-xl w-full max-w-lg rounded-[3rem] shadow-2xl border border-white/20 overflow-hidden p-8 space-y-6"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="text-2xl font-black admin-title tracking-tight">{t('admin.library.new_material', 'Novo Material')}</h3>
                        <button onClick={() => setShowMaterialModal(false)} className="text-slate-400 hover:text-slate-600">
                          <X size={24} />
                        </button>
                      </div>

                      <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                        <div className="space-y-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{t('admin.library.form.title', 'Título')}</label>
                            <input 
                              type="text" 
                              value={newMaterial.title}
                              onChange={(e) => setNewMaterial({...newMaterial, title: e.target.value})}
                              placeholder={t('admin.library.form.title_placeholder', "Ex: Guia de Exercícios para Lombar")}
                              className="w-full px-4 py-3 bg-white/5 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-500/20 outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{t('admin.library.form.description', 'Descrição')}</label>
                            <textarea 
                              value={newMaterial.description}
                              onChange={(e) => setNewMaterial({...newMaterial, description: e.target.value})}
                              placeholder={t('admin.library.form.description_placeholder', "Breve descrição do conteúdo...")}
                              className="w-full px-4 py-3 bg-white/5 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-500/20 outline-none h-20 resize-none"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Objetivo Clínico</label>
                            <input 
                              type="text" 
                              value={newMaterial.clinical_objective}
                              onChange={(e) => setNewMaterial({...newMaterial, clinical_objective: e.target.value})}
                              placeholder="Ex: Alívio de dor e melhora da mobilidade"
                              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-blue-500/20 outline-none"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Nível</label>
                              <select 
                                value={newMaterial.level}
                                onChange={(e) => setNewMaterial({...newMaterial, level: e.target.value as any})}
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-blue-500/20 outline-none"
                              >
                                <option value="beginner">Iniciante</option>
                                <option value="intermediate">Intermediário</option>
                                <option value="advanced">Avançado</option>
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Tipo</label>
                              <select 
                                value={newMaterial.type}
                                onChange={(e) => setNewMaterial({...newMaterial, type: e.target.value as any})}
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-blue-500/20 outline-none"
                              >
                                <option value="educational">Educativo</option>
                                <option value="exercise">Exercício</option>
                                <option value="alert">Alerta</option>
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 items-end">
                            <div className="space-y-1 flex-1">
                              <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex justify-between items-center pr-2">
                                Categoria
                                <button 
                                  onClick={handleAutoCategorize}
                                  disabled={isCategorizing || !newMaterial.title}
                                  className="text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 normal-case tracking-normal disabled:opacity-50"
                                >
                                  {isCategorizing ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                                  IA
                                </button>
                              </label>
                              <input 
                                type="text" 
                                value={newMaterial.category}
                                readOnly
                                className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl text-white italic outline-none text-sm"
                              />
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 mb-4">
                                <button
                                  onClick={() => setNewMaterial({...newMaterial, is_premium: !newMaterial.is_premium})}
                                  className={cn(
                                    "w-10 h-5 rounded-full relative transition-colors",
                                    newMaterial.is_premium ? "bg-blue-600" : "bg-slate-700"
                                  )}
                                >
                                  <div className={cn(
                                    "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all",
                                    newMaterial.is_premium ? "left-5.5" : "left-0.5"
                                  )} />
                                </button>
                                <span className="text-[10px] font-black uppercase text-slate-400">Premium</span>
                              </div>
                            </div>
                          </div>

                          {newMaterial.is_premium && (
                            <div className="space-y-1">
                              <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Preço Individual (R$)</label>
                              <input 
                                type="text" 
                                value={newMaterial.price}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/[^0-9.]/g, '');
                                  setNewMaterial({...newMaterial, price: val});
                                }}
                                placeholder="0.00"
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-blue-500/20 outline-none"
                              />
                            </div>
                          )}

                          {/* Section Editor */}
                          <div className="space-y-4 pt-4 border-t border-white/10">
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Seções do Conteúdo</label>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setNewMaterial({
                                    ...newMaterial, 
                                    sections: [...newMaterial.sections, { type: 'text', content: { title: '', body: '' } }]
                                  })}
                                  className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white"
                                  title="Texto"
                                >
                                  <FileIcon size={14} />
                                </button>
                                <button
                                  onClick={() => setNewMaterial({
                                    ...newMaterial, 
                                    sections: [...newMaterial.sections, { type: 'step-by-step', content: { steps: [''] } }]
                                  })}
                                  className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white"
                                  title="Checklist"
                                >
                                  <CheckCircle2 size={14} />
                                </button>
                                <button
                                  onClick={() => setNewMaterial({
                                    ...newMaterial, 
                                    sections: [...newMaterial.sections, { type: 'alert', content: { message: '' } }]
                                  })}
                                  className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white"
                                  title="Alerta"
                                >
                                  <AlertCircle size={14} />
                                </button>
                              </div>
                            </div>

                            <div className="space-y-3">
                              {newMaterial.sections.map((section, idx) => (
                                <div key={idx} className="p-4 bg-white/5 rounded-2xl border border-white/5 relative group">
                                  <button 
                                    onClick={() => {
                                      const newSections = [...newMaterial.sections];
                                      newSections.splice(idx, 1);
                                      setNewMaterial({...newMaterial, sections: newSections});
                                    }}
                                    className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <X size={12} />
                                  </button>

                                  <div className="flex items-center gap-2 mb-3">
                                    <Tag size={10} className="text-blue-400" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                      {section.type === 'text' ? 'Texto' : section.type === 'step-by-step' ? 'Passo a Passo' : 'Alerta'}
                                    </span>
                                  </div>

                                  {section.type === 'text' && (
                                    <div className="space-y-2">
                                      <input 
                                        type="text"
                                        placeholder="Subtítulo"
                                        value={section.content.title}
                                        onChange={(e) => {
                                          const news = [...newMaterial.sections];
                                          news[idx].content.title = e.target.value;
                                          setNewMaterial({...newMaterial, sections: news});
                                        }}
                                        className="w-full bg-transparent border-b border-white/10 text-xs font-bold text-white outline-none"
                                      />
                                      <textarea 
                                        placeholder="Conteúdo..."
                                        value={section.content.body}
                                        onChange={(e) => {
                                          const news = [...newMaterial.sections];
                                          news[idx].content.body = e.target.value;
                                          setNewMaterial({...newMaterial, sections: news});
                                        }}
                                        className="w-full bg-transparent text-[10px] text-slate-400 outline-none h-16 resize-none"
                                      />
                                    </div>
                                  )}

                                  {section.type === 'step-by-step' && (
                                    <div className="space-y-2">
                                      {section.content.steps.map((step: string, sIdx: number) => (
                                        <div key={sIdx} className="flex gap-2">
                                          <span className="text-[10px] font-black text-slate-500 pt-1">{sIdx + 1}.</span>
                                          <input 
                                            type="text"
                                            value={step}
                                            onChange={(e) => {
                                              const news = [...newMaterial.sections];
                                              news[idx].content.steps[sIdx] = e.target.value;
                                              setNewMaterial({...newMaterial, sections: news});
                                            }}
                                            className="flex-1 bg-transparent border-b border-white/5 text-[10px] text-white outline-none"
                                          />
                                        </div>
                                      ))}
                                      <button 
                                        onClick={() => {
                                          const news = [...newMaterial.sections];
                                          news[idx].content.steps.push('');
                                          setNewMaterial({...newMaterial, sections: news});
                                        }}
                                        className="text-[10px] text-blue-400 font-bold"
                                      >
                                        + Adicionar Passo
                                      </button>
                                    </div>
                                  )}

                                  {section.type === 'alert' && (
                                    <textarea 
                                      placeholder="Mensagem de alerta..."
                                      value={section.content.message}
                                      onChange={(e) => {
                                        const news = [...newMaterial.sections];
                                        news[idx].content.message = e.target.value;
                                        setNewMaterial({...newMaterial, sections: news});
                                      }}
                                      className="w-full bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-[10px] text-rose-200 outline-none h-12 resize-none"
                                    />
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-white/10">
                          <div className="space-y-1 text-slate-400 text-[10px] uppercase font-black tracking-widest pl-1">Mídia e Arquivos</div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Imagem de Capa</label>
                            <div className="flex items-center gap-4">
                              <label className="flex-1 flex flex-col items-center justify-center h-24 border-2 border-dashed border-white/10 rounded-2xl hover:border-blue-500 hover:bg-blue-500/5 transition-all cursor-pointer group">
                                {imageFile ? (
                                  <div className="flex flex-col items-center gap-1">
                                    <CheckCircle2 className="text-emerald-500" size={24} />
                                    <span className="text-[10px] font-bold text-slate-400">{imageFile.name}</span>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center gap-1">
                                    <Upload className="text-slate-500 group-hover:text-blue-500" size={24} />
                                    <span className="text-[10px] font-bold text-slate-500 group-hover:text-blue-400">Imagem</span>
                                  </div>
                                )}
                                <input 
                                  type="file" 
                                  accept="image/*"
                                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                                  className="hidden" 
                                />
                              </label>
                              <div className="flex-1 space-y-2">
                                <input 
                                  type="text" 
                                  value={newMaterial.cover_image}
                                  onChange={(e) => setNewMaterial({...newMaterial, cover_image: e.target.value})}
                                  placeholder="Ou URL externa..."
                                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-blue-500/20 outline-none text-xs"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Material PDF (Opcional)</label>
                            <div className="flex items-center gap-4">
                              <label className="flex-1 flex flex-col items-center justify-center h-24 border-2 border-dashed border-white/10 rounded-2xl hover:border-blue-500 hover:bg-blue-500/5 transition-all cursor-pointer group">
                                {materialFile ? (
                                  <div className="flex flex-col items-center gap-1">
                                    <FileIcon className="text-emerald-500" size={24} />
                                    <span className="text-[10px] font-bold text-slate-400 truncate max-w-[120px]">{materialFile.name}</span>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center gap-1">
                                    <Upload className="text-slate-500 group-hover:text-blue-500" size={24} />
                                    <span className="text-[10px] font-bold text-slate-500 group-hover:text-blue-400">PDF</span>
                                  </div>
                                )}
                                <input 
                                  type="file" 
                                  accept=".pdf"
                                  onChange={(e) => setMaterialFile(e.target.files?.[0] || null)}
                                  className="hidden" 
                                />
                              </label>
                              <div className="flex-1 space-y-2">
                                <input 
                                  type="text" 
                                  value={newMaterial.file_url}
                                  onChange={(e) => setNewMaterial({...newMaterial, file_url: e.target.value})}
                                  placeholder={t('admin_materials.external_url', "Ou URL externa...")}
                                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-blue-500/20 outline-none text-xs"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <button 
                        onClick={handleAddMaterial}
                        disabled={uploading}
                        className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-900/20 hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {uploading ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            {t('admin_materials.uploading', 'Subindo...')}
                          </>
                        ) : t('admin_materials.save_material', 'Salvar Material')}
                      </button>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="bg-white/80 backdrop-blur-md rounded-[2.5rem] border border-slate-200/60 shadow-2xl overflow-hidden">
              <div className="p-8 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-xl font-black text-white tracking-tight">{t('admin.users.title', 'Todos os Usuários')}</h3>
                <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
                  <Search className="text-slate-500" size={18} />
                  <input 
                    type="text" 
                    placeholder={t('admin.users.filter_placeholder', 'Filtrar usuários...')}
                    className="text-sm border-none focus:ring-0 bg-transparent text-white placeholder:text-slate-600"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-white/5">
                      <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">{t('admin.users.table.name', 'Nome')}</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">{t('admin.users.table.email', 'Email')}</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">{t('admin.users.table.role', 'Papel')}</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">{t('admin.users.table.crefito', 'CREFITO')}</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">{t('admin.users.table.status', 'Status')}</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] text-right">{t('admin.users.table.actions', 'Ações')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSupabaseProfiles.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-white/5 overflow-hidden flex items-center justify-center text-[10px] font-bold text-slate-500 border border-white/10">
                              {u.avatar_display ? (
                                <img src={u.avatar_display} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                u.nome_completo?.charAt(0)
                              )}
                            </div>
                            <span className="text-sm font-bold text-white">{u.nome_completo}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-sm text-slate-500">{u.email}</td>
                        <td className="px-8 py-5">
                          <div className="flex flex-col gap-1">
                            <span className={cn(
                              "text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider w-fit",
                              u.tipo_usuario === 'fisioterapeuta' ? "bg-blue-500/10 text-blue-400" : "bg-white/5 text-slate-400"
                            )}>
                              {u.tipo_usuario === 'fisioterapeuta' ? t('admin_users.role_physio', 'Fisioterapeuta') : t('admin_users.role_patient', 'Paciente')}
                            </span>
                            {u.is_pro && (
                              <span className="text-[8px] font-black px-1.5 py-0.5 bg-amber-500/10 text-amber-500 rounded uppercase tracking-tighter flex items-center gap-0.5 w-fit">
                                <Crown size={8} /> PRO
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <span className="text-xs font-black text-white bg-white/5 px-2 py-1 rounded-lg border border-white/10">
                            {u.crefito || '---'}
                          </span>
                        </td>
                        <td className="px-8 py-5">
                          <span className={cn(
                            "text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider",
                            u.status_aprovacao === 'aprovado' ? "bg-emerald-500/10 text-emerald-400" : 
                            u.status_aprovacao === 'rejeitado' ? "bg-rose-500/10 text-rose-400" : "bg-amber-500/10 text-amber-400"
                          )}>
                            {u.status_aprovacao === 'aprovado' ? t('admin.status.approved', 'Aprovado') :
                             u.status_aprovacao === 'rejeitado' ? t('admin.status.rejected', 'Rejeitado') :
                             t('admin_users.status_pending', 'Pendente')}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => setSelectedUserDetail(u)}
                              className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                              title={t('admin_users.view_details', 'Ver Detalhes')}
                            >
                              <Eye size={16} />
                            </button>
                            <button 
                              onClick={() => handleBlockUser(u?.id, u?.status_aprovacao)}
                              className="p-2 text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                              title={t('admin_users.block_unblock', 'Bloquear/Desbloquear')}
                            >
                              <Lock size={16} />
                            </button>
                            <button 
                              onClick={() => handleDeleteUser(u?.id)}
                              className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                              title={t('admin.delete_profile')}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!loading && !error && activeTab === 'financial' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/5">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{t('admin_financial.total_paid_patients', 'Total Pago pelos Pacientes')}</p>
                  <p className="text-3xl font-black text-white tracking-tight">R$ {stats.totalPaidByPatients.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  <p className="text-[10px] text-slate-500 font-bold mt-2 italic">{t('admin_financial.bruto_desc', 'Valor bruto recebido pela plataforma')}</p>
                </div>
                <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/5 border-emerald-500/20">
                  <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">{t('admin_financial.net_physio', 'Líquido Fisioterapeutas (88%)')}</p>
                  <p className="text-3xl font-black text-emerald-400 tracking-tight">R$ {stats.totalNetPhysio.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  <p className="text-[10px] text-emerald-500/50 font-bold mt-2 italic">{t('admin_financial.net_desc', 'Valor total que deve ser repassado')}</p>
                </div>
                <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/5 border-blue-500/20">
                  <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">{t('admin_financial.commission_platform', 'Comissão Plataforma (12%)')}</p>
                  <p className="text-3xl font-black text-blue-400 tracking-tight">R$ {stats.totalCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  <p className="text-[10px] text-blue-500/50 font-bold mt-2 italic">{t('admin_financial.commission_desc', 'Receita líquida da FisioCareHub')}</p>
                </div>
              </div>

              <div className="bg-white/5 rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden">
                <div className="p-8 border-b border-white/5">
                  <h3 className="text-xl font-black text-white tracking-tight">{t('admin_financial.repasse_control', 'Controle de Repasses')}</h3>
                  <p className="text-sm text-slate-500 font-medium">{t('admin_financial.repasse_subtitle', 'Gerencie os pagamentos recebidos pelo app e os repasses manuais aos fisioterapeutas.')}</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                      <tr className="bg-white/5">
                        <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">{t('admin_financial.table.date_time', 'Data/Hora')}</th>
                        <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">{t('admin_financial.table.patient', 'Paciente')}</th>
                        <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">{t('admin_financial.table.physio', 'Fisioterapeuta')}</th>
                        <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">{t('admin_financial.table.total_paid', 'Total Pago')}</th>
                        <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">{t('admin_financial.table.commission', `Comissão (${commissionRate}%)`)}</th>
                        <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">{t('admin_financial.table.net_physio', `Líquido Fisio (${100 - commissionRate}%)`)}</th>
                        <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">{t('admin_financial.table.repasse', 'Repasse')}</th>
                        <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] text-right">{t('admin_financial.table.action', 'Ação')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {sessions
                        .filter(s => s.status_pagamento === 'pago_app')
                        .map((s) => {
                          const netValue = Number(s.valor_sessao || s.valor || 0);
                          const currentRateFactor = (100 - commissionRate) / 100;
                          const totalValue = netValue / (currentRateFactor || 0.88);
                          const commValue = totalValue * (commissionRate / 100);

                          return (
                            <tr key={s.id} className="hover:bg-white/[0.02] transition-colors">
                              <td className="px-8 py-5 text-sm font-bold text-white">
                                {new Date(s.data).toLocaleDateString('pt-BR')} {s.hora}
                              </td>
                              <td className="px-8 py-5">
                                <p className="text-sm font-bold text-white">{s.paciente?.nome_completo}</p>
                                <p className="text-[10px] text-slate-500">{s.paciente?.email}</p>
                              </td>
                              <td className="px-8 py-5">
                                <p className="text-sm font-bold text-white">{s.fisioterapeuta?.nome_completo}</p>
                                <p className="text-[10px] text-slate-500">{s.fisioterapeuta?.email}</p>
                              </td>
                              <td className="px-8 py-5 text-sm font-bold text-slate-400">
                                R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="px-8 py-5 text-sm font-bold text-blue-400">
                                R$ {commValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="px-8 py-5 text-sm font-black text-emerald-400">
                                R$ {netValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="px-8 py-5">
                                <span className={cn(
                                  "px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                                  s.status_repasse === 'repassado_fisio' ? "bg-blue-500/10 text-blue-500" : "bg-amber-500/10 text-amber-500"
                                )}>
                                  {s.status_repasse === 'repassado_fisio' ? 'Repassado' : 'Pendente'}
                                </span>
                              </td>
                              <td className="px-8 py-5 text-right">
                                {s.status_repasse === 'pendente' && (
                                  <button 
                                    onClick={() => handleMarkAsRepassado(s.id)}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-900/20"
                                  >
                                    Marcar Repasse
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
                {sessions.filter(s => s.status_pagamento === 'pago_app').length === 0 && (
                  <div className="p-12 text-center space-y-4">
                    <div className="w-16 h-16 bg-white/5 text-slate-600 rounded-full flex items-center justify-center mx-auto">
                      <DollarSign size={32} />
                    </div>
                    <p className="text-slate-500 font-bold">Nenhuma sessão paga encontrada.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {!loading && !error && activeTab === 'physios' && (
            <div className="bg-white/80 backdrop-blur-md rounded-[2.5rem] border border-slate-200/60 shadow-2xl overflow-hidden">
              <div className="p-8 border-b border-white/5 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-white tracking-tight">Fisioterapeutas Cadastrados</h3>
                  <p className="text-xs text-slate-500 font-medium">Lista exclusiva de profissionais.</p>
                </div>
                <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
                  <Search className="text-slate-500" size={18} />
                  <input 
                    type="text" 
                    placeholder="Buscar fisioterapeuta..." 
                    className="text-sm border-none focus:ring-0 bg-transparent text-white placeholder:text-slate-600"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-white/5">
                      <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Profissional</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">CREFITO</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Especialidade</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Status</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPhysios.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-8 py-24 text-center">
                          <div className="space-y-6">
                            <div className="w-20 h-20 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
                              <Users size={40} />
                            </div>
                            <p className="text-slate-500 font-black text-lg uppercase tracking-widest">{t('admin.dashboard.charts.no_physios', 'Nenhum fisioterapeuta encontrado.')}</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredPhysios.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition-all group">
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-5">
                              <div className="w-14 h-14 rounded-2xl bg-white/5 overflow-hidden flex items-center justify-center text-sm font-black text-blue-400 border border-white/10 shadow-lg group-hover:scale-105 transition-transform">
                                {u.avatar_display ? (
                                  <img src={u.avatar_display} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  u.nome_completo?.charAt(0)
                                )}
                              </div>
                              <div>
                                <p className="text-base font-black text-white tracking-tight">{u.nome_completo}</p>
                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <span className="inline-flex items-center px-4 py-2 rounded-xl bg-blue-600 text-white text-[10px] font-black shadow-lg shadow-blue-900/20 uppercase tracking-widest">
                              {u.crefito || 'PENDENTE'}
                            </span>
                          </td>
                          <td className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-widest">{u.especialidade || '---'}</td>
                          <td className="px-8 py-6">
                            <span className={cn(
                              "text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-[0.15em] shadow-sm",
                              u.status_aprovacao === 'aprovado' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : 
                              u.status_aprovacao === 'rejeitado' ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            )}>
                              {u.status_aprovacao || 'Pendente'}
                            </span>
                          </td>
                          <td className="px-8 py-6 text-right">
                            <div className="flex items-center justify-end gap-4">
                              <button 
                                onClick={() => setSelectedUserDetail(u)}
                                className="p-3 text-blue-400 hover:bg-blue-500/10 rounded-2xl transition-all hover:scale-110 active:scale-95"
                                title="Ver Detalhes"
                              >
                                <Eye size={22} />
                              </button>
                              {(u.status_aprovacao === 'pendente' || !u.status_aprovacao) && (
                                <>
                                  <button 
                                    onClick={() => handleApprovePhysio(u?.id, u?.id)}
                                    className="p-3 text-emerald-400 hover:bg-emerald-500/10 rounded-2xl transition-all hover:scale-110 active:scale-95"
                                    title="Aprovar"
                                  >
                                    <CheckCircle2 size={22} />
                                  </button>
                                  <button 
                                    onClick={() => handleRejectPhysio(u?.id, u?.id)}
                                    className="p-3 text-rose-400 hover:bg-rose-500/10 rounded-2xl transition-all hover:scale-110 active:scale-95"
                                    title="Rejeitar"
                                  >
                                    <XCircle size={22} />
                                  </button>
                                </>
                              )}
                              <button 
                                onClick={() => handleDeleteUser(u?.id)}
                                className="p-3 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-2xl transition-all hover:scale-110 active:scale-95"
                                title="Excluir"
                              >
                                <Trash2 size={22} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!loading && !error && activeTab === 'patients' && (
            <div className="bg-white/80 backdrop-blur-md rounded-[2.5rem] border border-slate-200/60 shadow-2xl overflow-hidden">
              <div className="p-8 border-b border-white/5 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-white tracking-tight">{t('admin.patients.title', 'Pacientes Cadastrados')}</h3>
                  <p className="text-xs text-slate-500 font-medium">{t('admin.patients.subtitle', 'Lista exclusiva de clientes.')}</p>
                </div>
                <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
                  <Search className="text-slate-500" size={18} />
                  <input 
                    type="text" 
                    placeholder={t('admin.patients.search_placeholder', "Buscar paciente...")} 
                    className="text-sm border-none focus:ring-0 bg-transparent text-white placeholder:text-slate-600"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-white/5">
                      <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">{t('admin.patients.table.patient', 'Paciente')}</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">{t('admin.patients.table.email', 'Email')}</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">{t('admin.patients.table.location', 'Localização')}</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] text-right">{t('admin.patients.table.actions', 'Ações')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPatients.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-8 py-24 text-center">
                            <div className="space-y-6">
                              <div className="w-20 h-20 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
                                <Users size={40} />
                              </div>
                              <p className="text-slate-500 font-black text-lg uppercase tracking-widest">{t('admin.patients.no_patients', 'Nenhum paciente encontrado.')}</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                      filteredPatients.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50/80 transition-all group">
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-5">
                              <div className="w-14 h-14 rounded-2xl bg-white/5 overflow-hidden flex items-center justify-center text-sm font-black text-slate-500 border border-white/10 shadow-lg group-hover:scale-105 transition-transform">
                                {u.avatar_display ? (
                                  <img src={u.avatar_display} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  u.nome_completo?.charAt(0)
                                )}
                              </div>
                              <div>
                                <p className="text-base font-black text-white tracking-tight">{u.nome_completo}</p>
                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Cadastrado em {u.created_at ? new Date(u.created_at).toLocaleDateString() : '---'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6 text-sm text-slate-400 font-bold">{u.email}</td>
                          <td className="px-8 py-6 text-xs font-black text-slate-500 uppercase tracking-widest">{u.localizacao || 'Não inf.'}</td>
                          <td className="px-8 py-6 text-right">
                            <div className="flex items-center justify-end gap-4">
                              <button 
                                onClick={() => setSelectedUserDetail(u)}
                                className="p-3 text-blue-400 hover:bg-blue-500/10 rounded-2xl transition-all hover:scale-110 active:scale-95"
                                title="Ver Detalhes"
                              >
                                <Eye size={22} />
                              </button>
                              <button 
                                onClick={() => handleBlockUser(u?.id, u?.status_aprovacao)}
                                className="p-3 text-amber-400 hover:bg-amber-500/10 rounded-2xl transition-all hover:scale-110 active:scale-95"
                                title="Bloquear"
                              >
                                <Lock size={22} />
                              </button>
                              <button 
                                onClick={() => handleDeleteUser(u?.id)}
                                className="p-3 text-rose-400 hover:bg-rose-500/10 rounded-2xl transition-all hover:scale-110 active:scale-95"
                                title="Excluir"
                              >
                                <Trash2 size={22} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!loading && !error && activeTab === 'approvals' && (
            <div className="space-y-8">
              <h3 className="text-2xl font-black text-white tracking-tight">{t('admin.approvals.title', 'Aprovações Pendentes')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredApprovals.length === 0 ? (
                  <div className="col-span-full bg-white/80 backdrop-blur-md p-12 rounded-[2.5rem] border border-slate-200/60 text-center space-y-4 shadow-2xl">
                    <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle2 size={32} />
                    </div>
                    <p className="font-black text-white text-lg">{t('admin.approvals.empty_title', 'Tudo em dia!')}</p>
                    <p className="text-sm text-slate-500">{t('admin.approvals.empty_desc', 'Não há fisioterapeutas aguardando aprovação no momento.')}</p>
                  </div>
                ) : (
                  filteredApprovals.map((profile) => (
                    <motion.div 
                      key={profile.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-white/80 backdrop-blur-md p-8 rounded-[2.5rem] border border-slate-200/60 shadow-2xl space-y-6 group hover:border-blue-500/30 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-slate-500 font-bold overflow-hidden border border-white/10">
                          {profile.avatar_display ? (
                            <img src={profile.avatar_display} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            profile.nome_completo?.charAt(0)
                          )}
                        </div>
                        <div>
                          <p className="font-black text-white text-lg tracking-tight">{profile.nome_completo}</p>
                          <p className="text-xs text-slate-500 font-medium">{profile.email} • CREFITO: {profile.crefito || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-[10px] font-black uppercase tracking-[0.15em]">
                        <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-slate-400 truncate">Especialidade: {profile.especialidade || 'Não inf.'}</div>
                        <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-slate-400 truncate">Tipo: {profile.plano || profile.tipo_usuario}</div>
                      </div>
                      
                      {(() => {
                        const docs = Array.isArray(profile.documentos) 
                          ? profile.documentos 
                          : (typeof profile.documentos === 'string' && profile.documentos.startsWith('[')
                              ? JSON.parse(profile.documentos)
                              : []);
                        
                        if (docs.length > 0) {
                          return (
                            <div className="p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10">
                              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3">Documentos Anexados ({docs.length})</p>
                              <div className="flex flex-wrap gap-2">
                                {docs.map((doc: string, idx: number) => (
                                  <a 
                                    key={idx} 
                                    href={resolveStorageUrl(doc)} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold text-blue-400 hover:bg-blue-600 hover:text-white transition-all"
                                  >
                                    Visualizar Doc {idx + 1}
                                  </a>
                                ))}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}

                      <div className="flex items-center gap-3 pt-2">
                        <button 
                          onClick={() => setSelectedUserDetail(profile)}
                          className="p-3 bg-white/5 text-slate-400 rounded-xl hover:bg-white/10 transition-colors border border-white/5"
                          title="Ver Detalhes"
                        >
                          <Eye size={20} />
                        </button>
                        <button 
                          onClick={() => handleApprovePhysio(profile?.id, profile?.id)}
                          className="flex-1 py-3 bg-emerald-600 text-white rounded-xl text-xs font-black hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-900/20"
                        >
                          Aprovar
                        </button>
                        <button 
                          onClick={() => handleRejectPhysio(profile?.id, profile?.id)}
                          className="flex-1 py-3 bg-rose-500/10 text-rose-500 rounded-xl text-xs font-black hover:bg-rose-500/20 transition-all"
                        >
                          Rejeitar
                        </button>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          )}

          {!loading && !error && activeTab === 'financial' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
                  <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Receita Mensal (Total)</p>
                  <p className="text-3xl font-black text-white tracking-tighter">R$ {stats.totalRevenue.toLocaleString()}</p>
                </div>
                <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
                  <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Comissões ({commissionRate}%)</p>
                  <p className="text-3xl font-black text-emerald-400 tracking-tighter">R$ {(stats.totalRevenue * (commissionRate / 100)).toLocaleString()}</p>
                </div>
                <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
                  <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Transações</p>
                  <p className="text-3xl font-black text-blue-400 tracking-tighter">{payments.length}</p>
                </div>
              </div>

              <div className="bg-white/5 rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden">
                <div className="p-8 border-b border-white/5">
                  <h3 className="text-xl font-black text-white tracking-tight">Histórico de Transações</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-white/5">
                        <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Data</th>
                        <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Valor</th>
                        <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Comissão ({commissionRate}%)</th>
                        <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {payments.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-8 py-20 text-center">
                            <div className="space-y-4">
                              <div className="w-16 h-16 bg-white/5 text-slate-600 rounded-full flex items-center justify-center mx-auto">
                                <DollarSign size={32} />
                              </div>
                              <p className="text-slate-500 font-bold">Nenhuma transação encontrada.</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        payments.map((p) => (
                          <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="px-8 py-5 text-xs text-slate-500 font-medium">
                              {p.createdAt?.toDate ? p.createdAt.toDate().toLocaleDateString('pt-BR') : 'Recent'}
                            </td>
                            <td className="px-8 py-5 text-sm font-bold text-white">R$ {p.amount?.toLocaleString()}</td>
                            <td className="px-8 py-5 text-sm font-bold text-emerald-400">R$ {(p.amount * (commissionRate / 100)).toLocaleString()}</td>
                            <td className="px-8 py-5">
                              <span className={cn(
                                "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                                p.status === 'paid' || p.status === 'succeeded' ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                              )}>
                                {p.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {!loading && !error && activeTab === 'chat' && (
            <div className="h-[calc(100vh-200px)] min-h-[500px] bg-white/5 rounded-[2.5rem] border border-white/5 shadow-2xl flex overflow-hidden relative">
              {/* User List - Sidebar */}
              <div className={cn(
                "w-full md:w-1/3 border-r border-white/5 flex flex-col bg-white/5 transition-all duration-300",
                selectedChatUser ? "hidden md:flex" : "flex"
              )}>
                <div className="p-8 border-b border-white/5 flex items-center justify-between">
                  <h4 className="font-black text-white tracking-tight">Conversas</h4>
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-500 border border-white/10">
                    <Search size={16} />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                  {supabaseProfiles.filter(u => u.tipo_usuario !== 'admin').map(u => (
                    <button
                      key={u.id}
                      onClick={() => setSelectedChatUser(u)}
                      className={cn(
                        "w-full flex items-center gap-4 p-4 rounded-2xl transition-all group",
                        selectedChatUser?.id === u.id 
                          ? "bg-blue-600 text-white shadow-xl shadow-blue-900/40" 
                          : "hover:bg-white/5 text-slate-400 hover:text-white"
                      )}
                    >
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg flex-shrink-0 shadow-sm transition-transform group-hover:scale-105 border border-white/10",
                        selectedChatUser?.id === u.id ? "bg-white/20 text-white" : "bg-blue-500/10 text-blue-400"
                      )}>
                        {u.nome_completo?.charAt(0).toUpperCase()}
                      </div>
                      <div className="text-left flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="text-sm font-black truncate tracking-tight">{u.nome_completo}</p>
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider",
                            u.tipo_usuario === 'fisioterapeuta'
                              ? (selectedChatUser?.id === u.id ? "bg-white/20 text-white" : "bg-emerald-500/10 text-emerald-400")
                              : (selectedChatUser?.id === u.id ? "bg-white/20 text-white" : "bg-blue-500/10 text-blue-400")
                          )}>
                            {u.tipo_usuario === 'fisioterapeuta' ? 'Fisio' : 'Paciente'}
                          </span>
                        </div>
                        <p className={cn(
                          "text-[10px] font-bold truncate uppercase tracking-widest",
                          selectedChatUser?.id === u.id ? "text-white/60" : "text-slate-500"
                        )}>
                          Clique para iniciar conversa
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat Area - Main Content */}
              <div className={cn(
                "flex-1 flex flex-col bg-white/[0.02] transition-all duration-300",
                !selectedChatUser ? "hidden md:flex" : "flex"
              )}>
                {selectedChatUser ? (
                  <>
                    {/* Chat Header */}
                    <div className="px-3 py-2.5 md:p-6 bg-white/5 border-b border-white/5 flex items-center gap-2 md:gap-4 h-[70px] md:h-auto">
                      <button 
                        onClick={() => setSelectedChatUser(null)}
                        className="md:hidden p-1.5 -ml-1 text-slate-400 hover:text-white transition-colors"
                      >
                        <ArrowLeft size={20} />
                      </button>
                      <div className="w-9 h-9 md:w-12 md:h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 font-black text-sm shadow-sm flex-shrink-0 border border-white/10">
                        {selectedChatUser.nome_completo?.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-white truncate text-sm md:text-lg pr-2 tracking-tight">{selectedChatUser.nome_completo}</p>
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                          <p className="text-[8px] md:text-[10px] text-emerald-400 font-black uppercase tracking-widest">Online</p>
                        </div>
                      </div>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 custom-scrollbar">
                      {messages.map((m, idx) => {
                        const mDate = m.criado_em ? new Date(m.criado_em) : new Date();
                        const prevM = idx > 0 ? messages[idx - 1] : null;
                        const prevMDate = prevM?.criado_em ? new Date(prevM.criado_em) : null;
                        
                        const showDateSeparator = !prevMDate || 
                          mDate.toDateString() !== prevMDate.toDateString();

                        return (
                          <div key={m.id} className="space-y-6">
                            {showDateSeparator && (
                              <div className="flex justify-center my-8">
                                <div className="px-4 py-1.5 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">
                                  {mDate.toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' })}
                                </div>
                              </div>
                            )}
                            <div 
                              className={cn(
                                "max-w-[85%] md:max-w-[70%] p-4 rounded-3xl text-sm shadow-2xl relative group",
                                m.remetente === supabaseUser?.id 
                                  ? "ml-auto bg-blue-600 text-white rounded-tr-none shadow-blue-900/20" 
                                  : "bg-white/5 border border-white/10 text-white rounded-tl-none"
                              )}
                            >
                              <p className="leading-relaxed font-bold tracking-tight break-words">{m.mensagem}</p>
                              <div className={cn(
                                "text-[9px] mt-2 font-black uppercase tracking-widest opacity-50",
                                m.remetente === supabaseUser?.id ? "text-right text-blue-100" : "text-left text-slate-500"
                              )}>
                                {mDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Input Area */}
                    <div className="p-3 md:p-6 bg-white/5 border-t border-white/5 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                      <div className="flex gap-3 md:gap-4 items-center max-w-4xl mx-auto w-full">
                        <div className="flex-1 relative group">
                          <input 
                            type="text" 
                            placeholder="Escreva sua mensagem aqui..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            className="w-full pl-6 pr-14 py-4 bg-white/5 border border-white/10 rounded-full outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 focus:bg-white/10 transition-all font-bold text-sm md:text-base text-white placeholder:text-slate-600 shadow-inner"
                          />
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                            <button type="button" className="p-1.5 md:p-2 text-slate-500 hover:text-blue-400 transition-colors">
                              <Sparkles className="w-4 h-4 md:w-5 md:h-5" />
                            </button>
                          </div>
                        </div>
                        <button 
                          onClick={handleSendMessage}
                          disabled={!newMessage.trim()}
                          className={cn(
                            "w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-xl flex-shrink-0",
                            newMessage.trim() 
                              ? "bg-blue-600 text-white hover:bg-blue-700 hover:scale-105 active:scale-95 shadow-blue-900/40" 
                              : "bg-white/5 text-slate-700 cursor-not-allowed border border-white/5"
                          )}
                        >
                          <Send className="w-6 h-6 md:w-7 md:h-7 translate-x-0.5 -translate-y-0.5" />
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  /* Empty State */
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
                    <div className="w-24 h-24 bg-white/5 rounded-[2.5rem] flex items-center justify-center text-blue-500 mb-8 animate-bounce-slow border border-white/10 shadow-2xl">
                      <MessageSquare size={48} strokeWidth={1.5} />
                    </div>
                    <h3 className="text-2xl font-black text-white mb-3 tracking-tight">Central de Suporte</h3>
                    <p className="text-sm text-slate-500 max-w-xs leading-relaxed font-medium">
                      Selecione um usuário na lista ao lado para visualizar o histórico de mensagens e iniciar um novo atendimento.
                    </p>
                    <div className="mt-10 flex gap-3">
                      <div className="w-2 h-2 rounded-full bg-blue-600/20" />
                      <div className="w-2 h-2 rounded-full bg-blue-600/40" />
                      <div className="w-2 h-2 rounded-full bg-blue-600/60" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {!loading && !error && activeTab === 'saques' && (
            <div className="space-y-8">
              {/* Stats Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-amber-500/10 p-8 rounded-[2.5rem] border border-amber-500/20 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">{t('admin.withdrawals.pending_title', 'Saques Pendentes')}</p>
                    <p className="text-3xl font-black text-white">{stats.pendingWithdrawals}</p>
                  </div>
                  <div className="w-14 h-14 bg-amber-500/20 rounded-2xl flex items-center justify-center text-amber-500">
                    <Clock size={28} />
                  </div>
                </div>
                <div className="bg-white/80 backdrop-blur-md p-8 rounded-[2.5rem] border border-slate-200/60 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('admin.withdrawals.total_requested', 'Total Solicitado')}</p>
                    <p className="text-3xl font-black text-slate-900">
                      R$ {withdrawals.reduce((acc, curr) => acc + Number(curr.valor), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500">
                    <CreditCard size={28} />
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3">
                {(['todos', 'pendente', 'pago', 'recusado'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setWithdrawalFilter(f)}
                    className={cn(
                      "px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border",
                      withdrawalFilter === f
                        ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/20"
                        : "bg-white/80 border-slate-200/60 text-slate-400 hover:text-blue-600"
                    )}
                  >
                    {t(`admin.withdrawals.filters.${f}`, f)}
                  </button>
                ))}
              </div>

              {/* List Table */}
              <div className="bg-white/80 backdrop-blur-md rounded-[2.5rem] border border-slate-200/60 shadow-2xl overflow-hidden">
                <div className="p-8 border-b border-slate-200/60">
                  <h3 className="text-xl font-black admin-title tracking-tight">{t('admin.withdrawals.table_title', 'Solicitações de Saque')}</h3>
                  <p className="text-sm text-slate-500 font-medium">{t('admin.withdrawals.table_subtitle', 'Controle os pedidos de saque feitos pelos fisioterapeutas via PIX.')}</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">{t('admin.withdrawals.table.date', 'Data')}</th>
                        <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">{t('admin.withdrawals.table.professional', 'Profissional')}</th>
                        <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">{t('admin.withdrawals.table.value', 'Valor')}</th>
                        <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">{t('admin.withdrawals.table.status', 'Status')}</th>
                        <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] text-right">{t('admin.withdrawals.table.actions', 'Ações')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredWithdrawals.map((w) => (
                          <tr key={w.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-8 py-5 text-sm font-bold text-slate-600 uppercase tabular-nums">
                              {new Date(w.created_at).toLocaleDateString('pt-BR')}
                            </td>
                            <td className="px-8 py-5">
                              <p className="text-sm font-bold text-slate-900">{w.fisioterapeuta?.nome_completo}</p>
                              <p className="text-[10px] text-slate-500">{w.fisioterapeuta?.email}</p>
                            </td>
                            <td className="px-8 py-5 text-sm font-black text-slate-900 tabular-nums">
                              R$ {Number(w.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-8 py-5">
                              <div className={cn(
                                "inline-flex px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border",
                                w.status === 'pago' ? "border-emerald-500/30 text-emerald-600 bg-emerald-500/5" :
                                w.status === 'recusado' ? "border-rose-500/30 text-rose-600 bg-rose-500/5" :
                                "border-amber-500/30 text-amber-600 bg-amber-500/5"
                              )}>
                                {String(t(`admin.withdrawals.status.${w.status}`, w.status))}
                              </div>
                            </td>
                            <td className="px-8 py-5 text-right">
                              {w.status === 'pendente' && (
                                <div className="flex items-center justify-end gap-3">
                                  <button
                                    onClick={() => handleUpdateWithdrawalStatus(w.id, 'recusado')}
                                    className="p-2.5 bg-rose-500/10 text-rose-600 hover:bg-rose-500 hover:text-white rounded-xl border border-rose-500/20 transition-all"
                                    title={t('admin.withdrawals.actions.reject', 'Recusar')}
                                  >
                                    <XCircle size={18} />
                                  </button>
                                  <button
                                    onClick={() => handleUpdateWithdrawalStatus(w.id, 'pago')}
                                    className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center gap-2"
                                  >
                                    <CheckCircle2 size={16} /> {t('admin.withdrawals.actions.approve', 'Marcar como Pago')}
                                  </button>
                                </div>
                              )}
                              {w.status !== 'pendente' && (
                                <span className="text-[10px] font-bold text-slate-400 italic uppercase">
                                  {w.processado_em ? `${t('admin.withdrawals.processed_at', 'Proc. em')} ${new Date(w.processado_em).toLocaleDateString('pt-BR')}` : t('admin.withdrawals.finished', 'Finalizado')}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                  {filteredWithdrawals.length === 0 && (
                    <div className="p-20 text-center">
                      <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-300 mx-auto mb-6">
                        <Filter size={40} strokeWidth={1} />
                      </div>
                      <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">{t('admin.withdrawals.no_results', 'Nenhuma solicitação encontrada.')}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {!loading && !error && activeTab === 'notifications' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Email/Template Test Tool */}
              <div className="bg-gradient-to-br from-blue-600/10 to-indigo-600/5 p-8 rounded-[3rem] border border-blue-500/20 shadow-xl">
                <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-blue-600/20 text-blue-400 rounded-2xl flex items-center justify-center border border-blue-500/20">
                      <Send size={32} />
                    </div>
                    <div>
                      <h4 className="text-xl font-black text-white uppercase tracking-tight">Template de E-mail (Produção)</h4>
                      <p className="text-slate-400 font-medium">Envie um e-mail real para sua caixa de entrada para validar o layout oficial.</p>
                    </div>
                  </div>
                  <button
                    onClick={handleTestEmail}
                    disabled={testEmailLoading}
                    className="flex items-center justify-center gap-3 px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-500 transition-all shadow-lg shadow-blue-900/40 group disabled:opacity-50 active:scale-95 whitespace-nowrap"
                  >
                    {testEmailLoading ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : (
                      <Sparkles size={20} className="group-hover:rotate-12 transition-transform" />
                    )}
                    <span>Testar template (produção)</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-blue-600/20 text-blue-400 rounded-3xl flex items-center justify-center border border-blue-500/20 shadow-lg shadow-blue-500/10">
                    <Bell size={32} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white tracking-tight">NOTIFICAÇÕES DO SISTEMA</h3>
                    <p className="text-sm text-slate-400 font-medium">Acompanhe eventos importantes e ações pendentes.</p>
                  </div>
                </div>
                <div className="px-6 py-4 bg-white/5 rounded-[2rem] border border-white/10">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Não Lidas</p>
                  <p className="text-2xl font-black text-rose-500">{adminNotifications.filter(n => !n.lida).length}</p>
                </div>
              </div>

              <div className="bg-white/5 rounded-[3rem] border border-white/10 overflow-hidden shadow-2xl">
                <div className="divide-y divide-white/5">
                  {adminNotifications.length > 0 ? (
                    adminNotifications.map((notification) => (
                      <div 
                        key={notification.id} 
                        className={cn(
                          "p-8 flex items-start justify-between gap-6 transition-all hover:bg-white/[0.02]",
                          !notification.lida && "bg-blue-500/5"
                        )}
                      >
                        <div className="flex items-start gap-4">
                          <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 mt-1",
                            notification.tipo === 'saque' ? "bg-emerald-500/10 text-emerald-400" : "bg-blue-500/10 text-blue-400"
                          )}>
                            {notification.tipo === 'saque' ? <DollarSign size={24} /> : <Bell size={24} />}
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-3">
                              <h4 className="text-lg font-black text-white">{notification.titulo}</h4>
                              {!notification.lida && (
                                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                              )}
                            </div>
                            <p className="text-slate-400 text-sm leading-relaxed max-w-2xl">{notification.mensagem}</p>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pt-2">
                              {new Date(notification.created_at).toLocaleDateString('pt-BR')} às {new Date(notification.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                        
                        {!notification.lida && (
                          <button
                            onClick={() => handleMarkNotificationAsRead(notification.id)}
                            className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border border-white/10 flex-shrink-0"
                          >
                            Marcar como lida
                          </button>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-32 text-center">
                      <div className="w-24 h-24 bg-white/5 rounded-[2.5rem] flex items-center justify-center text-slate-600 mx-auto mb-8">
                        <Bell size={48} strokeWidth={1} />
                      </div>
                      <h4 className="text-xl font-black text-white mb-2">Tudo em dia!</h4>
                      <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Nenhuma notificação encontrada no momento.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {!loading && !error && activeTab === 'tickets' && (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black text-white tracking-tight">Suporte e Tickets</h3>
                  <p className="text-slate-500 font-medium">Gerencie as solicitações de pacientes e fisioterapeutas.</p>
                </div>
                <div className="flex gap-2">
                   <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl flex items-center gap-2">
                     <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                       {tickets.filter(t => t.status === 'aberto').length} Pendentes
                     </span>
                   </div>
                </div>
              </div>

              <div className="bg-white/5 rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-white/5">
                        <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Ticket</th>
                        <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Usuário</th>
                        <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Status</th>
                        <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Data</th>
                        <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {tickets.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-8 py-20 text-center">
                            <p className="text-slate-500 font-bold">Nenhum ticket encontrado.</p>
                          </td>
                        </tr>
                      ) : (
                        tickets.map((t) => (
                          <tr key={t.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="px-8 py-5">
                              <p className="text-sm font-black text-white">{t.assunto}</p>
                              <p className="text-[10px] text-slate-500 uppercase tracking-tight">{t.categoria}</p>
                              <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{t.descricao}</p>
                            </td>
                            <td className="px-8 py-5">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-blue-600/10 text-blue-400 flex items-center justify-center text-xs font-black border border-blue-500/20">
                                  {t.usuario?.avatar_url || t.usuario?.foto_url ? (
                                    <img src={t.usuario.avatar_url || t.usuario.foto_url} className="w-full h-full object-cover rounded-lg" />
                                  ) : (
                                    t.usuario?.nome_completo?.charAt(0) || 'U'
                                  )}
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-white">{t.usuario?.nome_completo || 'Usuário Desconhecido'}</p>
                                  <p className="text-[9px] text-slate-500">{t.usuario?.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-8 py-5">
                              <select 
                                value={t.status}
                                onChange={(e) => handleUpdateTicketStatus(t.id, e.target.value)}
                                className={cn(
                                  "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-white/10 focus:outline-none focus:ring-0",
                                  t.status === 'aberto' ? "bg-amber-500/10 text-amber-500" :
                                  t.status === 'em_analise' ? "bg-blue-500/10 text-blue-500" :
                                  "bg-emerald-500/10 text-emerald-500"
                                )}
                              >
                                <option value="aberto">Aberto</option>
                                <option value="em_analise">Em Análise</option>
                                <option value="resolvido">Resolvido</option>
                                <option value="fechado">Fechado</option>
                              </select>
                            </td>
                            <td className="px-8 py-5 text-[10px] text-slate-500 font-bold">
                              {new Date(t.criado_em).toLocaleDateString('pt-BR')}
                            </td>
                            <td className="px-8 py-5 text-right">
                              <button 
                                onClick={() => {
                                  setSelectedChatUser(t.usuario);
                                  setActiveTab('chat');
                                }}
                                className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-xl transition-all"
                                title="Conversar com Usuário"
                              >
                                <MessageSquare size={18} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {!loading && !error && activeTab === 'settings' && (
            <div className="max-w-4xl space-y-8">
              {/* Profile Settings */}
              <div className="bg-white/5 p-10 rounded-[2.5rem] border border-white/5 shadow-2xl space-y-10">
                <h3 className="text-2xl font-black text-white tracking-tight">{t('admin.profile_title')}</h3>
                
                <div className="flex flex-col md:flex-row gap-10 items-start">
                  <div className="flex-shrink-0">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-4 block text-center">{t('profile.photo')}</label>
                    <AvatarUpload 
                      userId={supabaseUser?.id || ''} 
                      currentAvatarUrl={authProfile?.avatar_url || authProfile?.foto_url}
                      onUploadComplete={() => refreshProfile()}
                    />
                  </div>

                  <div className="flex-1 space-y-8 w-full">
                    <div className="grid grid-cols-1 gap-8">
                      <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Nome Completo</label>
                        <input 
                          type="text"
                          defaultValue={authProfile?.nome_completo || supabaseUser?.user_metadata?.full_name || 'Admin Master'}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold outline-none focus:ring-2 focus:ring-blue-500/20"
                          id="admin-name"
                        />
                      </div>
                      <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">E-mail</label>
                        <input 
                          type="email"
                          value={supabaseUser?.email || ''}
                          disabled
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-500 font-bold outline-none cursor-not-allowed"
                        />
                      </div>
                    </div>
                    
                    <button 
                      onClick={async () => {
                        const name = (document.getElementById('admin-name') as HTMLInputElement).value;
                        const { error } = await supabase.from('perfis').update({ nome_completo: name }).eq('id', supabaseUser?.id);
                        if (error) {
                          import('sonner').then(({ toast }) => toast.error("Erro ao atualizar perfil."));
                        } else {
                          await refreshProfile();
                          import('sonner').then(({ toast }) => toast.success(t('profile.update_success')));
                        }
                      }}
                      className="px-8 py-3 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all"
                    >
                      {t('admin.update_profile')}
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 p-10 rounded-[2.5rem] border border-white/5 shadow-2xl space-y-10">
                <h3 className="text-2xl font-black text-white tracking-tight">Configurações do Sistema</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-8">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Taxa de Comissão (%)</label>
                      <div className="flex gap-4">
                        <input 
                          type="number" 
                          value={commissionRate}
                          onChange={(e) => setCommissionRate(Number(e.target.value))}
                          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" 
                        />
                        <button 
                          onClick={handleSaveSettings}
                          className="px-8 py-3 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-900/20"
                        >
                          Salvar
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Notificações por Email</label>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/5">
                          <span className="text-sm font-bold text-slate-300">Novos Cadastros</span>
                          <div className="w-12 h-6 bg-blue-600 rounded-full relative cursor-pointer shadow-inner">
                            <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                          </div>
                        </div>
                        <div className="flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/5 opacity-40">
                          <span className="text-sm font-bold text-slate-300">Novos Pagamentos</span>
                          <div className="w-12 h-6 bg-white/10 rounded-full relative cursor-pointer">
                            <div className="absolute left-1 top-1 w-4 h-4 bg-slate-400 rounded-full" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Manutenção</label>
                      <div className="p-8 bg-amber-500/5 rounded-[2.5rem] border border-amber-500/10 space-y-5">
                        <p className="text-xs font-bold text-amber-500/80 leading-relaxed">
                          Utilize estas ferramentas para manter a integridade dos dados da plataforma e otimizar o desempenho.
                        </p>
                        <button 
                          onClick={handleCleanupOrphans}
                          className="w-full py-4 bg-white/5 text-amber-400 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-amber-500/10 transition-all border border-amber-500/20"
                        >
                          Limpar Registros Órfãos
                        </button>
                        <button 
                          onClick={handleFixAdminRoleConflict}
                          className="w-full py-4 bg-blue-600/10 text-blue-400 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-600/20 transition-all border border-blue-500/20 shadow-lg shadow-blue-500/5"
                        >
                          Corrigir Conflito de Papéis (Admin Master)
                        </button>
                        <button 
                          onClick={() => import('sonner').then(({ toast }) => toast.info("Cache do sistema limpo!"))}
                          className="w-full py-4 bg-white/5 text-rose-400 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-rose-500/10 transition-all border border-rose-500/20"
                        >
                          Limpar Cache Global
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Versão do Sistema</label>
                      <div className="p-6 bg-white/5 rounded-2xl border border-white/5 text-white">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Build</span>
                          <span className="text-xs font-mono text-blue-400">v2.4.0-stable</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Ambiente</span>
                          <span className="text-xs font-mono text-emerald-400">Produção</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 p-10 rounded-[2.5rem] border border-white/5 shadow-2xl space-y-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <Smartphone size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white tracking-tight">Integração WhatsApp</h3>
                    <p className="text-sm text-slate-500 font-medium tracking-tight">Teste do sistema de notificações automáticas via Twilio.</p>
                  </div>
                </div>

                <div className="p-8 bg-blue-600/5 rounded-[2.5rem] border border-blue-600/10 space-y-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Telefone para Teste</label>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <input 
                        type="text" 
                        placeholder="Ex: 5511999999999"
                        value={testPhoneNumber}
                        onChange={(e) => setTestPhoneNumber(e.target.value)}
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" 
                      />
                      <button 
                        onClick={handleTestWhatsApp}
                        disabled={testWhatsAppLoading}
                        className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {testWhatsAppLoading ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Send size={16} />
                        )}
                        Enviar Teste
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500 font-bold italic">
                      Certifique-se de que o número está no formato internacional (DDI + DDD + Número) sem símbolos.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 p-10 rounded-[2.5rem] border border-white/5 shadow-2xl">
                <h4 className="text-xl font-black text-white mb-6 tracking-tight">Logs de Atividade</h4>
                <div className="space-y-2">
                  {[
                    { action: 'Configuração alterada', user: 'Admin Master', time: '10 min atrás' },
                    { action: 'Novo material adicionado', user: 'Admin Master', time: '1 hora atrás' },
                    { action: 'Fisioterapeuta aprovado', user: 'Admin Master', time: '3 horas atrás' },
                  ].map((log, i) => (
                    <div key={i} className="flex items-center justify-between py-4 border-b border-white/5 last:border-0 hover:bg-white/[0.02] px-4 -mx-4 rounded-xl transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                        <span className="text-sm font-bold text-slate-300">{log.action}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-white uppercase tracking-widest">{log.user}</p>
                        <p className="text-[10px] text-slate-500 font-medium">{log.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

