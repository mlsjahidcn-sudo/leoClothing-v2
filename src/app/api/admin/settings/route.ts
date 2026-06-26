/**
 * GET  /api/admin/settings — return the current admin's profile row
 * PATCH /api/admin/settings — update mutable fields on the current admin's row
 *
 * Mutable fields (whitelisted — never trust client to write to anything else):
 *   - name      (display name, shown in shell + leads)
 *   - whatsapp  (E.164 string, surfaced on the public inquiry page + footer)
 *
 * Email and role are intentionally NOT editable here — email change requires
 * Supabase Auth (separate flow), and role is a privilege escalation that
 * should not be self-served.
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';

interface SettingsUpdateBody {
  name?: unknown;
  whatsapp?: unknown;
}

const NAME_MAX = 100;
// Permissive on WhatsApp — E.164 is the common format but admins may paste
// whatever they actually use (with spaces, dashes, country code in parens,
// etc.). We trim and length-check but don't try to parse.
const WHATSAPP_MAX = 40;

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { data, error } = await auth.supabase
    .from('admin_profiles')
    .select('id, email, name, role, whatsapp, created_at, updated_at')
    .eq('id', auth.user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) {
    // Defensive: requireAdmin already gated on row existence, but the row
    // could in theory have been deleted between the gate and now.
    return NextResponse.json({ error: 'Admin profile not found' }, { status: 404 });
  }
  return NextResponse.json({ settings: data });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  let body: SettingsUpdateBody;
  try {
    body = (await request.json()) as SettingsUpdateBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const patch: Record<string, string | null> = {};

  if (body.name !== undefined) {
    if (typeof body.name !== 'string') {
      return NextResponse.json({ error: 'name must be a string' }, { status: 400 });
    }
    const trimmed = body.name.trim();
    if (trimmed.length === 0) {
      return NextResponse.json({ error: 'name cannot be empty' }, { status: 400 });
    }
    if (trimmed.length > NAME_MAX) {
      return NextResponse.json(
        { error: `name must be ${NAME_MAX} characters or fewer` },
        { status: 400 },
      );
    }
    patch.name = trimmed;
  }

  if (body.whatsapp !== undefined) {
    // null is allowed (clears the number). Empty string also clears.
    if (body.whatsapp === null) {
      patch.whatsapp = null;
    } else if (typeof body.whatsapp !== 'string') {
      return NextResponse.json({ error: 'whatsapp must be a string or null' }, { status: 400 });
    } else {
      const trimmed = body.whatsapp.trim();
      if (trimmed.length === 0) {
        patch.whatsapp = null;
      } else if (trimmed.length > WHATSAPP_MAX) {
        return NextResponse.json(
          { error: `whatsapp must be ${WHATSAPP_MAX} characters or fewer` },
          { status: 400 },
        );
      } else {
        patch.whatsapp = trimmed;
      }
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No supported fields to update' }, { status: 400 });
  }
  patch.updated_at = new Date().toISOString();

  const { data, error } = await auth.supabase
    .from('admin_profiles')
    .update(patch)
    .eq('id', auth.user.id)
    .select('id, email, name, role, whatsapp, updated_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: data });
}
