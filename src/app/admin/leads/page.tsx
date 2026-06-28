'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Download } from 'lucide-react';
import { adminFetch } from '@/lib/admin-fetch';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { toCsv, downloadCsv } from '@/lib/csv';

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
  created_at: string;
  updated_at: string | null;
}

const STATUS_OPTIONS = [
  { value: 'new', label: 'New', color: 'bg-blue-100 text-blue-800' },
  { value: 'contacted', label: 'Contacted', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'qualified', label: 'Qualified', color: 'bg-purple-100 text-purple-800' },
  { value: 'proposal', label: 'Proposal Sent', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'negotiation', label: 'Negotiation', color: 'bg-orange-100 text-orange-800' },
  { value: 'won', label: 'Won', color: 'bg-green-100 text-green-800' },
  { value: 'lost', label: 'Lost', color: 'bg-red-100 text-red-800' },
];

const SOURCE_OPTIONS = [
  { value: 'website', label: 'Website' },
  { value: 'trade_show', label: 'Trade Show' },
  { value: 'referral', label: 'Referral' },
  { value: 'cold_outreach', label: 'Cold Outreach' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'manual', label: 'Manual Entry' },
];

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLead, setNewLead] = useState({
    company_name: '', contact_person: '', email: '', phone: '', country: '',
    source: 'manual', estimated_value: '', products_interest: '', notes: '',
  });
  const [addLeadError, setAddLeadError] = useState<string | null>(null);

  // Debounce the search so a 5-char query is 1 API call, not 5.
  const debouncedSearch = useDebouncedValue(search, 300);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (sourceFilter !== 'all') params.set('source', sourceFilter);
    if (debouncedSearch) params.set('search', debouncedSearch);
    const res = await adminFetch(`/api/admin/leads?${params}`);
    const data = await res.json();
    setLeads(data.leads || []);
    setLoading(false);
  }, [statusFilter, sourceFilter, debouncedSearch]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  // Close the Add-Lead modal on Escape. Keyboard users have no other
  // way to dismiss it (the backdrop click works for mouse but not for
  // pure keyboard navigation). Also lock body scroll while the modal
  // is open so the underlying table doesn't shift underneath.
  useEffect(() => {
    if (!showAddModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowAddModal(false);
        setAddLeadError(null);
      }
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [showAddModal]);

  const handleAddLead = async () => {
    // Surface failures — without the `if (!res.ok)` branch, a network
    // blip or duplicate-email 400 closed the modal and refreshed the
    // list as if the lead had been added. The admin would assume the
    // row is on the next page but never see it.
    try {
      const res = await adminFetch('/api/admin/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newLead,
          estimated_value: newLead.estimated_value || null,
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        setAddLeadError(err.error ?? `Failed to create lead (${res.status})`);
        return;
      }
    } catch (e) {
      setAddLeadError(e instanceof Error ? e.message : 'Network error');
      return;
    }
    setAddLeadError(null);
    setShowAddModal(false);
    setNewLead({ company_name: '', contact_person: '', email: '', phone: '', country: '', source: 'manual', estimated_value: '', products_interest: '', notes: '' });
    fetchLeads();
  };

  const getStatusBadge = (status: string) => {
    const opt = STATUS_OPTIONS.find(o => o.value === status);
    return opt ? opt.color : 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const opt = STATUS_OPTIONS.find(o => o.value === status);
    return opt ? opt.label : status;
  };

  const countByStatus = (status: string) => leads.filter(l => l.status === status).length;

  const handleExport = () => {
    const csv = toCsv(leads as unknown as Record<string, unknown>[], [
      { key: 'id', header: 'ID' },
      { key: 'company_name', header: 'Company' },
      { key: 'contact_person', header: 'Contact' },
      { key: 'email', header: 'Email' },
      { key: 'phone', header: 'Phone' },
      { key: 'country', header: 'Country' },
      { key: 'source', header: 'Source' },
      { key: 'status', header: 'Status' },
      { key: 'estimated_value', header: 'Est. Value (USD)' },
      { key: 'products_interest', header: 'Products Interest' },
      { key: 'next_follow_up', header: 'Next Follow Up' },
      { key: 'notes', header: 'Notes' },
      { key: 'created_at', header: 'Created At' },
    ]);
    const stamp = new Date().toISOString().split('T')[0];
    downloadCsv(`leads-${stamp}.csv`, csv);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Lead Management</h1>
          <p className="text-sm text-gray-500 mt-1">Track and manage potential customers through your sales pipeline</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            disabled={leads.length === 0}
            className="px-3 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
            title="Download the current filtered list as CSV"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={() => { setShowAddModal(true); setAddLeadError(null); }}
            className="px-4 py-2 bg-[#B8956A] text-white rounded-md hover:bg-[#a07d55] transition-colors text-sm font-medium"
          >
            + Add Lead
          </button>
        </div>
      </div>

      {/* Status Pipeline Summary */}
      <div className="grid grid-cols-7 gap-2 mb-6">
        {STATUS_OPTIONS.map(s => (
          <button
            key={s.value}
            onClick={() => setStatusFilter(statusFilter === s.value ? 'all' : s.value)}
            className={`p-3 rounded-md text-center transition-colors ${
              statusFilter === s.value ? 'ring-2 ring-[#B8956A] bg-white' : 'bg-gray-50 hover:bg-gray-100'
            }`}
          >
            <div className="text-lg font-semibold text-gray-900">{statusFilter === 'all' ? countByStatus(s.value) : countByStatus(s.value)}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="Search leads..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm flex-1 max-w-xs focus:outline-none focus:ring-2 focus:ring-[#B8956A]/30"
        />
        <select
          value={sourceFilter}
          onChange={e => setSourceFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#B8956A]/30"
        >
          <option value="all">All Sources</option>
          {SOURCE_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <div className="text-sm text-gray-500 ml-auto">{leads.length} leads</div>
      </div>

      {/* Leads Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : leads.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No leads found</div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Company</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Contact</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Source</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Est. Value</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Follow Up</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Created</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {leads.map(lead => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{lead.company_name}</div>
                    {lead.country && <div className="text-xs text-gray-500">{lead.country}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-900">{lead.contact_person}</div>
                    <div className="text-xs text-gray-500">{lead.email}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    <span className="capitalize">{lead.source.replace('_', ' ')}</span>
                    {lead.source === 'chatbot' && (
                      <span className="ml-1.5 inline-block rounded-sm bg-[#B8956A]/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#96754E]">
                        AI
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(lead.status)}`}>
                      {getStatusLabel(lead.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {lead.estimated_value ? `$${Number(lead.estimated_value).toLocaleString()}` : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {lead.next_follow_up ? new Date(lead.next_follow_up).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(lead.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/leads/${lead.id}`}
                      className="text-[#B8956A] hover:underline text-sm"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Lead Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => { setShowAddModal(false); setAddLeadError(null); }}
          role="presentation"
        >
          <div
            className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-lead-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="add-lead-title" className="text-lg font-semibold mb-4">Add New Lead</h2>
            {addLeadError && (
              <div className="mb-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">
                {addLeadError}
              </div>
            )}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                <input type="text" value={newLead.company_name} onChange={e => setNewLead({...newLead, company_name: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#B8956A]/30" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person *</label>
                <input type="text" value={newLead.contact_person} onChange={e => setNewLead({...newLead, contact_person: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#B8956A]/30" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input type="email" value={newLead.email} onChange={e => setNewLead({...newLead, email: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#B8956A]/30" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input type="text" value={newLead.phone} onChange={e => setNewLead({...newLead, phone: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#B8956A]/30" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                  <input type="text" value={newLead.country} onChange={e => setNewLead({...newLead, country: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#B8956A]/30" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                  <select value={newLead.source} onChange={e => setNewLead({...newLead, source: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#B8956A]/30">
                    {SOURCE_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Est. Value ($)</label>
                  <input type="number" value={newLead.estimated_value} onChange={e => setNewLead({...newLead, estimated_value: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#B8956A]/30" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Products Interest</label>
                <input type="text" value={newLead.products_interest} onChange={e => setNewLead({...newLead, products_interest: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#B8956A]/30" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={newLead.notes} onChange={e => setNewLead({...newLead, notes: e.target.value})} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#B8956A]/30" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => { setShowAddModal(false); setAddLeadError(null); }} className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={handleAddLead} disabled={!newLead.company_name || !newLead.contact_person || !newLead.email} className="px-4 py-2 bg-[#B8956A] text-white rounded-md text-sm hover:bg-[#a07d55] disabled:opacity-50">Add Lead</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
