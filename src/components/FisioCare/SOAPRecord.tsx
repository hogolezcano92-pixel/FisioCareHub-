import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Activity,
  AlertCircle,
  BrainCircuit,
  Check,
  CheckCircle2,
  ClipboardList,
  FileSearch,
  Loader2,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  User,
  Wand2,
  X,
} from 'lucide-react';
import { generateSOAPRecord, summarizePatientHistory } from '../../lib/groq';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { generateIntegrityHash } from '../../lib/security';
import { logActivity } from '../../services/activityService';

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

const quickPrompts = [
  {
    label: 'Dor / evolução',
    text: 'Paciente relata evolução da dor, funcionalidade, adesão aos exercícios e resposta ao tratamento. ',
  },
  {
    label: 'Mobilidade',
    text: 'Avaliada mobilidade, amplitude de movimento, força, equilíbrio, padrão funcional e tolerância ao esforço. ',
  },
  {
    label: 'Conduta',
    text: 'Realizadas orientações, exercícios terapêuticos, progressão de carga e plano de acompanhamento. ',
  },
];

const soapSections = [
  {
    label: 'S - Subjetivo',
    key: 'subjective',
    description: 'Relato, queixas e percepção do paciente.',
    icon: ClipboardList,
    color: 'border-amber-400/20 bg-amber-400/10 text-amber-100',
    iconColor: 'text-amber-300',
  },
  {
    label: 'O - Objetivo',
    key: 'objective',
    description: 'Achados, testes, sinais e observações clínicas.',
    icon: Activity,
    color: 'border-blue-400/20 bg-blue-400/10 text-blue-100',
    iconColor: 'text-blue-300',
  },
  {
    label: 'A - Avaliação',
    key: 'assessment',
    description: 'Interpretação fisioterapêutica da evolução.',
    icon: BrainCircuit,
    color: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-100',
    iconColor: 'text-emerald-300',
  },
  {
    label: 'P - Plano',
    key: 'plan',
    description: 'Conduta, orientações e próximos passos.',
    icon: Stethoscope,
    color: 'border-purple-400/20 bg-purple-400/10 text-purple-100',
    iconColor: 'text-purple-300',
  },
];

export const SOAPIntelligentRecord = ({ pacienteId, onSave }: SOAPIntelligentRecordProps) => {
  const { profile } = useAuth();
  const [rawText, setRawText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [soapData, setSoapData] = useState<SOAPData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [historySummary, setHistorySummary] = useState<string | null>(null);
  const [savedHash, setSavedHash] = useState<string | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);

  const [showPatientSelector, setShowPatientSelector] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const textQuality = useMemo(() => {
    const size = rawText.trim().length;
    if (size >= 260) return { label: 'Relato completo', color: 'text-emerald-300', progress: 'w-full' };
    if (size >= 120) return { label: 'Bom para estruturar', color: 'text-cyan-300', progress: 'w-2/3' };
    if (size > 0) return { label: 'Adicione mais detalhes', color: 'text-amber-300', progress: 'w-1/3' };
    return { label: 'Aguardando relato', color: 'text-slate-400', progress: 'w-0' };
  }, [rawText]);

  useEffect(() => {
    if (pacienteId) {
      fetchPatientDetails(pacienteId);
    } else {
      setSelectedPatient(null);
    }
  }, [pacienteId]);

  const fetchPatientDetails = async (id: string) => {
    try {
      const { data: patient } = await supabase
        .from('pacientes')
        .select('id, nome_completo, foto_url, email')
        .eq('id', id)
        .maybeSingle();

      if (patient) {
        setSelectedPatient({
          id: patient.id,
          nome_completo: patient.nome_completo,
          avatar_url: patient.foto_url,
          email: patient.email,
        });
        return;
      }

      const { data: profileData, error: profError } = await supabase
        .from('perfis')
        .select('id, nome_completo, avatar_url, foto_url, email')
        .eq('id', id)
        .maybeSingle();

      if (profError) throw profError;
      setSelectedPatient(profileData || null);
    } catch (err) {
      console.error('Erro ao carregar detalhes do paciente:', err);
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
        .limit(8);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (err) {
      console.error('Erro ao buscar pacientes:', err);
      toast.error('Erro ao buscar pacientes.');
    } finally {
      setSearching(false);
    }
  };

  const appendPrompt = (text: string) => {
    setRawText((current) => {
      const prefix = current.trim() ? `${current.trim()} ` : '';
      return `${prefix}${text}`;
    });
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

      const historyText = records.map((r) => JSON.stringify(r.conteudo)).join('\n');
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
      toast.error('Insira o relato do atendimento para estruturar o SOAP.');
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
    const finalPacienteId = forcedPatientId || pacienteId || selectedPatient?.id;

    if (!soapData || !profile) return;

    if (!finalPacienteId) {
      setShowPatientSelector(true);
      return;
    }

    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const contentStr = JSON.stringify(soapData);

      const integrityHash = await generateIntegrityHash(
        finalPacienteId,
        profile.id,
        now,
        contentStr,
      );

      const soapPayload = {
        patient_id: finalPacienteId,
        therapist_id: profile.id,
        subjective: typeof soapData.subjective === 'string' ? soapData.subjective : JSON.stringify(soapData.subjective),
        objective: typeof soapData.objective === 'string' ? soapData.objective : JSON.stringify(soapData.objective),
        assessment: typeof soapData.assessment === 'string' ? soapData.assessment : JSON.stringify(soapData.assessment),
        plan: typeof soapData.plan === 'string' ? soapData.plan : JSON.stringify(soapData.plan),
        raw_text: rawText,
        created_at: now,
        integrity_hash: integrityHash,
      };

      const prontuarioPayload = {
        paciente_id: finalPacienteId,
        fisio_id: profile.id,
        data_registro: now,
        tipo_atendimento: 'SOAP',
        evolucao: soapPayload.assessment,
        conteudo: {
          type: 'SOAP',
          subjective: soapPayload.subjective,
          objective: soapPayload.objective,
          assessment: soapPayload.assessment,
          plan: soapPayload.plan,
          raw: rawText,
        },
        integrity_hash: integrityHash,
      };

      const { error: soapError } = await supabase.from('soap_notes').insert(soapPayload);
      if (soapError) console.warn('[SOAPRecord] Erro ao salvar em soap_notes:', soapError);

      const { error: prontuarioError } = await supabase.from('prontuarios').insert(prontuarioPayload);
      if (prontuarioError) console.warn('[SOAPRecord] Erro ao salvar em prontuarios:', prontuarioError);

      if (soapError && prontuarioError) {
        const message = prontuarioError.message || soapError.message || 'Erro ao salvar prontuário.';
        throw new Error(message);
      }

      toast.success('Prontuário salvo com segurança jurídica!');
      setSavedHash(integrityHash);
      setIsReadOnly(true);

      if (onSave) onSave();

      logActivity(
        profile.id,
        'fisio',
        'prontuario_criado',
        `Prontuário SOAP criado para o paciente ${finalPacienteId}`,
        finalPacienteId,
        { metadata: { targetType: 'paciente', integrityHash } },
      );
    } catch (error: any) {
      console.error('[SOAPRecord] Erro ao salvar prontuário:', error);
      toast.error(error?.message || 'Erro ao salvar prontuário.');
    } finally {
      setIsSaving(false);
      setShowPatientSelector(false);
    }
  };

  const handleNewRecord = () => {
    setSoapData(null);
    setRawText('');
    setIsReadOnly(false);
    setSavedHash(null);
    setHistorySummary(null);
  };

  return (
    <div className="relative w-full overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/70 p-4 shadow-2xl shadow-blue-950/30 backdrop-blur-xl sm:p-5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.22),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.16),transparent_34%)]" />
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-blue-300/60 to-transparent" />

      <div className="relative space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-blue-300/20 bg-blue-500/10 shadow-lg shadow-blue-900/30">
                <BrainCircuit className="text-blue-300" size={21} />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-black tracking-tight text-white sm:text-xl">Prontuário SOAP</h3>
                <p className="text-[11px] font-semibold text-slate-400">IA organiza o relato em evolução clínica.</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="rounded-full border border-blue-300/10 bg-blue-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.22em] text-blue-300">
              Profissional
            </div>
            {pacienteId && (
              <button
                onClick={handleSummarize}
                disabled={isSummarizing}
                className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-blue-300 transition hover:bg-white/10 disabled:opacity-60"
              >
                {isSummarizing ? <Loader2 className="animate-spin" size={10} /> : <FileSearch size={10} />}
                Histórico
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-1.5 rounded-2xl border border-white/10 bg-white/[0.04] p-1.5">
          {soapSections.map((section) => {
            const Icon = section.icon;
            return (
              <div key={section.key} className="rounded-xl bg-slate-950/30 px-2 py-2 text-center">
                <Icon className={cn('mx-auto mb-1', section.iconColor)} size={14} />
                <p className="text-[8px] font-black uppercase tracking-widest text-slate-300">{section.label.charAt(0)}</p>
              </div>
            );
          })}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div
                className={cn(
                  'flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 transition-all',
                  selectedPatient ? 'bg-blue-600/20 shadow-lg shadow-blue-900/30' : 'bg-slate-800/80 text-slate-500',
                )}
              >
                {selectedPatient ? (
                  <img
                    src={selectedPatient.avatar_url || selectedPatient.foto_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedPatient.id}`}
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <User size={21} />
                )}
              </div>
              <div className="min-w-0">
                <p className={cn('truncate text-sm font-black leading-tight', selectedPatient ? 'text-white' : 'text-slate-400')}>
                  {selectedPatient ? selectedPatient.nome_completo || selectedPatient.nome : 'Vincular Paciente'}
                </p>
                <p className="mt-1 text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
                  {selectedPatient ? 'Prontuário identificado' : 'Obrigatório para salvar'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowPatientSelector(true)}
              className={cn(
                'shrink-0 rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all',
                selectedPatient
                  ? 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                  : 'border-blue-400/40 bg-blue-600 text-white shadow-lg shadow-blue-900/30 hover:bg-blue-500',
              )}
            >
              {selectedPatient ? 'Trocar' : 'Atribuir'}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {historySummary && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="relative overflow-hidden rounded-2xl border border-blue-400/20 bg-blue-500/10 p-4"
            >
              <button onClick={() => setHistorySummary(null)} className="absolute right-3 top-3 text-blue-200/70 hover:text-white">
                <X size={14} />
              </button>
              <h4 className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-300">
                <Sparkles size={13} />
                Resumo Clínico IA
              </h4>
              <p className="pr-5 text-xs font-medium leading-relaxed text-blue-50/90">{historySummary}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 px-1">
            <label className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Relato do atendimento</label>
            <span className={cn('text-[10px] font-bold', textQuality.color)}>{textQuality.label}</span>
          </div>

          {!isReadOnly && (
            <div className="flex flex-wrap gap-2">
              {quickPrompts.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => appendPrompt(item.text)}
                  className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[10px] font-bold text-slate-200 transition hover:border-blue-300/30 hover:bg-blue-500/10 hover:text-blue-100"
                >
                  + {item.label}
                </button>
              ))}
            </div>
          )}

          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 transition-within:border-blue-400/40 focus-within:ring-4 focus-within:ring-blue-500/10">
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              disabled={isReadOnly}
              placeholder="Ex: Paciente relata melhora da dor lombar, realizou exercícios, apresentou ganho de mobilidade e recebeu orientação para progressão domiciliar..."
              className={cn(
                'min-h-[132px] w-full resize-none bg-transparent p-4 text-sm font-medium leading-relaxed text-white outline-none placeholder:text-slate-500 sm:min-h-[150px]',
                isReadOnly && 'cursor-not-allowed opacity-60',
              )}
            />
            <div className="flex items-center justify-between border-t border-white/5 bg-white/[0.03] px-4 py-2">
              <div className="h-1.5 w-28 overflow-hidden rounded-full bg-slate-800">
                <div className={cn('h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-300 transition-all', textQuality.progress)} />
              </div>
              <span className="text-[10px] font-semibold text-slate-500">{rawText.trim().length} caracteres</span>
            </div>
          </div>

          {!isReadOnly && (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
              <button
                onClick={handleProcess}
                disabled={isProcessing || !rawText.trim()}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-700 to-blue-500 text-sm font-black text-white shadow-lg shadow-blue-950/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isProcessing ? <Loader2 className="animate-spin" size={17} /> : <Wand2 size={17} />}
                {isProcessing ? 'Estruturando...' : 'Estruturar SOAP com IA'}
              </button>
              {rawText && (
                <button
                  onClick={() => {
                    setRawText('');
                    setSoapData(null);
                  }}
                  className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-xs font-black uppercase tracking-widest text-slate-300 transition hover:bg-white/10"
                >
                  Limpar
                </button>
              )}
            </div>
          )}
        </div>

        <AnimatePresence>
          {soapData && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              className="space-y-4 border-t border-white/10 pt-4"
            >
              <div className="flex items-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3">
                <CheckCircle2 className="text-emerald-300" size={18} />
                <div>
                  <p className="text-sm font-black text-white">SOAP estruturado</p>
                  <p className="text-[10px] font-medium text-emerald-100/80">Revise antes de salvar no prontuário.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {soapSections.map((section) => {
                  const Icon = section.icon;
                  const value = (soapData as any)[section.key];
                  return (
                    <div key={section.key} className={cn('rounded-2xl border p-4', section.color)}>
                      <div className="mb-2 flex items-start gap-2">
                        <Icon className={cn('mt-0.5 shrink-0', section.iconColor)} size={16} />
                        <div>
                          <h4 className="text-[10px] font-black uppercase tracking-widest">{section.label}</h4>
                          <p className="text-[10px] opacity-75">{section.description}</p>
                        </div>
                      </div>
                      <p className="text-xs font-medium leading-relaxed">
                        {typeof value === 'object' ? JSON.stringify(value) : value || 'Não informado.'}
                      </p>
                    </div>
                  );
                })}
              </div>

              {isReadOnly ? (
                <div className="space-y-3">
                  <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <ShieldCheck className="text-emerald-300" size={16} />
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-200">Documento salvo com integridade</span>
                    </div>
                    <p className="break-all font-mono text-[9px] leading-relaxed text-emerald-100/70">INTEGRITY_HASH: {savedHash}</p>
                  </div>
                  <button
                    onClick={handleNewRecord}
                    className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 text-xs font-black uppercase tracking-widest text-blue-300 transition hover:bg-white/10"
                  >
                    Criar Nova Evolução
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[0.7fr_1.3fr]">
                  <button
                    onClick={() => setSoapData(null)}
                    className="h-12 rounded-2xl border border-white/10 bg-white/5 text-xs font-black uppercase tracking-widest text-slate-300 transition hover:bg-white/10"
                  >
                    Descartar
                  </button>
                  <button
                    onClick={() => handleSave()}
                    disabled={isSaving}
                    className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-sm font-black text-white shadow-lg shadow-emerald-950/20 transition hover:bg-emerald-500 disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />}
                    {isSaving ? 'Salvando...' : 'Salvar Prontuário'}
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

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
              className="relative w-full max-w-md space-y-6 rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl"
            >
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10">
                  <User className="text-blue-300" size={32} />
                </div>
                <h3 className="text-xl font-black text-white">Atribuir Paciente</h3>
                <p className="mt-2 text-xs font-medium text-slate-400">Selecione o paciente para vincular este prontuário.</p>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 z-20 -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    type="text"
                    value={patientSearch}
                    onChange={(e) => {
                      setPatientSearch(e.target.value);
                      searchPatients(e.target.value);
                    }}
                    placeholder="Nome ou e-mail do paciente..."
                    className="w-full rounded-2xl border border-white/10 bg-white/5 py-4 pl-12 pr-4 text-sm font-medium text-white outline-none transition-all placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>

                <div className="custom-scrollbar max-h-60 space-y-2 overflow-y-auto pr-1">
                  {searching ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="animate-spin text-blue-500" size={24} />
                    </div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => handleSelectPatientAndSave(p)}
                        className="group flex w-full items-center gap-3 rounded-xl border border-white/5 bg-white/5 p-3 text-left transition-all hover:border-blue-500/30 hover:bg-white/10"
                      >
                        <img
                          src={p.foto_url || p.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.id}`}
                          alt={p.nome_completo}
                          className="h-10 w-10 rounded-lg border border-white/10 object-cover"
                        />
                        <div className="min-w-0 flex-1 text-left">
                          <p className="truncate text-sm font-bold text-white transition-colors group-hover:text-blue-300">{p.nome_completo}</p>
                          <p className="truncate text-[10px] text-slate-500">{p.email || 'Sem e-mail'}</p>
                        </div>
                        <Check className="text-emerald-400 opacity-0 transition-opacity group-hover:opacity-100" size={16} />
                      </button>
                    ))
                  ) : patientSearch.length >= 2 ? (
                    <div className="space-y-2 py-8 text-center">
                      <AlertCircle className="mx-auto text-slate-500" size={24} />
                      <p className="text-xs font-medium text-slate-500">Nenhum paciente encontrado.</p>
                    </div>
                  ) : (
                    <div className="space-y-2 py-8 text-center opacity-50">
                      <FileSearch className="mx-auto text-slate-500" size={24} />
                      <p className="text-xs font-medium italic text-slate-500">Digite para buscar...</p>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => setShowPatientSelector(false)}
                className="w-full py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 transition-colors hover:text-white"
              >
                Cancelar
              </button>
            </motion.div>
          </div>
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
};
