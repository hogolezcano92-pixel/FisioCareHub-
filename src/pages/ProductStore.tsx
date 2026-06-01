import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Filter,
  HeartPulse,
  Info,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  X,
  Star,
  Tag,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

type Product = {
  id: string;
  name: string;
  subtitle?: string | null;
  description: string;
  category: string;
  clinical_indication?: string | null;
  recommended_for?: string[] | null;
  price_label?: string | null;
  image_url?: string | null;
  gallery_urls?: string[] | string | null;
  affiliate_url?: string | null;
  badge?: string | null;
  is_featured?: boolean | null;
  is_active?: boolean | null;
};

const categories = [
  'Todos',
  'Fortalecimento',
  'Equilíbrio',
  'Mobilidade',
  'Pós-operatório',
  'Conforto',
];

const normalizePriceLabel = (priceLabel?: string | null) => {
  const text = String(priceLabel || '').trim();
  if (!text || text.toLowerCase() === 'adicionar link shopee') return '';
  if (/^r\$|^a partir de/i.test(text)) return text;
  return `A partir de R$ ${text}`;
};


const fallbackProducts: Product[] = [
  {
    id: 'mini-band-kit',
    name: 'Kit Mini Bands',
    subtitle: 'Faixas circulares para quadril, joelho e glúteos',
    description: 'Produto versátil para fortalecimento de glúteo médio, controle de valgo dinâmico e progressão de exercícios de quadril e joelho.',
    category: 'Fortalecimento',
    clinical_indication: 'Quadril, joelho, dor femoropatelar e reabilitação funcional.',
    recommended_for: ['Abdução de quadril', 'Clamshell', 'Ponte com abdução'],
    price_label: 'Adicionar link Shopee',
    image_url: 'https://images.unsplash.com/photo-1599058917212-d750089bc07e?auto=format&fit=crop&q=80&w=900',
    affiliate_url: '',
    badge: 'Mais usado',
    is_featured: true,
  },
  {
    id: 'faixa-elastica',
    name: 'Faixa Elástica Terapêutica',
    subtitle: 'Resistência progressiva para membros superiores e inferiores',
    description: 'Indicada para fortalecimento gradual, exercícios de ombro, joelho, tornozelo e treino domiciliar com baixa sobrecarga articular.',
    category: 'Fortalecimento',
    clinical_indication: 'Ombro, manguito rotador, quadríceps, tornozelo e reabilitação domiciliar.',
    recommended_for: ['Rotação externa de ombro', 'Extensão terminal de joelho', 'Eversão de tornozelo'],
    price_label: 'Adicionar link Shopee',
    image_url: 'https://images.unsplash.com/photo-1591291621164-2c6367723315?auto=format&fit=crop&q=80&w=900',
    affiliate_url: '',
    badge: 'Essencial',
    is_featured: true,
  },
  {
    id: 'disco-equilibrio',
    name: 'Disco de Equilíbrio',
    subtitle: 'Treino proprioceptivo e controle postural',
    description: 'Ajuda na progressão de exercícios de equilíbrio, propriocepção de tornozelo e prevenção de novas entorses, sempre com orientação profissional.',
    category: 'Equilíbrio',
    clinical_indication: 'Entorse de tornozelo, instabilidade, idosos e treino proprioceptivo.',
    recommended_for: ['Apoio unipodal', 'Transferência de peso', 'Treino de equilíbrio'],
    price_label: 'Adicionar link Shopee',
    image_url: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&q=80&w=900',
    affiliate_url: '',
    badge: 'Propriocepção',
    is_featured: true,
  },
  {
    id: 'rolo-miofascial',
    name: 'Rolo de Liberação Miofascial',
    subtitle: 'Apoio para mobilidade e relaxamento muscular',
    description: 'Pode ser usado como recurso auxiliar em protocolos de mobilidade, recuperação muscular e autocuidado, conforme indicação do fisioterapeuta.',
    category: 'Mobilidade',
    clinical_indication: 'Rigidez muscular, mobilidade, recovery e exercícios complementares.',
    recommended_for: ['Mobilidade de quadril', 'Panturrilha', 'Cadeia posterior'],
    price_label: 'Adicionar link Shopee',
    image_url: 'https://images.unsplash.com/photo-1576678927484-cc907957088c?auto=format&fit=crop&q=80&w=900',
    affiliate_url: '',
    badge: 'Recovery',
    is_featured: false,
  },
  {
    id: 'colchonete',
    name: 'Colchonete para Exercícios',
    subtitle: 'Base confortável para treinos no solo',
    description: 'Ideal para exercícios de coluna, quadril, alongamentos e protocolos domiciliares que exigem segurança e conforto no solo.',
    category: 'Conforto',
    clinical_indication: 'Lombalgia, exercícios no solo, alongamentos e treino domiciliar.',
    recommended_for: ['Ponte glútea', 'Bird dog', 'Dead bug', 'Alongamentos'],
    price_label: 'Adicionar link Shopee',
    image_url: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?auto=format&fit=crop&q=80&w=900',
    affiliate_url: '',
    badge: 'Domiciliar',
    is_featured: false,
  },
  {
    id: 'bola-terapeutica',
    name: 'Bola Terapêutica Pequena',
    subtitle: 'Acessório para mobilidade, pé e liberação plantar',
    description: 'Pode auxiliar exercícios para fáscia plantar, mobilidade do pé e estímulos sensoriais, respeitando dor e tolerância do paciente.',
    category: 'Mobilidade',
    clinical_indication: 'Fascite plantar, rigidez do pé e exercícios sensoriais.',
    recommended_for: ['Rolamento plantar', 'Mobilidade do pé', 'Autocuidado'],
    price_label: 'Adicionar link Shopee',
    image_url: 'https://images.unsplash.com/photo-1571019613576-2b22c76fd955?auto=format&fit=crop&q=80&w=900',
    affiliate_url: '',
    badge: 'Pé e tornozelo',
    is_featured: false,
  },
  {
    id: 'caneleira',
    name: 'Caneleira Ajustável Leve',
    subtitle: 'Carga progressiva para fortalecimento',
    description: 'Recurso para evolução gradual de exercícios de membros inferiores, indicado apenas quando o paciente já tolera bem movimentos sem carga.',
    category: 'Fortalecimento',
    clinical_indication: 'Quadríceps, quadril, joelho e progressão de fortalecimento.',
    recommended_for: ['Elevação da perna estendida', 'Abdução de quadril', 'Extensão de joelho'],
    price_label: 'Adicionar link Shopee',
    image_url: 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?auto=format&fit=crop&q=80&w=900',
    affiliate_url: '',
    badge: 'Progressão',
    is_featured: false,
  },
  {
    id: 'bastao-mobilidade',
    name: 'Bastão para Mobilidade',
    subtitle: 'Auxílio para exercícios de ombro e postura',
    description: 'Pode ser usado em exercícios assistidos de ombro, mobilidade torácica e treino de amplitude, respeitando restrições clínicas.',
    category: 'Pós-operatório',
    clinical_indication: 'Mobilidade assistida de ombro, pós-operatório e ganho gradual de amplitude.',
    recommended_for: ['Mobilidade assistida de ombro', 'Postura', 'Alongamentos leves'],
    price_label: 'Adicionar link Shopee',
    image_url: 'https://images.unsplash.com/photo-1518310383802-640c2de311b2?auto=format&fit=crop&q=80&w=900',
    affiliate_url: '',
    badge: 'Ombro',
    is_featured: false,
  },
];

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const normalizeGalleryUrls = (value?: string[] | string | null) => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .map(item => String(item || '').trim())
      .filter(Boolean)
      .slice(0, 6);
  }

  const textValue = String(value || '').trim();
  if (!textValue) return [];

  try {
    const parsed = JSON.parse(textValue);
    if (Array.isArray(parsed)) {
      return parsed
        .map(item => String(item || '').trim())
        .filter(Boolean)
        .slice(0, 6);
    }
  } catch {
    // Mantém compatibilidade se o Supabase retornar text[] como string comum.
  }

  return textValue
    .replace(/^\{/, '')
    .replace(/\}$/, '')
    .split(',')
    .map(item => item.trim().replace(/^"|"$/g, ''))
    .filter(Boolean)
    .slice(0, 6);
};

const getGalleryKey = (value?: string[] | string | null) => normalizeGalleryUrls(value).join('|');

const getProductImages = (product: Product) => {
  const urls = [product.image_url, ...normalizeGalleryUrls(product.gallery_urls)]
    .map(item => String(item || '').trim())
    .filter(Boolean);
  return Array.from(new Set(urls));
};

function ProductImageGallery({ product, onOpenGallery }: { product: Product; onOpenGallery: () => void }) {
  const images = getProductImages(product);
  const fallbackImage = fallbackProducts[0].image_url || '';
  const [activeImage, setActiveImage] = useState(images[0] || fallbackImage);

  useEffect(() => {
    setActiveImage(images[0] || fallbackImage);
  }, [product.id, product.image_url, getGalleryKey(product.gallery_urls)]);

  const displayImages = images.length > 0 ? images : [fallbackImage];

  return (
    <div className="fisiostore-light-pagerelative h-52 overflow-hidden bg-slate-900">
      <button
        type="button"
        onClick={onOpenGallery}
        className="h-full w-full text-left"
        aria-label={`Abrir galeria de imagens de ${product.name}`}
      >
        <img
          src={activeImage || fallbackImage}
          alt={product.name}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
      </button>
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

      <div className="absolute left-4 top-4 flex flex-wrap gap-2">
        {product.badge && (
          <span className="inline-flex items-center gap-1 rounded-full bg-sky-500 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-lg">
            <Sparkles size={12} />
            {product.badge}
          </span>
        )}
        <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-slate-950/70 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white backdrop-blur">
          <Tag size={12} />
          {product.category}
        </span>
        {displayImages.length > 1 && (
          <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/90 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-900 shadow-lg">
            {displayImages.length} fotos
          </span>
        )}
      </div>

      <div className="absolute bottom-4 left-4 right-4">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-200">Produto recomendado</p>
        <h2 className="mt-1 text-2xl font-black leading-tight text-white">{product.name}</h2>

        {displayImages.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {displayImages.slice(0, 7).map((url, index) => (
              <button
                key={`${url}-${index}`}
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setActiveImage(url);
                }}
                className={cn(
                  'h-11 w-11 shrink-0 overflow-hidden rounded-xl border-2 bg-slate-800 transition-all',
                  activeImage === url ? 'border-sky-300 opacity-100' : 'border-white/20 opacity-70 hover:opacity-100'
                )}
                aria-label={`Ver imagem ${index + 1} de ${product.name}`}
              >
                <img src={url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onOpenGallery();
              }}
              className="flex h-11 shrink-0 items-center rounded-xl border border-sky-300/40 bg-sky-500/90 px-3 text-[11px] font-black uppercase tracking-wider text-white shadow-lg transition hover:bg-sky-400"
            >
              Ver fotos
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ProductGalleryModal({
  product,
  onClose,
}: {
  product: Product;
  onClose: () => void;
}) {
  const images = getProductImages(product);
  const fallbackImage = fallbackProducts[0].image_url || '';
  const displayImages = images.length > 0 ? images : [fallbackImage];
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [product.id]);

  const goPrevious = () => {
    setActiveIndex((current) => (current === 0 ? displayImages.length - 1 : current - 1));
  };

  const goNext = () => {
    setActiveIndex((current) => (current === displayImages.length - 1 ? 0 : current + 1));
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-950/90 p-3 backdrop-blur-md sm:p-6">
      <div className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-white/10 bg-slate-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 p-4 sm:p-5">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-300">Galeria do produto</p>
            <h3 className="truncate text-lg font-black text-white sm:text-xl">{product.name}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white transition hover:bg-white/[0.12]"
            aria-label="Fechar galeria"
          >
            <X size={20} />
          </button>
        </div>

        <div className="relative flex min-h-0 flex-1 items-center justify-center bg-slate-900">
          <img
            src={displayImages[activeIndex] || fallbackImage}
            alt={`${product.name} - imagem ${activeIndex + 1}`}
            className="max-h-[58vh] w-full object-contain"
          />

          {displayImages.length > 1 && (
            <>
              <button
                type="button"
                onClick={goPrevious}
                className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-slate-950/70 text-white shadow-xl backdrop-blur transition hover:bg-sky-500"
                aria-label="Imagem anterior"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                type="button"
                onClick={goNext}
                className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-slate-950/70 text-white shadow-xl backdrop-blur transition hover:bg-sky-500"
                aria-label="Próxima imagem"
              >
                <ChevronRight size={24} />
              </button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-white/15 bg-slate-950/75 px-4 py-2 text-xs font-black text-white backdrop-blur">
                {activeIndex + 1} / {displayImages.length}
              </div>
            </>
          )}
        </div>

        {displayImages.length > 1 && (
          <div className="flex gap-2 overflow-x-auto border-t border-white/10 bg-slate-950 p-3 sm:p-4">
            {displayImages.map((url, index) => (
              <button
                key={`${url}-${index}`}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={cn(
                  'h-16 w-16 shrink-0 overflow-hidden rounded-2xl border-2 bg-slate-800 transition sm:h-20 sm:w-20',
                  activeIndex === index ? 'border-sky-300 opacity-100' : 'border-white/10 opacity-70 hover:opacity-100'
                )}
                aria-label={`Ver imagem ${index + 1}`}
              >
                <img src={url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProductStore() {
  const { profile } = useAuth();
  const [products, setProducts] = useState<Product[]>(fallbackProducts);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [usingFallback, setUsingFallback] = useState(true);
  const [galleryProduct, setGalleryProduct] = useState<Product | null>(null);

  useEffect(() => {
    document.title = 'FisioStore - Produtos recomendados';
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('store_products')
        .select('*')
        .eq('is_active', true)
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.info('[ProductStore] Usando produtos modelo. Tabela store_products ainda não está disponível:', error.message);
        setProducts(fallbackProducts);
        setUsingFallback(true);
        return;
      }

      if (data && data.length > 0) {
        setProducts(data as Product[]);
        setUsingFallback(false);
      } else {
        setProducts(fallbackProducts);
        setUsingFallback(true);
      }
    } catch (error) {
      console.info('[ProductStore] Falha ao carregar produtos, usando modelo local:', error);
      setProducts(fallbackProducts);
      setUsingFallback(true);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = useMemo(() => {
    const term = normalize(search.trim());

    return products.filter((product) => {
      const matchesCategory = selectedCategory === 'Todos' || product.category === selectedCategory;
      const searchable = normalize([
        product.name,
        product.subtitle || '',
        product.description,
        product.category,
        product.clinical_indication || '',
        ...(product.recommended_for || []),
      ].join(' '));

      return matchesCategory && (!term || searchable.includes(term));
    });
  }, [products, search, selectedCategory]);

  const featuredProducts = useMemo(
    () => products.filter((product) => product.is_featured).slice(0, 3),
    [products]
  );

  const handleOpenProduct = (product: Product) => {
    if (!product.affiliate_url) {
      toast.info('Produto pronto para receber o link da Shopee.', {
        description: 'Depois que você se afiliar, cadastre o link do produto para ativar este botão.',
      });
      return;
    }

    window.open(product.affiliate_url, '_blank', 'noopener,noreferrer');
  };

  const roleLabel = profile?.tipo_usuario === 'fisioterapeuta'
    ? 'Produtos para prescrição, reabilitação e atendimento domiciliar.'
    : 'Produtos úteis para apoiar seus exercícios e cuidados em casa.';

  return (
    <div className="min-h-screen overflow-hidden rounded-[28px] border border-violet-100 bg-[#f8f6ff] text-slate-950 shadow-2xl shadow-violet-100/60 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:shadow-none">
      <div className="relative isolate">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.16),transparent_34%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.14),transparent_34%),linear-gradient(180deg,#f8f6ff_0%,#ffffff_48%,#f3f7ff_100%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.22),transparent_36%),radial-gradient(circle_at_top_right,rgba(124,58,237,0.2),transparent_34%),linear-gradient(180deg,#020617_0%,#0f172a_55%,#020617_100%)]" />
        <div className="absolute left-1/2 top-0 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-violet-200/60 blur-3xl dark:bg-cyan-400/10" />

        <section className="px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr] lg:items-stretch">
            <div className="relative overflow-hidden rounded-[32px] border border-violet-100 bg-white p-6 shadow-2xl shadow-violet-100/70 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none sm:p-8">
              <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-violet-200/70 blur-3xl dark:bg-sky-400/20" />
              <div className="relative z-10">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-violet-700 dark:border-sky-400/30 dark:bg-sky-400/10 dark:text-sky-200">
                  <ShoppingBag size={16} />
                  FisioStore
                </div>

                <h1 className="max-w-3xl text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl lg:text-5xl">
                  FisioStore: produtos terapêuticos conectados ao cuidado fisioterapêutico.
                </h1>

                <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-slate-600 dark:text-slate-300 sm:text-base">
                  {roleLabel} Encontre materiais para exercícios, postura, fortalecimento, recuperação e autocuidado. A compra acontece fora do FisioCareHub, diretamente na Shopee ou loja parceira, usando links externos.
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {[
                    { icon: ShieldCheck, title: 'Sem estoque', text: 'Você apenas indica o produto.' },
                    { icon: ExternalLink, title: 'Link externo', text: 'Compra finalizada fora do app.' },
                    { icon: Sparkles, title: 'Afiliado', text: 'Pronto para links da Shopee.' },
                  ].map((item) => (
                    <div key={item.title} className="rounded-3xl border border-violet-100 bg-violet-50/70 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none">
                      <item.icon className="mb-3 text-violet-700 dark:text-sky-300" size={22} />
                      <p className="text-sm font-black text-slate-950 dark:text-white">{item.title}</p>
                      <p className="mt-1 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-400">{item.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-[32px] border border-violet-100 bg-white p-5 shadow-2xl shadow-violet-100/70 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-600 dark:text-slate-500">Destaques</p>
                  <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">Essenciais da clínica</h2>
                </div>
                <Star className="text-amber-300" size={24} />
              </div>

              <div className="space-y-3">
                {(featuredProducts.length ? featuredProducts : fallbackProducts.slice(0, 3)).map((product) => (
                  <button
                    key={product.id}
                    onClick={() => handleOpenProduct(product)}
                    className="group flex w-full items-center gap-3 rounded-3xl border border-violet-100 bg-violet-50/60 p-3 text-left transition hover:border-violet-300 hover:bg-white hover:shadow-lg dark:border-white/10 dark:bg-slate-950/40 dark:hover:border-sky-400/50 dark:hover:bg-sky-400/10"
                  >
                    <img
                      src={product.image_url || fallbackProducts[0].image_url || ''}
                      alt={product.name}
                      className="h-14 w-14 rounded-2xl object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-slate-950 dark:text-white">{product.name}</p>
                      <p className="truncate text-xs font-semibold text-slate-600 dark:text-slate-400">{product.category}</p>
                    </div>
                    <ArrowRight className="text-slate-500 transition group-hover:translate-x-1 group-hover:text-sky-300" size={18} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 pb-6 sm:px-6 lg:px-10">
          <div className="rounded-[30px] border border-violet-100 bg-white p-4 shadow-xl shadow-violet-100/60 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.055] dark:shadow-none sm:p-5">
            <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por produto, indicação ou exercício..."
                  className="h-14 w-full rounded-2xl border border-violet-100 bg-violet-50/70 pl-12 pr-4 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-violet-300 focus:ring-4 focus:ring-violet-200/50 dark:border-white/10 dark:bg-slate-950/70 dark:text-white dark:focus:border-sky-400/60 dark:focus:ring-sky-400/10"
                />
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1 lg:justify-end lg:overflow-visible">
                {categories.map((category) => {
                  const isActive = selectedCategory === category;
                  return (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={cn(
                        'whitespace-nowrap rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-wider transition',
                        isActive
                          ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20'
                          : 'border border-violet-100 bg-violet-50/70 text-slate-600 hover:border-violet-300 hover:bg-white hover:text-violet-700 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-400 dark:hover:border-sky-400/40 dark:hover:text-white'
                      )}
                    >
                      {category}
                    </button>
                  );
                })}
              </div>
            </div>

            {usingFallback && (
              <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100">
                <Info className="mt-0.5 shrink-0" size={18} />
                <p className="text-xs font-semibold leading-5 sm:text-sm">
                  A loja já está pronta. Estes são produtos modelo para visualizar o layout. Depois que você tiver os links de afiliado, cadastre os produtos na tabela <strong>store_products</strong> ou me peça para ligar isso ao Admin.
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="px-4 pb-8 sm:px-6 lg:px-10 lg:pb-12">
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-96 animate-pulse rounded-[30px] border border-violet-100 bg-white dark:border-white/10 dark:bg-white/[0.06]" />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="rounded-[30px] border border-violet-100 bg-white p-10 text-center shadow-xl shadow-violet-100/60 dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none">
              <Filter className="mx-auto mb-4 text-slate-500" size={40} />
              <h2 className="text-xl font-black text-slate-950 dark:text-white">Nenhum produto encontrado</h2>
              <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-400">Tente outra categoria ou termo de busca.</p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filteredProducts.map((product) => {
                const hasLink = Boolean(String(product.affiliate_url || '').trim());
                const priceLabel = normalizePriceLabel(product.price_label);
                return (
                  <article
                    key={product.id}
                    className="group overflow-hidden rounded-[30px] border border-violet-100 bg-white shadow-2xl shadow-violet-100/60 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-violet-300 dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none dark:hover:border-sky-400/40 dark:hover:bg-white/[0.08]"
                  >
                    <ProductImageGallery product={product} onOpenGallery={() => setGalleryProduct(product)} />

                    <div className="space-y-4 p-5">
                      {product.subtitle && (
                        <p className="text-sm font-bold leading-6 text-slate-700 dark:text-slate-300">{product.subtitle}</p>
                      )}

                      <p className="text-sm font-semibold leading-6 text-slate-600 dark:text-slate-400">{product.description}</p>

                      {product.clinical_indication && (
                        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 dark:border-emerald-400/20 dark:bg-emerald-400/10">
                          <div className="mb-2 flex items-center gap-2 text-emerald-700 dark:text-emerald-200">
                            <HeartPulse size={17} />
                            <p className="text-xs font-black uppercase tracking-wider">Indicação clínica</p>
                          </div>
                          <p className="text-xs font-semibold leading-5 text-emerald-800 dark:text-emerald-50/90">{product.clinical_indication}</p>
                        </div>
                      )}

                      {product.recommended_for && product.recommended_for.length > 0 && (
                        <div>
                          <p className="mb-2 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-500">Combina com</p>
                          <div className="flex flex-wrap gap-2">
                            {product.recommended_for.slice(0, 4).map((item) => (
                              <span key={item} className="rounded-full border border-violet-100 bg-violet-50 px-3 py-1 text-[11px] font-bold text-slate-700 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300">
                                {item}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {priceLabel && (
                        <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 dark:border-emerald-400/20 dark:bg-emerald-400/10">
                          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-200">
                            <Tag size={16} />
                            <span className="text-xs font-black uppercase tracking-wider">Preço</span>
                          </div>
                          <span className="text-sm font-black text-slate-950 text-right dark:text-white">{priceLabel}</span>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => setGalleryProduct(product)}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-black text-violet-700 transition hover:border-violet-300 hover:bg-violet-100 active:scale-[0.98] dark:border-sky-400/30 dark:bg-sky-400/10 dark:text-sky-100 dark:hover:border-sky-300/60 dark:hover:bg-sky-400/20"
                      >
                        {getProductImages(product).length > 1 ? `Ver ${getProductImages(product).length} fotos do produto` : 'Ver foto do produto'}
                        <ArrowRight size={18} />
                      </button>

                      <button
                        onClick={() => handleOpenProduct(product)}
                        className={cn(
                          'flex h-13 w-full items-center justify-center gap-2 rounded-2xl px-4 py-4 text-sm font-black transition active:scale-[0.98]',
                          hasLink
                            ? 'bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow-lg shadow-sky-500/20 hover:from-sky-400 hover:to-indigo-400'
                            : 'border border-violet-100 bg-violet-50 text-slate-600 hover:border-violet-300 hover:text-violet-700 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300 dark:hover:border-sky-400/40 dark:hover:text-white'
                        )}
                      >
                        {hasLink ? (
                          <>
                            Ver na Shopee
                            <ExternalLink size={18} />
                          </>
                        ) : (
                          <>
                            Aguardando link
                            <ArrowRight size={18} />
                          </>
                        )}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="px-4 pb-10 sm:px-6 lg:px-10">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-[28px] border border-violet-100 bg-white p-5 shadow-lg shadow-violet-100/50 dark:border-white/10 dark:bg-white/[0.055] dark:shadow-none sm:p-6">
              <div className="mb-3 flex items-center gap-2 text-violet-700 dark:text-sky-200">
                <CheckCircle2 size={20} />
                <h3 className="font-black">Como vai funcionar</h3>
              </div>
              <p className="text-sm font-semibold leading-7 text-slate-600 dark:text-slate-400">
                O FisioCareHub recomenda o produto, o usuário clica no botão e é direcionado para a Shopee. Pagamento, entrega, garantia e suporte da compra ficam com a Shopee/vendedor.
              </p>
            </div>

            <div className="rounded-[28px] border border-amber-100 bg-white p-5 shadow-lg shadow-amber-100/50 dark:border-white/10 dark:bg-white/[0.055] dark:shadow-none sm:p-6">
              <div className="mb-3 flex items-center gap-2 text-amber-700 dark:text-amber-200">
                <AlertCircle size={20} />
                <h3 className="font-black">Aviso importante</h3>
              </div>
              <p className="text-sm font-semibold leading-7 text-slate-600 dark:text-slate-400">
                Alguns links podem gerar comissão para o FisioCareHub, sem custo adicional para o usuário. Produtos não substituem avaliação fisioterapêutica e devem respeitar orientação profissional.
              </p>
            </div>
          </div>
        </section>
      </div>

      {galleryProduct && (
        <ProductGalleryModal
          product={galleryProduct}
          onClose={() => setGalleryProduct(null)}
        />
      )}
    </div>
  );
}
