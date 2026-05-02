import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Loader2, 
  ShieldCheck, 
  CreditCard, 
  Zap, 
  ArrowRight,
  ShoppingCart,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';

export default function LibraryPaymentModal({ 
  isOpen, 
  onClose, 
  materialIds,
  userId,
  email,
  onSuccess
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  materialIds: string[], 
  userId: string,
  email: string,
  onSuccess: () => void
}) {
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'asaas'>('stripe');
  const [asaasMethod, setAsaasMethod] = useState<'PIX' | 'BOLETO' | 'CREDIT_CARD'>('PIX');
  const [cpf, setCpf] = useState('');

  const handleCheckout = async () => {
    if (!userId || materialIds.length === 0) return;
    
    setLoading(true);
    try {
      if (paymentMethod === 'stripe') {
        const { config } = await import('../config/api');
        const supabaseUrl = config.supabaseUrl.replace(/\/$/, '');
        const url = `${supabaseUrl}/functions/v1/create-checkout-session`;

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': config.supabaseAnonKey,
            'Authorization': `Bearer ${config.supabaseAnonKey}`
          },
          body: JSON.stringify({
            user_id: userId,
            email: email,
            plan: 'library',
            type: 'library',
            material_ids: materialIds
          })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Erro ao gerar checkout Stripe.');
        
        if (data.url) {
          toast.success('Redirecionando para o Stripe...');
          window.location.href = data.url;
        } else {
          throw new Error('URL de checkout Stripe não retornada.');
        }
      } else {
        // Asaas Logic
        if (!cpf.trim() && asaasMethod !== 'PIX') {
           // Actually, Asaas requires CPF for almost everything now
        }

        const response = await fetch('/api/asaas/create-library-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: userId,
            email: email,
            material_ids: materialIds,
            billingType: asaasMethod,
            cpf: cpf
          })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Erro ao criar checkout Asaas');

        const redirectUrl = data.invoiceUrl || data.url || data.bankSlipUrl;

        if (redirectUrl && typeof redirectUrl === 'string') {
          toast.success('Redirecionando para o pagamento via Asaas...');
          window.location.href = redirectUrl;
        } else {
          console.error("Invalid redirect URL:", data);
          throw new Error('URL de pagamento inválida ou não retornada');
        }
      }
    } catch (err: any) {
      console.error('Erro no checkout biblioteca:', err);
      toast.error(err.message || 'Erro ao processar pagamento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            className="relative w-full max-w-md bg-slate-900 rounded-[3rem] shadow-2xl p-8 overflow-hidden border border-white/10"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-sky-500/10 text-sky-400 rounded-xl flex items-center justify-center">
                  <ShoppingCart size={20} />
                </div>
                <h3 className="text-xl font-black text-white tracking-tight">Pagamento</h3>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-all">
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center gap-4">
                <div className="w-10 h-10 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center shrink-0">
                  <div className="text-xs font-black">R$</div>
                </div>
                <div>
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total dos Materiais</p>
                   <p className="text-lg font-black text-white">{materialIds.length} Itens no carrinho</p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Método de pagamento</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setPaymentMethod('stripe')}
                    className={cn(
                      "p-4 rounded-2xl border transition-all flex flex-col items-center gap-2",
                      paymentMethod === 'stripe' 
                        ? "bg-sky-500/10 border-sky-500/50 text-sky-400" 
                        : "bg-white/5 border-white/5 text-slate-500 hover:text-slate-300"
                    )}
                  >
                    <CreditCard size={20} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Cartão</span>
                  </button>
                  <button
                    onClick={() => setPaymentMethod('asaas')}
                    className={cn(
                      "p-4 rounded-2xl border transition-all flex flex-col items-center gap-2",
                      paymentMethod === 'asaas' 
                        ? "bg-sky-500/10 border-sky-500/50 text-sky-400" 
                        : "bg-white/5 border-white/5 text-slate-500 hover:text-slate-300"
                    )}
                  >
                    <Zap size={20} className={paymentMethod === 'asaas' ? 'text-yellow-400' : ''} />
                    <span className="text-[10px] font-black uppercase tracking-widest">PIX / Boleto</span>
                  </button>
                </div>
              </div>

              {paymentMethod === 'asaas' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-4 pt-2"
                >
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Seu CPF</label>
                    <input
                      type="text"
                      value={cpf}
                      onChange={(e) => setCpf(e.target.value)}
                      placeholder="000.000.000-00"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder:text-slate-700 focus:outline-none focus:border-sky-500 transition-all font-bold text-sm"
                    />
                  </div>
                  <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/5">
                    {['PIX', 'BOLETO', 'CREDIT_CARD'].map(method => (
                      <button
                        key={method}
                        onClick={() => setAsaasMethod(method as any)}
                        className={cn(
                          "flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                          asaasMethod === method ? "bg-sky-500 text-white" : "text-slate-500 hover:text-slate-300"
                        )}
                      >
                        {method === 'CREDIT_CARD' ? 'Cartão' : method}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              <button
                onClick={handleCheckout}
                disabled={loading}
                className="w-full py-5 bg-sky-500 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-xl shadow-sky-900/40 hover:bg-sky-600 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Processando...
                  </>
                ) : (
                  <>
                    Finalizar e Pagar
                    <ArrowRight size={18} />
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-2 text-slate-500">
                <ShieldCheck size={14} />
                <span className="text-[9px] font-black uppercase tracking-widest">Processamento Criptografado e Seguro</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
