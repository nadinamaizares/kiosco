-- ============================================================
-- MÓDULO CLIENTES / FIADO
-- Ejecutar en Supabase > SQL Editor
-- ============================================================

-- Tabla de clientes
CREATE TABLE IF NOT EXISTS clientes (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre     text NOT NULL,
  apellido   text NOT NULL,
  dni        text,
  celular    text NOT NULL,
  mail       text,
  created_at timestamptz DEFAULT now(),
  user_id    uuid REFERENCES auth.users(id)
);

-- Tabla de fiados (cabecera de cada compra a crédito)
CREATE TABLE IF NOT EXISTS fiados (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id uuid REFERENCES clientes(id) ON DELETE CASCADE NOT NULL,
  total      numeric(10,2) NOT NULL DEFAULT 0,
  pagado     numeric(10,2) NOT NULL DEFAULT 0,
  estado     text NOT NULL DEFAULT 'pendiente'
             CHECK (estado IN ('pendiente','pagado_parcial','pagado')),
  notas      text,
  user_id    uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Tabla de items de cada fiado
CREATE TABLE IF NOT EXISTS fiado_items (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  fiado_id         uuid REFERENCES fiados(id) ON DELETE CASCADE NOT NULL,
  producto_nombre  text NOT NULL,
  producto_id      uuid REFERENCES productos(id),
  cantidad         integer NOT NULL DEFAULT 1,
  precio_unitario  numeric(10,2) NOT NULL DEFAULT 0,
  subtotal         numeric(10,2) NOT NULL DEFAULT 0
);

-- Row Level Security
ALTER TABLE clientes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiados      ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiado_items ENABLE ROW LEVEL SECURITY;

-- Políticas: usuarios autenticados tienen acceso total
CREATE POLICY "authenticated full access" ON clientes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated full access" ON fiados
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated full access" ON fiado_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
