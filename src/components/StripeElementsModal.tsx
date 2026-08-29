import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { X, CreditCard, Lock, ShieldCheck, Loader2, Sparkles, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { getStripeConfig, createSetupIntent, createSubscriptionWithPaymentMethod, updateSubscriptionPaymentMethod, PlanKey, PLANS } from '../services/subscriptionService';
import { toast } from 'sonner';

let stripePromise: ReturnType<typeof loadStripe> | null = null;

const getStripePromise = async () => {
  if (!stripePromise) {
    const config = await getStripeConfig();
    const key = config.publishableKey || import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';
    if (key) {
      stripePromise = loadStripe(key);
    }
  }
  return stripePromise;
};

interface FormProps {
  userId: string;
  userEmail: string;
  userName?: string;
  planKey?: PlanKey;
  mode: 'subscribe' | 'update_card';
  onSuccess: () => void | Promise<void>;
  onClose: () => void;
}

const withClientTimeout = async <T,>(promise: PromiseLike<T>, ms: number, message: string): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });

  try {
    return await Promise.race([Promise.resolve(promise), timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

const CardForm: React.FC<FormProps> = ({ userId, userEmail, userName, planKey, mode, onSuccess, onClose }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);
  const [cardHolderName, setCardHolderName] = useState(userName || '');

  const planInfo = planKey ? PLANS[planKey] : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      toast.error('O formulário do cartão não carregou corretamente.');
      return;
    }

    if (!cardHolderName.trim()) {
      toast.error('Informe o nome impresso no cartão.');
      return;
    }

    setLoading(true);

    try {
      console.log('[StripeElementsModal Log] Preparando cartão no Stripe...', {
        cardHolderName: cardHolderName.trim(),
        userEmail,
        userId,
        planKey,
        mode
      });

      let paymentMethodId = '';

      if (mode === 'subscribe' && planKey) {
        // Antes de iniciar os 60 dias, configuramos o cartão especificamente
        // para cobranças futuras/off-session. Assim qualquer autenticação exigida
        // pelo banco acontece agora, e não somente quando o trial terminar.
        const setup = await createSetupIntent(userId, userEmail, cardHolderName.trim());
        if (!setup?.clientSecret) {
          throw new Error('O Stripe não conseguiu iniciar a autorização do cartão para cobranças futuras.');
        }

        const setupConfirmation = await withClientTimeout(
          stripe.confirmCardSetup(setup.clientSecret, {
            payment_method: {
              card: cardElement,
              billing_details: {
                name: cardHolderName.trim(),
                email: userEmail
              }
            }
          }),
          30000,
          'A autorização do cartão demorou demais. Tente novamente.'
        );

        if (setupConfirmation.error) {
          throw new Error(setupConfirmation.error.message || 'Não foi possível autorizar o cartão para a cobrança após o trial.');
        }

        const setupIntent = setupConfirmation.setupIntent;
        if (!setupIntent || setupIntent.status !== 'succeeded') {
          throw new Error('O cartão não ficou autorizado para cobranças futuras. Confira os dados ou use outro cartão.');
        }

        const configuredPaymentMethod = setupIntent.payment_method;
        paymentMethodId = typeof configuredPaymentMethod === 'string' ? configuredPaymentMethod : '';

        if (!paymentMethodId) {
          throw new Error('O Stripe não retornou o método de pagamento autorizado.');
        }

        console.log('[StripeElementsModal Log] Cartão autorizado para cobrança futura. PaymentMethod:', paymentMethodId);
      } else {
        const paymentMethodResponse = await withClientTimeout(
          stripe.createPaymentMethod({
            type: 'card',
            card: cardElement,
            billing_details: {
              name: cardHolderName.trim(),
              email: userEmail
            }
          }),
          20000,
          'O Stripe demorou demais para validar o cartão. Tente novamente.'
        );

        if (paymentMethodResponse.error) {
          throw new Error(paymentMethodResponse.error.message || 'Não foi possível validar os dados do cartão.');
        }

        paymentMethodId = paymentMethodResponse.paymentMethod?.id || '';
        if (!paymentMethodId) {
          throw new Error('O Stripe não retornou o método de pagamento.');
        }
      }

      if (mode === 'subscribe' && planKey) {
        const payload = {
          userId,
          email: userEmail,
          userName: cardHolderName.trim(),
          planKey,
          paymentMethodId
        };
        console.log('[StripeElementsModal Log] Chamando createSubscriptionWithPaymentMethod com payload:', payload);

        const result = await createSubscriptionWithPaymentMethod(payload);

        // Normalmente o SetupIntent anterior já resolveu a autenticação. Caso o Stripe
        // ainda devolva uma ação pendente, concluímos enquanto o usuário está na tela.
        if (result.setupIntentStatus === 'requires_payment_method') {
          throw new Error('O Stripe não conseguiu autorizar este cartão para cobranças futuras. Confira os dados ou use outro cartão.');
        }

        if (result.setupIntentClientSecret && result.setupIntentStatus === 'requires_action') {
          const confirmation = await withClientTimeout(
            stripe.confirmCardSetup(result.setupIntentClientSecret),
            30000,
            'A autenticação do cartão demorou demais. Tente novamente.'
          );
          if (confirmation.error) {
            throw new Error(confirmation.error.message || 'Autenticação adicional do cartão não concluída.');
          }
        }

        // Para quem já usou o trial, a nova assinatura pode cobrar imediatamente.
        // A API atual do Stripe expõe o client_secret da fatura por confirmation_secret.
        if (!result.isTrial && result.paymentIntentClientSecret) {
          const paymentConfirmation = await withClientTimeout(
            stripe.confirmCardPayment(result.paymentIntentClientSecret),
            30000,
            'A confirmação do pagamento demorou demais. Tente novamente.'
          );
          if (paymentConfirmation.error) {
            throw new Error(paymentConfirmation.error.message || 'Não foi possível confirmar a cobrança da assinatura.');
          }
        }

        console.log('[StripeElementsModal Log] Assinatura ativada com sucesso no backend:', result);

        toast.success('Assinatura ativada com sucesso!', {
          description: result.isTrial
            ? 'Seu teste gratuito de 60 dias começou. Nenhuma cobrança foi feita hoje!'
            : 'Sua assinatura foi processada com sucesso.'
        });
      } else {
        const payload = {
          userId,
          paymentMethodId
        };
        console.log('[StripeElementsModal Log] Chamando updateSubscriptionPaymentMethod com payload:', payload);

        await updateSubscriptionPaymentMethod(payload);

        console.log('[StripeElementsModal Log] Método de pagamento atualizado com sucesso.');

        toast.success('Cartão de crédito atualizado!', {
          description: 'Seu novo método de pagamento foi salvo com sucesso.'
        });
      }

      // Aguarda a releitura do perfil/assinatura antes de fechar o modal. Isso
      // evita a interface continuar exibindo o plano Free por alguns instantes
      // logo após o Stripe confirmar o trial.
      await onSuccess();
      onClose();
    } catch (err: any) {
      console.error('[StripeElementsModal Error] Exceção capturada na submissão:', {
        message: err.message,
        stack: err.stack,
        serverDetails: err.serverDetails || null
      });

      toast.error('Falha no processamento', {
        description: err.message || 'Verifique os dados do cartão e tente novamente.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-[#1e293b] space-y-5">
      {mode === 'subscribe' && planInfo && (
        <div className="bg-gradient-to-r from-sky-50 to-indigo-50 p-4 rounded-2xl border border-sky-100 mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-extrabold uppercase tracking-wider text-sky-800">Plano Selecionado</span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Sparkles size={12} /> 60 Dias Grátis
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <h4 className="text-lg font-black text-slate-900">{planInfo.name}</h4>
            <div className="text-right">
              <span className="text-lg font-black text-sky-600">{planInfo.formattedAmount}</span>
              <span className="text-xs text-slate-500 font-semibold">/{planInfo.billingCycle === 'yearly' ? 'ano' : planInfo.billingCycle === 'semester' ? 'semestre' : 'mês'}</span>
            </div>
          </div>
          <p className="text-xs text-slate-600 mt-2 font-medium flex items-center gap-1">
            <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
            Cobrança de {planInfo.formattedAmount} somente após 60 dias. Cancele quando quiser.
          </p>
        </div>
      )}

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
          Nome Impresso no Cartão
        </label>
        <input
          type="text"
          required
          value={cardHolderName}
          onChange={(e) => setCardHolderName(e.target.value)}
          placeholder="Ex: SILVA A SANTOS"
          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 font-medium text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all shadow-sm"
        />
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
          Dados do Cartão de Crédito
        </label>
        <div className="p-3.5 bg-white border border-slate-200 rounded-xl focus-within:ring-2 focus-within:ring-sky-500 focus-within:border-sky-500 transition-all shadow-sm">
          <CardElement
            onChange={(e) => setCardComplete(e.complete)}
            options={{
              style: {
                base: {
                  fontSize: '15px',
                  color: '#0f172a',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  '::placeholder': {
                    color: '#94a3b8',
                  },
                },
                invalid: {
                  color: '#ef4444',
                },
              },
            }}
          />
        </div>
      </div>

      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex items-center gap-3 text-xs text-slate-600">
        <Lock size={18} className="text-sky-600 shrink-0" />
        <p className="leading-tight font-medium">
          Seus dados são criptografados diretamente pelo <strong>Stripe</strong>. Não armazenamos o número do seu cartão.
        </p>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-all"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={!stripe || !cardComplete || loading}
          className="flex-1 py-3 px-4 bg-sky-600 hover:bg-sky-700 text-white font-black text-sm rounded-xl transition-all shadow-md shadow-sky-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Processando...
            </>
          ) : (
            <>
              <ShieldCheck size={16} />
              {mode === 'subscribe' ? 'Ativar 60 Dias Grátis' : 'Salvar Novo Cartão'}
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export const StripeElementsModal: React.FC<FormProps> = (props) => {
  const [stripeObj, setStripeObj] = useState<any>(null);
  const [loadingStripe, setLoadingStripe] = useState(true);
  const [stripeError, setStripeError] = useState<string | null>(null);

  const initStripe = async () => {
    setLoadingStripe(true);
    setStripeError(null);
    try {
      const config = await getStripeConfig();
      const key = config?.publishableKey || import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';
      if (!key) {
        throw new Error('Chave de integração do Stripe (publishableKey) não encontrada. Verifique as configurações de ambiente.');
      }
      const instance = await loadStripe(key);
      if (!instance) {
        throw new Error('Não foi possível inicializar a biblioteca do Stripe SDK.');
      }
      setStripeObj(instance);
    } catch (err: any) {
      console.error('[StripeElementsModal] Failed to load Stripe:', err);
      setStripeError(err.message || 'Erro ao conectar ao ambiente seguro de pagamento.');
    } finally {
      setLoadingStripe(false);
    }
  };

  useEffect(() => {
    initStripe();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative animate-scale-up">
        <button
          onClick={props.onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center border border-sky-100">
            <CreditCard size={20} />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900">
              {props.mode === 'subscribe' ? 'Pagamento Seguro' : 'Atualizar Cartão'}
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Ambiente protegido com criptografia de ponta a ponta
            </p>
          </div>
        </div>

        {loadingStripe ? (
          <div className="py-12 text-center text-slate-500 font-medium flex flex-col items-center justify-center gap-3">
            <Loader2 size={28} className="animate-spin text-sky-600" />
            <span>Carregando ambiente seguro Stripe...</span>
          </div>
        ) : stripeError ? (
          <div className="py-6 space-y-4">
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-xs font-medium space-y-2">
              <div className="flex items-center gap-2 font-extrabold text-amber-800 text-sm">
                <AlertCircle size={18} className="text-amber-600 shrink-0" />
                <span>Erro ao inicializar o Stripe</span>
              </div>
              <p>{stripeError}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={props.onClose}
                className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-all"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={initStripe}
                className="flex-1 py-3 px-4 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-sky-600/20 flex items-center justify-center gap-2"
              >
                <RefreshCw size={14} />
                Tentar Novamente
              </button>
            </div>
          </div>
        ) : stripeObj ? (
          <Elements stripe={stripeObj}>
            <CardForm {...props} />
          </Elements>
        ) : null}
      </div>
    </div>
  );
};
