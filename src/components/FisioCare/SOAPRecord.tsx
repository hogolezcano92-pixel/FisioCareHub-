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
    <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <BrainCircuit className="text-blue-600" size={32} />
            Prontuário Inteligente (SOAP)
          </h3>
          <p className="text-slate-500 font-medium">Insira o relato bruto e deixe a IA estruturar para você.</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="px-4 py-2 bg-blue-50 text-blue-600 rounded-full text-xs font-black uppercase tracking-widest">
            Padrão Profissional
          </div>
          {pacienteId && (
            <button
              onClick={handleSummarize}
              disabled={isSummarizing}
              className="flex items-center gap-2 text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest"
            >
              {isSummarizing ? <Loader2 className="animate-spin" size={12} /> : <FileSearch size={12} />}
              Resumir Histórico IA
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
            className="bg-sky-50 p-6 rounded-[2rem] border border-sky-100 space-y-3 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4">
              <button onClick={() => setHistorySummary(null)} className="text-sky-400 hover:text-sky-600">
                <CheckCircle2 size={20} />
              </button>
            </div>
            <h4 className="text-xs font-black text-sky-600 uppercase tracking-widest flex items-center gap-2">
              <Sparkles size={14} />
              Resumo Clínico IA
            </h4>
            <p className="text-sm text-sky-800 font-medium leading-relaxed italic">
              "{historySummary}"
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-4">
        <label className="block text-sm font-black text-slate-700 uppercase tracking-wider">Relato do Atendimento</label>
        <textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="Ex: Paciente relata melhora na dor lombar (EVA 3), realizou exercícios de fortalecimento de core e alongamento. Apresentou boa amplitude de movimento..."
          className="w-full h-40 p-6 bg-slate-50 border border-slate-100 rounded-[2rem] outline-none focus:ring-4 focus:ring-blue-100 transition-all text-slate-700 font-medium resize-none"
        />
        <button
          onClick={handleProcess}
          disabled={isProcessing || !rawText.trim()}
          className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-3 disabled:opacity-50"
        >
          {isProcessing ? (
            <>
              <Loader2 className="animate-spin" size={24} />
              Processando IA...
            </>
          ) : (
            <>
              <Sparkles size={24} />
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
            className="space-y-6 pt-6 border-t border-slate-100"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { label: 'S - Subjetivo', key: 'subjective', color: 'bg-amber-50 text-amber-700 border-amber-100' },
                { label: 'O - Objetivo', key: 'objective', color: 'bg-blue-50 text-blue-700 border-blue-100' },
                { label: 'A - Avaliação', key: 'assessment', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
                { label: 'P - Plano', key: 'plan', color: 'bg-purple-50 text-purple-700 border-purple-100' },
              ].map((section) => (
                <div key={section.key} className={cn("p-6 rounded-[2rem] border space-y-3", section.color)}>
                  <h4 className="font-black text-sm uppercase tracking-widest">{section.label}</h4>
                  <p className="text-sm font-medium leading-relaxed">
                    {(soapData as any)[section.key]}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setSoapData(null)}
                className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black hover:bg-slate-200 transition-all"
              >
                Descartar
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl font-black text-lg hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 className="animate-spin" size={24} />
                ) : (
                  <Save size={24} />
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
