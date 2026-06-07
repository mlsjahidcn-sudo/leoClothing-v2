/**
 * Supabase configuration — env-var resolution and Database typing.
 *
 * Resolution order for the URL + publishable key:
 *   1. NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 *      (preferred, namespaced for Vercel / Next.js deploys)
 *   2. COZE_SUPABASE_URL / COZE_SUPABASE_ANON_KEY
 *      (legacy Coze-platform convention; the runtime injects these)
 *
 * The service-role / secret key is server-only and must come from a
 * non-NEXT_PUBLIC_ variable. Set it to an empty string in `.env.local`
 * if you don't have it yet — admin operations that need to bypass RLS
 * will throw a clear error.
 */
import type { Database } from './types';

interface PublicConfig {
  url: string;
  publishableKey: string;
}

interface AdminConfig {
  url: string;
  serviceRoleKey: string;
}

function readPublicConfig(): PublicConfig {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.COZE_SUPABASE_URL ||
    '';
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.COZE_SUPABASE_ANON_KEY ||
    '';

  if (!url) {
    throw new Error(
      'Missing Supabase URL. Set NEXT_PUBLIC_SUPABASE_URL (or COZE_SUPABASE_URL).',
    );
  }
  if (!publishableKey) {
    throw new Error(
      'Missing Supabase publishable/anon key. Set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or COZE_SUPABASE_ANON_KEY).',
    );
  }
  return { url, publishableKey };
}

function readAdminConfig(): AdminConfig {
  const { url } = readPublicConfig();
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.COZE_SUPABASE_SERVICE_ROLE_KEY ||
    '';
  if (!serviceRoleKey) {
    throw new Error(
      'Missing Supabase service-role / secret key. Set SUPABASE_SERVICE_ROLE_KEY (server-only).',
    );
  }
  return { url, serviceRoleKey };
}

// Memoize so we don't re-read env on every call.
let publicConfig: PublicConfig | null = null;
let adminConfig: AdminConfig | null = null;

export function getSupabaseConfig(): PublicConfig {
  publicConfig ??= readPublicConfig();
  return publicConfig;
}

export function getSupabaseAdminConfig(): AdminConfig {
  adminConfig ??= readAdminConfig();
  return adminConfig;
}

export type { Database };
