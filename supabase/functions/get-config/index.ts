import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // NOTA: Certifique-se de que estas variáveis de ambiente estejam configuradas no seu projeto Supabase.
    // Se você salvou as chaves no Supabase Vault, você deve mapeá-las para variáveis de ambiente
    // usando o comando: supabase secrets set NOME_DA_VARIAVEL=valor_do_vault
    const config = {
      firebase: {
        apiKey: Deno.env.get("FIREBASE_API_KEY"),
        authDomain: Deno.env.get("FIREBASE_AUTH_DOMAIN"),
        projectId: Deno.env.get("FIREBASE_PROJECT_ID"),
        storageBucket: Deno.env.get("FIREBASE_STORAGE_BUCKET"),
        messagingSenderId: Deno.env.get("FIREBASE_MESSAGING_SENDER_ID"),
        appId: Deno.env.get("FIREBASE_APP_ID"),
        measurementId: Deno.env.get("FIREBASE_MEASUREMENT_ID"),
        firestoreDatabaseId: Deno.env.get("FIREBASE_DATABASE_ID"),
      },
      stripe: {
        publishableKey: Deno.env.get("STRIPE_PUBLISHABLE_KEY"),
      }
    }

    return new Response(JSON.stringify(config), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
