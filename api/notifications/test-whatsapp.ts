import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  // Only allow POST requests
  if (request.method !== 'POST') {
    return response.status(405).json({ 
      success: false, 
      error: 'Method Not Allowed. Use POST.' 
    });
  }

  try {
    // Return the required success JSON
    return response.status(200).json({ 
      success: true, 
      message: "API WhatsApp funcionando" 
    });
  } catch (error: any) {
    return response.status(500).json({ 
      success: false, 
      error: error.message || 'Internal Server Error' 
    });
  }
}
