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
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY') ?? ''
    
    if (!supabaseServiceRoleKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
    }

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
      throw new Error('Invalid token or user not found')
    }

    const body = await req.json().catch(() => ({}))
    const userId = body.userId || user.id

    console.log(`Iniciando exclusão total para o usuário: ${userId} (${user.email})`)

    // 1. Delete related data from other tables
    const tables = [
      'sessoes', // Depends on agendamentos and perfis
      'agendamentos', // Depends on perfis
      'solicitacoes_saque',
      'configuracao_servicos',
      'notificacoes', 
      'triagens', 
      'prontuarios', 
      'mensagens', 
      'documentos_gerados',
      'atendimentos',
      'evolucoes',
      'arquivos_paciente',
      'exercicios_paciente',
      'exercicios',
      'assinaturas',
      'diario_dor',
      'checklist_exercicios',
      'compras_materiais',
      'pacientes',
      'perfis'
    ]
    
    const deletionResults: Record<string, any> = {}
    
    for (const table of tables) {
      try {
        console.log(`Limpando tabela: ${table}`)
        let result;
        
        if (table === 'agendamentos' || table === 'prontuarios' || table === 'sessoes') {
          console.log(`Deletando de ${table} usando vinculação de profissional/paciente`)
          await supabaseAdmin.from(table).delete().eq('paciente_id', userId)
          await supabaseAdmin.from(table).delete().eq('fisioterapeuta_id', userId)
          if (table !== 'sessoes') {
            await supabaseAdmin.from(table).delete().eq('fisio_id', userId)
          }
          deletionResults[table] = { status: 'success' }
        } else if (table === 'solicitacoes_saque' || table === 'notificacoes' || table === 'assinaturas' || table === 'compras_materiais') {
          console.log(`Deletando de ${table} usando vinculação user_id`)
          const result = await supabaseAdmin.from(table).delete().eq('user_id', userId)
          deletionResults[table] = result.error ? { status: 'error', message: result.error.message } : { status: 'success' }
        } else if (table === 'configuracao_servicos') {
          console.log(`Deletando de configuracao_servicos usando vinculação physio_id`)
          const result = await supabaseAdmin.from(table).delete().eq('physio_id', userId)
          deletionResults[table] = result.error ? { status: 'error', message: result.error.message } : { status: 'success' }
        } else if (table === 'mensagens') {
          await supabaseAdmin.from(table).delete().eq('remetente', userId)
          result = await supabaseAdmin.from(table).delete().eq('destinatario', userId)
        } else if (table === 'triagens' || table === 'diario_dor' || table === 'checklist_exercicios') {
          result = await supabaseAdmin.from(table).delete().eq('paciente_id', userId)
        } else if (table === 'documentos_gerados') {
          await supabaseAdmin.from(table).delete().eq('physio_id', userId)
          if (user.email) {
            result = await supabaseAdmin.from(table).delete().or(`patient_email.eq.${user.email},patient_email.eq.${user.email.toLowerCase()}`)
          }
        } else if (table === 'notificacoes' || table === 'assinaturas' || table === 'compras_materiais') {
          result = await supabaseAdmin.from(table).delete().eq('user_id', userId)
        } else if (table === 'pacientes') {
          await supabaseAdmin.from(table).delete().eq('fisioterapeuta_id', userId)
          if (user.email) {
            result = await supabaseAdmin.from(table).delete().or(`email.eq.${user.email},email.eq.${user.email.toLowerCase()}`)
          }
        } else if (table === 'atendimentos') {
          result = await supabaseAdmin.from(table).delete().eq('fisioterapeuta_id', userId)
        } else if (table === 'exercicios') {
          result = await supabaseAdmin.from(table).delete().eq('fisio_id', userId)
        } else if (table === 'perfis') {
          result = await supabaseAdmin.from(table).delete().eq('id', userId)
        } else {
          result = await supabaseAdmin.from(table).delete().eq('paciente_id', userId)
        }
        
        if (result?.error) {
          console.warn(`Erro (não fatal) em ${table}:`, result.error.message)
          deletionResults[table] = { status: 'error', message: result.error.message }
        } else {
          deletionResults[table] = { status: 'success' }
        }
      } catch (e) {
        console.warn(`Exceção em ${table}:`, e.message)
        deletionResults[table] = { status: 'exception', message: e.message }
      }
    }

    // 1.5 Delete from Storage
    const buckets = ['avatars', 'documents']
    for (const bucket of buckets) {
      try {
        if (bucket === 'avatars') {
          const { data: files } = await supabaseAdmin.storage.from(bucket).list('', { search: userId })
          if (files && files.length > 0) {
            await supabaseAdmin.storage.from(bucket).remove(files.map(f => f.name))
          }
        } else {
          const folders = [userId, `fisioterapeutas/${userId}`, `documents/${userId}`]
          for (const folder of folders) {
            const { data: files } = await supabaseAdmin.storage.from(bucket).list(folder)
            if (files && files.length > 0) {
              await supabaseAdmin.storage.from(bucket).remove(files.map(f => `${folder}/${f.name}`))
            }
          }
        }
      } catch (e) {
        console.warn(`Erro storage ${bucket}:`, e.message)
      }
    }

    // 2. Delete from Auth
    console.log(`Excluindo usuário do Auth: ${userId}`)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (deleteError) {
      console.error("Erro fatal ao excluir do Auth:", deleteError.message)
      return new Response(JSON.stringify({ 
        error: `Erro ao excluir conta de autenticação: ${deleteError.message}`,
        details: deletionResults 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    return new Response(JSON.stringify({ 
      message: 'Conta excluída com sucesso',
      details: deletionResults
    }), {
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
