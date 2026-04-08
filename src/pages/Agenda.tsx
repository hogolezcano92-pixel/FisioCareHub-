import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Plus, 
  X, 
  Check, 
  XCircle, 
  User, 
  Loader2,
  ChevronLeft,
  ChevronRight,
  MapPin,
  MoreVertical,
  Stethoscope
} from 'lucide-react';
import { formatDate, cn } from '../lib/utils';
import { toast } from 'sonner';

export default function Agenda() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Form State
  const [formData, setFormData] = useState({
    paciente_id: '',
    data: new Date().toISOString().split('T')[0],
    hora: '08:00',
    tipo: 'Presencial',
    local: '',
    observacoes: ''
  });

  useEffect(() => {
    if (profile && profile.plano !== 'fisioterapeuta') {
      navigate('/dashboard');
      return;
    }
    if (user) {
      fetchAppointments();
      fetchPatients();
    }
  }, [user, selectedDate, profile]);

  const fetchPatients = async () => {
    const { data } = await supabase
      .from('pacientes')
      .select('id, nome')
      .eq('fisioterapeuta_id', user?.id)
      .order('nome');
    setPatients(data || []);
  };

  const fetchAppointments = async () => {
    try {
      const { data, error } = await supabase
        .from('atendimentos')
        .select(`
          *,
          paciente:paciente_id (nome, telefone)
        `)
        .eq('fisioterapeuta_id', user?.id)
        .eq('data', selectedDate)
        .order('hora');

      if (error) throw error;
      setAppointments(data || []);
    } catch (err) {
      console.error('Erro ao buscar atendimentos:', err);
      toast.error('Erro ao carregar agenda');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('atendimentos')
        .insert({
          ...formData,
          fisioterapeuta_id: user.id
        });

      if (error) throw error;

      toast.success('Atendimento agendado!');
      setShowModal(false);
      fetchAppointments();
    } catch (err) {
      console.error('Erro ao agendar:', err);
      toast.error('Erro ao realizar agendamento');
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('atendimentos')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
      toast.success(`Status atualizado para ${status}`);
      fetchAppointments();
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      toast.error('Erro ao atualizar status');
    }
  };

  const changeDate = (days: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Minha Agenda</h1>
          <p className="text-slate-500 font-medium">Controle seus atendimentos diários.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-2 px-6 py-4 bg-sky-500 text-white rounded-2xl font-black hover:bg-sky-600 transition-all shadow-lg shadow-sky-100"
        >
          <Plus size={20} />
          Novo Agendamento
        </button>
      </header>

      {/* Seletor de Data */}
      <div className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between">
        <button onClick={() => changeDate(-1)} className="p-3 hover:bg-slate-50 rounded-xl transition-all text-slate-400">
          <ChevronLeft size={24} />
        </button>
        <div className="flex flex-col items-center">
          <span className="text-xs font-bold text-sky-500 uppercase tracking-widest mb-1">
            {new Date(selectedDate).toLocaleDateString('pt-BR', { weekday: 'long' })}
          </span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="text-xl font-black text-slate-900 outline-none bg-transparent text-center cursor-pointer"
          />
        </div>
        <button onClick={() => changeDate(1)} className="p-3 hover:bg-slate-50 rounded-xl transition-all text-slate-400">
          <ChevronRight size={24} />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-12 h-12 text-sky-500 animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {appointments.length === 0 ? (
            <div className="bg-white p-20 rounded-[3rem] border border-slate-100 text-center">
              <div className="w-24 h-24 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-6">
                <CalendarIcon size={48} />
              </div>
              <h3 className="text-2xl font-black text-slate-900">Nenhum atendimento</h3>
              <p className="text-slate-500 mt-2 font-medium">Você não tem compromissos para este dia.</p>
            </div>
          ) : (
            appointments.map((app) => (
              <motion.div
                key={app.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-6">
                  <div className="flex flex-col items-center justify-center w-20 h-20 bg-slate-50 rounded-3xl text-slate-900">
                    <Clock size={20} className="text-sky-500 mb-1" />
                    <span className="text-xl font-black">{app.hora.slice(0, 5)}</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900">{app.paciente?.nome}</h3>
                    <div className="flex flex-wrap gap-4 mt-2">
                      <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                        <Stethoscope size={16} className="text-sky-500" />
                        {app.tipo}
                      </div>
                      {app.local && (
                        <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                          <MapPin size={16} className="text-sky-500" />
                          {app.local}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className={cn(
                    "px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest",
                    app.status === 'realizado' ? "bg-emerald-100 text-emerald-700" :
                    app.status === 'agendado' ? "bg-sky-100 text-sky-700" :
                    "bg-red-100 text-red-700"
                  )}>
                    {app.status}
                  </span>
                  
                  <div className="flex gap-2">
                    {app.status === 'agendado' && (
                      <>
                        <button
                          onClick={() => updateStatus(app.id, 'realizado')}
                          className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-100 transition-all"
                          title="Marcar como realizado"
                        >
                          <Check size={20} />
                        </button>
                        <button
                          onClick={() => updateStatus(app.id, 'cancelado')}
                          className="p-3 bg-red-50 text-red-600 rounded-2xl hover:bg-red-100 transition-all"
                          title="Cancelar"
                        >
                          <XCircle size={20} />
                        </button>
                      </>
                    )}
                    <button className="p-3 text-slate-400 hover:bg-slate-50 rounded-2xl transition-all">
                      <MoreVertical size={20} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Modal de Agendamento */}
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
              className="relative w-full max-w-md bg-white rounded-[3rem] shadow-2xl p-8 overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Novo Agendamento</h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-50 rounded-full transition-all">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleCreateAppointment} className="space-y-6 overflow-y-auto">
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-700 uppercase tracking-widest ml-1">Paciente</label>
                  <select
                    required
                    value={formData.paciente_id}
                    onChange={(e) => setFormData({...formData, paciente_id: e.target.value})}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-sky-500 outline-none transition-all"
                  >
                    <option value="">Selecione um paciente...</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>{p.nome}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-black text-slate-700 uppercase tracking-widest ml-1">Data</label>
                    <input
                      type="date"
                      required
                      value={formData.data}
                      onChange={(e) => setFormData({...formData, data: e.target.value})}
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-sky-500 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-black text-slate-700 uppercase tracking-widest ml-1">Hora</label>
                    <input
                      type="time"
                      required
                      value={formData.hora}
                      onChange={(e) => setFormData({...formData, hora: e.target.value})}
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-sky-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-700 uppercase tracking-widest ml-1">Tipo de Atendimento</label>
                  <select
                    value={formData.tipo}
                    onChange={(e) => setFormData({...formData, tipo: e.target.value})}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-sky-500 outline-none transition-all"
                  >
                    <option value="Presencial">Presencial</option>
                    <option value="Online">Online</option>
                    <option value="Domiciliar">Domiciliar</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-700 uppercase tracking-widest ml-1">Local / Link</label>
                  <input
                    type="text"
                    value={formData.local}
                    onChange={(e) => setFormData({...formData, local: e.target.value})}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-sky-500 outline-none transition-all"
                    placeholder="Ex: Clínica Central ou Link do Meet"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-700 uppercase tracking-widest ml-1">Observações</label>
                  <textarea
                    value={formData.observacoes}
                    onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-sky-500 outline-none transition-all h-24 resize-none"
                    placeholder="Notas sobre o agendamento..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-5 bg-sky-500 text-white rounded-2xl font-black text-lg hover:bg-sky-600 transition-all shadow-xl shadow-sky-100 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="animate-spin" /> : 'Confirmar Agendamento'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
