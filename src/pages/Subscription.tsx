import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'motion/react';
import { Crown, Check, ShieldCheck, Zap, CreditCard, Key, Loader2, ArrowRight, Star } from 'lucide-react';
import { supabase, invokeFunction } from '../lib/supabase';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

export default function Subscription() {
  const { profile, subscription, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [proKey, setProKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);

  const isPro = profile?.plano === 'admin' || profile?.plano === 'pro' || profile?.plan_type === 'pro' || profile?.is_pro === true || subscription?.status === 'ativo';

  const handleUpgrade = async (method: 'payment' | 'key', planType: 'basic' | 'pro' = 'pro') => {
    setLoading(true);
    try {
      if (method === 'key') {
        const validKey = planType === 'pro' ? 'PRO2024' : 'BASIC2024';
        if (proKey !== validKey) {
          toast.error('Chave inválida', {
            description: 'A chave inserida não é válida ou já expirou.'
          });
          setLoading(false);
          return;
        }

        // Update assinaturas table
        const { error } = await supabase
          .from('assinaturas')
          .upsert({
            user_id: profile.id,
            plano: planType,
            status: 'ativo',
            valor: planType === 'pro' ? 49.99 : 19.99,
            data_inicio: new Date().toISOString(),
            data_expiracao: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          });

        if (error) throw error;

        // Also update perfis for compatibility
        await supabase
          .from('perfis')
          .update({ 
            is_pro: planType === 'pro',
            plano: planType,
            plan_type: planType
          })
          .eq('id', profile.id);

        await refreshProfile();
        toast.success(`Assinatura ${planType.toUpperCase()} Ativada!`, {
          description: planType === 'pro' 
            ? 'Parabéns! Você agora tem acesso a todos os recursos avançados.'
            : 'Sua assinatura básica foi ativada com sucesso.'
        });
        return;
      }

      // Stripe Payment Method
      if (!profile) {
        throw new Error('Usuário não identificado. Por favor, faça login novamente para assinar.');
      }

      const amount = planType === 'pro' ? 49.99 : 19.99;
      const serviceName = planType === 'pro' ? 'Plano Pro Fisioterapeuta' : 'Plano Basic Fisioterapeuta';

      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: profile.id,
          email: profile.email,
          plan: planType,
          type: 'subscription',
          service_name: serviceName,
          amount: amount
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Erro ao comunicar com servidor de pagamentos.');
      }

      const data = await response.json();

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('Não foi possível gerar o link de pagamento.');
      }
    } catch (error: any) {
      console.error('Erro ao processar assinatura:', error);
      toast.error('Erro ao processar assinatura', {
        description: error.message || 'Ocorreu um erro inesperado. Tente novamente.'
      });
    } finally {
      setLoading(false);
    }
  };

  if (profile?.tipo_usuario === 'paciente') {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <div className="bg-sky-500/5 backdrop-blur-xl p-12 rounded-[3rem] border border-sky-500/20 shadow-2xl">
          <ShieldCheck size={64} className="text-sky-400 mx-auto mb-6" />
          <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400 mb-4 tracking-tight">Você já é VIP!</h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed font-medium">
            Como paciente, todos os recursos do FisioCareHub já estão liberados para você. Aproveite sua jornada de reabilitação!
          </p>
        </div>
      </div>
    );
  }

  if (isPro) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <div className="bg-emerald-500/5 backdrop-blur-xl p-12 rounded-[3rem] border border-emerald-500/20 shadow-2xl">
          <Crown size={64} className="text-emerald-400 mx-auto mb-6" />
          <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400 mb-4 tracking-tight">Assinatura PRO Ativa</h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed mb-8 font-medium">
            Você está aproveitando o melhor do FisioCareHub. Todos os recursos avançados estão desbloqueados.
          </p>
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-full font-black text-lg shadow-lg shadow-emerald-900/20">
            Status: Assinante PRO
          </div>
          <p className="mt-6 text-sm text-slate-500 font-black uppercase tracking-widest">
            Sua assinatura expira em: {subscription?.data_expiracao ? new Date(subscription.data_expiracao).toLocaleDateString() : 'N/A'}
          </p>
        </div>
      </div>
    );
  }

  const proFeatures = [
    "Pacientes Ilimitados",
    "IA Completa (Análise e Sugestões)",
    "Relatórios de Evolução Detalhados",
    "Análise de Desempenho com Gráficos",
    "Exportação de Prontuários em PDF",
    "Liberar Acesso ao Paciente",
    "Compartilhamento Externo",
    "Gestão de Documentos Ilimitada"
  ];

  const basicFeatures = [
    "Cadastro de Pacientes",
    "Gestão de Documentos Próprios",
    "Listagem de Pacientes",
    "Histórico de Evoluções",
    "Agendamentos Básicos"
  ];

  const currentPlan = profile?.plan_type || profile?.plano || 'basic';

  return (
    <div className="max-w-6xl mx-auto py-12 px-4">
      <div className="text-center mb-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-sky-500/10 text-sky-400 rounded-full font-black text-sm uppercase tracking-widest mb-6 border border-sky-500/20"
        >
          <Zap size={16} />
          Eleve sua Prática
        </motion.div>
        <h1 className="text-4xl font-black text-white mb-6 tracking-tight">Escolha o plano ideal para você</h1>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed font-medium">
          Ferramentas profissionais para fisioterapeutas que buscam excelência.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 items-stretch">
        {/* Basic Plan */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className={cn(
            "bg-slate-900/50 backdrop-blur-xl p-8 rounded-[3rem] border border-white/10 flex flex-col h-full",
            currentPlan === 'basic' && "border-sky-500/50 ring-1 ring-sky-500/50"
          )}
        >
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-black text-white px-4 py-1 bg-white/5 rounded-full inline-block">Plano BASIC</h3>
              {currentPlan === 'basic' && <span className="text-[10px] font-black text-sky-400 uppercase tracking-widest px-2 py-1 bg-sky-500/10 rounded-lg">Plano Atual</span>}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-white tracking-tighter">R$ 19,99</span>
              <span className="text-sm text-slate-500 font-bold">/mês</span>
            </div>
            <p className="text-slate-400 text-sm mt-4 font-medium leading-relaxed">
              Ideal para quem está começando e precisa gerenciar seus pacientes e documentos de forma interna.
            </p>
          </div>

          <div className="flex-1 space-y-3 mb-8">
            {basicFeatures.map((feature, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 bg-sky-500/10 text-sky-400 rounded-full flex items-center justify-center border border-sky-500/20">
                  <Check size={12} />
                </div>
                <span className="text-slate-300 font-bold text-sm tracking-tight">{feature}</span>
              </div>
            ))}
          </div>

          {currentPlan !== 'basic' && currentPlan !== 'pro' ? (
            <button
              onClick={() => handleUpgrade('payment', 'basic')}
              disabled={loading}
              className="w-full py-4 bg-white text-slate-950 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-100 transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" /> : 'Assinar Basic'}
            </button>
          ) : (
            <button disabled className="w-full py-4 bg-slate-800 text-slate-500 rounded-2xl font-black text-sm uppercase tracking-widest cursor-not-allowed">
              {currentPlan === 'basic' ? 'Seu Plano Atual' : 'Plano Inferior'}
            </button>
          )}
        </motion.div>

        {/* Pro Plan */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className={cn(
            "bg-slate-900/50 backdrop-blur-xl p-8 rounded-[3rem] border-2 border-sky-500 relative flex flex-col h-full shadow-2xl shadow-sky-950/20",
            currentPlan === 'pro' && "bg-sky-500/5"
          )}
        >
          <div className="absolute top-0 right-0 bg-sky-500 text-white px-6 py-1.5 rounded-bl-[1.5rem] font-black text-[10px] uppercase tracking-widest">
            Mais Completo
          </div>

          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-black text-white px-4 py-1 bg-sky-500/20 text-sky-400 rounded-full inline-block flex items-center gap-2">
                <Crown size={16} /> Plano PRO
              </h3>
              {currentPlan === 'pro' && <span className="text-[10px] font-black text-sky-400 uppercase tracking-widest px-2 py-1 bg-sky-500/10 rounded-lg">Plano Atual</span>}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-white tracking-tighter">R$ 49,99</span>
              <span className="text-sm text-slate-500 font-bold">/mês</span>
            </div>
            <p className="text-slate-400 text-sm mt-4 font-medium leading-relaxed">
              Acesso total e ilimitado para profissionais que desejam digitalizar a jornada do paciente.
            </p>
          </div>

          <div className="flex-1 space-y-3 mb-8">
            {proFeatures.map((feature, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center border border-emerald-500/20">
                  <Check size={12} />
                </div>
                <span className="text-slate-300 font-bold text-sm tracking-tight">{feature}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => handleUpgrade('payment', 'pro')}
            disabled={loading || currentPlan === 'pro'}
            className="w-full py-4 bg-sky-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-sky-600 transition-all shadow-xl shadow-sky-900/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" /> : (
              <>
                {currentPlan === 'pro' ? 'Assinatura Ativa' : (currentPlan === 'basic' ? 'Fazer Upgrade para PRO' : 'Assinar PRO')}
                {!loading && currentPlan !== 'pro' && <ArrowRight size={16} />}
              </>
            )}
          </button>
        </motion.div>
      </div>

      {/* Key Input Section */}
      <div className="mt-16 max-w-md mx-auto">
        <div className="text-center mb-6">
          <p className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">ou ative com uma chave de acesso</p>
        </div>
        
        {showKeyInput ? (
          <div className="space-y-4">
            <div className="relative">
              <Key className="absolute pointer-events-none z-20" style={{ left: '16px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', color: '#94a3b8' }} />
              <input
                type="text"
                value={proKey}
                onChange={(e) => setProKey(e.target.value.toUpperCase())}
                placeholder="INSIRA SUA CHAVE"
                className="w-full pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-sky-500 outline-none font-black text-center tracking-widest text-white !pl-[60px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleUpgrade('key', 'basic')}
                disabled={loading || !proKey}
                className="py-3 bg-white/5 border border-white/10 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                Ativar Basic
              </button>
              <button
                onClick={() => handleUpgrade('key', 'pro')}
                disabled={loading || !proKey}
                className="py-3 bg-white text-slate-900 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                Ativar Pro
              </button>
            </div>
            <button onClick={() => setShowKeyInput(false)} className="w-full text-[10px] font-black text-slate-600 uppercase tracking-widest hover:text-slate-400 transition-colors">Cancelar</button>
          </div>
        ) : (
          <button
            onClick={() => setShowKeyInput(true)}
            className="w-full py-4 bg-white/5 border border-white/10 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2"
          >
            <Key size={16} /> Tenho uma Chave de Acesso
          </button>
        )}
      </div>

          <div className="mt-10 pt-8 border-t border-white/5 text-center">
            <div className="flex items-center justify-center gap-1 text-amber-400 mb-2">
              {[...Array(5)].map((_, i) => <Star key={i} size={16} fill="currentColor" />)}
            </div>
            <p className="text-sm text-slate-500 font-medium">
              Avaliado como 5 estrelas por mais de 500 profissionais
            </p>
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
            <div className="w-12 h-12 bg-sky-500/10 text-sky-400 rounded-2xl flex items-center justify-center mx-auto shadow-sm border border-sky-500/20">
              <badge.icon size={24} />
            </div>
            <h4 className="font-black text-white text-sm uppercase tracking-wider">{badge.title}</h4>
            <p className="text-xs text-slate-500 font-medium">{badge.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
