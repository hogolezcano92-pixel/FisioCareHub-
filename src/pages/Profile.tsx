import { useState, useEffect } from 'react';
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
  Shield,
  Eye,
  Crown,
  Download,
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { cn, resolveStorageUrl } from '../lib/utils';
import { uploadDocument } from '../services/supabaseStorage';
import { getSupabase, invokeFunction, supabase } from '../lib/supabase';
import AvatarUpload from '../components/AvatarUpload';

type Tab = 
  | 'profile' | 'security' | 'notifications' | 'payments' | 'privacy' // Patient tabs
  | 'profile_prof' | 'clinic' | 'subscription' | 'earnings'; // Physio tabs

export default function Profile() {
  const { user, profile, subscription, loading: authLoading, refreshProfile, signOut } = useAuth();
  const { t, i18n } = useTranslation();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const isPhysio = profile?.tipo_usuario === 'fisioterapeuta';
  const [activeTab, setActiveTab] = useState<Tab>(isPhysio ? 'profile_prof' : 'profile');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const navigate = useNavigate();

  const languages = [
    { code: 'pt', name: t('settings.portuguese'), flag: '🇧🇷' },
    { code: 'en', name: t('settings.english'), flag: '🇺🇸' },
    { code: 'es', name: t('settings.spanish'), flag: '🇪🇸' },
  ];

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    import('sonner').then(({ toast }) => toast.success(t('settings.language_description')));
  };

  // Form fields
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [telefone, setTelefone] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>('');
  const [specialty, setSpecialty] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [country, setCountry] = useState('');
  const [crefito, setCrefito] = useState('');
  const [serviceType, setServiceType] = useState<'domicilio' | 'online' | 'ambos'>('ambos');

  const isPro = profile?.plano === 'admin' || profile?.plano === 'pro' || profile?.is_pro === true || subscription?.status === 'ativo';

  useEffect(() => {
    if (!authLoading) {
      if (profile) {
        setUserData(profile);
        setName(profile.nome_completo || '');
        setBio(profile.bio || '');
        setTelefone(profile.telefone || '');
        setGender(profile.genero || '');
        setSpecialty(profile.especialidade || '');
        setCity(profile.localizacao || '');
        setAddress(profile.endereco || '');
        setZipCode(profile.cep || '');
        setCountry(profile.pais || '');
        setCrefito(profile.crefito || '');
        setServiceType(profile.tipo_servico || 'ambos');
        setLoading(false);
      } else if (!user) {
        navigate('/login');
      } else {
        // User is logged in but profile is null (maybe error fetching)
        setLoading(false);
      }
    }
  }, [profile, user, authLoading, navigate]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || updating) return;

    setUpdating(true);
    try {
      // CEP validation if provided
      if (zipCode) {
        const cleanZip = zipCode.replace(/\D/g, '');
        if (cleanZip.length > 0 && cleanZip.length !== 8) {
          const { toast } = await import('sonner');
          toast.error("Por favor, insira um CEP válido com 8 dígitos.");
          setUpdating(false);
          return;
        }
      }

      const updateData = {
        nome_completo: name,
        bio: bio,
        telefone: telefone,
        localizacao: city,
        endereco: address,
        cep: zipCode,
        pais: country,
        crefito: isPhysio ? crefito : (userData?.crefito || undefined),
        genero: isPhysio ? gender : (userData?.genero || undefined),
        especialidade: isPhysio ? specialty : (userData?.especialidade || undefined),
        tipo_servico: isPhysio ? serviceType : (userData?.tipo_servico || undefined),
      };

      // Clean undefined fields
      Object.keys(updateData).forEach(key => 
        (updateData as any)[key] === undefined && delete (updateData as any)[key]
      );

      console.log("Atualizando perfil no Supabase:", updateData);

      const { error } = await supabase
        .from('perfis')
        .update(updateData)
        .eq('id', user.id);

      if (error) throw error;

      // Update Auth Metadata if name changed
      if (name !== user.user_metadata?.full_name) {
        const { error: authError } = await supabase.auth.updateUser({
          data: { full_name: name }
        });
        if (authError) console.warn("Erro ao atualizar metadados de autenticação:", authError);
      }

      // Update local state
      setUserData((prev: any) => ({
        ...prev,
        ...updateData
      }));

      // Refresh global profile context
      if (refreshProfile) await refreshProfile();

      const { toast } = await import('sonner');
      toast.success("Perfil atualizado com sucesso!");
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
      const url = await uploadDocument(user.id, file);
      
      const currentDocs = Array.isArray(userData?.documentos) ? userData.documentos : [];
      const newDocs = [...currentDocs, url];
      
      const { error } = await supabase
        .from('perfis')
        .update({ documentos: newDocs })
        .eq('id', user.id);

      if (error) throw error;

      setUserData({ ...userData, documentos: newDocs });
      import('sonner').then(({ toast }) => toast.success("Documento enviado com sucesso!"));
    } catch (err: any) {
      console.error("Erro no upload de documento para Supabase:", err);
      import('sonner').then(({ toast }) => toast.error("Erro ao enviar documento: " + (err.message || "Erro desconhecido")));
    } finally {
      setUpdating(false);
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
    setUpdating(true);
    
    try {
      console.log("Iniciando processo de exclusão segura para:", user.id);
      
      // 1. Call Edge Function for complete deletion (Auth + DB + Storage)
      const response = await invokeFunction('delete-user', { userId: user.id });
      
      if (response && !response.error) {
        console.log("Edge Function 'delete-user' executada com sucesso:", response.message);
        
        // 2. Final Sign Out and Redirect
        await signOut();
        
        toast.success("Sua conta e todos os seus dados foram excluídos permanentemente.");
        navigate('/');
      } else {
        const errorMsg = response?.error || "Erro desconhecido na função de exclusão.";
        console.error("Erro retornado pela Edge Function:", errorMsg, response?.details);
        
        // Se o erro for "User not found", talvez a conta já tenha sido excluída parcialmente
        if (errorMsg.includes("not found") || errorMsg.includes("404")) {
          await signOut();
          toast.success("Processo de exclusão concluído.");
          navigate('/');
          return;
        }

        toast.error(`Não foi possível excluir sua conta: ${errorMsg}`);
      }
    } catch (err: any) {
      console.error("Erro fatal ao excluir conta:", err);
      
      // Fallback: Se a função falhou mas o erro indica que o usuário não existe mais no Auth
      if (err.message?.includes("not found") || err.message?.includes("404")) {
        await signOut();
        navigate('/');
        return;
      }

      toast.error("Erro ao processar exclusão total. Por favor, tente novamente ou entre em contato com o suporte.");
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
        html: `<h1>Olá ${userData.nome_completo || 'Usuário'}!</h1><p>Este é um e-mail de teste enviado via Supabase Edge Functions.</p>`,
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
    { id: 'profile', label: 'Perfil', icon: User },
    { id: 'security', label: 'Segurança', icon: Lock },
    { id: 'notifications', label: 'Notificações', icon: Bell },
    { id: 'payments', label: 'Pagamentos', icon: CreditCard },
    { id: 'privacy', label: 'Privacidade', icon: Eye },
  ];

  const physioTabs = [
    { id: 'profile_prof', label: 'Perfil Profissional', icon: User },
    { id: 'clinic', label: 'Dados da Clínica', icon: Building2 },
    { id: 'subscription', label: 'Assinatura PRO', icon: Crown },
    { id: 'earnings', label: 'Pagamentos Recebidos', icon: DollarSign },
    { id: 'security', label: 'Segurança', icon: Lock },
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
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Minha Conta</h1>
          <p className="text-slate-500 font-medium">Gerencie seu perfil, segurança e preferências do sistema.</p>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Navigation Sidebar */}
        <aside className="lg:w-72 space-y-2">
          <div className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm space-y-1">
            {currentTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-4 rounded-2xl font-bold transition-all text-sm",
                  activeTab === tab.id 
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20" 
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <tab.icon size={20} className={activeTab === tab.id ? "text-white" : "text-slate-400"} />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm space-y-1">
            <button
              onClick={() => signOut()}
              className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl font-bold text-sm text-rose-500 hover:bg-rose-50 transition-all"
            >
              <LogOut size={20} />
              Sair da Conta
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl font-bold text-sm text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
            >
              <Trash2 size={20} />
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
                    <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl shadow-blue-900/5 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full -mr-32 -mt-32 opacity-50" />
                      
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
                              <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                                {userData?.nome_completo || 'Usuário'}
                              </h2>
                              {isPro && (
                                <span className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-amber-400 to-orange-500 text-[10px] font-black text-white uppercase tracking-widest rounded-full shadow-lg shadow-orange-500/20 border border-white/20">
                                  <Crown size={10} fill="currentColor" />
                                  Pro
                                </span>
                              )}
                            </div>
                            <p className="text-slate-500 font-medium">{userData?.email}</p>
                            <div className="flex justify-center md:justify-start pt-2">
                              <span className="px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-[0.15em] border border-blue-100/50">
                                {isPhysio ? 'Fisioterapeuta' : 'Paciente'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Profile Form */}
                    <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
                      <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3">
                        <User className="text-blue-600" size={24} />
                        Informações Pessoais
                      </h3>
                      
                      <form onSubmit={handleUpdateProfile} className="space-y-8">
                        <div className="grid md:grid-cols-2 gap-8">
                          <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                            <input
                              type="text"
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              className="w-full p-5 bg-slate-50 border border-slate-100 rounded-[2rem] focus:ring-2 focus:ring-blue-600 outline-none transition-all font-bold text-slate-900"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Telefone de Contato</label>
                            <input
                              type="tel"
                              value={telefone}
                              onChange={(e) => setTelefone(e.target.value)}
                              className="w-full p-5 bg-slate-50 border border-slate-100 rounded-[2rem] focus:ring-2 focus:ring-blue-600 outline-none transition-all font-bold text-slate-900"
                              placeholder="(00) 00000-0000"
                            />
                          </div>
                        </div>

                        {isPhysio && (
                          <div className="grid md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">CREFITO</label>
                              <input
                                type="text"
                                value={crefito}
                                onChange={(e) => setCrefito(e.target.value)}
                                className="w-full p-5 bg-slate-50 border border-slate-100 rounded-[2rem] focus:ring-2 focus:ring-blue-600 outline-none transition-all font-bold text-slate-900"
                                placeholder="Ex: 12345-F"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Especialidade Principal</label>
                              <input
                                type="text"
                                value={specialty}
                                onChange={(e) => setSpecialty(e.target.value)}
                                className="w-full p-5 bg-slate-50 border border-slate-100 rounded-[2rem] focus:ring-2 focus:ring-blue-600 outline-none transition-all font-bold text-slate-900"
                                placeholder="Ex: Ortopedia, Neuro..."
                              />
                            </div>
                          </div>
                        )}

                        <div className="space-y-2">
                          <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Biografia / Resumo</label>
                          <textarea
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            className="w-full h-32 p-5 bg-slate-50 border border-slate-100 rounded-[2rem] focus:ring-2 focus:ring-blue-600 outline-none resize-none transition-all font-bold text-slate-900"
                            placeholder={isPhysio ? "Conte sobre sua formação e áreas de atuação..." : "Conte um pouco sobre seu histórico de saúde..."}
                          />
                        </div>

                        <div className="flex justify-end">
                          <button
                            type="submit"
                            disabled={updating}
                            className="px-12 py-5 bg-blue-600 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 flex items-center gap-3 disabled:opacity-50"
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
                    <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
                      <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3">
                        <Lock className="text-blue-600" size={24} />
                        Segurança e Acesso
                      </h3>
                      
                      <div className="space-y-6">
                        <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
                          <div className="text-center md:text-left">
                            <p className="text-lg font-black text-slate-900">Alterar Senha</p>
                            <p className="text-sm text-slate-500 font-medium">Enviaremos um link de redefinição para seu e-mail de cadastro.</p>
                          </div>
                          <button
                            onClick={handlePasswordReset}
                            className="px-8 py-4 bg-white border border-slate-200 text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all shadow-sm"
                          >
                            Redefinir Senha
                          </button>
                        </div>

                        <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
                          <div className="text-center md:text-left">
                            <p className="text-lg font-black text-slate-900">Autenticação em Duas Etapas</p>
                            <p className="text-sm text-slate-500 font-medium">Adicione uma camada extra de segurança à sua conta.</p>
                          </div>
                          <span className="px-4 py-2 bg-slate-200 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest">Em Breve</span>
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
                    <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
                      <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3">
                        <Bell className="text-blue-600" size={24} />
                        Preferências de Notificação
                      </h3>
                      
                      <div className="space-y-4">
                        {[
                          { label: 'Notificações Push', desc: 'Alertas em tempo real no navegador/celular.' },
                          { label: 'E-mails de Agendamento', desc: 'Confirmações e lembretes de consultas.' },
                          { label: 'Novas Mensagens', desc: 'Avisos de novas mensagens no chat.' },
                          { label: 'Materiais Educativos', desc: 'Novidades na biblioteca de saúde.' }
                        ].map((item, i) => (
                          <div key={i} className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 flex items-center justify-between">
                            <div>
                              <p className="font-black text-slate-900">{item.label}</p>
                              <p className="text-xs text-slate-500 font-medium">{item.desc}</p>
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
                    <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
                      <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3">
                        <CreditCard className="text-blue-600" size={24} />
                        Métodos de Pagamento
                      </h3>
                      
                      <div className="p-12 text-center border-2 border-dashed border-slate-100 rounded-[3rem] space-y-4">
                        <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto">
                          <CreditCard size={40} />
                        </div>
                        <div className="space-y-1">
                          <p className="text-lg font-black text-slate-900">Nenhum cartão cadastrado</p>
                          <p className="text-sm text-slate-500 font-medium">Cadastre um cartão para facilitar o pagamento de consultas e materiais.</p>
                        </div>
                        <button className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all">
                          Adicionar Cartão
                        </button>
                      </div>
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
                    <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
                      <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3">
                        <Eye className="text-blue-600" size={24} />
                        Privacidade e Dados
                      </h3>
                      
                      <div className="space-y-6">
                        <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 space-y-4">
                          <p className="font-black text-slate-900">Visibilidade do Perfil</p>
                          <p className="text-sm text-slate-500 font-medium leading-relaxed">
                            Seu perfil é visível apenas para os fisioterapeutas com quem você agenda consultas. 
                            Seus dados de saúde são protegidos por criptografia de ponta a ponta.
                          </p>
                        </div>
                        
                        <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 flex items-center justify-between">
                          <div>
                            <p className="font-black text-slate-900">Exportar Meus Dados</p>
                            <p className="text-xs text-slate-500 font-medium">Baixe uma cópia de todo o seu histórico em formato JSON.</p>
                          </div>
                          <button className="p-4 bg-white text-slate-900 rounded-2xl hover:bg-slate-100 transition-all shadow-sm">
                            <Download size={20} />
                          </button>
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
                    <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
                      <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3">
                        <Building2 className="text-blue-600" size={24} />
                        Dados da Clínica / Consultório
                      </h3>
                      
                      <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                          <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">CEP</label>
                          <input
                            type="text"
                            value={zipCode}
                            onChange={(e) => setZipCode(e.target.value)}
                            className="w-full p-5 bg-slate-50 border border-slate-100 rounded-[2rem] focus:ring-2 focus:ring-blue-600 outline-none transition-all font-bold text-slate-900"
                            placeholder="00000-000"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Cidade</label>
                          <input
                            type="text"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            className="w-full p-5 bg-slate-50 border border-slate-100 rounded-[2rem] focus:ring-2 focus:ring-blue-600 outline-none transition-all font-bold text-slate-900"
                          />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                          <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Endereço Completo</label>
                          <input
                            type="text"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            className="w-full p-5 bg-slate-50 border border-slate-100 rounded-[2rem] focus:ring-2 focus:ring-blue-600 outline-none transition-all font-bold text-slate-900"
                            placeholder="Rua, número, complemento..."
                          />
                        </div>
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
                    <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden relative">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-50 rounded-full -mr-32 -mt-32 opacity-50" />
                      
                      <div className="relative z-10 space-y-8">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-3xl flex items-center justify-center shadow-lg shadow-amber-100">
                            <Crown size={32} fill="currentColor" />
                          </div>
                          <div>
                            <h3 className="text-2xl font-black text-slate-900">Plano FisioCare Pro</h3>
                            <p className="text-slate-500 font-medium">Sua assinatura atual está {isPro ? 'Ativa' : 'Inativa'}.</p>
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 space-y-4">
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Próximo Vencimento</p>
                            <p className="text-2xl font-black text-slate-900">15 de Maio, 2026</p>
                            <p className="text-sm text-slate-500 font-medium">Valor: R$ 149,90/mês</p>
                          </div>
                          <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 space-y-4">
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Método de Pagamento</p>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-6 bg-slate-900 rounded flex items-center justify-center text-[8px] text-white font-bold">VISA</div>
                              <p className="text-lg font-black text-slate-900">**** 4242</p>
                            </div>
                            <button className="text-blue-600 font-black text-xs uppercase tracking-widest hover:underline">Alterar Cartão</button>
                          </div>
                        </div>

                        <div className="flex flex-col md:flex-row gap-4 pt-4">
                          <Link 
                            to="/subscription"
                            className="flex-1 py-5 bg-blue-600 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest text-center shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all"
                          >
                            Gerenciar Assinatura
                          </Link>
                          <button className="flex-1 py-5 bg-white border border-slate-200 text-rose-500 rounded-[2rem] font-black text-sm uppercase tracking-widest hover:bg-rose-50 transition-all">
                            Cancelar Plano
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
                    <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
                      <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3">
                        <DollarSign className="text-emerald-600" size={24} />
                        Pagamentos Recebidos
                      </h3>
                      
                      <div className="grid md:grid-cols-3 gap-6 mb-8">
                        <div className="p-8 bg-emerald-50 rounded-[2.5rem] border border-emerald-100 space-y-1">
                          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Saldo Disponível</p>
                          <p className="text-3xl font-black text-emerald-900">R$ 2.450,00</p>
                        </div>
                        <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 space-y-1">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">A Receber</p>
                          <p className="text-3xl font-black text-slate-900">R$ 890,00</p>
                        </div>
                        <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 space-y-1">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total do Mês</p>
                          <p className="text-3xl font-black text-slate-900">R$ 5.120,00</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest ml-1">Últimos Lançamentos</h4>
                        {[
                          { patient: 'Maria Silva', date: 'Hoje', val: 150.00 },
                          { patient: 'João Pedro', date: 'Ontem', val: 150.00 },
                          { patient: 'Ana Costa', date: '10 Abr', val: 200.00 }
                        ].map((item, i) => (
                          <div key={i} className="p-6 bg-white border border-slate-50 rounded-2xl flex items-center justify-between hover:bg-slate-50 transition-all">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center font-black">
                                {item.patient[0]}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">{item.patient}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{item.date}</p>
                              </div>
                            </div>
                            <p className="font-black text-emerald-600">+ R$ {item.val.toFixed(2)}</p>
                          </div>
                        ))}
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
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
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
              className="relative bg-white p-8 rounded-[3rem] shadow-2xl max-w-md w-full text-center border border-red-100"
            >
              <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle size={40} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Tem certeza absoluta?</h3>
              <p className="text-slate-500 mb-8">
                Esta ação é irreversível. Todos os seus dados serão apagados para sempre.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleDeleteAccount}
                  disabled={updating}
                  className="w-full py-4 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all flex items-center justify-center gap-2"
                >
                  {updating ? <Loader2 className="animate-spin" /> : 'Sim, Excluir Minha Conta'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="w-full py-4 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
