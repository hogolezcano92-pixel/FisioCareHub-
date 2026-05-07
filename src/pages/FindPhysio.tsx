import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  Search, 
  MapPin, 
  Stethoscope, 
  Filter, 
  Star, 
  ChevronRight,
  Loader2,
  Home,
  Globe,
  Building2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { cn, resolveStorageUrl } from '../lib/utils';

export default function FindPhysio() {
  const navigate = useNavigate();
  const [physios, setPhysios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    specialty: '',
    location: '',
    modality: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchPhysios();
  }, []);

  const fetchPhysios = async () => {
    setLoading(true);
    try {
      // Fetch profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('perfis')
        .select('*')
        .eq('role', 'fisioterapeuta')
        .eq('status_aprovacao', 'aprovado');

      if (profilesError) throw profilesError;

      // Fetch service configurations (legacy)
      const { data: configsData } = await supabase
        .from('configuracao_servicos')
        .select('physio_id, sessao_fisioterapia');

      // Fetch dynamic services (new) to find the lowest price
      const { data: dynamicServices } = await supabase
        .from('physiotherapist_services')
        .select('physiotherapist_id, base_price')
        .eq('is_active', true);

      // Map prices to profiles
      const physiosWithPrices = (profilesData || []).map(physio => {
        // Find legacy price
        const configLegacy = (configsData || []).find(c => c.physio_id === physio.id);
        const legacyPrice = configLegacy?.sessao_fisioterapia || null;

        // Find lowest dynamic price
        const physioDynamicSvcs = (dynamicServices || []).filter(s => s.physiotherapist_id === physio.id);
        const dynamicPrices = physioDynamicSvcs.map(s => Number(s.base_price)).filter(p => p > 0);
        const lowestDynamicPrice = dynamicPrices.length > 0 ? Math.min(...dynamicPrices) : null;

        // Final price logic: prefer dynamic if available, otherwise legacy
        const finalPrice = lowestDynamicPrice || legacyPrice;

        return {
          ...physio,
          preco_base: finalPrice
        };
      });

      setPhysios(physiosWithPrices);
    } catch (err) {
      console.error('Erro ao buscar fisioterapeutas:', err);
      toast.error('Erro ao carregar profissionais');
    } finally {
      setLoading(false);
    }
  };

  const filteredPhysios = physios.filter(physio => {
    const matchesSearch = physio.nome_completo?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSpecialty = !filters.specialty || physio.especialidade === filters.specialty;
    const matchesLocation = !filters.location || physio.localizacao?.toLowerCase().includes(filters.location.toLowerCase());
    const matchesModality = !filters.modality || physio.tipo_servico === filters.modality;
    
    return matchesSearch && matchesSpecialty && matchesLocation && matchesModality;
  });

  const specialties = Array.from(new Set(physios.map(p => p.especialidade).filter(Boolean)));

  return (
    <div className="min-h-screen bg-slate-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-12">
        
        {/* Header & Search */}
        <div className="text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight">
              Encontre o <span className="text-blue-500">Fisioterapeuta</span> ideal
            </h1>
            <p className="text-slate-400 font-medium max-w-2xl mx-auto">
              Conectamos você aos melhores profissionais de reabilitação. 
              Busque por especialidade, localização ou modalidade de atendimento.
            </p>
          </div>

          <div className="max-w-3xl mx-auto relative group">
            <div className="absolute inset-0 bg-blue-600/20 blur-3xl group-hover:bg-blue-600/30 transition-all rounded-full" />
            <div className="relative flex flex-col md:flex-row gap-4 p-2 bg-slate-900/50 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/10">
              <div className="flex-1 flex items-center px-6 gap-3">
                <Search className="text-slate-400" size={20} />
                <input 
                  type="text" 
                  placeholder="Buscar por nome ou especialidade..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full py-4 bg-transparent outline-none font-bold text-white placeholder:text-slate-400"
                />
              </div>
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  "flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all",
                  showFilters ? "bg-blue-600 text-white" : "bg-white/5 text-slate-300 hover:bg-white/10"
                )}
              >
                <Filter size={18} />
                Filtros
              </button>
            </div>
          </div>
        </div>

        {/* Advanced Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6 p-8 bg-slate-900/50 backdrop-blur-xl rounded-[2.5rem] border border-white/10 shadow-xl"
            >
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Especialidade</label>
                <select 
                  value={filters.specialty}
                  onChange={(e) => setFilters({...filters, specialty: e.target.value})}
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl font-bold text-white outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="" className="bg-slate-900">Todas as especialidades</option>
                  {specialties.map(s => <option key={s} value={s} className="bg-slate-900">{s}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Localização</label>
                <div className="relative">
                  <MapPin 
                    className="absolute pointer-events-none z-20" 
                    style={{ left: '16px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', color: '#94a3b8' }}
                  />
                  <input 
                    type="text" 
                    placeholder="Cidade ou bairro..."
                    value={filters.location}
                    onChange={(e) => setFilters({...filters, location: e.target.value})}
                    className="w-full p-4 pr-4 bg-white/5 border border-white/10 rounded-2xl font-bold text-white outline-none focus:ring-2 focus:ring-blue-600 !pl-[60px]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Modalidade</label>
                <select 
                  value={filters.modality}
                  onChange={(e) => setFilters({...filters, modality: e.target.value})}
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl font-bold text-white outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="" className="bg-slate-900">Todas as modalidades</option>
                  <option value="presencial" className="bg-slate-900">Presencial (Domicílio)</option>
                  <option value="online" className="bg-slate-900">Online (Teleconsulta)</option>
                  <option value="clinica" className="bg-slate-900">Clínica</option>
                </select>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
            <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Buscando profissionais...</p>
          </div>
        ) : filteredPhysios.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredPhysios.map((physio) => (
              <motion.div 
                key={physio.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="group bg-slate-900/50 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white/10 shadow-lg hover:shadow-2xl hover:shadow-blue-900/20 transition-all cursor-pointer"
                onClick={() => navigate(`/physio/${physio.id}`)}
              >
                <div className="flex items-start gap-4 mb-6">
                  <div className="relative">
                    <img 
                      src={resolveStorageUrl(physio.avatar_url) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${physio.id}`}
                      alt={physio.nome_completo}
                      className="w-20 h-20 rounded-2xl object-cover border-2 border-white/5 group-hover:border-blue-600 transition-colors"
                    />
                    <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1 rounded-full border-2 border-slate-900">
                      <Star size={10} fill="currentColor" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-black text-white tracking-tight group-hover:text-blue-400 transition-colors">
                      Dr. {physio.nome_completo}
                    </h3>
                    <p className="text-blue-400 font-black text-[10px] uppercase tracking-widest">{physio.especialidade || 'Fisioterapeuta'}</p>
                    <div className="flex items-center gap-1 mt-1 text-amber-400">
                      <Star size={14} fill="currentColor" />
                      <span className="text-xs font-black text-white">4.9</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2 text-slate-400">
                    <MapPin size={16} className="text-blue-400" />
                    <span className="text-xs font-bold">{physio.localizacao || 'São Paulo, SP'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    {physio.tipo_servico === 'online' ? (
                      <Globe size={16} className="text-blue-400" />
                    ) : physio.tipo_servico === 'clinica' ? (
                      <Building2 size={16} className="text-blue-400" />
                    ) : (
                      <Home size={16} className="text-blue-400" />
                    )}
                    <span className="text-xs font-bold capitalize">{physio.tipo_servico || 'Domiciliar'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      {physio.preco_base ? 'Sessões a partir de' : 'Valor a consultar'}
                    </span>
                    {physio.preco_base && (
                      <span className="text-lg font-black text-white">R$ {Number(physio.preco_base).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    )}
                  </div>
                  <button className="p-3 bg-white/5 text-blue-400 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <ChevronRight size={20} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 space-y-4">
            <div className="w-20 h-20 bg-white/5 rounded-[2rem] flex items-center justify-center mx-auto text-slate-500">
              <Search size={32} />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-white">Nenhum fisioterapeuta encontrado</h3>
              <p className="text-slate-400 font-medium">Tente ajustar seus filtros ou buscar por outro termo.</p>
            </div>
            <button 
              onClick={() => {
                setSearchTerm('');
                setFilters({ specialty: '', location: '', modality: '' });
              }}
              className="px-6 py-3 bg-blue-600 text-white rounded-full font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all"
            >
              Limpar Filtros
            </button>
          </div>
        )}

        {/* CTA for Requests */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-[3rem] p-12 text-center text-white space-y-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-3xl rounded-full -mr-32 -mt-32" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-400/20 blur-3xl rounded-full -ml-32 -mb-32" />
          
          <div className="relative space-y-4 max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-black tracking-tight">Não encontrou o que procurava?</h2>
            <p className="text-blue-100 font-medium">
              Crie uma solicitação de atendimento aberta e deixe que os fisioterapeutas entrem em contato com você.
            </p>
          </div>
          <button 
            onClick={() => navigate('/triage')}
            className="relative px-10 py-5 bg-white text-blue-600 rounded-[2rem] font-black text-sm uppercase tracking-widest hover:bg-blue-50 transition-all shadow-2xl"
          >
            Criar Solicitação Aberta
          </button>
        </div>
      </div>
    </div>
  );
}
