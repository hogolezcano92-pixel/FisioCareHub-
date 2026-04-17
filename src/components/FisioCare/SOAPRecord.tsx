import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BrainCircuit, Save, Sparkles, Loader2, CheckCircle2, AlertCircle, User, FileSearch } from 'lucide-react';
import { generateSOAPRecord, summarizePatientHistory } from '../../lib/groq';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface SOAPData {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

interface SOAPIntelligentRecordProps {
  pacienteId?: string;
  onSave?: () => void;
}

export const SOAPIntelligentRecord = ({ pacienteId, onSave }: SOAPIntelligentRecordProps) => {
  const { profile } = useAuth();
  const [rawText, setRawText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [soapData, setSoapData] = useState<SOAPData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [historySummary, setHistorySummary] = useState<string | null>(null);

  // Patient details state
  const [selectedPatient, setSelectedPatient] = useState<any>(null);

  useEffect(() => {
    if (pacienteId) {
      fetchPatientDetails(pacienteId);
    } else {
      setSelectedPatient(null);
    }
  }, [pacienteId]);

  const fetchPatientDetails = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('perfis')
        .select('id, nome_completo, avatar_url, email')
        .eq('id', id)
        .single();
      if (error) throw error;
      setSelectedPatient(data);
    } catch (err) {
      console.error("Erro ao carregar detalhes do paciente:", err);
    }
  };

  // Patient selection states
  const [showPatientSelector, setShowPatientSelector] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const searchPatients = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('perfis')
        .select('*')
        .eq('tipo_usuario', 'paciente')
        .or(`nome_completo.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(5);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (err) {
      console.error("Erro ao buscar pacientes:", err);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectPatientAndSave = async (patient: any) => {
    setSelectedPatient(patient);
    setShowPatientSelector(false);
    await handleSave(patient.id);
  };

  const handleSummarize = async () => {
    if (!pacienteId) {
      toast.error('Selecione um paciente para resumir o histórico.');
      return;
    }

    setIsSummarizing(true);
    try {
      const { data: records, error } = await supabase
        .from('prontuarios')
        .select('conteudo')
        .eq('paciente_id', pacienteId)
        .order('data_registro', { ascending: false })
        .limit(10);

      if (error) throw error;

      if (!records || records.length === 0) {
        toast.error('Nenhum prontuário encontrado para este paciente.');
        return;
      }

      const historyText = records.map(r => JSON.stringify(r.conteudo)).join('\n');
      const summary = await summarizePatientHistory(historyText);
      setHistorySummary(summary);
      toast.success('Resumo gerado com sucesso!');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao gerar resumo do histórico.');
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleProcess = async () => {
    if (!rawText.trim()) {
      toast.error('Por favor, insira o relato do atendimento.');
      return;
    }

    setIsProcessing(true);
    try {
      const result = await generateSOAPRecord(rawText);
      setSoapData(result);
      toast.success('Prontuário estruturado com sucesso!');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao processar com IA. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async (forcedPatientId?: string) => {
    const finalPacienteId = forcedPatientId || pacienteId;

    if (!soapData || !profile) return;
    
    if (!finalPacienteId) {
      setShowPatientSelector(true);
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('prontuarios')
        .insert({
          paciente_id: finalPacienteId,
          fisio_id: profile.id,
          data_registro: new Date().toISOString(),
          conteudo: {
            type: 'SOAP',
            ...soapData,
            raw: rawText
          }
        });

      if (error) throw error;

      toast.success('Prontuário salvo no histórico do paciente.');
      setSoapData(null);
      setRawText('');
      if (onSave) onSave();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar prontuário.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur-xl p-3 rounded-2xl border border-white/10 shadow-2xl space-y-3 w-full">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h3 className="text-sm font-black text-white tracking-tight flex items-center gap-2">
            <BrainCircuit className="text-blue-400" size={18} />
            Prontuário SOAP
          </h3>
          <p className="text-slate-400 text-[9px] font-medium">IA estruturando seu relato bruto.</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-full text-[7px] font-black uppercase tracking-widest">
            Profissional
          </div>
          {pacienteId && (
            <button
              onClick={handleSummarize}
              disabled={isSummarizing}
              className="flex items-center gap-1 text-[7px] font-black text-blue-400 hover:text-blue-300 uppercase tracking-widest"
            >
              {isSummarizing ? <Loader2 className="animate-spin" size={7} /> : <FileSearch size={7} />}
              Resumir Histórico
            </button>
          )}
        </div>
      </div>

      {/* Patient Context Header */}
      <div className="bg-white/5 p-3 rounded-xl border border-white/5 flex items-center justify-between group transition-all">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center transition-all overflow-hidden border border-white/10",
            selectedPatient ? "bg-blue-600/20 border-blue-500/30 shadow-lg shadow-blue-900/40" : "bg-slate-800 text-slate-500"
          )}>
            {selectedPatient ? (
              <img 
                src={selectedPatient.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedPatient.id}`} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <User size={18} />
            )}
          </div>
          <div>
            <p className={cn(
              "text-xs font-black leading-tight tracking-tight transition-colors",
              selectedPatient ? "text-white" : "text-slate-500"
            )}>
              {selectedPatient ? selectedPatient.nome_completo : 'Vincular Paciente'}
            </p>
            <p className="text-[8px] text-slate-500 uppercase tracking-widest font-black mt-0.5">
              {selectedPatient ? 'Prontuário Identificado' : 'Obrigatório para salvar'}
            </p>
          </div>
        </div>
        <button 
          onClick={() => setShowPatientSelector(true)}
          className={cn(
            "px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all border shadow-sm",
            selectedPatient 
              ? "bg-white/5 text-slate-400 hover:bg-white/10 border-white/5" 
              : "bg-blue-600 text-white hover:bg-blue-700 border-blue-500 shadow-blue-900/20 animate-pulse hover:animate-none"
          )}
        >
          {selectedPatient ? 'Trocar' : 'Atribuir'}
        </button>
      </div>

      <AnimatePresence>
        {historySummary && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-blue-500/10 p-3 rounded-xl border border-blue-500/20 space-y-1.5 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-1.5">
              <button onClick={() => setHistorySummary(null)} className="text-blue-400 hover:text-blue-300">
                <CheckCircle2 size={14} />
              </button>
            </div>
            <h4 className="text-[8px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles size={10} />
              Resumo Clínico IA
            </h4>
            <p className="text-[10px] text-blue-100 font-medium leading-relaxed italic">
              "{historySummary}"
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-2">
        <label className="block text-[8px] font-black text-slate-500 uppercase tracking-wider ml-1">Relato do Atendimento</label>
        <textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="Ex: Paciente relata melhora na dor lombar..."
          className="w-full h-24 p-3 bg-white/5 border border-white/5 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-[11px] text-white font-medium resize-none"
        />
        <button
          onClick={handleProcess}
          disabled={isProcessing || !rawText.trim()}
          className="w-full h-9 bg-[#0047AB] text-white rounded-xl font-black text-[11px] hover:bg-blue-700 transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isProcessing ? (
            <>
              <Loader2 className="animate-spin" size={14} />
              Processando...
            </>
          ) : (
            <>
              <Sparkles size={14} />
              Estruturar com IA
            </>
          )}
        </button>
      </div>

      <AnimatePresence>
        {soapData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="space-y-3 pt-3 border-t border-white/5"
          >
            <div className="grid grid-cols-1 gap-2">
              {[
                { label: 'S - Subjetivo', key: 'subjective', color: 'bg-amber-500/10 text-amber-200 border-amber-500/20' },
                { label: 'O - Objetivo', key: 'objective', color: 'bg-blue-500/10 text-blue-200 border-blue-500/20' },
                { label: 'A - Avaliação', key: 'assessment', color: 'bg-emerald-500/10 text-emerald-200 border-emerald-500/20' },
                { label: 'P - Plano', key: 'plan', color: 'bg-purple-500/10 text-purple-200 border-purple-500/20' },
              ].map((section) => (
                <div key={section.key} className={cn("p-3 rounded-xl border space-y-1", section.color)}>
                  <h4 className="font-black text-[9px] uppercase tracking-widest">{section.label}</h4>
                  <p className="text-[10px] font-medium leading-relaxed">
                    {(soapData as any)[section.key]}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setSoapData(null)}
                className="flex-1 h-10 bg-white/5 text-slate-400 rounded-xl font-black text-[10px] hover:bg-white/10 transition-all"
              >
                Descartar
              </button>
              <button
                onClick={() => handleSave()}
                disabled={isSaving}
                className="flex-[2] h-10 bg-emerald-600 text-white rounded-xl font-black text-xs hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <Save size={16} />
                )}
                {isSaving ? 'Salvando...' : 'Salvar Prontuário'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Patient Selection Modal */}
      <AnimatePresence>
        {showPatientSelector && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPatientSelector(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl space-y-6"
            >
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <User className="text-blue-400" size={32} />
                </div>
                <h3 className="text-xl font-black text-white">Atribuir Paciente</h3>
                <p className="text-xs text-slate-400 font-medium">
                  Selecione o paciente para vincular este prontuário gerado pela IA.
                </p>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                  <input
                    type="text"
                    value={patientSearch}
                    onChange={(e) => {
                      setPatientSearch(e.target.value);
                      searchPatients(e.target.value);
                    }}
                    placeholder="Nome ou e-mail do paciente..."
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white font-medium outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                  {searching ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="animate-spin text-blue-500" size={24} />
                    </div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => handleSelectPatientAndSave(p)}
                        className="w-full flex items-center gap-3 p-3 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 hover:border-blue-500/30 transition-all group lg:text-left"
                      >
                        <img
                          src={p.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.id}`}
                          alt={p.nome_completo}
                          className="w-10 h-10 rounded-lg object-cover border border-white/10"
                        />
                        <div className="text-left">
                          <p className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
                            {p.nome_completo}
                          </p>
                          <p className="text-[10px] text-slate-500">{p.email}</p>
                        </div>
                        <CheckCircle2 className="ml-auto text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" size={16} />
                      </button>
                    ))
                  ) : patientSearch.length >= 2 ? (
                    <div className="text-center py-8 space-y-2">
                      <AlertCircle className="mx-auto text-slate-500" size={24} />
                      <p className="text-xs text-slate-500 font-medium">Nenhum paciente encontrado.</p>
                    </div>
                  ) : (
                    <div className="text-center py-8 space-y-2 opacity-50">
                      <FileSearch className="mx-auto text-slate-500" size={24} />
                      <p className="text-xs text-slate-500 font-medium italic">Digite para buscar...</p>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => setShowPatientSelector(false)}
                className="w-full py-3 text-slate-500 font-black text-[10px] uppercase tracking-widest hover:text-white transition-colors pt-2"
              >
                Cancelar
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
