import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { motion } from 'motion/react';
import { Check, Zap, Shield, Star, CreditCard, Loader2, ArrowRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const PLANS = [
  {
    id: 'basic',
    name: 'Plano Basic',
    price: '0,00',
    period: 'mês',
    description: 'Recursos essenciais para começar seus atendimentos.',
    features: [
      'Perfil básico',
      'Visibilidade limitada na busca',
      'Até 5 solicitações de pacientes por mês',
      'Acesso básico à agenda'
    ],
    color: 'slate',
    popular: false,
    trial: null
  },
  {
    id: 'pro',
    name: 'Plano Pro',
    price: '39,90',
    period: 'mês',
    description: 'Acelere sua carreira com visibilidade total e recursos ilimitados.',
    features: [
      'Solicitações de pacientes ilimitadas',
      'Prioridade no ranking de busca',
      'Badge de profissional verificado',
      'Perfil profissional completo',
      'Suporte prioritário'
    ],
    color: 'blue',
    popular: true,
    trial: '30 dias grátis'
  }
];

export default function Subscription() {
  const [user, authLoading] = useAuthState(auth);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      getDoc(doc(db, 'users', user.uid))
        .then(snap => {
          if (snap.exists()) {
            setUserData(snap.data());
          }
        })
        .catch(err => {
          console.error("Erro ao carregar dados do usuário:", err);
          toast.error("Erro ao carregar perfil.");
        })
        .finally(() => {
          setLoading(false);
        });
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user, authLoading]);

  const handleSubscribe = async (planId: string) => {
    if (!user) return;
    
    if (planId === 'basic') {
      setSubmitting(planId);
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          subscription: {
            plan: 'basic',
            status: 'active',
            expiryDate: null,
            billingCycle: 'monthly'
          }
        });
        toast.success("Plano Basic ativado!");
        navigate('/dashboard');
      } catch (err) {
        toast.error("Erro ao ativar plano gratuito.");
      } finally {
        setSubmitting(null);
      }
      return;
    }

    setSubmitting(planId);

    try {
      console.log("[Stripe] Initiating checkout for plan:", planId);
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId,
          userId: user.uid,
          userEmail: user.email,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Erro desconhecido no servidor" }));
        console.error("[Stripe] Server error response:", errorData);
        throw new Error(errorData.details || errorData.error || `Erro no servidor: ${response.status}`);
      }

      const session = await response.json();
      console.log("[Stripe] Session response:", session);

      if (session.error) {
        throw new Error(session.error);
      }

      if (session.url) {
        toast.info("Redirecionando para o pagamento seguro...");
        console.log("[Stripe] Redirecting to:", session.url);
        
        // Use a small delay to ensure toast is visible
        setTimeout(() => {
          try {
            // Try to escape iframe if possible
            if (window.top && window.top !== window) {
              console.log("[Stripe] Attempting redirect via window.top");
              window.top.location.href = session.url;
            } else {
              window.location.href = session.url;
            }
          } catch (e) {
            console.warn("[Stripe] Redirect failed (likely iframe restriction), opening in new tab", e);
            // Fallback: Open in new tab if iframe redirect is blocked
            window.open(session.url, '_blank', 'noopener,noreferrer');
            // Also update current location as a last resort
            window.location.href = session.url;
          }
        }, 1000);
      } else {
        throw new Error("URL de checkout não recebida do servidor.");
      }
    } catch (err: any) {
      console.error("[Stripe] Checkout error:", err);
      toast.error(err.message || "Erro ao iniciar pagamento.");
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

  const currentPlan = userData?.subscription?.plan || 'basic';

  return (
    <div className="space-y-16 pb-20">
      <header className="text-center max-w-3xl mx-auto space-y-4">
        <h1 className="text-4xl lg:text-5xl font-extrabold text-slate-900">Escolha o plano ideal para sua carreira</h1>
        <p className="text-xl text-slate-500">
          Potencialize seus atendimentos com ferramentas exclusivas e gestão inteligente.
        </p>
      </header>

      <div className="grid lg:grid-cols-2 max-w-5xl mx-auto gap-8">
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
              {plan.trial && (
                <p className="text-blue-600 font-bold text-sm mt-2">Teste grátis: {plan.trial}</p>
              )}
            </div>

            <div className="flex-1 space-y-4 mb-10">
              {plan.features.map((feature, i) => (
                <div key={i} className="flex items-start gap-3 text-sm text-slate-600">
                  <div className={cn(
                    "mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0",
                    plan.color === 'blue' ? "bg-blue-50 text-blue-600" : "bg-slate-50 text-slate-600"
                  )}>
                    <Check size={12} strokeWidth={3} />
                  </div>
                  {feature}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => handleSubscribe(plan.id)}
              disabled={submitting !== null}
              className={cn(
                "w-full py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2",
                plan.popular 
                  ? "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-100" 
                  : "bg-slate-900 text-white hover:bg-slate-800",
                currentPlan === plan.id && "opacity-50 cursor-default"
              )}
            >
              {submitting === plan.id ? (
                <Loader2 className="animate-spin" />
              ) : currentPlan === plan.id ? (
                'Plano Atual'
              ) : plan.id === 'pro' ? (
                <>Começar 30 dias grátis <ArrowRight size={18} /></>
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
