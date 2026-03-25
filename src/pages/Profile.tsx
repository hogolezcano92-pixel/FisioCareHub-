import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db, storage, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { motion, AnimatePresence } from 'motion/react';
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
  LogOut,
  AlertTriangle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { deleteUser, sendPasswordResetEmail } from 'firebase/auth';
import { cn } from '../lib/utils';

type Tab = 'profile' | 'account' | 'settings';

export default function Profile() {
  const [user] = useAuthState(auth);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const navigate = useNavigate();
  
  // Form fields
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');

  useEffect(() => {
    if (user) {
      getDoc(doc(db, 'users', user.uid)).then(snap => {
        if (snap.exists()) {
          const data = snap.data();
          setUserData(data);
          setName(data.name);
          setBio(data.bio || '');
        }
        setLoading(false);
      });
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || updating) return;

    setUpdating(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        name,
        bio
      });
      alert("Perfil atualizado com sucesso!");
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setUpdating(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUpdating(true);
    try {
      const fileRef = ref(storage, `avatars/${user.uid}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      
      await updateDoc(doc(db, 'users', user.uid), { photoURL: url });
      setUserData({ ...userData, photoURL: url });
    } catch (err) {
      alert("Erro ao enviar foto.");
    } finally {
      setUpdating(false);
    }
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUpdating(true);
    try {
      const fileRef = ref(storage, `docs/${user.uid}/${Date.now()}_${file.name}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      
      const newDocs = [...(userData.documents || []), url];
      await updateDoc(doc(db, 'users', user.uid), { documents: newDocs });
      setUserData({ ...userData, documents: newDocs });
    } catch (err) {
      alert("Erro ao enviar documento.");
    } finally {
      setUpdating(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    try {
      await sendPasswordResetEmail(auth, user.email);
      alert("E-mail de redefinição de senha enviado!");
    } catch (err: any) {
      alert("Erro ao enviar e-mail: " + err.message);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setUpdating(true);
    try {
      // 1. Delete Firestore data
      await deleteDoc(doc(db, 'users', user.uid));
      
      // 2. Delete Auth user
      await deleteUser(user);
      
      alert("Sua conta foi excluída permanentemente.");
      navigate('/');
    } catch (err: any) {
      if (err.code === 'auth/requires-recent-login') {
        alert("Para excluir sua conta, você precisa ter feito login recentemente. Por favor, saia e entre novamente antes de tentar excluir.");
      } else {
        alert("Erro ao excluir conta: " + err.message);
      }
    } finally {
      setUpdating(false);
      setShowDeleteConfirm(false);
    }
  };

  if (loading) return <div className="flex justify-center pt-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  const isPhysio = userData?.role === 'physiotherapist';

  const tabs = [
    { id: 'profile', label: 'Perfil', icon: User },
    { id: 'account', label: 'Minha Conta', icon: Lock },
    { id: 'settings', label: 'Configurações', icon: Settings },
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
          <div className="pt-4 border-t border-slate-200 mt-4">
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
                      <img
                        src={userData?.photoURL}
                        alt={userData?.name}
                        className="w-32 h-32 rounded-[2rem] object-cover border-4 border-slate-50 shadow-xl"
                        referrerPolicy="no-referrer"
                      />
                      <label className="absolute -bottom-2 -right-2 p-3 bg-blue-600 text-white rounded-2xl cursor-pointer shadow-lg hover:bg-blue-700 transition-all hover:scale-110">
                        <Camera size={20} />
                        <input type="file" className="hidden" onChange={handlePhotoUpload} accept="image/*" />
                      </label>
                    </div>
                    <div className="flex-1 space-y-2">
                      <h2 className="text-2xl font-bold text-slate-900">{userData?.name}</h2>
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
                        <label className="block text-sm font-bold text-slate-700 mb-2">E-mail (Não editável)</label>
                        <input
                          type="email"
                          disabled
                          value={userData?.email}
                          className="w-full p-4 bg-slate-100 border border-slate-200 rounded-2xl text-slate-400 cursor-not-allowed"
                        />
                      </div>
                    </div>

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
                      {userData.documents?.length === 0 ? (
                        <div className="col-span-2 py-10 text-center border-2 border-dashed border-slate-100 rounded-2xl text-slate-400">
                          Nenhum documento enviado ainda.
                        </div>
                      ) : (
                        userData.documents?.map((doc: string, i: number) => (
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

                    <div className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-all cursor-pointer">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                          <Globe size={24} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">Idioma</p>
                          <p className="text-sm text-slate-500">Português (Brasil)</p>
                        </div>
                      </div>
                      <button className="text-blue-600 font-bold text-sm">Alterar</button>
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
