import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { getStripe, getSupabaseAdmin, getOrCreateStripeCustomer, getOrCreateStripePrice, PLAN_PRICES, setCorsHeaders } from '../_shared/stripeShared';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  try {
    const { userId, email, userName, planKey, paymentMethodId } = req.body || {};
    if (!userId || !paymentMethodId || !planKey) {
      return res.status(400).json({ error: 'Dados incompletos (userId, planKey e paymentMethodId são obrigatórios)' });
    }

    const stripe = getStripe();
    const supabase = getSupabaseAdmin();

    const customerId = await getOrCreateStripeCustomer(userId, email || '', userName);

    await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId }
    });

    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    const card = paymentMethod.card;

    const { data: profile } = await supabase
      .from('perfis')
      .select('trial_utilizado, email, nome_completo')
      .eq('id', userId)
      .maybeSingle();

    const { data: existingSub } = await supabase
      .from('assinaturas')
      .select('trial_utilizado')
      .eq('user_id', userId)
      .maybeSingle();

    const hasUsedTrial = Boolean(profile?.trial_utilizado || existingSub?.trial_utilizado);
    const trialDays = hasUsedTrial ? undefined : 60;

    const priceId = await getOrCreateStripePrice(planKey);
    const planConfig = PLAN_PRICES[planKey] || PLAN_PRICES.pro_monthly;
    const planType = planKey.startsWith('basic') ? 'basic' : 'pro';

    const subParams: Stripe.SubscriptionCreateParams = {
      customer: customerId,
      items: [{ price: priceId }],
      default_payment_method: paymentMethodId,
      trial_period_days: trialDays,
      payment_behavior: 'allow_incomplete',
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        user_id: userId,
        plan_key: planKey,
        plan: planType,
        trial: trialDays ? 'true' : 'false'
      }
    };

    const subscription = await stripe.subscriptions.create(subParams);

    const isTrial = subscription.status === 'trialing';
    const trialStart = subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : (isTrial ? new Date().toISOString() : null);
    const trialEnd = subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null;
    const nextBillingDate = new Date(subscription.current_period_end * 1000).toISOString();

    const statusText = isTrial ? 'trialing' : subscription.status === 'active' ? 'ativo' : subscription.status;

    await supabase.from('perfis').update({
      plan_type: planType,
      plano: planType,
      is_pro: planType === 'pro',
      subscription_status: statusText,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      stripe_payment_method_id: paymentMethodId,
      card_brand: card?.brand || null,
      card_last4: card?.last4 || null,
      card_exp_month: card?.exp_month || null,
      card_exp_year: card?.exp_year || null,
      trial_utilizado: true,
      trial_start: trialStart,
      trial_end: trialEnd,
      next_billing_date: nextBillingDate,
      last_stripe_sync: new Date().toISOString()
    }).eq('id', userId);

    await supabase.from('assinaturas').upsert({
      user_id: userId,
      plano: planType,
      plan_type: planType,
      plan_key: planKey,
      status: statusText,
      valor: planConfig.amountCents / 100,
      data_inicio: new Date().toISOString(),
      data_expiracao: nextBillingDate,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      stripe_payment_method_id: paymentMethodId,
      card_brand: card?.brand || null,
      card_last4: card?.last4 || null,
      card_exp_month: card?.exp_month || null,
      card_exp_year: card?.exp_year || null,
      trial_utilizado: true,
      trial_start: trialStart,
      trial_end: trialEnd,
      next_billing_date: nextBillingDate,
      last_stripe_sync: new Date().toISOString()
    });

    return res.status(200).json({
      success: true,
      subscriptionId: subscription.id,
      status: statusText,
      isTrial,
      trialEnd,
      nextBillingDate
    });
  } catch (err: any) {
    console.error('[Stripe Vercel API] Error creating subscription:', err);
    return res.status(500).json({ error: err.message || 'Erro ao criar assinatura' });
  }
}
