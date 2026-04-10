import { useState } from 'react';
import { supabase, invokeFunction } from '../lib/supabase';
import { motion } from 'motion/react';
import { Send, CheckCircle2, AlertCircle, Loader2, Mail } from 'lucide-react';
import { toast } from 'sonner';

export default function TestEmail() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log("Invocando função Send-email para:", email);
      
      // Chamando a Edge Function 'Send-email' via utilitário invokeFunction
      const data = await invokeFunction('Send-email', {
        to: email,
        subject: "Teste de Notificação - FisioCareHub",
        html: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #0ea5e9;">Notificação FisioCareHub</h2>
            <p>Olá,</p>
            <p>Este é um e-mail de teste enviado para verificar se a integração com o <strong>Resend</strong> via Supabase Edge Functions está funcionando corretamente.</p>
            <p>Se você recebeu este e-mail, as notificações do sistema estão operacionais.</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="font-size: 12px; color: #64748b;">Enviado por FisioCareHub - ${new Date().toLocaleString()}</p>
          </div>
        `,
        type: "email"
      });

      setResult(data);
      toast.success("E-mail de teste enviado! Verifique sua caixa de entrada.");
    } catch (err: any) {
      console.error("Erro ao testar e-mail:", err);
      setError(err.message || "Erro ao invocar a função de e-mail.");
      toast.error("Falha ao enviar e-mail de teste.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100"
      >
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
            <Mail size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Teste de E-mail</h1>
            <p className="text-slate-500">Verifique se as notificações via Resend estão funcionando.</p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl mb-8">
          <p className="text-sm text-blue-800 leading-relaxed">
            <strong>Nota:</strong> Este teste utiliza a Supabase Edge Function <code>Send-email</code> integrada ao <strong>Resend</strong>.
          </p>
        </div>

        <form onSubmit={handleTestEmail} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">E-mail de Destino</label>
            <input
              type="email"
              required
              placeholder="seu-email@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all disabled:opacity-50 shadow-lg shadow-blue-100"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Send size={20} />}
            {loading ? 'Enviando...' : 'Enviar E-mail de Teste'}
          </button>
        </form>

        {error && (
          <div className="mt-8 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3">
            <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-sm font-bold text-red-900">Erro no Envio</p>
              <p className="text-xs text-red-700 mt-1">{error}</p>
              <p className="text-xs text-red-600 mt-2">
                Verifique se você configurou a <code>RESEND_API_KEY</code> nos 
                <strong> Edge Function Secrets</strong> do Supabase.
              </p>
            </div>
          </div>
        )}

        {result && (
          <div className="mt-8 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-3">
            <CheckCircle2 className="text-emerald-600 shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-sm font-bold text-emerald-900">Sucesso!</p>
              <p className="text-xs text-emerald-700 mt-1">A função respondeu corretamente.</p>
              <pre className="text-[10px] bg-white/50 p-2 rounded mt-2 overflow-auto max-h-32">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
