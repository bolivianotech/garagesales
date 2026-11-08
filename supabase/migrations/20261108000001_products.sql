-- Fase 2 · Spec 002 (catálogo del vendedor)
-- Requisitos: FR-010, FR-011 (servidor), FR-012, FR-015, NFR-001, FR-004

create type public.product_status as enum ('draft', 'active', 'paused', 'sold_out');

create sequence public.product_sku_seq;

create table public.products (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null references public.stores (id) on delete cascade,
  sku         text not null unique default ('GS-' || lpad(nextval('public.product_sku_seq')::text, 6, '0')),
  title       text not null check (char_length(title) between 2 and 100),
  description text not null default '' check (char_length(description) <= 1000),
  category    text not null default 'otros'
              check (category in ('ropa', 'calzado', 'accesorios', 'electrodomesticos', 'computacion', 'tv_audio', 'otros')),
  condition   text not null default 'used' check (condition in ('new', 'used')),
  size        text not null default '' check (char_length(size) <= 20),
  price_cents integer not null default 0 check (price_cents >= 0 and price_cents <= 100000000),
  stock       integer not null default 1 check (stock >= 0 and stock <= 100000),
  status      public.product_status not null default 'draft',
  hidden      boolean not null default false,   -- moderación del administrador
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index products_store_idx on public.products (store_id, created_at desc);
create index products_public_idx on public.products (status, category, created_at desc) where status = 'active' and not hidden;

create table public.product_images (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  path       text not null unique,
  position   integer not null default 0,
  created_at timestamptz not null default now()
);
create index product_images_product_idx on public.product_images (product_id, position);

-- ---------------------------------------------------------------- reglas
create or replace function public.products_before_write() returns trigger
language plpgsql security definer set search_path = public as $$
declare img_count integer;
begin
  new.updated_at := now();

  if tg_op = 'INSERT' then
    if new.status <> 'draft' then
      raise exception 'Un producto nuevo empieza como borrador.' using errcode = '23514';
    end if;
    if new.hidden and coalesce(current_setting('app.allow_product_hide', true), '') <> 'on' then
      raise exception 'Solo el administrador puede ocultar productos.' using errcode = '42501';
    end if;
  else
    if new.store_id is distinct from old.store_id then
      raise exception 'No se puede cambiar la tienda de un producto.' using errcode = '42501';
    end if;
    if new.hidden is distinct from old.hidden
       and coalesce(current_setting('app.allow_product_hide', true), '') <> 'on' then
      raise exception 'Solo el administrador puede ocultar productos.' using errcode = '42501';
    end if;
  end if;

  -- FR-012: agotado automático / reactivación automática
  if new.status = 'active' and new.stock = 0 then
    new.status := 'sold_out';
  elsif new.status = 'sold_out' and new.stock > 0 then
    new.status := 'active';
  end if;

  -- Publicar exige tienda aprobada, precio > 0 y al menos una foto (FR-010)
  if new.status in ('active', 'sold_out') then
    if new.price_cents <= 0 then
      raise exception 'El precio debe ser mayor a 0 para publicar.' using errcode = '23514';
    end if;
    if tg_op = 'UPDATE' then
      select count(*) into img_count from public.product_images where product_id = new.id;
      if img_count < 1 then
        raise exception 'Agrega al menos una foto para publicar.' using errcode = '23514';
      end if;
    end if;
    if not exists (select 1 from public.stores s where s.id = new.store_id and s.status = 'approved') then
      raise exception 'Tu tienda debe estar aprobada para publicar.' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
create trigger products_write before insert or update on public.products
  for each row execute function public.products_before_write();

create or replace function public.product_images_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare p public.products;
begin
  select * into p from public.products where id = new.product_id;
  if not found then raise exception 'Producto no encontrado.'; end if;
  if split_part(new.path, '/', 1) <> p.store_id::text or split_part(new.path, '/', 2) <> p.id::text then
    raise exception 'La ruta de la foto no corresponde al producto.' using errcode = '23514';
  end if;
  if (select count(*) from public.product_images where product_id = new.product_id) >= 5 then
    raise exception 'Máximo 5 fotos por producto.' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger product_images_write before insert on public.product_images
  for each row execute function public.product_images_before_insert();

-- No dejar un producto publicado sin fotos
create or replace function public.product_images_before_delete() returns trigger
language plpgsql security definer set search_path = public as $$
declare p public.products;
begin
  select * into p from public.products where id = old.product_id;
  if found and p.status in ('active', 'sold_out')
     and (select count(*) from public.product_images where product_id = old.product_id) <= 1 then
    raise exception 'Un producto publicado necesita al menos una foto. Páusalo primero.' using errcode = '23514';
  end if;
  return old;
end $$;
create trigger product_images_delete_guard before delete on public.product_images
  for each row execute function public.product_images_before_delete();

-- Moderación (spec 001 FR-005)
create or replace function public.admin_set_product_hidden(p_product_id uuid, p_hidden boolean, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare old_row jsonb;
begin
  if not public.is_admin() then
    raise exception 'Solo el administrador puede moderar productos.' using errcode = '42501';
  end if;
  perform public.require_mfa_if_enabled();
  select to_jsonb(p) into old_row from public.products p where id = p_product_id;
  if old_row is null then raise exception 'Producto no encontrado.'; end if;
  perform set_config('app.allow_product_hide', 'on', true);
  update public.products set hidden = p_hidden where id = p_product_id;
  perform public.audit_write(case when p_hidden then 'product.hide' else 'product.unhide' end, 'products',
                             p_product_id::text, old_row,
                             (select to_jsonb(p) from public.products p where id = p_product_id), p_reason);
end $$;
grant execute on function public.admin_set_product_hidden(uuid, boolean, text) to authenticated;

-- ---------------------------------------------------------------- RLS
alter table public.products       enable row level security;
alter table public.product_images enable row level security;

create policy products_select on public.products for select using (
  (status = 'active' and not hidden
     and exists (select 1 from public.stores s where s.id = store_id and s.status = 'approved'))
  or exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid())
  or public.is_staff()
);
create policy products_insert on public.products for insert to authenticated with check (
  exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid() and s.status = 'approved')
);
create policy products_update on public.products for update to authenticated
  using (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));
create policy products_delete on public.products for delete to authenticated using (
  status = 'draft' and exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid())
);

create policy product_images_select on public.product_images for select using (
  exists (select 1 from public.products p where p.id = product_id)   -- hereda la visibilidad de products
);
create policy product_images_insert on public.product_images for insert to authenticated with check (
  exists (select 1 from public.products p join public.stores s on s.id = p.store_id
          where p.id = product_id and s.owner_id = auth.uid() and s.status = 'approved')
);
create policy product_images_delete on public.product_images for delete to authenticated using (
  exists (select 1 from public.products p join public.stores s on s.id = p.store_id
          where p.id = product_id and s.owner_id = auth.uid())
);

grant select on public.products, public.product_images to anon;
grant select, insert, update, delete on public.products, public.product_images to authenticated;
grant usage on sequence public.product_sku_seq to authenticated;

-- ---------------------------------------------------------------- Storage (FR-011)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 1048576, array['image/jpeg', 'image/webp', 'image/png'])
on conflict (id) do update set public = excluded.public,
  file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Solo el dueño de una tienda aprobada sube/borra bajo su carpeta {store_id}/...
create policy product_images_upload on storage.objects for insert to authenticated with check (
  bucket_id = 'product-images'
  and (storage.foldername(name))[1] in
      (select s.id::text from public.stores s where s.owner_id = auth.uid() and s.status = 'approved')
);
create policy product_images_remove on storage.objects for delete to authenticated using (
  bucket_id = 'product-images'
  and (storage.foldername(name))[1] in (select s.id::text from public.stores s where s.owner_id = auth.uid())
);
