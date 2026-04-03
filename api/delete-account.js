import { createClient } from '@supabase/supabase-client';

export default async function handler(req, res) {
  // 1. Segurança: Só aceita o método POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // 2. Inicializa o cliente do Supabase com a Service Role Key (Admin)
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // 3. Pega o token de quem está logado no seu app
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Sessão inválida ou expirada' });
  }

  try {
    // 4. Valida se o token é de um usuário real
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    // 5. O Comando de Ouro: Deleta o usuário da autenticação
    // O SQL 'ON DELETE CASCADE' que você fez cuidará das tabelas 'perfis', etc.
    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);

    if (deleteError) {
      return res.status(400).json({ error: deleteError.message });
    }

    return res.status(200).json({ message: 'Conta excluída com sucesso' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
}
