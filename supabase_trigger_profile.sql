-- Trigger to automatically create a profile when a new user signs up in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.perfis (
    id,
    nome_completo,
    email,
    tipo_usuario,
    plano,
    crefito,
    especialidade,
    telefone,
    bio,
    localizacao,
    endereco,
    cep,
    pais,
    genero,
    tipo_servico,
    is_pro,
    status_aprovacao,
    avatar_url
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Usuário'),
    NEW.email,
    CASE 
      WHEN NEW.email = 'hogolezcano92@gmail.com' THEN 'admin'
      ELSE COALESCE(NEW.raw_user_meta_data->>'tipo_usuario', 'paciente') 
    END,
    CASE 
      WHEN NEW.email = 'hogolezcano92@gmail.com' THEN 'admin'
      ELSE COALESCE(NEW.raw_user_meta_data->>'plano', CASE WHEN NEW.raw_user_meta_data->>'tipo_usuario' = 'fisioterapeuta' THEN 'fisioterapeuta' ELSE 'free' END)
    END,
    NEW.raw_user_meta_data->>'crefito',
    NEW.raw_user_meta_data->>'especialidade',
    NEW.raw_user_meta_data->>'telefone',
    NEW.raw_user_meta_data->>'bio',
    NEW.raw_user_meta_data->>'localizacao',
    NEW.raw_user_meta_data->>'endereco',
    NEW.raw_user_meta_data->>'cep',
    NEW.raw_user_meta_data->>'pais',
    NEW.raw_user_meta_data->>'genero',
    NEW.raw_user_meta_data->>'tipo_servico',
    COALESCE((NEW.raw_user_meta_data->>'is_pro')::boolean, false),
    CASE WHEN COALESCE(NEW.raw_user_meta_data->>'tipo_usuario', 'paciente') = 'paciente' THEN 'aprovado' ELSE 'pendente' END,
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', 'https://api.dicebear.com/7.x/avataaars/svg?seed=' || NEW.id::text)
  )
  ON CONFLICT (id) DO UPDATE SET
    nome_completo = EXCLUDED.nome_completo,
    tipo_usuario = EXCLUDED.tipo_usuario,
    plano = EXCLUDED.plano,
    crefito = COALESCE(EXCLUDED.crefito, perfis.crefito),
    especialidade = COALESCE(EXCLUDED.especialidade, perfis.especialidade),
    telefone = COALESCE(EXCLUDED.telefone, perfis.telefone),
    bio = COALESCE(EXCLUDED.bio, perfis.bio),
    localizacao = COALESCE(EXCLUDED.localizacao, perfis.localizacao),
    endereco = COALESCE(EXCLUDED.endereco, perfis.endereco),
    cep = COALESCE(EXCLUDED.cep, perfis.cep),
    pais = COALESCE(EXCLUDED.pais, perfis.pais),
    genero = COALESCE(EXCLUDED.genero, perfis.genero),
    tipo_servico = COALESCE(EXCLUDED.tipo_servico, perfis.tipo_servico),
    is_pro = EXCLUDED.is_pro,
    status_aprovacao = EXCLUDED.status_aprovacao,
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
