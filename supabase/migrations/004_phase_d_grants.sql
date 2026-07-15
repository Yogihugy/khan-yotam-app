-- Phase D — ChaML / admin dashboard grants
GRANT SELECT, UPDATE ON public.distress_calls TO authenticated;
GRANT SELECT ON public.activity_log TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.emergency_protocol TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.poi TO authenticated;
GRANT INSERT, UPDATE ON public.duty_officer TO authenticated;
