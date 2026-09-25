CREATE TABLE IF NOT EXISTS knowledge_sources (
  id uuid PRIMARY KEY,
  original_name text NOT NULL,
  storage_key text,
  mime_type text NOT NULL,
  byte_size integer NOT NULL,
  sha256 text NOT NULL,
  status text NOT NULL CHECK (status IN ('processing','ready','failed','replacing')),
  active_version integer NOT NULL DEFAULT 0,
  error_category text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
