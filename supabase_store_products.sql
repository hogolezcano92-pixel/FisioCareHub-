-- Loja FisioCareHub: produtos afiliados/recomendados
-- Rode este SQL no Supabase quando quiser cadastrar produtos reais com links da Shopee.

create table if not exists public.store_products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subtitle text,
  description text not null,
  category text not null default 'Fortalecimento',
  clinical_indication text,
  recommended_for text[] default '{}',
  price_label text,
  image_url text,
  affiliate_url text,
  badge text,
  is_featured boolean default false,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.store_products enable row level security;

-- Todos os usuários autenticados podem visualizar produtos ativos.
drop policy if exists "Usuários autenticados podem ver produtos ativos" on public.store_products;
create policy "Usuários autenticados podem ver produtos ativos"
on public.store_products
for select
to authenticated
using (is_active = true);

-- Admin pode gerenciar tudo, usando a coluna role/tipo_usuario da tabela perfis.
drop policy if exists "Admins podem gerenciar produtos da loja" on public.store_products;
create policy "Admins podem gerenciar produtos da loja"
on public.store_products
for all
to authenticated
using (
  exists (
    select 1
    from public.perfis p
    where p.id = auth.uid()
      and (p.role = 'admin' or p.tipo_usuario = 'admin')
  )
)
with check (
  exists (
    select 1
    from public.perfis p
    where p.id = auth.uid()
      and (p.role = 'admin' or p.tipo_usuario = 'admin')
  )
);

create index if not exists idx_store_products_active_featured
on public.store_products (is_active, is_featured, created_at desc);

-- Produtos exemplo. Troque affiliate_url pelos seus links da Shopee após se afiliar.
insert into public.store_products
(name, subtitle, description, category, clinical_indication, recommended_for, price_label, image_url, affiliate_url, badge, is_featured, is_active)
values
('Kit Mini Bands', 'Faixas circulares para quadril, joelho e glúteos', 'Produto versátil para fortalecimento de glúteo médio, controle de valgo dinâmico e progressão de exercícios de quadril e joelho.', 'Fortalecimento', 'Quadril, joelho, dor femoropatelar e reabilitação funcional.', array['Abdução de quadril','Clamshell','Ponte com abdução'], 'Ver na Shopee', 'https://images.unsplash.com/photo-1599058917212-d750089bc07e?auto=format&fit=crop&q=80&w=900', null, 'Mais usado', true, true),
('Faixa Elástica Terapêutica', 'Resistência progressiva para membros superiores e inferiores', 'Indicada para fortalecimento gradual, exercícios de ombro, joelho, tornozelo e treino domiciliar com baixa sobrecarga articular.', 'Fortalecimento', 'Ombro, manguito rotador, quadríceps, tornozelo e reabilitação domiciliar.', array['Rotação externa de ombro','Extensão terminal de joelho','Eversão de tornozelo'], 'Ver na Shopee', 'https://images.unsplash.com/photo-1591291621164-2c6367723315?auto=format&fit=crop&q=80&w=900', null, 'Essencial', true, true),
('Disco de Equilíbrio', 'Treino proprioceptivo e controle postural', 'Ajuda na progressão de exercícios de equilíbrio, propriocepção de tornozelo e prevenção de novas entorses, sempre com orientação profissional.', 'Equilíbrio', 'Entorse de tornozelo, instabilidade, idosos e treino proprioceptivo.', array['Apoio unipodal','Transferência de peso','Treino de equilíbrio'], 'Ver na Shopee', 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&q=80&w=900', null, 'Propriocepção', true, true),
('Rolo de Liberação Miofascial', 'Apoio para mobilidade e relaxamento muscular', 'Pode ser usado como recurso auxiliar em protocolos de mobilidade, recuperação muscular e autocuidado, conforme indicação do fisioterapeuta.', 'Mobilidade', 'Rigidez muscular, mobilidade, recovery e exercícios complementares.', array['Mobilidade de quadril','Panturrilha','Cadeia posterior'], 'Ver na Shopee', 'https://images.unsplash.com/photo-1576678927484-cc907957088c?auto=format&fit=crop&q=80&w=900', null, 'Recovery', false, true),
('Colchonete para Exercícios', 'Base confortável para treinos no solo', 'Ideal para exercícios de coluna, quadril, alongamentos e protocolos domiciliares que exigem segurança e conforto no solo.', 'Conforto', 'Lombalgia, exercícios no solo, alongamentos e treino domiciliar.', array['Ponte glútea','Bird dog','Dead bug','Alongamentos'], 'Ver na Shopee', 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?auto=format&fit=crop&q=80&w=900', null, 'Domiciliar', false, true)
on conflict do nothing;
