import React, { useEffect, useState } from 'react';
import { BookOpen, Download, Star, ChevronRight, ShoppingCart, CheckCircle2, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';

export const DigitalLibrary = () => {
  const { profile } = useAuth();
  const [materiais, setMateriais] = useState<any[]>([]);
  const [purchasedIds, setPurchasedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!profile) return;
      
      try {
        const [materiaisRes, purchasesRes] = await Promise.all([
          supabase.from('materiais').select('*').order('created_at', { ascending: false }),
          supabase.from('compras_materiais').select('material_id').eq('user_id', profile.id)
        ]);
        
        if (materiaisRes.error) throw materiaisRes.error;
        setMateriais(materiaisRes.data || []);
        
        if (purchasesRes.data) {
          setPurchasedIds(purchasesRes.data.map(p => p.material_id));
        }
      } catch (err) {
        console.error("Erro ao buscar dados da biblioteca:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [profile]);

  const handleBuy = async (material: any) => {
    if (!profile) {
      toast.error("Você precisa estar logado para comprar.");
      return;
    }

    // Se já comprou, apenas abre o link
    if (purchasedIds.includes(material.id)) {
      if (material.arquivo_url) {
        window.open(material.arquivo_url, '_blank');
      } else {
        toast.info("Este material não possui um link de download disponível.");
      }
      return;
    }

    setBuyingId(material.id);
    try {
      const { config } = await import('../../config/api');
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
          user_id: profile.id,
          email: profile.email,
          product_id: material.id,
          type: 'material',
          plan: 'material',
          service_name: material.titulo,
          amount: material.preco,
          appointment_id: null
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao criar checkout');
      
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      console.error("Erro ao iniciar compra:", err);
      toast.error("Erro ao processar compra. Tente novamente.");
    } finally {
      setBuyingId(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-900 p-8 rounded-2xl border border-white/5 shadow-2xl flex flex-col items-center justify-center space-y-3">
        <Loader2 className="text-blue-400 animate-spin" size={24} />
        <p className="text-slate-400 text-xs font-bold">Carregando biblioteca...</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/50 backdrop-blur-xl p-4 rounded-2xl border border-white/10 shadow-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h3 className="text-sm font-black text-white tracking-tight flex items-center gap-2">
            <BookOpen className="text-blue-400" size={18} />
            Biblioteca
          </h3>
          <p className="text-slate-400 text-[9px] font-medium">Materiais para sua recuperação.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {materiais.map((product, i) => {
          const isPurchased = purchasedIds.includes(product.id);
          
          return (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="group relative bg-white/5 rounded-xl border border-white/5 overflow-hidden hover:shadow-lg transition-all duration-500 flex flex-col"
            >
              <div className="relative h-28 overflow-hidden">
                <img 
                  src={product.imagem_url || 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=400'} 
                  alt={product.titulo}
                  className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-700"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-2 left-2 flex gap-1.5">
                  <span className="px-1.5 py-0.5 bg-blue-600 text-white text-[7px] font-black uppercase tracking-widest rounded-full shadow-lg">
                    {product.tag || 'Novo'}
                  </span>
                  {isPurchased && (
                    <span className="px-1.5 py-0.5 bg-emerald-500 text-white text-[7px] font-black uppercase tracking-widest rounded-full shadow-lg flex items-center gap-1">
                      <CheckCircle2 size={7} />
                      Adquirido
                    </span>
                  )}
                </div>
              </div>

              <div className="p-3 space-y-2 flex-1 flex flex-col">
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-amber-400">
                    <Star size={8} fill="currentColor" />
                    <span className="text-[9px] font-black text-white">4.9</span>
                  </div>
                  <h4 className="text-xs font-black text-white tracking-tight leading-tight group-hover:text-blue-400 transition-colors">
                    {product.titulo}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-medium line-clamp-2">
                    {product.descricao}
                  </p>
                </div>

                <div className="pt-1.5 mt-auto flex items-center justify-between">
                  {!isPurchased ? (
                    <>
                      <div className="space-y-0.5">
                        <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Preço</p>
                        <p className="text-sm font-black text-white">R$ {product.preco?.toLocaleString()}</p>
                      </div>
                      <button 
                        onClick={() => handleBuy(product)}
                        disabled={buyingId === product.id}
                        className="p-2 bg-white/5 text-blue-400 rounded-lg border border-white/5 hover:bg-blue-600 hover:text-white transition-all disabled:opacity-50 group/btn"
                      >
                        {buyingId === product.id ? <Loader2 className="animate-spin" size={14} /> : <ShoppingCart size={14} className="group-hover/btn:scale-110 transition-transform" />}
                      </button>
                    </>
                  ) : (
                    <button 
                      onClick={() => handleBuy(product)}
                      className="w-full h-8 bg-emerald-600 text-white rounded-lg font-black text-[9px] uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20"
                    >
                      <Download size={12} />
                      Acessar
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}

        {materiais.length === 0 && (
          <div className="col-span-full p-6 bg-white/5 rounded-xl border border-dashed border-white/10 text-center">
            <p className="text-slate-500 text-[10px] font-bold">Nenhum material disponível.</p>
          </div>
        )}
      </div>

      <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 flex items-center gap-3">
        <div className="w-8 h-8 bg-white/10 text-blue-400 rounded-lg flex items-center justify-center border border-white/5 shrink-0">
          <CheckCircle2 size={16} />
        </div>
        <div>
          <p className="font-black text-white text-[10px]">Suporte Extra</p>
          <p className="text-[9px] font-medium text-slate-400">Materiais que complementam seu tratamento.</p>
        </div>
      </div>
    </div>
  );
};
