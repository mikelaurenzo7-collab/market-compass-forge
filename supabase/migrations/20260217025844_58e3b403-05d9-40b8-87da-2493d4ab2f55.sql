
-- Integration settings per user (Slack channel, email forwarding, CRM config)
CREATE TABLE public.integration_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  integration_type text NOT NULL, -- 'slack', 'email', 'crm_salesforce', 'crm_affinity'
  config jsonb NOT NULL DEFAULT '{}',
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, integration_type)
);

ALTER TABLE public.integration_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own integration settings"
  ON public.integration_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Slack notification log for audit trail
CREATE TABLE public.slack_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  channel text NOT NULL,
  message_type text NOT NULL, -- 'deal_stage_change', 'alert_triggered', 'intelligence_summary', 'portfolio_update'
  payload jsonb NOT NULL DEFAULT '{}',
  slack_ts text, -- Slack message timestamp for threading
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.slack_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own slack notifications"
  ON public.slack_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert slack notifications"
  ON public.slack_notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Email inbound log for tracking parsed emails
CREATE TABLE public.email_inbound_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  from_email text NOT NULL,
  subject text,
  parsed_company text,
  parsed_contacts jsonb DEFAULT '[]',
  action_taken text, -- 'company_created', 'deal_created', 'contact_added', 'ignored'
  entity_id uuid, -- reference to created entity
  raw_snippet text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_inbound_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own email logs"
  ON public.email_inbound_log FOR SELECT
  USING (auth.uid() = user_id);

-- Enable realtime for live notification updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.slack_notifications;
