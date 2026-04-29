import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const getEnv = (key: string, fallback: string): string => {
  const value = process.env[key];
  if (!value) return fallback;
  const trimmed = value.trim();
  if (trimmed === "undefined" || trimmed === "null" || trimmed === "") return fallback;
  return trimmed;
};

const getSupabaseAdmin = () => {
  const supabaseUrl = getEnv("VITE_SUPABASE_URL", "https://exciqetztunqgxbwwodo.supabase.co");
  const supabaseServiceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY", "");
  return createClient(supabaseUrl, supabaseServiceRoleKey);
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-12-18.acacia" as any,
});

export const config = {
  api: {
    bodyParser: false,
  },
};

const buffer = (req: any) => {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: any[] = [];
    req.on('data', (chunk: any) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return res.status(400).send('Webhook Secret or Signature missing');
  }

  let event: Stripe.Event;

  try {
    const body = await buffer(req);
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const supabase = getSupabaseAdmin();

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    if (session.metadata?.type === 'library_purchase_bulk') {
      const userId = session.metadata.user_id;
      const materialIdsString = session.metadata.material_ids;

      if (userId && materialIdsString) {
        const materialIds = materialIdsString.split(',');
        const purchaseRecords = materialIds.map(id => ({
          patient_id: userId,
          material_id: id,
          purchased_at: new Date().toISOString()
        }));

        await supabase.from('material_purchases').insert(purchaseRecords);
      }
    } else if (session.metadata?.type === 'library_purchase') {
        const userId = session.metadata.user_id;
        const materialId = session.metadata.material_id;
        if (userId && materialId) {
            await supabase.from('material_purchases').insert({
                patient_id: userId,
                material_id: materialId,
                purchased_at: new Date().toISOString()
            });
        }
    }
  }

  res.status(200).json({ received: true });
}
