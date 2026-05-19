import React, { useEffect, useMemo, useState } from 'react';
import {
  Eye,
  Download,
  FileText,
  FolderOpen,
  Calendar,
  UserRound,
  Stethoscope,
  Loader2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { getLinkedClinicalPatients } from '../services/patientLinkService';
import { generatePremiumPdf, openPremiumPdf } from '../services/premiumPdfService';

type ClinicalPatient = {
  id: string;
  nome_completo?: string | null;
  email?: string | null;
  perfil_id?: string | null;
  fisioterapeuta_id?: string | null;
  fisio_id?: string | null;
};

type PatientFile = {
  id: string;
  paciente_id: string;
  tipo?: string | null;
  nome_arquivo?: string | null;
  arquivo_url?: string | null;
  file_path?: string | null;
  mime_type?: string | null;
  created_at?: string | null;
  fisioterapeuta_id?: string | null;
  fisio_id?: string | null;
  source?: 'arquivo' | 'gerado';
};

type PhysioProfile = {
  id: string;
  nome_completo?: string | null;
  nome?: string | null;
  crefito?: string | null;
  registro_profissional?: string | null;
};

const DOCUMENTS_BUCKET = 'documents';

const formatDate = (value?: string | null) => {
  if (!value) return 'Data não informada';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const fileNameFromPath = (path?: string | null) => {
  if (!path) return 'Documento';
  const decoded = decodeURIComponent(path);
  return decoded.split('/').pop() || 'Documento';
};

const normalizeFile = (file: any): PatientFile => ({
  id: String(file.id),
  paciente_id: String(file.paciente_id),
  tipo: file.tipo || file.document_type || 'Documento',
  nome_arquivo: file.nome_arquivo || file.file_name || fileNameFromPath(file.file_path || file.arquivo_url),
  arquivo_url: file.arquivo_url || file.file_url || file.url || null,
  file_path: file.file_path || file.path || file.arquivo_url || null,
  mime_type: file.mime_type || null,
  created_at: file.created_at || file.updated_at || null,
  fisioterapeuta_id: file.fisioterapeuta_id || file.fisio_id || null,
  fisio_id: file.fisio_id || file.fisioterapeuta_id || null,
  source: 'arquivo',
});

const isAbsoluteUrl = (value?: string | null) => !!value && /^https?:\/\//i.test(value);

const Documents: React.FC = () => {
  const { user } = useAuth();
  const [patients, setPatients] = useState<ClinicalPatient[]>([]);
  const [documents, setDocuments] = useState<PatientFile[]>([]);
  const [physios, setPhysios] = useState<Record<string, PhysioProfile>>({});
  const [loading, setLoading] = useState(true);
  const [openingId, setOpeningId] = useState<string | null>(null);

  const mainPatient = patients[0] || null;

  useEffect(() => {
    const loadDocuments = async () => {
      if (!user?.id) return;

      setLoading(true);

      try {
        const linked = await getLinkedClinicalPatients(user.id);
        setPatients(linked as ClinicalPatient[]);

        const patientIds = linked.map((p: any) => p.id).filter(Boolean);

        if (patientIds.length === 0) {
          setDocuments([]);
          return;
        }

        const { data: files, error: filesError } = await supabase
          .from('arquivos_paciente')
          .select('*')
          .in('paciente_id', patientIds)
          .order('created_at', { ascending: false });

        if (filesError) {
          console.error('[Documents] Erro ao carregar arquivos_paciente:', filesError);
          setDocuments([]);
          return;
        }

        const normalized = (files || []).map(normalizeFile);

        setDocuments(normalized);

        const physioIds = Array.from(
          new Set([
            ...linked.map((p: any) => p.fisioterapeuta_id || p.fisio_id).filter(Boolean),
            ...normalized.map((d) => d.fisioterapeuta_id || d.fisio_id).filter(Boolean),
          ])
        );

        if (physioIds.length > 0) {
          const { data: profiles, error: profileError } = await supabase
            .from('perfis')
            .select('id, nome_completo, nome, crefito, registro_profissional')
            .in('id', physioIds);

          if (profileError) {
            console.warn('[Documents] Não foi possível carregar nomes dos fisioterapeutas:', profileError);
          } else {
            const map: Record<string, PhysioProfile> = {};
            (profiles || []).forEach((profile: any) => {
              map[profile.id] = profile;
            });
            setPhysios(map);
          }
        }
      } finally {
        setLoading(false);
      }
    };

    loadDocuments();
  }, [user?.id]);

  const getPhysioForDocument = (document: PatientFile) => {
    const explicitId = document.fisioterapeuta_id || document.fisio_id;
    if (explicitId && physios[explicitId]) return physios[explicitId];

    const patient = patients.find((p) => p.id === document.paciente_id);
    const patientPhysioId = patient?.fisioterapeuta_id || patient?.fisio_id;
    if (patientPhysioId && physios[patientPhysioId]) return physios[patientPhysioId];

    return null;
  };

  const getPhysioName = (document: PatientFile) => {
    const profile = getPhysioForDocument(document);
    return profile?.nome_completo || profile?.nome || 'Fisioterapeuta';
  };

  const getDocumentPath = (document: PatientFile) => {
    if (document.file_path) return document.file_path;
    if (document.arquivo_url && !isAbsoluteUrl(document.arquivo_url)) return document.arquivo_url;
    return null;
  };

  const getDocumentUrl = async (document: PatientFile) => {
    if (isAbsoluteUrl(document.arquivo_url)) return document.arquivo_url as string;

    const path = getDocumentPath(document);
    if (!path) return null;

    const { data, error } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .createSignedUrl(path, 60 * 10, {
        download: false,
      });

    if (error) {
      console.error('[Documents] Erro ao gerar signed URL:', error);
      return null;
    }

    return data?.signedUrl || null;
  };

  const openRealDocument = async (document: PatientFile) => {
    setOpeningId(document.id);
    try {
      const url = await getDocumentUrl(document);

      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
        return;
      }

      openPremiumPdf({
        kind: 'documento',
        title: document.tipo || 'Documento clínico',
        patient: mainPatient,
        physiotherapist: getPhysioForDocument(document),
        record: document,
        fileName: document.nome_arquivo || 'documento.pdf',
      });
    } finally {
      setOpeningId(null);
    }
  };

  const downloadRealDocument = async (document: PatientFile) => {
    setOpeningId(document.id);
    try {
      const path = getDocumentPath(document);

      if (isAbsoluteUrl(document.arquivo_url)) {
        window.open(document.arquivo_url as string, '_blank', 'noopener,noreferrer');
        return;
      }

      if (path) {
        const { data, error } = await supabase.storage.from(DOCUMENTS_BUCKET).download(path);
        if (!error && data) {
          const blobUrl = URL.createObjectURL(data);
          const link = window.document.createElement('a');
          link.href = blobUrl;
          link.download = document.nome_arquivo || fileNameFromPath(path);
          window.document.body.appendChild(link);
          link.click();
          link.remove();
          URL.revokeObjectURL(blobUrl);
          return;
        }
      }

      generatePremiumPdf({
        kind: 'documento',
        title: document.tipo || 'Documento clínico',
        patient: mainPatient,
        physiotherapist: getPhysioForDocument(document),
        record: document,
        fileName: document.nome_arquivo || 'documento.pdf',
      });
    } finally {
      setOpeningId(null);
    }
  };

  const hasDocuments = documents.length > 0;

  return (
    <div className="min-h-screen bg-[#020817] text-white">
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="mb-10">
          <h1 className="text-4xl font-black tracking-tight text-blue-400 md:text-6xl">
            Documentos e Relatórios
          </h1>
          <p className="mt-3 max-w-3xl text-lg font-semibold text-slate-400 md:text-2xl">
            Visualize e baixe seus documentos, exames e relatórios médicos.
          </p>
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-950/70 shadow-2xl shadow-blue-950/20">
          <div className="flex flex-col gap-4 border-b border-slate-800 bg-slate-900/70 p-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="rounded-2xl bg-blue-500/15 p-3 text-blue-300">
                <FolderOpen size={28} />
              </div>
              <div>
                <h2 className="text-2xl font-black uppercase tracking-wide text-white">
                  Biblioteca de documentos
                </h2>
                <p className="text-sm font-semibold text-slate-400">
                  Arquivos liberados pelo fisioterapeuta responsável.
                </p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[280px] items-center justify-center">
              <Loader2 className="animate-spin text-blue-300" size={42} />
            </div>
          ) : !hasDocuments ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
              <div className="mb-4 rounded-full border border-slate-700 bg-slate-900 p-6 text-slate-500">
                <FileText size={52} />
              </div>
              <h3 className="text-2xl font-black text-white">Nenhum documento encontrado</h3>
              <p className="mt-2 max-w-md text-slate-400">
                Exames, PDFs e relatórios liberados pelo fisioterapeuta aparecerão aqui.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {documents.map((document) => {
                const physio = getPhysioName(document);
                const isOpening = openingId === document.id;
                return (
                  <article
                    key={document.id}
                    className="grid gap-4 p-5 transition hover:bg-slate-900/70 md:grid-cols-[1.5fr_1fr_1fr_auto] md:items-center"
                  >
                    <div className="min-w-0">
                      <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-blue-300">
                        <FileText size={14} />
                        {document.tipo || 'Documento'}
                      </div>
                      <h3 className="break-words text-xl font-black text-white">
                        {document.nome_arquivo || fileNameFromPath(document.file_path || document.arquivo_url)}
                      </h3>
                      <p className="mt-1 text-sm font-semibold text-slate-400">
                        Paciente: {mainPatient?.nome_completo || 'Paciente'}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 text-slate-300">
                      <Stethoscope className="text-blue-300" size={20} />
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                          Fisioterapeuta
                        </p>
                        <p className="font-bold text-slate-200">{physio}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-slate-300">
                      <Calendar className="text-blue-300" size={20} />
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                          Data
                        </p>
                        <p className="font-bold text-slate-200">{formatDate(document.created_at)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => openRealDocument(document)}
                        disabled={isOpening}
                        className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-400/30 bg-blue-500/10 text-blue-200 transition hover:bg-blue-500/20 disabled:opacity-60"
                        title="Visualizar documento"
                      >
                        {isOpening ? <Loader2 className="animate-spin" size={20} /> : <Eye size={22} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadRealDocument(document)}
                        disabled={isOpening}
                        className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-400/30 bg-emerald-500/10 text-emerald-200 transition hover:bg-emerald-500/20 disabled:opacity-60"
                        title="Baixar documento"
                      >
                        {isOpening ? <Loader2 className="animate-spin" size={20} /> : <Download size={22} />}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Documents;
