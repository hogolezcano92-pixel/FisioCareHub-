import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
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
  Home as HomeIcon,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, resolveStorageUrl } from '../lib/utils';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import PhysioHighlight from '../components/PhysioHighlight';

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
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [nameQuery, setNameQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('Todos');
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [proSlideIndex, setProSlideIndex] = useState(0);
  const [itemsVisible, setItemsVisible] = useState(1);

  useEffect(() => {
    const updateItemsVisible = () => {
      if (window.innerWidth >= 1024) setItemsVisible(4);
      else if (window.innerWidth >= 768) setItemsVisible(2);
      else setItemsVisible(1);
    };
    updateItemsVisible();
    window.addEventListener('resize', updateItemsVisible);
    return () => window.removeEventListener('resize', updateItemsVisible);
  }, []);

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
    // Only redirect if at the root path and logged in
    if (!authLoading && user && window.location.pathname === '/') {
      navigate('/dashboard');
    }
  }, [user, authLoading, navigate]);

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
    }, 300); // Debounce de 300ms
    return () => clearTimeout(timer);
  }, [nameQuery, locationQuery, specialtyFilter]);

  useEffect(() => {
    if (professionals.length > itemsVisible) {
      const proInterval = setInterval(() => {
        nextProSlide();
      }, 4000);
      return () => clearInterval(proInterval);
    }
  }, [professionals.length, itemsVisible, proSlideIndex]);

  const fetchProfessionals = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('perfis')
        .select('*')
        .eq('tipo_usuario', 'fisioterapeuta')
        .in('status_aprovacao', ['aprovado', 'pendente']);

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

      if (data && data.length > 0) {
        const mappedData: Professional[] = data.map((profile: any) => ({
          id: profile.id,
          name: profile.nome_completo || 'Fisioterapeuta',
          spec: profile.especialidade || 'Geral',
          fullSpec: profile.especialidade || 'Fisioterapia Geral',
          img: resolveStorageUrl(profile.avatar_url) || `https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=300&h=300`,
          rating: 5.0,
          reviews: Math.floor(Math.random() * 50) + 10,
          bio: profile.bio || 'Especialista dedicado à reabilitação domiciliar com foco no bem-estar do paciente.',
          location: profile.localizacao || 'Sua Região'
        }));
        setProfessionals(mappedData);
      } else {
        // Sample data for demo if DB is empty
        const samplePros: Professional[] = [
          {
            id: '1',
            name: 'Dra. Ana Silva',
            spec: 'Ortopedia',
            fullSpec: 'Fisioterapia Traumato-Ortopédica',
            img: 'https://images.unsplash.com/photo-1559839734-2b71f1536783?auto=format&fit=crop&q=80&w=300&h=300',
            rating: 5.0,
            reviews: 42,
            bio: 'Especialista em reabilitação de coluna e membros inferiores com mais de 10 anos de experiência.',
            location: 'São Paulo, SP'
          },
          {
            id: '2',
            name: 'Dr. Lucas Santos',
            spec: 'Neurofuncional',
            fullSpec: 'Fisioterapia Neurofuncional',
            img: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=300&h=300',
            rating: 4.9,
            reviews: 38,
            bio: 'Focado na recuperação de pacientes pós-AVC e doenças degenerativas com atendimento humanizado.',
            location: 'Rio de Janeiro, RJ'
          },
          {
            id: '3',
            name: 'Dra. Juliana Costa',
            spec: 'Pediátrica',
            fullSpec: 'Fisioterapia Pediátrica',
            img: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&q=80&w=300&h=300',
            rating: 5.0,
            reviews: 25,
            bio: 'Atendimento lúdico para crianças com atraso no desenvolvimento motor e condições congênitas.',
            location: 'Belo Horizonte, MG'
          },
          {
            id: '4',
            name: 'Dr. Ricardo Oliveira',
            spec: 'Esportiva',
            fullSpec: 'Fisioterapia Esportiva',
            img: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=300&h=300',
            rating: 4.8,
            reviews: 56,
            bio: 'Especialista em retorno ao esporte e prevenção de lesões para atletas amadores e profissionais.',
            location: 'Curitiba, PR'
          },
          {
            id: '5',
            name: 'Dra. Carla Mendes',
            spec: 'Gerontologia',
            fullSpec: 'Fisioterapia Geriátrica',
            img: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=300&h=300',
            rating: 5.0,
            reviews: 31,
            bio: 'Dedicada à manutenção da autonomia e prevenção de quedas em idosos no ambiente domiciliar.',
            location: 'Porto Alegre, RS'
          }
        ];
        setProfessionals(samplePros);
      }
    } catch (error) {
      console.error('Erro ao buscar profissionais:', error);
    } finally {
      setLoading(false);
    }
  };


  const nextProSlide = () => {
    if (professionals.length === 0) return;
    setProSlideIndex((prev) => (prev + 1) % (professionals.length - itemsVisible + 1));
  };

  const prevProSlide = () => {
    if (professionals.length === 0) return;
    setProSlideIndex((prev) => (prev - 1 + (professionals.length - itemsVisible + 1)) % (professionals.length - itemsVisible + 1));
  };

  return (
    <div className="bg-slate-950 transition-colors duration-300 selection:bg-blue-500/30">
      {/* Hero Section - Home Care Focus */}
      <section className="relative min-h-[95vh] flex flex-col lg:flex-row overflow-hidden">
        {/* Advanced Background with Animated Gradients */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(11,17,32,1),rgba(2,6,23,1))]" />
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.15, 0.25, 0.15],
              x: [0, 50, 0],
              y: [0, -30, 0]
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-[10%] -left-[5%] w-[70%] h-[70%] bg-blue-600/30 rounded-full blur-[120px]" 
          />
          <motion.div 
            animate={{ 
              scale: [1, 1.1, 1],
              opacity: [0.1, 0.2, 0.1],
              x: [0, -40, 0],
              y: [0, 40, 0]
            }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[20%] right-[0%] w-[60%] h-[60%] bg-sky-500/20 rounded-full blur-[140px]" 
          />
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay" />
        </div>

        <div className="flex-1 p-6 sm:p-10 lg:p-24 flex flex-col justify-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-10"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl"
            >
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em]">Plataforma Premium</span>
              </div>
              <div className="w-px h-4 bg-white/10 mx-1" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fisioterapia 4.0</span>
            </motion.div>
            
            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-display font-black text-white leading-[1.1] sm:leading-[1] tracking-tighter text-center max-w-6xl mx-auto">
              <div className="flex flex-wrap justify-center gap-x-[0.3em] overflow-hidden py-1">
                {['Conectando', 'cuidado', 'especializado'].map((word, i) => (
                  <motion.span
                    key={i}
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    transition={{ duration: 0.8, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                    className="inline-block"
                  >
                    {word}
                  </motion.span>
                ))}
              </div>
              <div className="flex flex-wrap justify-center gap-x-[0.3em] overflow-hidden py-1">
                <span className="bg-gradient-to-r from-blue-400 via-sky-400 to-indigo-400 bg-clip-text text-transparent italic flex flex-wrap justify-center gap-x-[0.3em]">
                  {['com', 'profissionalismo', 'de', 'alto', 'nível'].map((word, i) => (
                    <motion.span
                      key={i}
                      initial={{ y: "100%" }}
                      animate={{ y: 0 }}
                      transition={{ duration: 0.8, delay: 0.4 + (i * 0.1), ease: [0.22, 1, 0.36, 1] }}
                      className="inline-block"
                    >
                      {word}
                    </motion.span>
                  ))}
                </span>
              </div>
            </h1>
            
            <p className="text-lg md:text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed font-medium opacity-80 text-center">
              A plataforma inteligente que une pacientes em busca de reabilitação domiciliar a fisioterapeutas que buscam gestão eficiente e novos pacientes. Tecnologia e cuidado humanizado em um só lugar.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-6">
              <motion.div
                whileHover={{ scale: 1.02, y: -4 }}
                whileTap={{ scale: 0.98 }}
                className="w-full sm:w-auto"
              >
                <Link
                  to={user ? "/buscar-fisio" : "/register"}
                  onClick={() => !user && localStorage.setItem('pending_role', 'paciente')}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-10 py-5 bg-blue-600 text-white rounded-[2rem] font-black text-lg shadow-[0_20px_50px_-15px_rgba(37,99,235,0.5)] hover:bg-blue-500 transition-all group"
                >
                  <HomeIcon size={22} /> Encontrar Fisioterapeuta
                </Link>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02, y: -4 }}
                whileTap={{ scale: 0.98 }}
                className="w-full sm:w-auto"
              >
                <Link
                  to="/register"
                  onClick={() => localStorage.setItem('pending_role', 'fisioterapeuta')}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-10 py-5 bg-transparent border-2 border-white/30 text-white rounded-[2rem] font-black text-lg hover:bg-white/10 transition-all group"
                >
                  <Stethoscope size={22} /> Sou Fisioterapeuta
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </div>

        <div className="flex-1 relative min-h-[60vh] lg:min-h-full">
          <motion.div 
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
          >
            <img 
              src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=2070" 
              className="w-full h-full object-cover"
              alt="Physiotherapy session"
              referrerPolicy="no-referrer"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/20 to-transparent lg:block hidden" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
            
            {/* Floating Glass UI Element */}
            <motion.div
              animate={{ y: [0, -20, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-20 right-10 hidden lg:block p-6 bg-white/10 backdrop-blur-3xl border border-white/20 rounded-[2.5rem] shadow-2xl z-20 w-64"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400">
                  <Activity size={24} />
                </div>
                <div>
                  <p className="text-xs font-black text-white uppercase tracking-widest">Status Vital</p>
                  <p className="text-lg font-black text-emerald-400">Estável</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: "85%" }}
                    transition={{ duration: 2, delay: 1 }}
                    className="h-full bg-emerald-500" 
                  />
                </div>
                <p className="text-[10px] font-bold text-slate-400 text-right">85% Recuperação</p>
              </div>
            </motion.div>
          </motion.div>

          {/* Floating Accessibility Card */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.8 }}
            className="absolute bottom-16 left-6 right-6 lg:left-auto lg:right-12 lg:w-[30rem] p-10 bg-slate-900/60 backdrop-blur-3xl border border-white/10 rounded-[3.5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] z-10"
          >
            <div className="flex items-start gap-6 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-2xl flex-shrink-0 -rotate-6">
                <Heart size={32} />
              </div>
              <div>
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mb-2">Cuidado Domiciliar</p>
                <p className="text-3xl font-black text-white leading-none tracking-tight">Fisioterapia VIP</p>
              </div>
            </div>
            <p className="text-lg text-slate-400 leading-relaxed font-medium">
              Atenção total e personalizada para idosos e pós-operatórios. Qualidade de clínica com a conveniência e segurança do seu domicílio.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Mirrored Benefits Section */}
      <section className="py-32 px-6 lg:px-20 relative z-20 -mt-20">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Patient Card */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="group p-10 bg-slate-900/40 backdrop-blur-3xl border border-white/10 rounded-[3.5rem] shadow-2xl hover:bg-slate-900/60 transition-all duration-500"
          >
            <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center text-blue-400 mb-8 group-hover:scale-110 transition-transform">
              <Heart size={32} />
            </div>
            <h3 className="text-3xl font-black text-white mb-6 tracking-tight">Recupere sua saúde com conforto e segurança.</h3>
            <ul className="space-y-4">
              {[
                { text: "Encontre especialistas verificados", icon: UserCheck },
                { text: "Atendimento domiciliar premium", icon: HomeIcon },
                { text: "Acompanhamento de evolução", icon: Activity }
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-slate-400 font-medium">
                  <item.icon size={20} className="text-blue-500" />
                  {item.text}
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Physio Card */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="group p-10 bg-slate-900/40 backdrop-blur-3xl border border-white/10 rounded-[3.5rem] shadow-2xl hover:bg-slate-900/60 transition-all duration-500"
          >
            <div className="w-16 h-16 bg-indigo-600/20 rounded-2xl flex items-center justify-center text-indigo-400 mb-8 group-hover:scale-110 transition-transform">
              <Stethoscope size={32} />
            </div>
            <h3 className="text-3xl font-black text-white mb-6 tracking-tight">Impulsione sua carreira e simplifique sua rotina.</h3>
            <ul className="space-y-4">
              {[
                { text: "Novos pacientes na sua região", icon: Users },
                { text: "Agenda e prontuários digitais", icon: FileText },
                { text: "Pagamentos garantidos", icon: ShieldCheck }
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-slate-400 font-medium">
                  <item.icon size={20} className="text-indigo-500" />
                  {item.text}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </section>

      {/* Specialties Slider Section - Modern & Professional */}
      <section className="py-32 px-6 lg:px-20 relative overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-8">
            <div className="space-y-4">
              <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.5em]">Especialidades Médicas</p>
              <h3 className="text-4xl md:text-6xl font-display font-black text-white tracking-tighter leading-none">
                Excelência em <br />
                <span className="bg-gradient-to-r from-blue-400 to-sky-400 bg-clip-text text-transparent italic">Diversas Áreas</span>
              </h3>
            </div>
            <div className="flex gap-4">
              <button 
                onClick={() => setCurrentSlide((prev) => (prev - 1 + specialtySlides.length) % specialtySlides.length)}
                className="w-14 h-14 rounded-full border border-white/10 flex items-center justify-center text-white hover:bg-white/5 transition-all"
              >
                <ChevronLeft size={24} />
              </button>
              <button 
                onClick={() => setCurrentSlide((prev) => (prev + 1) % specialtySlides.length)}
                className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-white hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/20"
              >
                <ChevronRight size={24} />
              </button>
            </div>
          </div>

          <div className="relative h-[600px] rounded-[4rem] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.7)] border border-white/5">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0"
              >
                <img 
                  src={specialtySlides[currentSlide].image} 
                  className="w-full h-full object-cover"
                  alt={specialtySlides[currentSlide].title}
                  referrerPolicy="no-referrer"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                
                <div className="absolute bottom-0 left-0 right-0 p-10 md:p-20 text-white">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex items-center gap-6 mb-8"
                  >
                    <div className={cn(
                      "w-20 h-20 rounded-[2rem] flex items-center justify-center shadow-2xl backdrop-blur-3xl border border-white/20",
                      specialtySlides[currentSlide].color === 'sky' && "bg-sky-500/40",
                      specialtySlides[currentSlide].color === 'emerald' && "bg-emerald-500/40",
                      specialtySlides[currentSlide].color === 'orange' && "bg-orange-500/40",
                      specialtySlides[currentSlide].color === 'indigo' && "bg-indigo-500/40",
                      specialtySlides[currentSlide].color === 'blue' && "bg-blue-500/40",
                      specialtySlides[currentSlide].color === 'amber' && "bg-amber-500/40",
                    )}>
                      {(() => {
                        const Icon = specialtySlides[currentSlide].icon;
                        return <Icon size={40} className="text-white" />;
                      })()}
                    </div>
                    <h4 className="text-3xl md:text-5xl font-display font-black tracking-tight">
                      {specialtySlides[currentSlide].title}
                    </h4>
                  </motion.div>
                  
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="text-xl md:text-2xl text-slate-300 max-w-3xl font-medium leading-relaxed opacity-90"
                  >
                    {specialtySlides[currentSlide].description}
                  </motion.p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* How it Works Section - Bento Grid Style */}
      <section className="py-32 px-6 lg:px-20 bg-slate-900/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-24 space-y-4">
            <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.5em]">Processo Inteligente</p>
            <h3 className="text-4xl md:text-6xl font-display font-black text-white tracking-tighter">
              Sua Jornada de <span className="text-blue-500 italic">Recuperação</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Solicitação Inteligente / Cadastro Rápido',
                desc: 'Pacientes solicitam atendimento personalizado enquanto fisioterapeutas se cadastram em nossa rede de elite.',
                icon: ClipboardCheck,
                gradient: 'from-blue-500/20 to-sky-500/20'
              },
              {
                step: '02',
                title: 'Curadoria de Elite / Aceite de Atendimento',
                desc: 'Nossa IA sugere os melhores profissionais para cada caso, e o fisioterapeuta aceita o atendimento com um clique.',
                icon: UserCheck,
                gradient: 'from-indigo-500/20 to-purple-500/20'
              },
              {
                step: '03',
                title: 'Cuidado e Gestão Unificados',
                desc: 'O atendimento acontece com excelência enquanto o profissional utiliza nossas ferramentas de gestão integradas.',
                icon: HomeIcon,
                gradient: 'from-emerald-500/20 to-teal-500/20'
              }
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                className="group relative p-10 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[3rem] hover:bg-white/10 transition-all duration-500"
              >
                <div className={cn(
                  "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-[3rem]",
                  item.gradient
                )} />
                <div className="relative z-10">
                  <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center text-white mb-8 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500 border border-white/10">
                    <item.icon size={36} className="text-blue-400" />
                  </div>
                  <span className="text-5xl font-black text-white/10 absolute top-10 right-10 group-hover:text-blue-500/20 transition-colors">
                    {item.step}
                  </span>
                  <h4 className="text-2xl font-black text-white mb-4 tracking-tight">{item.title}</h4>
                  <p className="text-slate-400 font-medium leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Professionals Section - Dynamic Grid */}
      <section className="py-32 px-6 lg:px-20">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-8">
            <div className="space-y-4">
              <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em]">Nossa Rede</p>
              <h3 className="text-4xl md:text-6xl font-display font-black text-white tracking-tighter">Especialistas <span className="text-blue-500 italic">Verificados</span></h3>
            </div>
            
            {/* Search and Filter Bar - Compact SaaS Style */}
            <div className="flex-1 max-w-2xl flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors pointer-events-none" size={18} />
                <input 
                  type="text" 
                  placeholder="Buscar por nome..."
                  value={nameQuery}
                  onChange={(e) => setNameQuery(e.target.value)}
                  className="w-full !pl-10 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-white placeholder:text-slate-500"
                />
              </div>
              <button 
                onClick={() => navigate('/buscar-fisio')}
                className="px-8 py-3.5 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-500 transition-all shadow-lg shadow-blue-900/20"
              >
                Ver Todos
              </button>
            </div>
          </div>
          
          <div className="relative group">
            {professionals.length > 0 ? (
              <div className="relative">
                {/* Navigation Buttons */}
                <div className="absolute -left-4 lg:-left-12 top-1/2 -translate-y-1/2 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => setProSlideIndex(prev => Math.max(0, prev - 1))}
                    disabled={proSlideIndex === 0}
                    className="w-12 h-12 bg-white/10 backdrop-blur-xl border border-white/10 rounded-full flex items-center justify-center text-white hover:bg-blue-600 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={24} />
                  </button>
                </div>
                
                <div className="absolute -right-4 lg:-right-12 top-1/2 -translate-y-1/2 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => setProSlideIndex(prev => Math.min(professionals.length - itemsVisible, prev + 1))}
                    disabled={proSlideIndex >= professionals.length - itemsVisible}
                    className="w-12 h-12 bg-white/10 backdrop-blur-xl border border-white/10 rounded-full flex items-center justify-center text-white hover:bg-blue-600 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={24} />
                  </button>
                </div>

                <div className="overflow-hidden">
                  <motion.div 
                    initial={false}
                    animate={{ x: `-${proSlideIndex * (100 / itemsVisible)}%` }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="flex gap-8"
                  >
                    {professionals.map((pro) => (
                      <div
                        key={pro.id}
                        className={cn(
                          "flex-shrink-0 px-4",
                          itemsVisible === 1 ? "w-full" : itemsVisible === 2 ? "w-1/2" : "w-1/4"
                        )}
                      >
                        <motion.div
                          className="group/card relative bg-white/5 backdrop-blur-xl p-8 rounded-[3rem] border border-white/10 hover:bg-white/10 transition-all duration-500 flex flex-col items-center text-center h-full"
                        >
                          <div className="relative mb-8">
                            <div className="absolute inset-0 bg-blue-500/20 rounded-[2.5rem] blur-2xl group-hover/card:bg-blue-500/40 transition-colors" />
                            <img 
                              src={pro.img} 
                              className="w-32 h-32 rounded-[2.5rem] border-4 border-white/10 object-cover shadow-2xl relative z-10 grayscale group-hover/card:grayscale-0 transition-all duration-500"
                              alt={pro.name}
                              loading="lazy"
                            />
                            <div className="absolute -bottom-2 -right-2 bg-slate-900 rounded-full p-2.5 shadow-2xl border border-white/10 z-20">
                              <div className="ping-online">
                                <span className="ping-online-circle"></span>
                                <span className="ping-online-dot"></span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1.5 text-amber-400 mb-3">
                            <Star size={14} fill="currentColor" />
                            <span className="text-sm font-black text-white">{pro.rating}</span>
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">({pro.reviews} reviews)</span>
                          </div>
                          
                          <h4 className="text-xl font-black text-white mb-1 tracking-tight">{pro.name}</h4>
                          <p className="text-blue-400 font-black text-[10px] uppercase tracking-[0.2em] mb-6">{pro.fullSpec}</p>
                          
                          <Link
                            to={`/physio/${pro.id}`}
                            className="w-full py-4 bg-white/5 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-sm hover:bg-blue-600 transition-all border border-white/10 flex items-center justify-center gap-2 mt-auto group/btn"
                          >
                            Ver Perfil <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                          </Link>
                        </motion.div>
                      </div>
                    ))}
                  </motion.div>
                </div>
                
                {/* Pagination Dots */}
                <div className="flex justify-center gap-2 mt-12">
                  {Array.from({ length: Math.max(0, professionals.length - itemsVisible + 1) }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setProSlideIndex(i)}
                      className={cn(
                        "h-1.5 transition-all duration-300 rounded-full",
                        proSlideIndex === i ? "w-8 bg-blue-600" : "w-1.5 bg-white/20 hover:bg-white/40"
                      )}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-32 text-center bg-white/5 rounded-[4rem] border border-white/5">
                <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-8 text-slate-600">
                  <Search size={48} />
                </div>
                <h4 className="text-3xl font-black text-white mb-3 tracking-tight">Nenhum especialista encontrado</h4>
                <p className="text-lg text-slate-500 font-medium">Tente ajustar sua busca ou filtros.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* New Physio Highlight Section */}
      <PhysioHighlight />

      {/* CTA Section - High Impact SaaS Style */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto relative group">
          <div className="absolute inset-0 bg-blue-600 rounded-[4rem] blur-[100px] opacity-20 group-hover:opacity-30 transition-opacity" />
          <div className="relative bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[4rem] p-12 md:p-24 text-center text-white overflow-hidden shadow-2xl">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay" />
            <div className="relative z-10 space-y-10 max-w-4xl mx-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="inline-block px-6 py-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full text-[10px] font-black uppercase tracking-[0.4em]"
              >
                Pronto para a Mudança?
              </motion.div>
              <h2 className="text-4xl md:text-7xl font-display font-black tracking-tighter leading-none">
                VAMOS COMEÇAR SUA <br />
                <span className="italic opacity-80">NOVA JORNADA?</span>
              </h2>
              <p className="text-xl md:text-2xl text-blue-50 font-medium opacity-90 max-w-2xl mx-auto">
                Agende uma avaliação inicial hoje mesmo e descubra como a fisioterapia domiciliar pode transformar seu bem-estar.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4 pt-6">
                <Link
                  to="/register"
                  className="px-10 py-5 bg-white text-blue-600 rounded-2xl font-black text-base hover:bg-blue-50 transition-all shadow-xl shadow-white/10 active:scale-95"
                >
                  Cadastrar Agora
                </Link>
                <Link
                  to="/login"
                  className="px-10 py-5 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-2xl font-black text-base hover:bg-white/20 transition-all active:scale-95"
                >
                  Fazer Login
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
