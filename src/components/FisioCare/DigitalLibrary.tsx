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
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          user_id: profile.id,
          email: profile.email,
          product_id: material.id,
          type: 'material'
        }
      });

      if (error) throw error;
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
      <div className="bg-white/70 backdrop-blur-xl p-12 rounded-[3rem] border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="text-blue-600 animate-spin" size={48} />
        <p className="text-slate-500 font-bold">Carregando biblioteca...</p>
      </div>
    );
  }

  return (
    <div className="bg-white/70 backdrop-blur-xl p-8 rounded-[3rem] border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <BookOpen className="text-blue-600" size={32} />
            Biblioteca de Cuidados
          </h3>
          <p className="text-slate-500 font-medium">Materiais exclusivos para potencializar sua recuperação.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {materiais.map((product, i) => {
          const isPurchased = purchasedIds.includes(product.id);
          
          return (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="group relative bg-white/50 backdrop-blur-sm rounded-[2.5rem] border border-white overflow-hidden hover:shadow-2xl hover:shadow-blue-100/50 transition-all duration-500 flex flex-col"
            >
              <div className="relative h-48 overflow-hidden">
                <img 
                  src={product.imagem_url || 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=400'} 
                  alt={product.titulo}
                  className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-700"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-4 left-4 flex gap-2">
                  <span className="px-4 py-2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg">
                    {product.tag || 'Novo'}
                  </span>
                  {isPurchased && (
                    <span className="px-4 py-2 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg flex items-center gap-1">
                      <CheckCircle2 size={10} />
                      Adquirido
                    </span>
                  )}
                </div>
              </div>

              <div className="p-6 space-y-4 flex-1 flex flex-col">
                <div className="space-y-2">
                  <div className="flex items-center gap-1 text-amber-400">
                    <Star size={14} fill="currentColor" />
                    <span className="text-xs font-black text-slate-900">4.9</span>
                    <span className="text-xs font-medium text-slate-400">(128 avaliações)</span>
                  </div>
                  <h4 className="text-xl font-black text-slate-900 tracking-tight leading-tight group-hover:text-blue-600 transition-colors">
                    {product.titulo}
                  </h4>
                  <p className="text-sm text-slate-500 font-medium line-clamp-2">
                    {product.descricao}
                  </p>
                </div>

                <div className="pt-4 mt-auto flex items-center justify-between">
                  {!isPurchased ? (
                    <>
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Preço Único</p>
                        <p className="text-2xl font-black text-slate-900">R$ {product.preco?.toLocaleString()}</p>
                      </div>
                      <button 
                        onClick={() => handleBuy(product)}
                        disabled={buyingId === product.id}
                        className="p-4 bg-white text-blue-600 rounded-2xl shadow-sm border border-slate-100 hover:bg-blue-600 hover:text-white hover:shadow-lg hover:shadow-blue-100 transition-all disabled:opacity-50 group/btn"
                      >
                        {buyingId === product.id ? <Loader2 className="animate-spin" size={24} /> : <ShoppingCart size={24} className="group-hover/btn:scale-110 transition-transform" />}
                      </button>
                    </>
                  ) : (
                    <button 
                      onClick={() => handleBuy(product)}
                      className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-100"
                    >
                      <Download size={20} />
                      Acessar Conteúdo
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}

        {materiais.length === 0 && (
          <div className="col-span-full p-12 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200 text-center">
            <p className="text-slate-400 font-bold">Nenhum material disponível no momento.</p>
          </div>
        )}
      </div>

      <div className="p-6 bg-blue-50 rounded-[2rem] border border-blue-100 flex items-center gap-4">
        <div className="w-12 h-12 bg-white text-blue-600 rounded-2xl flex items-center justify-center shadow-sm border border-slate-100">
          <CheckCircle2 size={24} />
        </div>
        <div>
          <p className="font-black text-blue-900">Suporte Extra</p>
          <p className="text-sm font-medium text-blue-700">Adquira materiais que complementam seu tratamento em casa.</p>
        </div>
      </div>
    </div>
  );
};
