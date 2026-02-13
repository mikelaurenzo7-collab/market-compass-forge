
-- macro_indicators: stores FRED/Treasury data snapshots
CREATE TABLE public.macro_indicators (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  series_id text NOT NULL,
  label text NOT NULL,
  value numeric NOT NULL,
  unit text NOT NULL DEFAULT 'percent',
  observation_date date NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(series_id, observation_date)
);

ALTER TABLE public.macro_indicators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Macro indicators are publicly readable"
  ON public.macro_indicators FOR SELECT USING (true);

-- alpha_signals: AI-generated sector inferences
CREATE TABLE public.alpha_signals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sector text NOT NULL,
  signal_type text NOT NULL DEFAULT 'valuation_outlook',
  direction text NOT NULL DEFAULT 'neutral',
  magnitude_pct numeric DEFAULT 0,
  confidence text NOT NULL DEFAULT 'medium',
  reasoning text,
  macro_context jsonb DEFAULT '{}'::jsonb,
  generated_at timestamptz NOT NULL DEFAULT now(),
  model_used text DEFAULT 'google/gemini-3-flash-preview'
);

ALTER TABLE public.alpha_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Alpha signals are publicly readable"
  ON public.alpha_signals FOR SELECT USING (true);

-- Index for fast lookups
CREATE INDEX idx_alpha_signals_sector_generated ON public.alpha_signals (sector, generated_at DESC);
CREATE INDEX idx_macro_indicators_series ON public.macro_indicators (series_id, observation_date DESC);
