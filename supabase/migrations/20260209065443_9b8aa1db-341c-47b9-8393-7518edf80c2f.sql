
-- Create user_alerts table for alert configurations
CREATE TABLE public.user_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  conditions JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create alert_notifications table for triggered alerts
CREATE TABLE public.alert_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  alert_id UUID REFERENCES public.user_alerts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  detail TEXT,
  company_id UUID REFERENCES public.companies(id),
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_alerts
CREATE POLICY "Users can view own alerts" ON public.user_alerts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own alerts" ON public.user_alerts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own alerts" ON public.user_alerts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own alerts" ON public.user_alerts FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for alert_notifications
CREATE POLICY "Users can view own notifications" ON public.alert_notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.alert_notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notifications" ON public.alert_notifications FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_alerts_updated_at
BEFORE UPDATE ON public.user_alerts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
