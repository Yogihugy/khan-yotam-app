-- Phase C — chat + POI grants; seed hardcoded Chan as read-only POI row (optional display source)

GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;
GRANT SELECT ON public.poi TO authenticated;
GRANT SELECT ON public.duty_officer TO authenticated;

-- Ensure Chan Yotam appears in POI list (Phase C read-only display; admin can edit later)
INSERT INTO public.poi (name, description, lat, lng, type)
SELECT 'חאן יותם', 'בית החאן — נקודת עזרה בשביל הים', 32.6905, 34.9433, 'khan'
WHERE NOT EXISTS (
  SELECT 1 FROM public.poi
  WHERE type = 'khan'
    AND abs(lat - 32.6905) < 0.0001
    AND abs(lng - 34.9433) < 0.0001
);
