'use client';

/**
 * Admin chatbot conversations list.
 *
 * Shows one row per chatbot conversation, joined to the lead so the
 * admin sees "Acme Apparel · 14 messages · 2026-06-28" rather than
 * opaque UUIDs. Click a row to read the full transcript.
 *
 * Source filter (the same idea as `/admin/leads`) lets ops pull up
 * "all conversations from this week" or "closed threads needing
 * follow-up".
 */
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { adminFetch } from '@/lib/admin-fetch';
import { useDebouncedValue } from '@/hooks/use-debounced-value';

interface ConversationRow {
  id: string;
  lead_id: string;
  status: string;
  message_count: number;
  last_message_at: string | null;
  created_at: string;
  leads: {
    company_name: string;
    contact_person: string;
    email: string;
  } | null;
}

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open', color: 'bg-emerald-100 text-emerald-800' },
  { value: 'closed', label: 'Closed', color: 'bg-gray-100 text-gray-700' },
];

export default function AdminChatbotListPage() {
  const [rows, setRows] = useState<ConversationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (debouncedSearch) params.set('search', debouncedSearch);
    const res = await adminFetch(`/api/admin/chatbot?${params}`);
    const data = await res.json();
    setRows(data.conversations || []);
    setLoading(false);
  }, [statusFilter, debouncedSearch]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const statusBadge = (status: string) => {
    const opt = STATUS_OPTIONS.find((o) => o.value === status);
    return opt ? opt.color : 'bg-gray-100 text-gray-700';
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Chatbot Conversations</h1>
        <p className="mt-1 text-sm text-gray-500">
          Read transcripts from the public chatbot. Leads captured here are
          also visible in <Link href="/admin/leads" className="text-[#B8956A] hover:underline">Lead Management</Link> with source <span className="font-mono text-xs">chatbot</span>.
        </p>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <input
          type="text"
          placeholder="Search by company, contact, or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 max-w-xs rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#B8956A] focus:outline-none focus:ring-2 focus:ring-[#B8956A]/30"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#B8956A] focus:outline-none focus:ring-2 focus:ring-[#B8956A]/30"
        >
          <option value="all">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <div className="ml-auto text-sm text-gray-500">{rows.length} conversations</div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-500">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="rounded-md border border-dashed border-gray-300 py-12 text-center">
          <p className="text-sm text-gray-500">No chatbot conversations yet.</p>
          <p className="mt-1 text-xs text-gray-400">
            Conversations appear here as soon as a visitor submits the lead
            gate on the public site.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Company</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Messages</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Last activity</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{row.leads?.company_name ?? '—'}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-900">{row.leads?.contact_person ?? '—'}</div>
                    <div className="text-xs text-gray-500">{row.leads?.email ?? ''}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{row.message_count}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(row.status)}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {row.last_message_at
                      ? new Date(row.last_message_at).toLocaleString()
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/chatbot/${row.id}`}
                      className="text-sm text-[#B8956A] hover:underline"
                    >
                      View transcript
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
