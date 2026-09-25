CREATE TABLE IF NOT EXISTS usage_events (
  id uuid PRIMARY KEY,
  request_id uuid NOT NULL,
  operation text NOT NULL CHECK (operation IN ('answer','summarize','embed','rerank')),
  model_name text NOT NULL,
  provider_name text NOT NULL,
  input_tokens integer,
  output_tokens integer,
  estimated boolean NOT NULL,
  cost_amount numeric,
  currency text,
  duration_ms integer NOT NULL,
  status text NOT NULL,
  error_category text,
  created_at timestamptz NOT NULL DEFAULT now()
);
