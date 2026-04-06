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
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { uploadProfilePhoto, uploadDocument } from '../services/supabaseStorage';
import { getSupabase, invokeFunction, supabase } from '../lib/supabase';

type Tab = 'profile' | 'account' | 'settings';

export default function Profile() {
  const { user, profile, loading: authLoading, refreshProfile, signOut } = useAuth();
  const { t, i18n } = useTranslation();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const navigate = useNavigate();

  const isPhysio = userData?.tipo_usuario === 'fisioterapeuta';

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
  const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>('');
  const [specialty, setSpecialty] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [country, setCountry] = useState('');
  const [serviceType, setServiceType] = useState<'domicilio' | 'online' | 'ambos'>('ambos');

  useEffect(() => {
    const fetchUser = async () => {
      try {
        if (user) {
          const { data, error } = await getSupabase()
            .from('perfis')
            .select('*')
            .eq('id', user.id)
            .single();

          if (data) {
            setUserData(data);
            setName(data.nome_completo || '');
            setBio(data.bio || '');
            setGender(data.genero || '');
            setSpecialty(data.especialidade || '');
            setCity(data.localizacao || '');
            setAddress(data.endereco || '');
            setZipCode(data.cep || '');
            setCountry(data.pais || '');
            setServiceType(data.tipo_servico || 'ambos');
          }
        }
      } catch (err) {
        console.error("Erro ao carregar perfil:", err);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchUser();
    }
  }, [user, authLoading]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || updating) return;

    setUpdating(true);
    try {
      const updateData: any = {
        nome_completo: name,
        bio,
        localizacao: city,
        endereco: address,
        cep: zipCode,
        pais: country,
      };

      if (isPhysio) {
        updateData.genero = gender;
        updateData.especialidade = specialty;
        updateData.tipo_servico = serviceType;
      }

      const { error } = await supabase
        .from('perfis')
        .update(updateData)
        .eq('id', user.id);

      if (error) throw error;

      // Update Auth Metadata if name changed
      if (name !== user.user_metadata?.full_name) {
        await supabase.auth.updateUser({
          data: { full_name: name }
        });
      }

      // Update local state
      setUserData((prev: any) => ({
        ...prev,
        ...updateData
      }));

      // Refresh global profile
      if (refreshProfile) await refreshProfile();

      import('sonner').then(({ toast }) => toast.success("Perfil atualizado com sucesso!"));
    } catch (err: any) {
      console.error("Erro ao atualizar perfil:", err);
      import('sonner').then(({ toast }) => toast.error(err.message || "Erro ao atualizar perfil. Tente novamente."));
    } finally {
      setUpdating(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      import('sonner').then(({ toast }) => toast.error("A imagem deve ter no máximo 5MB."));
      return;
    }

    setUploadingPhoto(true);
    setUploadProgress(0);
    try {
      console.log("Iniciando upload de foto para Supabase...");
      
      // Simulate progress since Supabase SDK doesn't natively support it for simple uploads
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Check if bucket exists first (optional but helpful for debugging)
      try {
        const { data: buckets } = await supabase.storage.listBuckets();
        const avatarsBucket = buckets?.find(b => b.name === 'avatars');
        if (!avatarsBucket) {
          console.warn("Bucket 'avatars' não encontrado. Tentando criar...");
          // This might fail if RLS doesn't allow it, but it's worth a try
          await supabase.storage.createBucket('avatars', { public: true });
        }
      } catch (bucketErr) {
        console.warn("Erro ao verificar/criar bucket:", bucketErr);
      }

      const publicUrl = await uploadProfilePhoto(user.id, file);
      const url = `${publicUrl}?t=${Date.now()}`;
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      console.log("URL da foto obtida do Supabase (com timestamp):", url);
      
      // Update Auth Profile
      try {
        await supabase.auth.updateUser({
          data: { avatar_url: url }
        });
      } catch (authErr) {
        console.warn("Erro ao atualizar perfil de autenticação (não crítico):", authErr);
      }
      
      // Update Database
      const { error } = await supabase
        .from('perfis')
        .update({ avatar_url: url })
        .eq('id', user.id);

      if (error) throw error;
      
      // Update local state
      setUserData((prev: any) => prev ? { ...prev, avatar_url: url } : { ...userData, avatar_url: url });
      
      // Also update AuthContext profile
      if (refreshProfile) await refreshProfile();

      import('sonner').then(({ toast }) => toast.success("Foto de perfil atualizada com sucesso!"));
    } catch (err: any) {
      console.error("Erro detalhado no upload para Supabase:", err);
      import('sonner').then(({ toast }) => toast.error("Erro ao enviar foto: " + (err.message || "Erro desconhecido")));
    } finally {
      setUploadingPhoto(false);
      setUploadProgress(0);
      // Reset input
      if (e.target) e.target.value = '';
    }
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUpdating(true);
    try {
      console.log("Iniciando upload de documento para Supabase...");
      const url = await uploadDocument(user.id, file);
      
      const currentDocs = userData?.documentos || [];
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
    setUpdating(true);
    try {
      console.log("Iniciando exclusão de conta para:", user.id);
      
      // 1. Try to call the Edge Function for full deletion (Auth + Profile + Storage)
      try {
        const data = await invokeFunction('delete-user', { userId: user.id });
        if (data && data.error) {
          console.warn("Edge Function delete-user falhou ou não existe:", data.error);
          // Fallback to manual profile deletion if Edge Function fails
        }
      } catch (edgeErr) {
        console.warn("Erro ao chamar Edge Function delete-user:", edgeErr);
        // Fallback to manual profile deletion
      }

      // 2. Manual cleanup of the profile in 'perfis' table (Client-side fallback)
      const { error: profileError } = await supabase
        .from('perfis')
        .delete()
        .eq('id', user.id);

      if (profileError) {
        console.error("Erro ao excluir perfil no banco:", profileError);
      }
      
      // 3. Sign out locally
      await signOut();
      
      import('sonner').then(({ toast }) => toast.success("Sua conta foi excluída. Note que para exclusão total dos dados de autenticação, pode ser necessário contato com o suporte."));
    } catch (err: any) {
      console.error("Erro ao excluir conta:", err);
      import('sonner').then(({ toast }) => toast.error("Erro ao excluir conta: " + (err.message || "Erro desconhecido")));
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
      const data = await invokeFunction('send-email', {
        to: userData.email,
        subject: "Teste de Notificação - FisioCareHub",
        body: `<h1>Olá ${userData.nome_completo || 'Usuário'}!</h1><p>Este é um e-mail de teste enviado via Supabase Edge Functions.</p>`,
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

  if (loading) return <div className="flex justify-center pt-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  const tabs = [
    { id: 'profile', label: t('nav.profile'), icon: User },
    { id: 'account', label: 'Minha Conta', icon: Lock },
    { id: 'settings', label: t('settings.title'), icon: Settings },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Configurações do Perfil</h1>
          <p className="text-slate-500">Gerencie suas informações, segurança e preferências.</p>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Navigation Sidebar */}
        <aside className="lg:w-64 space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all",
                activeTab === tab.id 
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-100" 
                  : "text-slate-600 hover:bg-white hover:shadow-sm"
              )}
            >
              <tab.icon size={20} />
              {tab.label}
            </button>
          ))}
          <div className="pt-4 border-t border-slate-200 mt-4 space-y-2">
            <button
              onClick={() => signOut()}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-slate-600 hover:bg-slate-50 transition-all"
            >
              <LogOut size={20} />
              Sair da Conta
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-red-600 hover:bg-red-50 transition-all"
            >
              <Trash2 size={20} />
              Excluir Conta
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1">
          <AnimatePresence mode="wait">
            {activeTab === 'profile' && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                  <div className="flex flex-col md:flex-row gap-8 items-start">
                    <div className="relative group">
                      <div className="relative">
                        <img
                          src={userData?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`}
                          alt={userData?.nome_completo}
                          className={cn(
                            "w-32 h-32 rounded-[2rem] object-cover border-4 border-slate-50 shadow-xl transition-all",
                            uploadingPhoto && "opacity-50 blur-[2px]"
                          )}
                          referrerPolicy="no-referrer"
                        />
                        {uploadingPhoto && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/40 backdrop-blur-[2px] rounded-[2rem]">
                            <Loader2 className="animate-spin text-blue-600 mb-2" size={32} />
                            <div className="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${uploadProgress}%` }}
                                className="h-full bg-blue-600"
                              />
                            </div>
                            <p className="text-[10px] font-black text-blue-600 mt-1">{Math.round(uploadProgress)}%</p>
                          </div>
                        )}
                      </div>
                      <label className="absolute -bottom-2 -right-2 p-3 bg-blue-600 text-white rounded-2xl cursor-pointer shadow-lg hover:bg-blue-700 transition-all hover:scale-110">
                        <Camera size={20} />
                        <input 
                          type="file" 
                          className="hidden" 
                          onChange={handlePhotoUpload} 
                          accept="image/*" 
                          disabled={uploadingPhoto}
                        />
                      </label>
                    </div>
                    <div className="flex-1 space-y-2">
                      <h2 className="text-2xl font-bold text-slate-900">{userData?.nome_completo}</h2>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-bold uppercase tracking-wider">
                          {isPhysio ? 'Fisioterapeuta' : 'Paciente'}
                        </span>
                        <span className="text-slate-400 text-sm">•</span>
                        <span className="text-slate-500 text-sm flex items-center gap-1">
                          <Mail size={14} /> {userData?.email}
                        </span>
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleUpdateProfile} className="mt-10 space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Nome de Exibição</label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">CEP</label>
                        <input
                          type="text"
                          value={zipCode}
                          onChange={(e) => setZipCode(e.target.value)}
                          className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none transition-all"
                          placeholder="00000-000"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Cidade</label>
                        <input
                          type="text"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none transition-all"
                          placeholder="Sua cidade"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-slate-700 mb-2">País</label>
                        <input
                          type="text"
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none transition-all"
                          placeholder="Seu país"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Endereço Completo</label>
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none transition-all"
                        placeholder="Rua, número, bairro..."
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      {isPhysio ? (
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Título (Gênero)</label>
                          <div className="flex gap-3">
                            <button
                              type="button"
                              onClick={() => setGender('male')}
                              className={cn(
                                "flex-1 py-4 rounded-2xl text-sm font-bold border transition-all",
                                gender === 'male' ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100" : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300"
                              )}
                            >
                              Dr.
                            </button>
                            <button
                              type="button"
                              onClick={() => setGender('female')}
                              className={cn(
                                "flex-1 py-4 rounded-2xl text-sm font-bold border transition-all",
                                gender === 'female' ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100" : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300"
                              )}
                            >
                              Dra.
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">E-mail (Não editável)</label>
                          <input
                            type="email"
                            disabled
                            value={userData?.email}
                            className="w-full p-4 bg-slate-100 border border-slate-200 rounded-2xl text-slate-400 cursor-not-allowed"
                          />
                        </div>
                      )}
                    </div>

                    {isPhysio && (
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">E-mail (Não editável)</label>
                        <input
                          type="email"
                          disabled
                          value={userData?.email}
                          className="w-full p-4 bg-slate-100 border border-slate-200 rounded-2xl text-slate-400 cursor-not-allowed"
                        />
                      </div>
                    )}

                    {isPhysio && (
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Especialidade</label>
                          <input
                            type="text"
                            value={specialty}
                            onChange={(e) => setSpecialty(e.target.value)}
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none transition-all"
                            placeholder="Ex: Ortopedia, Neuro..."
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Tipo de Atendimento</label>
                          <select
                            value={serviceType}
                            onChange={(e: any) => setServiceType(e.target.value)}
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none transition-all"
                          >
                            <option value="domicilio">A Domicílio</option>
                            <option value="online">Online</option>
                            <option value="ambos">Ambos</option>
                          </select>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Biografia / Especialidades</label>
                      <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none resize-none transition-all"
                        placeholder={isPhysio ? "Conte sobre sua formação e áreas de atuação..." : "Conte um pouco sobre seu histórico de saúde..."}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={updating}
                      className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center gap-2 disabled:opacity-50"
                    >
                      {updating ? <Loader2 className="animate-spin" /> : 'Salvar Perfil'}
                    </button>
                  </form>
                </div>

                {isPhysio && (
                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                          <ShieldCheck size={24} className="text-emerald-600" />
                          Documentação Profissional
                        </h3>
                        <p className="text-slate-500 text-sm mt-1">Envie seus certificados para validação da conta.</p>
                      </div>
                      <label className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 cursor-pointer transition-all flex items-center gap-2">
                        <Upload size={18} /> Upload
                        <input type="file" className="hidden" onChange={handleDocUpload} />
                      </label>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      {userData.documentos?.length === 0 ? (
                        <div className="col-span-2 py-10 text-center border-2 border-dashed border-slate-100 rounded-2xl text-slate-400">
                          Nenhum documento enviado ainda.
                        </div>
                      ) : (
                        userData.documentos?.map((doc: string, i: number) => (
                          <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm">
                                <FileText size={20} />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-700 truncate max-w-[150px]">Documento_{i+1}</p>
                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Validado</p>
                              </div>
                            </div>
                            <CheckCircle size={20} className="text-emerald-600" />
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'account' && (
              <motion.div
                key="account"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                  <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <Lock size={24} className="text-blue-600" />
                    Segurança da Conta
                  </h3>
                  
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100">
                      <div>
                        <p className="font-bold text-slate-900">Alterar Senha</p>
                        <p className="text-sm text-slate-500">Enviaremos um link de redefinição para seu e-mail.</p>
                      </div>
                      <button
                        onClick={handlePasswordReset}
                        className="px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-100 transition-all"
                      >
                        Redefinir Senha
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100">
                      <div>
                        <p className="font-bold text-slate-900">E-mail de Acesso</p>
                        <p className="text-sm text-slate-500">Seu e-mail principal para login e notificações.</p>
                      </div>
                      <span className="text-slate-600 font-medium">{userData?.email}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-red-50 p-8 rounded-[2.5rem] border border-red-100">
                  <h3 className="text-xl font-bold text-red-900 mb-2 flex items-center gap-2">
                    <Trash2 size={24} />
                    Zona de Perigo
                  </h3>
                  <p className="text-red-700/70 text-sm mb-6">
                    Ao excluir sua conta, todos os seus dados, prontuários e histórico serão removidos permanentemente. Esta ação não pode ser desfeita.
                  </p>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-8 py-4 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-100"
                  >
                    Excluir Minha Conta Permanentemente
                  </button>
                </div>
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                  <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <Settings size={24} className="text-blue-600" />
                    Preferências do Aplicativo
                  </h3>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-all cursor-pointer">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                            <Bell size={24} />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">Notificações Push</p>
                            <p className="text-sm text-slate-500">Alertas de novas mensagens e agendamentos.</p>
                          </div>
                        </div>
                        <div className="w-12 h-6 bg-blue-600 rounded-full relative">
                          <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                        </div>
                      </div>

                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                            <Globe size={24} />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{t('settings.language')}</p>
                            <p className="text-sm text-slate-500">{t('settings.language_description')}</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {languages.map((lang) => (
                            <button
                              key={lang.code}
                              onClick={() => changeLanguage(lang.code)}
                              className={cn(
                                "flex items-center justify-center gap-2 p-3 rounded-xl font-bold transition-all border",
                                i18n.language.startsWith(lang.code)
                                  ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100"
                                  : "bg-white border-slate-200 text-slate-600 hover:border-blue-300"
                              )}
                            >
                              <span>{lang.flag}</span>
                              <span>{lang.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                    <div className="pt-6 border-t border-slate-100">
                      <h4 className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-wider">Sistema de E-mail</h4>
                      <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100">
                        <div className="flex items-start gap-4 mb-6">
                          <div className="w-10 h-10 bg-white text-blue-600 rounded-xl flex items-center justify-center shadow-sm">
                            <Mail size={20} />
                          </div>
                          <div>
                            <p className="font-bold text-blue-900">Teste de Notificações</p>
                            <p className="text-sm text-blue-700/70">
                              Verifique se as notificações por e-mail estão configuradas corretamente enviando um teste para si mesmo.
                            </p>
                          </div>
                        </div>

                        <div className="mb-6 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                          <div className="flex gap-3">
                            <AlertTriangle className="text-amber-600 flex-shrink-0" size={20} />
                            <div className="space-y-1">
                              <p className="text-xs font-bold text-amber-900 uppercase tracking-wider">Configuração Necessária</p>
                              <p className="text-xs text-amber-800 leading-relaxed">
                                Para que os e-mails funcionem, você deve configurar as variáveis <strong>SMTP_USER</strong> e <strong>SMTP_PASS</strong> no menu de Configurações do AI Studio.
                              </p>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={handleTestEmail}
                          disabled={testingEmail}
                          className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {testingEmail ? <Loader2 className="animate-spin" size={20} /> : <Mail size={20} />}
                          Enviar E-mail de Teste
                        </button>
                        <p className="text-[10px] text-blue-600/60 text-center mt-3 font-medium">
                          O e-mail será enviado para: {userData?.email}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
