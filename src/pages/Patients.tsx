import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
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
import { formatDate, cn } from '../lib/utils';
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
    observacoes: ''
  });

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

    const isPro = profile?.plano === 'admin' || subscription?.status === 'ativo';

    if (!isPro && patients.length >= 5) {
      toast.error('Limite de pacientes atingido', {
        description: 'Assine o plano PRO para cadastrar pacientes ilimitados.'
      });
      setShowModal(false);
      navigate('/subscription');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('pacientes')
        .insert({
          ...formData,
          fisioterapeuta_id: user.id
        });

      if (error) throw error;

      toast.success('Paciente cadastrado com sucesso!');
      setShowModal(false);
      setFormData({
        nome: '',
        email: '',
        telefone: '',
        data_nascimento: '',
        diagnostico: '',
        observacoes: ''
      });
      fetchPatients();
    } catch (err) {
      console.error('Erro ao criar paciente:', err);
      toast.error('Erro ao cadastrar paciente');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredPatients = patients.filter(p => 
    p.nome.toLowerCase().includes(search.toLowerCase()) ||
    p.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-12 h-12 text-sky-500 animate-spin" />
        <p className="text-slate-500 font-bold animate-pulse">Carregando pacientes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full box-border overflow-wrap-break-word">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Meus Pacientes</h1>
          <p className="text-slate-500 font-medium">Gerencie sua base de pacientes e prontuários.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-2 px-6 py-4 bg-sky-500 text-white rounded-2xl font-black hover:bg-sky-600 transition-all shadow-lg shadow-sky-100"
        >
          <Plus size={20} />
          Novo Paciente
        </button>
      </header>

      <div className="relative w-full">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input
          type="text"
          placeholder="Buscar por nome ou e-mail..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-sky-500 outline-none transition-all shadow-sm"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
        {filteredPatients.length === 0 ? (
          <div className="col-span-full bg-white p-20 rounded-[3rem] border border-slate-100 text-center w-full">
            <div className="w-24 h-24 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-6">
              <User size={48} />
            </div>
            <h3 className="text-2xl font-black text-slate-900">Nenhum paciente encontrado</h3>
            <p className="text-slate-500 mt-2 font-medium">Comece cadastrando seu primeiro paciente.</p>
          </div>
        ) : (
          filteredPatients.map((patient) => (
            <motion.div
              key={patient.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group cursor-pointer"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-sky-50 rounded-2xl flex items-center justify-center text-sky-500 overflow-hidden border-2 border-white shadow-sm">
                    {patient.foto_url ? (
                      <img src={patient.foto_url} alt={patient.nome} className="w-full h-full object-cover" />
                    ) : (
                      <User size={32} />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 leading-tight group-hover:text-sky-600 transition-colors">
                      {patient.nome}
                    </h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      {patient.diagnostico || 'Sem diagnóstico'}
                    </p>
                  </div>
                </div>
                <button className="p-2 text-slate-400 hover:bg-slate-50 rounded-xl transition-all">
                  <MoreVertical size={20} />
                </button>
              </div>

              <div className="space-y-3 mb-6">
                {patient.email && (
                  <div className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                    <Mail size={16} className="text-slate-400" />
                    {patient.email}
                  </div>
                )}
                {patient.telefone && (
                  <div className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                    <Phone size={16} className="text-slate-400" />
                    {patient.telefone}
                  </div>
                )}
                <div className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                  <Calendar size={16} className="text-slate-400" />
                  Nasc: {patient.data_nascimento ? new Date(patient.data_nascimento).toLocaleDateString('pt-BR') : 'Não informado'}
                </div>
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                <div className="flex -space-x-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-400">
                      <FileText size={12} />
                    </div>
                  ))}
                </div>
                <button className="flex items-center gap-1 text-sm font-black text-sky-500 hover:gap-2 transition-all">
                  Ver Ficha <ChevronRight size={16} />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Modal de Cadastro */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-slate-50 flex items-center justify-between flex-shrink-0">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Cadastrar Novo Paciente</h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-50 rounded-full transition-all">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleCreatePatient} className="p-8 space-y-6 overflow-y-auto">
                <div className="flex justify-center mb-8">
                  <div className="relative">
                    <div className="w-24 h-24 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-300 border-2 border-dashed border-slate-200">
                      <Camera size={32} />
                    </div>
                    <button type="button" className="absolute -bottom-2 -right-2 p-2 bg-sky-500 text-white rounded-xl shadow-lg">
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-black text-slate-700 uppercase tracking-widest ml-1">Nome Completo</label>
                    <input
                      type="text"
                      required
                      value={formData.nome}
                      onChange={(e) => setFormData({...formData, nome: e.target.value})}
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-sky-500 outline-none transition-all"
                      placeholder="Ex: João Silva"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-black text-slate-700 uppercase tracking-widest ml-1">E-mail</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-sky-500 outline-none transition-all"
                      placeholder="joao@email.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-black text-slate-700 uppercase tracking-widest ml-1">Telefone / WhatsApp</label>
                    <input
                      type="text"
                      value={formData.telefone}
                      onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-sky-500 outline-none transition-all"
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-black text-slate-700 uppercase tracking-widest ml-1">Data de Nascimento</label>
                    <input
                      type="date"
                      value={formData.data_nascimento}
                      onChange={(e) => setFormData({...formData, data_nascimento: e.target.value})}
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-sky-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-700 uppercase tracking-widest ml-1">Diagnóstico Clínico</label>
                  <input
                    type="text"
                    value={formData.diagnostico}
                    onChange={(e) => setFormData({...formData, diagnostico: e.target.value})}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-sky-500 outline-none transition-all"
                    placeholder="Ex: Hérnia de disco L4-L5"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-700 uppercase tracking-widest ml-1">Observações Iniciais</label>
                  <textarea
                    value={formData.observacoes}
                    onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-sky-500 outline-none transition-all h-32 resize-none"
                    placeholder="Alguma observação importante sobre o paciente..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-5 bg-sky-500 text-white rounded-2xl font-black text-lg hover:bg-sky-600 transition-all shadow-xl shadow-sky-100 disabled:opacity-50 flex items-center justify-center gap-2"
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
