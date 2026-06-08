-- ============================================================================
-- Chengfeng International — image-format migration (JPG → WebP)
--
-- Run this in the Supabase dashboard:
--   SQL Editor → New query → paste → Run
--
-- Background: scripts/convert-products-to-webp.mjs converted the local
-- /public/products/*.jpg files to .webp (92.5% smaller on disk: 33.5MB
-- → 2.5MB). The product_images table still references the old .jpg
-- paths; this migration rewrites them in place.
--
-- Idempotent: only matches rows ending in .jpg. Safe to re-run.
-- ============================================================================

UPDATE public.product_images
   SET url = REPLACE(url, '.jpg', '.webp')
 WHERE url LIKE '%.jpg';

-- Sanity check — should return 0:
--   SELECT count(*) FROM public.product_images WHERE url LIKE '%.jpg';
