import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ListSkeleton } from '../components/Skeleton';
import { 
  User, 
  Plus, 
  Search, 
  Phone, 
  Mail, 
  Calendar, 
  FileText, 
  MoreVertical,
  X,
  Loader2,
  Trash2,
  Edit2,
  ChevronRight,
  Camera
} from 'lucide-react';
import { formatDate, cn, resolveStorageUrl } from '../lib/utils';
import { toast } from 'sonner';

export default function Patients() {
  const { user, profile, subscription } = useAuth();
  const navigate = useNavigate();
  const [patients, setPatients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    data_nascimento: '',
    diagnostico: '',
    observacoes: '',
    foto_url: ''
  });
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `patient-avatars/${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, foto_url: publicUrl }));
      toast.success('Imagem carregada!');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Erro ao carregar imagem');
    } finally {
      setUploadingImage(false);
    }
  };

  useEffect(() => {
    if (profile && profile.tipo_usuario !== 'fisioterapeuta') {
      window.location.href = '/dashboard';
      return;
    }
    if (user) {
      fetchPatients();
    }
  }, [user, profile]);

  const fetchPatients = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: supabaseError } = await supabase
        .from('pacientes')
        .select('*')
        .eq('fisioterapeuta_id', user?.id)
        .order('nome');

      if (supabaseError) throw supabaseError;
      setPatients(data || []);
    } catch (err: any) {
      console.error('Erro ao buscar pacientes:', err);
      // Silenciamos o erro definindo como array vazio conforme solicitado
      setPatients([]);
      // Só armazenamos o erro se for algo crítico para debug interno
      setError(err.message || 'Erro de conexão');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const userPlan = profile?.plan_type || profile?.plano || 'basic';
    const isPro = userPlan === 'pro' || profile?.plano === 'admin' || subscription?.status === 'ativo';

    if (!isPro && patients.length >= 10) {
      toast.error('Limite do Plano Basic atingido', {
        description: 'Faça upgrade para o plano PRO para cadastrar pacientes ilimitados.'
      });
      setShowModal(false);
      navigate('/subscription');
      return;
    }

    setSubmitting(true);
    try {
      // Garantir que campos vazios sejam enviados como NULL para o Supabase,
      // evitando erros do tipo 'invalid input syntax for type date: ""'
      const dataToInsert = {
        nome: formData.nome.trim(),
        email: formData.email.trim() || null,
        telefone: formData.telefone.trim() || null,
        data_nascimento: formData.data_nascimento || null,
        diagnostico: formData.diagnostico.trim() || null,
        observacoes: formData.observacoes.trim() || null,
        foto_url: formData.foto_url || null,
        fisioterapeuta_id: user.id
      };

      const { error: insertError } = await supabase
        .from('pacientes')
        .insert(dataToInsert);

      if (insertError) throw insertError;

      toast.success('Paciente cadastrado com sucesso!');
      setShowModal(false);
      setFormData({
        nome: '',
        email: '',
        telefone: '',
        data_nascimento: '',
        diagnostico: '',
        observacoes: '',
        foto_url: ''
      });
      fetchPatients();
    } catch (err) {
      console.error('Erro ao criar paciente:', err);
      toast.error('Erro ao cadastrar paciente');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredPatients = useMemo(() => {
    // Garantir que não existam duplicatas por ID caso haja inconsistência no banco ou fetch
    const uniquePatientsMap = new Map();
    patients.forEach(p => {
      if (!uniquePatientsMap.has(p.id)) {
        uniquePatientsMap.set(p.id, p);
      }
    });
    
    return Array.from(uniquePatientsMap.values()).filter(p => 
      p.nome.toLowerCase().includes(search.toLowerCase()) ||
      p.email?.toLowerCase().includes(search.toLowerCase())
    );
  }, [patients, search]);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
            <div className="h-4 w-64 bg-slate-100 dark:bg-slate-900 rounded-lg animate-pulse" />
          </div>
          <div className="h-14 w-40 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
        </div>
        <ListSkeleton count={5} />
      </div>
    );
  }

  return (
    <div className="space-y-5 w-full box-border overflow-wrap-break-word">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-3 w-full">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight">Meus Pacientes</h1>
          <p className="text-slate-400 font-medium text-xs">Gerencie sua base de pacientes e prontuários.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-sky-500 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-sky-600 transition-all shadow-lg shadow-sky-900/20"
        >
          <Plus size={16} />
          Novo Paciente
        </button>
      </header>

      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" size={16} />
        <input
          type="text"
          placeholder="Buscar por nome ou e-mail..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-compact !pl-10 pr-4"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
        {filteredPatients.length === 0 ? (
          <div className="col-span-full bg-slate-900/50 backdrop-blur-xl !p-12 rounded-[2.5rem] border border-white/10 text-center w-full shadow-2xl">
            <div className="w-16 h-16 bg-white/5 text-slate-700 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
              <User size={32} />
            </div>
            <h3 className="text-lg font-black text-white">Nenhum paciente encontrado</h3>
            <p className="text-slate-400 mt-1 text-xs font-medium">Comece cadastrando seu primeiro paciente.</p>
          </div>
        ) : (
          filteredPatients.map((patient) => (
            <motion.div
              key={patient.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => navigate(`/patient/${patient.id}`)}
              className="bg-slate-900/50 backdrop-blur-xl !p-6 rounded-[2.5rem] border border-white/10 group cursor-pointer hover:border-sky-500/30 transition-all shadow-xl hover:shadow-sky-900/10 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-sky-400 overflow-hidden border border-white/10 shadow-inner group-hover:scale-105 transition-transform">
                      {patient.foto_url ? (
                        <img src={resolveStorageUrl(patient.foto_url)} alt={patient.nome} className="w-full h-full object-cover" />
                      ) : (
                        <User size={28} />
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white leading-tight group-hover:text-sky-400 transition-colors">
                        {patient.nome}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                          Ativo
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="p-2 text-slate-600 hover:bg-white/5 rounded-xl transition-all">
                    <MoreVertical size={18} />
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Diagnóstico</p>
                    <p className="text-xs font-bold text-slate-300 line-clamp-1">{patient.diagnostico || 'Sem diagnóstico registrado'}</p>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-2">
                    {patient.email && (
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                        <Mail size={12} className="text-sky-400" />
                        <span className="truncate">{patient.email}</span>
                      </div>
                    )}
                    {patient.telefone && (
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                        <Phone size={12} className="text-sky-400" />
                        <span className="truncate">{patient.telefone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <div className="flex -space-x-1.5">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="w-6 h-6 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center text-[7px] font-bold text-slate-500">
                      {i}
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-1 text-[10px] font-black text-sky-400 uppercase tracking-widest group-hover:gap-2 transition-all">
                  Ver Prontuário
                  <ChevronRight size={14} />
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Modal de Cadastro */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-xl bg-slate-900/90 backdrop-blur-2xl rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-5 border-b border-white/10 flex items-center justify-between flex-shrink-0">
                <h2 className="text-lg font-black text-white tracking-tight uppercase">CADASTRO NOVO PACIENTE</h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/5 text-slate-400 rounded-full transition-all">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreatePatient} className="p-5 space-y-4 overflow-y-auto">
                <div className="flex justify-center mb-4">
                  <div className="relative group">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="patient-photo-modal"
                    />
                    <label 
                      htmlFor="patient-photo-modal"
                      className="relative block cursor-pointer transition-all active:scale-95"
                    >
                      <div className="w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center text-slate-600 border-2 border-dashed border-white/10 overflow-hidden hover:border-sky-500/50 transition-colors">
                        {formData.foto_url ? (
                          <img src={resolveStorageUrl(formData.foto_url)} className="w-full h-full object-cover" />
                        ) : (
                          uploadingImage ? <Loader2 className="animate-spin text-sky-400" size={24} /> : <Camera size={28} />
                        )}
                      </div>
                      <div className="absolute -bottom-1 -right-1 p-2 bg-blue-600 text-white rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                        {uploadingImage ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                      </div>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Nome Completo</label>
                    <input
                      type="text"
                      required
                      value={formData.nome}
                      onChange={(e) => setFormData({...formData, nome: e.target.value})}
                      className="input-compact"
                      placeholder="Ex: João Silva"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">E-mail</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="input-compact"
                      placeholder="joao@email.com"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Telefone / WhatsApp</label>
                    <input
                      type="text"
                      value={formData.telefone}
                      onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                      className="input-compact"
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Data de Nascimento</label>
                    <input
                      type="date"
                      value={formData.data_nascimento}
                      onChange={(e) => setFormData({...formData, data_nascimento: e.target.value})}
                      className="input-compact"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Diagnóstico Clínico</label>
                  <input
                    type="text"
                    value={formData.diagnostico}
                    onChange={(e) => setFormData({...formData, diagnostico: e.target.value})}
                    className="input-compact"
                    placeholder="Ex: Hérnia de disco L4-L5"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Observações Iniciais</label>
                  <textarea
                    value={formData.observacoes}
                    onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                    className="input-compact h-20 resize-none"
                    placeholder="Alguma observação importante sobre o paciente..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-sky-500 text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-sky-600 transition-all shadow-xl shadow-sky-900/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="animate-spin" /> : 'Salvar Paciente'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
