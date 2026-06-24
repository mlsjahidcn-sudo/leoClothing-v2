'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Package, FileText, Users, DollarSign, ArrowRight, Clock, AlertCircle, CheckCircle2, XCircle, UserCheck, Handshake, TrendingUp, RefreshCw } from 'lucide-react';
import { adminFetch } from '@/lib/admin-fetch';
import { usePollingFetch, stableStringify } from '@/hooks/use-polling-fetch';

interface DashboardData {
  totalProducts: number;
  totalCategories: number;
  totalRfqs: number;
  rfqCounts: Record<string, number>;
  totalLeads: number;
  leadCounts: Record<string, number>;
  totalLeadValue: number;
  recentRfqs: Array<{
    id: string;
    company_name: string;
    contact_person: string;
    email: string;
    status: string;
    created_at: string;
  }>;
  recentLeads: Array<{
    id: string;
    company_name: string;
    contact_person: string;
    email: string;
    status: string;
    estimated_value: number | null;
    created_at: string;
  }>;
}

const rfqStatusConfig: Record<string, { label: string; color: string; icon: typeof AlertCircle }> = {
  new: { label: 'New', color: 'bg-blue-50 text-blue-700', icon: AlertCircle },
  reviewing: { label: 'Reviewing', color: 'bg-yellow-50 text-yellow-700', icon: Clock },
  quoted: { label: 'Quoted', color: 'bg-green-50 text-green-700', icon: CheckCircle2 },
  closed: { label: 'Closed', color: 'bg-gray-100 text-gray-500', icon: XCircle },
};

const leadStatusConfig: Record<string, { label: string; color: string; icon: typeof AlertCircle }> = {
  new: { label: 'New', color: 'bg-blue-50 text-blue-700', icon: AlertCircle },
  contacted: { label: 'Contacted', color: 'bg-indigo-50 text-indigo-700', icon: UserCheck },
  qualified: { label: 'Qualified', color: 'bg-cyan-50 text-cyan-700', icon: TrendingUp },
  proposal: { label: 'Proposal', color: 'bg-purple-50 text-purple-700', icon: FileText },
  negotiation: { label: 'Negotiation', color: 'bg-yellow-50 text-yellow-700', icon: Handshake },
  won: { label: 'Won', color: 'bg-green-50 text-green-700', icon: CheckCircle2 },
  lost: { label: 'Lost', color: 'bg-red-50 text-red-700', icon: XCircle },
};

export default function AdminDashboardPage() {
  // Poll every 30s. Pause on tab blur so a backgrounded admin tab
  // doesn't burn Supabase quota. Bump "last updated" only when the
  // data actually changes (otherwise the pill says "0s ago" forever).
  // Tick state forces a re-render every second so the "Updated Xs ago"
  // pill actually increments. Without this the value freezes at whatever
  // time React last painted — the original code computed Date.now() in
  // render but the render only re-fires on data change, not on time.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const { data, loading, lastUpdated, refresh } = usePollingFetch<DashboardData>({
    fetcher: async () => {
      const res = await adminFetch('/api/admin/dashboard');
      if (!res.ok) throw new Error(`Dashboard fetch failed: ${res.status}`);
      return res.json();
    },
    intervalMs: 30_000,
    compare: (a, b) => stableStringify(a) === stableStringify(b),
  });

  if (loading && !data) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 bg-gray-200 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return <div>Failed to load dashboard</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          {lastUpdated && (
            <span>
              {/* eslint-disable-next-line react-hooks/purity -- setTick above forces
                  a re-render every second so Date.now() updates correctly. */}
              Updated {Math.max(0, Math.floor((Date.now() - lastUpdated) / 1000))}s ago
            </span>
          )}
          <button
            onClick={refresh}
            className="inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
            title="Refresh now"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Products</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">{data.totalProducts}</p>
            </div>
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-gray-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total RFQs</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">{data.totalRfqs}</p>
            </div>
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-gray-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Leads</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">{data.totalLeads}</p>
            </div>
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-gray-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pipeline Value</p>
              <p className="text-2xl font-semibold text-green-700 mt-1">${(data.totalLeadValue ?? 0).toLocaleString()}</p>
            </div>
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lead Pipeline */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-gray-900">Lead Pipeline</h2>
            <Link
              href="/admin/leads"
              className="text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1 transition-colors"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {(['new', 'contacted', 'qualified', 'proposal'] as const).map((key) => {
              const config = leadStatusConfig[key];
              return (
                <div key={key} className={`${config.color} rounded-lg p-3 text-center`}>
                  <p className="text-xl font-semibold">{data.leadCounts[key] || 0}</p>
                  <p className="text-xs font-medium mt-0.5">{config.label}</p>
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {(['negotiation', 'won', 'lost'] as const).map((key) => {
              const config = leadStatusConfig[key];
              return (
                <div key={key} className={`${config.color} rounded-lg p-3 text-center`}>
                  <p className="text-xl font-semibold">{data.leadCounts[key] || 0}</p>
                  <p className="text-xs font-medium mt-0.5">{config.label}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* RFQ Status Overview */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-gray-900">RFQ Status Overview</h2>
            <Link
              href="/admin/rfqs"
              className="text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1 transition-colors"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(rfqStatusConfig).map(([key, config]) => (
              <div key={key} className={`${config.color} rounded-lg p-3 text-center`}>
                <p className="text-2xl font-semibold">{data.rfqCounts[key] || 0}</p>
                <p className="text-xs font-medium mt-0.5">{config.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Leads */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-900">Recent Leads</h2>
            <Link
              href="/admin/leads"
              className="text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1 transition-colors"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {data.recentLeads.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400">No leads yet</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {data.recentLeads.map((lead) => {
                const sc = leadStatusConfig[lead.status] || leadStatusConfig.new;
                return (
                  <Link
                    key={lead.id}
                    href={`/admin/leads/${lead.id}`}
                    className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600">
                        {(lead.company_name || 'U')[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{lead.company_name}</p>
                        <p className="text-xs text-gray-500">{lead.contact_person}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {lead.estimated_value && (
                        <span className="text-xs font-medium text-green-700">
                          ${Number(lead.estimated_value).toLocaleString()}
                        </span>
                      )}
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${sc.color}`}>
                        {sc.label}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent RFQs */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-900">Recent RFQs</h2>
            <Link
              href="/admin/rfqs"
              className="text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1 transition-colors"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {data.recentRfqs.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400">No RFQs yet</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {data.recentRfqs.map((rfq) => {
                const sc = rfqStatusConfig[rfq.status] || rfqStatusConfig.new;
                return (
                  <Link
                    key={rfq.id}
                    href={`/admin/rfqs/${rfq.id}`}
                    className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600">
                        {(rfq.company_name || 'U')[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{rfq.company_name}</p>
                        <p className="text-xs text-gray-500">{rfq.contact_person}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${sc.color}`}>
                        {sc.label}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(rfq.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
