import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  BookOpen, 
  Download, 
  ShoppingCart, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

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
  is_premium: boolean;
  cover_image: string;
  file_url?: string;
  category: string;
  sections: LibrarySection[];
  created_at: string;
}

export default function LibraryMaterialDetail() {
  const { slug } = useParams(); // Using slug (initially mapping to ID for simplicity or slug if exists)
  const { user } = useAuth();
  const navigate = useNavigate();
  const [material, setMaterial] = useState<LibraryMaterial | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPurchased, setIsPurchased] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  useEffect(() => {
    fetchMaterial();
  }, [slug, user]);

  const fetchMaterial = async () => {
    if (!slug) return;
    
    try {
      setLoading(true);
      
      // Try to find by slug first, fallback to guest/ID if standard
      let query = supabase.from('library_materials').select('*');
      
      // Check if slug looks like a UUID
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
      
      if (isUuid) {
        query = query.eq('id', slug);
      } else {
        // Assume we might have a slug column or search in title (simplified)
        query = query.ilike('title', `%${slug.replace(/-/g, ' ')}%`);
      }

      const { data, error } = await query.single();

      if (error || !data) {
        console.error('Error fetching material:', error);
        setMaterial(null);
      } else {
        setMaterial(data);
        document.title = `${data.title} - Biblioteca de Saúde | FisioCareHub`;
        
        // Check purchase if user logged in
        if (user) {
          const { data: purchaseData } = await supabase
            .from('material_purchases')
            .select('*')
            .eq('patient_id', user.id)
            .eq('material_id', data.id)
            .single();
          
          setIsPurchased(!!purchaseData);
        }
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = async (material: LibraryMaterial) => {
    if (!isPurchased && material.is_premium) {
       toast.error('Você precisa adquirir este material para baixar o PDF');
       return;
    }
    
    try {
      setIsGeneratingPDF(true);
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      let yPos = 20;

      doc.setFontSize(22);
      doc.text(material.title, 20, yPos);
      yPos += 15;
      
      doc.setFontSize(10);
      doc.text(`${material.category.toUpperCase()} | Nível: ${material.level}`, 20, yPos);
      yPos += 15;

      material.sections.forEach((section) => {
        if (yPos > 270) { doc.addPage(); yPos = 20; }
        if (section.type === 'text') {
          doc.setFontSize(14);
          doc.text(section.content.title || "Info", 20, yPos);
          yPos += 10;
          doc.setFontSize(10);
          const lines = doc.splitTextToSize(section.content.body || "", 170);
          doc.text(lines, 20, yPos);
          yPos += (lines.length * 6) + 10;
        }
      });

      doc.save(`FisioCare_${material.title.replace(/\s+/g, '_')}.pdf`);
      toast.success('PDF baixado!');
    } catch (error) {
      toast.error('Erro ao gerar PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
      </div>
    );
  }

  if (!material) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center space-y-6">
        <div className="w-20 h-20 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center">
          <BookOpen size={40} />
        </div>
        <h1 className="text-2xl font-black text-white">Material não encontrado</h1>
        <p className="text-slate-400 max-w-sm">Desculpe, o material que você procura não existe ou foi removido.</p>
        <Link to="/biblioteca" className="px-8 py-4 bg-sky-500 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-sky-600 transition-all">
          Voltar para Biblioteca
        </Link>
      </div>
    );
  }

  const canAccessFullContent = isPurchased || !material.is_premium;

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 space-y-12">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
        <Link to="/" className="hover:text-white transition-colors">Home</Link>
        <ChevronRight size={14} />
        <Link to="/biblioteca" className="hover:text-white transition-colors">Biblioteca</Link>
        <ChevronRight size={14} />
        <span className="text-sky-400 truncate max-w-[200px]">{material.title}</span>
      </nav>

      {/* Hero */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="aspect-[4/3] rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl shadow-sky-900/20"
        >
          <img src={material.cover_image} className="w-full h-full object-cover" alt={material.title} />
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          <div className="space-y-2">
            <span className="px-3 py-1.5 bg-sky-500/10 text-sky-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-sky-500/20">
              {material.category}
            </span>
            <h1 className="text-4xl font-black text-white leading-tight tracking-tighter">{material.title}</h1>
          </div>

          <p className="text-slate-400 text-lg leading-relaxed">{material.description}</p>

          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Preço Individual</span>
              <span className="text-3xl font-black text-white">
                {material.price === 0 ? 'Grátis' : `R$ ${material.price.toFixed(2)}`}
              </span>
            </div>
          </div>

          {!canAccessFullContent ? (
            <Link 
              to="/login"
              className="w-full py-5 bg-sky-500 text-white rounded-[2rem] font-black text-lg flex items-center justify-center gap-3 hover:bg-sky-600 transition-all shadow-xl shadow-sky-900/20"
            >
              <ShoppingCart size={20} />
              Comprar Material
            </Link>
          ) : (
             <button
                onClick={() => generatePDF(material)}
                disabled={isGeneratingPDF}
                className="w-full py-5 bg-emerald-500 text-white rounded-[2rem] font-black text-lg flex items-center justify-center gap-3 hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-900/20"
             >
                {isGeneratingPDF ? <Loader2 className="animate-spin" /> : <Download size={20} />}
                Baixar Guia PDF
             </button>
          )}
        </motion.div>
      </div>

      {/* Preview / Content */}
      <div className="space-y-8 bg-slate-900/50 backdrop-blur-xl p-8 md:p-12 rounded-[3rem] border border-white/10">
        {!canAccessFullContent ? (
          <div className="text-center py-20 space-y-6">
            <div className="w-20 h-20 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto">
              <ShoppingCart size={40} />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-white">Conteúdo Premium</h3>
              <p className="text-slate-400 max-w-sm mx-auto">Este material completo está disponível para membros. Adquira agora para ter acesso ilimitado ao guia, exercícios e vídeo aulas.</p>
            </div>
            <Link to="/login" className="inline-block px-8 py-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-2xl font-black uppercase tracking-widest transition-all">
              Login para Desbloquear
            </Link>
          </div>
        ) : (
          <div className="space-y-12">
             {material.sections.map((section, idx) => (
                <div key={idx} className="space-y-6">
                   {section.type === 'text' && (
                      <div className="space-y-4">
                         <h3 className="text-2xl font-black text-white flex items-center gap-3">
                            <div className="w-2 h-8 bg-sky-500 rounded-full" />
                            {section.content.title}
                         </h3>
                         <p className="text-slate-300 leading-relaxed text-lg whitespace-pre-wrap">{section.content.body}</p>
                      </div>
                   )}
                   {section.type === 'step-by-step' && (
                      <div className="bg-slate-800/50 rounded-[2rem] p-8 border border-white/5 space-y-6">
                         <h3 className="text-xl font-black text-white flex items-center gap-3 uppercase tracking-tighter">
                            <CheckCircle2 className="text-emerald-500" size={24} />
                            Guia de Execução
                         </h3>
                         <div className="grid gap-4">
                            {section.content.steps.map((step: string, sIdx: number) => (
                               <div key={sIdx} className="flex gap-4 p-4 hover:bg-white/5 rounded-2xl transition-all group">
                                  <div className="w-8 h-8 bg-sky-500 text-white rounded-full flex items-center justify-center font-black text-xs shrink-0 ring-4 ring-sky-500/10">
                                     {sIdx + 1}
                                  </div>
                                  <p className="text-slate-300 font-bold pt-1">{step}</p>
                               </div>
                            ))}
                         </div>
                      </div>
                   )}
                </div>
             ))}
          </div>
        )}
      </div>

      {/* Footer Call to action */}
      <div className="text-center space-y-6 py-12">
         <h2 className="text-2xl font-black text-white">Gostou deste material?</h2>
         <p className="text-slate-400">Explore centenas de outros conteúdos em nossa biblioteca completa.</p>
         <Link to="/biblioteca" className="inline-flex items-center gap-2 text-sky-400 font-black uppercase tracking-widest hover:text-sky-300 transition-colors">
            Ver toda a biblioteca
            <ArrowLeft className="rotate-180" size={18} />
         </Link>
      </div>
    </div>
  );
}
