import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { motion, AnimatePresence } from 'motion/react';
import { X, Loader2, ShieldCheck, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

function CheckoutForm({ amount, onCancel, onSuccess }: { amount: number, onCancel: () => void, onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setLoading(true);
    setErrorMessage(null);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/library?success=true`,
      },
    });

    if (error) {
      setErrorMessage(error.message || 'Ocorreu um erro ao processar o pagamento.');
      setLoading(false);
    } else {
      onSuccess();
    }
  };

  return (
    <form id="library-checkout-form" onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      
      {errorMessage && (
        <div className="p-4 bg-rose-500/10 text-rose-500 text-sm font-medium rounded-2xl border border-rose-500/20">
          {errorMessage}
        </div>
      )}

      <div className="flex gap-4 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="flex-1 py-4 bg-white/5 text-slate-400 rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={!stripe || loading}
          className="flex-[2] py-4 bg-sky-500 text-white rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-sky-600 transition-all shadow-xl shadow-sky-900/40 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="animate-spin" size={18} /> : `Pagar R$ ${amount.toFixed(2)}`}
        </button>
      </div>
      
      <div className="flex items-center justify-center gap-2 text-slate-500">
        <ShieldCheck size={14} />
        <span className="text-[10px] font-black uppercase tracking-widest">Pagamento Seguro via Stripe</span>
      </div>
    </form>
  );
}

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

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/asaas/create-library-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          email: email,
          material_ids: materialIds,
          billingType: 'UNDEFINED' // Allow all types in Asaas
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao criar checkout');

      const redirectUrl = data.invoiceUrl || data.url || data.bankSlipUrl;

      if (redirectUrl) {
        toast.success('Redirecionando para o pagamento via Asaas...');
        window.location.href = redirectUrl;
      } else {
        throw new Error('URL de pagamento não retornada');
      }
    } catch (err: any) {
      console.error('Erro no checkout biblioteca (Asaas):', err);
      toast.error(err.message || 'Erro ao processar pagamento com Asaas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && materialIds.length > 0 && userId) {
      handleCheckout();
    }
  }, [isOpen, materialIds, userId]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            className="relative w-full max-w-md bg-slate-900 rounded-[3rem] shadow-2xl p-8 overflow-hidden border border-white/10"
          >
            <div className="flex flex-col items-center justify-center py-20 space-y-6">
              <Loader2 className="animate-spin text-sky-500" size={48} />
              <div className="text-center space-y-2">
                <h3 className="text-xl font-black text-white tracking-tight">Preparando Pagamento</h3>
                <p className="text-slate-500 font-bold text-xs uppercase tracking-widest animate-pulse">Você será redirecionado em instantes...</p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
