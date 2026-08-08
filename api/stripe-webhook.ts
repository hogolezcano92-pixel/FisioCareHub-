import type { VercelRequest, VercelResponse } from '@vercel/node';
import webhookHandler, { config as webhookConfig } from './webhooks/stripe.js';
import { handleStripeSubscriptionAction } from '../src/server/stripeSubscriptionApi.js';

// Mantém o body bruto para o webhook Stripe e permite que o gateway
// de assinaturas faça o parse manual de JSON quando houver ?action=...
export const config = webhookConfig;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const rawAction = req.query.action;
  const action = Array.isArray(rawAction) ? rawAction[0] : rawAction;

  // Sem action, preserva 100% o comportamento anterior de /api/stripe-webhook.
  if (!action) {
    return webhookHandler(req, res);
  }

  return handleStripeSubscriptionAction(String(action), req, res);
}
