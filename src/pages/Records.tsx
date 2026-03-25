import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db, storage } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  getDocs,
  doc,
  getDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  Plus, 
  Search, 
  User, 
  Calendar, 
  Paperclip, 
  X, 
  Loader2,
  ChevronRight,
  Download
} from 'lucide-react';
import { formatDate, cn } from '../lib/utils';

export default function Records() {
  const [user] = useAuthState(auth);
  const [userData, setUserData] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  
  // New Record Form
  const [patientEmail, setPatientEmail] = useState('');
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      getDoc(doc(db, 'users', user.uid)).then(snap => {
        if (snap.exists()) {
          const data = snap.data();
          setUserData(data);

          const q = query(
            collection(db, 'records'),
            where(data.role === 'patient' ? 'patientId' : 'physioId', '==', user.uid),
            orderBy('createdAt', 'desc')
          );

          return onSnapshot(q, (snap) => {
            setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
          });
        }
      });
    }
  }, [user]);

  const handleCreateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || submitting) return;

    // Restriction for free physiotherapists
    if (userData?.role === 'physiotherapist' && (!userData?.subscription?.plan || userData?.subscription?.plan === 'free') && records.length >= 3) {
      alert("Você atingiu o limite de 3 prontuários no plano gratuito. Faça o upgrade para o plano Basic ou Premium para registros ilimitados.");
      return;
    }

    setSubmitting(true);
    try {
      // Find patient by email
      const q = query(collection(db, 'users'), where('email', '==', patientEmail), where('role', '==', 'patient'));
      const patientSnap = await getDocs(q);
      
      if (patientSnap.empty) {
        alert("Paciente não encontrado com este e-mail.");
        setSubmitting(false);
        return;
      }

      const patientId = patientSnap.docs[0].id;
      const attachmentUrls = [];

      // Upload files
      for (const file of files) {
        const fileRef = ref(storage, `records/${Date.now()}_${file.name}`);
        await uploadBytes(fileRef, file);
        const url = await getDownloadURL(fileRef);
        attachmentUrls.push(url);
      }

      await addDoc(collection(db, 'records'), {
        patientId,
        physioId: user?.uid,
        content,
        attachments: attachmentUrls,
        createdAt: new Date().toISOString()
      });

      setShowNewModal(false);
      setContent('');
      setPatientEmail('');
      setFiles([]);
    } catch (err) {
      console.error(err);
      alert("Erro ao criar prontuário.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center pt-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  const isPhysio = userData?.role === 'physiotherapist';

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Prontuários</h1>
          <p className="text-slate-500">Histórico completo de atendimentos e evoluções.</p>
        </div>
        {isPhysio && (
          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100"
          >
            <Plus size={20} /> Novo Registro
          </button>
        )}
      </header>

      <div className="grid gap-6">
        {records.length === 0 ? (
          <div className="bg-white p-20 rounded-[2.5rem] border border-slate-100 text-center">
            <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText size={40} />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Nenhum prontuário encontrado</h3>
            <p className="text-slate-500 mt-2">Os registros de atendimento aparecerão aqui.</p>
          </div>
        ) : (
          records.map((record) => (
            <motion.div
              key={record.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                    <Calendar size={24} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                      {formatDate(record.createdAt)}
                    </div>
                    <div className="text-lg font-bold text-slate-900">
                      Atendimento Realizado
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 px-4 py-2 rounded-full">
                  <User size={16} />
                  ID do Paciente: {record.patientId.slice(0, 8)}...
                </div>
              </div>

              <div className="prose prose-slate max-w-none text-slate-700 mb-6">
                {record.content}
              </div>

              {record.attachments?.length > 0 && (
                <div className="flex flex-wrap gap-3 pt-6 border-t border-slate-50">
                  {record.attachments.map((url: string, i: number) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-sm font-bold transition-colors"
                    >
                      <Paperclip size={16} /> Anexo {i + 1} <Download size={14} />
                    </a>
                  ))}
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>

      {/* New Record Modal */}
      <AnimatePresence>
        {showNewModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNewModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                <h2 className="text-2xl font-bold">Novo Registro de Atendimento</h2>
                <button onClick={() => setShowNewModal(false)} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleCreateRecord} className="p-8 space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">E-mail do Paciente</label>
                  <input
                    type="email"
                    required
                    value={patientEmail}
                    onChange={(e) => setPatientEmail(e.target.value)}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none"
                    placeholder="paciente@email.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Evolução / Conduta</label>
                  <textarea
                    required
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full h-48 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none resize-none"
                    placeholder="Descreva o atendimento, exercícios realizados e evolução do paciente..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Anexos (Fotos, Vídeos, Documentos)</label>
                  <input
                    type="file"
                    multiple
                    onChange={(e) => setFiles(Array.from(e.target.files || []))}
                    className="w-full p-4 bg-slate-50 border border-slate-200 border-dashed rounded-xl cursor-pointer"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="animate-spin" /> : 'Salvar Prontuário'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
