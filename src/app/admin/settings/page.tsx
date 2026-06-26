'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Save, CheckCircle2, AlertCircle, MessageCircle, Eye, EyeOff } from 'lucide-react';
import { useAdminAuth } from '@/components/admin/AuthProvider';
import { adminFetch } from '@/lib/admin-fetch';

interface Settings {
  id: string;
  email: string;
  name: string;
  role: string;
  whatsapp: string | null;
  created_at?: string;
  updated_at?: string | null;
}

/**
 * Format a raw phone string for the wa.me deep link. WhatsApp accepts
 * the number without the leading `+`, without spaces, and without any
 * punctuation other than digits.
 */
function toWhatsAppLink(raw: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^0-9]/g, '');
  if (digits.length < 5) return null;
  return `https://wa.me/${digits}`;
}

export default function AdminSettingsPage() {
  const { user, refresh } = useAdminAuth();
  // Source of truth for the loaded settings (separate from the auth
  // context's `user` view, because the auth context only knows name +
  // role + whatsapp — not the full row incl. updated_at).
  const [loaded, setLoaded] = useState<Settings | null>(null);
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Toggles the raw input. WhatsApp is stored in whatever format the
  // admin wants; only the wa.me link normalizes it. Showing the
  // normalized link in the "current value" preview helps catch typos.
  const [showPreview, setShowPreview] = useState(true);

  // Fetch the full settings row once on mount. We use adminFetch (which
  // carries the user's JWT) instead of reading from useAdminAuth because
  // the auth context's view drops fields like created_at / updated_at.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await adminFetch('/api/admin/settings');
        if (!res.ok) throw new Error(`Failed to load settings (${res.status})`);
        const body = (await res.json()) as { settings: Settings };
        if (cancelled) return;
        setLoaded(body.settings);
        setName(body.settings.name);
        setWhatsapp(body.settings.whatsapp ?? '');
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await adminFetch('/api/admin/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          name: name.trim(),
          // Send null (not empty string) when blank — the API also
          // normalizes empty -> null, but sending null explicitly makes
          // the intent unambiguous.
          whatsapp: whatsapp.trim() === '' ? null : whatsapp.trim(),
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || `Save failed (${res.status})`);
      }
      const body = (await res.json()) as { settings: Settings };
      setLoaded(body.settings);
      // Sync the AuthProvider's view so the shell reflects the new
      // name + WhatsApp without needing a page reload.
      void refresh?.();
      setSaved(true);
      // Hide the "Saved!" pill after 3s — long enough to read, short
      // enough to not linger forever.
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const previewLink = toWhatsAppLink(whatsapp);
  const dirty =
    loaded !== null &&
    (name.trim() !== loaded.name || (whatsapp.trim() || null) !== (loaded.whatsapp ?? null));

  if (loading) {
    return (
      <div className="animate-pulse space-y-4 max-w-2xl">
        <div className="h-8 w-32 bg-gray-200 rounded" />
        <div className="h-64 bg-gray-200 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your admin profile. Email and role are managed by the Supabase dashboard.
        </p>
      </div>

      <form onSubmit={onSubmit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
        {/* Email (read-only — auth-managed) */}
        <div>
          <label
            htmlFor="email"
            className="block text-[10px] tracking-[0.1em] uppercase text-gray-500 mb-2"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            value={loaded?.email ?? user?.email ?? ''}
            readOnly
            className="w-full px-4 py-2.5 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-md cursor-not-allowed"
          />
          <p className="text-xs text-gray-400 mt-1.5">
            To change your email, update it in Supabase Auth and sign in again.
          </p>
        </div>

        {/* Name */}
        <div>
          <label
            htmlFor="name"
            className="block text-[10px] tracking-[0.1em] uppercase text-gray-500 mb-2"
          >
            Display Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            required
            className="w-full px-4 py-2.5 text-sm text-gray-900 bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#B8956A]/30 focus:border-[#B8956A]"
            placeholder="Your name"
          />
        </div>

        {/* WhatsApp */}
        <div>
          <label
            htmlFor="whatsapp"
            className="block text-[10px] tracking-[0.1em] uppercase text-gray-500 mb-2"
          >
            WhatsApp Number
          </label>
          <input
            id="whatsapp"
            type="tel"
            inputMode="tel"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            maxLength={40}
            className="w-full px-4 py-2.5 text-sm text-gray-900 bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#B8956A]/30 focus:border-[#B8956A]"
            placeholder="+86 159 7561 4041"
          />
          <p className="text-xs text-gray-400 mt-1.5">
            Shown as a &ldquo;Chat on WhatsApp&rdquo; button on the public inquiry page and footer. Use E.164
            format (e.g. <code className="text-[11px] bg-gray-100 px-1 py-0.5 rounded">+8615975614041</code>).
          </p>
          {whatsapp && (
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPreview((v) => !v)}
                className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
              >
                {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {showPreview ? 'Hide' : 'Preview'} deep link
              </button>
              {showPreview && previewLink && (
                <a
                  href={previewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-[#B8956A] hover:text-[#9a7a55] transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  {previewLink}
                </a>
              )}
              {showPreview && !previewLink && (
                <span className="text-xs text-amber-600 inline-flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Doesn&apos;t look like a valid phone number yet
                </span>
              )}
            </div>
          )}
        </div>

        {/* Role (read-only — privilege escalation not self-served) */}
        <div>
          <label
            htmlFor="role"
            className="block text-[10px] tracking-[0.1em] uppercase text-gray-500 mb-2"
          >
            Role
          </label>
          <input
            id="role"
            type="text"
            value={loaded?.role ?? user?.role ?? ''}
            readOnly
            className="w-full px-4 py-2.5 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-md cursor-not-allowed capitalize"
          />
        </div>

        {/* Error / save banner */}
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 text-sm text-red-700 bg-red-50 px-3 py-2 rounded-md"
          >
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {saved && !error && (
          <div
            role="status"
            className="flex items-start gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-md"
          >
            <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>Settings saved.</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
          <button
            type="submit"
            disabled={saving || !dirty}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" aria-hidden="true" />
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
