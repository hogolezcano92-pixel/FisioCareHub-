import React, { useState, useEffect, useMemo } from 'react';
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
  ArrowRight,
  Tag,
  FileText as FileIcon
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import LibraryPaymentModal from '../components/LibraryPaymentModal';

interface LibrarySection {
  type: 'text' | 'step-by-step' | 'alert';
  content: any;
}

interface LibraryMaterial {
  id: string;
  title: string;
  description: string;
  clinical_objective?: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  type: 'educational' | 'exercise' | 'alert';
  price: number;
  price_cents?: number;
  complexity?: 'low' | 'medium' | 'high';
  topic?: string;
  is_premium: boolean;
  cover_image: string;
  file_url?: string;
  category: string;
  sections: LibrarySection[];
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
  const [selectedMaterial, setSelectedMaterial] = useState<LibraryMaterial | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

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

  const handleCheckout = () => {
    if (!user || cart.length === 0) return;
    setIsPaymentModalOpen(true);
  };

  const generatePDF = async (material: LibraryMaterial) => {
    try {
      setIsGeneratingPDF(true);
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      let yPos = 20;

      // Title
      doc.setFontSize(22);
      doc.setTextColor(30, 41, 59); // slate-800
      doc.text(material.title, 20, yPos);
      yPos += 15;

      // Category & Metadata
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text(`${material.category.toUpperCase()} | Nível: ${material.level} | Tipo: ${material.type}`, 20, yPos);
      yPos += 5;
      doc.line(20, yPos, 190, yPos);
      yPos += 15;

      // Objective
      if (material.clinical_objective) {
        doc.setFontSize(12);
        doc.setTextColor(30, 41, 59);
        doc.text("Objetivo Clínico:", 20, yPos);
        yPos += 8;
        doc.setFontSize(10);
        doc.setTextColor(71, 85, 105);
        const splitObjective = doc.splitTextToSize(material.clinical_objective, 170);
        doc.text(splitObjective, 20, yPos);
        yPos += (splitObjective.length * 6) + 10;
      }

      // Sections
      material.sections.forEach((section) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }

        if (section.type === 'text') {
          doc.setFontSize(14);
          doc.setTextColor(51, 65, 85);
          doc.text(section.content.title || "Informações", 20, yPos);
          yPos += 8;
          doc.setFontSize(10);
          doc.setTextColor(100, 116, 139);
          const splitBody = doc.splitTextToSize(section.content.body || "", 170);
          doc.text(splitBody, 20, yPos);
          yPos += (splitBody.length * 6) + 12;
        } else if (section.type === 'step-by-step') {
          doc.setFontSize(14);
          doc.setTextColor(51, 65, 85);
          doc.text("Guia de Execução", 20, yPos);
          yPos += 8;
          doc.setFontSize(10);
          doc.setTextColor(100, 116, 139);
          section.content.steps.forEach((step: string, idx: number) => {
            if (yPos > 270) { doc.addPage(); yPos = 20; }
            const splitStep = doc.splitTextToSize(`${idx + 1}. ${step}`, 160);
            doc.text(splitStep, 25, yPos);
            yPos += (splitStep.length * 6) + 2;
          });
          yPos += 10;
        } else if (section.type === 'alert') {
          doc.setFillColor(254, 242, 242); // bg-red-50
          doc.rect(15, yPos - 5, 180, 20, 'F');
          doc.setFontSize(11);
          doc.setTextColor(185, 28, 28); // text-red-700
          doc.text("⚠️ Alerta Clínico:", 20, yPos);
          yPos += 8;
          doc.setFontSize(10);
          const splitAlert = doc.splitTextToSize(section.content.message || "", 170);
          doc.text(splitAlert, 20, yPos);
          yPos += (splitAlert.length * 6) + 15;
        }
      });

      doc.save(`Material_Saude_${material.title.replace(/\s+/g, '_')}.pdf`);
      toast.success('PDF gerado com sucesso!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erro ao gerar o PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleAccess = (material: LibraryMaterial) => {
    setSelectedMaterial(material);
  };

  const categories = useMemo(() => ['Todas', ...CATEGORY_DATA.map(c => c.name)], []);

  const filteredMaterials = useMemo(() => materials.filter(m => {
    const matchesSearch = m.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         m.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'Todas' || m.category === selectedCategory;
    return matchesSearch && matchesCategory;
  }), [materials, searchQuery, selectedCategory]);

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

      <LibraryPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        materialIds={cart.map(item => item.id)}
        userId={user?.id || ''}
        email={user?.email || ''}
        onSuccess={() => {
          setCart([]);
          setShowCart(false);
          fetchData();
        }}
      />

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedMaterial && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedMaterial(null)}
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 rounded-[3rem] shadow-2xl border border-white/10 overflow-hidden flex flex-col"
            >
              <div className="p-8 border-b border-white/5 flex items-center justify-between bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
                <div>
                  <h2 className="text-2xl font-black text-white">{selectedMaterial.title}</h2>
                  <p className="text-xs text-sky-400 font-bold uppercase tracking-widest">{selectedMaterial.category}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => generatePDF(selectedMaterial)}
                    disabled={isGeneratingPDF}
                    className="p-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl transition-all flex items-center gap-2 text-xs font-black uppercase tracking-widest disabled:opacity-50"
                  >
                    {isGeneratingPDF ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                    PDF
                  </button>
                  <button onClick={() => setSelectedMaterial(null)} className="p-3 bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-500 rounded-2xl transition-all">
                    <X size={24} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                {/* Visual Header */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="aspect-[4/3] rounded-3xl overflow-hidden border border-white/10">
                    <img src={selectedMaterial.cover_image} className="w-full h-full object-cover" alt={selectedMaterial.title} />
                  </div>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Objetivo Clínico</h4>
                      <p className="text-lg font-bold text-white italic">{selectedMaterial.clinical_objective || "Melhora geral da saúde e funcionalidade."}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Nível</p>
                        <p className="text-sm font-black text-sky-400 capitalize">{selectedMaterial.level === 'beginner' ? 'Iniciante' : selectedMaterial.level === 'intermediate' ? 'Intermediário' : 'Avançado'}</p>
                      </div>
                      <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Tipo</p>
                        <p className="text-sm font-black text-sky-400 capitalize">{selectedMaterial.type === 'educational' ? 'Educativo' : selectedMaterial.type === 'exercise' ? 'Exercício' : 'Alerta'}</p>
                      </div>
                    </div>
                    <div className="p-4 bg-sky-500/5 rounded-2xl border border-sky-500/10">
                      <p className="text-xs text-slate-400 leading-relaxed">{selectedMaterial.description}</p>
                    </div>
                  </div>
                </div>

                {/* Content Sections */}
                <div className="space-y-12">
                  {selectedMaterial.sections.map((section, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="space-y-4"
                    >
                      {section.type === 'text' && (
                        <div className="space-y-4">
                          {section.content.title && (
                            <h5 className="text-xl font-black text-white flex items-center gap-3">
                              <div className="w-2 h-8 bg-sky-500 rounded-full" />
                              {section.content.title}
                            </h5>
                          )}
                          <div className="pl-5 border-l-2 border-white/5">
                            <p className="text-slate-400 leading-relaxed whitespace-pre-wrap">{section.content.body}</p>
                          </div>
                        </div>
                      )}

                      {section.type === 'step-by-step' && (
                        <div className="bg-slate-800/40 rounded-[2rem] p-8 space-y-6 border border-white/5">
                          <h5 className="text-lg font-black text-white flex items-center gap-3 uppercase tracking-tighter">
                            <CheckCircle2 className="text-emerald-500" size={24} />
                            Guia de Execução
                          </h5>
                          <div className="space-y-4">
                            {section.content.steps.map((step: string, sIdx: number) => (
                              <div key={sIdx} className="flex gap-4 group">
                                <div className="w-8 h-8 bg-white/5 rounded-full flex items-center justify-center text-sky-400 font-black text-xs shrink-0 group-hover:bg-sky-500 group-hover:text-white transition-all">
                                  {sIdx + 1}
                                </div>
                                <p className="text-slate-300 font-medium pt-1 leading-snug">{step}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {section.type === 'alert' && (
                        <div className="bg-rose-500/10 rounded-[2rem] p-8 border border-rose-500/20 flex gap-6">
                          <div className="w-12 h-12 bg-rose-500 text-white rounded-2xl flex items-center justify-center shrink-0">
                            <AlertCircle size={24} />
                          </div>
                          <div className="space-y-1">
                            <h5 className="font-black text-rose-500 uppercase tracking-widest text-xs">Atenção Médica</h5>
                            <p className="text-rose-200/80 font-medium leading-relaxed">{section.content.message}</p>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>

              {selectedMaterial.file_url && (
                <div className="p-8 border-t border-white/5 bg-slate-900/50">
                  <a 
                    href={selectedMaterial.file_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-full py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black flex items-center justify-center gap-3 transition-all border border-white/10"
                  >
                    <ExternalLink size={20} />
                    Ver Material Externo Complementar
                  </a>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
              className="fixed inset-y-0 right-0 w-full max-w-md bg-slate-900 z-[60] shadow-2xl flex flex-col border-l border-white/10 pt-header"
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
                  <div className="absolute top-4 left-4 flex flex-col gap-2">
                    <span className="px-3 py-1.5 bg-slate-900/90 backdrop-blur-md rounded-xl text-[10px] font-black text-sky-400 uppercase tracking-widest shadow-sm border border-white/10 w-fit">
                      {material.category}
                    </span>
                    <div className="flex gap-1">
                      <span className={cn(
                        "px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-tighter shadow-sm border border-white/10",
                        material.level === 'beginner' ? "bg-emerald-500/80 text-white" :
                        material.level === 'intermediate' ? "bg-amber-500/80 text-white" : "bg-rose-500/80 text-white"
                      )}>
                        {material.level === 'beginner' ? 'Iniciante' : material.level === 'intermediate' ? 'Interméd.' : 'Avançado'}
                      </span>
                      <span className="px-2 py-1 bg-blue-500/80 text-white rounded-lg text-[8px] font-black uppercase tracking-tighter shadow-sm border border-white/10">
                        {material.type === 'educational' ? 'Educação' : material.type === 'exercise' ? 'Prática' : 'Alerta'}
                      </span>
                    </div>
                  </div>
                  {material.is_premium && (
                    <div className="absolute top-4 right-4">
                      <div className="bg-amber-500 text-white px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest shadow-lg flex items-center gap-1">
                        <ShoppingCart size={10} />
                        Premium
                      </div>
                    </div>
                  )}
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

                    {isPurchased || !material.is_premium ? (
                      <button
                        onClick={() => handleAccess(material)}
                        className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-900/20"
                      >
                        <ExternalLink size={16} />
                        Ver Conteúdo
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
