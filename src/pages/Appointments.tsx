import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  getDocs,
  getDoc
} from 'firebase/firestore';
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
  CalendarCheck
} from 'lucide-react';
import { formatDate, cn } from '../lib/utils';

export default function Appointments() {
  const [user] = useAuthState(auth);
  const [userData, setUserData] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  // Form
  const [targetEmail, setTargetEmail] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      getDoc(doc(db, 'users', user.uid)).then(snap => {
        if (snap.exists()) {
          const data = snap.data();
          setUserData(data);

          const q = query(
            collection(db, 'appointments'),
            where(data.role === 'patient' ? 'patientId' : 'physioId', '==', user.uid),
            orderBy('date', 'asc')
          );

          return onSnapshot(q, (snap) => {
            setAppointments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
          });
        }
      });
    }
  }, [user]);

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !time || submitting) return;

    setSubmitting(true);
    try {
      // Find other user
      const q = query(
        collection(db, 'users'), 
        where('email', '==', targetEmail),
        where('role', '==', userData.role === 'patient' ? 'physiotherapist' : 'patient')
      );
      const snap = await getDocs(q);
      
      if (snap.empty) {
        alert(userData.role === 'patient' ? "Fisioterapeuta não encontrado." : "Paciente não encontrado.");
        setSubmitting(false);
        return;
      }

      const targetId = snap.docs[0].id;
      const appointmentDate = new Date(`${date}T${time}`).toISOString();

      await addDoc(collection(db, 'appointments'), {
        patientId: userData.role === 'patient' ? user?.uid : targetId,
        physioId: userData.role === 'physiotherapist' ? user?.uid : targetId,
        date: appointmentDate,
        status: 'pending',
        notes,
        createdAt: new Date().toISOString()
      });

      setShowModal(false);
      setTargetEmail('');
      setDate('');
      setTime('');
      setNotes('');
    } catch (err) {
      alert("Erro ao agendar.");
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await updateDoc(doc(db, 'appointments', id), { status });
    } catch (err) {
      alert("Erro ao atualizar status.");
    }
  };

  if (loading) return <div className="flex justify-center pt-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  const isPhysio = userData?.role === 'physiotherapist';

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Agenda de Consultas</h1>
          <p className="text-slate-500">Gerencie seus horários e sessões.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100"
        >
          <Plus size={20} /> Agendar Sessão
        </button>
      </header>

      <div className="grid gap-4">
        {appointments.length === 0 ? (
          <div className="bg-white p-20 rounded-[2.5rem] border border-slate-100 text-center">
            <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-6">
              <CalendarIcon size={40} />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Nenhuma consulta agendada</h3>
            <p className="text-slate-500 mt-2">Suas sessões aparecerão aqui.</p>
          </div>
        ) : (
          appointments.map((app) => (
            <motion.div
              key={app.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center",
                  app.status === 'confirmed' ? "bg-emerald-50 text-emerald-600" :
                  app.status === 'pending' ? "bg-amber-50 text-amber-600" :
                  "bg-slate-50 text-slate-400"
                )}>
                  <CalendarCheck size={28} />
                </div>
                <div>
                  <div className="text-lg font-bold text-slate-900">
                    {formatDate(app.date)}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <User size={14} />
                    {isPhysio ? `Paciente: ${app.patientId.slice(0, 8)}...` : `Fisioterapeuta: ${app.physioId.slice(0, 8)}...`}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className={cn(
                  "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                  app.status === 'confirmed' ? "bg-emerald-100 text-emerald-700" :
                  app.status === 'pending' ? "bg-amber-100 text-amber-700" :
                  app.status === 'cancelled' ? "bg-red-100 text-red-700" :
                  "bg-slate-100 text-slate-700"
                )}>
                  {app.status === 'pending' ? 'Pendente' : 
                   app.status === 'confirmed' ? 'Confirmado' : 
                   app.status === 'cancelled' ? 'Cancelado' : 'Concluído'}
                </span>

                {app.status === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateStatus(app.id, 'confirmed')}
                      className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
                      title="Confirmar"
                    >
                      <Check size={18} />
                    </button>
                    <button
                      onClick={() => updateStatus(app.id, 'cancelled')}
                      className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                      title="Cancelar"
                    >
                      <XCircle size={18} />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Modal */}
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
              className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-8"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold">Agendar Sessão</h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-50 rounded-full">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSchedule} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    E-mail do {isPhysio ? 'Paciente' : 'Fisioterapeuta'}
                  </label>
                  <input
                    type="email"
                    required
                    value={targetEmail}
                    onChange={(e) => setTargetEmail(e.target.value)}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="email@exemplo.com"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Data</label>
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Horário</label>
                    <input
                      type="time"
                      required
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Observações</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 resize-none h-24"
                    placeholder="Alguma observação importante?"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
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
