import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  Search, 
  Filter, 
  Download, 
  ExternalLink, 
  ShoppingCart, 
  CheckCircle2,
  Loader2,
  AlertCircle,
  X,
  Trash2,
  ArrowRight
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
  const [cart, setCart] = useState<LibraryMaterial[]>([]);
  const [showCart, setShowCart] = useState(false);

  const CATEGORY_DATA = [
    { name: 'Exercícios e Reabilitação', price: 35.99, image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&q=80&w=800' },
    { name: 'Dor Lombar', price: 45.99, image: 'https://images.unsplash.com/photo-1591258739299-5b65d5cbb235?auto=format&fit=crop&q=80&w=800' },
    { name: 'Lesões Esportivas', price: 50.00, image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&q=80&w=800' },
    { name: 'Postura', price: 18.99, image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=800' },
    { name: 'Mobilidade', price: 25.99, image: 'https://images.unsplash.com/photo-1552196563-55cd4e45efb3?auto=format&fit=crop&q=80&w=800' },
    { name: 'Recuperação Pós-Cirúrgica', price: 65.99, image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=800' }
  ];

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch materials - Wrap in try-catch to handle missing tables
      const { data: materialsData, error: materialsError } = await supabase
        .from('library_materials')
        .select('*')
        .order('created_at', { ascending: false });

      if (materialsError) {
        console.warn('Table library_materials might not exist yet:', materialsError);
        // Fallback to empty or sample if needed, but we'll just show empty for now
        setMaterials([]);
      } else {
        setMaterials(materialsData || []);
      }

      // Fetch user purchases
      const { data: purchasesData, error: purchasesError } = await supabase
        .from('material_purchases')
        .select('material_id')
        .eq('patient_id', user?.id);

      if (purchasesError) {
        console.warn('Table material_purchases might not exist yet:', purchasesError);
      } else {
        const purchaseSet = new Set<string>((purchasesData || []).map(p => p.material_id));
        setPurchases(purchaseSet);
      }

    } catch (error) {
      console.error('Error fetching library data:', error);
      // Don't toast error if it's just missing tables during initial setup
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (material: LibraryMaterial) => {
    if (purchases.has(material.id)) {
      toast.info('Você já possui este material');
      return;
    }
    if (cart.find(item => item.id === material.id)) {
      toast.info('Item já está no carrinho');
      return;
    }
    setCart([...cart, material]);
    toast.success('Adicionado ao carrinho');
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const handleCheckout = async () => {
    if (!user || cart.length === 0) return;
    
    try {
      setLoading(true);
      
      // Process each item in cart
      for (const item of cart) {
        const { error } = await supabase
          .from('material_purchases')
          .insert({
            patient_id: user.id,
            material_id: item.id,
            purchased_at: new Date().toISOString()
          });
        if (error) throw error;
      }

      const purchasedIds = cart.map(item => item.id);
      setPurchases(prev => new Set([...prev, ...purchasedIds]));
      setCart([]);
      setShowCart(false);
      toast.success('Compra realizada com sucesso!');
    } catch (error) {
      console.error('Error during checkout:', error);
      toast.error('Erro ao processar o pagamento');
    } finally {
      setLoading(false);
    }
  };

  const handleAccess = (url: string) => {
    window.open(url, '_blank');
  };

  const categories = ['Todas', ...CATEGORY_DATA.map(c => c.name)];

  const filteredMaterials = materials.filter(m => {
    const matchesSearch = m.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         m.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'Todas' || m.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading && materials.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-12 h-12 text-sky-500 animate-spin" />
        <p className="text-slate-400 font-medium">Carregando biblioteca...</p>
      </div>
    );
  }

  const cartTotal = cart.reduce((sum, item) => sum + item.price, 0);

  return (
    <div className="space-y-8 pb-12 relative">
      {/* Cart Toggle Button - Moved to Top Right to avoid overlap with Support/AI buttons */}
      <button
        onClick={() => setShowCart(true)}
        className="fixed top-24 right-4 md:top-28 md:right-8 z-50 bg-sky-500 text-white p-4 rounded-3xl shadow-2xl hover:scale-110 hover:bg-sky-600 transition-all flex items-center gap-3 group shadow-sky-900/40 border-2 border-white/20 backdrop-blur-md"
      >
        <div className="relative">
          <ShoppingCart size={24} />
          {cart.length > 0 && (
            <span className="absolute -top-3 -right-3 bg-rose-500 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-slate-900 animate-bounce">
              {cart.length}
            </span>
          )}
        </div>
        <div className="hidden md:flex flex-col items-start leading-none pr-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-sky-100">Meu</span>
          <span className="text-sm font-black">Carrinho</span>
        </div>
      </button>

      {/* Cart Sidebar Overlay */}
      <AnimatePresence>
        {showCart && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCart(false)}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[55]"
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="fixed inset-y-0 right-0 w-full max-w-md bg-slate-900 z-[60] shadow-2xl flex flex-col border-l border-white/10"
            >
              <div className="p-8 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-sky-500/10 text-sky-400 rounded-2xl flex items-center justify-center">
                    <ShoppingCart size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white">Seu Carrinho</h2>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{cart.length} itens</p>
                  </div>
                </div>
                <button onClick={() => setShowCart(false)} className="p-2 hover:bg-white/5 rounded-xl transition-all">
                  <X size={24} className="text-slate-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-6">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                    <div className="w-20 h-20 bg-white/5 text-slate-700 rounded-full flex items-center justify-center">
                      <ShoppingCart size={40} />
                    </div>
                    <p className="text-slate-500 font-medium">Seu carrinho está vazio.</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div key={item.id} className="flex gap-4 p-4 bg-white/5 rounded-3xl group relative border border-white/5">
                      <img src={item.cover_image} className="w-20 h-20 rounded-2xl object-cover" alt={item.title} />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-white truncate">{item.title}</h4>
                        <p className="text-xs text-slate-400 font-medium">{item.category}</p>
                        <p className="text-sky-400 font-black mt-1">R$ {item.price.toFixed(2)}</p>
                      </div>
                      <button 
                        onClick={() => removeFromCart(item.id)}
                        className="p-2 text-rose-400 hover:text-rose-600 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {cart.length > 0 && (
                <div className="p-8 border-t border-white/5 space-y-6">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-bold uppercase tracking-widest text-xs">Total</span>
                    <span className="text-3xl font-black text-white">R$ {cartTotal.toFixed(2)}</span>
                  </div>
                  <button
                    onClick={handleCheckout}
                    className="w-full py-5 bg-sky-500 text-white rounded-[2rem] font-black text-lg shadow-xl shadow-sky-900/20 hover:bg-sky-600 transition-all flex items-center justify-center gap-3"
                  >
                    Finalizar Compra
                    <ArrowRight size={20} />
                  </button>
                </div>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400 tracking-tight">Biblioteca de Saúde</h1>
          <p className="text-slate-400 font-medium">Materiais educativos e guias para sua performance e reabilitação.</p>
        </div>
      </header>

      {/* Category Showcase */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {CATEGORY_DATA.map((cat) => (
          <button
            key={cat.name}
            onClick={() => setSelectedCategory(cat.name)}
            className={cn(
              "group relative aspect-square rounded-[2rem] overflow-hidden border-2 transition-all",
              selectedCategory === cat.name ? "border-sky-500 scale-95" : "border-transparent hover:border-white/10"
            )}
          >
            <img src={cat.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={cat.name} />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent flex flex-col justify-end p-4 text-left">
              <p className="text-[10px] font-black text-sky-400 uppercase tracking-widest mb-1">A partir de</p>
              <p className="text-white font-black text-xs leading-tight">{cat.name}</p>
              <p className="text-white/80 font-bold text-[10px] mt-1">R$ {cat.price.toFixed(2)}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar materiais..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all font-medium text-white shadow-sm"
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
                  ? "bg-sky-500 text-white shadow-lg shadow-sky-900/20"
                  : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10"
              )}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filteredMaterials.length === 0 ? (
        <div className="bg-slate-900/50 backdrop-blur-xl p-20 rounded-[3rem] border border-white/10 text-center space-y-4">
          <div className="w-20 h-20 bg-white/5 text-slate-700 rounded-full flex items-center justify-center mx-auto">
            <BookOpen size={40} />
          </div>
          <h3 className="text-xl font-bold text-white">Nenhum material encontrado</h3>
          <p className="text-slate-400 max-w-xs mx-auto">
            {materials.length === 0 
              ? "A biblioteca está sendo preparada. Em breve teremos materiais incríveis para você!"
              : "Tente ajustar sua busca ou filtro para encontrar o que procura."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredMaterials.map((material, index) => {
            const isPurchased = purchases.has(material.id);
            const inCart = cart.find(item => item.id === material.id);

            return (
              <motion.div
                key={material.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group bg-slate-900/50 backdrop-blur-xl rounded-[2.5rem] border border-white/10 shadow-sm hover:shadow-2xl hover:shadow-sky-900/20 transition-all overflow-hidden flex flex-col"
              >
                {/* Cover Image */}
                <div className="relative aspect-[16/10] overflow-hidden bg-white/5">
                  <img
                    src={material.cover_image || `https://picsum.photos/seed/${material.id}/800/500`}
                    alt={material.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1.5 bg-slate-900/90 backdrop-blur-md rounded-xl text-[10px] font-black text-sky-400 uppercase tracking-widest shadow-sm border border-white/10">
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
                    <h3 className="text-xl font-black text-white leading-tight group-hover:text-sky-400 transition-colors">
                      {material.title}
                    </h3>
                    <p className="text-sm text-slate-400 font-medium line-clamp-2 leading-relaxed">
                      {material.description}
                    </p>
                  </div>

                  <div className="pt-4 mt-auto flex items-center justify-between border-t border-white/5">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Preço</span>
                      <span className="text-2xl font-black text-white">
                        {material.price === 0 ? 'Grátis' : `R$ ${material.price.toFixed(2)}`}
                      </span>
                    </div>

                    {isPurchased ? (
                      <button
                        onClick={() => handleAccess(material.file_url)}
                        className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-900/20"
                      >
                        <ExternalLink size={16} />
                        Acessar
                      </button>
                    ) : (
                      <button
                        onClick={() => addToCart(material)}
                        className={cn(
                          "flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg",
                          inCart 
                            ? "bg-emerald-500/10 text-emerald-400 shadow-emerald-900/20 border border-emerald-500/20" 
                            : "bg-sky-500 text-white hover:bg-sky-600 shadow-sky-900/20"
                        )}
                      >
                        {inCart ? <CheckCircle2 size={16} /> : <ShoppingCart size={16} />}
                        {inCart ? 'No Carrinho' : 'Comprar'}
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
      <div className="bg-sky-500/5 rounded-[2.5rem] p-8 flex flex-col md:flex-row items-center gap-6 border border-sky-500/10">
        <div className="w-16 h-16 bg-sky-500 text-white rounded-3xl flex items-center justify-center shadow-lg shadow-sky-900/20 shrink-0">
          <AlertCircle size={32} />
        </div>
        <div className="space-y-1 text-center md:text-left">
          <h4 className="text-lg font-black text-sky-400">Dúvidas sobre os materiais?</h4>
          <p className="text-sm text-slate-400 font-medium">
            Todos os materiais são desenvolvidos por especialistas e revisados por nossa equipe técnica. 
            Em caso de problemas com o download, entre em contato com o suporte.
          </p>
        </div>
      </div>
    </div>
  );
}
