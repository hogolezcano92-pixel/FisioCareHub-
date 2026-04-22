import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';
import { 
  DollarSign, 
  Save, 
  Loader2, 
  Info,
  CreditCard,
  Building2,
  Wallet
} from 'lucide-react';
import { toast } from 'sonner';

interface PhysioPaymentDataProps {
  userId: string;
}

export default function PhysioPaymentData({ userId }: PhysioPaymentDataProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    tipo_chave_pix: 'CPF' as 'CPF' | 'Email' | 'Telefone' | 'Aleatória',
    chave_pix: '',
    banco: '',
    agencia: '',
    conta: '',
    tipo_conta: '' as 'Corrente' | 'Poupança' | ''
  });

  useEffect(() => {
    fetchPaymentData();
  }, [userId]);

  const fetchPaymentData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('perfis')
        .select('tipo_chave_pix, chave_pix, banco, agencia, conta, tipo_conta')
        .eq('id', userId)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          tipo_chave_pix: data.tipo_chave_pix || 'CPF',
          chave_pix: data.chave_pix || '',
          banco: data.banco || '',
          agencia: data.agencia || '',
          conta: data.conta || '',
          tipo_conta: data.tipo_conta || ''
        });
      }
    } catch (err: any) {
      console.error('Erro ao buscar dados de pagamento:', err);
      toast.error('Erro ao carregar dados de pagamento');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.chave_pix.trim()) {
      toast.error('A chave PIX é obrigatória');
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase
        .from('perfis')
        .update({
          tipo_chave_pix: formData.tipo_chave_pix,
          chave_pix: formData.chave_pix,
          banco: formData.banco,
          agencia: formData.agencia,
          conta: formData.conta,
          tipo_conta: formData.tipo_conta
        })
        .eq('id', userId);

      if (error) throw error;

      toast.success('Dados bancários salvos com sucesso!');
    } catch (err: any) {
      console.error('Erro ao salvar dados bancários:', err);
      toast.error('Erro ao salvar dados bancários');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="animate-spin text-blue-500" size={32} />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Carregando dados de pagamento...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-emerald-600/20 text-emerald-400 rounded-xl flex items-center justify-center border border-emerald-500/30">
          <DollarSign size={20} />
        </div>
        <div>
          <h3 className="text-xl font-black text-white tracking-tight uppercase">Dados de Pagamento</h3>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Informações para recebimento de honorários</p>
        </div>
      </div>

      <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-4">
        <Info className="text-amber-500 flex-shrink-0 mt-0.5" size={18} />
        <p className="text-xs font-black text-amber-500 uppercase tracking-widest leading-relaxed">
          Confira sua chave PIX, os pagamentos serão enviados para esse dado.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        <div className="grid md:grid-cols-2 gap-6">
          {/* PIX Type */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
              <Wallet size={12} className="text-blue-500" />
              Tipo de Chave PIX
            </label>
            <select
              value={formData.tipo_chave_pix}
              onChange={(e) => setFormData({ ...formData, tipo_chave_pix: e.target.value as any })}
              className="w-full p-4 bg-slate-950 border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-white font-bold appearance-none transition-all"
            >
              <option value="CPF">CPF</option>
              <option value="Email">Email</option>
              <option value="Telefone">Telefone</option>
              <option value="Aleatória">Chave Aleatória</option>
            </select>
          </div>

          {/* PIX Key */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
              <CreditCard size={12} className="text-blue-500" />
              Chave PIX
            </label>
            <input
              type="text"
              required
              value={formData.chave_pix}
              onChange={(e) => setFormData({ ...formData, chave_pix: e.target.value })}
              placeholder="Digite sua chave PIX..."
              className="w-full p-4 bg-slate-950 border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-white font-bold transition-all placeholder:text-slate-600"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-white/5 space-y-6">
          <div className="flex items-center gap-3">
            <Building2 className="text-slate-500" size={18} />
            <h4 className="text-sm font-black text-white uppercase tracking-widest">Dados Bancários (Opcional)</h4>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Banco</label>
              <input
                type="text"
                value={formData.banco}
                onChange={(e) => setFormData({ ...formData, banco: e.target.value })}
                placeholder="Ex: Itaú, Bradesco..."
                className="w-full p-4 bg-slate-950 border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-white font-bold transition-all placeholder:text-slate-700"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Tipo de Conta</label>
              <select
                value={formData.tipo_conta}
                onChange={(e) => setFormData({ ...formData, tipo_conta: e.target.value as any })}
                className="w-full p-4 bg-slate-950 border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-white font-bold appearance-none transition-all"
              >
                <option value="">Selecione...</option>
                <option value="Corrente">Corrente</option>
                <option value="Poupança">Poupança</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Agência</label>
              <input
                type="text"
                value={formData.agencia}
                onChange={(e) => setFormData({ ...formData, agencia: e.target.value })}
                placeholder="0000"
                className="w-full p-4 bg-slate-950 border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-white font-bold transition-all placeholder:text-slate-700"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Conta</label>
              <input
                type="text"
                value={formData.conta}
                onChange={(e) => setFormData({ ...formData, conta: e.target.value })}
                placeholder="000000-0"
                className="w-full p-4 bg-slate-950 border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-white font-bold transition-all placeholder:text-slate-700"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={saving}
            className="px-8 py-4 bg-emerald-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-900/20 flex items-center gap-3 disabled:opacity-50"
          >
            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            Salvar Dados Bancários
          </button>
        </div>
      </form>
    </div>
  );
}
