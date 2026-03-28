import { Link } from 'react-router-dom';
import { 
  Activity, 
  Stethoscope, 
  Shield, 
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
  Dna
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export default function Home() {
  return (
    <div className="-mt-8 -mx-4 sm:-mx-6 lg:-mx-8">
      {/* Hero Section - Startup Healthtech Theme */}
      <section className="relative min-h-[95vh] flex flex-col lg:flex-row overflow-hidden bg-gradient-to-b from-blue-50/50 to-white">
        {/* Modern Organic Background Shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div 
            animate={{ 
              x: [0, 50, 0],
              y: [0, -30, 0],
              scale: [1, 1.2, 1],
              rotate: [0, 10, 0]
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-[15%] -left-[10%] w-[50%] h-[50%] bg-blue-200/20 rounded-full blur-[120px]" 
          />
          <motion.div 
            animate={{ 
              x: [0, -60, 0],
              y: [0, 40, 0],
              scale: [1, 1.3, 1]
            }}
            transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[10%] right-[5%] w-[40%] h-[40%] bg-indigo-200/20 rounded-full blur-[100px]" 
          />
          <motion.div 
            animate={{ 
              scale: [1, 1.1, 1],
              opacity: [0.3, 0.5, 0.3]
            }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-[10%] left-[20%] w-[30%] h-[30%] bg-sky-200/20 rounded-full blur-[140px]" 
          />
        </div>

        <div className="flex-1 p-8 lg:p-20 flex flex-col justify-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="space-y-10"
          >
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/80 backdrop-blur-md border border-blue-100 rounded-full text-blue-600 text-xs font-black uppercase tracking-[0.2em] shadow-sm"
            >
              <Sparkles size={14} className="animate-pulse" />
              O Futuro da Fisioterapia
            </motion.div>
            
            <h1 className="text-5xl lg:text-[5.5rem] font-display font-black text-slate-900 leading-[1.05] tracking-tight">
              CUIDADO <br />
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                INTELIGENTE
              </span> <br />
              HUMANIZADO.
            </h1>
            
            <p className="text-xl text-slate-600 max-w-xl leading-relaxed font-medium">
              A primeira plataforma que une inteligência artificial, teleconsulta e gestão completa para fisioterapeutas e pacientes.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center gap-6 pt-4">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link
                  to="/register"
                  className="px-10 py-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl font-black text-xl shadow-2xl shadow-blue-500/30 flex items-center gap-3 transition-all hover:shadow-blue-500/50"
                >
                  Começar Agora <ArrowRight size={24} />
                </Link>
              </motion.div>
              
              <div className="flex flex-col gap-3">
                {[
                  'Fisioterapeutas verificados',
                  'Triagem inteligente com IA',
                  'Atendimento online ou presencial'
                ].map((text, i) => (
                  <div key={i} className="flex items-center gap-2 text-slate-500 text-sm font-bold">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    {text}
                  </div>
                ))}
              </div>
            </div>
            
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="flex items-center gap-6 pt-10 border-t border-slate-100/50"
            >
              <div className="flex -space-x-4">
                {[1,2,3,4].map(i => (
                  <img 
                    key={i}
                    src={`https://i.pravatar.cc/150?u=${i}`} 
                    className="w-12 h-12 rounded-full border-4 border-white object-cover shadow-lg"
                    alt="user"
                    referrerPolicy="no-referrer"
                  />
                ))}
              </div>
              <div>
                <div className="flex text-yellow-500">
                  {[1,2,3,4,5].map(i => <Star key={i} size={16} fill="currentColor" />)}
                </div>
                <p className="text-sm text-slate-500 font-bold">+2.000 profissionais confiam</p>
              </div>
            </motion.div>
          </motion.div>
        </div>

        <div className="flex-1 relative min-h-[50vh] lg:min-h-full bg-slate-50">
          <motion.div 
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.5 }}
            className="absolute inset-0"
          >
            <img 
              src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=2070" 
              className="w-full h-full object-cover grayscale-[0.1] brightness-105"
              alt="Physiotherapy"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-white via-white/20 to-transparent lg:hidden" />
            <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
          </motion.div>

          {/* Floating Stats - Glassmorphism on Light Theme */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="absolute bottom-12 left-12 right-12 lg:right-auto lg:w-80 p-6 bg-white/60 backdrop-blur-xl border border-white/40 rounded-3xl shadow-2xl"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/40">
                <BrainCircuit size={24} />
              </div>
              <div>
                <p className="text-xs font-black text-blue-600 uppercase tracking-widest">IA Integrada</p>
                <p className="text-slate-900 font-bold">Diagnóstico Assistido</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed font-medium">
              Nossa IA analisa sintomas e sugere protocolos de tratamento baseados em evidências científicas.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Specialties Section - Interactive & Attractive */}
      <section className="py-24 px-8 lg:px-20 bg-white relative overflow-hidden">
        {/* Decorative Blobs for Specialties */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[10%] right-[5%] w-[30%] h-[30%] bg-blue-50/50 rounded-full blur-[100px]" />
          <div className="absolute bottom-[10%] left-[5%] w-[30%] h-[30%] bg-indigo-50/50 rounded-full blur-[100px]" />
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-16 gap-8">
            <div className="space-y-4">
              <h2 className="text-sm font-black text-blue-600 uppercase tracking-[0.3em]">Especialidades</h2>
              <h3 className="text-4xl lg:text-6xl font-display font-black text-slate-900 tracking-tighter leading-none">
                CUIDADO PARA <br />
                <span className="text-blue-600 italic font-serif">CADA NECESSIDADE.</span>
              </h3>
            </div>
            <p className="text-xl text-slate-500 max-w-md font-medium">
              Conectamos você aos melhores especialistas em diversas áreas da fisioterapia moderna.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { name: 'Ortopedia', icon: Bone, color: 'blue', desc: 'Tratamento de lesões musculares, ósseas e articulares com foco em mobilidade.' },
              { name: 'Neurologia', icon: Brain, color: 'purple', desc: 'Reabilitação especializada para pacientes com distúrbios neurológicos e motores.' },
              { name: 'Cardiorrespiratória', icon: Wind, color: 'rose', desc: 'Melhora da capacidade pulmonar e cardíaca através de exercícios específicos.' },
              { name: 'Pediatria', icon: Baby, color: 'emerald', desc: 'Cuidado especializado e lúdico para o desenvolvimento motor infantil.' },
              { name: 'Geriatria', icon: Heart, color: 'orange', desc: 'Foco na qualidade de vida, equilíbrio e independência da terceira idade.' },
              { name: 'Esportiva', icon: Zap, color: 'yellow', desc: 'Prevenção e tratamento de lesões para atletas de alto rendimento e amadores.' },
            ].map((spec, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -5 }}
                className="group relative overflow-hidden bg-white p-8 rounded-[2.5rem] border border-slate-200 hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/10 transition-all"
              >
                <div className={cn(
                  "w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-all duration-500 group-hover:rotate-12 group-hover:scale-110",
                  spec.color === 'blue' && "bg-blue-50 text-blue-600",
                  spec.color === 'purple' && "bg-purple-50 text-purple-600",
                  spec.color === 'rose' && "bg-rose-50 text-rose-600",
                  spec.color === 'emerald' && "bg-emerald-50 text-emerald-600",
                  spec.color === 'orange' && "bg-orange-50 text-orange-600",
                  spec.color === 'yellow' && "bg-yellow-50 text-yellow-600",
                )}>
                  <spec.icon size={32} />
                </div>
                <h4 className="text-2xl font-display font-black text-slate-900 mb-3">{spec.name}</h4>
                <p className="text-slate-500 leading-relaxed font-medium mb-6">{spec.desc}</p>
                <div className="flex items-center gap-2 text-blue-600 font-bold text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                  Saiba mais <ArrowRight size={16} />
                </div>
                
                {/* Decorative element */}
                <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-slate-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid - Recipe 1: Technical Dashboard feel */}
      <section className="py-24 px-8 lg:px-20 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20 space-y-4">
            <h2 className="text-sm font-black text-blue-600 uppercase tracking-[0.3em]">Funcionalidades</h2>
            <h3 className="text-4xl lg:text-6xl font-display font-black text-slate-900 tracking-tighter">TUDO EM UM SÓ LUGAR.</h3>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Calendar, title: 'Agenda Inteligente', desc: 'Gestão de horários com lembretes automáticos via WhatsApp.', color: 'blue' },
              { icon: MessageSquare, title: 'Chat em Tempo Real', desc: 'Comunicação direta e segura entre paciente e profissional.', color: 'emerald' },
              { icon: FileText, title: 'Prontuário Digital', desc: 'Evoluções rápidas com auxílio de IA e anexos ilimitados.', color: 'indigo' },
              { icon: Activity, title: 'Teleconsulta HD', desc: 'Consultas por vídeo integradas com ferramentas de avaliação.', color: 'rose' },
            ].map((f, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -10 }}
                className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 hover:bg-white hover:shadow-2xl hover:shadow-slate-200 transition-all group"
              >
                <div className={cn(
                  "w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110",
                  f.color === 'blue' && "bg-blue-100 text-blue-600",
                  f.color === 'emerald' && "bg-emerald-100 text-emerald-600",
                  f.color === 'indigo' && "bg-indigo-100 text-indigo-600",
                  f.color === 'rose' && "bg-rose-100 text-rose-600",
                )}>
                  <f.icon size={32} />
                </div>
                <h4 className="text-xl font-black text-slate-900 mb-3">{f.title}</h4>
                <p className="text-slate-500 leading-relaxed font-medium">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Elegant Image Section - Recipe 12: Luxury/Prestige */}
      <section className="py-24 bg-white relative overflow-hidden">
        {/* Subtle Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-white via-blue-50/20 to-white pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-8 lg:px-20 flex flex-col lg:flex-row items-center gap-20 relative z-10">
          <div className="flex-1 space-y-8">
            <h2 className="text-5xl lg:text-7xl font-display font-black text-slate-900 tracking-tighter leading-none">
              TECNOLOGIA QUE <br />
              <span className="text-blue-600 italic font-serif">APROXIMA.</span>
            </h2>
            <p className="text-xl text-slate-600 leading-relaxed font-medium">
              Não somos apenas um software. Somos a ponte que conecta o conhecimento do profissional à necessidade do paciente, removendo barreiras geográficas e burocráticas.
            </p>
            <ul className="space-y-4">
              {['Segurança de dados nível bancário', 'Interface intuitiva e elegante', 'Suporte prioritário 24/7'].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-slate-900 font-bold">
                  <CheckCircle2 className="text-emerald-500" size={24} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex-1 relative">
            <div className="relative z-10 rounded-[3rem] overflow-hidden shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-700">
              <img 
                src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=2070" 
                className="w-full aspect-[4/5] object-cover"
                alt="Modern Clinic"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="absolute -top-10 -right-10 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl" />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-8 lg:px-20">
        <div className="max-w-7xl mx-auto bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[4rem] p-12 lg:p-24 text-center text-white relative overflow-hidden shadow-2xl shadow-blue-200">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
          </div>
          
          <div className="relative z-10 space-y-8 max-w-3xl mx-auto">
            <h2 className="text-4xl lg:text-7xl font-display font-black tracking-tighter leading-none">
              PRONTO PARA REVOLUCIONAR SUA CARREIRA?
            </h2>
            <p className="text-xl text-blue-100 font-medium">
              Junte-se a milhares de profissionais que já estão transformando a vida de seus pacientes com o FisioCareHub.
            </p>
            <div className="flex flex-wrap justify-center gap-6 pt-4">
              <Link
                to="/register"
                className="px-10 py-6 bg-white text-blue-600 rounded-[2rem] font-black text-xl hover:scale-105 transition-all shadow-xl"
              >
                Criar Conta Grátis
              </Link>
              <Link
                to="/login"
                className="px-10 py-6 bg-transparent border-2 border-white/30 text-white rounded-[2rem] font-black text-xl hover:bg-white/10 transition-all"
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
