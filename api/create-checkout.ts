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
  
  if (!supabaseServiceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY missing");
  }
  return createClient(supabaseUrl, supabaseServiceRoleKey);
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-12-18.acacia" as any,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { user_id, email, material_ids } = req.body;

    if (!user_id || !material_ids || !Array.isArray(material_ids) || material_ids.length === 0) {
      return res.status(400).json({ error: "Missing user_id or material_ids" });
    }

    const { data: materials, error } = await getSupabaseAdmin()
      .from('library_materials')
      .select('*')
      .in('id', material_ids);

    if (error || !materials || materials.length === 0) {
      return res.status(404).json({ error: "Materials not found" });
    }

    const lineItems = materials.map(material => ({
      price_data: {
        currency: 'brl',
        product_data: {
          name: material.title,
          description: material.topic || material.description,
        },
        unit_amount: material.price_cents || Math.round(material.price * 100),
      },
      quantity: 1,
    }));

    const appUrl = process.env.APP_URL || process.env.VITE_APP_URL || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'pix'],
      line_items: lineItems,
      mode: 'payment',
      customer_email: email,
      success_url: `${appUrl}/library?success=true`,
      cancel_url: `${appUrl}/library?canceled=true`,
      metadata: {
        user_id,
        material_ids: material_ids.join(','),
        type: 'library_purchase_bulk',
      },
    });

    res.status(200).json({ url: session.url });
  } catch (err: any) {
    console.error("[Library Checkout API Error]:", err);
    res.status(500).json({ error: err.message });
  }
}
