import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  console.log('[Asaas Webhook Serverless]', JSON.stringify(req.body, null, 2));

  return res.status(200).send('OK');
}
