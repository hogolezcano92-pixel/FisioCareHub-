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
  CheckCircle2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import ProGuard from '../components/ProGuard';

export default function FinanceServiceSettings() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<any>(null);

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
    fetchSettings();
  }, [user, authLoading]);

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
      const { error } = await supabase
        .from('configuracao_servicos')
        .update(formData)
        .eq('physio_id', user.id);

      if (error) throw error;
      toast.success('Configurações de valores salvas com sucesso!');
    } catch (err: any) {
      console.error('Erro ao salvar configurações:', err);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProGuard>
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
    </ProGuard>
  );
}
