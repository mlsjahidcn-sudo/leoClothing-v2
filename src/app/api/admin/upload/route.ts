import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { requireAdmin } from '@/lib/admin-auth';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const ALLOWED_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']);
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

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
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
  const safeExt = ALLOWED_EXTS.has(ext) ? ext : 'bin';
  const folder = productId ? `products/${productId}` : 'uploads/temp';
  const path = `${folder}/${randomUUID()}.${safeExt}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await auth.supabase.storage
    .from('product-images')
    .upload(path, buffer, { contentType: file.type, upsert: false });

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
      size: file.size,
      type: file.type,
    },
    { status: 201 },
  );
}
