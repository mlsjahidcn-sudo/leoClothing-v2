'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { adminFetch } from '@/lib/admin-fetch';

/**
 * Inline subcomponent: list chatbot conversations for the current lead.
 *
 * Lives in this file rather than its own module because it's only
 * used here — keeps the public component graph smaller and avoids a
 * 4-line cross-file import dance. The component fetches
 * /api/admin/chatbot?lead_id=... once on mount and renders a card
 * per conversation.
 */
function ChatbotConversations({ leadId }: { leadId: string }) {
  const [rows, setRows] = useState<
    Array<{
      id: string;
      status: string;
      message_count: number;
      last_message_at: string | null;
    }>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // No lead_id filter exists on the list endpoint today — we
        // fetch the page and filter client-side. With ≤50 conversations
        // per lead in practice, this is fine. If it grows, add a
        // server-side filter.
        const res = await adminFetch(`/api/admin/chatbot?limit=200`);
        if (!res.ok) return;
        const body = (await res.json()) as {
          conversations?: Array<{
            id: string;
            lead_id: string;
            status: string;
            message_count: number;
            last_message_at: string | null;
          }>;
        };
        if (!cancelled) {
          setRows((body.conversations ?? []).filter((c) => c.lead_id === leadId));
        }
      } catch {
        // Swallow — admin UI degrades gracefully to no chatbot section.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [leadId]);

  if (loading) return null;
  if (rows.length === 0) return null;

  return (
    <div className="rounded-lg border border-[#B8956A]/30 bg-[#B8956A]/5 p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#96754E]">
          Chatbot Conversations
        </h2>
        <span className="text-xs text-[#96754E]">{rows.length}</span>
      </div>
      <ul className="space-y-2">
        {rows.map((row) => (
          <li
            key={row.id}
            className="flex items-center justify-between rounded-md border border-[#B8956A]/20 bg-white px-4 py-3"
          >
            <div className="text-sm">
              <div className="font-medium text-gray-900">
                {row.message_count} messages · {row.status}
              </div>
              <div className="text-xs text-gray-500">
                {row.last_message_at
                  ? `Last activity ${new Date(row.last_message_at).toLocaleString()}`
                  : 'No activity yet'}
              </div>
            </div>
            <Link
              href={`/admin/chatbot/${row.id}`}
              className="text-sm text-[#B8956A] hover:underline"
            >
              Open transcript →
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface LeadActivity {
  id: number;
  lead_id: string;
  type: string;
  subject: string | null;
  content: string;
  created_at: string;
}

interface Lead {
  id: string;
  company_name: string;
  contact_person: string;
  email: string;
  phone: string | null;
  country: string | null;
  source: string;
  status: string;
  estimated_value: string | null;
  products_interest: string | null;
  next_follow_up: string | null;
  notes: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string | null;
  lead_activities: LeadActivity[];
}

const STATUS_PIPELINE = [
  { value: 'new', label: 'New', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  { value: 'contacted', label: 'Contacted', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  { value: 'qualified', label: 'Qualified', color: 'bg-purple-100 text-purple-800 border-purple-300' },
  { value: 'proposal', label: 'Proposal', color: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
  { value: 'negotiation', label: 'Negotiation', color: 'bg-orange-100 text-orange-800 border-orange-300' },
  { value: 'won', label: 'Won', color: 'bg-green-100 text-green-800 border-green-300' },
  { value: 'lost', label: 'Lost', color: 'bg-red-100 text-red-800 border-red-300' },
];

const ACTIVITY_TYPES = [
  { value: 'note', label: 'Note', icon: '📝' },
  { value: 'call', label: 'Phone Call', icon: '📞' },
  { value: 'email', label: 'Email', icon: '📧' },
  { value: 'meeting', label: 'Meeting', icon: '🤝' },
  { value: 'sample_sent', label: 'Sample Sent', icon: '📦' },
  { value: 'quote_sent', label: 'Quote Sent', icon: '💰' },
  { value: 'status_change', label: 'Status Change', icon: '🔄' },
];

export default function LeadDetailPage() {
  // In a client component, `params` arrives as a plain object — receiving
  // it as a Promise (server-component pattern) means .then() never
  // resolves and the page sticks on "Lead not found". Use useParams().
  const params = useParams<{ id: string }>();
  const leadId = params?.id ?? '';
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Lead>>({});
  const [newActivity, setNewActivity] = useState({ type: 'note', subject: '', content: '' });
  const [daysInPipeline, setDaysInPipeline] = useState(0);
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (lead?.created_at) {
      const diff = new Date().getTime() - new Date(lead.created_at).getTime();
      setDaysInPipeline(Math.floor(diff / 86400000));
    }
  }, [lead?.created_at]);

  const fetchLead = async () => {
    if (!leadId) return;
    setLoading(true);
    const res = await adminFetch(`/api/admin/leads/${leadId}`);
    const data = await res.json();
    setLead(data.lead);
    setEditData(data.lead);
    setLoading(false);
  };

  useEffect(() => { fetchLead(); }, [leadId]);

  const handleStatusChange = async (newStatus: string) => {
    if (!lead) return;
    const previousStatus = lead.status;
    setSaving(true);
    // Optimistic update — flip the UI immediately, roll back if the
    // PATCH fails. The activity log entry is best-effort and only
    // fires on success.
    setLead((prev) => (prev ? { ...prev, status: newStatus } : prev));
    const res = await adminFetch(`/api/admin/leads/${lead.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    if (!res.ok) {
      setLead((prev) => (prev ? { ...prev, status: previousStatus } : prev));
      const err = await res.json().catch(() => ({}));
      alert(`Failed to update status: ${err.error ?? res.statusText}`);
      setSaving(false);
      return;
    }
    // Log activity
    const oldLabel = STATUS_PIPELINE.find(s => s.value === previousStatus)?.label || previousStatus;
    const newLabel = STATUS_PIPELINE.find(s => s.value === newStatus)?.label || newStatus;
    await adminFetch(`/api/admin/leads/${lead.id}/activities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'status_change',
        subject: `Status changed: ${oldLabel} → ${newLabel}`,
        content: `Lead status changed from ${oldLabel} to ${newLabel}`,
      }),
    });
    fetchLead();
    setSaving(false);
  };

  const handleSaveEdit = async () => {
    if (!lead) return;
    setSaving(true);
    await adminFetch(`/api/admin/leads/${lead.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editData),
    });
    setEditing(false);
    fetchLead();
    setSaving(false);
  };

  const handleAddActivity = async () => {
    if (!lead || !newActivity.content) return;
    await adminFetch(`/api/admin/leads/${lead.id}/activities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newActivity),
    });
    setNewActivity({ type: 'note', subject: '', content: '' });
    setShowActivityForm(false);
    fetchLead();
  };

  const handleDelete = async () => {
    if (!lead || !confirm('Delete this lead?')) return;
    await adminFetch(`/api/admin/leads/${lead.id}`, { method: 'DELETE' });
    router.push('/admin/leads');
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;
  if (!lead) return <div className="text-center py-12 text-gray-500">Lead not found</div>;

  const currentStatusIdx = STATUS_PIPELINE.findIndex(s => s.value === lead.status);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/admin/leads" className="text-gray-400 hover:text-gray-600 text-sm">&larr; Leads</Link>
          <span className="text-gray-300">|</span>
          <h1 className="text-xl font-semibold text-gray-900">{lead.company_name}</h1>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_PIPELINE.find(s => s.value === lead.status)?.color || 'bg-gray-100 text-gray-800'}`}>
            {STATUS_PIPELINE.find(s => s.value === lead.status)?.label || lead.status}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setEditing(!editing)} className="px-3 py-1.5 border border-gray-300 rounded-md text-sm hover:bg-gray-50">
            {editing ? 'Cancel' : 'Edit'}
          </button>
          <button onClick={handleDelete} className="px-3 py-1.5 border border-red-300 text-red-600 rounded-md text-sm hover:bg-red-50">
            Delete
          </button>
        </div>
      </div>

      {/* Status Pipeline */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-1">
          {STATUS_PIPELINE.map((s, idx) => (
            <button
              key={s.value}
              onClick={() => handleStatusChange(s.value)}
              disabled={saving}
              className={`flex-1 py-2 px-1 text-center rounded-md text-xs font-medium border transition-colors ${
                s.value === lead.status
                  ? s.color + ' ring-2 ring-offset-1 ring-[#B8956A]'
                  : idx < currentStatusIdx
                    ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                    : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left: Lead Info */}
        <div className="col-span-2 space-y-6">
          {/* Contact Information */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">Contact Information</h2>
            {editing ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Company Name</label>
                  <input type="text" value={editData.company_name || ''} onChange={e => setEditData({...editData, company_name: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#B8956A]/30" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Contact Person</label>
                  <input type="text" value={editData.contact_person || ''} onChange={e => setEditData({...editData, contact_person: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#B8956A]/30" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Email</label>
                  <input type="email" value={editData.email || ''} onChange={e => setEditData({...editData, email: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#B8956A]/30" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Phone</label>
                  <input type="text" value={editData.phone || ''} onChange={e => setEditData({...editData, phone: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#B8956A]/30" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Country</label>
                  <input type="text" value={editData.country || ''} onChange={e => setEditData({...editData, country: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#B8956A]/30" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Source</label>
                  <select value={editData.source || 'manual'} onChange={e => setEditData({...editData, source: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#B8956A]/30">
                    <option value="website">Website</option>
                    <option value="trade_show">Trade Show</option>
                    <option value="referral">Referral</option>
                    <option value="cold_outreach">Cold Outreach</option>
                    <option value="social_media">Social Media</option>
                    <option value="manual">Manual Entry</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Est. Value ($)</label>
                  <input type="number" value={editData.estimated_value || ''} onChange={e => setEditData({...editData, estimated_value: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#B8956A]/30" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Next Follow Up</label>
                  <input type="date" value={editData.next_follow_up ? editData.next_follow_up.split('T')[0] : ''} onChange={e => setEditData({...editData, next_follow_up: e.target.value ? new Date(`${e.target.value}T00:00:00`).toISOString() : null})} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#B8956A]/30" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">Products Interest</label>
                  <input type="text" value={editData.products_interest || ''} onChange={e => setEditData({...editData, products_interest: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#B8956A]/30" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">Notes</label>
                  <textarea value={editData.notes || ''} onChange={e => setEditData({...editData, notes: e.target.value})} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#B8956A]/30" />
                </div>
                <div className="col-span-2 flex justify-end">
                  <button onClick={handleSaveEdit} disabled={saving} className="px-4 py-2 bg-[#B8956A] text-white rounded-md text-sm hover:bg-[#a07d55] disabled:opacity-50">
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                <div><span className="text-xs text-gray-500 block">Company</span><span className="text-sm text-gray-900">{lead.company_name}</span></div>
                <div><span className="text-xs text-gray-500 block">Contact Person</span><span className="text-sm text-gray-900">{lead.contact_person}</span></div>
                <div><span className="text-xs text-gray-500 block">Email</span><a href={`mailto:${lead.email}`} className="text-sm text-[#B8956A] hover:underline">{lead.email}</a></div>
                <div><span className="text-xs text-gray-500 block">Phone</span><span className="text-sm text-gray-900">{lead.phone || '-'}</span></div>
                <div><span className="text-xs text-gray-500 block">Country</span><span className="text-sm text-gray-900">{lead.country || '-'}</span></div>
                <div><span className="text-xs text-gray-500 block">Source</span><span className="text-sm text-gray-900 capitalize">{lead.source.replace('_', ' ')}</span></div>
                <div><span className="text-xs text-gray-500 block">Est. Value</span><span className="text-sm text-gray-900 font-medium">{lead.estimated_value ? `$${Number(lead.estimated_value).toLocaleString()}` : '-'}</span></div>
                <div><span className="text-xs text-gray-500 block">Next Follow Up</span><span className="text-sm text-gray-900">{lead.next_follow_up ? new Date(lead.next_follow_up).toLocaleDateString() : '-'}</span></div>
                <div className="col-span-2"><span className="text-xs text-gray-500 block">Products Interest</span><span className="text-sm text-gray-900">{lead.products_interest || '-'}</span></div>
                {lead.notes && <div className="col-span-2"><span className="text-xs text-gray-500 block">Notes</span><span className="text-sm text-gray-900 whitespace-pre-wrap">{lead.notes}</span></div>}
              </div>
            )}
          </div>

          {/* Chatbot Conversations — only fetched when the lead was
              captured via the chatbot. Polls /api/admin/chatbot with a
              lead-id filter (server does the join). If empty, we hide
              the section entirely so non-chatbot leads aren't cluttered. */}
          <ChatbotConversations leadId={lead.id} />

          {/* Activity Timeline */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Activity Timeline</h2>
              <button
                onClick={() => setShowActivityForm(!showActivityForm)}
                className="px-3 py-1 text-xs bg-[#B8956A] text-white rounded-md hover:bg-[#a07d55]"
              >
                + Log Activity
              </button>
            </div>

            {showActivityForm && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Activity Type</label>
                    <select value={newActivity.type} onChange={e => setNewActivity({...newActivity, type: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#B8956A]/30">
                      {ACTIVITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Subject</label>
                    <input type="text" value={newActivity.subject} onChange={e => setNewActivity({...newActivity, subject: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#B8956A]/30" placeholder="Optional subject" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Details *</label>
                  <textarea value={newActivity.content} onChange={e => setNewActivity({...newActivity, content: e.target.value})} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#B8956A]/30" placeholder="Describe the interaction..." />
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowActivityForm(false)} className="px-3 py-1.5 border border-gray-300 rounded-md text-xs hover:bg-gray-100">Cancel</button>
                  <button onClick={handleAddActivity} disabled={!newActivity.content} className="px-3 py-1.5 bg-[#B8956A] text-white rounded-md text-xs hover:bg-[#a07d55] disabled:opacity-50">Add Activity</button>
                </div>
              </div>
            )}

            {lead.lead_activities && lead.lead_activities.length > 0 ? (
              <div className="space-y-0">
                {lead.lead_activities.map((activity, idx) => {
                  const actType = ACTIVITY_TYPES.find(t => t.value === activity.type);
                  return (
                    <div key={activity.id} className={`flex gap-3 ${idx < lead.lead_activities.length - 1 ? 'pb-4' : ''}`}>
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm">
                          {actType?.icon || '📝'}
                        </div>
                        {idx < lead.lead_activities.length - 1 && <div className="w-px flex-1 bg-gray-200 mt-1" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-500 uppercase">{actType?.label || activity.type}</span>
                          <span className="text-xs text-gray-400">{new Date(activity.created_at).toLocaleString()}</span>
                        </div>
                        {activity.subject && <div className="text-sm font-medium text-gray-900 mt-0.5">{activity.subject}</div>}
                        <div className="text-sm text-gray-600 mt-0.5">{activity.content}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400 text-sm">No activities yet. Log your first interaction above.</div>
            )}
          </div>
        </div>

        {/* Right: Quick Info Sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Quick Info</h3>
            <div className="space-y-3">
              <div>
                <span className="text-xs text-gray-400 block">Created</span>
                <span className="text-sm text-gray-900">{new Date(lead.created_at).toLocaleDateString()}</span>
              </div>
              <div>
                <span className="text-xs text-gray-400 block">Last Updated</span>
                <span className="text-sm text-gray-900">{lead.updated_at ? new Date(lead.updated_at).toLocaleDateString() : '-'}</span>
              </div>
              <div>
                <span className="text-xs text-gray-400 block">Days in Pipeline</span>
                <span className="text-sm text-gray-900">{daysInPipeline} days</span>
              </div>
              <div>
                <span className="text-xs text-gray-400 block">Activities</span>
                <span className="text-sm text-gray-900">{lead.lead_activities?.length || 0}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <a href={`mailto:${lead.email}`} className="block w-full text-center px-3 py-2 bg-white border border-gray-300 rounded-md text-sm hover:bg-gray-50">
                Send Email
              </a>
              {lead.phone && (
                <a href={`tel:${lead.phone}`} className="block w-full text-center px-3 py-2 bg-white border border-gray-300 rounded-md text-sm hover:bg-gray-50">
                  Call {lead.phone}
                </a>
              )}
              <Link
                href={`/admin/leads`}
                className="block w-full text-center px-3 py-2 bg-white border border-gray-300 rounded-md text-sm hover:bg-gray-50"
              >
                Back to Leads
              </Link>
            </div>
          </div>

          {/* Convert to RFQ */}
          {lead.status !== 'won' && lead.status !== 'lost' && (
            <div className="bg-[#B8956A]/5 rounded-lg border border-[#B8956A]/20 p-4">
              <h3 className="text-xs font-semibold text-[#B8956A] uppercase tracking-wider mb-2">Ready to Quote?</h3>
              <p className="text-xs text-gray-500 mb-3">Convert this lead into an RFQ when they request a formal quote.</p>
              <Link
                href={`/admin/rfqs`}
                className="block w-full text-center px-3 py-2 bg-[#B8956A] text-white rounded-md text-sm hover:bg-[#a07d55]"
              >
                View RFQs
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
