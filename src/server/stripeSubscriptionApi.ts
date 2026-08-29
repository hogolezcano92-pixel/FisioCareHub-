import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

type PlanKey = 'basic_monthly' | 'pro_monthly' | 'pro_semester' | 'pro_yearly';

const PLAN_PRICES: Record<PlanKey, {
  amountCents: number;
  interval: 'month' | 'year';
  intervalCount: number;
  name: string;
  configuredPrice?: string;
}> = {
  basic_monthly: {
    amountCents: 1999,
    interval: 'month',
    intervalCount: 1,
    name: 'FisioCareHub - Basic Mensal',
    configuredPrice: process.env.STRIPE_PRICE_BASIC_MONTHLY,
  },
  pro_monthly: {
    amountCents: 4999,
    interval: 'month',
    intervalCount: 1,
    name: 'FisioCareHub - PRO Mensal',
    configuredPrice: process.env.STRIPE_PRICE_PRO_MONTHLY,
  },
  pro_semester: {
    amountCents: 26990,
    interval: 'month',
    intervalCount: 6,
    name: 'FisioCareHub - PRO Semestral',
    configuredPrice: process.env.STRIPE_PRICE_PRO_SEMESTER,
  },
  pro_yearly: {
    amountCents: 49990,
    interval: 'year',
    intervalCount: 1,
    name: 'FisioCareHub - PRO Anual',
    configuredPrice: process.env.STRIPE_PRICE_PRO_YEARLY,
  },
};

let stripeInstance: Stripe | null = null;
// Este gateway usa tabelas legadas que ainda não possuem tipos Database gerados.
// Mantemos o client administrativo sem schema genérico para evitar que versões
// recentes do supabase-js infiram inserts/updates como `never`.
let supabaseAdminInstance: any = null;

function getStripe(): Stripe {
  const key = (process.env.STRIPE_SECRET_KEY || '').trim();
  if (!key) throw new Error('STRIPE_SECRET_KEY não configurada na Vercel.');
  if (!stripeInstance) stripeInstance = new Stripe(key);
  return stripeInstance;
}

function normalizeSupabaseUrl(value: string): string {
  const raw = value.trim().replace(/\/+$/, '');
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^[a-z0-9]{20}$/i.test(raw)) return `https://${raw}.supabase.co`;
  if (/^[a-z0-9-]+\.supabase\.co$/i.test(raw)) return `https://${raw}`;
  return raw;
}

function getSupabaseAdmin(): any {
  if (!supabaseAdminInstance) {
    const url = normalizeSupabaseUrl(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '');
    const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
    if (!url) throw new Error('SUPABASE_URL/VITE_SUPABASE_URL não configurada na Vercel.');
    if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurada na Vercel.');
    supabaseAdminInstance = createClient<any>(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return supabaseAdminInstance;
}

function setCors(res: VercelResponse, methods = 'GET,POST,OPTIONS') {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

async function readJsonBody(req: VercelRequest): Promise<any> {
  // Como esta Function também atende o webhook Stripe, o body parser fica
  // desabilitado. Dependendo do runtime da Vercel, req.body pode chegar como
  // objeto, string, Buffer ou Uint8Array. Nunca devemos tentar reler o stream
  // quando o corpo já foi materializado em req.body.
  const body: any = req.body;

  if (body && typeof body === 'object' && !Buffer.isBuffer(body) && !(body instanceof Uint8Array)) {
    return body;
  }

  if (typeof body === 'string') {
    const raw = body.trim();
    if (!raw) return {};
    try { return JSON.parse(raw); } catch { return {}; }
  }

  if (Buffer.isBuffer(body) || body instanceof Uint8Array) {
    const raw = Buffer.from(body).toString('utf8').trim();
    if (!raw) return {};
    try { return JSON.parse(raw); } catch { return {}; }
  }

  // Só lê o stream quando req.body realmente não foi preenchido pelo runtime.
  // O timeout impede a Function de ficar pendurada indefinidamente caso o
  // stream já tenha sido consumido por alguma camada da plataforma.
  const raw = await new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    const request: any = req;
    let finished = false;

    const done = (value: string) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      resolve(value);
    };

    const fail = (error: any) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      reject(error);
    };

    const timer = setTimeout(() => done(''), 3000);

    request.on('data', (chunk: any) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    request.on('end', () => done(Buffer.concat(chunks).toString('utf8')));
    request.on('error', fail);

    // Se o stream já terminou antes de registrarmos os listeners, não espere.
    if (request.readableEnded || request.complete) {
      done('');
    }
  });

  const trimmed = raw.trim();
  if (!trimmed) return {};
  try { return JSON.parse(trimmed); } catch { return {}; }
}

async function requireUser(req: VercelRequest, res: VercelResponse, expectedUserId?: string): Promise<string | null> {
  const authHeader = String(req.headers.authorization || '');
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    res.status(401).json({ error: 'Sessão não autenticada.' });
    return null;
  }

  const { data, error } = await getSupabaseAdmin().auth.getUser(token);
  if (error || !data.user) {
    res.status(401).json({ error: 'Sessão inválida ou expirada.' });
    return null;
  }
  if (expectedUserId && data.user.id !== expectedUserId) {
    res.status(403).json({ error: 'Usuário não autorizado para esta operação.' });
    return null;
  }
  return data.user.id;
}

function isPlanKey(value: unknown): value is PlanKey {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(PLAN_PRICES, value);
}

async function bestEffortProfileUpdate(userId: string, payload: Record<string, any>) {
  const { error } = await getSupabaseAdmin().from('perfis').update(payload).eq('id', userId);
  if (error) console.warn('[Stripe Gateway] Falha ao sincronizar perfil:', error.message);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function normalizeSubscriptionStatus(status: unknown): string {
  const value = String(status || '').toLowerCase();
  if (value === 'active') return 'ativo';
  if (value === 'canceled') return 'cancelado';
  return value || 'free';
}

async function requiredProfileUpdate(userId: string, payload: Record<string, any>) {
  let lastError: any = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { data, error } = await getSupabaseAdmin()
      .from('perfis')
      .update(payload)
      .eq('id', userId)
      .select('id')
      .maybeSingle();
    if (!error && data?.id) return;
    lastError = error;
    if (attempt < 2) await sleep(attempt === 0 ? 150 : 400);
  }
  throw new Error(`Não foi possível liberar o plano no perfil do Supabase: ${lastError?.message || 'perfil não encontrado'}`);
}

async function requiredSubscriptionUpsert(userId: string, payload: Record<string, any>) {
  const supabase = getSupabaseAdmin();
  let lastError: any = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    let existingId: string | null = null;

    // Cada assinatura Stripe deve manter seu próprio registro. Antes, quando um
    // stripe_subscription_id novo ainda não existia, o código reutilizava a
    // linha mais recente do usuário. Isso permitia que webhooks atrasados de
    // uma assinatura antiga sobrescrevessem a assinatura atual.
    if (payload.stripe_subscription_id) {
      const byStripe = await supabase
        .from('assinaturas')
        .select('id')
        .eq('stripe_subscription_id', payload.stripe_subscription_id)
        .limit(1);
      if (byStripe.error) lastError = byStripe.error;
      existingId = byStripe.data?.[0]?.id || null;
    } else {
      // Compatibilidade apenas para registros legados sem ID do Stripe.
      const byUser = await supabase
        .from('assinaturas')
        .select('id')
        .eq('user_id', userId)
        .order('data_inicio', { ascending: false })
        .limit(1);
      if (byUser.error) lastError = byUser.error;
      existingId = byUser.data?.[0]?.id || null;
    }

    const result = existingId
      ? await supabase.from('assinaturas').update(payload).eq('id', existingId)
      : await supabase.from('assinaturas').insert({ user_id: userId, ...payload });

    if (!result.error) return;
    lastError = result.error;
    if (attempt < 2) await sleep(attempt === 0 ? 150 : 400);
  }

  throw new Error(`Não foi possível registrar a assinatura no Supabase: ${lastError?.message || 'erro desconhecido'}`);
}

async function syncStripeSubscriptionAccess(
  userId: string,
  subscription: any,
  fallbackPlanKey: PlanKey,
  customerId: string,
  paymentMethod?: any,
) {
  const planKey = isPlanKey(subscription?.metadata?.plan_key)
    ? subscription.metadata.plan_key
    : fallbackPlanKey;
  const plan = PLAN_PRICES[planKey];
  const planType = subscription?.metadata?.plan === 'basic' || planKey.startsWith('basic') ? 'basic' : 'pro';
  const statusText = normalizeSubscriptionStatus(subscription?.status);
  const isTrial = statusText === 'trialing';
  const trialStart = subscription?.trial_start
    ? new Date(subscription.trial_start * 1000).toISOString()
    : (isTrial ? new Date().toISOString() : null);
  const trialEnd = subscription?.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null;
  const periodEnd = getPeriodEndUnix(subscription);
  const nextBillingDate = periodEnd ? new Date(periodEnd * 1000).toISOString() : trialEnd;
  const now = new Date().toISOString();

  const profilePayload = {
    plan_type: planType,
    plano: planType,
    is_pro: planType === 'pro',
    subscription_status: statusText,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    trial_utilizado: Boolean(subscription?.trial_start || subscription?.trial_end || subscription?.metadata?.trial === 'true'),
    trial_start: trialStart,
    trial_end: trialEnd,
    next_billing_date: nextBillingDate,
    last_stripe_sync: now,
  };

  const subscriptionPayload = {
    plano: planType,
    plan_type: planType,
    plan_key: planKey,
    status: statusText,
    valor: plan.amountCents / 100,
    data_inicio: trialStart || new Date((subscription?.created || Math.floor(Date.now() / 1000)) * 1000).toISOString(),
    data_expiracao: nextBillingDate,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    trial_utilizado: Boolean(subscription?.trial_start || subscription?.trial_end || subscription?.metadata?.trial === 'true'),
    trial_start: trialStart,
    trial_end: trialEnd,
    next_billing_date: nextBillingDate,
    last_stripe_sync: now,
  };

  // Estes dois registros são a autorização do usuário dentro do app. Se um
  // deles falhar, não declaramos a assinatura como concluída silenciosamente.
  await requiredProfileUpdate(userId, profilePayload);
  await requiredSubscriptionUpsert(userId, subscriptionPayload);

  // Dados visuais do cartão são úteis, mas não devem impedir a liberação do
  // plano caso uma instalação antiga ainda não possua alguma coluna opcional.
  const card = paymentMethod?.card;
  if (paymentMethod?.id) {
    await bestEffortProfileUpdate(userId, {
      stripe_payment_method_id: paymentMethod.id,
      card_brand: card?.brand || null,
      card_last4: card?.last4 || null,
      card_exp_month: card?.exp_month || null,
      card_exp_year: card?.exp_year || null,
    });

    const { error } = await getSupabaseAdmin().from('assinaturas').update({
      stripe_payment_method_id: paymentMethod.id,
      card_brand: card?.brand || null,
      card_last4: card?.last4 || null,
      card_exp_month: card?.exp_month || null,
      card_exp_year: card?.exp_year || null,
    }).eq('stripe_subscription_id', subscription.id);
    if (error) console.warn('[Stripe Gateway] Dados opcionais do cartão não foram sincronizados em assinaturas:', error.message);
  }

  return { planKey, planType, statusText, isTrial, trialStart, trialEnd, nextBillingDate };
}

async function getOrCreateStripeCustomer(userId: string, email = '', name = ''): Promise<string> {
  const stripe = getStripe();
  const supabase = getSupabaseAdmin();
  const { data: profile } = await supabase.from('perfis').select('*').eq('id', userId).maybeSingle();

  if (profile?.stripe_customer_id) {
    try {
      const customer = await stripe.customers.retrieve(profile.stripe_customer_id);
      if (!(customer as any).deleted) return profile.stripe_customer_id;
    } catch (error) {
      console.warn('[Stripe Gateway] Customer salvo não pôde ser reutilizado:', error);
    }
  }

  const customerEmail = (email || profile?.email || '').trim();
  if (customerEmail) {
    const existing = await stripe.customers.list({ email: customerEmail, limit: 10 });
    const matching = existing.data.find((c) => c.metadata?.user_id === userId);
    if (matching) {
      await bestEffortProfileUpdate(userId, { stripe_customer_id: matching.id });
      return matching.id;
    }
  }

  const customer = await stripe.customers.create({
    email: customerEmail || undefined,
    name: (name || profile?.nome_completo || '').trim() || undefined,
    metadata: { user_id: userId },
  });
  await bestEffortProfileUpdate(userId, { stripe_customer_id: customer.id });
  return customer.id;
}

async function getOrCreateStripePrice(planKey: PlanKey): Promise<string> {
  const stripe = getStripe();
  const plan = PLAN_PRICES[planKey];
  if (plan.configuredPrice?.startsWith('price_')) return plan.configuredPrice;

  const products = await stripe.products.list({ limit: 100, active: true });
  let product = products.data.find((item) => item.metadata?.plan_key === planKey || item.name === plan.name);
  if (!product) {
    product = await stripe.products.create({ name: plan.name, metadata: { plan_key: planKey } });
  }

  const prices = await stripe.prices.list({ product: product.id, active: true, limit: 100 });
  const existing = prices.data.find((price) =>
    price.unit_amount === plan.amountCents &&
    price.currency === 'brl' &&
    price.recurring?.interval === plan.interval &&
    price.recurring?.interval_count === plan.intervalCount
  );
  if (existing) return existing.id;

  const created = await stripe.prices.create({
    product: product.id,
    currency: 'brl',
    unit_amount: plan.amountCents,
    recurring: { interval: plan.interval, interval_count: plan.intervalCount },
  });
  return created.id;
}

async function hasUsedStripeTrial(customerId: string): Promise<boolean> {
  const subscriptions = await getStripe().subscriptions.list({ customer: customerId, status: 'all', limit: 100 });
  return subscriptions.data.some((sub: any) => Boolean(sub.trial_start || sub.trial_end || sub.metadata?.trial === 'true'));
}

async function findExistingLiveSubscription(customerId: string): Promise<any | null> {
  const subscriptions = await getStripe().subscriptions.list({ customer: customerId, status: 'all', limit: 100 });
  return subscriptions.data.find((sub: any) =>
    ['trialing', 'active', 'past_due', 'incomplete', 'unpaid', 'paused'].includes(sub.status)
  ) || null;
}

async function findExistingAccessSubscription(customerId: string): Promise<any | null> {
  const subscriptions = await getStripe().subscriptions.list({ customer: customerId, status: 'all', limit: 100 });
  return subscriptions.data.find((sub: any) => ['trialing', 'active'].includes(sub.status)) || null;
}

function getPeriodEndUnix(subscription: any): number | null {
  return subscription?.current_period_end || subscription?.items?.data?.[0]?.current_period_end || null;
}

function buildSubscriptionDetails(profile: any, sub: any) {
  const rawStatus = String(sub?.status || profile?.subscription_status || 'free').toLowerCase();
  const trialEnd = sub?.trial_end || profile?.trial_end || null;
  let daysRemaining = 0;
  if (trialEnd) {
    const endMs = new Date(trialEnd).getTime();
    if (!Number.isNaN(endMs) && endMs > Date.now()) daysRemaining = Math.ceil((endMs - Date.now()) / 86_400_000);
  }
  const isTrial = rawStatus === 'trialing' || (daysRemaining > 0 && rawStatus !== 'expirado' && rawStatus !== 'cancelado');
  const planType = String(sub?.plano || sub?.plan_type || profile?.plan_type || profile?.plano || 'free').toLowerCase();
  return {
    plan: planType,
    planKey: sub?.plan_key || `${planType}_monthly`,
    planName: planType === 'pro' ? 'PRO' : planType === 'basic' ? 'Basic' : 'Gratuito',
    status: rawStatus,
    isTrial,
    trialDaysRemaining: daysRemaining,
    trialStart: sub?.trial_start || profile?.trial_start || null,
    trialEnd,
    trialUtilizado: Boolean(profile?.trial_utilizado || sub?.trial_utilizado),
    nextBillingDate: sub?.next_billing_date || profile?.next_billing_date || sub?.data_expiracao || null,
    lastBillingDate: sub?.last_billing_date || profile?.last_billing_date || null,
    amount: Number(sub?.valor ?? (planType === 'pro' ? 49.99 : planType === 'basic' ? 19.99 : 0)),
    cardBrand: sub?.card_brand || profile?.card_brand || null,
    cardLast4: sub?.card_last4 || profile?.card_last4 || null,
    cardExpMonth: sub?.card_exp_month || profile?.card_exp_month || null,
    cardExpYear: sub?.card_exp_year || profile?.card_exp_year || null,
    stripeCustomerId: sub?.stripe_customer_id || profile?.stripe_customer_id || null,
    stripeSubscriptionId: sub?.stripe_subscription_id || profile?.stripe_subscription_id || null,
  };
}

async function createSetupIntent(req: VercelRequest, res: VercelResponse, body: any) {
  const { userId, email, userName } = body || {};
  console.log('[Stripe Gateway] create-setup-intent recebido:', { userId, hasEmail: Boolean(email), hasUserName: Boolean(userName) });
  if (!userId) return res.status(400).json({ error: 'userId obrigatório' });
  if (!await requireUser(req, res, userId)) return;

  console.log('[Stripe Gateway] create-setup-intent: usuário autenticado.');
  const customerId = await getOrCreateStripeCustomer(userId, email || '', userName || '');
  console.log('[Stripe Gateway] create-setup-intent: customer resolvido:', customerId);
  const setupIntent = await getStripe().setupIntents.create({
    customer: customerId,
    usage: 'off_session',
    payment_method_types: ['card'],
    metadata: { user_id: userId, purpose: 'subscription_trial' },
  });
  console.log('[Stripe Gateway] create-setup-intent criado:', setupIntent.id);
  return res.status(200).json({ success: true, clientSecret: setupIntent.client_secret, customerId });
}

async function createSubscription(req: VercelRequest, res: VercelResponse, body: any) {
  let step = 'recebendo_requisicao';
  try {
    const { userId, email, userName, planKey, paymentMethodId } = body || {};
    if (!userId || !paymentMethodId || !isPlanKey(planKey)) {
      return res.status(400).json({ success: false, step: 'validando_parametros', error: 'userId, paymentMethodId e planKey válido são obrigatórios.' });
    }
    if (!await requireUser(req, res, userId)) return;

    const stripe = getStripe();
    step = 'customer';
    const customerId = await getOrCreateStripeCustomer(userId, email || '', userName || '');

    step = 'validando_payment_method';
    const paymentMethod: any = await stripe.paymentMethods.retrieve(paymentMethodId);
    if (paymentMethod.customer && paymentMethod.customer !== customerId) {
      return res.status(400).json({ success: false, step, error: 'Este cartão pertence a outro cliente Stripe.' });
    }
    if (!paymentMethod.customer) await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
    await stripe.customers.update(customerId, { invoice_settings: { default_payment_method: paymentMethodId } });

    step = 'recuperando_assinatura_existente';
    const existingLive = await findExistingLiveSubscription(customerId);
    if (existingLive) {
      if (['trialing', 'active'].includes(existingLive.status)) {
        // Repara automaticamente o cenário em que o Stripe criou a assinatura,
        // mas uma sincronização anterior com o Supabase falhou. Não cria uma
        // segunda assinatura nem reinicia o período de teste.
        await stripe.subscriptions.update(existingLive.id, {
          default_payment_method: paymentMethodId,
        });
        const freshExisting: any = await stripe.subscriptions.retrieve(existingLive.id);
        const synced = await syncStripeSubscriptionAccess(userId, freshExisting, planKey, customerId, paymentMethod);

        return res.status(200).json({
          success: true,
          recovered: true,
          subscriptionId: freshExisting.id,
          status: synced.statusText,
          isTrial: synced.isTrial,
          trialEnd: synced.trialEnd,
          nextBillingDate: synced.nextBillingDate,
          setupIntentClientSecret: null,
          setupIntentStatus: null,
          paymentIntentClientSecret: null,
        });
      }

      return res.status(409).json({
        success: false,
        step,
        error: 'Já existe uma assinatura no Stripe que precisa ser regularizada antes de criar outra.',
        subscriptionId: existingLive.id,
        status: existingLive.status,
      });
    }

    step = 'trial';
    const hasUsedTrial = await hasUsedStripeTrial(customerId);
    const trialDays = hasUsedTrial ? undefined : 60;

    step = 'price';
    const priceId = await getOrCreateStripePrice(planKey);
    const planType = planKey.startsWith('basic') ? 'basic' : 'pro';

    step = 'stripe_subscription';
    const params: any = {
      customer: customerId,
      items: [{ price: priceId }],
      default_payment_method: paymentMethodId,
      collection_method: 'charge_automatically',
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      metadata: {
        user_id: userId,
        plan_key: planKey,
        plan: planType,
        trial: trialDays ? 'true' : 'false',
      },
      expand: ['latest_invoice.confirmation_secret', 'pending_setup_intent'],
    };
    if (trialDays) {
      params.trial_period_days = trialDays;
      params.trial_settings = {
        end_behavior: {
          // Como coletamos o cartão antes de iniciar o trial, normalmente este
          // caso não ocorre. Se o método for removido no Stripe, cancelar é mais
          // seguro do que manter uma assinatura gratuita indefinidamente.
          missing_payment_method: 'cancel',
        },
      };
    }

    const subscription: any = await stripe.subscriptions.create(params);

    step = 'sincronizando_supabase';
    const synced = await syncStripeSubscriptionAccess(userId, subscription, planKey, customerId, paymentMethod);

    const pendingSetup: any = subscription.pending_setup_intent;
    const invoice: any = subscription.latest_invoice;
    const confirmationSecret: any = invoice?.confirmation_secret;
    return res.status(200).json({
      success: true,
      subscriptionId: subscription.id,
      status: synced.statusText,
      isTrial: synced.isTrial,
      trialEnd: synced.trialEnd,
      nextBillingDate: synced.nextBillingDate,
      setupIntentClientSecret: pendingSetup?.client_secret || null,
      setupIntentStatus: pendingSetup?.status || null,
      paymentIntentClientSecret: confirmationSecret?.client_secret || null,
    });
  } catch (error: any) {
    console.error(`[Stripe Gateway] create-subscription falhou em ${step}:`, error);
    return res.status(500).json({ success: false, step, error: error.message || 'Erro ao criar assinatura no Stripe.', stripeError: error.type || error.code || null });
  }
}

async function updatePaymentMethod(req: VercelRequest, res: VercelResponse, body: any) {
  const { userId, paymentMethodId } = body || {};
  if (!userId || !paymentMethodId) return res.status(400).json({ error: 'userId e paymentMethodId são obrigatórios' });
  if (!await requireUser(req, res, userId)) return;

  const stripe = getStripe();
  const supabase = getSupabaseAdmin();
  const { data: profile } = await supabase.from('perfis').select('*').eq('id', userId).maybeSingle();
  const customerId = profile?.stripe_customer_id || await getOrCreateStripeCustomer(userId, profile?.email || '', profile?.nome_completo || '');
  const pm: any = await stripe.paymentMethods.retrieve(paymentMethodId);
  if (!pm.customer) await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
  if (pm.customer && pm.customer !== customerId) return res.status(400).json({ error: 'Cartão vinculado a outro cliente Stripe.' });
  await stripe.customers.update(customerId, { invoice_settings: { default_payment_method: paymentMethodId } });
  if (profile?.stripe_subscription_id) await stripe.subscriptions.update(profile.stripe_subscription_id, { default_payment_method: paymentMethodId });

  const card = pm.card;
  const payload = {
    stripe_payment_method_id: paymentMethodId,
    card_brand: card?.brand || null,
    card_last4: card?.last4 || null,
    card_exp_month: card?.exp_month || null,
    card_exp_year: card?.exp_year || null,
    last_stripe_sync: new Date().toISOString(),
  };
  await bestEffortProfileUpdate(userId, payload);
  const { error } = await supabase.from('assinaturas').update(payload).eq('user_id', userId);
  if (error) console.warn('[Stripe Gateway] assinatura não sincronizada ao atualizar cartão:', error.message);
  return res.status(200).json({ success: true, cardBrand: card?.brand || null, cardLast4: card?.last4 || null });
}

async function changePlan(req: VercelRequest, res: VercelResponse, body: any) {
  const { userId, newPlanKey } = body || {};
  if (!userId || !isPlanKey(newPlanKey)) return res.status(400).json({ error: 'userId e newPlanKey válido são obrigatórios.' });
  if (!await requireUser(req, res, userId)) return;

  const supabase = getSupabaseAdmin();
  const { data: profile } = await supabase.from('perfis').select('*').eq('id', userId).maybeSingle();
  if (!profile?.stripe_subscription_id) return res.status(400).json({ error: 'Assinatura Stripe não encontrada.' });
  const stripe = getStripe();
  const subscription: any = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
  const itemId = subscription.items?.data?.[0]?.id;
  if (!itemId) return res.status(500).json({ error: 'Item da assinatura não encontrado no Stripe.' });

  const priceId = await getOrCreateStripePrice(newPlanKey);
  const planType = newPlanKey.startsWith('basic') ? 'basic' : 'pro';
  await stripe.subscriptions.update(profile.stripe_subscription_id, {
    items: [{ id: itemId, price: priceId }],
    proration_behavior: subscription.status === 'trialing' ? 'none' : 'always_invoice',
    metadata: { ...subscription.metadata, plan_key: newPlanKey, plan: planType },
  });
  await bestEffortProfileUpdate(userId, { plan_type: planType, plano: planType, is_pro: planType === 'pro', last_stripe_sync: new Date().toISOString() });
  const { error } = await supabase.from('assinaturas').update({ plano: planType, valor: PLAN_PRICES[newPlanKey].amountCents / 100 }).eq('user_id', userId);
  if (error) console.warn('[Stripe Gateway] Falha ao atualizar plano no Supabase:', error.message);
  return res.status(200).json({ success: true, newPlanKey, planType });
}

async function cancelSubscription(req: VercelRequest, res: VercelResponse, body: any) {
  const userId = body?.userId;
  if (!userId) return res.status(400).json({ error: 'userId obrigatório' });
  if (!await requireUser(req, res, userId)) return;
  const supabase = getSupabaseAdmin();
  const { data: profile } = await supabase.from('perfis').select('*').eq('id', userId).maybeSingle();
  if (!profile?.stripe_subscription_id) return res.status(400).json({ error: 'Assinatura Stripe não encontrada.' });
  const subscription: any = await getStripe().subscriptions.update(profile.stripe_subscription_id, { cancel_at_period_end: true });
  await bestEffortProfileUpdate(userId, { subscription_status: 'cancelado', last_stripe_sync: new Date().toISOString() });
  const { error } = await supabase.from('assinaturas').update({ status: 'cancelado' }).eq('user_id', userId);
  if (error) console.warn('[Stripe Gateway] Falha ao marcar assinatura cancelada:', error.message);
  return res.status(200).json({ success: true, cancelAtPeriodEnd: subscription.cancel_at_period_end });
}

async function reactivateSubscription(req: VercelRequest, res: VercelResponse, body: any) {
  const userId = body?.userId;
  if (!userId) return res.status(400).json({ error: 'userId obrigatório' });
  if (!await requireUser(req, res, userId)) return;
  const supabase = getSupabaseAdmin();
  const { data: profile } = await supabase.from('perfis').select('*').eq('id', userId).maybeSingle();
  if (!profile?.stripe_subscription_id) return res.status(400).json({ error: 'Assinatura Stripe não encontrada.' });
  const stripe = getStripe();
  let subscription: any = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
  if (!['active', 'trialing'].includes(subscription.status)) return res.status(400).json({ error: 'Esta assinatura já encerrou. Escolha um plano para criar uma nova assinatura.' });
  subscription = await stripe.subscriptions.update(profile.stripe_subscription_id, { cancel_at_period_end: false });
  const periodEnd = getPeriodEndUnix(subscription);
  const nextBillingDate = periodEnd ? new Date(periodEnd * 1000).toISOString() : null;
  const statusText = subscription.status === 'trialing' ? 'trialing' : 'ativo';
  await bestEffortProfileUpdate(userId, { subscription_status: statusText, next_billing_date: nextBillingDate, last_stripe_sync: new Date().toISOString() });
  const { error } = await supabase.from('assinaturas').update({ status: statusText, data_expiracao: nextBillingDate }).eq('user_id', userId);
  if (error) console.warn('[Stripe Gateway] Falha ao reativar no Supabase:', error.message);
  return res.status(200).json({ success: true, status: statusText });
}

async function subscriptionDetails(req: VercelRequest, res: VercelResponse) {
  const rawUserId = req.query.userId;
  const userId = Array.isArray(rawUserId) ? rawUserId[0] : String(rawUserId || '');
  if (!userId) return res.status(400).json({ error: 'userId obrigatório' });
  if (!await requireUser(req, res, userId)) return;
  const supabase = getSupabaseAdmin();
  let { data: profile } = await supabase.from('perfis').select('*').eq('id', userId).maybeSingle();

  // O perfil guarda o stripe_subscription_id atualmente autorizado no app.
  // Quando há histórico de várias assinaturas, preferimos exatamente essa linha
  // em vez de assumir que a maior data_inicio representa o contrato atual.
  let { data: subs } = profile?.stripe_subscription_id
    ? await supabase.from('assinaturas').select('*').eq('stripe_subscription_id', profile.stripe_subscription_id).limit(1)
    : await supabase.from('assinaturas').select('*').eq('user_id', userId).order('data_inicio', { ascending: false }).limit(1);

  let sub = Array.isArray(subs) && subs.length ? subs[0] : null;

  // Auto-reconciliação: se o webhook estiver atrasado, o estado do Stripe é a
  // referência para recuperar uma assinatura trialing/active já existente.
  // Isso também corrige usuários que ficaram presos como Free após uma falha
  // antiga de sincronização com o Supabase.
  const customerId = profile?.stripe_customer_id || sub?.stripe_customer_id || null;
  const stripeSubscriptionId = profile?.stripe_subscription_id || sub?.stripe_subscription_id || null;
  if (customerId || stripeSubscriptionId) {
    try {
      const stripe = getStripe();
      let stripeSub: any = stripeSubscriptionId
        ? await stripe.subscriptions.retrieve(stripeSubscriptionId)
        : null;

      // Se o perfil ficou apontando para uma assinatura antiga/cancelada por um
      // webhook atrasado, procura outra assinatura realmente válida do mesmo
      // customer e a restaura como a assinatura atual.
      if ((!stripeSub || !['trialing', 'active'].includes(stripeSub.status)) && customerId) {
        stripeSub = await findExistingAccessSubscription(customerId);
      }

      if (stripeSub && ['trialing', 'active'].includes(stripeSub.status)) {
        const fallbackPlanKey: PlanKey = isPlanKey(sub?.plan_key)
          ? sub.plan_key
          : (String(profile?.plan_type || profile?.plano || '').toLowerCase() === 'basic' ? 'basic_monthly' : 'pro_monthly');

        await syncStripeSubscriptionAccess(
          userId,
          stripeSub,
          fallbackPlanKey,
          String(stripeSub.customer || customerId),
        );

        const refreshedProfile = await supabase.from('perfis').select('*').eq('id', userId).maybeSingle();
        profile = refreshedProfile.data;
        const refreshedSubs = profile?.stripe_subscription_id
          ? await supabase.from('assinaturas').select('*').eq('stripe_subscription_id', profile.stripe_subscription_id).limit(1)
          : await supabase.from('assinaturas').select('*').eq('user_id', userId).order('data_inicio', { ascending: false }).limit(1);
        subs = refreshedSubs.data;
        sub = Array.isArray(subs) && subs.length ? subs[0] : null;
      }
    } catch (error) {
      console.warn('[Stripe Gateway] Auto-reconciliação da assinatura não concluída:', error);
    }
  }

  return res.status(200).json(buildSubscriptionDetails(profile, sub));
}

export async function handleStripeSubscriptionAction(action: string, req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (action === 'config') {
      if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido' });
      const publishableKey = (process.env.VITE_STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY || '').trim();
      if (!publishableKey) return res.status(500).json({ error: 'VITE_STRIPE_PUBLISHABLE_KEY/STRIPE_PUBLISHABLE_KEY não configurada.' });
      return res.status(200).json({ publishableKey });
    }

    if (action === 'subscription-details') {
      if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido' });
      return await subscriptionDetails(req, res);
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });
    const body = await readJsonBody(req);

    switch (action) {
      case 'create-setup-intent': return await createSetupIntent(req, res, body);
      case 'create-subscription': return await createSubscription(req, res, body);
      case 'update-payment-method': return await updatePaymentMethod(req, res, body);
      case 'change-plan': return await changePlan(req, res, body);
      case 'cancel-subscription': return await cancelSubscription(req, res, body);
      case 'reactivate-subscription': return await reactivateSubscription(req, res, body);
      default: return res.status(404).json({ error: `Ação Stripe desconhecida: ${action}` });
    }
  } catch (error: any) {
    console.error(`[Stripe Gateway] ${action}:`, error);
    return res.status(500).json({ error: error.message || 'Erro interno na integração Stripe.' });
  }
}
