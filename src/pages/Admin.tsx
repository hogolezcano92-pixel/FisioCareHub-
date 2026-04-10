import { useState, useEffect, useCallback } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../lib/firebase';
import { supabase } from '../lib/supabase';
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
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { 
  Users, 
  UserCheck, 
  UserPlus, 
  Calendar, 
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
  LogIn,
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
  Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDate, cn, resolveStorageUrl } from '../lib/utils';
import Logo from '../components/Logo';

export default function Admin() {
  const { user: supabaseUser, loading: loadingSupabase } = useAuth();
  const [firebaseUser, loadingFirebase] = useAuthState(auth);
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [firebaseLoginLoading, setFirebaseLoginLoading] = useState(false);

  // Real Data States
  const [users, setUsers] = useState<any[]>([]);
  const [supabaseProfiles, setSupabaseProfiles] = useState<any[]>([]);
  const [materiais, setMateriais] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [pendingPhysios, setPendingPhysios] = useState<any[]>([]);
  const [selectedUserDetail, setSelectedUserDetail] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [selectedChatUser, setSelectedChatUser] = useState<any>(null);
  const [newMessage, setNewMessage] = useState('');
  const [commissionRate, setCommissionRate] = useState(20);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [materialFile, setMaterialFile] = useState<File | null>(null);
  const [newMaterial, setNewMaterial] = useState({
    title: '',
    description: '',
    price: '',
    cover_image: '',
    file_url: '',
    category: 'Exercícios e Reabilitação'
  });
  const [stats, setStats] = useState({
    totalUsers: 0,
    activePhysios: 0,
    newPatients: 0,
    pendingAppointments: 0,
    totalRevenue: 0
  });

  // Ensure client-side rendering
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!loadingSupabase) {
      if (!supabaseUser) {
        navigate('/login');
        return;
      }

      const checkAdmin = async () => {
        const adminEmails = [
          'hogolezcano92@gmail.com'
        ];
        
        if (adminEmails.includes(supabaseUser.email?.toLowerCase() || '')) {
          setIsAdmin(true);
          setCheckingAdmin(false);
          return;
        }

        // Se não estiver na lista hardcoded, tenta buscar no Firestore
        // Mas isso só funciona se estiver logado no Firebase
        if (firebaseUser) {
          try {
            const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
            if (userDoc.exists() && userDoc.data().role === 'admin') {
              setIsAdmin(true);
            } else {
              navigate('/dashboard');
            }
          } catch (err) {
            console.error("Error checking admin status in Firestore:", err);
            // Se der erro de permissão, pode ser que ele seja admin mas não tenha permissão de leitura ainda
            // ou realmente não seja admin. Por segurança, não redireciona se ele estiver na lista de emails.
          }
        } else {
          // Se não estiver na lista e não estiver logado no Firebase, redireciona
          // Exceto se estivermos esperando o login do Firebase
          if (!loadingFirebase) {
            navigate('/dashboard');
          }
        }
        setCheckingAdmin(false);
      };

      checkAdmin();
    }
  }, [supabaseUser, loadingSupabase, firebaseUser, loadingFirebase, navigate]);

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
    setSupabaseProfiles(profiles);
    
    // Update Stats from Supabase Profiles
    const physios = profiles.filter((u: any) => u.tipo_usuario === 'fisioterapeuta');
    const patients = profiles.filter((u: any) => u.tipo_usuario === 'paciente');
    
    setStats(prev => ({
      ...prev,
      totalUsers: profiles.length,
      activePhysios: physios.filter((p: any) => p.status_aprovacao === 'aprovado').length,
      newPatients: patients.length,
      pendingAppointments: prev.pendingAppointments // Keep existing
    }));
  }, []);

  const fetchSupabaseProfiles = useCallback(async () => {
    try {
      // Fetch profiles and their latest active subscription
      const { data, error } = await supabase
        .from('perfis')
        .select('*, assinaturas(status, plano, data_expiracao)');
      
      if (error) {
        console.error("Erro ao buscar perfis Supabase:", error);
        // Fallback retry
        const { data: retryData, error: retryError } = await supabase.from('perfis').select('*');
        if (retryError) throw retryError;
        processProfiles(retryData || []);
      } else {
        // Process profiles and attach subscription status
        const profilesWithSub = data.map((p: any) => {
          const activeSub = p.assinaturas?.find((s: any) => s.status === 'ativo');
          return {
            ...p,
            is_pro: activeSub || p.is_pro // Keep is_pro as fallback or if already set
          };
        });
        processProfiles(profilesWithSub || []);
      }
    } catch (err) {
      console.error("Erro fatal ao buscar perfis:", err);
    }
  }, [processProfiles]);

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
    // Set up a simple poll or realtime subscription for Supabase
    const channel = supabase
      .channel(`perfis-changes-${Math.random().toString(36).substring(7)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'perfis' }, () => {
        fetchSupabaseProfiles();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'library_materials' }, () => {
        fetchMateriais();
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
    if (!isAdmin || !selectedChatUser || !firebaseUser) return;

    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', firebaseUser?.uid),
      orderBy('createdAt', 'asc')
    );

    const unsubMessages = onSnapshot(q, (snapshot) => {
      const chatMessages = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((msg: any) => 
          msg.participants.includes(selectedChatUser.id) || 
          msg.patientSupabaseId === selectedChatUser.id
        );
      setMessages(chatMessages);
    }, (error) => {
      console.error("Erro ao ouvir chat:", error);
    });

    return () => unsubMessages();
  }, [isAdmin, selectedChatUser, firebaseUser]);

  if (!mounted || loadingSupabase || checkingAdmin) return (
    <div className="flex flex-col items-center justify-center pt-32 space-y-4">
      <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Verificando permissões...</p>
    </div>
  );

  if (!isAdmin) return null;

  // Se for admin mas não estiver logado no Firebase, mostra tela de conexão
  if (!firebaseUser) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-12 rounded-[3rem] shadow-2xl border border-slate-100 max-w-md w-full text-center space-y-8"
        >
          <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
            <ShieldCheck size={48} />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Acesso Restrito</h2>
            <p className="text-slate-500 font-medium leading-relaxed">
              Você é um administrador, mas precisa conectar sua conta ao banco de dados administrativo para ver as informações.
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-left">
            <div className="flex gap-3">
              <AlertTriangle className="text-amber-500 flex-shrink-0" size={20} />
              <p className="text-xs text-amber-800 leading-relaxed font-medium">
                <strong>Importante:</strong> Uma janela (popup) será aberta para o login. Certifique-se de que seu navegador permite popups e não feche a janela antes de concluir o processo.
              </p>
            </div>
          </div>

          <button
            onClick={handleFirebaseLogin}
            disabled={firebaseLoginLoading}
            className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {firebaseLoginLoading ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <LogIn size={24} />}
            Conectar ao Banco de Dados
          </button>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">
            Use o mesmo e-mail: {supabaseUser?.email}
          </p>
        </motion.div>
      </div>
    );
  }

  const handleApprovePhysio = async (profileId: string, userId: string) => {
    try {
      // Update Supabase
      const { error: supabaseError } = await supabase
        .from('perfis')
        .update({ 
          status_aprovacao: 'aprovado' 
        })
        .eq('id', profileId);

      if (supabaseError) {
        console.error("Supabase update error:", supabaseError);
        if (supabaseError.message.includes('column')) {
          import('sonner').then(({ toast }) => toast.error("Erro: Colunas de aprovação não encontradas no banco de dados."));
        } else {
          throw supabaseError;
        }
      }

      // Update Firebase (if exists)
      try {
        await updateDoc(doc(db, 'physiotherapists', profileId), {
          status: 'approved',
          approved: true
        });
        await updateDoc(doc(db, 'users', userId), {
          status: 'approved'
        });
      } catch (fbErr) {
        console.warn("Firebase update failed (might not exist):", fbErr);
      }
      
      // Create notification
      try {
        await addDoc(collection(db, 'notifications'), {
          userId,
          title: 'Perfil Aprovado!',
          message: 'Seu perfil de fisioterapeuta foi aprovado pela administração.',
          type: 'system',
          read: false,
          createdAt: serverTimestamp()
        });
      } catch (notifErr) {
        console.warn("Notification creation failed:", notifErr);
      }

      // Manual refresh to ensure UI updates
      await fetchSupabaseProfiles();

      import('sonner').then(({ toast }) => toast.success("Fisioterapeuta aprovado!"));
    } catch (err: any) {
      console.error("Error approving physio:", err);
      import('sonner').then(({ toast }) => toast.error("Erro ao aprovar fisioterapeuta: " + (err.message || "")));
    }
  };

  const handleRejectPhysio = async (profileId: string, userId: string) => {
    try {
      // Update Supabase
      const { error: supabaseError } = await supabase
        .from('perfis')
        .update({ 
          status_aprovacao: 'rejeitado' 
        })
        .eq('id', profileId);

      if (supabaseError) {
        console.error("Supabase update error:", supabaseError);
        if (supabaseError.message.includes('column')) {
          import('sonner').then(({ toast }) => toast.error("Erro: Colunas de aprovação não encontradas no banco de dados."));
        } else {
          throw supabaseError;
        }
      }

      // Update Firebase (if exists)
      try {
        await updateDoc(doc(db, 'physiotherapists', profileId), {
          status: 'rejected',
          approved: false
        });
        await updateDoc(doc(db, 'users', userId), {
          status: 'rejected'
        });
      } catch (fbErr) {
        console.warn("Firebase update failed (might not exist):", fbErr);
      }
      
      // Create notification
      try {
        await addDoc(collection(db, 'notifications'), {
          userId,
          title: 'Perfil Rejeitado',
          message: 'Infelizmente seu perfil não foi aprovado. Entre em contato com o suporte para mais detalhes.',
          type: 'system',
          read: false,
          createdAt: serverTimestamp()
        });
      } catch (notifErr) {
        console.warn("Notification creation failed:", notifErr);
      }

      // Manual refresh
      await fetchSupabaseProfiles();

      import('sonner').then(({ toast }) => toast.success("Fisioterapeuta rejeitado."));
    } catch (err: any) {
      console.error("Error rejecting physio:", err);
      import('sonner').then(({ toast }) => toast.error("Erro ao rejeitar fisioterapeuta: " + (err.message || "")));
    }
  };

  const handleBlockUser = async (userId: string, currentStatus: string) => {
    try {
      const isBlocked = currentStatus === 'rejeitado' || currentStatus === 'blocked';
      const newStatus = isBlocked ? 'aprovado' : 'rejeitado';
      
      // Update Supabase
      await supabase
        .from('perfis')
        .update({ status_aprovacao: newStatus })
        .eq('id', userId);

      // Update Firebase (if exists)
      try {
        await updateDoc(doc(db, 'users', userId), {
          status: newStatus === 'aprovado' ? 'approved' : 'blocked'
        });
      } catch (fbErr) {
        console.warn("Firebase update failed:", fbErr);
      }

      import('sonner').then(({ toast }) => toast.success(`Status do usuário atualizado para: ${newStatus}!`));
    } catch (err) {
      console.error("Error toggling user status:", err);
      import('sonner').then(({ toast }) => toast.error("Erro ao alterar status do usuário."));
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm("Tem certeza que deseja excluir permanentemente este perfil? Esta ação não pode ser desfeita.")) return;
    
    try {
      const { error } = await supabase
        .from('perfis')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      setSupabaseProfiles(prev => prev.filter(p => p.id !== userId));
      import('sonner').then(({ toast }) => toast.success("Perfil excluído com sucesso!"));
    } catch (err) {
      console.error("Error deleting user:", err);
      import('sonner').then(({ toast }) => toast.error("Erro ao excluir perfil."));
    }
  };

  const handleCleanupOrphans = async () => {
    if (!window.confirm("Deseja remover perfis incompletos (sem nome ou email)? Isso ajuda a limpar registros de testes ou falhas no cadastro.")) return;
    
    try {
      const { data: orphans, error: fetchError } = await supabase
        .from('perfis')
        .select('id')
        .or('nome_completo.is.null,email.is.null,nome.is.null');
      
      if (fetchError) throw fetchError;
      
      if (!orphans || orphans.length === 0) {
        import('sonner').then(({ toast }) => toast.info("Nenhum registro órfão encontrado."));
        return;
      }

      const idsToDelete = orphans.map(o => o.id);
      const { error: deleteError } = await supabase
        .from('perfis')
        .delete()
        .in('id', idsToDelete);

      if (deleteError) throw deleteError;

      setSupabaseProfiles(prev => prev.filter(p => !idsToDelete.includes(p.id)));
      import('sonner').then(({ toast }) => toast.success(`${idsToDelete.length} registros órfãos removidos!`));
    } catch (err) {
      console.error("Error cleaning orphans:", err);
      import('sonner').then(({ toast }) => toast.error("Erro ao limpar registros."));
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChatUser) return;

    // Find patient's Firebase UID from existing messages
    const patientMsg = messages.find((m: any) => m.patientFirebaseUid);
    const patientFirebaseUid = patientMsg?.patientFirebaseUid || selectedChatUser.id;

    try {
      await addDoc(collection(db, 'chats'), {
        senderId: firebaseUser?.uid,
        receiverId: selectedChatUser.id,
        participants: [firebaseUser?.uid, patientFirebaseUid, selectedChatUser.id],
        text: newMessage,
        createdAt: serverTimestamp(),
        read: false,
        type: 'support',
        patientSupabaseId: selectedChatUser.id,
        patientFirebaseUid: patientFirebaseUid
      });
      
      // Notify user
      await addDoc(collection(db, 'notifications'), {
        userId: selectedChatUser.id,
        title: 'Nova mensagem do Suporte',
        message: 'A administração respondeu ao seu chamado.',
        type: 'message',
        read: false,
        createdAt: serverTimestamp(),
        link: '/chat?support=true'
      });

      setNewMessage('');
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  const handleSaveSettings = async () => {
    try {
      await addDoc(collection(db, 'settings'), {
        commissionRate,
        updatedAt: serverTimestamp(),
        updatedBy: firebaseUser?.uid
      });
      import('sonner').then(({ toast }) => toast.success("Configurações salvas com sucesso!"));
    } catch (err) {
      console.error("Error saving settings:", err);
      import('sonner').then(({ toast }) => toast.error("Erro ao salvar configurações."));
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

  const handleAddMaterial = async () => {
    const precoNum = parseFloat(newMaterial.price);
    
    if (!newMaterial.title || isNaN(precoNum)) {
      import('sonner').then(({ toast }) => toast.error("Preencha o título e o preço corretamente."));
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
          ...newMaterial,
          price: precoNum,
          cover_image: finalImageUrl,
          file_url: finalArquivoUrl
        }]);
      
      if (error) {
        console.error("Erro Supabase:", error);
        throw new Error(error.message);
      }
      
      import('sonner').then(({ toast }) => toast.success("Material adicionado com sucesso!"));
      setShowMaterialModal(false);
      setImageFile(null);
      setMaterialFile(null);
      setNewMaterial({
        title: '',
        description: '',
        price: '',
        cover_image: '',
        file_url: '',
        category: 'Exercícios e Reabilitação'
      });
      fetchMateriais();
    } catch (err: any) {
      console.error("Erro ao adicionar material:", err);
      import('sonner').then(({ toast }) => toast.error(`Erro ao adicionar: ${err.message || 'Verifique se a tabela e o bucket materiais existem no Supabase'}`));
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteMaterial = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja excluir este material?")) return;
    try {
      const { error } = await supabase
        .from('library_materials')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      fetchMateriais();
      import('sonner').then(({ toast }) => toast.success("Material excluído!"));
    } catch (err) {
      console.error("Erro ao excluir material:", err);
    }
  };

  const filteredUsers = users.filter(u => 
    (u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const STATS_CARDS = [
    { label: 'Total de Usuários', value: stats.totalUsers.toString(), icon: Users, color: 'blue' },
    { label: 'Fisios Ativos', value: stats.activePhysios.toString(), icon: UserCheck, color: 'emerald' },
    { label: 'Receita Total', value: `R$ ${stats.totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'indigo' },
    { label: 'Consultas Pendentes', value: stats.pendingAppointments.toString(), icon: Calendar, color: 'rose' },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900 -mx-4 sm:-mx-6 lg:-mx-8 -my-8 overflow-x-hidden relative">
      {/* User Detail Modal */}
      <AnimatePresence>
        {selectedUserDetail && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedUserDetail(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-black text-2xl overflow-hidden shadow-lg shadow-blue-100">
                    {selectedUserDetail.avatar_url ? (
                      <img src={selectedUserDetail.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      selectedUserDetail.nome_completo?.charAt(0)
                    )}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">{selectedUserDetail.nome_completo}</h3>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">{selectedUserDetail.tipo_usuario}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedUserDetail(null)}
                  className="p-3 bg-white text-slate-400 hover:text-slate-900 rounded-2xl shadow-sm border border-slate-100 transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                {/* Basic Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">E-mail</p>
                    <p className="text-sm font-bold text-slate-900 break-all">{selectedUserDetail.email}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CREFITO</p>
                    <p className="text-sm font-bold text-slate-900">{selectedUserDetail.crefito || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Localização</p>
                    <p className="text-sm font-bold text-slate-900">{selectedUserDetail.localizacao || 'Não informada'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cadastro em</p>
                    <p className="text-sm font-bold text-slate-900">
                      {selectedUserDetail.created_at ? new Date(selectedUserDetail.created_at).toLocaleDateString('pt-BR') : 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Bio */}
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sobre / Bio</p>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm text-slate-600 leading-relaxed italic">
                    {selectedUserDetail.bio || 'Nenhuma biografia informada.'}
                  </div>
                </div>

                {/* Documents */}
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Documentos e Comprovantes</p>
                  {(() => {
                    const docs = Array.isArray(selectedUserDetail.documentos) 
                      ? selectedUserDetail.documentos 
                      : (typeof selectedUserDetail.documentos === 'string' && selectedUserDetail.documentos.startsWith('[')
                          ? JSON.parse(selectedUserDetail.documentos)
                          : []);
                    
                    if (docs.length > 0) {
                      return (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {docs.map((doc: string, idx: number) => (
                            <a 
                              key={idx} 
                              href={resolveStorageUrl(doc)} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-2xl hover:border-blue-600 hover:shadow-lg hover:shadow-blue-50 transition-all group"
                            >
                              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
                                <Download size={20} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-slate-900 truncate">Documento Profissional {idx + 1}</p>
                                <p className="text-[10px] text-slate-500 font-medium truncate">{doc.split('/').pop()}</p>
                              </div>
                            </a>
                          ))}
                        </div>
                      );
                    }
                    
                    return (
                      <div className="p-8 border-2 border-dashed border-slate-200 rounded-[2rem] text-center">
                        <p className="text-sm text-slate-400 font-bold">Nenhum documento anexado.</p>
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
                        handleApprovePhysio(selectedUserDetail.id, selectedUserDetail.id);
                        setSelectedUserDetail(null);
                      }}
                      className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
                    >
                      Aprovar Cadastro
                    </button>
                    <button 
                      onClick={() => {
                        handleRejectPhysio(selectedUserDetail.id, selectedUserDetail.id);
                        setSelectedUserDetail(null);
                      }}
                      className="flex-1 py-4 bg-rose-50 text-rose-600 rounded-2xl font-black text-sm hover:bg-rose-100 transition-all"
                    >
                      Rejeitar
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => setSelectedUserDetail(null)}
                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-slate-800 transition-all"
                  >
                    Fechar Detalhes
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
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-[70] w-64 bg-white border-r border-slate-200 transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0",
          !sidebarOpen ? "-translate-x-full lg:w-20" : "translate-x-0"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100">
            <div className={cn("flex items-center gap-2 overflow-hidden transition-all", !sidebarOpen && "lg:hidden")}>
              <Logo size="sm" />
            </div>
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>

          {/* Nav Links */}
          <nav className="flex-1 py-6 px-3 space-y-1">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'materiais', label: 'Materiais (Loja)', icon: BookOpen },
              { id: 'physios', label: 'Fisioterapeutas', icon: Stethoscope },
              { id: 'patients', label: 'Pacientes', icon: User },
              { id: 'approvals', label: 'Aprovações', icon: UserCheck },
              { id: 'users', label: 'Todos Usuários', icon: Users },
              { id: 'financial', label: 'Financeiro', icon: DollarSign },
              { id: 'chat', label: 'Suporte Chat', icon: MessageSquare },
              { id: 'settings', label: 'Configurações', icon: Settings },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  if (window.innerWidth < 1024) setSidebarOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all group",
                  activeTab === item.id 
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-100" 
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <item.icon size={20} className={cn("flex-shrink-0", activeTab === item.id ? "text-white" : "text-slate-400 group-hover:text-slate-600")} />
                <span className={cn("transition-opacity", !sidebarOpen && "lg:hidden")}>{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-slate-100">
            <div className={cn("flex items-center gap-3 p-2 rounded-xl bg-slate-50 overflow-hidden", !sidebarOpen && "lg:justify-center")}>
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs flex-shrink-0">
                {firebaseUser?.email?.charAt(0).toUpperCase()}
              </div>
              <div className={cn("flex-1 min-w-0 transition-opacity", !sidebarOpen && "lg:hidden")}>
                <p className="text-xs font-bold text-slate-900 truncate">Admin Master</p>
                <p className="text-[10px] text-slate-500 truncate">{firebaseUser?.email}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 w-full overflow-x-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-8 flex-shrink-0 sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <button className="lg:hidden p-2 text-slate-500 hover:bg-slate-50 rounded-lg" onClick={() => setSidebarOpen(true)}>
              <Menu size={24} />
            </button>
            <h2 className="text-xl sm:text-3xl font-display font-black text-slate-900 tracking-tight capitalize truncate">
              {activeTab === 'dashboard' ? (
                <>Visão <span className="text-blue-600 italic">Geral</span></>
              ) : activeTab}
            </h2>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all w-40 md:w-64"
              />
            </div>
            <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
              <Bell size={20} />
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 p-4 sm:p-8 space-y-8 max-w-full overflow-x-hidden">
          {activeTab === 'dashboard' && (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {STATS_CARDS.map((stat, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center",
                        stat.color === 'blue' && "bg-blue-50 text-blue-600",
                        stat.color === 'emerald' && "bg-emerald-50 text-emerald-600",
                        stat.color === 'indigo' && "bg-indigo-50 text-indigo-600",
                        stat.color === 'rose' && "bg-rose-50 text-rose-600",
                      )}>
                        <stat.icon size={24} />
                      </div>
                      <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Live
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tighter">{stat.value}</p>
                      <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* App Preview Button */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => window.location.href = '/preview'}
                className="w-full mb-8 p-6 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-[2rem] text-white shadow-xl shadow-cyan-100 flex items-center justify-between group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl group-hover:bg-white/20 transition-colors" />
                <div className="flex items-center gap-6 relative z-10">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                    <Smartphone size={32} />
                  </div>
                  <div className="text-left">
                    <h3 className="text-xl font-black tracking-tighter mb-1">Ver Prévia Mobile</h3>
                    <p className="text-sm text-white/80 font-medium">Interface 'FisioCareHub' atualizada em alta fidelidade.</p>
                  </div>
                </div>
                <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center group-hover:translate-x-2 transition-transform duration-500 relative z-10">
                  <ArrowLeft className="rotate-180" size={24} />
                </div>
              </motion.button>

              {/* Recent Users Table */}
              <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">Usuários Recentes</h3>
                    <p className="text-xs text-slate-500 font-medium">Últimos cadastros na plataforma.</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                      <tr className="bg-slate-50/50">
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Usuário</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Papel</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Status</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {supabaseProfiles
                        .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
                        .slice(0, 5)
                        .map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm overflow-hidden">
                                {u.avatar_url ? (
                                  <img src={u.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  u.nome_completo?.charAt(0)
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-900">{u.nome_completo}</p>
                                <p className="text-[10px] text-slate-500">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <span className={cn(
                                "text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider w-fit",
                                u.tipo_usuario === 'fisioterapeuta' ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-600"
                              )}>
                                {u.tipo_usuario === 'fisioterapeuta' ? 'Fisioterapeuta' : 'Paciente'}
                              </span>
                              {u.is_pro && (
                                <span className="text-[8px] font-black px-1.5 py-0.5 bg-amber-100 text-amber-600 rounded uppercase tracking-tighter flex items-center gap-0.5 w-fit">
                                  <Crown size={8} /> PRO
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider",
                              u.status_aprovacao === 'aprovado' ? "bg-emerald-50 text-emerald-600" : 
                              u.status_aprovacao === 'rejeitado' ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600"
                            )}>
                              {u.status_aprovacao || 'Pendente'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button 
                              onClick={() => {
                                setActiveTab('users');
                                setSelectedUserDetail(u);
                              }}
                              className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                            >
                              <Eye size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {activeTab === 'materiais' && (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">Biblioteca de Cuidados</h3>
                  <p className="text-slate-500 font-medium">Gerencie os materiais disponíveis para venda aos pacientes.</p>
                </div>
                <button 
                  onClick={() => setShowMaterialModal(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 transition-all shadow-xl shadow-blue-100"
                >
                  <Plus size={20} />
                  Novo Material
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {materiais.map((m) => (
                  <div key={m.id} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden group hover:shadow-xl transition-all">
                    <div className="h-40 relative overflow-hidden">
                      <img 
                        src={m.cover_image || 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=400'} 
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
                        <h4 className="font-black text-slate-900 text-lg leading-tight mb-1">{m.title}</h4>
                        <p className="text-xs text-slate-500 font-medium line-clamp-2">{m.description}</p>
                      </div>
                      <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                        <p className="text-xl font-black text-blue-600">R$ {m.price?.toLocaleString()}</p>
                        <button 
                          onClick={() => handleDeleteMaterial(m.id)}
                          className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {materiais.length === 0 && (
                <div className="p-12 border-2 border-dashed border-slate-200 rounded-[3rem] text-center space-y-4">
                  <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto">
                    <BookOpen size={32} />
                  </div>
                  <p className="text-slate-400 font-bold">Nenhum material cadastrado ainda.</p>
                </div>
              )}

              {/* Modal Novo Material */}
              <AnimatePresence>
                {showMaterialModal && (
                  <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setShowMaterialModal(false)}
                      className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: 20 }}
                      className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden p-8 space-y-6"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Novo Material</h3>
                        <button onClick={() => setShowMaterialModal(false)} className="text-slate-400 hover:text-slate-900">
                          <X size={24} />
                        </button>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Título</label>
                          <input 
                            type="text" 
                            value={newMaterial.title}
                            onChange={(e) => setNewMaterial({...newMaterial, title: e.target.value})}
                            placeholder="Ex: Guia de Exercícios"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Descrição</label>
                          <textarea 
                            value={newMaterial.description}
                            onChange={(e) => setNewMaterial({...newMaterial, description: e.target.value})}
                            placeholder="Breve descrição do conteúdo..."
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none h-24 resize-none"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Preço (R$)</label>
                            <input 
                              type="text" 
                              value={newMaterial.price}
                              onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9.]/g, '');
                                setNewMaterial({...newMaterial, price: val});
                              }}
                              placeholder="0.00"
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Categoria</label>
                            <select 
                              value={newMaterial.category}
                              onChange={(e) => setNewMaterial({...newMaterial, category: e.target.value})}
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
                            >
                              <option value="Exercícios e Reabilitação">Exercícios e Reabilitação</option>
                              <option value="Dor Lombar">Dor Lombar</option>
                              <option value="Lesões Esportivas">Lesões Esportivas</option>
                              <option value="Postura">Postura</option>
                              <option value="Mobilidade">Mobilidade</option>
                              <option value="Recuperação Pós-Cirúrgica">Recuperação Pós-Cirúrgica</option>
                            </select>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Imagem de Capa</label>
                          <div className="flex items-center gap-4">
                            <label className="flex-1 flex flex-col items-center justify-center h-32 border-2 border-dashed border-slate-200 rounded-2xl hover:border-blue-500 hover:bg-blue-50/50 transition-all cursor-pointer group">
                              {imageFile ? (
                                <div className="flex flex-col items-center gap-2">
                                  <CheckCircle2 className="text-emerald-500" size={32} />
                                  <span className="text-xs font-bold text-slate-600">{imageFile.name}</span>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center gap-2">
                                  <Upload className="text-slate-400 group-hover:text-blue-500" size={32} />
                                  <span className="text-xs font-bold text-slate-400 group-hover:text-blue-600">Upload da Imagem</span>
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
                              <p className="text-[10px] font-bold text-slate-400">OU use uma URL externa:</p>
                              <input 
                                type="text" 
                                value={newMaterial.cover_image}
                                onChange={(e) => setNewMaterial({...newMaterial, cover_image: e.target.value})}
                                placeholder="https://..."
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none text-sm"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Material (PDF)</label>
                          <div className="flex items-center gap-4">
                            <label className="flex-1 flex flex-col items-center justify-center h-24 border-2 border-dashed border-slate-200 rounded-2xl hover:border-blue-500 hover:bg-blue-50/50 transition-all cursor-pointer group">
                              {materialFile ? (
                                <div className="flex flex-col items-center gap-1">
                                  <FileIcon className="text-emerald-500" size={24} />
                                  <span className="text-[10px] font-bold text-slate-600 truncate max-w-[120px]">{materialFile.name}</span>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center gap-1">
                                  <Upload className="text-slate-400 group-hover:text-blue-500" size={24} />
                                  <span className="text-[10px] font-bold text-slate-400 group-hover:text-blue-600">Upload do PDF</span>
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
                              <p className="text-[10px] font-bold text-slate-400">OU use uma URL externa:</p>
                              <input 
                                type="text" 
                                value={newMaterial.file_url}
                                onChange={(e) => setNewMaterial({...newMaterial, file_url: e.target.value})}
                                placeholder="Link externo..."
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <button 
                        onClick={handleAddMaterial}
                        disabled={uploading}
                        className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {uploading ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Subindo...
                          </>
                        ) : 'Salvar Material'}
                      </button>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Todos os Usuários</h3>
                <div className="flex items-center gap-2">
                  <Search className="text-slate-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Filtrar usuários..." 
                    className="text-sm border-none focus:ring-0 bg-transparent"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Nome</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Email</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Papel</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">CREFITO</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Status</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {supabaseProfiles
                      .filter(p => {
                        const search = searchTerm.toLowerCase();
                        const name = (p.nome_completo || '').toLowerCase();
                        const email = (p.email || '').toLowerCase();
                        return name.includes(search) || email.includes(search);
                      })
                      .map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center text-[10px] font-bold text-slate-500">
                              {u.avatar_url ? (
                                <img src={u.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                u.nome_completo?.charAt(0)
                              )}
                            </div>
                            <span className="text-sm font-bold text-slate-900">{u.nome_completo}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">{u.email}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <span className={cn(
                              "text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider w-fit",
                              u.tipo_usuario === 'fisioterapeuta' ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-600"
                            )}>
                              {u.tipo_usuario === 'fisioterapeuta' ? 'Fisioterapeuta' : 'Paciente'}
                            </span>
                            {u.is_pro && (
                              <span className="text-[8px] font-black px-1.5 py-0.5 bg-amber-100 text-amber-600 rounded uppercase tracking-tighter flex items-center gap-0.5 w-fit">
                                <Crown size={8} /> PRO
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-black text-slate-900 bg-slate-100 px-2 py-1 rounded-lg">
                            {u.crefito || '---'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider",
                            u.status_aprovacao === 'aprovado' ? "bg-emerald-50 text-emerald-600" : 
                            u.status_aprovacao === 'rejeitado' ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600"
                          )}>
                            {u.status_aprovacao || 'Pendente'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => setSelectedUserDetail(u)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="Ver Detalhes"
                            >
                              <Eye size={16} />
                            </button>
                            <button 
                              onClick={() => handleBlockUser(u.id, u.status_aprovacao)}
                              className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg"
                              title="Bloquear/Desbloquear"
                            >
                              <Lock size={16} />
                            </button>
                            <button 
                              onClick={() => handleDeleteUser(u.id)}
                              className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg"
                              title="Excluir Perfil"
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

          {activeTab === 'physios' && (
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">Fisioterapeutas Cadastrados</h3>
                  <p className="text-xs text-slate-500 font-medium">Lista exclusiva de profissionais.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Search className="text-slate-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Buscar fisioterapeuta..." 
                    className="text-sm border-none focus:ring-0 bg-transparent"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Profissional</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">CREFITO</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Especialidade</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Status</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {supabaseProfiles
                      .filter(p => {
                        const role = (p.plano || '').toLowerCase();
                        return role === 'fisioterapeuta';
                      })
                      .filter(p => {
                        const search = searchTerm.toLowerCase();
                        const name = (p.nome_completo || '').toLowerCase();
                        const crefito = (p.crefito || '').toLowerCase();
                        return name.includes(search) || crefito.includes(search);
                      })
                      .map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 overflow-hidden flex items-center justify-center text-xs font-bold text-blue-600">
                              {u.avatar_url ? (
                                <img src={u.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                u.nome_completo?.charAt(0)
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-black text-slate-900 tracking-tight">{u.nome_completo}</p>
                              <p className="text-[10px] text-slate-500 font-medium">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-black shadow-lg shadow-blue-100">
                            {u.crefito || 'PENDENTE'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-slate-600">{u.especialidade || '---'}</td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider",
                            u.status_aprovacao === 'aprovado' ? "bg-emerald-50 text-emerald-600" : 
                            u.status_aprovacao === 'rejeitado' ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600"
                          )}>
                            {u.status_aprovacao || 'Pendente'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => setSelectedUserDetail(u)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="Ver Detalhes"
                            >
                              <Eye size={18} />
                            </button>
                            {(u.status_aprovacao === 'pendente' || !u.status_aprovacao) && (
                              <>
                                <button 
                                  onClick={() => handleApprovePhysio(u.id, u.id)}
                                  className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                                  title="Aprovar"
                                >
                                  <CheckCircle2 size={18} />
                                </button>
                                <button 
                                  onClick={() => handleRejectPhysio(u.id, u.id)}
                                  className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg"
                                  title="Rejeitar"
                                >
                                  <XCircle size={18} />
                                </button>
                              </>
                            )}
                            <button 
                              onClick={() => handleDeleteUser(u.id)}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                              title="Excluir"
                            >
                              <Trash2 size={18} />
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

          {activeTab === 'patients' && (
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">Pacientes Cadastrados</h3>
                  <p className="text-xs text-slate-500 font-medium">Lista exclusiva de clientes.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Search className="text-slate-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Buscar paciente..." 
                    className="text-sm border-none focus:ring-0 bg-transparent"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Paciente</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Email</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Localização</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {supabaseProfiles
                      .filter(p => {
                        const role = (p.plano || '').toLowerCase();
                        return role === 'free';
                      })
                      .filter(p => {
                        const search = searchTerm.toLowerCase();
                        const name = (p.nome_completo || '').toLowerCase();
                        const email = (p.email || '').toLowerCase();
                        return name.includes(search) || email.includes(search);
                      })
                      .map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center text-xs font-bold text-slate-500">
                              {u.avatar_url ? (
                                <img src={u.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                u.nome_completo?.charAt(0)
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-black text-slate-900 tracking-tight">{u.nome_completo}</p>
                              <p className="text-[10px] text-slate-500 font-medium">Cadastrado em {u.created_at ? new Date(u.created_at).toLocaleDateString() : '---'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 font-medium">{u.email}</td>
                        <td className="px-6 py-4 text-xs font-bold text-slate-500">{u.localizacao || 'Não inf.'}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => setSelectedUserDetail(u)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="Ver Detalhes"
                            >
                              <Eye size={18} />
                            </button>
                            <button 
                              onClick={() => handleBlockUser(u.id, u.status_aprovacao)}
                              className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg"
                              title="Bloquear"
                            >
                              <Lock size={18} />
                            </button>
                            <button 
                              onClick={() => handleDeleteUser(u.id)}
                              className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg"
                              title="Excluir"
                            >
                              <Trash2 size={18} />
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

          {activeTab === 'approvals' && (
            <div className="space-y-6">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Aprovações Pendentes</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {supabaseProfiles.filter(p => 
                  (p.tipo_usuario === 'fisioterapeuta') && 
                  (p.status_aprovacao === 'pendente' || !p.status_aprovacao)
                ).length === 0 ? (
                  <div className="col-span-full bg-white p-12 rounded-[2rem] border border-slate-100 text-center space-y-4">
                    <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle2 size={32} />
                    </div>
                    <p className="font-bold text-slate-900">Tudo em dia!</p>
                    <p className="text-sm text-slate-500">Não há fisioterapeutas aguardando aprovação no momento.</p>
                  </div>
                ) : (
                  supabaseProfiles.filter(p => 
                    (p.tipo_usuario === 'fisioterapeuta') && 
                    (p.status_aprovacao === 'pendente' || !p.status_aprovacao)
                  ).map((profile) => (
                    <motion.div 
                      key={profile.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 font-bold overflow-hidden">
                          {profile.avatar_url ? (
                            <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            profile.nome_completo?.charAt(0)
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{profile.nome_completo}</p>
                          <p className="text-xs text-slate-500">{profile.email} • CREFITO: {profile.crefito || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[10px] font-bold uppercase tracking-wider">
                        <div className="bg-slate-50 p-2 rounded-lg truncate">Especialidade: {profile.especialidade || 'Não inf.'}</div>
                        <div className="bg-slate-50 p-2 rounded-lg truncate">Tipo: {profile.plano || profile.tipo_usuario}</div>
                      </div>
                      
                      {(() => {
                        const docs = Array.isArray(profile.documentos) 
                          ? profile.documentos 
                          : (typeof profile.documentos === 'string' && profile.documentos.startsWith('[')
                              ? JSON.parse(profile.documentos)
                              : []);
                        
                        if (docs.length > 0) {
                          return (
                            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                              <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">Documentos Anexados ({docs.length})</p>
                              <div className="flex flex-wrap gap-2">
                                {docs.map((doc: string, idx: number) => (
                                  <a 
                                    key={idx} 
                                    href={resolveStorageUrl(doc)} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="px-2 py-1 bg-white border border-blue-200 rounded-lg text-[10px] font-bold text-blue-600 hover:bg-blue-600 hover:text-white transition-all"
                                  >
                                    Doc {idx + 1}
                                  </a>
                                ))}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}

                      <div className="flex items-center gap-2 pt-2">
                        <button 
                          onClick={() => setSelectedUserDetail(profile)}
                          className="p-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors"
                          title="Ver Detalhes"
                        >
                          <Eye size={18} />
                        </button>
                        <button 
                          onClick={() => handleApprovePhysio(profile.id, profile.id)}
                          className="flex-1 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors"
                        >
                          Aprovar
                        </button>
                        <button 
                          onClick={() => handleRejectPhysio(profile.id, profile.id)}
                          className="flex-1 py-2 bg-rose-50 text-rose-600 rounded-xl text-xs font-bold hover:bg-rose-100 transition-colors"
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

          {activeTab === 'financial' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Receita Mensal</p>
                  <p className="text-3xl font-black text-slate-900 tracking-tighter">R$ {(stats.totalRevenue * 0.8).toLocaleString()}</p>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Comissões (20%)</p>
                  <p className="text-3xl font-black text-emerald-600 tracking-tighter">R$ {(stats.totalRevenue * 0.2).toLocaleString()}</p>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Transações</p>
                  <p className="text-3xl font-black text-blue-600 tracking-tighter">{payments.length}</p>
                </div>
              </div>

              <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-50">
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">Histórico de Transações</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/50">
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Data</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Valor</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Comissão</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {payments.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 text-xs text-slate-500 font-medium">
                            {p.createdAt?.toDate ? p.createdAt.toDate().toLocaleDateString('pt-BR') : 'Recent'}
                          </td>
                          <td className="px-6 py-4 text-sm font-bold text-slate-900">R$ {p.amount?.toLocaleString()}</td>
                          <td className="px-6 py-4 text-sm font-bold text-emerald-600">R$ {p.commission?.toLocaleString()}</td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                              p.status === 'paid' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                            )}>
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="h-[calc(100vh-200px)] min-h-[500px] bg-white rounded-[2.5rem] border border-slate-100 shadow-sm flex overflow-hidden relative">
              {/* User List - Sidebar */}
              <div className={cn(
                "w-full md:w-1/3 border-r border-slate-100 flex flex-col bg-white transition-all duration-300",
                selectedChatUser ? "hidden md:flex" : "flex"
              )}>
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                  <h4 className="font-black text-slate-900 tracking-tight">Conversas</h4>
                  <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                    <Search size={14} />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                  {users.filter(u => u.role !== 'admin').map(u => (
                    <button
                      key={u.id}
                      onClick={() => setSelectedChatUser(u)}
                      className={cn(
                        "w-full flex items-center gap-4 p-4 rounded-2xl transition-all group",
                        selectedChatUser?.id === u.id 
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-200" 
                          : "hover:bg-slate-50 text-slate-600"
                      )}
                    >
                      <div className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 shadow-sm transition-transform group-hover:scale-105",
                        selectedChatUser?.id === u.id ? "bg-white/20 text-white" : "bg-blue-50 text-blue-600"
                      )}>
                        {u.nome_completo?.charAt(0).toUpperCase()}
                      </div>
                      <div className="text-left flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="text-sm font-bold truncate">{u.nome_completo}</p>
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider",
                            (u.tipo_usuario === 'fisioterapeuta' || u.role === 'physiotherapist')
                              ? (selectedChatUser?.id === u.id ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-600")
                              : (selectedChatUser?.id === u.id ? "bg-white/20 text-white" : "bg-blue-50 text-blue-600")
                          )}>
                            {(u.tipo_usuario === 'fisioterapeuta' || u.role === 'physiotherapist') ? 'Fisio' : 'Paciente'}
                          </span>
                        </div>
                        <p className={cn(
                          "text-[10px] truncate",
                          selectedChatUser?.id === u.id ? "text-white/70" : "text-slate-400"
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
                "flex-1 flex flex-col bg-slate-50/30 transition-all duration-300",
                !selectedChatUser ? "hidden md:flex" : "flex"
              )}>
                {selectedChatUser ? (
                  <>
                    {/* Chat Header */}
                    <div className="px-3 py-2.5 md:p-6 bg-white border-b border-slate-100 flex items-center gap-2 md:gap-4 h-[70px] md:h-auto">
                      <button 
                        onClick={() => setSelectedChatUser(null)}
                        className="md:hidden p-1.5 -ml-1 text-slate-400 hover:text-blue-600 transition-colors"
                      >
                        <ArrowLeft size={20} />
                      </button>
                      <div className="w-9 h-9 md:w-12 md:h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm shadow-sm flex-shrink-0">
                        {selectedChatUser.nome_completo?.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-slate-900 truncate text-sm md:text-lg pr-2">{selectedChatUser.nome_completo}</p>
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <p className="text-[8px] md:text-[10px] text-emerald-500 font-black uppercase tracking-widest">Online</p>
                        </div>
                      </div>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed">
                      {messages.map((m, idx) => {
                        const mDate = m.createdAt?.toDate ? m.createdAt.toDate() : new Date();
                        const prevM = idx > 0 ? messages[idx - 1] : null;
                        const prevMDate = prevM?.createdAt?.toDate ? prevM.createdAt.toDate() : (prevM ? new Date() : null);
                        
                        const showDateSeparator = !prevMDate || 
                          mDate.toDateString() !== prevMDate.toDateString();

                        return (
                          <div key={m.id} className="space-y-6">
                            {showDateSeparator && (
                              <div className="flex justify-center my-8">
                                <div className="px-4 py-1 bg-slate-100/50 backdrop-blur-sm border border-slate-200/50 rounded-full text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                  {mDate.toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' })}
                                </div>
                              </div>
                            )}
                            <div 
                              className={cn(
                                "max-w-[85%] md:max-w-[70%] p-4 rounded-3xl text-sm shadow-sm relative group",
                                m.senderId === firebaseUser?.uid 
                                  ? "ml-auto bg-blue-600 text-white rounded-tr-none shadow-blue-100" 
                                  : "bg-white border border-slate-200 text-slate-900 rounded-tl-none"
                              )}
                            >
                              <p className="leading-relaxed font-medium break-words">{m.text}</p>
                              <div className={cn(
                                "text-[9px] mt-2 font-medium opacity-50",
                                m.senderId === firebaseUser?.uid ? "text-right text-blue-100" : "text-left text-slate-500"
                              )}>
                                {mDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Input Area */}
                    <div className="p-3 md:p-6 bg-white border-t border-slate-100 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                      <div className="flex gap-3 md:gap-4 items-center max-w-4xl mx-auto w-full">
                        <div className="flex-1 relative group">
                          <input 
                            type="text" 
                            placeholder="Escreva sua mensagem aqui..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            className="w-full pl-6 pr-14 py-4 bg-slate-50 border border-slate-200 rounded-full outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 focus:bg-white transition-all font-medium text-sm md:text-base shadow-inner"
                          />
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                            <button type="button" className="p-1.5 md:p-2 text-slate-400 hover:text-blue-600 transition-colors">
                              <Sparkles className="w-4 h-4 md:w-5 md:h-5" />
                            </button>
                          </div>
                        </div>
                        <button 
                          onClick={handleSendMessage}
                          disabled={!newMessage.trim()}
                          className={cn(
                            "w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg shadow-blue-200 flex-shrink-0",
                            newMessage.trim() 
                              ? "bg-blue-600 text-white hover:bg-blue-700 hover:scale-105 active:scale-95" 
                              : "bg-slate-200 text-slate-400 cursor-not-allowed"
                          )}
                        >
                          <Send className="w-6 h-6 md:w-7 md:h-7 translate-x-0.5 -translate-y-0.5" />
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  /* Empty State */
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-white">
                    <div className="w-24 h-24 bg-blue-50 rounded-[2.5rem] flex items-center justify-center text-blue-600 mb-8 animate-bounce-slow">
                      <MessageSquare size={48} strokeWidth={1.5} />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 mb-2 tracking-tight">Central de Suporte</h3>
                    <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
                      Selecione um usuário na lista ao lado para visualizar o histórico de mensagens e iniciar um novo atendimento.
                    </p>
                    <div className="mt-8 flex gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-100" />
                      <div className="w-2 h-2 rounded-full bg-blue-200" />
                      <div className="w-2 h-2 rounded-full bg-blue-300" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-2xl bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Configurações do Sistema</h3>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Taxa de Comissão (%)</label>
                  <div className="flex gap-4">
                    <input 
                      type="number" 
                      value={commissionRate}
                      onChange={(e) => setCommissionRate(Number(e.target.value))}
                      className="flex-1 bg-slate-50 border-slate-200 rounded-xl px-4 py-2" 
                    />
                    <button 
                      onClick={handleSaveSettings}
                      className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm"
                    >
                      Salvar
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Notificações por Email</label>
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                    <span className="text-sm font-bold text-slate-700">Novos Cadastros</span>
                    <div className="w-12 h-6 bg-blue-600 rounded-full relative cursor-pointer">
                      <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 space-y-4">
                  <button 
                    onClick={handleCleanupOrphans}
                    className="w-full py-3 bg-amber-50 text-amber-600 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-amber-100 transition-colors"
                  >
                    Limpar Registros Órfãos / Incompletos
                  </button>
                  <button 
                    onClick={() => import('sonner').then(({ toast }) => toast.info("Cache do sistema limpo!"))}
                    className="w-full py-3 bg-rose-50 text-rose-600 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-rose-100 transition-colors"
                  >
                    Limpar Cache do Sistema
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

