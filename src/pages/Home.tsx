import { Link } from 'react-router-dom';
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
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { useState } from 'react';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('Todos');

  const filters = ['Todos', 'Ortopedia', 'Neurologia', 'Respiratória', 'Geriátrica'];

  const professionals = [
    { 
      id: 1,
      name: 'Dr. Ricardo Santos', 
      spec: 'Ortopedia', 
      fullSpec: 'Ortopedia e Traumatologia',
      img: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=400&h=400',
      rating: 4.9,
      reviews: 124,
      bio: 'Especialista em reabilitação pós-cirúrgica e dores crônicas com mais de 10 anos de experiência.'
    },
    { 
      id: 2,
      name: 'Dra. Juliana Lima', 
      spec: 'Neurologia', 
      fullSpec: 'Neurologia e Equilíbrio',
      img: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&q=80&w=400&h=400',
      rating: 5.0,
      reviews: 89,
      bio: 'Focada em pacientes pós-AVC e doenças neurodegenerativas, promovendo autonomia e qualidade de vida.'
    },
    { 
      id: 3,
      name: 'Dr. Marcos Oliveira', 
      spec: 'Respiratória', 
      fullSpec: 'Fisioterapia Respiratória',
      img: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=400&h=400',
      rating: 4.8,
      reviews: 156,
      bio: 'Especialista em cuidados pulmonares e reabilitação cardiopulmonar para todas as idades.'
    },
    { 
      id: 4,
      name: 'Dra. Ana Beatriz', 
      spec: 'Geriátrica', 
      fullSpec: 'Fisioterapia Geriátrica',
      img: 'https://images.unsplash.com/photo-1551601651-2a8555f1a136?auto=format&fit=crop&q=80&w=400&h=400',
      rating: 4.9,
      reviews: 210,
      bio: 'Dedicada ao cuidado de idosos, focando em prevenção de quedas e manutenção da mobilidade.'
    },
  ];

  const filteredProfessionals = professionals.filter(pro => {
    const matchesSearch = pro.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         pro.fullSpec.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = activeFilter === 'Todos' || pro.spec === activeFilter;
    return matchesSearch && matchesFilter;
  });

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
              Cuidado Humanizado em Casa
            </motion.div>
            
            <h1 className="text-3xl md:text-4xl font-display font-bold text-blue-950 dark:text-white leading-tight tracking-tight">
              Sua Reabilitação no <br />
              <span className="text-sky-600 dark:text-sky-400">
                Conforto de Casa
              </span>
            </h1>
            
            <p className="text-base md:text-lg text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed font-medium">
              Fisioterapia especializada para idosos e recuperação domiciliar com profissionais verificados e tecnologia de ponta.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center gap-6 pt-4">
              <motion.div
                whileHover={{ scale: 1.05, translateY: -5 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link
                  to="/register"
                  className="px-8 py-4 bg-sky-500 text-white rounded-full font-bold text-lg shadow-xl shadow-sky-500/30 flex items-center gap-2 transition-all hover:bg-sky-600"
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
                  <p className="text-base font-bold text-slate-900 dark:text-white">Fisioterapeutas Verificados</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                    <CheckCircle2 size={12} className="text-sky-500" /> Selo de Qualidade FisioCare
                  </p>
                </div>
              </motion.div>
            </div>
            
            <div className="pt-10 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-lg font-black text-slate-900 dark:text-white mb-6 uppercase tracking-widest text-center lg:text-left">
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
                  <p className="text-slate-500 dark:text-slate-400 font-bold text-lg">+500 profissionais na sua área</p>
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
            className="absolute bottom-12 left-12 right-12 lg:right-auto lg:w-96 p-8 bg-white/70 dark:bg-slate-800/70 backdrop-blur-2xl border border-white/50 dark:border-slate-700/50 rounded-[3rem] shadow-2xl"
          >
            <div className="flex items-center gap-5 mb-4">
              <div className="w-16 h-16 bg-sky-500 rounded-full flex items-center justify-center text-white shadow-xl shadow-sky-500/30">
                <Heart size={32} />
              </div>
              <div>
                <p className="text-sm font-black text-sky-600 uppercase tracking-widest">Cuidado Especial</p>
                <p className="text-xl font-black text-slate-900 dark:text-white">Foco na Terceira Idade</p>
              </div>
            </div>
            <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
              Atendimento adaptado para garantir segurança, autonomia e alegria no processo de reabilitação.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Specialties Section - Simplified & Large */}
      <section className="py-24 px-8 lg:px-20 bg-white dark:bg-slate-950 relative overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16 space-y-2">
            <h2 className="text-sm font-bold text-sky-600 uppercase tracking-[0.4em]">Nossos Serviços</h2>
            <h3 className="text-3xl md:text-4xl font-display font-bold text-slate-900 dark:text-white tracking-tight">
              Como podemos <span className="text-sky-500">ajudar hoje?</span>
            </h3>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { 
                name: 'Recuperação de Fraturas', 
                icon: Bone, 
                color: 'sky', 
                desc: 'Dores crônicas e quedas.',
                gradient: 'from-sky-50 to-white dark:from-sky-900/20 dark:to-slate-900'
              },
              { 
                name: 'Mobilidade e Equilíbrio', 
                icon: Brain, 
                color: 'emerald', 
                desc: 'Pós-AVC ou Parkinson.',
                gradient: 'from-emerald-50 to-white dark:from-emerald-900/20 dark:to-slate-900'
              },
              { 
                name: 'Fisio Respiratória', 
                icon: Wind, 
                color: 'orange', 
                desc: 'Saúde pulmonar em casa.',
                gradient: 'from-orange-50 to-white dark:from-orange-900/20 dark:to-slate-900'
              },
              { 
                name: 'Pós-Cirúrgica', 
                icon: Activity, 
                color: 'indigo', 
                desc: 'Cicatrização e retorno.',
                gradient: 'from-indigo-50 to-white dark:from-indigo-900/20 dark:to-slate-900'
              },
            ].map((spec, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -10, scale: 1.02 }}
                className={cn(
                  "group relative overflow-hidden p-6 lg:p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-xl transition-all bg-gradient-to-br",
                  spec.gradient
                )}
              >
                <div className="bg-white dark:bg-slate-800 rounded-full p-3 shadow-sm inline-flex items-center justify-center mb-4 transition-all duration-500 group-hover:rotate-6 group-hover:scale-110">
                  <div className={cn(
                    "w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center shadow-md",
                    spec.color === 'sky' && "bg-sky-500 text-white",
                    spec.color === 'emerald' && "bg-emerald-500 text-white",
                    spec.color === 'orange' && "bg-orange-500 text-white",
                    spec.color === 'indigo' && "bg-indigo-500 text-white",
                  )}>
                    <spec.icon size={24} className="md:hidden" />
                    <spec.icon size={28} className="hidden md:block" />
                  </div>
                </div>
                <h4 className="text-lg md:text-xl font-display font-bold text-blue-950 dark:text-white mb-1 leading-tight">{spec.name}</h4>
                <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 leading-relaxed font-medium">{spec.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-24 px-8 lg:px-20 bg-slate-50 dark:bg-slate-900/50 relative overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16 space-y-2">
            <h2 className="text-sm font-bold text-sky-600 uppercase tracking-[0.4em]">Simples e Rápido</h2>
            <h3 className="text-3xl md:text-4xl font-display font-bold text-slate-900 dark:text-white tracking-tight">
              Como funciona o <span className="text-sky-500">FisioCareHub?</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
            {/* Connection Line (Desktop) */}
            <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-sky-100 dark:bg-sky-900 -translate-y-1/2 z-0" />
            
            {[
              {
                step: '01',
                title: 'Triagem Inteligente',
                desc: 'Responda algumas perguntas rápidas sobre seus sintomas e receba uma orientação inicial da nossa IA.',
                icon: ClipboardCheck,
                color: 'bg-sky-500'
              },
              {
                step: '02',
                title: 'Escolha seu Fisio',
                desc: 'Filtre por especialidade, localização e avaliações para encontrar o profissional ideal para você.',
                icon: UserCheck,
                color: 'bg-emerald-500'
              },
              {
                step: '03',
                title: 'Atendimento em Casa',
                desc: 'Agende o melhor horário e receba o tratamento completo no conforto e segurança do seu lar.',
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
                <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{item.title}</h4>
                <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-xs">{item.desc}</p>
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
            <h3 className="text-3xl md:text-4xl font-display font-bold text-slate-900 dark:text-white tracking-tight">Especialistas na Sua Região</h3>
            
            {/* Search and Filter Bar */}
            <div className="max-w-4xl mx-auto pt-8 space-y-6">
              <div className="relative group">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors" size={24} />
                <input 
                  type="text" 
                  placeholder="Busque por nome ou especialidade..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-16 pr-6 py-5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-full text-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all dark:text-white"
                />
              </div>
              
              <div className="flex flex-wrap justify-center gap-3">
                {filters.map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={cn(
                      "px-6 py-2.5 rounded-full text-sm font-bold transition-all border",
                      activeFilter === filter 
                        ? "bg-sky-500 text-white border-sky-500 shadow-lg shadow-sky-500/30" 
                        : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-100 dark:border-slate-700 hover:border-sky-200 dark:hover:border-sky-800"
                    )}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {filteredProfessionals.length > 0 ? (
              filteredProfessionals.map((pro, i) => (
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
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{pro.rating}</span>
                    <span className="text-xs text-slate-400 font-medium">({pro.reviews})</span>
                  </div>
                  
                  <h4 className="text-xl font-black text-slate-900 dark:text-white mb-1">{pro.name}</h4>
                  <p className="text-sky-600 dark:text-sky-400 font-black text-xs uppercase tracking-widest mb-4">{pro.fullSpec}</p>
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-8 leading-relaxed line-clamp-3">
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

      {/* Trust Section */}
      <section className="py-24 px-8 lg:px-20 bg-slate-50 dark:bg-slate-900/30">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <h2 className="text-sm font-bold text-sky-600 uppercase tracking-[0.4em]">Por que escolher o FisioCareHub?</h2>
              <h3 className="text-3xl md:text-4xl font-display font-bold text-slate-900 dark:text-white leading-tight tracking-tight">
                SEGURANÇA EM <br />
                <span className="text-sky-500 italic font-serif">CADA PASSO.</span>
              </h3>
              <div className="space-y-6">
                {[
                  { title: 'Profissionais Rigorosamente Avaliados', desc: 'Checamos antecedentes, formação e referências de cada fisioterapeuta.' },
                  { title: 'Atendimento Personalizado', desc: 'Planos de tratamento criados especificamente para suas necessidades e limitações.' },
                  { title: 'Acompanhamento para a Família', desc: 'Relatórios simples e diretos para que os familiares acompanhem a evolução.' }
                ].map((item, i) => (
                  <motion.div 
                    key={i}
                    whileHover={{ x: 10 }}
                    className="flex gap-6 p-6 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm"
                  >
                    <div className="w-12 h-12 bg-sky-100 dark:bg-sky-900/50 rounded-full flex-shrink-0 flex items-center justify-center text-sky-600 dark:text-sky-400">
                      <CheckCircle2 size={24} />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-1">{item.title}</h4>
                      <p className="text-base text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="rounded-[4rem] overflow-hidden shadow-2xl border-8 border-white dark:border-slate-800">
                <img 
                  src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=2070" 
                  className="w-full aspect-square object-cover"
                  alt="Happy elderly patient"
                  referrerPolicy="no-referrer"
                />
              </div>
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                className="absolute -bottom-10 -right-10 p-8 bg-white dark:bg-slate-800 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-700 max-w-xs"
              >
                <div className="flex text-amber-400 mb-3">
                  {[1,2,3,4,5].map(i => <Star key={i} size={20} fill="currentColor" />)}
                </div>
                <p className="text-slate-900 dark:text-white font-bold italic text-lg leading-relaxed">"O atendimento em casa mudou minha vida. Sinto-me segura e muito bem cuidada."</p>
                <p className="text-slate-400 dark:text-slate-500 text-sm mt-3 font-bold uppercase tracking-widest">— Maria Silva, 74 anos</p>
              </motion.div>
            </div>
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
