import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, HeartPulse, ShoppingBag, Sparkles, Tag } from 'lucide-react';
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

const getAffiliateStoreName = (url?: string | null) => {
  const normalizedUrl = String(url || '').trim().toLowerCase();

  if (!normalizedUrl) return 'Ver na loja';

  if (normalizedUrl.includes('amazon.') || normalizedUrl.includes('amzn.to')) {
    return 'Ver na Amazon';
  }

  if (
    normalizedUrl.includes('mercadolivre.') ||
    normalizedUrl.includes('mercadolivre.com') ||
    normalizedUrl.includes('mercadolivre.com.br') ||
    normalizedUrl.includes('meli.') ||
    normalizedUrl.includes('mercadolibre.')
  ) {
    return 'Ver no Mercado Livre';
  }

  if (
    normalizedUrl.includes('shopee.') ||
    normalizedUrl.includes('shope.ee') ||
    normalizedUrl.includes('s.shopee')
  ) {
    return 'Ver na Shopee';
  }

  return 'Ver oferta';
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

  const carouselProducts = useMemo(() => products, [products]);

  const scrollToProduct = useCallback((index: number) => {
    const container = scrollRef.current;
    if (!container || carouselProducts.length === 0) return;

    const safeIndex = ((index % carouselProducts.length) + carouselProducts.length) % carouselProducts.length;
    const target = container.children.item(safeIndex) as HTMLElement | null;

    const centeredLeft = target
      ? target.offsetLeft - container.clientWidth / 2 + target.clientWidth / 2
      : 0;

    container.scrollTo({
      left: Math.max(centeredLeft, 0),
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

        if (container && target) {
          const centeredLeft = target.offsetLeft - container.clientWidth / 2 + target.clientWidth / 2;

          container.scrollTo({
            left: Math.max(centeredLeft, 0),
            behavior: 'smooth',
          });
        }

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
    <section className={cn('relative overflow-hidden rounded-[2rem] border border-violet-100 bg-white shadow-2xl shadow-violet-100/60 dark:border-white/10 dark:bg-white/[0.055] dark:shadow-blue-950/20', className)}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(124,58,237,0.12),transparent_28%),radial-gradient(circle_at_90%_0%,rgba(56,189,248,0.14),transparent_30%)] pointer-events-none dark:opacity-80" />
      <div className="relative z-10 p-4 sm:p-5 md:p-6 space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-violet-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300">
              <Sparkles size={12} /> FisioStore
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white tracking-tight">
                {isPhysio ? 'Produtos para indicar aos pacientes' : 'Produtos recomendados para sua recuperação'}
              </h2>
              <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 max-w-2xl leading-6">
                {isPhysio
                  ? 'Indique acessórios terapêuticos como complemento do tratamento, sem sair do ecossistema FisioCareHub.'
                  : 'Acesse materiais que podem apoiar seus exercícios, postura, fortalecimento e autocuidado orientado.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => scrollProducts('left')}
              className="h-10 w-10 rounded-2xl border border-violet-100 bg-violet-50 text-violet-700 hover:bg-violet-100 transition-all flex items-center justify-center dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
              aria-label="Ver produtos anteriores"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => scrollProducts('right')}
              className="h-10 w-10 rounded-2xl border border-violet-100 bg-violet-50 text-violet-700 hover:bg-violet-100 transition-all flex items-center justify-center dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
              aria-label="Ver próximos produtos"
            >
              <ChevronRight size={18} />
            </button>
            <button
              type="button"
              onClick={() => navigate('/loja')}
              className="hidden sm:flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-700 to-blue-600 px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-violet-500/20 hover:scale-[1.02] transition-all"
            >
              Ver loja
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="grid gap-3 rounded-[1.6rem] border border-violet-100 bg-violet-50/60 p-3 dark:border-white/10 dark:bg-white/[0.04] sm:grid-cols-3">
          {[
            { label: 'Apoio ao tratamento', icon: HeartPulse },
            { label: 'Links externos', icon: ExternalLink },
            { label: 'Seleção terapêutica', icon: ShoppingBag },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm dark:bg-slate-950/40 dark:text-slate-300">
              <item.icon size={15} className="text-violet-700 dark:text-sky-300" />
              {item.label}
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="min-w-[230px] sm:min-w-[260px] h-72 rounded-[1.75rem] bg-violet-50 border border-violet-100 animate-pulse dark:bg-white/5 dark:border-white/10" />
            ))}
          </div>
        ) : (
          <div
            ref={scrollRef}
            onMouseEnter={() => setIsAutoPaused(true)}
            onMouseLeave={() => setIsAutoPaused(false)}
            onTouchStart={() => setIsAutoPaused(true)}
            onTouchEnd={() => setIsAutoPaused(false)}
            className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 px-[calc((100%-235px)/2)] sm:px-[calc((100%-270px)/2)] md:px-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {carouselProducts.map((product) => {
              const priceLabel = normalizePriceLabel(product.price_label);
              const hasAffiliateUrl = Boolean(String(product.affiliate_url || '').trim());

              return (
                <article
                  key={product.id}
                  className="group w-[235px] sm:w-[270px] shrink-0 snap-center rounded-[1.75rem] border border-violet-100 bg-white overflow-hidden shadow-xl shadow-violet-100/60 hover:-translate-y-1 hover:border-violet-300 transition-all duration-300 dark:border-white/10 dark:bg-slate-950/55 dark:shadow-none dark:hover:border-sky-400/40"
                >
                  <div className="relative h-36 overflow-hidden bg-slate-100 dark:bg-slate-900">
                    <img
                      src={product.image_url || DEFAULT_PRODUCT_IMAGE}
                      alt={product.name}
                      className="h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-110"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-transparent to-transparent dark:from-slate-950 dark:via-slate-950/10" />
                    {(product.badge || product.category) && (
                      <span className="absolute left-3 top-3 rounded-full border border-white/60 bg-white/90 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-violet-700 backdrop-blur-xl dark:border-white/20 dark:bg-slate-950/70 dark:text-white">
                        {product.badge || product.category}
                      </span>
                    )}
                  </div>

                  <div className="p-4 space-y-3">
                    <div className="space-y-1">
                      <h3 className="line-clamp-2 text-sm font-black text-slate-950 tracking-tight min-h-[2.5rem] dark:text-white">
                        {product.name}
                      </h3>
                      <p className="line-clamp-2 text-[11px] font-semibold text-slate-600 min-h-[2rem] dark:text-slate-400">
                        {product.subtitle || product.description || 'Produto recomendado para apoio em reabilitação e exercícios.'}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-2 dark:border-emerald-500/15 dark:bg-emerald-500/10">
                      <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                        <Tag size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Preço</span>
                      </div>
                      <span className="text-xs font-black text-slate-900 text-right dark:text-white">
                        {priceLabel || 'Consultar'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => openProduct(product)}
                      className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-700 to-blue-600 px-4 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-violet-500/20 hover:from-violet-600 hover:to-blue-500 transition-all"
                    >
                      {getAffiliateStoreName(product.affiliate_url)}
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
          className="sm:hidden w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-700 to-blue-600 px-4 py-3 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-violet-500/20"
        >
          Abrir loja completa
          <ChevronRight size={16} />
        </button>
      </div>
    </section>
  );
}
