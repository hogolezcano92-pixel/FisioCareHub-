import React from 'react';
import { motion } from 'motion/react';
import { 
  Smartphone, 
  Download, 
  Bell, 
  Menu, 
  Plus, 
  Calendar, 
  Activity, 
  User, 
  BrainCircuit,
  Search,
  ChevronRight,
  Clock,
  MapPin,
  Star
} from 'lucide-react';
import { cn } from '../lib/utils';

const MobileFrame = ({ children, label }: { children: React.ReactNode, label: string }) => (
  <div className="flex flex-col items-center gap-6">
    <div className="text-sm font-black text-slate-400 tracking-[0.3em] uppercase">{label}</div>
    <div className="relative w-[320px] h-[640px] bg-slate-950 rounded-[3rem] border-[8px] border-slate-800 shadow-2xl overflow-hidden ring-1 ring-white/10">
      {/* Notch */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-2xl z-50"></div>
      
      {/* Screen Content */}
      <div className="h-full w-full bg-[#0F172A] text-white overflow-hidden flex flex-col">
        {children}
      </div>
    </div>
  </div>
);

const Header = ({ avatar, name, badge }: { avatar: string, name: string, badge: string }) => (
  <header className="p-6 pt-10 flex items-center justify-between">
    <div className="flex items-center gap-3">
      <div className="relative">
        <img 
          src={avatar} 
          className="w-12 h-12 rounded-2xl object-cover border-2 border-white/10" 
          alt="profile"
          referrerPolicy="no-referrer"
        />
        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-[#0F172A] rounded-full"></div>
      </div>
      <div>
        <div className="flex items-center gap-2">
          <h3 className="font-black text-sm tracking-tight">{name}</h3>
          <span className="px-2 py-0.5 bg-primary/20 text-primary text-[8px] font-black rounded-md uppercase tracking-tighter">
            {badge}
          </span>
        </div>
        <p className="text-[10px] text-slate-400 font-medium">Online agora</p>
      </div>
    </div>
    <div className="flex items-center gap-2">
      <div className="p-2 bg-white/5 rounded-xl border border-white/10">
        <Bell size={18} className="text-slate-400" />
      </div>
      <div className="p-2 bg-white/5 rounded-xl border border-white/10">
        <Menu size={18} className="text-slate-400" />
      </div>
    </div>
  </header>
);

const AppointmentCard = () => (
  <div className="mt-auto p-6 pb-10">
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-[2rem] p-5 relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <Calendar size={48} />
      </div>
      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Próximo Agendamento</h4>
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-primary/20 rounded-2xl flex flex-col items-center justify-center text-primary border border-primary/30">
          <span className="text-xs font-black">12</span>
          <span className="text-[8px] font-bold uppercase">Abr</span>
        </div>
        <div>
          <p className="font-bold text-sm">Avaliação Inicial</p>
          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
            <Clock size={10} />
            <span>14:30 - 15:30</span>
          </div>
        </div>
      </div>
      <button className="w-full mt-4 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
        Ver Detalhes
      </button>
    </div>
  </div>
);

export default function AppPreview() {
  return (
    <div className="min-h-screen bg-[#020617] py-20 px-4 flex flex-col items-center">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-16 space-y-4"
      >
        <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter">
          FisioCareHub <span className="text-primary">Experience</span>
        </h1>
        <p className="text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed">
          Uma plataforma, duas experiências otimizadas. Design focado em resultados para pacientes e produtividade para fisioterapeutas.
        </p>
      </motion.div>

      <div className="flex flex-col lg:flex-row gap-12 lg:gap-24 items-center justify-center w-full max-w-7xl">
        {/* VISÃO PACIENTE */}
        <MobileFrame label="VISÃO PACIENTE">
          <Header 
            avatar="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200"
            name="HUGO LEZCANO"
            badge="PACIENTE"
          />
          
          <div className="px-6 relative flex-1">
            {/* Wireframe Figure Background */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
              <motion.div
                animate={{ 
                  scale: [1, 1.05, 1],
                  opacity: [0.1, 0.2, 0.1]
                }}
                transition={{ duration: 4, repeat: Infinity }}
                className="relative w-full h-full flex items-center justify-center"
              >
                <svg viewBox="0 0 200 200" className="w-64 h-64 text-primary/40 blur-[1px]">
                  {/* Dynamic movement pose (stretching/balance) */}
                  <motion.g
                    animate={{ 
                      rotate: [-2, 2, -2],
                      y: [-2, 2, -2]
                    }}
                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                  >
                    {/* Torso */}
                    <path fill="none" stroke="currentColor" strokeWidth="1.5" d="M100,50 L100,100" />
                    {/* Head */}
                    <circle cx="100" cy="40" r="8" fill="none" stroke="currentColor" strokeWidth="1.5" />
                    {/* Arms in balance pose */}
                    <path fill="none" stroke="currentColor" strokeWidth="1.5" d="M100,60 L60,40 M100,60 L140,40" />
                    {/* Legs in stretching pose */}
                    <path fill="none" stroke="currentColor" strokeWidth="1.5" d="M100,100 L70,150 M100,100 L110,120 L140,130" />
                    {/* Glow points */}
                    <circle cx="60" cy="40" r="2" fill="currentColor" className="animate-pulse" />
                    <circle cx="140" cy="40" r="2" fill="currentColor" className="animate-pulse" />
                    <circle cx="140" cy="130" r="2" fill="currentColor" className="animate-pulse" />
                  </motion.g>
                  <motion.circle 
                    cx="100" cy="100" r="60" 
                    fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4 8"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  />
                </svg>
              </motion.div>
            </div>

            <div className="relative z-10 space-y-6">
              <div className="space-y-1">
                <h2 className="text-3xl font-black tracking-tight">Olá, Hugo!</h2>
                <p className="text-slate-400 text-sm font-medium">Sua jornada de movimento começa aqui.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button className="p-4 bg-primary text-white rounded-[1.5rem] flex flex-col gap-3 shadow-lg shadow-primary/20">
                  <BrainCircuit size={24} />
                  <span className="text-[10px] font-black uppercase tracking-widest text-left">Nova Triagem</span>
                </button>
                <button className="p-4 bg-white/5 border border-white/10 rounded-[1.5rem] flex flex-col gap-3">
                  <Activity size={24} className="text-primary" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-left">Exercícios</span>
                </button>
              </div>

              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-500">
                    <Star size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold">Progresso Semanal</p>
                    <p className="text-[10px] text-slate-400">85% concluído</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-600" />
              </div>
            </div>
          </div>

          <AppointmentCard />
        </MobileFrame>

        {/* VISÃO FISIOTERAPEUTA */}
        <MobileFrame label="VISÃO FISIOTERAPEUTA">
          <Header 
            avatar="https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&q=80&w=200"
            name="Dra. ANA COSTA !"
            badge="FISIOTERAPEUTA"
          />
          
          <div className="px-6 relative flex-1">
            {/* Skeleton Background */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
              <motion.div
                animate={{ 
                  scale: [1, 1.02, 1],
                  opacity: [0.15, 0.25, 0.15]
                }}
                transition={{ duration: 5, repeat: Infinity }}
                className="relative w-full h-full flex items-center justify-center"
              >
                <svg viewBox="0 0 200 200" className="w-72 h-72 text-emerald-500/40 blur-[1px]">
                  {/* Technical Anatomical Skeleton */}
                  <g className="opacity-80">
                    {/* Spine */}
                    <path fill="none" stroke="currentColor" strokeWidth="2" d="M100,40 L100,140" strokeDasharray="2 1" />
                    {/* Ribs */}
                    {[50, 60, 70, 80, 90].map(y => (
                      <path key={y} fill="none" stroke="currentColor" strokeWidth="1" d={`M75,${y} Q100,${y-5} 125,${y}`} />
                    ))}
                    {/* Pelvis */}
                    <path fill="none" stroke="currentColor" strokeWidth="2" d="M80,140 L120,140 L110,155 L90,155 Z" />
                    {/* Articular Data Visualizations */}
                    <g className="text-emerald-400">
                      <circle cx="100" cy="45" r="4" fill="none" stroke="currentColor" strokeWidth="0.5" />
                      <path d="M100,45 L130,30" stroke="currentColor" strokeWidth="0.5" />
                      <text x="135" y="30" className="text-[6px] fill-current font-mono">C1-C7</text>
                      
                      <circle cx="75" cy="70" r="4" fill="none" stroke="currentColor" strokeWidth="0.5" />
                      <path d="M75,70 L45,60" stroke="currentColor" strokeWidth="0.5" />
                      <text x="20" y="60" className="text-[6px] fill-current font-mono">SCAPULA</text>
                    </g>
                  </g>
                  {/* Scanning Line */}
                  <motion.path 
                    d="M30,0 L170,0" 
                    stroke="currentColor" strokeWidth="1" strokeOpacity="0.5"
                    animate={{ y: [40, 160, 40] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  />
                </svg>
              </motion.div>
            </div>

            <div className="relative z-10 space-y-6">
              <div className="space-y-1">
                <h2 className="text-2xl font-black tracking-tight leading-tight">Gerencie seus pacientes e consultas.</h2>
                <p className="text-slate-400 text-xs font-medium">Painel de controle profissional</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button className="p-4 bg-emerald-600 text-white rounded-[1.5rem] flex flex-col gap-3 shadow-lg shadow-emerald-600/20">
                  <Plus size={24} />
                  <span className="text-[10px] font-black uppercase tracking-widest text-left">+ Novo Paciente</span>
                </button>
                <button className="p-4 bg-white/5 border border-white/10 rounded-[1.5rem] flex flex-col gap-3">
                  <Calendar size={24} className="text-emerald-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-left">Minha Agenda</span>
                </button>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10" size={16} />
                <input 
                  type="text" 
                  placeholder="Buscar paciente..." 
                  className="w-full pl-10 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-xs outline-none focus:border-emerald-500/50 transition-all"
                />
              </div>
            </div>
          </div>

          <AppointmentCard />
        </MobileFrame>
      </div>

      <div className="mt-24 flex flex-col items-center gap-8">
        <div className="flex items-center gap-4 p-2 bg-white/5 rounded-2xl border border-white/10">
          <div className="px-4 py-2 bg-primary text-white text-[10px] font-black rounded-xl uppercase tracking-widest">
            Dark Mode Native
          </div>
          <div className="px-4 py-2 text-slate-400 text-[10px] font-black uppercase tracking-widest">
            Light Mode Ready
          </div>
        </div>
        
        <button className="group flex items-center gap-3 px-8 py-4 bg-white text-slate-950 rounded-full font-black text-sm hover:scale-105 transition-all shadow-xl shadow-white/10">
          <Download size={20} />
          BAIXAR KIT DE APRESENTAÇÃO
        </button>
      </div>
    </div>
  );
}
