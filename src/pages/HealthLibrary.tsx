import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  BookOpen, 
  Search, 
  Filter, 
  Download, 
  ExternalLink, 
  ShoppingCart, 
  CheckCircle2,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

interface LibraryMaterial {
  id: string;
  title: string;
  description: string;
  price: number;
  cover_image: string;
  file_url: string;
  category: string;
  created_at: string;
}

interface Purchase {
  material_id: string;
}

export default function HealthLibrary() {
  const { user } = useAuth();
  const [materials, setMaterials] = useState<LibraryMaterial[]>([]);
  const [purchases, setPurchases] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [buyingId, setBuyingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch materials
      const { data: materialsData, error: materialsError } = await supabase
        .from('library_materials')
        .select('*')
        .order('created_at', { ascending: false });

      if (materialsError) throw materialsError;
      setMaterials(materialsData || []);

      // Fetch user purchases
      const { data: purchasesData, error: purchasesError } = await supabase
        .from('material_purchases')
        .select('material_id')
        .eq('patient_id', user?.id);

      if (purchasesError) throw purchasesError;
      
      const purchaseSet = new Set<string>((purchasesData || []).map(p => p.material_id));
      setPurchases(purchaseSet);

    } catch (error) {
      console.error('Error fetching library data:', error);
      toast.error('Erro ao carregar a biblioteca');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (material: LibraryMaterial) => {
    if (!user) return;
    
    try {
      setBuyingId(material.id);
      
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 1500));

      const { error } = await supabase
        .from('material_purchases')
        .insert({
          patient_id: user.id,
          material_id: material.id,
          purchased_at: new Date().toISOString()
        });

      if (error) throw error;

      setPurchases(prev => new Set([...prev, material.id]));
      toast.success(`Material "${material.title}" adquirido com sucesso!`);
    } catch (error) {
      console.error('Error purchasing material:', error);
      toast.error('Erro ao processar a compra');
    } finally {
      setBuyingId(null);
    }
  };

  const handleAccess = (url: string) => {
    window.open(url, '_blank');
  };

  const categories = ['Todas', ...new Set(materials.map(m => m.category))];

  const filteredMaterials = materials.filter(m => {
    const matchesSearch = m.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         m.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'Todas' || m.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
        <p className="text-slate-500 font-medium">Carregando biblioteca...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Biblioteca de Saúde</h1>
          <p className="text-slate-500 font-medium">Materiais educativos e guias para sua performance e reabilitação.</p>
        </div>
      </header>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar materiais..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium text-slate-900 shadow-sm"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={cn(
                "px-6 py-4 rounded-2xl text-sm font-black whitespace-nowrap transition-all uppercase tracking-widest",
                selectedCategory === category
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                  : "bg-white text-slate-500 border border-slate-100 hover:bg-slate-50"
              )}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filteredMaterials.length === 0 ? (
        <div className="bg-white p-20 rounded-[3rem] border border-slate-100 text-center space-y-4">
          <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto">
            <BookOpen size={40} />
          </div>
          <h3 className="text-xl font-bold text-slate-900">Nenhum material encontrado</h3>
          <p className="text-slate-500 max-w-xs mx-auto">Tente ajustar sua busca ou filtro para encontrar o que procura.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredMaterials.map((material, index) => {
            const isPurchased = purchases.has(material.id);
            const isBuying = buyingId === material.id;

            return (
              <motion.div
                key={material.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-blue-900/5 transition-all overflow-hidden flex flex-col"
              >
                {/* Cover Image */}
                <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                  <img
                    src={material.cover_image || `https://picsum.photos/seed/${material.id}/800/500`}
                    alt={material.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1.5 bg-white/90 backdrop-blur-md rounded-xl text-[10px] font-black text-blue-600 uppercase tracking-widest shadow-sm">
                      {material.category}
                    </span>
                  </div>
                  {isPurchased && (
                    <div className="absolute top-4 right-4">
                      <div className="bg-emerald-500 text-white p-1.5 rounded-full shadow-lg">
                        <CheckCircle2 size={16} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-8 flex-1 flex flex-col space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-xl font-black text-slate-900 leading-tight group-hover:text-blue-600 transition-colors">
                      {material.title}
                    </h3>
                    <p className="text-sm text-slate-500 font-medium line-clamp-2 leading-relaxed">
                      {material.description}
                    </p>
                  </div>

                  <div className="pt-4 mt-auto flex items-center justify-between border-t border-slate-50">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Preço</span>
                      <span className="text-2xl font-black text-slate-900">
                        {material.price === 0 ? 'Grátis' : `R$ ${material.price.toFixed(2)}`}
                      </span>
                    </div>

                    {isPurchased ? (
                      <button
                        onClick={() => handleAccess(material.file_url)}
                        className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-200"
                      >
                        <ExternalLink size={16} />
                        Acessar
                      </button>
                    ) : (
                      <button
                        onClick={() => handlePurchase(material)}
                        disabled={isBuying}
                        className={cn(
                          "flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg",
                          isBuying 
                            ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
                            : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200"
                        )}
                      >
                        {isBuying ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <ShoppingCart size={16} />
                        )}
                        {isBuying ? 'Processando...' : 'Comprar'}
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Info Banner */}
      <div className="bg-blue-50/50 rounded-[2.5rem] p-8 flex flex-col md:flex-row items-center gap-6 border border-blue-100/50">
        <div className="w-16 h-16 bg-blue-600 text-white rounded-3xl flex items-center justify-center shadow-lg shadow-blue-200 shrink-0">
          <AlertCircle size={32} />
        </div>
        <div className="space-y-1 text-center md:text-left">
          <h4 className="text-lg font-black text-blue-900">Dúvidas sobre os materiais?</h4>
          <p className="text-sm text-blue-700 font-medium">
            Todos os materiais são desenvolvidos por especialistas e revisados por nossa equipe técnica. 
            Em caso de problemas com o download, entre em contato com o suporte.
          </p>
        </div>
      </div>
    </div>
  );
}
