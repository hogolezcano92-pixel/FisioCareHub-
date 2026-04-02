import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Activity, 
  Stethoscope, 
  Shield, 
  ShieldCheck,
  Clock, 
  ArrowRight, 
  CheckCircle2, 
  Star, 
  Users, 
  Heart, 
  Sparkles,
  Play,
  Calendar,
  MessageSquare,
  BrainCircuit,
  FileText,
  Bone,
  Brain,
  Wind,
  Baby,
  Zap,
  Dna,
  Search,
  Filter,
  MapPin,
  ClipboardCheck,
  UserCheck,
  Home as HomeIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Professional {
  id: string;
  name: string;
  spec: string;
  fullSpec: string;
  img: string;
  rating: number;
  reviews: number;
  bio: string;
  location: string;
}

export default function Home() {
  const { t } = useTranslation();
  const [nameQuery, setNameQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('Todos');
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);

  const specialtySlides = [
    {
      title: "Fisioterapia Traumato-Ortopédica",
      description: "Tratamento especializado para fraturas, dores na coluna e recuperação pós-operatória, tudo no conforto da sua casa.",
      image: "https://images.unsplash.com/photo-1597452485669-2c7bb5fef90d?auto=format&fit=crop&q=80&w=1200",
      icon: Bone,
      color: "sky"
    },
    {
      title: "Fisioterapia Neurofuncional",
      description: "Reabilitação domiciliar focada em pacientes pós-AVC, Parkinson e outras condições neurológicas complexas.",
      image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=1200",
      icon: Brain,
      color: "emerald"
    },
    {
      title: "Fisioterapia Geriátrica",
      description: "Cuidado dedicado à terceira idade no ambiente domiciliar, focando em mobilidade, equilíbrio e independência.",
      image: "https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&q=80&w=1200",
      icon: Heart,
      color: "orange"
    },
    {
      title: "Fisioterapia Pediátrica",
      description: "Atendimento lúdico e especializado para o desenvolvimento motor infantil, sem o estresse de clínicas.",
      image: "https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&q=80&w=1200",
      icon: Baby,
      color: "indigo"
    },
    {
      title: "Fisioterapia Respiratória",
      description: "Melhora da capacidade pulmonar e tratamento de condições como DPOC e asma, com toda a segurança do seu lar.",
      image: "https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&q=80&w=1200",
      icon: Wind,
      color: "blue"
    },
    {
      title: "Fisioterapia Esportiva",
      description: "Prevenção e tratamento de lesões para atletas com atendimento personalizado e focado no retorno rápido.",
      image: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&q=80&w=1200",
      icon: Zap,
      color: "amber"
    }
  ];

  useEffect(() => {
    const slideInterval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % specialtySlides.length);
    }, 5000);
    return () => clearInterval(slideInterval);
  }, [specialtySlides.length]);

  const specialties = [
    'Todos', 
    'Gerontologia', 
    'Neurofuncional', 
    'Traumato-Ortopédica', 
    'Respiratória', 
    'Saúde da Mulher', 
    'Pediátrica', 
    'Cardiovascular', 
    'Dermatofuncional', 
    'Esportiva', 
    'Oncologia'
  ];

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProfessionals();
    }, 500); // Debounce de 500ms
    return () => clearTimeout(timer);
  }, [nameQuery, locationQuery, specialtyFilter]);

  const fetchProfessionals = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('perfis')
        .select('*')
        .eq('tipo_usuario', 'fisioterapeuta');

      // Filtro por Nome ou E-mail (ilike para ignorar case)
      if (nameQuery) {
        query = query.or(`nome_completo.ilike.%${nameQuery}%,email.ilike.%${nameQuery}%`);
      }

      // Filtro por Localização (ilike para ignorar case)
      if (locationQuery) {
        query = query.ilike('localizacao', `%${locationQuery}%`);
      }

      // Filtro por Especialidade
      if (specialtyFilter && specialtyFilter !== 'Todos') {
        query = query.eq('especialidade', specialtyFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data) {
        const mappedData: Professional[] = data.map((profile: any) => ({
          id: profile.id,
          name: profile.nome_completo || 'Fisioterapeuta',
          spec: profile.especialidade || 'Geral',
          fullSpec: profile.especialidade || 'Fisioterapia Geral',
          img: profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.id}`,
          rating: 5.0, // Default para agora
          reviews: 0,   // Default para agora
          bio: profile.bio || 'Sem biografia disponível.',
          location: profile.localizacao || 'Não informada'
        }));
        setProfessionals(mappedData);
      }
    } catch (error) {
      console.error('Erro ao buscar profissionais:', error);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="-mt-8 -mx-4 sm:-mx-6 lg:-mx-8 bg-white dark:bg-slate-950 transition-colors duration-300">
      {/* Hero Section - Home Care Focus */}
      <section className="relative min-h-[90vh] flex flex-col lg:flex-row overflow-hidden bg-gradient-to-b from-sky-50 to-white dark:from-slate-900 dark:to-slate-950">
        {/* Soft Background Shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-[10%] -left-[5%] w-[60%] h-[60%] bg-home-green/30 rounded-full blur-[100px]" 
          />
          <motion.div 
            animate={{ 
              scale: [1, 1.1, 1],
              opacity: [0.2, 0.4, 0.2]
            }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[20%] right-[0%] w-[50%] h-[50%] bg-home-peach/30 rounded-full blur-[120px]" 
          />
        </div>

        <div className="flex-1 p-8 lg:p-20 flex flex-col justify-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="space-y-8"
          >
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white/90 backdrop-blur-md border border-sky-100 rounded-full text-sky-600 text-sm font-black uppercase tracking-widest shadow-sm"
            >
              <Sparkles size={16} className="text-amber-400" />
              Líder em Reabilitação Domiciliar de Alta Performance
            </motion.div>
            
            <h1 className="text-3xl md:text-4xl font-display font-bold text-[#1A202C] dark:text-white leading-tight tracking-tight">
              {t('home.hero.title1')} <br />
              <span className="text-sky-600 dark:text-sky-400">
                {t('home.hero.title2')}
              </span>
            </h1>
            
            <p className="text-base md:text-lg text-[#1A202C] dark:text-slate-400 max-w-2xl leading-relaxed font-medium">
              {t('home.hero.subtitle')}
            </p>
            
            <div className="flex flex-col sm:flex-row items-center gap-6 pt-4">
              <motion.div
                whileHover={{ scale: 1.05, translateY: -5 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link
                  to="/register"
                  className="px-8 py-4 bg-sky-500 text-white rounded-full font-bold text-lg shadow-xl shadow-sky-500/30 flex items-center gap-2 transition-all hover:bg-sky-600 mb-8"
                >
                  Agendar Avaliação <ArrowRight size={20} />
                </Link>
              </motion.div>
              
              <motion.div 
                whileHover={{ y: -5 }}
                className="flex items-center gap-4 p-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl border border-sky-100 dark:border-slate-700 shadow-lg"
              >
                <div className="w-12 h-12 bg-sky-100 dark:bg-sky-900/50 rounded-full flex items-center justify-center text-sky-600 dark:text-sky-400">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <p className="text-base font-bold text-[#1A202C] dark:text-white">Fisioterapeutas Verificados</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                    <CheckCircle2 size={12} className="text-sky-500" /> Selo de Qualidade FisioCare
                  </p>
                </div>
              </motion.div>
            </div>
            
            <div className="pt-10 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-lg font-black text-[#1A202C] dark:text-white mb-6 uppercase tracking-widest text-center lg:text-left">
                Conheça os Especialistas da Sua Região
              </h4>
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-8">
                <div className="flex -space-x-4">
                  {[
                    "https://images.unsplash.com/photo-1559839734-2b71f1536783?auto=format&fit=crop&q=80&w=150&h=150",
                    "https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=150&h=150",
                    "https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&q=80&w=150&h=150",
                    "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=150&h=150",
                    "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=150&h=150"
                  ].map((url, i) => (
                    <div key={i} className="relative">
                      <img 
                        src={url} 
                        className="w-16 h-16 rounded-full border-4 border-white dark:border-slate-900 object-cover shadow-xl"
                        alt="physiotherapist"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute bottom-0 right-0 bg-white dark:bg-slate-800 rounded-full p-1 shadow-md border border-sky-100 dark:border-slate-700">
                        <CheckCircle2 size={14} className="text-sky-500 fill-sky-50 dark:fill-sky-900" />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-center lg:text-left">
                  <div className="flex justify-center lg:justify-start text-amber-400 mb-1">
                    {[1,2,3,4,5].map(i => <Star key={i} size={20} fill="currentColor" />)}
                  </div>
                  <p className="text-[#1A202C] dark:text-slate-400 font-bold text-lg">+500 profissionais na sua área</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="flex-1 relative min-h-[50vh] lg:min-h-full">
          <motion.div 
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2 }}
            className="absolute inset-0"
          >
            <img 
              src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=2070" 
              className="w-full h-full object-cover"
              alt="Physiotherapist treating elderly patient at home"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-home-blue via-transparent to-transparent lg:block hidden" />
            <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
          </motion.div>

          {/* Floating Accessibility Card */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="absolute bottom-16 left-6 right-6 lg:left-12 lg:right-auto lg:w-[28rem] p-8 md:p-10 bg-white/80 dark:bg-slate-800/80 backdrop-blur-2xl border border-white/50 dark:border-slate-700/50 rounded-[3rem] shadow-2xl z-10"
          >
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-6">
              <div className="w-20 h-20 bg-sky-500 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-sky-500/30 flex-shrink-0 rotate-3">
                <Heart size={40} />
              </div>
              <div className="text-center sm:text-left">
                <p className="text-sm font-black text-sky-600 uppercase tracking-[0.2em] mb-2">Atendimento VIP</p>
                <p className="text-2xl font-black text-[#1A202C] dark:text-white leading-none tracking-tight">Fisioterapia Sem Limites</p>
              </div>
            </div>
            <p className="text-lg text-[#1A202C] dark:text-slate-400 leading-relaxed font-medium text-center sm:text-left">
              Atenção total e personalizada para idosos e pós-operatórios. Qualidade de clínica com a conveniência e segurança do seu domicílio.
            </p>
          </motion.div>

          {/* Suporte FisioCareHub Label */}
          <div className="absolute bottom-4 left-6 z-20 opacity-70 pointer-events-none hidden md:block">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Suporte FisioCareHub
            </span>
          </div>
        </div>
      </section>

      {/* Specialties Slider Section - Modern & Professional */}
      <section className="py-24 px-8 lg:px-20 bg-white dark:bg-slate-950 relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 space-y-2">
            <h2 className="text-sm font-bold text-sky-600 uppercase tracking-[0.4em]">Especialidades</h2>
            <h3 className="text-3xl md:text-4xl font-display font-bold text-[#1A202C] dark:text-white tracking-tight">
              Excelência em <span className="text-sky-500">Diversas Áreas</span>
            </h3>
          </div>

          <div className="relative h-[500px] md:h-[600px] rounded-[4rem] overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 1, ease: "easeInOut" }}
                className="absolute inset-0"
              >
                <img 
                  src={specialtySlides[currentSlide].image} 
                  className="w-full h-full object-cover"
                  alt={specialtySlides[currentSlide].title}
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-blue-950/90 via-blue-950/40 to-transparent" />
                
                <div className="absolute bottom-0 left-0 right-0 p-8 md:p-16 text-white">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex items-center gap-4 mb-6"
                  >
                    <div className={cn(
                      "w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg backdrop-blur-md",
                      specialtySlides[currentSlide].color === 'sky' && "bg-sky-500/80",
                      specialtySlides[currentSlide].color === 'emerald' && "bg-emerald-500/80",
                      specialtySlides[currentSlide].color === 'orange' && "bg-orange-500/80",
                      specialtySlides[currentSlide].color === 'indigo' && "bg-indigo-500/80",
                      specialtySlides[currentSlide].color === 'blue' && "bg-blue-500/80",
                      specialtySlides[currentSlide].color === 'amber' && "bg-amber-500/80",
                    )}>
                      {(() => {
                        const Icon = specialtySlides[currentSlide].icon;
                        return <Icon size={32} />;
                      })()}
                    </div>
                    <h4 className="text-2xl md:text-4xl font-display font-bold tracking-tight">
                      {specialtySlides[currentSlide].title}
                    </h4>
                  </motion.div>
                  
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="text-lg md:text-xl text-sky-50/80 max-w-2xl font-medium leading-relaxed"
                  >
                    {specialtySlides[currentSlide].description}
                  </motion.p>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Slider Controls */}
            <div className="absolute bottom-8 right-8 md:right-16 flex gap-3 z-20">
              {specialtySlides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className={cn(
                    "h-2 rounded-full transition-all duration-500",
                    currentSlide === i ? "w-12 bg-sky-500" : "w-3 bg-white/30 hover:bg-white/50"
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-24 px-8 lg:px-20 bg-slate-50 dark:bg-slate-900/50 relative overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16 space-y-2">
            <h2 className="text-sm font-bold text-sky-600 uppercase tracking-[0.4em]">Simples e Rápido</h2>
            <h3 className="text-3xl md:text-4xl font-display font-bold text-[#1A202C] dark:text-white tracking-tight">
              Como funciona o <span className="text-sky-500">FisioCareHub?</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
            {/* Connection Line (Desktop) */}
            <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-sky-100 dark:bg-sky-900 -translate-y-1/2 z-0" />
            
            {[
              {
                step: '01',
                title: 'Solicite seu Atendimento',
                desc: 'Diga-nos o que você precisa e nossa plataforma encontrará o especialista mais próximo de você rapidamente.',
                icon: ClipboardCheck,
                color: 'bg-sky-500'
              },
              {
                step: '02',
                title: 'Escolha seu Especialista',
                desc: 'Analise perfis, especialidades e avaliações reais para escolher o profissional que melhor atende suas necessidades.',
                icon: UserCheck,
                color: 'bg-emerald-500'
              },
              {
                step: '03',
                title: 'Recupere-se em Casa',
                desc: 'Receba o tratamento completo com toda a atenção que você merece, no ambiente onde você se sente mais seguro.',
                icon: HomeIcon,
                color: 'bg-orange-500'
              }
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                className="relative z-10 flex flex-col items-center text-center group"
              >
                <div className={cn(
                  "w-20 h-20 rounded-full flex items-center justify-center text-white shadow-xl mb-6 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6",
                  item.color
                )}>
                  <item.icon size={36} />
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-900 dark:text-white font-black text-sm shadow-md border border-slate-100 dark:border-slate-700">
                    {item.step}
                  </div>
                </div>
                <h4 className="text-xl font-bold text-[#1A202C] dark:text-white mb-3">{item.title}</h4>
                <p className="text-[#1A202C] dark:text-slate-400 font-medium leading-relaxed max-w-xs">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Professionals Section - Dynamic Grid with Search & Filter */}
      <section className="py-24 px-8 lg:px-20 bg-white dark:bg-slate-950">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-sm font-bold text-sky-600 uppercase tracking-[0.4em]">Nossa Equipe</h2>
            <h3 className="text-3xl md:text-4xl font-display font-bold text-[#1A202C] dark:text-white tracking-tight">Especialistas na Sua Região</h3>
            
            {/* Search and Filter Bar */}
            <div className="max-w-5xl mx-auto pt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Nome Filter */}
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors" size={20} />
                <input 
                  type="text" 
                  placeholder="Nome do profissional..."
                  value={nameQuery}
                  onChange={(e) => setNameQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl text-base focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all dark:text-white"
                />
              </div>

              {/* Localização Filter */}
              <div className="relative group">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors" size={20} />
                <input 
                  type="text" 
                  placeholder="Cidade ou Bairro..."
                  value={locationQuery}
                  onChange={(e) => setLocationQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl text-base focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all dark:text-white"
                />
              </div>

              {/* Especialidade Filter */}
              <div className="relative group">
                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors" size={20} />
                <select 
                  value={specialtyFilter}
                  onChange={(e) => setSpecialtyFilter(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl text-base focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all dark:text-white appearance-none cursor-pointer"
                >
                  {specialties.map(spec => (
                    <option key={spec} value={spec}>{spec}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <ArrowRight size={16} className="rotate-90" />
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {professionals.length > 0 ? (
              professionals.map((pro, i) => (
                <motion.div
                  key={pro.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                  whileHover={{ y: -10 }}
                  className="bg-white dark:bg-slate-900 p-6 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-xl flex flex-col items-center text-center group"
                >
                  <div className="relative mb-6">
                    <div className="absolute inset-0 bg-sky-500/10 rounded-[2rem] blur-2xl group-hover:bg-sky-500/20 transition-colors" />
                    <img 
                      src={pro.img} 
                      className="w-32 h-32 rounded-[2rem] border-4 border-white dark:border-slate-800 object-cover shadow-2xl relative z-10"
                      alt={pro.name}
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute -bottom-2 -right-2 bg-white dark:bg-slate-800 rounded-full p-2 shadow-xl border border-sky-100 dark:border-slate-700 z-20">
                      <CheckCircle2 size={20} className="text-sky-500 fill-sky-50 dark:fill-sky-900" />
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 text-amber-400 mb-2">
                    <Star size={16} fill="currentColor" />
                    <span className="text-sm font-bold text-[#1A202C] dark:text-white">{pro.rating}</span>
                    <span className="text-xs text-slate-400 font-medium">({pro.reviews})</span>
                  </div>
                  
                  <h4 className="text-xl font-black text-[#1A202C] dark:text-white mb-1">{pro.name}</h4>
                  <p className="text-sky-600 dark:text-sky-400 font-black text-xs uppercase tracking-widest mb-4">{pro.fullSpec}</p>
                  <p className="text-[#1A202C] dark:text-slate-400 text-sm font-medium mb-8 leading-relaxed line-clamp-3">
                    {pro.bio}
                  </p>
                  
                  <Link
                    to="/register"
                    className="w-full py-4 bg-slate-50 dark:bg-slate-800 text-sky-600 dark:text-sky-400 rounded-2xl font-black text-sm shadow-sm hover:bg-sky-500 hover:text-white transition-all border border-sky-100 dark:border-slate-700 flex items-center justify-center gap-2 mt-auto"
                  >
                    Ver Perfil Completo <ArrowRight size={16} />
                  </Link>
                </motion.div>
              ))
            ) : (
              <div className="col-span-full py-20 text-center">
                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-400">
                  <Search size={40} />
                </div>
                <h4 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Nenhum especialista encontrado</h4>
                <p className="text-slate-500 dark:text-slate-400">Tente ajustar sua busca ou filtros para encontrar o que procura.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 md:px-12">
        <div className="max-w-7xl mx-auto bg-gradient-to-br from-sky-500 to-sky-600 rounded-[3rem] p-10 md:p-16 text-center text-white relative overflow-hidden shadow-xl shadow-sky-200 dark:shadow-sky-900/20">
          <div className="relative z-10 space-y-6 max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-display font-bold tracking-tight">
              VAMOS COMEÇAR <br /> A REABILITAÇÃO?
            </h2>
            <p className="text-base md:text-lg text-sky-50 font-medium">
              Agende uma avaliação inicial hoje mesmo e descubra como a fisioterapia domiciliar pode transformar seu bem-estar.
            </p>
            <div className="flex flex-wrap justify-center gap-4 pt-2">
              <Link
                to="/register"
                className="px-8 py-4 bg-white text-sky-600 rounded-full font-bold text-lg hover:scale-105 transition-all shadow-lg"
              >
                Cadastrar Agora
              </Link>
              <Link
                to="/login"
                className="px-8 py-4 bg-transparent border-2 border-white/30 text-white rounded-full font-bold text-lg hover:bg-white/10 transition-all"
              >
                Fazer Login
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
