CREATE TABLE IF NOT EXISTS release_documents (
  id SERIAL PRIMARY KEY,
  organization_id UUID NOT NULL,
  release_id INTEGER NOT NULL,
  storage_key TEXT NOT NULL,
  file_name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT,
  file_size BIGINT,
  category TEXT NOT NULL DEFAULT 'Other',
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS release_documents_release_idx ON release_documents (organization_id, release_id, created_at DESC);

CREATE TABLE IF NOT EXISTS release_financial_entries (
  id SERIAL PRIMARY KEY,
  organization_id UUID NOT NULL,
  release_id INTEGER NOT NULL,
  entry_type TEXT NOT NULL DEFAULT 'Expense',
  description TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ZAR',
  entry_date DATE,
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS release_financial_entries_release_idx ON release_financial_entries (organization_id, release_id, entry_date DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS release_media_links (
  id SERIAL PRIMARY KEY,
  organization_id UUID NOT NULL,
  release_id INTEGER NOT NULL UNIQUE,
  provider TEXT NOT NULL DEFAULT 'Other',
  label TEXT,
  url TEXT NOT NULL,
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS release_media_links_org_idx ON release_media_links (organization_id, release_id);

CREATE TABLE IF NOT EXISTS release_artist_roles (
  id SERIAL PRIMARY KEY,
  organization_id UUID NOT NULL,
  release_id INTEGER NOT NULL,
  artist_id INTEGER NOT NULL,
  role TEXT NOT NULL DEFAULT 'Main Artist',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, release_id, artist_id)
);
CREATE INDEX IF NOT EXISTS release_artist_roles_release_idx ON release_artist_roles (organization_id, release_id);

CREATE TABLE IF NOT EXISTS release_contract_links (
  id SERIAL PRIMARY KEY,
  organization_id UUID NOT NULL,
  release_id INTEGER NOT NULL UNIQUE,
  contract_id INTEGER NOT NULL,
  signed_at DATE,
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS release_contract_links_org_idx ON release_contract_links (organization_id, release_id);
