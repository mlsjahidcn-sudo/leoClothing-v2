#!/usr/bin/env node
/**
 * One-shot re-encode of bloated product_images rows in Supabase storage.
 *
 * Background: the `/api/admin/upload` route now re-encodes every
 * upload to WebP on its way to storage (see src/app/api/admin/upload/route.ts).
 * This script re-encodes the OLD rows that predate that fix — the
 * two unconverted 4.7 MB PNGs currently in `product-images`.
 *
 * Strategy:
 *   1. List every row in `product_images` whose URL points at
 *      supabase.co storage.
 *   2. Download the original into memory.
 *   3. Re-encode to WebP q=82 via sharp (same settings the upload
 *      route uses, so output is byte-equivalent).
 *   4. Upload the WebP to a sibling path (the original path but
 *      with the extension swapped to `.webp`).
 *   5. Print a "ready to run" SQL block that:
 *        a) Updates product_images.url to the new WebP path
 *        b) Deletes the old PNGs from the storage bucket
 *      The user runs the SQL once they're happy with the preview
 *      table; the script does NOT touch the DB or the originals
 *      automatically. Fail-safe.
 *
 * Why dry-run by default:
 *   - 4.7 MB originals cost real egress to download and re-upload.
 *   - The DB rewrite is a one-way street without a backup.
 *   - We want a human to eyeball the savings before flipping the bit.
 *
 * Run modes:
 *   node scripts/reencode-storage-images.mjs --dry-run     (default)
 *   node scripts/reencode-storage-images.mjs --apply        (do the re-upload too)
 *   node scripts/reencode-storage-images.mjs --apply --limit 2   (cap to 2 rows)
 *
 * Auth: requires SUPABASE_SERVICE_ROLE_KEY in env (the admin API
 * key that bypasses RLS — needed to list + read every storage object).
 *   export SUPABASE_SERVICE_ROLE_KEY=...
 *   export NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
 *
 * Idempotency:
 *   - Skips rows whose URL already ends in `.webp` (no work to do).
 *   - Re-running after a partial failure picks up where it left off,
 *     since the dry-run always reads from the DB.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('Missing env vars. Need:');
  console.error('  NEXT_PUBLIC_SUPABASE_URL (e.g. https://<ref>.supabase.co)');
  console.error('  SUPABASE_SERVICE_ROLE_KEY (the project admin key)');
  console.error('');
  console.error('Both live in .env.local for local dev. Source them before running:');
  console.error('  set -a; source .env.local; set +a; node scripts/reencode-storage-images.mjs --apply');
  process.exit(1);
}

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const LIMIT = (() => {
  const i = args.indexOf('--limit');
  return i >= 0 ? parseInt(args[i + 1], 10) : Infinity;
})();

const BUCKET = 'product-images';
const QUALITY = 82;
const EFFORT = 5;

const sb = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

function swapExt(url, newExt) {
  return url.replace(/\.[a-z0-9]+(\?|$)/i, `.${newExt}$1`);
}

function shortBytes(n) {
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(2)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${n} B`;
}

async function main() {
  // List every product_images row. We only care about Supabase storage
  // rows (http URLs) — /public/ rows are served from disk and already
  // WebP.
  const { data: rows, error } = await sb
    .from('product_images')
    .select('id, url, product_id')
    .order('id');
  if (error) {
    console.error('DB list failed:', error.message);
    process.exit(1);
  }

  const candidates = rows.filter((r) => r.url?.startsWith('http'));
  const skipped = rows.length - candidates.length;
  const alreadyWebp = candidates.filter((r) => /\.webp(\?|$)/i.test(r.url));

  console.log(`product_images: ${rows.length} total`);
  console.log(`  - ${skipped} served from /public/ (skip)`);
  console.log(`  - ${alreadyWebp.length} already .webp (skip)`);
  console.log(`  - ${candidates.length - alreadyWebp.length} need re-encoding`);
  console.log('');

  const toProcess = candidates
    .filter((r) => !/\.webp(\?|$)/i.test(r.url))
    .slice(0, LIMIT);

  if (toProcess.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  const results = [];
  let totalIn = 0;
  let totalOut = 0;

  for (const row of toProcess) {
    process.stdout.write(`  ${row.url} … `);
    try {
      const before = await fetch(row.url).then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status} fetching original`);
        const buf = Buffer.from(await r.arrayBuffer());
        return { buf, size: buf.length };
      });

      const afterBuf = await sharp(before.buf, { failOn: 'none' })
        .rotate()
        .webp({ quality: QUALITY, effort: EFFORT })
        .toBuffer();
      const newPath = swapExt(row.url, 'webp');

      console.log(
        `${shortBytes(before.size)} → ${shortBytes(afterBuf.length)} ` +
          `(${(100 - (afterBuf.length / before.size) * 100).toFixed(1)}% smaller)`,
      );

      totalIn += before.size;
      totalOut += afterBuf.length;
      results.push({
        id: row.id,
        product_id: row.product_id,
        from: row.url,
        to: newPath,
        before: before.size,
        after: afterBuf.length,
        webp: afterBuf,
      });
    } catch (e) {
      console.log(`FAIL: ${e instanceof Error ? e.message : e}`);
    }
  }

  console.log('');
  console.log(
    `Total: ${shortBytes(totalIn)} → ${shortBytes(totalOut)} ` +
      (totalIn > 0 ? `(${(100 - (totalOut / totalIn) * 100).toFixed(1)}% smaller)` : ''),
  );

  if (!APPLY) {
    console.log('');
    console.log('DRY-RUN: re-running with --apply will re-upload the WebPs and emit a SQL block.');
    console.log('Sample new URLs:');
    for (const r of results.slice(0, 3)) console.log(`  ${r.to}`);
    return;
  }

  // --apply: upload each WebP to its sibling path
  console.log('');
  console.log('Uploading WebP variants…');
  for (const r of results) {
    // newPath is a full URL; storage.upload needs the path inside the bucket.
    // /storage/v1/object/public/product-images/<path>  ->  <path>
    const url = new URL(r.to);
    const inside = url.pathname.split(`/object/public/${BUCKET}/`)[1];
    if (!inside) {
      console.log(`  SKIP  ${r.to} (can't extract bucket path from URL)`);
      continue;
    }
    const { error: upErr } = await sb.storage
      .from(BUCKET)
      .upload(inside, r.webp, { contentType: 'image/webp', upsert: true });
    if (upErr) {
      console.log(`  FAIL  upload ${inside}: ${upErr.message}`);
    } else {
      console.log(`  ok    ${inside}  (${shortBytes(r.after)})`);
    }
  }

  // Emit the SQL the user runs to flip the DB and clean up originals.
  const out = ['-- Run this in the Supabase SQL editor. Read the script header first.'];
  for (const r of results) {
    out.push(
      `UPDATE public.product_images SET url = '${r.to}' WHERE id = ${r.id};`,
    );
  }
  for (const r of results) {
    const fromInside = new URL(r.from).pathname.split(`/object/public/${BUCKET}/`)[1];
    out.push(`SELECT storage.remove_object('${BUCKET}', '${fromInside}');`);
  }
  out.push(
    '',
    '-- Verify after:',
    '--   SELECT count(*) FROM product_images WHERE url LIKE \'%.png\';  -- should be 0',
    '--   SELECT count(*) FROM product_images WHERE url LIKE \'%.jpg\';  -- should be 0',
  );
  await writeFile('scripts/.reencode-sql.sql', out.join('\n') + '\n');
  console.log('');
  console.log('SQL written to scripts/.reencode-sql.sql — review, then run it in the Supabase SQL editor.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
