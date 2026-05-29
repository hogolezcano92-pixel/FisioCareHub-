import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import imageCompression from 'browser-image-compression';
import {
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  Loader2,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

type ExamRecord = {
  id: string;
  patient_name: string | null;
  exam_type: string | null;
  file_name: string | null;
  file_type: string | null;
  file_url: string | null;
  ai_summary: string | null;
  ai_findings: string[] | null;
  ai_attention_points: string[] | null;
  ai_patient_explanation: string | null;
  ai_professional_notes: string | null;
  ai_alerts: string[] | null;
  ai_limitations: string | null;
  ai_confidence: string | null;
  created_at: string;
};

type AiResult = {
  resumo: string;
  achados_principais: string[];
  pontos_atencao: string[];
  explicacao_paciente: string;
  orientacao_profissional: string;
  sinais_alerta: string[];
  limitacoes: string;
  confianca: string;
};

const EXAM_TYPES = [
  'Raio-X',
  'Ressonância magnética',
  'Tomografia',
  'Ultrassom',
  'Eletromiografia',
  'Exame laboratorial',
  'Laudo médico',
  'Outro exame',
];

const MAX_IMAGE_AI_SIZE = 3 * 1024 * 1024;

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const sanitizeFileName = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 140);

const ListBlock = ({ title, items, tone = 'blue' }: { title: string; items?: string[] | null; tone?: 'blue' | 'amber' | 'rose' }) => {
  const normalized = Array.isArray(items) ? items.filter(Boolean) : [];
  if (normalized.length === 0) return null;

  return (
    <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5">
      <h3 className={cn(
        'mb-4 text-xs font-black uppercase tracking-[0.22em]',
        tone === 'amber' ? 'text-amber-300' : tone === 'rose' ? 'text-rose-300' : 'text-sky-300'
      )}>
        {title}
      </h3>
      <div className="space-y-3">
        {normalized.map((item, index) => (
          <div key={`${title}-${index}`} className="flex gap-3 rounded-2xl bg-slate-950/45 p-3 text-sm font-semibold leading-relaxed text-slate-200">
            <CheckCircle2 className={cn('mt-0.5 shrink-0', tone === 'amber' ? 'text-amber-300' : tone === 'rose' ? 'text-rose-300' : 'text-emerald-300')} size={17} />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function ExamAnalysis() {
  const { user, profile } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [examType, setExamType] = useState(EXAM_TYPES[0]);
  const [patientName, setPatientName] = useState(profile?.tipo_usuario === 'paciente' ? profile?.nome_completo || '' : '');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AiResult | null>(null);
  const [records, setRecords] = useState<ExamRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(true);

  const isImage = useMemo(() => Boolean(file?.type?.startsWith('image/')), [file]);
  const isPdf = useMemo(() => file?.type === 'application/pdf', [file]);

  useEffect(() => {
    if (profile?.tipo_usuario === 'paciente' && profile?.nome_completo && !patientName) {
      setPatientName(profile.nome_completo);
    }
  }, [patientName, profile]);

  const fetchRecords = async () => {
    if (!user) return;
    setLoadingRecords(true);
    const { data, error } = await supabase
      .from('exam_analyses')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(12);

    if (error) {
      console.warn('[ExamAnalysis] Erro ao carregar análises:', error);
      setRecords([]);
    } else {
      setRecords((data || []) as ExamRecord[]);
    }
    setLoadingRecords(false);
  };

  useEffect(() => {
    void fetchRecords();
  }, [user?.id]);

  const uploadFile = async (selectedFile: File) => {
    if (!user) throw new Error('Usuário não autenticado.');

    const ext = selectedFile.name.split('.').pop()?.toLowerCase() || 'file';
    const safeName = sanitizeFileName(selectedFile.name.replace(/\.[^.]+$/, ''));
    const path = `${user.id}/${Date.now()}-${safeName}.${ext}`;

    const { error } = await supabase.storage
      .from('exam-files')
      .upload(path, selectedFile, {
        cacheControl: '3600',
        upsert: false,
        contentType: selectedFile.type || undefined,
      });

    if (error) throw error;

    return path;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return toast.error('Você precisa estar logado.');

    if (!file && !notes.trim()) {
      return toast.error('Envie um exame ou cole o texto do laudo.');
    }

    if (isPdf && !notes.trim()) {
      toast.info('Para PDF, cole também o texto do laudo em “Observações”. Assim a IA consegue interpretar melhor.');
    }

    if (file && file.size > 20 * 1024 * 1024) {
      return toast.error('Envie arquivos de até 20 MB nesta primeira versão.');
    }

    setSubmitting(true);
    setResult(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error('Sessão expirada. Faça login novamente.');

      let filePath = '';
      let imageDataUrl = '';

      if (file) {
        filePath = await uploadFile(file);
        if (file.type.startsWith('image/')) {
          const imageForAi = file.size > MAX_IMAGE_AI_SIZE
            ? await imageCompression(file, {
                maxSizeMB: 2.5,
                maxWidthOrHeight: 1600,
                useWebWorker: true,
                fileType: 'image/jpeg',
              })
            : file;

          imageDataUrl = await fileToDataUrl(imageForAi);
        }
      }

      const response = await fetch('/api/library/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'exam_analysis',
          accessToken,
          examText: notes,
          clinicalContext: notes,
          fileUrl: filePath,
          fileName: file?.name || 'Texto digitado',
          fileType: file?.type || 'text/plain',
          imageDataUrl,
          examType,
          patientName: patientName.trim() || profile?.nome_completo || 'Paciente não informado',
        }),
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Não foi possível analisar o exame.');

      const aiAnalysis = payload.analysis || {};
      const normalizedResult: AiResult = {
        resumo: aiAnalysis.resumo_executivo || '',
        achados_principais: aiAnalysis.principais_achados || [],
        pontos_atencao: aiAnalysis.pontos_para_fisioterapeuta_revisar || [],
        explicacao_paciente: aiAnalysis.explicacao_para_paciente || '',
        orientacao_profissional: [
          ...(aiAnalysis.pontos_para_fisioterapeuta_revisar || []),
          ...(aiAnalysis.possiveis_relacoes_funcionais || []),
          aiAnalysis.recomendacao_segura || '',
        ].filter(Boolean).join('\n\n'),
        sinais_alerta: aiAnalysis.sinais_de_alerta || [],
        limitacoes: Array.isArray(aiAnalysis.limitacoes) ? aiAnalysis.limitacoes.join(' ') : (aiAnalysis.limitacoes || ''),
        confianca: 'moderada',
      };

      setResult(normalizedResult);

      const { error: insertError } = await supabase
        .from('exam_analyses')
        .insert({
          uploaded_by: user.id,
          patient_name: patientName.trim() || profile?.nome_completo || null,
          exam_type: aiAnalysis.exam_type || examType,
          file_name: file?.name || 'Texto digitado',
          file_type: file?.type || 'text/plain',
          file_url: filePath || null,
          status: 'completed',
          ai_summary: normalizedResult.resumo,
          ai_findings: normalizedResult.achados_principais,
          ai_attention_points: normalizedResult.pontos_atencao,
          ai_patient_explanation: normalizedResult.explicacao_paciente,
          ai_professional_notes: normalizedResult.orientacao_profissional,
          ai_alerts: normalizedResult.sinais_alerta,
          ai_limitations: normalizedResult.limitacoes,
          ai_confidence: normalizedResult.confianca,
          ai_raw_response: payload,
        });

      if (insertError) {
        console.warn('[ExamAnalysis] Análise gerada, mas não foi possível salvar histórico:', insertError);
        toast.info('Análise gerada, mas o histórico não foi salvo. Verifique o SQL da tabela exam_analyses.');
      } else {
        await fetchRecords();
      }

      toast.success('Análise gerada com sucesso. Revise antes de usar clinicamente.');
      setFile(null);
      setNotes('');
    } catch (error: any) {
      console.error('[ExamAnalysis] Erro:', error);
      toast.error(error?.message || 'Erro ao analisar exame.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070B14] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(59,130,246,0.22),transparent_32%),radial-gradient(circle_at_85%_0%,rgba(124,58,237,0.18),transparent_30%)]" />
      <div className="relative mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/[0.055] p-6 shadow-2xl shadow-blue-950/20 backdrop-blur-2xl sm:p-8 lg:p-10"
        >
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-sky-200">
                <Sparkles size={14} /> IA Groq • Apoio clínico
              </div>
              <div>
                <h1 className="text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
                  Análise Inteligente de <span className="bg-gradient-to-r from-sky-300 via-blue-400 to-violet-300 bg-clip-text text-transparent">Exames</span>
                </h1>
                <p className="mt-4 max-w-2xl text-base font-semibold leading-8 text-slate-300 sm:text-lg">
                  Envie imagem, PDF ou texto de laudo para a IA organizar os achados, explicar em linguagem simples e destacar pontos para revisão profissional.
                </p>
              </div>
            </div>

            <div className="rounded-[2rem] border border-amber-300/20 bg-amber-500/10 p-5 text-sm font-semibold leading-relaxed text-amber-100 lg:max-w-sm">
              <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-amber-200">
                <AlertTriangle size={16} /> Aviso importante
              </div>
              A IA não substitui diagnóstico, laudo médico, avaliação fisioterapêutica ou conduta de profissional habilitado.
            </div>
          </div>
        </motion.div>

        <div className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr]">
          <motion.form
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            onSubmit={handleSubmit}
            className="space-y-5 rounded-[2.5rem] border border-white/10 bg-slate-950/65 p-5 shadow-2xl shadow-slate-950/30 backdrop-blur-2xl sm:p-6"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-200 ring-1 ring-blue-300/20">
                <UploadCloud size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black">Enviar exame</h2>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Imagem, PDF ou texto</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tipo de exame</span>
                <select
                  value={examType}
                  onChange={(e) => setExamType(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-[16px] font-bold text-white outline-none focus:border-blue-400/50 focus:ring-4 focus:ring-blue-500/10"
                >
                  {EXAM_TYPES.map((type) => <option key={type} value={type} className="bg-slate-950">{type}</option>)}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Paciente</span>
                <input
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="Nome do paciente"
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-[16px] font-bold text-white outline-none placeholder:text-slate-600 focus:border-blue-400/50 focus:ring-4 focus:ring-blue-500/10"
                />
              </label>
            </div>

            <label className="block cursor-pointer rounded-[2rem] border border-dashed border-sky-300/25 bg-sky-500/5 p-6 text-center transition hover:border-sky-300/45 hover:bg-sky-500/10">
              <input
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-sky-500/15 text-sky-200">
                {isImage ? <ImageIcon size={30} /> : <FileText size={30} />}
              </div>
              <p className="text-sm font-black text-white">{file ? file.name : 'Toque para enviar o exame'}</p>
              <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-500">PNG, JPG, WEBP ou PDF até 20 MB. Imagens leves são lidas visualmente pela IA; para arquivos maiores, cole o laudo nas observações.</p>
            </label>

            {file && (
              <button
                type="button"
                onClick={() => setFile(null)}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-300 hover:bg-white/10"
              >
                <X size={14} /> Remover arquivo
              </button>
            )}

            <label className="space-y-2 block">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Texto do laudo / observações</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={7}
                placeholder="Cole aqui o texto do laudo ou descreva o contexto clínico. Para PDF, isso melhora bastante a análise."
                className="w-full resize-none rounded-[1.5rem] border border-white/10 bg-white/[0.06] px-4 py-4 text-[16px] font-semibold leading-relaxed text-white outline-none placeholder:text-slate-600 focus:border-blue-400/50 focus:ring-4 focus:ring-blue-500/10"
              />
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-6 py-4 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-blue-950/30 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
            >
              {submitting ? <Loader2 className="animate-spin" size={18} /> : <BrainCircuit size={18} />}
              {submitting ? 'Analisando exame...' : 'Analisar com IA'}
            </button>
          </motion.form>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="space-y-5 rounded-[2.5rem] border border-white/10 bg-slate-950/65 p-5 shadow-2xl shadow-slate-950/30 backdrop-blur-2xl sm:p-6"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black">Resultado da IA</h2>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Resumo seguro para revisão</p>
              </div>
              <div className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-300">
                Revisão obrigatória
              </div>
            </div>

            {!result ? (
              <div className="flex min-h-[420px] flex-col items-center justify-center rounded-[2rem] border border-white/10 bg-white/[0.035] p-8 text-center">
                <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-[2rem] bg-blue-500/10 text-blue-200 ring-1 ring-blue-300/20">
                  <BrainCircuit size={40} />
                </div>
                <h3 className="text-2xl font-black">Aguardando exame</h3>
                <p className="mt-3 max-w-md text-sm font-semibold leading-relaxed text-slate-500">O resultado aparecerá aqui com resumo, achados principais, pontos de atenção e limitações.</p>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="rounded-[1.75rem] border border-sky-300/15 bg-sky-500/10 p-5">
                  <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-sky-200">
                    <ShieldCheck size={15} /> Resumo
                  </div>
                  <p className="text-sm font-semibold leading-7 text-slate-100">{result.resumo}</p>
                  <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Confiança: {result.confianca}</p>
                </div>

                <ListBlock title="Achados principais" items={result.achados_principais} />
                <ListBlock title="Pontos de atenção" items={result.pontos_atencao} tone="amber" />
                <ListBlock title="Sinais de alerta" items={result.sinais_alerta} tone="rose" />

                {result.explicacao_paciente && (
                  <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5">
                    <h3 className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-violet-200">Explicação para paciente</h3>
                    <p className="text-sm font-semibold leading-7 text-slate-200">{result.explicacao_paciente}</p>
                  </div>
                )}

                {result.orientacao_profissional && (
                  <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5">
                    <h3 className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-blue-200">Pontos para o profissional</h3>
                    <p className="text-sm font-semibold leading-7 text-slate-200">{result.orientacao_profissional}</p>
                  </div>
                )}

                <div className="rounded-[1.75rem] border border-amber-300/20 bg-amber-500/10 p-5 text-sm font-semibold leading-7 text-amber-100">
                  <strong>Limitações:</strong> {result.limitacoes}
                </div>
              </div>
            )}
          </motion.div>
        </div>

        <section className="rounded-[2.5rem] border border-white/10 bg-white/[0.045] p-5 shadow-2xl shadow-slate-950/20 backdrop-blur-2xl sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black">Análises recentes</h2>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Histórico salvo com segurança</p>
            </div>
          </div>

          {loadingRecords ? (
            <div className="flex items-center gap-3 rounded-2xl bg-white/[0.04] p-4 text-sm font-bold text-slate-400">
              <Loader2 className="animate-spin text-sky-300" size={18} /> Carregando histórico...
            </div>
          ) : records.length === 0 ? (
            <div className="rounded-2xl bg-white/[0.04] p-6 text-sm font-semibold text-slate-500">Nenhuma análise salva ainda.</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {records.map((record) => (
                <article key={record.id} className="rounded-[1.75rem] border border-white/10 bg-slate-950/55 p-5">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="line-clamp-1 text-base font-black text-white">{record.exam_type || 'Exame'}</h3>
                      <p className="mt-1 line-clamp-1 text-xs font-bold text-slate-500">{record.patient_name || 'Paciente não informado'}</p>
                    </div>
                    <span className="rounded-full bg-blue-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-blue-200">IA</span>
                  </div>
                  <p className="line-clamp-4 text-sm font-semibold leading-6 text-slate-300">{record.ai_summary}</p>
                  <div className="mt-4 flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-widest text-slate-600">
                    <span>{new Date(record.created_at).toLocaleDateString('pt-BR')}</span>
                    <span>{record.ai_confidence || 'moderada'}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
