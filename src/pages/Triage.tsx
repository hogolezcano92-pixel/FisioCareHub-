import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useNavigate, Link } from 'react-router-dom';
import { auth, db } from '../firebase';
import { collection, addDoc, query, where, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import { analyzeSymptoms } from '../lib/gemini';
import { motion, AnimatePresence } from 'motion/react';
import { Gatekeeper } from '../components/Gatekeeper';
import { useSubscription } from '../hooks/useSubscription';
import { BrainCircuit, Send, Loader2, History, ChevronDown, ChevronUp, Crown, ArrowRight, Lock } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { formatDate, cn } from '../lib/utils';

export default function Triage() {
  const [user] = useAuthState(auth);
  const [userData, setUserData] = useState<any>(null);
  const [painLocation, setPainLocation] = useState('');
  const [painDuration, setPainDuration] = useState('');
  const [painIntensity, setPainIntensity] = useState(5);
  const [serviceType, setServiceType] = useState<'domicilio' | 'online'>('online');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const navigate = useNavigate();

  const { isPro } = useSubscription();

  useEffect(() => {
    if (user) {
      getDoc(doc(db, 'users', user.uid)).then(snap => {
        if (snap.exists()) {
          const data = snap.data();
          setUserData(data);
          if (data.role === 'physiotherapist') {
            navigate('/dashboard');
          }
        }
      });

      const fetchHistory = async () => {
        const q = query(
          collection(db, 'triages'),
          where('patientId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const snap = await getDocs(q);
        setHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      };
      fetchHistory();
    }
  }, [user]);

  const handleTriage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setAnalysis(null);

    try {
      const symptoms = `Local: ${painLocation}, Tempo: ${painDuration}, Intensidade: ${painIntensity}, Tipo: ${serviceType}`;
      const result = await analyzeSymptoms(symptoms);
      setAnalysis(result);

      await addDoc(collection(db, 'triages'), {
        patientId: user?.uid,
        painLocation,
        painDuration,
        painIntensity,
        serviceType,
        aiAnalysis: result,
        createdAt: new Date().toISOString()
      });

      // Refresh history
      setHistory([{ painLocation, painDuration, painIntensity, serviceType, aiAnalysis: result, createdAt: new Date().toISOString() }, ...history]);
      import('sonner').then(({ toast }) => toast.success("Triagem enviada com sucesso!"));
    } catch (err) {
      import('sonner').then(({ toast }) => toast.error("Erro ao processar triagem. Tente novamente."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="text-center">
        <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <BrainCircuit size={32} />
        </div>
        <h1 className="text-3xl font-bold text-slate-900">Triagem Inicial</h1>
        <p className="text-slate-500 mt-2">Preencha os dados abaixo para uma avaliação preliminar.</p>
      </header>

      <Gatekeeper featureId="ai-triage">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 relative overflow-hidden">
          <form onSubmit={handleTriage} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Local da Dor</label>
                <input
                  type="text"
                  value={painLocation}
                  onChange={(e) => setPainLocation(e.target.value)}
                  placeholder="Ex: Lombar, Joelho, Pescoço"
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-purple-600 outline-none transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Tempo de Dor</label>
                <input
                  type="text"
                  value={painDuration}
                  onChange={(e) => setPainDuration(e.target.value)}
                  placeholder="Ex: 3 dias, 2 semanas, 1 mês"
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-purple-600 outline-none transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Intensidade da Dor (0 a 10): {painIntensity}</label>
              <input
                type="range"
                min="0"
                max="10"
                value={painIntensity}
                onChange={(e) => setPainIntensity(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-purple-600"
              />
              <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-wider">
                <span>Sem dor</span>
                <span>Moderada</span>
                <span>Insuportável</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Tipo de Atendimento</label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setServiceType('domicilio')}
                  className={cn(
                    "flex-1 py-4 rounded-2xl border-2 font-bold transition-all",
                    serviceType === 'domicilio' ? "border-purple-600 bg-purple-50 text-purple-600" : "border-slate-100 text-slate-500"
                  )}
                >
                  Domicílio
                </button>
                <button
                  type="button"
                  onClick={() => setServiceType('online')}
                  className={cn(
                    "flex-1 py-4 rounded-2xl border-2 font-bold transition-all",
                    serviceType === 'online' ? "border-purple-600 bg-purple-50 text-purple-600" : "border-slate-100 text-slate-500"
                  )}
                >
                  Online
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-colors shadow-lg shadow-purple-100 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" /> : <><Send size={20} /> Enviar Triagem</>}
            </button>
          </form>

          <AnimatePresence>
            {analysis && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-10 p-6 bg-purple-50 rounded-2xl border border-purple-100 overflow-hidden"
              >
                <h3 className="text-lg font-bold text-purple-900 mb-4 flex items-center gap-2">
                  <BrainCircuit size={20} /> Resultado da Análise
                </h3>
                <div className="prose prose-purple max-w-none text-purple-900/80">
                  <ReactMarkdown>{analysis}</ReactMarkdown>
                </div>
                <div className="mt-6 p-4 bg-white/50 rounded-xl text-xs text-purple-700 italic">
                  Aviso: Esta análise é gerada por inteligência artificial e serve apenas como orientação. 
                  Consulte sempre um fisioterapeuta ou médico para um diagnóstico preciso.
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Gatekeeper>

      {/* History */}
      <section className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="w-full p-6 flex items-center justify-between hover:bg-slate-50 transition-colors"
        >
          <h2 className="text-xl font-bold flex items-center gap-2">
            <History size={20} className="text-slate-400" />
            Histórico de Triagens
          </h2>
          {showHistory ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
        
        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t border-slate-50"
            >
              {history.length === 0 ? (
                <div className="p-10 text-center text-slate-400">Nenhuma triagem anterior.</div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {history.map((item, i) => (
                    <div key={i} className="p-6 hover:bg-slate-50 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          {formatDate(item.createdAt)}
                        </span>
                      </div>
                      <p className="text-slate-700 font-medium line-clamp-2">{item.symptoms}</p>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </div>
  );
}
