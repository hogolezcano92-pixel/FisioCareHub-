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
      image: "https://tuiuti.edu.br/wp-content/uploads/2022/12/shutterstock_1177541623.jpg",
      icon: Bone,
      color: "sky"
    },
    {
      title: "Fisioterapia Neurofuncional",
      description: "Reabilitação domiciliar focada em pacientes pós-AVC, Parkinson e outras condições neurológicas complexas.",
      image: "https://clinicamotricita.com.br/motri/images/treinodemarchacomsuspensoparcialdepeso.jpg",
      icon: Brain,
      color: "emerald"
    },
    {
      title: "Fisioterapia Geriátrica",
      description: "Cuidado dedicado à terceira idade no ambiente domiciliar, focando em mobilidade, equilíbrio e independência.",
      image: "https://clinicaportal.com.br/wp-content/uploads/2021/02/Fisioterapia-para-idosos-como-a-pratica-ajuda-na-reabilitacao-e-autonomia-1024x683.jpg.webp",
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
      image: "https://i0.wp.com/www.clinicadospes.com.br/wp-content/uploads/2021/08/fisioterapia-respiratoria-scaled.jpg?fit=2560%2C1707&ssl=1",
      icon: Wind,
      color: "blue"
    },
    {
      title: "Fisioterapia Esportiva",
      description: "Prevenção e tratamento de lesões para atletas com atendimento personalizado e focado no retorno rápido.",
      image: "https://blogfisioterapia.com.br/wp-content/uploads/2023/09/Fisioterapia-esportiva.png",
      icon: Zap,
      color: "amber"
    }
  ];

  useEffect(() => {
    document.title = "FisioCareHub - Conectando Fisioterapeutas e Pacientes";
  }, []);

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
        .eq('status_aprovacao', 'aprovado');

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
        setProfessionals([]);
      }
    } catch (error) {
      console.error('Erro ao buscar profissionais:', error);
      setProfessionals([]);
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
      <section className="relative min-h-[90vh] flex flex-col lg:flex-row overflow-hidden">
        {/* Advanced Background with Subtle Animated Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(11,17,32,1),rgba(2,6,23,1))]" />
          
          {/* Animated Blobs - Slower and more subtle */}
          <motion.div 
            animate={{ 
              scale: [1, 1.3, 1],
              opacity: [0.1, 0.2, 0.1],
              rotate: [0, 90, 0],
              x: [0, 30, 0],
              y: [0, -40, 0]
            }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute -top-[10%] -left-[5%] w-[80%] h-[80%] bg-blue-600/20 rounded-full blur-[140px]" 
          />
          <motion.div 
            animate={{ 
              scale: [1.2, 1, 1.2],
              opacity: [0.05, 0.15, 0.05],
              rotate: [0, -60, 0],
              x: [0, -50, 0],
              y: [0, 50, 0]
            }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            className="absolute top-[30%] right-[0%] w-[70%] h-[70%] bg-sky-500/15 rounded-full blur-[160px]" 
          />
          
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.04] mix-blend-overlay" />
        </div>

        <div className="flex-1 p-6 sm:p-10 lg:p-24 flex flex-col justify-center relative z-10">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.15,
                  delayChildren: 0.2
                }
              }
            }}
            className="space-y-12 max-w-5xl mx-auto lg:mx-0 text-center lg:text-left"
          >
            <motion.div 
              variants={{
                hidden: { opacity: 0, scale: 0.8, y: 20 },
                visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
              }}
              className="inline-flex items-center gap-3 px-5 py-2.5 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-full shadow-2xl mx-auto lg:mx-0"
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em]">Cuidado Domiciliar Premium</span>
              </div>
              <div className="w-px h-4 bg-white/10 mx-1" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fisioterapia Especializada</span>
            </motion.div>
            
            <div className="space-y-6">
              <h1 className="text-5xl sm:text-7xl lg:text-[8rem] font-display font-black text-white leading-[0.95] tracking-tighter">
                <motion.span 
                  variants={{
                    hidden: { opacity: 0, y: 30 },
                    visible: { opacity: 1, y: 0 }
                  }}
                  className="block"
                >
                  Saúde e
                </motion.span>
                <motion.span 
                  variants={{
                    hidden: { opacity: 0, y: 30 },
                    visible: { opacity: 1, y: 0 }
                  }}
                  className="block bg-gradient-to-r from-blue-400 via-sky-400 to-indigo-400 bg-clip-text text-transparent italic"
                >
                  Bem-estar
                </motion.span>
                <motion.span 
                  variants={{
                    hidden: { opacity: 0, y: 30 },
                    visible: { opacity: 1, y: 0 }
                  }}
                  className="block"
                >
                  no seu lar.
                </motion.span>
              </h1>
              
              <motion.p 
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 }
                }}
                className="text-lg md:text-2xl text-slate-400 max-w-2xl lg:mx-0 mx-auto leading-relaxed font-medium opacity-90"
              >
                Conectamos os melhores especialistas em reabilitação domiciliar a pacientes que buscam cuidado personalizado, tecnologia e resultados reais.
              </motion.p>
            </div>
            
            <motion.div 
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 }
              }}
              className="flex flex-col sm:flex-row items-center gap-6 pt-6"
            >
              <Link
                to={user ? "/buscar-fisio" : "/register"}
                onClick={() => !user && localStorage.setItem('pending_role', 'paciente')}
                className="group relative w-full sm:w-auto"
              >
                <motion.div
                  whileHover={{ scale: 1.05, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  className="relative z-10 inline-flex items-center justify-center gap-3 px-10 py-5 bg-blue-600 text-white rounded-[2rem] font-black text-lg shadow-[0_20px_50px_-15px_rgba(37,99,235,0.4)] hover:bg-blue-500 transition-all duration-300"
                >
                  <Search size={22} className="group-hover:scale-110 transition-transform" /> 
                  Encontrar Fisioterapeuta
                </motion.div>
                <div className="absolute inset-0 bg-blue-400/20 rounded-[2rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>

              <Link
                to="/register"
                onClick={() => localStorage.setItem('pending_role', 'fisioterapeuta')}
                className="group w-full sm:w-auto"
              >
                <motion.div
                  whileHover={{ scale: 1.05, y: -4, backgroundColor: "rgba(255,255,255,0.05)" }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center justify-center gap-3 px-10 py-5 bg-transparent border-2 border-white/20 text-white rounded-[2rem] font-black text-lg hover:border-white/40 transition-all duration-300"
                >
                  <Stethoscope size={22} /> Sou Fisioterapeuta
                </motion.div>
              </Link>
            </motion.div>

            {/* Social Proof / Stats */}
            <motion.div 
              variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1 }
              }}
              className="flex flex-wrap justify-center lg:justify-start gap-8 pt-10 border-t border-white/10"
            >
              <div className="space-y-1">
                <p className="text-2xl font-black text-white">500+</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Especialistas</p>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-black text-white">10k+</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Atendimentos</p>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-black text-white">4.9/5</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Avaliação Média</p>
              </div>
            </motion.div>
          </motion.div>
        </div>

        <div className="flex-1 relative min-h-[50vh] lg:min-h-full">
          <motion.div 
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 2, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
          >
            {/* Using an abstract architectural medical background instead of humans */}
            <img 
              src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=2070" 
              className="w-full h-full object-cover"
              alt="Medical background"
              referrerPolicy="no-referrer"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/40 to-transparent lg:block hidden" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
            
            {/* Subtle floating tech elements */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
               <motion.div
                 animate={{ 
                   y: [0, -30, 0],
                   opacity: [0.2, 0.5, 0.2] 
                 }}
                 transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                 className="absolute top-1/4 right-1/4 w-32 h-32 border border-blue-500/20 rounded-full"
               />
               <motion.div
                 animate={{ 
                   y: [20, -10, 20],
                   opacity: [0.1, 0.3, 0.1] 
                 }}
                 transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
                 className="absolute bottom-1/3 right-1/3 w-48 h-48 border border-sky-500/10 rounded-full"
               />
            </div>

            {/* Floating Glass UI Element */}
            <motion.div
              animate={{ y: [0, -20, 0] }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-20 right-10 hidden xl:block p-8 bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[3rem] shadow-2xl z-20 w-72"
            >
              <div className="flex items-center gap-5 mb-6">
                <div className="w-14 h-14 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400">
                  <Activity size={28} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Status Sistema</p>
                  <p className="text-xl font-black text-white">Ativo</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: "92%" }}
                    transition={{ duration: 2.5, delay: 1 }}
                    className="h-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]" 
                  />
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Disponibilidade</p>
                  <p className="text-xs font-black text-blue-400">92%</p>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Floating Feature Card */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.8, duration: 1 }}
            className="absolute bottom-16 left-6 right-6 lg:left-auto lg:right-12 lg:w-[32rem] p-12 bg-slate-900/80 backdrop-blur-3xl border border-white/10 rounded-[4rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.6)] z-10"
          >
            <div className="flex items-center gap-7 mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl flex-shrink-0 -rotate-3 group-hover:rotate-0 transition-transform duration-500">
                <ShieldCheck size={36} />
              </div>
              <div>
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em] mb-2">Plataforma Segura</p>
                <p className="text-4xl font-black text-white leading-none tracking-tighter">Qualidade VIP</p>
              </div>
            </div>
            <p className="text-xl text-slate-400 leading-relaxed font-medium">
              Gestão completa de prontuários, agendas e pagamentos. Tudo pensado para que o foco seja 100% na reabilitação do paciente.
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
                    className="flex"
                  >
                    {professionals.map((pro) => (
                      <div
                        key={pro.id}
                        className={cn(
                          "flex-shrink-0 px-4 transition-all duration-500",
                          itemsVisible === 1 ? "w-full" : itemsVisible === 2 ? "w-1/2" : "w-1/4"
                        )}
                      >
                        <motion.div
                          className="group/card relative bg-white/5 backdrop-blur-xl p-8 rounded-[3.5rem] border border-white/10 hover:bg-white/10 transition-all duration-500 flex flex-col items-center text-center h-[520px] shadow-2xl"
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
