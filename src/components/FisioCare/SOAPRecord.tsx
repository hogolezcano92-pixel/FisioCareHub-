import React, { useState } from 'react';
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

  const handleSave = async () => {
    if (!soapData || !profile) return;
    
    if (!pacienteId) {
      toast.error('Selecione um paciente para salvar o prontuário.');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('prontuarios')
        .insert({
          paciente_id: pacienteId,
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
                onClick={handleSave}
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
    </div>
  );
};
