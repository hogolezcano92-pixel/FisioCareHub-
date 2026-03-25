import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { motion } from 'motion/react';
import { Check, Zap, Shield, Star, CreditCard, Loader2, ArrowRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

const PLANS = [
  {
    id: 'free',
    name: 'Plano Gratuito',
    price: '0,00',
    period: 'mês',
    description: 'Para quem quer conhecer a plataforma.',
    features: [
      'Até 3 prontuários digitais',
      '1 Triagem por IA',
      'Acesso básico à agenda',
      'Sem chat em tempo real'
    ],
    color: 'slate',
    popular: false
  },
  {
    id: 'basic',
    name: 'Plano Básico',
    price: '39,90',
    period: 'mês',
    description: 'Ideal para profissionais autônomos iniciando na plataforma.',
    features: [
      'Até 20 pacientes ativos',
      'Agenda de consultas completa',
      'Prontuários digitais ilimitados',
      'Suporte via e-mail',
      'Triagem IA básica'
    ],
    color: 'blue',
    popular: false
  },
  {
    id: 'premium_monthly',
    name: 'Premium Mensal',
    price: '79,90',
    period: 'mês',
    description: 'Para clínicas e profissionais que buscam o máximo de produtividade.',
    features: [
      'Pacientes ilimitados',
      'Triagem IA avançada e ilimitada',
      'Chat em tempo real ilimitado',
      'Relatórios de evolução em PDF',
      'Suporte prioritário via WhatsApp',
      'Personalização de prontuários'
    ],
    color: 'indigo',
    popular: true
  },
  {
    id: 'premium_yearly',
    name: 'Premium Anual',
    price: '699,90',
    period: 'ano',
    description: 'Economize mais de 25% com o pagamento anual antecipado.',
    features: [
      'Todos os recursos do Premium',
      'Desconto exclusivo de 27%',
      'Acesso antecipado a novas funções',
      'Consultoria de marketing para fisios',
      'Selo de Profissional Verificado'
    ],
    color: 'emerald',
    popular: false
  }
];

export default function Subscription() {
  const [user] = useAuthState(auth);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      getDoc(doc(db, 'users', user.uid)).then(snap => {
        if (snap.exists()) {
          setUserData(snap.data());
        }
        setLoading(false);
      });
    }
  }, [user]);

  const handleSubscribe = async (planId: string) => {
    if (!user) return;
    setSubmitting(planId);

    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
      const planType = planId.includes('premium') ? 'premium' : 'basic';
      const billingCycle = planId.includes('yearly') ? 'yearly' : 'monthly';
      
      const expiryDate = new Date();
      if (billingCycle === 'yearly') {
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      } else {
        expiryDate.setMonth(expiryDate.getMonth() + 1);
      }

      await updateDoc(doc(db, 'users', user.uid), {
        subscription: {
          plan: planType,
          status: 'active',
          expiryDate: expiryDate.toISOString(),
          billingCycle
        }
      });

      alert(`Parabéns! Você agora é um assinante ${planType.toUpperCase()}.`);
      navigate('/dashboard');
    } catch (err) {
      alert("Erro ao processar assinatura.");
    } finally {
      setSubmitting(null);
    }
  };

  if (loading) return <div className="flex justify-center pt-20"><Loader2 className="animate-spin h-12 w-12 text-blue-600" /></div>;

  if (userData?.role !== 'physiotherapist') {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold">Acesso Restrito</h2>
        <p className="text-slate-500 mt-2">Esta área é exclusiva para profissionais fisioterapeutas.</p>
        <button onClick={() => navigate('/dashboard')} className="mt-6 text-blue-600 font-bold">Voltar ao Dashboard</button>
      </div>
    );
  }

  const currentPlan = userData?.subscription?.plan || 'free';

  return (
    <div className="space-y-16 pb-20">
      <header className="text-center max-w-3xl mx-auto space-y-4">
        <h1 className="text-4xl lg:text-5xl font-extrabold text-slate-900">Escolha o plano ideal para sua carreira</h1>
        <p className="text-xl text-slate-500">
          Potencialize seus atendimentos com ferramentas exclusivas e gestão inteligente.
        </p>
      </header>

      <div className="grid lg:grid-cols-3 gap-8">
        {PLANS.map((plan) => (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "relative bg-white rounded-[2.5rem] border-2 p-8 flex flex-col transition-all",
              plan.popular ? "border-blue-600 shadow-2xl scale-105 z-10" : "border-slate-100 shadow-sm hover:border-slate-200"
            )}
          >
            {plan.popular && (
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-6 py-1.5 rounded-full text-sm font-bold shadow-lg">
                MAIS POPULAR
              </div>
            )}

            <div className="mb-8">
              <h3 className="text-2xl font-bold text-slate-900 mb-2">{plan.name}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{plan.description}</p>
            </div>

            <div className="mb-8">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-slate-900">R$ {plan.price}</span>
                <span className="text-slate-500 font-medium">/{plan.period}</span>
              </div>
            </div>

            <div className="flex-1 space-y-4 mb-10">
              {plan.features.map((feature, i) => (
                <div key={i} className="flex items-start gap-3 text-sm text-slate-600">
                  <div className={cn(
                    "mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0",
                    plan.color === 'blue' ? "bg-blue-50 text-blue-600" : 
                    plan.color === 'indigo' ? "bg-indigo-50 text-indigo-600" : "bg-emerald-50 text-emerald-600"
                  )}>
                    <Check size={12} strokeWidth={3} />
                  </div>
                  {feature}
                </div>
              ))}
            </div>

            <button
              onClick={() => handleSubscribe(plan.id)}
              disabled={submitting !== null || (currentPlan === 'premium' && plan.id === 'basic')}
              className={cn(
                "w-full py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2",
                plan.popular 
                  ? "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-100" 
                  : "bg-slate-900 text-white hover:bg-slate-800",
                (currentPlan === plan.id.replace('_monthly', '').replace('_yearly', '')) && "opacity-50 cursor-default"
              )}
            >
              {submitting === plan.id ? (
                <Loader2 className="animate-spin" />
              ) : currentPlan === plan.id.replace('_monthly', '').replace('_yearly', '') ? (
                'Plano Atual'
              ) : (
                <>Assinar Agora <ArrowRight size={18} /></>
              )}
            </button>
          </motion.div>
        ))}
      </div>

      <section className="bg-slate-50 rounded-[2.5rem] p-12 grid md:grid-cols-3 gap-8">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm text-blue-600">
            <Shield size={28} />
          </div>
          <h4 className="font-bold text-slate-900">Pagamento Seguro</h4>
          <p className="text-sm text-slate-500">Seus dados estão protegidos com criptografia de ponta a ponta.</p>
        </div>
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm text-indigo-600">
            <Star size={28} />
          </div>
          <h4 className="font-bold text-slate-900">Satisfação Garantida</h4>
          <p className="text-sm text-slate-500">Cancele a qualquer momento sem taxas escondidas ou burocracia.</p>
        </div>
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm text-emerald-600">
            <CreditCard size={28} />
          </div>
          <h4 className="font-bold text-slate-900">Múltiplas Formas</h4>
          <p className="text-sm text-slate-500">Aceitamos Pix, Cartão de Crédito e Boleto Bancário.</p>
        </div>
      </section>
    </div>
  );
}
