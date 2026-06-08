-- ============================================================================
-- Chengfeng International — fix categories.image paths
--
-- Background: migration 0004 (jpg_to_webp) rewrote product_images.url
-- from .jpg → .webp, but it did NOT touch the categories.image column.
-- The DB still points at .jpg paths that no longer exist on disk, so
-- the homepage category thumbnails render as broken images.
--
-- This migration sets each category's image to a known-good .webp
-- product asset so the homepage thumb works again. The chosen files
-- match the static `categories` constant in src/lib/products.ts.
--
-- Idempotent: only updates rows whose current image is the old .jpg
-- path. Re-running on already-fixed rows is a no-op.
-- ============================================================================

UPDATE public.categories
   SET image = CASE slug
                WHEN 'polos'         THEN '/products/polo-navy.webp'
                WHEN 't-shirts'      THEN '/products/tee-brown.webp'
                WHEN 'striped-tees'  THEN '/products/tee-stripe-grey.webp'
                WHEN 'knitwear'      THEN '/products/sweater-white.webp'
              END
 WHERE image LIKE '%.jpg'
   AND slug IN ('polos', 't-shirts', 'striped-tees', 'knitwear');

-- Sanity check — should return 0 after this runs:
--   SELECT count(*) FROM public.categories WHERE image LIKE '%.jpg';
