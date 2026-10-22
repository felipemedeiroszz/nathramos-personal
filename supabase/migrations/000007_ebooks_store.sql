-- ============================================================================
-- Nath Ramos Personal Trainer — Migration 000007
-- Objetivo: Loja de e-books
--   - ebooks: URL de acesso direto + preço/moeda (para venda avulsa)
--   - ebook_purchases: registra a compra avulsa de um e-book por aluno
-- Permite ao admin cadastrar a URL do e-book (acesso direto) e, quando não for
-- gratuito, o valor — pago pelo cliente via Stripe (cartão) ou ASAAS (PIX).
-- Como usar: Copie 100% deste conteúdo no Supabase > SQL Editor > RUN
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Novas colunas em ebooks
-- ----------------------------------------------------------------------------
alter table public.ebooks add column if not exists external_url text;

alter table public.ebooks
  add column if not exists price_cents int not null default 0
  check (price_cents >= 0);

alter table public.ebooks
  add column if not exists currency currency_t not null default 'BRL';

-- ----------------------------------------------------------------------------
-- 2. Compras avulsas de e-books
-- ----------------------------------------------------------------------------
create table if not exists public.ebook_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id  uuid not null references public.profiles (id) on delete cascade,
  ebook_id uuid not null references public.ebooks (id) on delete cascade,

  provider        payment_provider_t not null default 'stripe',
  status          payment_status_t   not null default 'pending',
  amount_cents    int                not null default 0 check (amount_cents >= 0),
  currency        currency_t         not null default 'BRL',

  external_id       text,
  external_event_id text,

  pix_qr_code    text,
  pix_copy_paste text,
  pix_expires_at timestamptz,

  paid_at     timestamptz,
  failed_at   timestamptz,
  refunded_at timestamptz,

  metadata   jsonb       not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (user_id, ebook_id)
);

create index if not exists ebook_purchases_user_idx  on public.ebook_purchases (user_id, created_at desc);
create index if not exists ebook_purchases_ebook_idx on public.ebook_purchases (ebook_id);
create index if not exists ebook_purchases_status_idx on public.ebook_purchases (status);

drop trigger if exists ebook_purchases_updated_at on public.ebook_purchases;
create trigger ebook_purchases_updated_at before update on public.ebook_purchases
  for each row execute procedure public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 3. RLS — cada aluno vê apenas as suas compras
-- ----------------------------------------------------------------------------
alter table public.ebook_purchases enable row level security;

drop policy if exists ebook_purchases_self on public.ebook_purchases;
create policy ebook_purchases_self on public.ebook_purchases for all
  using (public.is_admin() or (auth.uid() is not null and user_id = auth.uid()))
  with check (public.is_admin() or (auth.uid() is not null and user_id = auth.uid()));

-- ----------------------------------------------------------------------------
-- 4. Leitura de e-books: gratuito, comprado ou incluído no plano
-- ----------------------------------------------------------------------------
drop policy if exists ebooks_read on public.ebooks;
create policy ebooks_read on public.ebooks for select using (
  public.is_admin()
  or (
    is_published = true
    and not is_deleted
    and (
      is_free = true
      or exists (
        select 1 from public.ebook_purchases ep
        where ep.ebook_id = ebooks.id
          and ep.user_id = auth.uid()
          and ep.status = 'paid'
      )
      or (
        min_plan_id is not null
        and exists (
          select 1
          from public.subscriptions s
          join public.plans p on p.id = s.plan_id
          where s.user_id = auth.uid()
            and s.status in ('active','trialing','past_due')
            and (
              select p2.order_index from public.plans p2 where p2.id = ebooks.min_plan_id
            ) <= p.order_index
        )
      )
    )
  )
);
