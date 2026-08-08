-- Add 'maapilim' to public.poi.type CHECK (19 values total).
-- Run in Supabase SQL Editor: first confirm constraint name, then apply DROP/ADD.

-- 1) Discover live CHECK constraint name on public.poi
SELECT c.conname, pg_get_constraintdef(c.oid) AS def
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
JOIN pg_namespace n ON t.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND t.relname = 'poi'
  AND c.contype = 'c';

-- 2) Replace type CHECK (typical name is poi_type_check — use exact conname from step 1 if different)
ALTER TABLE public.poi DROP CONSTRAINT IF EXISTS poi_type_check;

ALTER TABLE public.poi
  ADD CONSTRAINT poi_type_check
  CHECK (
    type IN (
      'khan',
      'guesthouse',
      'water',
      'parking',
      'warning',
      'viewpoint',
      'shopping',
      'cafe',
      'art',
      'cave',
      'diving',
      'beach',
      'historic',
      'picnic',
      'hiking',
      'gas',
      'first_aid',
      'maapilim',
      'other'
    )
  );
