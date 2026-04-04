import React from 'react';
import { BookOpen, Download, Star, ChevronRight, ShoppingCart, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

export const DigitalLibrary = () => {
  const products = [
    {
      id: '1',
      title: 'Manual do Cuidador de Idosos',
      description: 'Guia completo com técnicas de mobilização, higiene e cuidados diários para familiares.',
      price: 'R$ 47,00',
      rating: 4.9,
      reviews: 128,
      image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&q=80&w=400',
      tag: 'Mais Vendido',
      color: 'bg-blue-600 shadow-blue-100'
    },
    {
      id: '2',
      title: 'E-book: Fim da Dor Lombar em 21 dias',
      description: 'Protocolo de exercícios terapêuticos e ergonomia para eliminar dores nas costas.',
      price: 'R$ 67,00',
      rating: 4.8,
      reviews: 95,
      image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=400',
      tag: 'Recomendado',
      color: 'bg-emerald-600 shadow-emerald-100'
    }
  ];

  return (
    <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <BookOpen className="text-blue-600" size={32} />
            Biblioteca de Cuidados
          </h3>
          <p className="text-slate-500 font-medium">Materiais exclusivos para potencializar sua recuperação.</p>
        </div>
        <div className="flex items-center gap-2 text-blue-600 font-black text-sm cursor-pointer hover:underline">
          Ver todos <ChevronRight size={16} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {products.map((product, i) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="group relative bg-slate-50 rounded-[2.5rem] border border-slate-100 overflow-hidden hover:shadow-2xl hover:shadow-slate-100 transition-all flex flex-col"
          >
            <div className="relative h-48 overflow-hidden">
              <img 
                src={product.image} 
                alt={product.title}
                className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-700"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-4 left-4">
                <span className={cn("px-4 py-2 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg", product.color)}>
                  {product.tag}
                </span>
              </div>
            </div>

            <div className="p-6 space-y-4 flex-1 flex flex-col">
              <div className="space-y-2">
                <div className="flex items-center gap-1 text-amber-400">
                  <Star size={14} fill="currentColor" />
                  <span className="text-xs font-black text-slate-900">{product.rating}</span>
                  <span className="text-xs font-medium text-slate-400">({product.reviews} avaliações)</span>
                </div>
                <h4 className="text-xl font-black text-slate-900 tracking-tight leading-tight group-hover:text-blue-600 transition-colors">
                  {product.title}
                </h4>
                <p className="text-sm text-slate-500 font-medium line-clamp-2">
                  {product.description}
                </p>
              </div>

              <div className="pt-4 mt-auto flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Preço Único</p>
                  <p className="text-2xl font-black text-slate-900">{product.price}</p>
                </div>
                <button className="p-4 bg-white text-blue-600 rounded-2xl shadow-sm border border-slate-100 hover:bg-blue-600 hover:text-white transition-all">
                  <ShoppingCart size={24} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
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
