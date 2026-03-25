import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../firebase';
import { collection, addDoc, query, where, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import { analyzeSymptoms } from '../lib/gemini';
import { motion, AnimatePresence } from 'motion/react';
import { BrainCircuit, Send, Loader2, History, ChevronDown, ChevronUp, Crown, ArrowRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { formatDate } from '../lib/utils';
import { Link } from 'react-router-dom';

export default function Triage() {
  const [user] = useAuthState(auth);
  const [userData, setUserData] = useState<any>(null);
  const [symptoms, setSymptoms] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (user) {
      getDoc(doc(db, 'users', user.uid)).then(snap => {
        if (snap.exists()) setUserData(snap.data());
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
    if (!symptoms.trim() || loading) return;

    // Restriction for free patients removed as per user request
    // if (userData?.role === 'patient' && (!userData?.subscription?.plan || userData?.subscription?.plan === 'free') && history.length >= 1) {
    //   alert("Você atingiu o limite de triagens gratuitas. Faça o upgrade para continuar usando a IA.");
    //   return;
    // }

    setLoading(true);
    setAnalysis(null);

    try {
      const result = await analyzeSymptoms(symptoms);
      setAnalysis(result);

      await addDoc(collection(db, 'triages'), {
        patientId: user?.uid,
        symptoms,
        aiAnalysis: result,
        createdAt: new Date().toISOString()
      });

      // Refresh history
      setHistory([{ symptoms, aiAnalysis: result, createdAt: new Date().toISOString() }, ...history]);
    } catch (err) {
      alert("Erro ao processar triagem. Tente novamente.");
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
        <h1 className="text-3xl font-bold text-slate-900">Triagem Inteligente</h1>
        <p className="text-slate-500 mt-2">Descreva seus sintomas e receba uma análise preliminar por IA.</p>
      </header>

      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 relative overflow-hidden">
        {userData?.role === 'physiotherapist' && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
              <BrainCircuit size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Área do Paciente</h3>
            <p className="text-slate-500 mt-2 max-w-xs">
              A triagem por IA é uma ferramenta para pacientes descreverem sintomas antes da consulta.
            </p>
          </div>
        )}

        {/* Paywall overlay removed as per user request */}

        <form onSubmit={handleTriage} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">O que você está sentindo?</label>
            <textarea
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              placeholder="Ex: Sinto uma dor aguda na lombar ao me abaixar, que irradia para a perna direita há 3 dias..."
              className="w-full h-40 p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none transition-all resize-none"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-colors shadow-lg shadow-purple-100 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" /> : <><Send size={20} /> Analisar Sintomas</>}
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
