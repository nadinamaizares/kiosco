-- ============================================================
-- Kiosko — Setup de base de datos en Supabase
-- Ejecutá esto en el SQL Editor de tu proyecto de Supabase
-- ============================================================

-- 1. Tabla de productos (catálogo)
create table if not exists productos (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz default now(),
  codigo_barras   text unique,
  nombre          text not null,
  marca           text,
  categoria       text,
  especificacion  text,
  precio_costo    numeric(12,2),
  precio_venta    numeric(12,2),
  stock_actual    integer default 0,
  stock_minimo    integer default 5,
  proveedor       text
);

-- 2. Tabla de movimientos
create table if not exists movimientos (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz default now(),
  tipo            text not null check (tipo in ('entrada', 'salida', 'salida_kit')),
  producto_id     uuid references productos(id) on delete set null,
  cantidad        integer not null,
  precio_unitario numeric(12,2),
  usuario_id      uuid references auth.users(id) on delete set null,
  notas           text
);

-- 3. Kits / combos (opcional, para ventas agrupadas)
create table if not exists kits (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  descripcion text
);

create table if not exists kit_items (
  id          uuid primary key default gen_random_uuid(),
  kit_id      uuid references kits(id) on delete cascade,
  producto_id uuid references productos(id) on delete cascade,
  cantidad    integer default 1
);

-- 4. Función para actualizar stock de forma atómica
create or replace function actualizar_stock(p_producto_id uuid, p_delta integer)
returns void
language plpgsql
security definer
as $$
begin
  update productos
  set stock_actual = stock_actual + p_delta
  where id = p_producto_id;

  if not found then
    raise exception 'Producto no encontrado: %', p_producto_id;
  end if;
end;
$$;

-- 5. Row Level Security (solo usuarios autenticados)
alter table productos   enable row level security;
alter table movimientos enable row level security;
alter table kits        enable row level security;
alter table kit_items   enable row level security;

-- Políticas: cualquier usuario autenticado puede leer y escribir
create policy "auth_all_productos"   on productos   for all using (auth.role() = 'authenticated');
create policy "auth_all_movimientos" on movimientos  for all using (auth.role() = 'authenticated');
create policy "auth_all_kits"        on kits         for all using (auth.role() = 'authenticated');
create policy "auth_all_kit_items"   on kit_items    for all using (auth.role() = 'authenticated');

-- 6. Datos de ejemplo para arrancar
insert into productos (nombre, marca, categoria, especificacion, precio_costo, precio_venta, stock_actual, stock_minimo) values
  ('Coca-Cola 500ml',          'Coca-Cola',  'bebidas',     '500ml, botella',              800,  1400, 48, 12),
  ('Sprite 500ml',             'Sprite',     'bebidas',     '500ml, botella',              780,  1300, 30, 12),
  ('Agua Mineral 500ml',       'Villavicencio','bebidas',   '500ml, sin gas',              400,   800, 36, 12),
  ('Alfajor Oreo',             'Oreo',       'snacks',      'Triple, chocolate',           550,   950, 40,  8),
  ('Galletitas Terrabusi 150g','Terrabusi',  'snacks',      'Surtidas, 150g',             1100,  1800, 25,  6),
  ('Leche La Serenísima 1L',   'La Serenísima','lacteos',   'Entera, 1 litro',            1600,  2400, 18,  6),
  ('Yogur Ser 200g',           'Ser',        'lacteos',     'Natural, 200g',               750,  1200, 20,  5),
  ('Arroz Gallo Oro 1kg',      'Gallo',      'almacen',     'Largo fino, 1kg',            1800,  2800, 15,  4),
  ('Marlboro 20un',            'Marlboro',   'cigarrillos', 'Rojo, 20 cigarrillos',       3200,  4500, 30,  5),
  ('Shampoo Sedal 200ml',      'Sedal',      'higiene',     'Pelo normal, 200ml',         2400,  3800,  8,  3),
  ('Jabón Dove 100g',          'Dove',       'higiene',     'Original, 100g',             1200,  1900, 12,  3),
  ('Lavandina Ayudín 1L',      'Ayudín',     'limpieza',    'Concentrada, 1 litro',       1000,  1800,  6,  3)
on conflict do nothing;
