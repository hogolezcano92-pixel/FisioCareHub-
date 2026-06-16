import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock3, ExternalLink, FileSignature, Loader2, PenLine, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import {
  DigitalSignatureRecord,
  getResourceSignatures,
  prepareExternalQualifiedSignature,
  signResource,
} from '../services/digitalSignatureService';
import { cn } from '../lib/utils';

type DigitalSignaturePanelProps = {
  resourceType: string;
  resourceId: string;
  resourceTitle: string;
  resourceContent: unknown;
  patientId?: string | null;
  physioId?: string | null;
  compact?: boolean;
};

const roleLabel = (role?: string | null) => {
  if (role === 'paciente') return 'Paciente';
  if (role === 'fisioterapeuta') return 'Fisioterapeuta';
  if (role === 'admin') return 'Administrador';
  return 'Assinante';
};

const statusLabel = (signature: DigitalSignatureRecord) => {
  if (signature.signature_status === 'pending_external') return 'Aguardando provedor externo';
  if (signature.signature_status === 'signed') return 'Assinado';
  return signature.signature_status || 'Registrado';
};

const formatDate = (date?: string | null) => {
  if (!date) return 'Pendente';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return 'Data indisponível';
  return parsed.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const shortHash = (hash?: string | null) => {
  if (!hash) return 'Hash indisponível';
  if (hash.length <= 18) return hash;
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
};

export default function DigitalSignaturePanel({
  resourceType,
  resourceId,
  resourceTitle,
  resourceContent,
  patientId,
  physioId,
  compact = false,
}: DigitalSignaturePanelProps) {
  const { user, profile } = useAuth();
  const [signatures, setSignatures] = useState<DigitalSignatureRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [preparingExternal, setPreparingExternal] = useState(false);

  const signerRole = profile?.tipo_usuario || 'usuario';
  const currentUserSignature = useMemo(
    () => signatures.find((signature) => signature.signer_id === user?.id && signature.signer_role === signerRole),
    [signatures, user?.id, signerRole]
  );

  const canSign = Boolean(user?.id && resourceId && resourceType && !currentUserSignature);

  const loadSignatures = async () => {
    if (!resourceType || !resourceId) return;
    setLoading(true);
    try {
      const data = await getResourceSignatures(resourceType, resourceId);
      setSignatures(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSignatures();
  }, [resourceType, resourceId]);

  const handleSign = async () => {
    if (!user?.id || !profile) return;
    const confirmed = window.confirm('Declaro que li e concordo com o conteúdo deste documento. Deseja assinar eletronicamente agora?');
    if (!confirmed) return;

    setSigning(true);
    try {
      await signResource({
        resourceType,
        resourceId,
        resourceTitle,
        resourceContent,
        patientId,
        physioId,
        signerId: user.id,
        signerRole,
        signerName: profile.nome_completo || user.email || 'Usuário',
        signerEmail: user.email,
        signatureLevel: 'avancada',
      });
      toast.success('Assinatura eletrônica registrada com segurança.');
      await loadSignatures();
    } catch (err: any) {
      console.error('Erro ao assinar documento:', err);
      toast.error(err?.message || 'Erro ao registrar assinatura. Execute o SQL de assinatura digital se a tabela ainda não existir.');
    } finally {
      setSigning(false);
    }
  };

  const handleExternalSignature = async () => {
    if (!user?.id || !profile) return;
    setPreparingExternal(true);
    try {
      await prepareExternalQualifiedSignature({
        resourceType,
        resourceId,
        resourceTitle,
        resourceContent,
        patientId,
        physioId,
        signerId: user.id,
        signerRole,
        signerName: profile.nome_completo || user.email || 'Usuário',
        signerEmail: user.email,
        provider: 'govbr_icp_clicksign_docusign_ready',
      });
      toast.success('Fluxo externo preparado. Conecte o provedor no backend para concluir a assinatura qualificada.');
      await loadSignatures();
    } catch (err: any) {
      console.error('Erro ao preparar assinatura externa:', err);
      toast.error(err?.message || 'Erro ao preparar assinatura externa.');
    } finally {
      setPreparingExternal(false);
    }
  };

  return (
    <section className={cn(
      'rounded-3xl border border-indigo-200/80 bg-indigo-50/90 p-4 text-slate-950 shadow-sm dark:border-slate-700 dark:bg-slate-800/70 dark:text-white',
      compact ? 'space-y-3' : 'space-y-4'
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
            <FileSignature size={20} />
          </div>
          <div className="min-w-0">
            <h3 className="font-black text-slate-950 dark:text-white leading-tight">Assinatura digital</h3>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 leading-relaxed">
              Registro com hash SHA-256, data/hora, usuário logado, dispositivo e código público de validação.
            </p>
          </div>
        </div>
        {loading && <Loader2 className="animate-spin text-indigo-500 shrink-0" size={18} />}
      </div>

      {signatures.length > 0 ? (
        <div className="grid gap-2">
          {signatures.map((signature) => (
            <div key={signature.id} className="rounded-2xl border border-indigo-100 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-slate-900/60">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-black text-slate-950 dark:text-white truncate">
                    {roleLabel(signature.signer_role)} • {signature.signer_name || 'Nome não informado'}
                  </p>
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    {statusLabel(signature)} em {formatDate(signature.signed_at || signature.created_at)}
                  </p>
                  <p className="mt-1 max-w-full rounded-lg bg-slate-100 px-2 py-1 font-mono text-[10px] font-bold text-slate-600 dark:bg-slate-950/40 dark:text-slate-400">
                    Hash: <span className="break-all">{shortHash(signature.document_hash)}</span>
                  </p>
                </div>
                {signature.signature_status === 'signed' ? (
                  <CheckCircle2 className="text-emerald-500 shrink-0" size={20} />
                ) : (
                  <Clock3 className="text-amber-500 shrink-0" size={20} />
                )}
              </div>
              {signature.verification_url && (
                <a
                  href={signature.verification_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-500 dark:text-indigo-300"
                >
                  Verificar assinatura <ExternalLink size={12} />
                </a>
              )}
            </div>
          ))}
        </div>
      ) : !loading ? (
        <p className="rounded-2xl border border-dashed border-indigo-200 bg-white/70 p-3 text-xs font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
          Nenhuma assinatura registrada para este documento ainda.
        </p>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button
          type="button"
          onClick={handleSign}
          disabled={!canSign || signing}
          className={cn(
            "h-11 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2",
            currentUserSignature
              ? "bg-indigo-600 text-white opacity-100 cursor-not-allowed"
              : "bg-indigo-600 text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 dark:disabled:bg-slate-700 dark:disabled:text-slate-300"
          )}
        >
          {signing ? <Loader2 className="animate-spin" size={16} /> : <PenLine size={16} />}
          {currentUserSignature ? 'Já assinado' : 'Assinar agora'}
        </button>
        <button
          type="button"
          onClick={handleExternalSignature}
          disabled={!user?.id || preparingExternal}
          className="h-11 rounded-2xl border border-indigo-200 bg-white text-slate-900 font-black text-xs uppercase tracking-widest hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
        >
          {preparingExternal ? <Loader2 className="animate-spin" size={16} /> : <ShieldCheck size={16} />}
          Fase 3 externa
        </button>
      </div>
    </section>
  );
}
