-- Separa paciente interno/manual de paciente com conta própria no FisioCareHub.
-- Rode no Supabase SQL Editor antes de usar os novos campos no app.

alter table public.pacientes
add column if not exists perfil_id uuid references public.perfis(id) on delete set null,
add column if not exists email text,
add column if not exists telefone text,
add column if not exists origem text default 'manual',
add column if not exists tipo_paciente text default 'interno';

update public.pacientes
set origem = coalesce(origem, 'manual'),
    tipo_paciente = case
      when perfil_id is null then coalesce(tipo_paciente, 'interno')
      else coalesce(tipo_paciente, 'externo')
    end;

notify pgrst, 'reload schema';
