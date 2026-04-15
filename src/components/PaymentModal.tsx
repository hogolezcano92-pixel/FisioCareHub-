import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { motion, AnimatePresence } from 'motion/react';
import { X, Loader2, ShieldCheck, Wallet } from 'lucide-react';
import { toast } from 'sonner';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

function CheckoutForm({ sessionId, amount, onCancel, onSuccess }: { sessionId: string, amount: number, onCancel: () => void, onSuccess: () => void }) {
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
        return_url: `${window.location.origin}/dashboard?session_id=${sessionId}`,
      },
    });

    if (error) {
      setErrorMessage(error.message || 'Ocorreu um erro ao processar o pagamento.');
      setLoading(false);
    } else {
      // O Stripe redirecionará o usuário para a return_url
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      
      {errorMessage && (
        <div className="p-4 bg-red-50 text-red-600 text-sm font-medium rounded-xl border border-red-100">
          {errorMessage}
        </div>
      )}

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="flex-1 py-4 bg-white/5 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={!stripe || loading}
          className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-900/20 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="animate-spin" size={18} /> : `Pagar R$ ${amount.toFixed(2)}`}
        </button>
      </div>
      
      <div className="flex items-center justify-center gap-2 text-slate-400">
        <ShieldCheck size={14} />
        <span className="text-[10px] font-bold uppercase tracking-widest">Pagamento Seguro via Stripe</span>
      </div>
    </form>
  );
}

export default function PaymentModal({ 
  isOpen, 
  onClose, 
  sessionId, 
  amount, 
  physioId 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  sessionId: string, 
  amount: number,
  physioId: string
}) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && sessionId && amount && physioId) {
      const fetchPaymentIntent = async () => {
        setLoading(true);
        try {
          const response = await fetch('/api/create-payment-intent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId,
              amount
            }),
          });

          const data = await response.json();
          if (data.clientSecret) {
            setClientSecret(data.clientSecret);
          } else {
            throw new Error(data.error || 'Erro ao criar intenção de pagamento');
          }
        } catch (err: any) {
          console.error('Erro ao buscar intent:', err);
          toast.error(err.message || 'Erro ao inicializar pagamento');
          onClose();
        } finally {
          setLoading(false);
        }
      };

      fetchPaymentIntent();
    }
  }, [isOpen, sessionId, amount, physioId, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[50] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-slate-900 rounded-[3rem] shadow-2xl p-8 overflow-hidden border border-white/10"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center border border-blue-500/20">
                  <Wallet size={20} />
                </div>
                <h2 className="text-xl font-black text-white tracking-tight">Pagamento da Sessão</h2>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-all text-slate-400">
                <X size={24} />
              </button>
            </div>

            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-4">
                <Loader2 className="animate-spin text-blue-600" size={48} />
                <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Inicializando Checkout...</p>
              </div>
            ) : clientSecret ? (
              <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
                <CheckoutForm 
                  sessionId={sessionId} 
                  amount={amount} 
                  onCancel={onClose} 
                  onSuccess={() => {
                    toast.success('Pagamento processado!');
                    onClose();
                  }} 
                />
              </Elements>
            ) : (
              <div className="py-20 text-center space-y-4">
                <p className="text-red-500 font-bold">Erro ao carregar o pagamento.</p>
                <button onClick={onClose} className="px-6 py-2 bg-slate-100 rounded-xl font-bold text-sm">Voltar</button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
