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
  const scrollResetTimeoutRef = useRef<number | null>(null);
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAutoPaused, setIsAutoPaused] = useState(false);
  const [activeProductIndex, setActiveProductIndex] = useState(0);
  const [currentProductRenderIndex, setCurrentProductRenderIndex] = useState(0);

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

  const loopedCarouselProducts = useMemo(() => {
    if (carouselProducts.length <= 1) return carouselProducts;
    return Array.from({ length: 3 }, () => carouselProducts).flat();
  }, [carouselProducts]);

  const scrollToRenderedProduct = useCallback((renderIndex: number, behavior: ScrollBehavior = 'smooth') => {
    const container = scrollRef.current;
    if (!container || carouselProducts.length === 0) return;

    const target = container.children.item(renderIndex) as HTMLElement | null;
    if (!target) return;

    const centeredLeft = target.offsetLeft - container.clientWidth / 2 + target.clientWidth / 2;

    container.scrollTo({
      left: Math.max(centeredLeft, 0),
      behavior,
    });
  }, [carouselProducts.length]);

  const scheduleInvisibleReset = useCallback((renderIndex: number) => {
    if (carouselProducts.length <= 1) return;

    if (scrollResetTimeoutRef.current) {
      window.clearTimeout(scrollResetTimeoutRef.current);
    }

    scrollResetTimeoutRef.current = window.setTimeout(() => {
      const logicalIndex = ((renderIndex % carouselProducts.length) + carouselProducts.length) % carouselProducts.length;
      const middleLoopIndex = carouselProducts.length + logicalIndex;

      setCurrentProductRenderIndex(middleLoopIndex);
      scrollToRenderedProduct(middleLoopIndex, 'auto');
      scrollResetTimeoutRef.current = null;
    }, 560);
  }, [carouselProducts.length, scrollToRenderedProduct]);

  const scrollToProduct = useCallback((targetRenderIndex: number) => {
    if (carouselProducts.length === 0) return;

    const logicalIndex = ((targetRenderIndex % carouselProducts.length) + carouselProducts.length) % carouselProducts.length;

    setCurrentProductRenderIndex(targetRenderIndex);
    setActiveProductIndex(logicalIndex);
    scrollToRenderedProduct(targetRenderIndex, 'smooth');

    if (targetRenderIndex >= carouselProducts.length * 2 || targetRenderIndex < carouselProducts.length) {
      scheduleInvisibleReset(targetRenderIndex);
    }
  }, [carouselProducts.length, scheduleInvisibleReset, scrollToRenderedProduct]);

  const scrollProducts = useCallback((direction: 'left' | 'right') => {
    if (carouselProducts.length <= 1) return;

    const currentIndex = currentProductRenderIndex || carouselProducts.length;
    scrollToProduct(currentIndex + (direction === 'left' ? -1 : 1));
  }, [carouselProducts.length, currentProductRenderIndex, scrollToProduct]);

  useEffect(() => {
    if (scrollResetTimeoutRef.current) {
      window.clearTimeout(scrollResetTimeoutRef.current);
      scrollResetTimeoutRef.current = null;
    }

    const middleLoopIndex = carouselProducts.length > 1 ? carouselProducts.length : 0;

    setActiveProductIndex(0);
    setCurrentProductRenderIndex(middleLoopIndex);

    window.requestAnimationFrame(() => {
      if (carouselProducts.length > 1) {
        scrollToRenderedProduct(middleLoopIndex, 'auto');
      } else {
        scrollRef.current?.scrollTo({ left: 0, behavior: 'auto' });
      }
    });
  }, [carouselProducts.length, scrollToRenderedProduct]);

  useEffect(() => {
    return () => {
      if (scrollResetTimeoutRef.current) {
        window.clearTimeout(scrollResetTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (loading || carouselProducts.length <= 1 || isAutoPaused) return;

    const intervalId = window.setInterval(() => {
      scrollProducts('right');
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, [carouselProducts.length, isAutoPaused, loading, scrollProducts]);

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
    <section className={cn('relative overflow-hidden rounded-[2rem] border border-orange-100 bg-orange-50 shadow-2xl shadow-orange-100/60 dark:border-orange-400/15 dark:bg-orange-500/10 dark:shadow-orange-950/20', className)}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(251,146,60,0.22),transparent_28%),radial-gradient(circle_at_85%_0%,rgba(249,115,22,0.16),transparent_30%),radial-gradient(circle_at_50%_100%,rgba(234,88,12,0.12),transparent_34%)] pointer-events-none dark:opacity-80" />
      <div className="relative z-10 p-4 sm:p-5 md:p-6 space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-orange-700 dark:border-orange-400/20 dark:bg-orange-500/10 dark:text-orange-300">
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
              className="h-10 w-10 rounded-2xl border border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 transition-all flex items-center justify-center dark:border-orange-400/15 dark:bg-orange-500/10 dark:text-orange-200 dark:hover:bg-orange-500/20 dark:hover:text-white"
              aria-label="Ver produtos anteriores"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => scrollProducts('right')}
              className="h-10 w-10 rounded-2xl border border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 transition-all flex items-center justify-center dark:border-orange-400/15 dark:bg-orange-500/10 dark:text-orange-200 dark:hover:bg-orange-500/20 dark:hover:text-white"
              aria-label="Ver próximos produtos"
            >
              <ChevronRight size={18} />
            </button>
            <button
              type="button"
              onClick={() => navigate('/loja')}
              className="hidden sm:flex items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-orange-500/25 hover:scale-[1.02] transition-all"
            >
              Ver loja
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="grid gap-3 rounded-[1.6rem] border border-orange-100 bg-white/70 p-3 shadow-inner shadow-orange-100/70 dark:border-orange-400/15 dark:bg-orange-500/10 dark:shadow-none sm:grid-cols-3">
          {[
            { label: 'Apoio ao tratamento', icon: HeartPulse },
            { label: 'Links externos', icon: ExternalLink },
            { label: 'Seleção terapêutica', icon: ShoppingBag },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2 rounded-2xl bg-orange-50 px-3 py-2 text-xs font-black text-slate-700 shadow-sm ring-1 ring-orange-100/70 dark:bg-orange-500/10 dark:text-orange-100 dark:ring-orange-400/15">
              <item.icon size={15} className="text-orange-600 dark:text-orange-300" />
              {item.label}
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="min-w-[230px] sm:min-w-[260px] h-72 rounded-[1.75rem] bg-orange-50 border border-orange-100 animate-pulse dark:bg-orange-500/10 dark:border-orange-400/15" />
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
            {loopedCarouselProducts.map((product, renderIndex) => {
              const priceLabel = normalizePriceLabel(product.price_label);
              const hasAffiliateUrl = Boolean(String(product.affiliate_url || '').trim());

              return (
                <article
                  key={`${product.id}-${renderIndex}`}
                  className="group w-[235px] sm:w-[270px] shrink-0 snap-center rounded-[1.75rem] border border-orange-100 bg-gradient-to-br from-white via-orange-50/80 to-orange-100/70 overflow-hidden shadow-xl shadow-orange-100/60 hover:-translate-y-1 hover:border-orange-300 transition-all duration-300 dark:border-orange-400/15 dark:bg-gradient-to-br dark:from-slate-950/70 dark:via-orange-500/10 dark:to-orange-500/15 dark:shadow-none dark:hover:border-orange-400/40"
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
                      <span className="absolute left-3 top-3 rounded-full border border-white/60 bg-white/90 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-orange-700 backdrop-blur-xl dark:border-white/20 dark:bg-slate-950/70 dark:text-white">
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

                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-orange-100 bg-orange-50 px-3 py-2 dark:border-orange-500/15 dark:bg-orange-500/10">
                      <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
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
                      className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-orange-500/25 hover:from-orange-600 hover:to-orange-700 transition-all"
                    >
                      {hasAffiliateUrl ? getAffiliateStoreName(product.affiliate_url) : 'Ver na loja'}
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
          className="sm:hidden w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-3 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-orange-500/25"
        >
          Abrir loja completa
          <ChevronRight size={16} />
        </button>
      </div>
    </section>
  );
}
