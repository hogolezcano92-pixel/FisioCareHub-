import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../firebase';
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
  Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export default function Admin() {
  const [user, loadingAuth] = useAuthState(auth);
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  // Real Data States
  const [users, setUsers] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [pendingPhysios, setPendingPhysios] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [selectedChatUser, setSelectedChatUser] = useState<any>(null);
  const [newMessage, setNewMessage] = useState('');
  const [commissionRate, setCommissionRate] = useState(20);
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
    if (!loadingAuth) {
      if (!user) {
        navigate('/login');
        return;
      }

      const checkAdmin = async () => {
        const adminEmails = [
          'hugo_lezcano92@hotmail.com', 
          'hogolezcano92@gmail.com',
          'lezcanohugo662@gmail.com'
        ];
        
        if (adminEmails.includes(user.email || '')) {
          setIsAdmin(true);
          setCheckingAdmin(false);
          return;
        }

        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists() && userDoc.data().role === 'admin') {
            setIsAdmin(true);
          } else {
            navigate('/dashboard');
          }
        } catch (err) {
          console.error("Error checking admin status:", err);
          navigate('/dashboard');
        } finally {
          setCheckingAdmin(false);
        }
      };

      checkAdmin();
    }
  }, [user, loadingAuth, navigate]);

  // Real-time Data Listeners
  useEffect(() => {
    if (!isAdmin) return;

    // Listen for Users
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(usersData);
      
      // Update Stats
      const physios = usersData.filter((u: any) => u.role === 'physiotherapist');
      const patients = usersData.filter((u: any) => u.role === 'patient');
      setStats(prev => ({
        ...prev,
        totalUsers: usersData.length,
        activePhysios: physios.filter((p: any) => p.status === 'approved' || p.approved === true).length,
        newPatients: patients.length
      }));
    });

    // Listen for Payments
    const unsubPayments = onSnapshot(collection(db, 'payments'), (snapshot) => {
      const paymentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPayments(paymentsData);
      
      const revenue = paymentsData.reduce((acc, curr: any) => acc + (curr.amount || 0), 0);
      setStats(prev => ({ ...prev, totalRevenue: revenue }));
    });

    // Listen for Pending Approvals
    const unsubApprovals = onSnapshot(
      query(collection(db, 'physiotherapists'), where('status', '==', 'pending_approval')),
      (snapshot) => {
        setPendingPhysios(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
    );

    // Listen for Appointments
    const unsubAppointments = onSnapshot(
      query(collection(db, 'appointments'), where('status', '==', 'waiting')),
      (snapshot) => {
        setStats(prev => ({ ...prev, pendingAppointments: snapshot.docs.length }));
      }
    );

    return () => {
      unsubUsers();
      unsubPayments();
      unsubApprovals();
      unsubAppointments();
    };
  }, [isAdmin]);

  // Chat Listener
  useEffect(() => {
    if (!isAdmin || !selectedChatUser) return;

    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user?.uid),
      orderBy('createdAt', 'asc')
    );

    const unsubMessages = onSnapshot(q, (snapshot) => {
      const chatMessages = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((msg: any) => 
          msg.participants.includes(selectedChatUser.id)
        );
      setMessages(chatMessages);
    });

    return () => unsubMessages();
  }, [isAdmin, selectedChatUser, user]);

  if (!mounted || loadingAuth || checkingAdmin) return (
    <div className="flex flex-col items-center justify-center pt-32 space-y-4">
      <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Verificando permissões...</p>
    </div>
  );

  if (!isAdmin) return null;

  const handleApprovePhysio = async (physioId: string, userId: string) => {
    try {
      const userSnap = await getDoc(doc(db, 'users', userId));
      const userData = userSnap.data();

      await updateDoc(doc(db, 'physiotherapists', physioId), {
        status: 'approved',
        approved: true
      });
      await updateDoc(doc(db, 'users', userId), {
        status: 'approved'
      });
      
      // Create notification
      await addDoc(collection(db, 'notifications'), {
        userId,
        title: 'Perfil Aprovado!',
        message: 'Seu perfil de fisioterapeuta foi aprovado pela administração.',
        type: 'system',
        read: false,
        createdAt: serverTimestamp()
      });

      // Send Email Notification
      if (userData?.email) {
        try {
          await fetch('/api/notify/appointment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: userData.email,
              subject: 'Seu perfil foi Aprovado! - FisioCareHub',
              body: `
                <div style="font-family: sans-serif; color: #334155; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 16px;">
                  <h2 style="color: #2563eb; margin-bottom: 16px;">Parabéns, ${userData.name}!</h2>
                  <p>Temos o prazer de informar que seu perfil de fisioterapeuta foi <strong>aprovado</strong> pela nossa equipe administrativa.</p>
                  <p>Agora você já pode começar a atender pacientes e gerenciar seus agendamentos através da nossa plataforma.</p>
                  <div style="margin-top: 24px; padding: 16px; background-color: #f8fafc; border-radius: 8px;">
                    <p style="margin: 0; font-weight: bold; color: #475569;">Próximos passos:</p>
                    <ul style="margin-top: 8px; color: #64748b;">
                      <li>Complete seu perfil com bio e fotos</li>
                      <li>Defina seus horários de disponibilidade</li>
                      <li>Configure seus valores de atendimento</li>
                    </ul>
                  </div>
                  <p style="margin-top: 24px;">Seja bem-vindo(a) à nossa comunidade!</p>
                  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                  <p style="font-size: 12px; color: #94a3b8; text-align: center;">FisioCareHub - Conectando saúde e bem-estar.</p>
                </div>
              `
            })
          });
        } catch (emailErr) {
          console.error("Erro ao enviar e-mail de aprovação:", emailErr);
        }
      }

      import('sonner').then(({ toast }) => toast.success("Fisioterapeuta aprovado!"));
    } catch (err) {
      console.error("Error approving physio:", err);
      import('sonner').then(({ toast }) => toast.error("Erro ao aprovar fisioterapeuta."));
    }
  };

  const handleRejectPhysio = async (physioId: string, userId: string) => {
    try {
      const userSnap = await getDoc(doc(db, 'users', userId));
      const userData = userSnap.data();

      await updateDoc(doc(db, 'physiotherapists', physioId), {
        status: 'rejected',
        approved: false
      });
      await updateDoc(doc(db, 'users', userId), {
        status: 'rejected'
      });
      
      // Create notification
      await addDoc(collection(db, 'notifications'), {
        userId,
        title: 'Perfil Rejeitado',
        message: 'Infelizmente seu perfil não foi aprovado. Entre em contato com o suporte para mais detalhes.',
        type: 'system',
        read: false,
        createdAt: serverTimestamp()
      });

      // Send Email Notification
      if (userData?.email) {
        try {
          await fetch('/api/notify/appointment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: userData.email,
              subject: 'Atualização sobre seu perfil - FisioCareHub',
              body: `
                <div style="font-family: sans-serif; color: #334155; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 16px;">
                  <h2 style="color: #dc2626; margin-bottom: 16px;">Olá, ${userData.name}</h2>
                  <p>Gostaríamos de informar que, após a revisão, seu perfil de fisioterapeuta <strong>não foi aprovado</strong> neste momento.</p>
                  <p>Isso pode ter ocorrido devido a informações incompletas ou documentos que não atendem aos nossos critérios atuais.</p>
                  <div style="margin-top: 24px; padding: 16px; background-color: #fef2f2; border-radius: 8px; border-left: 4px solid #dc2626;">
                    <p style="margin: 0; color: #991b1b;">Você pode entrar em contato com nosso suporte através do chat interno ou responder a este e-mail para entender melhor os motivos e como proceder.</p>
                  </div>
                  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                  <p style="font-size: 12px; color: #94a3b8; text-align: center;">FisioCareHub - Equipe de Suporte</p>
                </div>
              `
            })
          });
        } catch (emailErr) {
          console.error("Erro ao enviar e-mail de rejeição:", emailErr);
        }
      }

      import('sonner').then(({ toast }) => toast.success("Fisioterapeuta rejeitado."));
    } catch (err) {
      console.error("Error rejecting physio:", err);
      import('sonner').then(({ toast }) => toast.error("Erro ao rejeitar fisioterapeuta."));
    }
  };

  const handleBlockUser = async (userId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'blocked' ? 'approved' : 'blocked';
      await updateDoc(doc(db, 'users', userId), {
        status: newStatus
      });
      import('sonner').then(({ toast }) => toast.success(`Usuário ${newStatus === 'blocked' ? 'bloqueado' : 'desbloqueado'}!`));
    } catch (err) {
      console.error("Error toggling user status:", err);
      import('sonner').then(({ toast }) => toast.error("Erro ao alterar status do usuário."));
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChatUser) return;

    try {
      await addDoc(collection(db, 'chats'), {
        senderId: user?.uid,
        receiverId: selectedChatUser.id,
        participants: [user?.uid, selectedChatUser.id],
        text: newMessage,
        createdAt: serverTimestamp(),
        read: false,
        type: 'support'
      });
      
      // Notify user
      await addDoc(collection(db, 'notifications'), {
        userId: selectedChatUser.id,
        title: 'Nova mensagem do Suporte',
        message: 'A administração respondeu ao seu chamado.',
        type: 'message',
        read: false,
        createdAt: serverTimestamp(),
        link: '/chat'
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
        updatedBy: user?.uid
      });
      import('sonner').then(({ toast }) => toast.success("Configurações salvas com sucesso!"));
    } catch (err) {
      console.error("Error saving settings:", err);
      import('sonner').then(({ toast }) => toast.error("Erro ao salvar configurações."));
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
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white flex-shrink-0">
                <ShieldCheck size={20} />
              </div>
              <span className="font-black text-lg tracking-tighter text-blue-600">AdminHub</span>
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
              { id: 'users', label: 'Usuários', icon: Users },
              { id: 'approvals', label: 'Aprovações', icon: UserCheck },
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
                {user?.email?.charAt(0).toUpperCase()}
              </div>
              <div className={cn("flex-1 min-w-0 transition-opacity", !sidebarOpen && "lg:hidden")}>
                <p className="text-xs font-bold text-slate-900 truncate">Admin Master</p>
                <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
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
            <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight capitalize truncate">
              {activeTab === 'dashboard' ? 'Visão Geral' : activeTab}
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
                      {users.slice(0, 5).map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm">
                                {u.name?.charAt(0)}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-900">{u.name}</p>
                                <p className="text-[10px] text-slate-500">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-md uppercase tracking-wider">
                              {u.role}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className={cn(
                              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                              u.status === 'approved' || u.approved ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                            )}>
                              {u.status || 'Pendente'}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button 
                              onClick={() => handleBlockUser(u.id, u.status)}
                              className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              <Lock size={18} />
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
                      <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 text-sm font-bold text-slate-900">{u.name}</td>
                        <td className="px-6 py-4 text-sm text-slate-500">{u.email}</td>
                        <td className="px-6 py-4">
                          <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-md uppercase">
                            {u.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                              <Edit3 size={16} />
                            </button>
                            <button 
                              onClick={() => handleBlockUser(u.id, u.status)}
                              className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg"
                            >
                              <XCircle size={16} />
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
                {pendingPhysios.length === 0 ? (
                  <div className="col-span-full bg-white p-12 rounded-[2rem] border border-slate-100 text-center space-y-4">
                    <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle2 size={32} />
                    </div>
                    <p className="font-bold text-slate-900">Tudo em dia!</p>
                    <p className="text-sm text-slate-500">Não há fisioterapeutas aguardando aprovação no momento.</p>
                  </div>
                ) : (
                  pendingPhysios.map((physio) => (
                    <motion.div 
                      key={physio.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 font-bold">
                          {physio.name?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{physio.name}</p>
                          <p className="text-xs text-slate-500">{physio.email} • CREFITO: {physio.crefito}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[10px] font-bold uppercase tracking-wider">
                        <div className="bg-slate-50 p-2 rounded-lg">Especialidade: {physio.specialty}</div>
                        <div className="bg-slate-50 p-2 rounded-lg">Cidade: {physio.city}</div>
                      </div>
                      <div className="flex items-center gap-2 pt-2">
                        <button 
                          onClick={() => handleApprovePhysio(physio.id, physio.uid)}
                          className="flex-1 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors"
                        >
                          Aprovar
                        </button>
                        <button 
                          onClick={() => handleRejectPhysio(physio.id, physio.uid)}
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
            <div className="h-[600px] bg-white rounded-[2rem] border border-slate-100 shadow-sm flex overflow-hidden">
              {/* User List */}
              <div className="w-1/3 border-r border-slate-100 flex flex-col">
                <div className="p-4 border-b border-slate-100">
                  <h4 className="font-black text-slate-900">Conversas</h4>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {users.filter(u => u.role !== 'admin').map(u => (
                    <button
                      key={u.id}
                      onClick={() => setSelectedChatUser(u)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-xl transition-all",
                        selectedChatUser?.id === u.id ? "bg-blue-50 text-blue-600" : "hover:bg-slate-50"
                      )}
                    >
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold">
                        {u.name?.charAt(0)}
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold truncate">{u.name}</p>
                        <p className="text-[10px] text-slate-500 truncate">{u.role}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat Area */}
              <div className="flex-1 flex flex-col bg-slate-50/30">
                {selectedChatUser ? (
                  <>
                    <div className="p-4 bg-white border-b border-slate-100 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                        {selectedChatUser.name?.charAt(0)}
                      </div>
                      <p className="font-bold text-slate-900">{selectedChatUser.name}</p>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                      {messages.map((m) => (
                        <div 
                          key={m.id}
                          className={cn(
                            "max-w-[80%] p-3 rounded-2xl text-sm",
                            m.senderId === user?.uid 
                              ? "ml-auto bg-blue-600 text-white rounded-tr-none" 
                              : "bg-white border border-slate-100 text-slate-900 rounded-tl-none"
                          )}
                        >
                          {m.text}
                        </div>
                      ))}
                    </div>
                    <div className="p-4 bg-white border-t border-slate-100 flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Digite sua mensagem..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        className="flex-1 bg-slate-50 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500/20"
                      />
                      <button 
                        onClick={handleSendMessage}
                        className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                      >
                        <Send size={20} />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-400 space-y-4">
                    <MessageSquare size={48} strokeWidth={1} />
                    <p className="text-sm font-medium">Selecione um usuário para iniciar o chat</p>
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

                <div className="pt-6 border-t border-slate-100">
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

