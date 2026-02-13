
-- Enable realtime for key tables (activity_events already enabled)
ALTER PUBLICATION supabase_realtime ADD TABLE public.intelligence_signals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.distressed_assets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.global_opportunities;
ALTER PUBLICATION supabase_realtime ADD TABLE public.deal_pipeline;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alert_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.portfolio_positions;
