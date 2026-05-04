import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { BrainCircuit, Save, Sparkles, Loader2, CheckCircle2, AlertCircle, User, FileSearch, Check, Search, Mic, MicOff, Waves } from 'lucide-react';
import { generateSOAPRecord, summarizePatientHistory } from '../../lib/groq';
import { kineAIService } from '../../services/kineAI';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

import { generateIntegrityHash } from '../../lib/security';

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

// Extend Window interface for SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export const SOAPIntelligentRecord = ({ pacienteId, onSave }: SOAPIntelligentRecordProps) => {
  const { profile } = useAuth();
  const [rawText, setRawText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVoiceProcessing, setIsVoiceProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [soapData, setSoapData] = useState<SOAPData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [historySummary, setHistorySummary] = useState<string | null>(null);
  const [savedHash, setSavedHash] = useState<string | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(false);

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
      // First try pacientes table
      const { data: patient, error: pError } = await supabase
        .from('pacientes')
        .select('id, nome_completo, foto_url, email')
        .eq('id', id)
        .maybeSingle();

      if (patient) {
        setSelectedPatient({
          id: patient.id,
          nome_completo: patient.nome_completo,
          avatar_url: patient.foto_url,
          email: patient.email
        });
        return;
      }

      // Fallback to perfis
      const { data: profileData, error: profError } = await supabase
        .from('perfis')
        .select('id, nome_completo, avatar_url, email')
        .eq('id', id)
        .single();
      if (profError) throw profError;
      setSelectedPatient(profileData);
    } catch (err) {
      console.error("Erro ao carregar detalhes do paciente:", err);
    }
  };

  // Patient selection states
  const [showPatientSelector, setShowPatientSelector] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = 'pt-BR';

      recognitionInstance.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setRawText(transcript);
      };

      recognitionInstance.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        toast.error('Erro na captura de voz. Tente novamente.');
      };

      recognitionInstance.onend = () => {
        setIsRecording(false);
      };

      setRecognition(recognitionInstance);
    }
  }, []);

  const toggleRecording = () => {
    if (isRecording) {
      recognition?.stop();
      // Wait a bit for the last result to be set before processing
      setTimeout(() => {
        processVoiceToSOAP();
      }, 500);
    } else {
      if (!recognition) {
        toast.error('Seu navegador não suporta reconhecimento de voz.');
        return;
      }
      setRawText('');
      recognition.start();
      setIsRecording(true);
      toast.info('Gravando áudio...');
    }
  };

  const processVoiceToSOAP = async () => {
    if (!rawText.trim()) return;
    
    setIsVoiceProcessing(true);
    try {
      const result = await kineAIService.processClinicalVoice(rawText);
      setSoapData(result);
      toast.success('Prontuário estruturado com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao estruturar prontuário. Tente novamente.');
    } finally {
      setIsVoiceProcessing(false);
    }
  };

  const searchPatients = async (query: string) => {
    if (query.length < 2 || !profile) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('pacientes')
        .select('*')
        .eq('fisioterapeuta_id', profile.id)
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
      const now = new Date().toISOString();
      const contentStr = JSON.stringify(soapData);
      
      // Generate integrity hash for legal security
      const integrityHash = await generateIntegrityHash(
        finalPacienteId,
        profile.id,
        now,
        contentStr
      );

      // First try to save to soap_notes as requested
      const { error } = await supabase
        .from('soap_notes')
        .insert({
          patient_id: finalPacienteId,
          therapist_id: profile.id,
          subjective: typeof soapData.subjective === 'string' ? soapData.subjective : JSON.stringify(soapData.subjective),
          objective: typeof soapData.objective === 'string' ? soapData.objective : JSON.stringify(soapData.objective),
          assessment: typeof soapData.assessment === 'string' ? soapData.assessment : JSON.stringify(soapData.assessment),
          plan: typeof soapData.plan === 'string' ? soapData.plan : JSON.stringify(soapData.plan),
          created_at: now,
          integrity_hash: integrityHash
        });

      if (error) {
        // Fallback to prontuarios if soap_notes doesn't exist
        console.warn("soap_notes table not found, falling back to prontuarios table");
        const { error: fallbackError } = await supabase
          .from('prontuarios')
          .insert({
            paciente_id: finalPacienteId,
            fisio_id: profile.id,
            data_registro: now,
            conteudo: {
              type: 'SOAP',
              ...soapData,
              raw: rawText
            },
            integrity_hash: integrityHash
          });
        
        if (fallbackError) throw fallbackError;
      }

      toast.success('Prontuário salvo com segurança jurídica!');
      setSavedHash(integrityHash);
      setIsReadOnly(true);
      
      if (onSave) onSave();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar prontuário.');
    } finally {
      setIsSaving(false);
      setShowPatientSelector(false);
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
        <div className="flex items-center gap-2">
          {!isReadOnly && (
            <button
              onClick={toggleRecording}
              className={cn(
                "relative group flex items-center justify-center w-10 h-10 rounded-xl transition-all shadow-lg",
                isRecording 
                  ? "bg-rose-500 text-white shadow-rose-900/40 ring-4 ring-rose-500/20" 
                  : "bg-blue-600 text-white shadow-blue-900/40 hover:bg-blue-700"
              )}
            >
              {isRecording && (
                <motion.div
                  animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="absolute inset-0 bg-rose-500 rounded-xl"
                />
              )}
              {isRecording ? <MicOff size={20} className="relative z-10" /> : <Mic size={20} className="relative z-10" />}
            </button>
          )}
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
      </div>

      {/* Voice Processing Visualizer */}
      <AnimatePresence>
        {isRecording && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-3 bg-gradient-to-r from-cyan-500/10 to-blue-600/10 border border-cyan-500/20 rounded-xl flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="flex gap-1 items-center">
                {[...Array(4)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ height: [8, 16, 8] }}
                    transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.1 }}
                    className="w-1 bg-cyan-400 rounded-full"
                  />
                ))}
              </div>
              <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">Gravando Áudio em Tempo Real...</span>
            </div>
            <button 
              onClick={toggleRecording}
              className="px-3 py-1 bg-rose-500 text-white rounded-lg text-[8px] font-black uppercase tracking-tighter shadow-md"
            >
              Parar e Processar
            </button>
          </motion.div>
        )}

        {isVoiceProcessing && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="p-4 bg-slate-900/90 backdrop-blur-md border border-blue-500/30 rounded-2xl flex flex-col items-center justify-center gap-3 text-center"
          >
            <div className="relative">
              <Loader2 className="animate-spin text-blue-500" size={32} />
              <Waves className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-cyan-400/50" size={16} />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-black text-white">KineAI está estruturando seu prontuário...</h4>
              <p className="text-[10px] text-slate-400 font-medium italic">Analisando relato clínico para gerar modelo SOAP</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Patient Context Header */}
      <div className="bg-white/5 p-3 rounded-xl border border-white/5 flex items-center justify-between group transition-all">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center transition-all overflow-hidden border border-white/10",
            selectedPatient ? "bg-blue-600/20 border-blue-500/30 shadow-lg shadow-blue-900/40" : "bg-slate-800 text-slate-500"
          )}>
              {selectedPatient ? (
                <img 
                  src={selectedPatient.avatar_url || selectedPatient.foto_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedPatient.id}`} 
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
                {selectedPatient ? (selectedPatient.nome_completo || selectedPatient.nome) : 'Vincular Paciente'}
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
          disabled={isReadOnly}
          placeholder="Ex: Paciente relata melhora na dor lombar..."
          className={cn(
            "w-full h-24 p-3 bg-white/5 border border-white/5 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-[11px] text-white font-medium resize-none",
            isReadOnly && "opacity-50 cursor-not-allowed"
          )}
        />
        {!isReadOnly && (
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
        )}
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
                    {typeof (soapData as any)[section.key] === 'object' 
                      ? JSON.stringify((soapData as any)[section.key])
                      : (soapData as any)[section.key]}
                  </p>
                </div>
              ))}
            </div>

            {isReadOnly ? (
              <div className="space-y-3">
                <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="text-emerald-500" size={12} />
                    <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Documento Assinado Digitalmente</span>
                  </div>
                  <p className="text-[8px] text-emerald-500/60 font-mono break-all leading-tight">
                    INTEGRITY_HASH: {savedHash}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSoapData(null);
                    setRawText('');
                    setIsReadOnly(false);
                    setSavedHash(null);
                  }}
                  className="w-full h-10 bg-white/5 text-blue-400 rounded-xl font-black text-[10px] hover:bg-white/10 transition-all uppercase tracking-widest"
                >
                  Criar Nova Evolução
                </button>
              </div>
            ) : (
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
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Patient Selection Modal */}
      {showPatientSelector && createPortal(
        <AnimatePresence mode="wait">
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPatientSelector(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
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
                  <Search 
                    className="absolute pointer-events-none z-20" 
                    style={{ left: '16px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', color: '#94a3b8' }}
                  />
                  <input
                    type="text"
                    value={patientSearch}
                    onChange={(e) => {
                      setPatientSearch(e.target.value);
                      searchPatients(e.target.value);
                    }}
                    placeholder="Nome ou e-mail do paciente..."
                    className="w-full pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white font-medium outline-none focus:ring-2 focus:ring-blue-500/30 transition-all placeholder:text-slate-600 shadow-inner !pl-[60px]"
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
                        className="w-full flex items-center gap-3 p-3 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 hover:border-blue-500/30 transition-all group text-left"
                      >
                        <img
                          src={p.foto_url || p.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.id}`}
                          alt={p.nome_completo}
                          className="w-10 h-10 rounded-lg object-cover border border-white/10"
                        />
                        <div className="text-left flex-1">
                          <p className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
                            {p.nome_completo}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate max-w-[200px]">{p.email || 'Sem e-mail'}</p>
                        </div>
                        <Check className="text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" size={16} />
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
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};
