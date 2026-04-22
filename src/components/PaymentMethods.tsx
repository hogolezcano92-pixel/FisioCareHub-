import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CreditCard, Plus, Trash2, Loader2, CheckCircle, X, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

interface PaymentMethod {
  id: string;
  user_id: string;
  provider_payment_id: string;
  last4: string;
  brand: string;
  created_at: string;
}

export default function PaymentMethods({ userId }: { userId: string }) {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    number: '',
    name: '',
    expiry: '',
    cvv: ''
  });

  useEffect(() => {
    if (userId) {
      fetchPaymentMethods();
    }
  }, [userId]);

  const fetchPaymentMethods = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        // Silently handle if table doesn't exist yet in some environments
        if (error.code !== '42P01') throw error;
        setMethods([]);
      } else {
        setMethods(data || []);
      }
    } catch (err) {
      console.error('Error fetching payment methods:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    try {
      // 1. Simulate Integration with Payment Gateway (Stripe/Mercado Pago)
      // In a real scenario, we'd use stripe.createToken or similar SDK
      console.log('Simulating tokenization with Provider...');
      await new Promise(resolve => setTimeout(resolve, 1500)); // Network simulation
      
      const simulatedToken = `tok_${Math.random().toString(36).substring(7)}`;
      const last4 = formData.number.replace(/\s/g, '').slice(-4);
      const brand = detectBrand(formData.number);

      // 2. Save to Supabase using the required table structure
      const newMethod = {
        user_id: userId,
        provider_payment_id: simulatedToken,
        last4: last4,
        brand: brand
      };

      const { data, error } = await supabase
        .from('payment_methods')
        .insert(newMethod)
        .select()
        .single();

      if (error) {
        // Fallback for demo if table missing
        if (error.code === '42P01') {
          const mockData = { ...newMethod, id: crypto.randomUUID(), created_at: new Date().toISOString() };
          setMethods(prev => [mockData, ...prev]);
        } else {
          throw error;
        }
      } else if (data) {
        setMethods(prev => [data, ...prev]);
      }

      toast.success('Cartão adicionado com sucesso!');
      setShowAddForm(false);
      setFormData({ number: '', name: '', expiry: '', cvv: '' });
    } catch (err: any) {
      toast.error('Erro ao salvar método de pagamento: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('payment_methods')
        .delete()
        .eq('id', id);

      if (error && error.code !== '42P01') throw error;
      
      setMethods(prev => prev.filter(m => m.id !== id));
      toast.success('Método de pagamento removido.');
    } catch (err) {
      toast.error('Erro ao excluir cartão.');
    }
  };

  const detectBrand = (num: string) => {
    const cleanNum = num.replace(/\s/g, '');
    if (cleanNum.startsWith('4')) return 'Visa';
    if (cleanNum.startsWith('5')) return 'Mastercard';
    if (cleanNum.startsWith('3')) return 'Amex';
    return 'Visa'; // Default
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const parts = v.match(/.{1,4}/g);
    return parts ? parts.join(' ') : v;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-blue-500" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black text-white flex items-center gap-3">
          <CreditCard className="text-blue-500" size={24} />
          Métodos de Pagamento
        </h3>
        {!showAddForm && (
          <button 
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-900/20"
          >
            <Plus size={16} /> Adicionar Cartão
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {showAddForm ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-slate-900/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/10 shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4">
              <button onClick={() => setShowAddForm(false)} className="text-slate-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddCard} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Número do Cartão</label>
                  <input
                    type="text"
                    required
                    maxLength={19}
                    value={formData.number}
                    onChange={(e) => setFormData({...formData, number: formatCardNumber(e.target.value)})}
                    placeholder="0000 0000 0000 0000"
                    className="w-full p-4 bg-slate-950 border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-white font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Titular do Cartão</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value.toUpperCase()})}
                    placeholder="NOME IMPRESSO NO CARTÃO"
                    className="w-full p-4 bg-slate-950 border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-white font-bold uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Vencimento</label>
                  <input
                    type="text"
                    required
                    maxLength={5}
                    placeholder="MM/YY"
                    value={formData.expiry}
                    onChange={(e) => setFormData({...formData, expiry: e.target.value})}
                    className="w-full p-4 bg-slate-950 border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-white font-bold text-center"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">CVV</label>
                  <input
                    type="text"
                    required
                    maxLength={4}
                    placeholder="***"
                    value={formData.cvv}
                    onChange={(e) => setFormData({...formData, cvv: e.target.value.replace(/\D/g, '')})}
                    className="w-full p-4 bg-slate-950 border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-white font-bold text-center"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center gap-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-900/20 flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />}
                  Salvar Cartão
                </button>
                <div className="flex items-center gap-2 text-slate-500">
                  <ShieldCheck size={16} />
                  <span className="text-[8px] font-black uppercase tracking-tighter">Dados criptografados via SSL</span>
                </div>
              </div>
            </form>
          </motion.div>
        ) : methods.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-6">
            {methods.map((method) => (
              <motion.div
                key={method.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="group relative bg-slate-900/50 backdrop-blur-md p-6 rounded-[2rem] border border-white/10 shadow-lg hover:border-blue-500/30 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center border border-white/10">
                      <CreditCard className="text-blue-400" size={24} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-white capitalize">{method.brand} **** {method.last4}</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Added {new Date(method.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDelete(method.id)}
                    className="p-2 text-slate-600 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="p-16 text-center border-2 border-dashed border-white/10 rounded-[3rem] space-y-6">
            <div className="w-20 h-20 bg-white/5 text-slate-600 rounded-full flex items-center justify-center mx-auto">
              <CreditCard size={40} />
            </div>
            <div className="space-y-2">
              <p className="text-lg font-black text-white">Nenhum cartão encontrado</p>
              <p className="text-sm text-slate-400 font-medium max-w-xs mx-auto">
                Adicione um cartão de crédito ou débito para agilizar o pagamento de suas sessões.
              </p>
            </div>
            <button 
              onClick={() => setShowAddForm(true)}
              className="px-8 py-4 bg-white/5 border border-white/10 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all"
            >
              Adicionar Primeiro Cartão
            </button>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
