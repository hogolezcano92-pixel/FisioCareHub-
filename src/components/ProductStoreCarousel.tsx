import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, ShoppingBag, Sparkles, Tag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';

type ProductStoreCarouselProps = {
  audience?: 'patient' | 'physio';
  className?: string;
};

type StoreProduct = {
  id: string;
  name: string;
  subtitle?: string | null;
  description?: string | null;
  category?: string | null;
  price_label?: string | null;
  image_url?: string | null;
  affiliate_url?: string | null;
  badge?: string | null;
  is_featured?: boolean | null;
  created_at?: string | null;
};

const DEFAULT_PRODUCT_IMAGE = 'https://images.unsplash.com/photo-1599058917212-d750089bc07e?auto=format&fit=crop&q=80&w=900';

const normalizePriceLabel = (value?: string | null) => {
  const text = String(value || '').trim();
  if (!text) return '';

  if (/r\$/i.test(text) || /consultar/i.test(text) || /a partir/i.test(text)) {
    return text;
  }

  return `A partir de R$ ${text}`;
};

export default function ProductStoreCarousel({ audience = 'patient', className }: ProductStoreCarouselProps) {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAutoPaused, setIsAutoPaused] = useState(false);
  const [activeProductIndex, setActiveProductIndex] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const fetchProducts = async () => {
      setLoading(true);

      try {
        const { data, error } = await supabase
          .from('store_products')
          .select('id, name, subtitle, description, category, price_label, image_url, affiliate_url, badge, is_featured, created_at')
          .eq('is_active', true)
          .order('is_featured', { ascending: false })
          .order('created_at', { ascending: false });

        if (error) {
          console.info('[ProductStoreCarousel] Não foi possível carregar produtos:', error.message);
          if (isMounted) setProducts([]);
          return;
        }

        if (isMounted) setProducts((data || []) as StoreProduct[]);
      } catch (error) {
        console.info('[ProductStoreCarousel] Falha ao carregar produtos:', error);
        if (isMounted) setProducts([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  const carouselProducts = useMemo(() => {
    return products;
  }, [products]);

  const scrollToProduct = useCallback((index: number) => {
    const container = scrollRef.current;
    if (!container || carouselProducts.length === 0) return;

    const safeIndex = ((index % carouselProducts.length) + carouselProducts.length) % carouselProducts.length;
    const target = container.children.item(safeIndex) as HTMLElement | null;

    container.scrollTo({
      left: target?.offsetLeft ?? 0,
      behavior: 'smooth',
    });

    setActiveProductIndex(safeIndex);
  }, [carouselProducts.length]);

  const scrollProducts = useCallback((direction: 'left' | 'right') => {
    scrollToProduct(activeProductIndex + (direction === 'left' ? -1 : 1));
  }, [activeProductIndex, scrollToProduct]);

  useEffect(() => {
    setActiveProductIndex(0);
    scrollRef.current?.scrollTo({ left: 0, behavior: 'auto' });
  }, [carouselProducts.length]);

  useEffect(() => {
    if (loading || carouselProducts.length <= 1 || isAutoPaused) return;

    const intervalId = window.setInterval(() => {
      setActiveProductIndex((currentIndex) => {
        const nextIndex = currentIndex + 1 >= carouselProducts.length ? 0 : currentIndex + 1;
        const container = scrollRef.current;
        const target = container?.children.item(nextIndex) as HTMLElement | null;

        container?.scrollTo({
          left: target?.offsetLeft ?? 0,
          behavior: 'smooth',
        });

        return nextIndex;
      });
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, [carouselProducts.length, isAutoPaused, loading]);

  const openProduct = (product: StoreProduct) => {
    const url = String(product.affiliate_url || '').trim();

    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }

    navigate('/loja');
  };

  if (!loading && carouselProducts.length === 0) {
    return null;
  }

  const isPhysio = audience === 'physio';

  return (
    <section className={cn('relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 backdrop-blur-2xl shadow-2xl shadow-blue-950/20', className)}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(56,189,248,0.16),transparent_28%),radial-gradient(circle_at_90%_0%,rgba(99,102,241,0.16),transparent_30%)] pointer-events-none" />
      <div className="relative z-10 p-4 sm:p-5 md:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-sky-300">
              <Sparkles size={12} /> Loja FisioCareHub
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {isPhysio ? 'Produtos para indicar aos pacientes' : 'Produtos recomendados para sua recuperação'}
              </h2>
              <p className="text-xs sm:text-sm font-medium text-slate-400 max-w-2xl">
                {isPhysio
                  ? 'Um carrossel rápido no estilo app moderno, para você acessar acessórios úteis e orientar seus pacientes com mais facilidade.'
                  : 'Veja acessórios úteis antes de abrir a loja completa. O preço aparece no card e o botão continua levando para a Shopee.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => scrollProducts('left')}
              className="h-10 w-10 rounded-2xl border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white transition-all flex items-center justify-center"
              aria-label="Ver produtos anteriores"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => scrollProducts('right')}
              className="h-10 w-10 rounded-2xl border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white transition-all flex items-center justify-center"
              aria-label="Ver próximos produtos"
            >
              <ChevronRight size={18} />
            </button>
            <button
              type="button"
              onClick={() => navigate('/loja')}
              className="hidden sm:flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-xs font-black uppercase tracking-widest text-slate-950 shadow-xl shadow-white/10 hover:scale-[1.02] transition-all"
            >
              Ver loja
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="min-w-[230px] sm:min-w-[260px] h-72 rounded-[1.75rem] bg-white/5 border border-white/10 animate-pulse" />
            ))}
          </div>
        ) : (
          <div
            ref={scrollRef}
            onMouseEnter={() => setIsAutoPaused(true)}
            onMouseLeave={() => setIsAutoPaused(false)}
            onTouchStart={() => setIsAutoPaused(true)}
            onTouchEnd={() => setIsAutoPaused(false)}
            className="flex gap-4 overflow-x-auto scroll-smooth pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {carouselProducts.map((product) => {
              const priceLabel = normalizePriceLabel(product.price_label);
              const hasAffiliateUrl = Boolean(String(product.affiliate_url || '').trim());

              return (
                <article
                  key={product.id}
                  className="group min-w-[235px] sm:min-w-[270px] max-w-[270px] rounded-[1.75rem] border border-white/10 bg-slate-950/55 overflow-hidden shadow-xl hover:-translate-y-1 hover:border-sky-400/40 transition-all duration-300"
                >
                  <div className="relative h-36 overflow-hidden bg-slate-900">
                    <img
                      src={product.image_url || DEFAULT_PRODUCT_IMAGE}
                      alt={product.name}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/10 to-transparent" />
                    {(product.badge || product.category) && (
                      <span className="absolute left-3 top-3 rounded-full border border-white/20 bg-slate-950/70 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-white backdrop-blur-xl">
                        {product.badge || product.category}
                      </span>
                    )}
                  </div>

                  <div className="p-4 space-y-3">
                    <div className="space-y-1">
                      <h3 className="line-clamp-2 text-sm font-black text-white tracking-tight min-h-[2.5rem]">
                        {product.name}
                      </h3>
                      <p className="line-clamp-2 text-[11px] font-medium text-slate-400 min-h-[2rem]">
                        {product.subtitle || product.description || 'Produto recomendado para apoio em reabilitação e exercícios.'}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-500/15 bg-emerald-500/10 px-3 py-2">
                      <div className="flex items-center gap-2 text-emerald-300">
                        <Tag size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Preço</span>
                      </div>
                      <span className="text-xs font-black text-white text-right">
                        {priceLabel || 'Consultar'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => openProduct(product)}
                      className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 px-4 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-sky-950/30 hover:from-sky-400 hover:to-indigo-500 transition-all"
                    >
                      {hasAffiliateUrl ? 'Ver na Shopee' : 'Ver na loja'}
                      {hasAffiliateUrl ? <ExternalLink size={15} /> : <ShoppingBag size={15} />}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <button
          type="button"
          onClick={() => navigate('/loja')}
          className="sm:hidden w-full flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-950 shadow-xl shadow-white/10"
        >
          Abrir loja completa
          <ChevronRight size={16} />
        </button>
      </div>
    </section>
  );
}
