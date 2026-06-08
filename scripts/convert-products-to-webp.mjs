#!/usr/bin/env node
/**
 * One-shot: convert /public/products/*.jpg to .webp alongside the
 * originals, then delete the originals.
 *
 * Why: the JPGs were 1-10MB each (34MB total). The Next.js image
 * optimizer converts them at request time, but the SOURCE bundle
 * (what gets committed + deployed) stays fat. WebP at q=82 is
 * visually indistinguishable from JPG q=85 in nearly all cases
 * and is 25-35% smaller. We keep a fallback chain in <Image>
 * (AVIF → WebP) so old browsers still see JPG-equivalent quality
 * from the optimizer.
 *
 * Run once:
 *   node scripts/convert-products-to-webp.mjs
 *
 * Idempotent: skips files that already have a sibling .webp.
 *
 * Database note: src/lib/product-data.ts and src/storage/database/seed.ts
 * reference the .jpg paths. After running this script, also run:
 *   UPDATE public.product_images SET url = REPLACE(url, '.jpg', '.webp')
 *     WHERE url LIKE '%.jpg';
 * ...against the Supabase database to point existing rows at the
 * new files.
 */
import { readdir, stat, unlink } from 'node:fs/promises';
import { join, parse } from 'node:path';
import sharp from 'sharp';

const SRC_DIR = 'public/products';
const QUALITY = 82; // WebP quality 80-85 = sweet spot
const EFFORT = 5; // 0 (fastest) to 6 (slowest, smallest file)

async function main() {
  const files = await readdir(SRC_DIR);
  const jpgs = files.filter((f) => /\.jpe?g$/i.test(f));
  if (jpgs.length === 0) {
    console.log('No .jpg files found in', SRC_DIR);
    return;
  }

  console.log(`Found ${jpgs.length} JPG(s) in ${SRC_DIR}\n`);

  let totalIn = 0;
  let totalOut = 0;
  let converted = 0;
  let skipped = 0;

  for (const name of jpgs) {
    const src = join(SRC_DIR, name);
    const { name: base } = parse(name);
    const dest = join(SRC_DIR, `${base}.webp`);

    // Idempotent: skip if webp already exists with a reasonable size.
    try {
      const [srcStat, destStat] = await Promise.all([stat(src), stat(dest)]);
      if (destStat.size > 0) {
        console.log(`  skip  ${name}  (webp already exists, ${(destStat.size / 1024).toFixed(1)}KB)`);
        totalIn += srcStat.size;
        totalOut += destStat.size;
        skipped++;
        continue;
      }
    } catch {
      // src missing or dest missing — proceed to convert
    }

    const before = (await stat(src)).size;
    try {
      const buf = await sharp(src, { failOn: 'none' })
        .webp({ quality: QUALITY, effort: EFFORT })
        .toBuffer();
      const { writeFile } = await import('node:fs/promises');
      await writeFile(dest, buf);
      const after = buf.length;
      const ratio = ((1 - after / before) * 100).toFixed(1);
      console.log(`  ok    ${name}  ${(before / 1024).toFixed(1)}KB → ${(after / 1024).toFixed(1)}KB  (${ratio}% smaller)`);
      totalIn += before;
      totalOut += after;
      converted++;
    } catch (e) {
      console.error(`  FAIL  ${name}:`, e instanceof Error ? e.message : e);
    }
  }

  console.log('');
  console.log(`Converted ${converted}, skipped ${skipped}`);
  console.log(
    `Total: ${(totalIn / 1024 / 1024).toFixed(2)}MB → ${(totalOut / 1024 / 1024).toFixed(2)}MB` +
      (totalIn > 0
        ? `  (${((1 - totalOut / totalIn) * 100).toFixed(1)}% smaller)`
        : ''),
  );

  // Delete the originals after a successful conversion pass. We do
  // this last so a mid-script crash leaves you with the JPGs intact.
  if (converted > 0) {
    console.log('\nRemoving original JPGs...');
    for (const name of jpgs) {
      const src = join(SRC_DIR, name);
      try {
        await unlink(src);
        console.log(`  rm    ${name}`);
      } catch (e) {
        console.error(`  FAIL  rm ${name}:`, e instanceof Error ? e.message : e);
      }
    }
  } else {
    console.log('\nNothing to remove.');
  }

  console.log('\nNext steps:');
  console.log('  1. Update src/lib/product-data.ts and src/storage/database/seed.ts — replace .jpg with .webp in the image paths.');
  console.log('  2. Run this SQL against the Supabase database:');
  console.log('       UPDATE public.product_images');
  console.log("         SET url = REPLACE(url, '.jpg', '.webp')");
  console.log("       WHERE url LIKE '%.jpg';");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
