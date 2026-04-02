import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Get the user's JWT from the request headers
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)

    if (userError || !user) {
      throw new Error('Invalid token')
    }

    const { userId } = await req.json()

    // Security check: A user can only delete themselves
    // (Unless we add admin logic later)
    if (user.id !== userId) {
      throw new Error('Unauthorized: You can only delete your own account')
    }

    console.log(`Deleting user: ${userId}`)

    // 1. Delete related data from other tables (if they exist)
    // We do this manually to avoid foreign key constraint errors if CASCADE is not set
    const tables = [
      'agendamentos', 
      'notificacoes', 
      'triagens', 
      'prontuarios', 
      'mensagens', 
      'documentos_gerados', 
      'perfis'
    ]
    
    for (const table of tables) {
      try {
        if (table === 'agendamentos' || table === 'prontuarios' || table === 'mensagens') {
          // For chat messages, we check both sender and receiver
          if (table === 'mensagens') {
            await supabaseAdmin.from(table).delete().eq('remetente_id', userId)
            await supabaseAdmin.from(table).delete().eq('destinatario_id', userId)
          } else {
            await supabaseAdmin.from(table).delete().eq('paciente_id', userId)
            await supabaseAdmin.from(table).delete().eq('fisio_id', userId)
          }
        } else if (table === 'triagens') {
          await supabaseAdmin.from(table).delete().eq('paciente_id', userId)
        } else if (table === 'documentos_gerados') {
          await supabaseAdmin.from(table).delete().eq('physio_id', userId)
          if (user.email) {
            await supabaseAdmin.from(table).delete().eq('patient_email', user.email.toLowerCase())
          }
        } else if (table === 'notificacoes') {
          await supabaseAdmin.from(table).delete().eq('user_id', userId)
        } else if (table === 'perfis') {
          await supabaseAdmin.from(table).delete().eq('id', userId)
        } else {
          await supabaseAdmin.from(table).delete().eq('id', userId)
        }
      } catch (e) {
        console.warn(`Could not delete from ${table}:`, e.message)
      }
    }

    // 2. Delete from Auth
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (deleteError) {
      throw deleteError
    }

    return new Response(JSON.stringify({ message: 'User deleted successfully' }), {
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
