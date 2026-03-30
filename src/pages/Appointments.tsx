import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../lib/firebase';
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
  getDoc,
  serverTimestamp
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
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  
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

          const unsubscribe = onSnapshot(q, (snap) => {
            const apps = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setAppointments(apps);
            setLoading(false);

            // Check for ID in URL
            const params = new URLSearchParams(window.location.search);
            const appId = params.get('id');
            if (appId && data.role === 'physiotherapist') {
              const appToConfirm = apps.find(a => a.id === appId) as any;
              if (appToConfirm && appToConfirm.status === 'pending') {
                setSelectedAppId(appId);
              }
            }
          });

          return () => unsubscribe();
        }
      });
    }
  }, [user]);

  const sendEmail = async (to: string, subject: string, body: string) => {
    try {
      const { invokeFunction } = await import('../lib/supabase');
      await invokeFunction('send-email', { to, subject, body });
      console.log("E-mail enviado com sucesso via Edge Function.");
    } catch (err) {
      console.error("Erro ao enviar e-mail via Edge Function:", err);
    }
  };

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !time || submitting) return;

    setSubmitting(true);
    try {
      // Find other user
      const q = query(
        collection(db, 'users'), 
        where('email', '==', targetEmail.trim().toLowerCase()),
        where('role', '==', userData.role === 'patient' ? 'physiotherapist' : 'patient')
      );
      const snap = await getDocs(q);
      
      if (snap.empty) {
        import('sonner').then(({ toast }) => toast.error(userData.role === 'patient' ? "Fisioterapeuta não encontrado com este e-mail." : "Paciente não encontrado com este e-mail."));
        setSubmitting(false);
        return;
      }

      const targetUser = snap.docs[0].data();
      const targetId = snap.docs[0].id;
      const appointmentDate = new Date(`${date}T${time}`).toISOString();

      const docRef = await addDoc(collection(db, 'appointments'), {
        patientId: userData.role === 'patient' ? user?.uid : targetId,
        physioId: userData.role === 'physiotherapist' ? user?.uid : targetId,
        patientEmail: userData.role === 'patient' ? user?.email : targetEmail,
        physioEmail: userData.role === 'physiotherapist' ? user?.email : targetEmail,
        patientName: userData.role === 'patient' ? userData.name : targetUser.name,
        physioName: userData.role === 'physiotherapist' ? userData.name : targetUser.name,
        date: appointmentDate,
        status: 'pending',
        notes,
        createdAt: new Date().toISOString()
      });

      // Create notification for target user
      await addDoc(collection(db, 'notifications'), {
        userId: targetId,
        title: 'Nova Solicitação de Agendamento',
        message: `${userData.name} solicitou uma consulta para o dia ${new Date(appointmentDate).toLocaleDateString('pt-BR')}.`,
        type: 'appointment',
        read: false,
        createdAt: serverTimestamp(),
        link: '/appointments'
      });

      // Send email notification
      const confirmLink = `${window.location.origin}/appointments?id=${docRef.id}`;
      
      if (userData.role === 'patient') {
        // Patient scheduling -> Notify Physio
        await sendEmail(
          targetEmail,
          "Novo Agendamento - FisioCareHub",
          `
          <div style="font-family: sans-serif; color: #334155;">
            <h2 style="color: #2563eb;">Olá, ${targetUser.name}!</h2>
            <p>O paciente <strong>${userData.name}</strong> solicitou um novo agendamento.</p>
            <p><strong>Data:</strong> ${new Date(appointmentDate).toLocaleDateString('pt-BR')}</p>
            <p><strong>Horário:</strong> ${new Date(appointmentDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
            <p><strong>Observações:</strong> ${notes || 'Nenhuma'}</p>
            <br/>
            <a href="${confirmLink}" style="background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
              Confirmar Agendamento
            </a>
          </div>
          `
        );
      } else {
        // Physio scheduling -> Notify Patient
        await sendEmail(
          targetEmail,
          "Nova Consulta Agendada - FisioCareHub",
          `
          <div style="font-family: sans-serif; color: #334155;">
            <h2 style="color: #2563eb;">Olá, ${targetUser.name}!</h2>
            <p>O(A) ${userData.gender === 'female' ? 'Dra.' : 'Dr.'} <strong>${userData.name}</strong> agendou uma nova sessão para você.</p>
            <p><strong>Data:</strong> ${new Date(appointmentDate).toLocaleDateString('pt-BR')}</p>
            <p><strong>Horário:</strong> ${new Date(appointmentDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
            <p><strong>Observações:</strong> ${notes || 'Nenhuma'}</p>
            <br/>
            <p>Acesse o painel para ver os detalhes da sua sessão.</p>
          </div>
          `
        );
      }

      setShowModal(false);
      setTargetEmail('');
      setDate('');
      setTime('');
      setNotes('');
      import('sonner').then(({ toast }) => toast.success("Agendamento solicitado com sucesso!"));
    } catch (err) {
      console.error("Erro ao agendar:", err);
      import('sonner').then(({ toast }) => toast.error("Erro ao agendar. Tente novamente."));
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const app = appointments.find(a => a.id === id);
      if (!app) return;

      await updateDoc(doc(db, 'appointments', id), { status });
      
      // Create notification for the other party
      const targetId = isPhysio ? app.patientId : app.physioId;
      const statusText = status === 'confirmed' ? 'confirmado' : 'cancelado';
      
      await addDoc(collection(db, 'notifications'), {
        userId: targetId,
        title: `Agendamento ${statusText}`,
        message: `Seu agendamento para o dia ${new Date(app.date).toLocaleDateString('pt-BR')} foi ${statusText}.`,
        type: 'appointment',
        read: false,
        createdAt: serverTimestamp(),
        link: '/appointments'
      });
      
      // If confirmed, send email to patient
      if (status === 'confirmed') {
        await sendEmail(
          app.patientEmail,
          "Consulta Confirmada - FisioCareHub",
          `
          <div style="font-family: sans-serif; color: #334155;">
            <h2 style="color: #10b981;">Olá, ${app.patientName}!</h2>
            <p>Sua consulta com <strong>${app.physioName}</strong> foi confirmada.</p>
            <p><strong>Data:</strong> ${new Date(app.date).toLocaleDateString('pt-BR')}</p>
            <p><strong>Horário:</strong> ${new Date(app.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
            <br/>
            <p>Estamos ansiosos para atendê-lo!</p>
          </div>
          `
        );
      } else if (status === 'cancelled') {
        const targetEmail = isPhysio ? app.patientEmail : app.physioEmail;
        const targetName = isPhysio ? app.patientName : app.physioName;
        
        await sendEmail(
          targetEmail,
          "Agendamento Cancelado - FisioCareHub",
          `
          <div style="font-family: sans-serif; color: #334155;">
            <h2 style="color: #ef4444;">Aviso de Cancelamento</h2>
            <p>Olá, ${targetName}.</p>
            <p>Informamos que o agendamento para o dia <strong>${new Date(app.date).toLocaleDateString('pt-BR')}</strong> foi cancelado.</p>
            <br/>
            <p>Por favor, acesse o aplicativo para reagendar ou entrar em contato.</p>
          </div>
          `
        );
      }
      import('sonner').then(({ toast }) => toast.success(`Status atualizado para ${status}`));
    } catch (err) {
      import('sonner').then(({ toast }) => toast.error("Erro ao atualizar status."));
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
                    {isPhysio ? `Paciente: ${app.patientName}` : `Fisioterapeuta: ${app.physioName}`}
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
      {/* Confirmation Modal for Link */}
      <AnimatePresence>
        {selectedAppId && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedAppId(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-8 text-center"
            >
              <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <CalendarCheck size={40} />
              </div>
              <h2 className="text-2xl font-bold mb-2">Confirmar Agendamento?</h2>
              <p className="text-slate-500 mb-8">
                Você recebeu uma solicitação de consulta. Deseja confirmar agora?
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    updateStatus(selectedAppId, 'cancelled');
                    setSelectedAppId(null);
                  }}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                >
                  Recusar
                </button>
                <button
                  onClick={() => {
                    updateStatus(selectedAppId, 'confirmed');
                    setSelectedAppId(null);
                  }}
                  className="flex-1 py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
