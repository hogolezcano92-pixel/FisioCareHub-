import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'motion/react';
import { Crown, Check, ShieldCheck, Zap, CreditCard, Key, Loader2, ArrowRight, Star } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

export default function Subscription() {
  const { profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [proKey, setProKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);

  const handleUpgrade = async (method: 'payment' | 'key') => {
    setLoading(true);
    try {
      if (method === 'key' && proKey !== 'PRO2024') {
        toast.error('Chave inválida', {
          description: 'A chave inserida não é válida ou já expirou.'
        });
        setLoading(false);
        return;
      }

      const { error } = await supabase
        .from('perfis')
        .update({ is_pro: true })
        .eq('id', profile.id);

      if (error) throw error;

      await refreshProfile();
      toast.success('Assinatura Pro Ativada!', {
        description: 'Parabéns! Você agora tem acesso a todos os recursos avançados.'
      });
    } catch (error: any) {
      console.error('Erro ao atualizar para Pro:', error);
      toast.error('Erro ao ativar assinatura', {
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  if ((profile?.plano || '').toLowerCase() === 'free') {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <div className="bg-sky-50 p-12 rounded-[3rem] border border-sky-100 shadow-xl shadow-sky-100/50">
          <ShieldCheck size={64} className="text-sky-500 mx-auto mb-6" />
          <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Você já é VIP!</h2>
          <p className="text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed">
            Como paciente, todos os recursos do FisioCareHub já estão liberados para você. Aproveite sua jornada de reabilitação!
          </p>
        </div>
      </div>
    );
  }

  if (profile?.is_pro) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <div className="bg-emerald-50 p-12 rounded-[3rem] border border-emerald-100 shadow-xl shadow-emerald-100/50">
          <Crown size={64} className="text-emerald-500 mx-auto mb-6" />
          <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Assinatura Pro Ativa</h2>
          <p className="text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed mb-8">
            Você está aproveitando o melhor do FisioCareHub. Todos os recursos avançados estão desbloqueados.
          </p>
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-full font-black text-lg shadow-lg shadow-emerald-500/20">
            Status: Assinante Pro
          </div>
        </div>
      </div>
    );
  }

  const proFeatures = [
    "Agendamentos Avançados e Recorrentes",
    "Relatórios de Evolução Detalhados",
    "Análise de Desempenho com Gráficos",
    "Exportação de Prontuários em PDF",
    "Suporte Prioritário 24/7",
    "Personalização de Protocolos",
    "Gestão de Documentos Ilimitada",
    "Acesso Antecipado a Novos Recursos"
  ];

  return (
    <div className="max-w-6xl mx-auto py-12 px-4">
      <div className="text-center mb-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-sky-50 text-sky-600 rounded-full font-black text-sm uppercase tracking-widest mb-6 border border-sky-100"
        >
          <Zap size={16} />
          Eleve sua Prática
        </motion.div>
        <h1 className="text-5xl font-black text-slate-900 mb-6 tracking-tight">FisioCareHub <span className="text-sky-500">Pro</span></h1>
        <p className="text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed">
          A ferramenta definitiva para fisioterapeutas que buscam excelência no atendimento domiciliar e online.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-12 items-center">
        {/* Features List */}
        <div className="space-y-8">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">O que você ganha com o Pro:</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {proFeatures.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all"
              >
                <div className="mt-1 w-6 h-6 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Check size={14} />
                </div>
                <span className="text-slate-700 font-bold text-sm leading-tight">{feature}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Pricing Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-10 rounded-[3rem] shadow-2xl border-2 border-sky-500 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 bg-sky-500 text-white px-8 py-2 rounded-bl-3xl font-black text-sm uppercase tracking-widest">
            Mais Popular
          </div>
          
          <div className="mb-8">
            <h3 className="text-2xl font-black text-slate-900 mb-2">Plano Profissional</h3>
            <p className="text-slate-500 font-medium">Acesso total e ilimitado</p>
          </div>

          <div className="flex items-baseline gap-2 mb-10">
            <span className="text-5xl font-black text-slate-900 tracking-tighter">R$ 49,90</span>
            <span className="text-xl text-slate-400 font-bold">/mês</span>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => handleUpgrade('payment')}
              disabled={loading}
              className="w-full py-5 bg-sky-500 text-white rounded-2xl font-black text-xl hover:bg-sky-600 transition-all shadow-xl shadow-sky-100 flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" /> : (
                <>
                  <CreditCard size={24} />
                  Assinar Agora
                </>
              )}
            </button>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-100"></span>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-4 bg-white text-slate-400 font-black uppercase tracking-widest">ou use uma chave</span>
              </div>
            </div>

            {showKeyInput ? (
              <div className="space-y-4">
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    type="text"
                    value={proKey}
                    onChange={(e) => setProKey(e.target.value.toUpperCase())}
                    placeholder="INSIRA SUA CHAVE PRO"
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-sky-500 outline-none font-black text-center tracking-widest"
                  />
                </div>
                <button
                  onClick={() => handleUpgrade('key')}
                  disabled={loading || !proKey}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin" /> : 'Ativar com Chave'}
                </button>
                <button
                  onClick={() => setShowKeyInput(false)}
                  className="w-full py-2 text-slate-400 font-bold text-sm hover:text-slate-600"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowKeyInput(true)}
                className="w-full py-4 bg-white border-2 border-slate-100 text-slate-600 rounded-2xl font-black text-lg hover:bg-slate-50 hover:border-slate-200 transition-all flex items-center justify-center gap-2"
              >
                <Key size={20} />
                Tenho uma Chave
              </button>
            )}
          </div>

          <div className="mt-10 pt-8 border-t border-slate-50 text-center">
            <div className="flex items-center justify-center gap-1 text-amber-400 mb-2">
              {[...Array(5)].map((_, i) => <Star key={i} size={16} fill="currentColor" />)}
            </div>
            <p className="text-sm text-slate-400 font-medium">
              Avaliado como 5 estrelas por mais de 500 profissionais
            </p>
          </div>
        </motion.div>
      </div>

      {/* Trust Badges */}
      <div className="mt-24 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
        {[
          { icon: ShieldCheck, title: "Seguro", desc: "Pagamento Criptografado" },
          { icon: Zap, title: "Instantâneo", desc: "Ativação na Hora" },
          { icon: Star, title: "Garantia", desc: "7 Dias de Teste" },
          { icon: Crown, title: "Exclusivo", desc: "Recursos Premium" }
        ].map((badge, i) => (
          <div key={i} className="space-y-2">
            <div className="w-12 h-12 bg-sky-50 text-sky-500 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
              <badge.icon size={24} />
            </div>
            <h4 className="font-black text-slate-900 text-sm uppercase tracking-wider">{badge.title}</h4>
            <p className="text-xs text-slate-400 font-medium">{badge.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
