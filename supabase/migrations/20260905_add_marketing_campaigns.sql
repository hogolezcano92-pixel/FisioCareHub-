create table if not exists public.marketing_campaigns (
 id uuid primary key default gen_random_uuid(), title text not null, subject text not null, message text not null, link text,
 send_email boolean not null default true, send_in_app boolean not null default true,
 target_audience text not null default 'fisioterapeutas' check (target_audience in ('todos','fisioterapeutas','pacientes','pro','free')),
 created_by uuid references public.perfis(id), status text not null default 'draft' check (status in ('draft','sending','sent','partial','failed')),
 total_recipients integer not null default 0, sent_count integer not null default 0, failed_count integer not null default 0,
 created_at timestamptz not null default now(), sent_at timestamptz
);
create table if not exists public.marketing_campaign_recipients (
 id uuid primary key default gen_random_uuid(), campaign_id uuid not null references public.marketing_campaigns(id) on delete cascade,
 user_id uuid references public.perfis(id) on delete set null, email text,
 channel text not null check (channel in ('email','in_app')), status text not null default 'pending' check (status in ('pending','sent','failed')),
 error_message text, sent_at timestamptz, created_at timestamptz not null default now()
);
create index if not exists idx_marketing_campaigns_created_at on public.marketing_campaigns(created_at desc);
create index if not exists idx_marketing_campaign_recipients_campaign on public.marketing_campaign_recipients(campaign_id);
alter table public.marketing_campaigns enable row level security;
alter table public.marketing_campaign_recipients enable row level security;
drop policy if exists "Admins can manage marketing campaigns" on public.marketing_campaigns;
create policy "Admins can manage marketing campaigns" on public.marketing_campaigns for all to authenticated
using (exists (select 1 from public.perfis p where p.id=(select auth.uid()) and p.tipo_usuario='admin'))
with check (exists (select 1 from public.perfis p where p.id=(select auth.uid()) and p.tipo_usuario='admin'));
drop policy if exists "Admins can manage marketing recipients" on public.marketing_campaign_recipients;
create policy "Admins can manage marketing recipients" on public.marketing_campaign_recipients for all to authenticated
using (exists (select 1 from public.perfis p where p.id=(select auth.uid()) and p.tipo_usuario='admin'))
with check (exists (select 1 from public.perfis p where p.id=(select auth.uid()) and p.tipo_usuario='admin'));