-- Tabelas para AgitaPay (Supabase)

-- 1. Usuarios (autenticação)
CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  nome TEXT NOT NULL,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Clientes
CREATE TABLE clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cpf TEXT UNIQUE NOT NULL,
  rg TEXT,
  telefone TEXT NOT NULL,
  email TEXT,
  endereco TEXT,
  documento TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Contratos
CREATE TABLE contratos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
  valor_total NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Parcelas
CREATE TABLE parcelas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id UUID REFERENCES contratos(id) ON DELETE CASCADE,
  numero INTEGER NOT NULL,
  valor NUMERIC(12,2) NOT NULL,
  data_vencimento DATE NOT NULL,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'atrasado')),
  valor_atualizado NUMERIC(12,2),
  valor_pago NUMERIC(12,2),
  data_pagamento TIMESTAMPTZ,
  dias_atraso INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Audit Logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES usuarios(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_clientes_cpf ON clientes(cpf);
CREATE INDEX idx_contratos_cliente_id ON contratos(cliente_id);
CREATE INDEX idx_parcelas_contrato_id ON parcelas(contrato_id);
CREATE INDEX idx_parcelas_status ON parcelas(status);
CREATE INDEX idx_parcelas_vencimento ON parcelas(data_vencimento);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Habilitar Row Level Security (RLS) - opcional para produção
-- ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE contratos ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE parcelas ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Supabase Storage: Bucket para documentos
-- Execute no SQL Editor do Supabase Dashboard
-- ============================================

-- Criar bucket para documentos de clientes
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documentos-clientes',
  'documentos-clientes',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Política para permitir uploads (anon/public)
CREATE POLICY "Allow anon uploads" ON storage.objects
  FOR INSERT TO anon, authenticated, public
  WITH CHECK (bucket_id = 'documentos-clientes');

-- Política para leitura pública
CREATE POLICY "Allow public read" ON storage.objects
  FOR SELECT TO anon, authenticated, public
  USING (bucket_id = 'documentos-clientes');

-- Política para deletar (anon/public)
CREATE POLICY "Allow anon deletes" ON storage.objects
  FOR DELETE TO anon, authenticated, public
  USING (bucket_id = 'documentos-clientes');

-- Política para update (anon/public)
CREATE POLICY "Allow anon updates" ON storage.objects
  FOR UPDATE TO anon, authenticated, public
  USING (bucket_id = 'documentos-clientes');