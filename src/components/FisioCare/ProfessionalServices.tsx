import React, { useState, useEffect } from 'react';
import { 
  Package, 
  RefreshCw, 
  DollarSign, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  Info, 
  Loader2, 
  Activity, 
  BrainCircuit, 
  Stethoscope, 
  Zap,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';

interface PricingOption {
  id: string;
  servico_id: string;
  tipo: 'unitario' | 'pacote' | 'recorrente';
  nome_opcao?: string;
  preco: number;
  total_sessoes?: number;
  dias_validade?: number;
  frequencia?: 'semanal' | 'mensal';
}

interface Service {
  id: string;
  nome: string;
  descricao?: string;
  icone?: string;
  opcoes?: PricingOption[];
}

const DEFAULT_SERVICES = [
  { nome: 'Avaliação Inicial', icone: 'Stethoscope', descricao: 'Primeiro contato e diagnóstico funcional.' },
  { nome: 'Sessão de Reabilitação', icone: 'Activity', descricao: 'Atendimento de fisioterapia convencional.' },
  { nome: 'Pilates', icone: 'Zap', descricao: 'Método Pilates focado em reabilitação.' },
  { nome: 'RPG', icone: 'BrainCircuit', descricao: 'Reeducação Postural Global.' }
];

const ICON_MAP: Record<string, any> = {
  Stethoscope,
  Activity,
  Zap,
  BrainCircuit
};

export const ProfessionalServices = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<Service[]>([]);
  const [isAddingService, setIsAddingService] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  
  // Modals / Dropdowns state
  const [expandedServiceId, setExpandedServiceId] = useState<string | null>(null);
  const [addingOptionToId, setAddingOptionToId] = useState<{id: string, type: 'pacote' | 'recorrente'} | null>(null);

  useEffect(() => {
    fetchServices();
  }, [profile]);

  const fetchServices = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const { data: servicesData, error: sError } = await supabase
        .from('servicos_fisio')
        .select('*')
        .eq('fisio_id', profile.id);

      if (sError) throw sError;

      // If no services, auto-create defaults
      if (servicesData && servicesData.length === 0) {
        await createDefaultServices();
        return;
      }

      // Fetch pricing options for these services
      const serviceIds = servicesData.map(s => s.id);
      const { data: optionsData, error: oError } = await supabase
        .from('opcoes_precos')
        .select('*')
        .in('servico_id', serviceIds);

      if (oError) throw oError;

      const enrichedServices = servicesData.map(s => ({
        ...s,
        opcoes: optionsData?.filter(o => o.servico_id === s.id) || []
      }));

      setServices(enrichedServices);
    } catch (err) {
      console.error("Erro ao carregar serviços:", err);
      toast.error("Erro ao carregar seus serviços.");
    } finally {
      setLoading(false);
    }
  };

  const createDefaultServices = async () => {
    if (!profile) return;
    try {
      const servicesToInsert = DEFAULT_SERVICES.map(s => ({
        fisio_id: profile.id,
        nome: s.nome,
        descricao: s.descricao,
        icone: s.icone
      }));

      const { data, error } = await supabase
        .from('servicos_fisio')
        .insert(servicesToInsert)
        .select();

      if (error) throw error;

      // Create a default unit pricing for each
      if (data) {
        const optionsToInsert = data.map(s => ({
          servico_id: s.id,
          tipo: 'unitario',
          preco: profile.preco_sessao || 150.00
        }));

        await supabase.from('opcoes_precos').insert(optionsToInsert);
      }

      fetchServices();
    } catch (err) {
      console.error("Erro ao criar serviços padrão:", err);
    }
  };

  const handleAddService = async (data: { nome: string, descricao: string, preco: number }) => {
    if (!profile) return;
    try {
      setLoading(true);
      // 1. Create the service
      const { data: sData, error: sError } = await supabase
        .from('servicos_fisio')
        .insert({
          fisio_id: profile.id,
          nome: data.nome,
          descricao: data.descricao,
          icone: 'Activity' // Default icon for custom services
        })
        .select()
        .single();

      if (sError) throw sError;

      // 2. Create the default unit price
      if (sData) {
        const { error: oError } = await supabase
          .from('opcoes_precos')
          .insert({
            servico_id: sData.id,
            tipo: 'unitario',
            preco: data.preco
          });

        if (oError) throw oError;
      }

      toast.success("Serviço customizado criado!");
      setIsAddingService(false);
      fetchServices();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao criar serviço customizado.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUnitPrice = async (serviceId: string, optionId: string, newPrice: number) => {
    try {
      const { error } = await supabase
        .from('opcoes_precos')
        .update({ preco: newPrice })
        .eq('id', optionId);

      if (error) throw error;
      
      setServices(prev => prev.map(s => {
        if (s.id === serviceId) {
          return {
            ...s,
            opcoes: s.opcoes?.map(o => o.id === optionId ? { ...o, preco: newPrice } : o)
          };
        }
        return s;
      }));
      
      toast.success("Preço atualizado!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao atualizar preço.");
    }
  };

  const handleAddOption = async (serviceId: string, data: Partial<PricingOption>) => {
    try {
      const { error } = await supabase
        .from('opcoes_precos')
        .insert({
          servico_id: serviceId,
          ...data
        });

      if (error) throw error;
      toast.success("Opção adicionada!");
      fetchServices();
      setAddingOptionToId(null);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao adicionar opção.");
    }
  };

  const handleDeleteOption = async (optionId: string) => {
    if (!window.confirm("Deseja realmente excluir esta opção de preço?")) return;
    
    try {
      const { error } = await supabase
        .from('opcoes_precos')
        .delete()
        .eq('id', optionId);

      if (error) throw error;
      toast.success("Opção excluída.");
      fetchServices();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao excluir opção.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <DollarSign className="text-blue-500" size={24} />
            Gerenciar Serviços e Preços
          </h3>
          <p className="text-slate-400 text-xs font-medium">Configure seus valores e pacotes de atendimento.</p>
        </div>
        
        <button 
          onClick={() => setIsAddingService(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-900/20"
        >
          <Plus size={16} />
          Serviço Customizado
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {services.map((service) => (
          <ServiceCard 
            key={service.id}
            service={service}
            isExpanded={expandedServiceId === service.id}
            onToggle={() => setExpandedServiceId(expandedServiceId === service.id ? null : service.id)}
            onUpdatePrice={handleUpdateUnitPrice}
            onAddOption={(type) => setAddingOptionToId({ id: service.id, type })}
            onDeleteOption={handleDeleteOption}
          />
        ))}
      </div>

      {/* Adding Option Modal Overlay */}
      <AnimatePresence>
        {addingOptionToId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAddingOptionToId(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-slate-900 p-8 rounded-[2.5rem] border border-white/10 shadow-2xl space-y-6"
            >
              <h3 className="text-xl font-black text-white">
                Adicionar {addingOptionToId.type === 'pacote' ? 'Pacote' : 'Plano Recorrente'}
              </h3>
              
              <OptionForm 
                type={addingOptionToId.type}
                onSubmit={(data) => handleAddOption(addingOptionToId.id, data)}
                onCancel={() => setAddingOptionToId(null)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Adding Custom Service Modal */}
      <AnimatePresence>
        {isAddingService && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingService(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-slate-900 p-8 rounded-[2.5rem] border border-white/10 shadow-2xl space-y-6"
            >
              <h3 className="text-xl font-black text-white">
                Novo Serviço Customizado
              </h3>
              
              <NewServiceForm 
                onSubmit={handleAddService}
                onCancel={() => setIsAddingService(false)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ServiceCard = ({ service, isExpanded, onToggle, onUpdatePrice, onAddOption, onDeleteOption }: any) => {
  const Icon = ICON_MAP[service.icone || 'Activity'] || Activity;
  const unitOption = service.opcoes?.find((o: any) => o.tipo === 'unitario');
  const packages = service.opcoes?.filter((o: any) => o.tipo === 'pacote');
  const plans = service.opcoes?.filter((o: any) => o.tipo === 'recorrente');

  return (
    <div className={cn(
      "bg-white/5 backdrop-blur-xl rounded-[2rem] border border-white/10 overflow-hidden transition-all duration-300",
      isExpanded ? "ring-2 ring-blue-500/30 shadow-2xl shadow-blue-900/10" : "hover:bg-white/10"
    )}>
      <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-blue-600/20 text-blue-400 rounded-2xl flex items-center justify-center border border-blue-500/20 shadow-inner">
            <Icon size={28} />
          </div>
          <div>
            <h4 className="text-lg font-black text-white tracking-tight">{service.nome}</h4>
            <p className="text-slate-400 text-xs font-medium max-w-xs">{service.descricao}</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Preço Unitário</p>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black text-white">R$</span>
              <input 
                type="number" 
                defaultValue={unitOption?.preco || 0}
                onBlur={(e) => {
                  const val = parseFloat(e.target.value);
                  if (val !== unitOption?.preco) {
                    onUpdatePrice(service.id, unitOption!.id, val);
                  }
                }}
                className="w-24 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-lg font-black text-white outline-none focus:ring-2 focus:ring-blue-600 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </div>
          
          <button 
            onClick={onToggle}
            className="p-3 bg-white/5 text-slate-400 rounded-xl hover:bg-blue-600 hover:text-white transition-all border border-white/5"
          >
            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/10 overflow-hidden"
          >
            <div className="p-8 space-y-8 bg-black/10">
              {/* Packages Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Package size={14} className="text-amber-500" />
                    Pacotes de Sessões
                  </h5>
                  <button 
                    onClick={() => onAddOption('pacote')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-500 rounded-full text-[9px] font-black uppercase tracking-widest border border-amber-500/20 hover:bg-amber-500/20 transition-all"
                  >
                    <Plus size={12} />
                    Adicionar Pacote
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {packages.map((pkg: any) => (
                    <div key={pkg.id} className="p-5 bg-white/5 rounded-2xl border border-white/10 hover:border-amber-500/30 transition-all space-y-3 group relative">
                      <button 
                        onClick={() => onDeleteOption(pkg.id)}
                        className="absolute top-2 right-2 p-1.5 bg-rose-500/10 text-rose-500 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-500 hover:text-white"
                      >
                        <Trash2 size={12} />
                      </button>
                      <div className="space-y-1">
                        <p className="text-sm font-black text-white">{pkg.nome_opcao}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{pkg.total_sessoes} Sessões</p>
                      </div>
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Preço Total</p>
                          <p className="text-xl font-black text-white">R$ {pkg.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Validade</p>
                          <p className="text-xs font-bold text-slate-300">{pkg.dias_validade} dias</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {packages.length === 0 && (
                    <div className="col-span-full py-8 text-center bg-white/5 border border-dashed border-white/10 rounded-2xl">
                      <p className="text-xs text-slate-500 font-medium italic">Nenhum pacote configurado.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Recurring Plans Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                    <RefreshCw size={14} className="text-emerald-500" />
                    Planos Recorrentes
                  </h5>
                  <button 
                    onClick={() => onAddOption('recorrente')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-500 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
                  >
                    <Plus size={12} />
                    Adicionar Plano
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {plans.map((plan: any) => (
                    <div key={plan.id} className="p-5 bg-white/5 rounded-2xl border border-white/10 hover:border-emerald-500/30 transition-all space-y-3 group relative">
                      <button 
                        onClick={() => onDeleteOption(plan.id)}
                        className="absolute top-2 right-2 p-1.5 bg-rose-500/10 text-rose-500 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-500 hover:text-white"
                      >
                        <Trash2 size={12} />
                      </button>
                      <div className="space-y-1">
                        <p className="text-sm font-black text-white">{plan.nome_opcao}</p>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[8px] font-black uppercase tracking-widest rounded-full">{plan.frequencia}</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Valor Mensal</p>
                        <p className="text-xl font-black text-white">R$ {plan.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      </div>
                    </div>
                  ))}
                  {plans.length === 0 && (
                    <div className="col-span-full py-8 text-center bg-white/5 border border-dashed border-white/10 rounded-2xl">
                      <p className="text-xs text-slate-500 font-medium italic">Nenhum plano recorrente configurado.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const NewServiceForm = ({ onSubmit, onCancel }: any) => {
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    preco: '150.00'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      nome: formData.nome,
      descricao: formData.descricao,
      preco: parseFloat(formData.preco)
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nome do Serviço</label>
        <input 
          type="text" 
          value={formData.nome}
          onChange={e => setFormData({...formData, nome: e.target.value})}
          placeholder="Ex: Liberação Miofascial"
          required
          className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold outline-none focus:ring-2 focus:ring-blue-600 transition-all"
        />
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Descrição</label>
        <textarea 
          value={formData.descricao}
          onChange={e => setFormData({...formData, descricao: e.target.value})}
          placeholder="Breve descrição do serviço..."
          className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold outline-none focus:ring-2 focus:ring-blue-600 transition-all h-24 resize-none"
        />
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Preço Inicial (Unitário)</label>
        <div className="relative group">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-black text-xs group-focus-within:text-blue-400 transition-colors">R$</span>
          <input 
            type="number" 
            step="0.01"
            value={formData.preco}
            onChange={e => setFormData({...formData, preco: e.target.value})}
            placeholder="0.00"
            required
            className="w-full !pl-12 p-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold outline-none focus:ring-2 focus:ring-blue-600 transition-all font-mono"
          />
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <button 
          type="button" 
          onClick={onCancel}
          className="flex-1 py-4 bg-white/5 border border-white/10 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all"
        >
          Cancelar
        </button>
        <button 
          type="submit"
          className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-900/20"
        >
          Criar Serviço
        </button>
      </div>
    </form>
  );
};

const OptionForm = ({ type, onSubmit, onCancel }: any) => {
  const [formData, setFormData] = useState({
    nome_opcao: '',
    preco: '',
    total_sessoes: '',
    dias_validade: '30',
    frequencia: 'mensal',
    tipo: type
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: any = {
      tipo: type,
      nome_opcao: formData.nome_opcao,
      preco: parseFloat(formData.preco)
    };

    if (type === 'pacote') {
      data.total_sessoes = parseInt(formData.total_sessoes);
      data.dias_validade = parseInt(formData.dias_validade);
    } else {
      data.frequencia = formData.frequencia;
    }

    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nome do {type === 'pacote' ? 'Pacote' : 'Plano'}</label>
        <input 
          type="text" 
          value={formData.nome_opcao}
          onChange={e => setFormData({...formData, nome_opcao: e.target.value})}
          placeholder={type === 'pacote' ? 'Ex: Pacote Verão 10 Sessões' : 'Ex: Plano Mensal Plus'}
          required
          className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold outline-none focus:ring-2 focus:ring-blue-600 transition-all"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Preço Total (R$)</label>
          <div className="relative group">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-black text-xs group-focus-within:text-blue-400 transition-colors">R$</span>
            <input 
              type="number" 
              step="0.01"
              value={formData.preco}
              onChange={e => setFormData({...formData, preco: e.target.value})}
              placeholder="0.00"
              required
              className="w-full !pl-12 p-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold outline-none focus:ring-2 focus:ring-blue-600 transition-all font-mono"
            />
          </div>
        </div>

        {type === 'pacote' ? (
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Qtd. Sessões</label>
            <input 
              type="number" 
              value={formData.total_sessoes}
              onChange={e => setFormData({...formData, total_sessoes: e.target.value})}
              placeholder="10"
              required
              className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold outline-none focus:ring-2 focus:ring-blue-600 transition-all"
            />
          </div>
        ) : (
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Frequência</label>
            <select 
              value={formData.frequencia}
              onChange={e => setFormData({...formData, frequencia: e.target.value})}
              className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold outline-none focus:ring-2 focus:ring-blue-600 transition-all appearance-none"
            >
              <option value="semanal" className="bg-slate-900">Semanal</option>
              <option value="mensal" className="bg-slate-900">Mensal</option>
            </select>
          </div>
        )}
      </div>

      {type === 'pacote' && (
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Validade (em dias)</label>
          <input 
            type="number" 
            value={formData.dias_validade}
            onChange={e => setFormData({...formData, dias_validade: e.target.value})}
            placeholder="30"
            required
            className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold outline-none focus:ring-2 focus:ring-blue-600 transition-all"
          />
        </div>
      )}

      <div className="flex gap-3 pt-4">
        <button 
          type="button" 
          onClick={onCancel}
          className="flex-1 py-4 bg-white/5 border border-white/10 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all"
        >
          Cancelar
        </button>
        <button 
          type="submit"
          className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-900/20"
        >
          Salvar
        </button>
      </div>
    </form>
  );
};
