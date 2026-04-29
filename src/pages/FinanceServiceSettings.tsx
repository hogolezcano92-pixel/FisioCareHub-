import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'motion/react';
import { 
  Settings, 
  Save, 
  Loader2, 
  ChevronLeft,
  DollarSign,
  Stethoscope,
  Activity,
  Users,
  Home,
  CheckCircle2,
  Package,
  Plus,
  Trash2,
  Edit,
  Zap,
  Calendar,
  Percent,
  Tag
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import ProGuard from '../components/ProGuard';
import { cn } from '../lib/utils';

interface ServicePackage {
  id: string;
  name: string;
  sessions_quantity: number;
  total_price: number;
  discount_type: 'percent' | 'fixed' | null;
  discount_value: number;
  validity_days: number | null;
  is_active: boolean;
}

interface PhysiotherapistService {
  id: string;
  name: string;
  base_price: number;
  is_active: boolean;
}

export default function FinanceServiceSettings() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [commissionRate, setCommissionRate] = useState(12);
  const [activeTab, setActiveTab] = useState<'individual' | 'packages'>('individual');
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [physioServices, setPhysioServices] = useState<PhysiotherapistService[]>([]);
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState<Partial<ServicePackage> | null>(null);
  const [packageSaving, setPackageSaving] = useState(false);

  const [formData, setFormData] = useState({
    avaliacao_inicial: 0,
    sessao_fisioterapia: 0,
    reabilitacao: 0,
    rpg: 0,
    pilates: 0,
    domiciliar: 0
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login');
      return;
    }
    const init = async () => {
      await Promise.all([
        fetchSettings(),
        fetchCommissionRate(),
        fetchPackages()
      ]);
      await fetchPhysioServices();
    };
    init();
  }, [user, authLoading]);

  const fetchPhysioServices = async () => {
    if (!user) return;
    console.log('Fetching services for user:', user.id);
    try {
      const { data, error } = await supabase
        .from('physiotherapist_services')
        .select('*')
        .eq('physiotherapist_id', user.id);
      
      if (error) {
        console.error('Supabase error fetching services:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.log('No services found, initializing defaults...');
        // Initialize with default services if empty
        const defaultServices = [
          { name: 'Avaliação Inicial', base_price: formData.avaliacao_inicial || 0 },
          { name: 'Sessão de Fisioterapia', base_price: formData.sessao_fisioterapia || 0 },
          { name: 'Reabilitação', base_price: formData.reabilitacao || 0 },
          { name: 'RPG', base_price: formData.rpg || 0 },
          { name: 'Pilates', base_price: formData.pilates || 0 },
          { name: 'Fisioterapia Domiciliar', base_price: formData.domiciliar || 0 },
        ].map(s => ({ ...s, physiotherapist_id: user.id, is_active: true }));

        const { data: inserted, error: insertErr } = await supabase
          .from('physiotherapist_services')
          .insert(defaultServices)
          .select();
        
        if (insertErr) {
          console.error('Error inserting default services:', insertErr);
          throw insertErr;
        }

        // If insert worked but didn't return data, fetch again
        if (!inserted || inserted.length === 0) {
          const { data: retryData } = await supabase
            .from('physiotherapist_services')
            .select('*')
            .eq('physiotherapist_id', user.id);
          setPhysioServices(retryData || []);
        } else {
          setPhysioServices(inserted);
        }
        console.log('Default services initialized');
      } else {
        console.log('Services fetched successfully:', data.length, 'records');
        setPhysioServices(data);
      }
    } catch (err) {
      console.error('Final error fetching physio services:', err);
      toast.error('Erro ao carregar lista de serviços. Verifique se o banco de dados está atualizado.');
    }
  };

  const fetchPackages = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('service_packages')
        .select('*')
        .eq('physiotherapist_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setPackages(data || []);
    } catch (err) {
      console.error('Error fetching packages:', err);
    }
  };

  const fetchCommissionRate = async () => {
    try {
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'commission_rate')
        .single();
      if (data) setCommissionRate(Number(data.value));
    } catch (err) {
      console.warn("Could not fetch commission rate", err);
    }
  };

  const fetchSettings = async () => {
    setLoading(true);
    try {
      if (!user) return;

      const { data, error } = await supabase
        .from('configuracao_servicos')
        .select('*')
        .eq('physio_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (!data) {
        // Create default record
        const { data: newData, error: insertError } = await supabase
          .from('configuracao_servicos')
          .insert({ physio_id: user.id })
          .select()
          .single();

        if (insertError) throw insertError;
        setSettings(newData);
        updateFormData(newData);
      } else {
        setSettings(data);
        updateFormData(data);
      }
    } catch (err: any) {
      console.error('Erro ao buscar configurações:', err);
      toast.error('Erro ao carregar configurações de valores');
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (data: any) => {
    setFormData({
      avaliacao_inicial: data.avaliacao_inicial || 0,
      sessao_fisioterapia: data.sessao_fisioterapia || 0,
      reabilitacao: data.reabilitacao || 0,
      rpg: data.rpg || 0,
      pilates: data.pilates || 0,
      domiciliar: data.domiciliar || 0
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    try {
      // 1. Update legacy configuracao_servicos
      const { error: configError } = await supabase
        .from('configuracao_servicos')
        .update(formData)
        .eq('physio_id', user.id);

      if (configError) throw configError;

      // 2. Sync with new physiotherapist_services table
      const syncPromises = [
        { name: 'Avaliação Inicial', price: formData.avaliacao_inicial },
        { name: 'Sessão de Fisioterapia', price: formData.sessao_fisioterapia },
        { name: 'Reabilitação', price: formData.reabilitacao },
        { name: 'RPG', price: formData.rpg },
        { name: 'Pilates', price: formData.pilates },
        { name: 'Fisioterapia Domiciliar', price: formData.domiciliar },
      ].map(s => {
        return supabase
          .from('physiotherapist_services')
          .update({ base_price: s.price })
          .eq('physiotherapist_id', user.id)
          .eq('name', s.name);
      });

      await Promise.all(syncPromises);
      await fetchPhysioServices(); // Refresh list

      toast.success('Configurações de valores salvas com sucesso!');
    } catch (err: any) {
      console.error('Erro ao salvar configurações:', err);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const handlePackageSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editingPackage) return;

    setPackageSaving(true);
    try {
      // Clean payload: remove internal fields if they exist
      const { id, created_at, updated_at, ...cleanData } = editingPackage as any;
      
      const payload = {
        ...cleanData,
        discount_type: editingPackage.discount_type,
        physiotherapist_id: user.id,
      };

      let error;
      if (editingPackage.id) {
        ({ error } = await supabase
          .from('service_packages')
          .update(payload)
          .eq('id', editingPackage.id));
      } else {
        ({ error } = await supabase
          .from('service_packages')
          .insert([payload]));
      }

      if (error) throw error;
      
      toast.success(editingPackage.id ? 'Pacote atualizado!' : 'Pacote criado!');
      setShowPackageModal(false);
      setEditingPackage(null);
      fetchPackages();
    } catch (err: any) {
      console.error('Error saving package:', err);
      // Show specific error message to help debugging
      const errorMsg = err.message || 'Erro ao salvar pacote';
      const detail = err.details || '';
      toast.error(`${errorMsg} ${detail}`);
    } finally {
      setPackageSaving(false);
    }
  };

  const handleDeletePackage = async (id: string) => {
    if (!confirm('Deseja realmente excluir este pacote?')) return;

    try {
      const { error } = await supabase
        .from('service_packages')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast.success('Pacote excluído!');
      fetchPackages();
    } catch (err) {
      console.error('Error deleting package:', err);
      toast.error('Erro ao excluir pacote');
    }
  };

  const calculateSessionValue = (pkg: Partial<ServicePackage>) => {
    if (!pkg.total_price || !pkg.sessions_quantity || pkg.sessions_quantity === 0) return 0;
    return pkg.total_price / pkg.sessions_quantity;
  };

  return (
    <ProGuard requiredPlan="basic">
      <div className="space-y-8 pb-20 max-w-4xl mx-auto">
        <header className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-white/5 rounded-full transition-colors text-slate-400"
          >
            <ChevronLeft size={24} />
          </button>
          <div>
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400 tracking-tight">Configuração de Valores</h1>
            <p className="text-slate-400 font-medium whitespace-nowrap overflow-hidden text-ellipsis">Defina os valores padrão para cada tipo de atendimento.</p>
          </div>
        </header>

        {/* Tab System */}
        <div className="flex p-1.5 bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/10 w-fit">
          <button
            onClick={() => setActiveTab('individual')}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all",
              activeTab === 'individual' ? "bg-emerald-500 text-white shadow-lg shadow-emerald-900/20" : "text-slate-400 hover:text-white"
            )}
          >
            <DollarSign size={16} />
            Preços Individuais
          </button>
          <button
            onClick={() => setActiveTab('packages')}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all",
              activeTab === 'packages' ? "bg-emerald-500 text-white shadow-lg shadow-emerald-900/20" : "text-slate-400 hover:text-white"
            )}
          >
            <Package size={16} />
            Pacotes de Serviço
          </button>
        </div>

        {activeTab === 'individual' ? (
          <div className="space-y-6">
            {/* Informação sobre Taxa */}
            <div className="bg-blue-600/10 border border-blue-500/20 p-6 rounded-[2rem] flex items-center gap-6">
          <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/20 shrink-0">
            <DollarSign size={28} />
          </div>
          <div>
            <h3 className="text-white font-black tracking-tight">Taxa de Serviço da Plataforma: {commissionRate}%</h3>
            <p className="text-slate-400 text-sm font-medium">
              Este valor é descontado automaticamente no momento do repasse. 
              Você receberá <span className="text-blue-400 font-black">{100 - commissionRate}%</span> do valor bruto cobrado do paciente.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="w-12 h-12 text-emerald-400 animate-spin" />
            <p className="text-slate-500 font-bold animate-pulse">Carregando configurações...</p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Avaliação Inicial */}
              <div className="bg-slate-900/50 backdrop-blur-xl p-6 rounded-[2rem] border border-white/10 shadow-2xl space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center border border-emerald-500/20">
                    <Stethoscope size={20} />
                  </div>
                  <h3 className="font-black text-white tracking-tight">Avaliação Inicial</h3>
                </div>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-black">R$</div>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.avaliacao_inicial}
                    onChange={(e) => setFormData({...formData, avaliacao_inicial: parseFloat(e.target.value) || 0})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white font-black focus:outline-none focus:border-emerald-500/50 transition-all"
                    placeholder="0,00"
                  />
                </div>
              </div>

              {/* Sessão de Fisioterapia */}
              <div className="bg-slate-900/50 backdrop-blur-xl p-6 rounded-[2rem] border border-white/10 shadow-2xl space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center border border-blue-500/20">
                    <Activity size={20} />
                  </div>
                  <h3 className="font-black text-white tracking-tight">Sessão de Fisioterapia</h3>
                </div>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-black">R$</div>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.sessao_fisioterapia}
                    onChange={(e) => setFormData({...formData, sessao_fisioterapia: parseFloat(e.target.value) || 0})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white font-black focus:outline-none focus:border-blue-500/50 transition-all"
                    placeholder="0,00"
                  />
                </div>
              </div>

              {/* Reabilitação */}
              <div className="bg-slate-900/50 backdrop-blur-xl p-6 rounded-[2rem] border border-white/10 shadow-2xl space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-purple-500/10 text-purple-400 rounded-xl flex items-center justify-center border border-purple-500/20">
                    <Activity size={20} />
                  </div>
                  <h3 className="font-black text-white tracking-tight">Reabilitação</h3>
                </div>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-black">R$</div>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.reabilitacao}
                    onChange={(e) => setFormData({...formData, reabilitacao: parseFloat(e.target.value) || 0})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white font-black focus:outline-none focus:border-purple-500/50 transition-all"
                    placeholder="0,00"
                  />
                </div>
              </div>

              {/* RPG */}
              <div className="bg-slate-900/50 backdrop-blur-xl p-6 rounded-[2rem] border border-white/10 shadow-2xl space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-amber-500/10 text-amber-400 rounded-xl flex items-center justify-center border border-amber-500/20">
                    <Activity size={20} />
                  </div>
                  <h3 className="font-black text-white tracking-tight">RPG</h3>
                </div>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-black">R$</div>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.rpg}
                    onChange={(e) => setFormData({...formData, rpg: parseFloat(e.target.value) || 0})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white font-black focus:outline-none focus:border-amber-500/50 transition-all"
                    placeholder="0,00"
                  />
                </div>
              </div>

              {/* Pilates */}
              <div className="bg-slate-900/50 backdrop-blur-xl p-6 rounded-[2rem] border border-white/10 shadow-2xl space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-rose-500/10 text-rose-400 rounded-xl flex items-center justify-center border border-rose-500/20">
                    <Users size={20} />
                  </div>
                  <h3 className="font-black text-white tracking-tight">Pilates</h3>
                </div>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-black">R$</div>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.pilates}
                    onChange={(e) => setFormData({...formData, pilates: parseFloat(e.target.value) || 0})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white font-black focus:outline-none focus:border-rose-500/50 transition-all"
                    placeholder="0,00"
                  />
                </div>
              </div>

              {/* Fisioterapia Domiciliar */}
              <div className="bg-slate-900/50 backdrop-blur-xl p-6 rounded-[2rem] border border-white/10 shadow-2xl space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-sky-500/10 text-sky-400 rounded-xl flex items-center justify-center border border-sky-500/20">
                    <Home size={20} />
                  </div>
                  <h3 className="font-black text-white tracking-tight">Fisioterapia Domiciliar</h3>
                </div>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-black">R$</div>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.domiciliar}
                    onChange={(e) => setFormData({...formData, domiciliar: parseFloat(e.target.value) || 0})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white font-black focus:outline-none focus:border-sky-500/50 transition-all"
                    placeholder="0,00"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-6">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-900/20 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    SALVANDO...
                  </>
                ) : (
                  <>
                    <Save size={20} />
                    SALVAR CONFIGURAÇÕES
                  </>
                )}
              </button>
            </div>
          </form>
        )}
        </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-white tracking-tight">Gerenciar Pacotes</h2>
                <p className="text-slate-400 text-sm font-medium">Crie ofertas especiais para seus pacientes.</p>
              </div>
              <button
                onClick={() => {
                  setEditingPackage({
                    name: '',
                    sessions_quantity: 10,
                    total_price: 0,
                    discount_type: null,
                    discount_value: 0,
                    validity_days: 90,
                    is_active: true
                  });
                  setShowPackageModal(true);
                }}
                className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-900/20"
              >
                <Plus size={18} />
                CRIAR NOVO PACOTE
              </button>
            </div>

            {packages.length === 0 ? (
              <div className="bg-slate-900/50 backdrop-blur-xl p-20 rounded-[3rem] border border-dashed border-white/10 text-center">
                <div className="w-16 h-16 bg-white/5 text-slate-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <Package size={32} />
                </div>
                <h3 className="text-white font-black text-lg mb-2">Nenhum pacote criado</h3>
                <p className="text-slate-500 font-medium">Comece criando seu primeiro pacote de atendimento.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {packages.map((pkg) => (
                  <motion.div
                    key={pkg.id}
                    layoutId={pkg.id}
                    className="bg-slate-900/50 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/10 relative overflow-hidden group"
                  >
                    {!pkg.is_active && (
                      <div className="absolute top-4 right-4 px-3 py-1 bg-rose-500/10 text-rose-400 rounded-full text-[8px] font-black uppercase tracking-widest border border-rose-500/20 z-10">
                        Inativo
                      </div>
                    )}
                    
                    <div className="flex justify-between items-start mb-6">
                      <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center border border-emerald-500/20">
                        <Zap size={24} />
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setEditingPackage(pkg);
                            setShowPackageModal(true);
                          }}
                          className="p-2 hover:bg-white/10 rounded-lg text-slate-400 transition-colors"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDeletePackage(pkg.id)}
                          className="p-2 hover:bg-rose-500/10 rounded-lg text-rose-400 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-xl font-black text-white tracking-tight mb-6">{pkg.name}</h3>

                    <div className="grid grid-cols-2 gap-4 mb-8">
                      <div className="bg-white/5 p-4 rounded-2xl">
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Sessões</p>
                        <p className="text-lg font-black text-white">{pkg.sessions_quantity}</p>
                      </div>
                      <div className="bg-white/5 p-4 rounded-2xl">
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Valor/Sessão</p>
                        <p className="text-lg font-black text-white">
                          R$ {(pkg.total_price / pkg.sessions_quantity).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-6 border-t border-white/5">
                      <div>
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Preço Total</p>
                        <p className="text-2xl font-black text-emerald-400">R$ {pkg.total_price.toFixed(2)}</p>
                      </div>
                      {pkg.validity_days && (
                        <div className="flex items-center gap-2 text-slate-500">
                          <Calendar size={14} />
                          <span className="text-xs font-bold">{pkg.validity_days} dias</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Package Modal */}
        {showPackageModal && editingPackage && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPackageModal(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-card rounded-[3rem] border border-white/10 shadow-2xl p-8 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-white tracking-tight">
                  {editingPackage.id ? 'Editar Pacote' : 'Novo Pacote'}
                </h3>
              </div>

              <form onSubmit={handlePackageSave} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Nome do Pacote</label>
                  <input
                    required
                    type="text"
                    value={editingPackage.name}
                    onChange={(e) => setEditingPackage({ ...editingPackage, name: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white font-black focus:outline-none focus:border-emerald-500/50 transition-all"
                    placeholder="Ex: Reabilitação 10 sessões"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Quantidade de Sessões</label>
                    <input
                      required
                      type="number"
                      min="1"
                      value={editingPackage.sessions_quantity}
                      onChange={(e) => setEditingPackage({ ...editingPackage, sessions_quantity: parseInt(e.target.value) || 0 })}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white font-black focus:outline-none focus:border-emerald-500/50 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Preço Total (R$)</label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      min="0"
                      value={editingPackage.total_price}
                      onChange={(e) => setEditingPackage({ ...editingPackage, total_price: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white font-black focus:outline-none focus:border-emerald-500/50 transition-all"
                    />
                  </div>
                </div>

                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Valor Informativo</span>
                    <span className="text-lg font-black text-emerald-400">R$ {calculateSessionValue(editingPackage).toFixed(2)} / sessão</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Tipo de Desconto</label>
                    <select
                      value={editingPackage.discount_type || 'none'}
                      onChange={(e) => setEditingPackage({ ...editingPackage, discount_type: e.target.value === 'none' ? null : e.target.value as any })}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white font-black focus:outline-none focus:border-emerald-500/50 transition-all appearance-none"
                    >
                      <option value="none" className="bg-slate-900">Nenhum</option>
                      <option value="percent" className="bg-slate-900">Porcentagem (%)</option>
                      <option value="fixed" className="bg-slate-900">Valor Fixo (R$)</option>
                    </select>
                  </div>
                  {editingPackage.discount_type && (
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Valor do Desconto</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editingPackage.discount_value}
                        onChange={(e) => setEditingPackage({ ...editingPackage, discount_value: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white font-black focus:outline-none focus:border-emerald-500/50 transition-all"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Validade (Dias)</label>
                  <input
                    type="number"
                    value={editingPackage.validity_days || ''}
                    onChange={(e) => setEditingPackage({ ...editingPackage, validity_days: parseInt(e.target.value) || null })}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white font-black focus:outline-none focus:border-emerald-500/50 transition-all"
                    placeholder="Sem validade"
                  />
                </div>

                <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl cursor-pointer" onClick={() => setEditingPackage({...editingPackage, is_active: !editingPackage.is_active})}>
                   <div className={cn(
                     "w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all",
                     editingPackage.is_active ? "bg-emerald-500 border-emerald-500" : "border-white/20"
                   )}>
                     {editingPackage.is_active && <CheckCircle2 size={16} className="text-white" />}
                   </div>
                   <span className="text-xs font-bold text-white">Pacote Ativo (visível para pacientes)</span>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowPackageModal(false)}
                    className="flex-1 px-6 py-4 bg-white/5 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all"
                  >
                    CANCELAR
                  </button>
                  <button
                    type="submit"
                    disabled={packageSaving}
                    className="flex-1 px-6 py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-900/20 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {packageSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    {editingPackage.id ? 'ATUALIZAR' : 'CRIAR PACOTE'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </div>
    </ProGuard>
  );
}
