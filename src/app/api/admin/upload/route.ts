import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { requireAdmin } from '@/lib/admin-auth';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const ALLOWED_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']);
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
// Re-encode target. WebP q=82 is visually indistinguishable from the
// PNG/JPG sources for product photography and is 60-80% smaller.
const WEBP_QUALITY = 82;
const WEBP_EFFORT = 5; // 0=fastest, 6=smallest. 5 is a good middle.
// Skip re-encoding for files already this small — they're already
// cheap to serve. Saves a sharp call on the common case (icons, small
// detail shots) and avoids the very rare case of re-encoding making
// a small WebP slightly larger.
const SKIP_REENCODE_BELOW = 100 * 1024;

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 });
  }

  const file = formData.get('file');
  const productId = (formData.get('productId') as string | null)?.trim() || null;
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file is required' }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      {
        error: `Unsupported file type: ${file.type || 'unknown'}`,
        allowed: [...ALLOWED_TYPES],
      },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      {
        error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)} MB`,
        maxMb: MAX_BYTES / 1024 / 1024,
      },
      { status: 400 },
    );
  }

  // Build a safe storage path. New uploads for a not-yet-saved product
  // land in `uploads/temp/`; once the product has an id we drop the
  // file under `products/<id>/` so all the asset paths cluster neatly.
  // The extension is forced to `.webp` so the downstream `next/image`
  // optimizer picks up the right format negotiation.
  const folder = productId ? `products/${productId}` : 'uploads/temp';
  const path = `${folder}/${randomUUID()}.webp`;

  const originalBuffer = Buffer.from(await file.arrayBuffer());
  let uploadBuffer: Buffer = originalBuffer;
  let storedSize = file.size;
  let storedType = file.type;
  let reencoded = false;

  // Re-encode everything except already-tiny files. Sharp can ingest
  // any of the allowed types and emit a WebP. If re-encoding fails
  // (corrupt file, weird codec), we fall back to storing the original
  // — the user still gets their upload, the page just isn't optimized.
  if (file.size > SKIP_REENCODE_BELOW) {
    try {
      const reencodedBuffer = await sharp(originalBuffer, { failOn: 'none' })
        .rotate() // honour EXIF orientation before re-encoding; sharp's
                  // default would otherwise drop the rotation hint
        .webp({ quality: WEBP_QUALITY, effort: WEBP_EFFORT })
        .toBuffer();
      // Only swap in the re-encoded version if it's actually smaller.
      // For tiny inputs the WebP wrapper can be larger than the input.
      if (reencodedBuffer.length < originalBuffer.length) {
        uploadBuffer = reencodedBuffer;
        storedSize = reencodedBuffer.length;
        storedType = 'image/webp';
        reencoded = true;
      }
    } catch (e) {
      // Don't fail the upload — the original is still safe to store.
      console.warn(
        `[upload] sharp re-encode failed for ${file.name}, storing original:`,
        e instanceof Error ? e.message : e,
      );
    }
  }

  const { error: uploadError } = await auth.supabase.storage
    .from('product-images')
    .upload(path, uploadBuffer, { contentType: storedType, upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: publicUrlData } = auth.supabase.storage
    .from('product-images')
    .getPublicUrl(path);

  return NextResponse.json(
    {
      url: publicUrlData.publicUrl,
      path,
      size: storedSize,
      type: storedType,
      reencoded,
      // Tell the admin UI how much space the re-encode saved so the
      // upload progress can surface it. Original size is in `file.size`.
      originalSize: reencoded ? file.size : undefined,
    },
    { status: 201 },
  );
}
