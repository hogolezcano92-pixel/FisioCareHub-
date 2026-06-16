import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, FileSignature, Loader2, ShieldCheck, XCircle } from 'lucide-react';
import Logo from '../components/Logo';
import { DigitalSignatureRecord, getSignatureByVerificationCode } from '../services/digitalSignatureService';

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

export default function VerifySignature() {
  const { code } = useParams();
  const [signature, setSignature] = useState<DigitalSignatureRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!code) {
        setError('Código de verificação não informado.');
        setLoading(false);
        return;
      }

      try {
        const data = await getSignatureByVerificationCode(code);
        if (!data) {
          setError('Assinatura não encontrada ou código inválido.');
        } else {
          setSignature(data);
        }
      } catch (err: any) {
        console.error('Erro ao verificar assinatura:', err);
        setError(err?.message || 'Erro ao verificar assinatura.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [code]);

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 px-5 py-10 flex items-center justify-center">
      <section className="w-full max-w-2xl rounded-[2rem] border border-indigo-100 bg-white p-6 shadow-2xl shadow-indigo-100/70 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Logo />
          <div className="rounded-2xl bg-indigo-50 p-3 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
            <FileSignature size={28} />
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center space-y-4">
            <Loader2 className="mx-auto animate-spin text-indigo-500" size={42} />
            <p className="font-black text-slate-600 dark:text-slate-300">Verificando assinatura...</p>
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-center dark:border-rose-500/20 dark:bg-rose-500/10">
            <XCircle className="mx-auto mb-4 text-rose-500" size={46} />
            <h1 className="text-2xl font-black text-slate-950 dark:text-white">Assinatura não validada</h1>
            <p className="mt-2 font-semibold text-rose-700 dark:text-rose-200">{error}</p>
          </div>
        ) : signature ? (
          <div className="space-y-6">
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-500/20 dark:bg-emerald-500/10">
              <div className="flex items-start gap-4">
                <CheckCircle2 className="mt-1 text-emerald-500" size={36} />
                <div>
                  <h1 className="text-2xl font-black text-slate-950 dark:text-white">Assinatura localizada</h1>
                  <p className="mt-1 font-semibold text-slate-700 dark:text-slate-200">
                    Este registro pertence a um documento assinado eletronicamente no FisioCareHub.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 text-sm">
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">Documento</p>
                <p className="font-black text-slate-950 dark:text-white">{signature.resource_title || signature.resource_type}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">Assinante</p>
                <p className="font-black text-slate-950 dark:text-white">{signature.signer_name || 'Nome não informado'}</p>
                <p className="text-slate-600 dark:text-slate-300">{signature.signer_email || 'E-mail não informado'}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">Tipo de assinatura</p>
                <p className="font-black text-slate-950 dark:text-white">{signature.certificate_type || signature.signature_level}</p>
                <p className="text-slate-600 dark:text-slate-300">Status: {signature.signature_status}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">Data</p>
                <p className="font-black text-slate-950 dark:text-white">{formatDate(signature.signed_at || signature.created_at)}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">Hash SHA-256 do documento</p>
                <p className="break-all font-mono text-xs text-slate-700 dark:text-slate-300">{signature.document_hash}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <div className="mb-2 flex items-center gap-2 font-black text-slate-950 dark:text-white">
                <ShieldCheck size={18} /> Validação de integridade
              </div>
              A assinatura comprova que houve aceite eletrônico pelo usuário logado. Para assinatura qualificada ICP-Brasil/GOV.BR ou provedor externo, conecte o provedor configurado no backend.
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
