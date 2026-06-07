'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { adminFetch } from '@/lib/admin-fetch';

interface RfqRow {
  id: string;
  company_name: string;
  contact_person: string;
  email: string;
  phone: string | null;
  country: string | null;
  business_type: string | null;
  quantity_range: string | null;
  status: string;
  created_at: string;
  rfq_items: Array<{
    id: number;
    product_id: string;
    quantity: number | null;
    notes: string | null;
    products: { name: string; sku: string } | null;
  }>;
}

const statusTabs = [
  { key: 'all', label: 'All' },
  { key: 'new', label: 'New', icon: AlertCircle, color: 'text-blue-600' },
  { key: 'reviewing', label: 'Reviewing', icon: Clock, color: 'text-yellow-600' },
  { key: 'quoted', label: 'Quoted', icon: CheckCircle2, color: 'text-green-600' },
  { key: 'closed', label: 'Closed', icon: XCircle, color: 'text-gray-500' },
];

const statusColors: Record<string, string> = {
  new: 'bg-blue-50 text-blue-700',
  reviewing: 'bg-yellow-50 text-yellow-700',
  quoted: 'bg-green-50 text-green-700',
  closed: 'bg-gray-100 text-gray-500',
};

export default function AdminRfqsPage() {
  const [rfqs, setRfqs] = useState<RfqRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState('all');

  useEffect(() => {
    setLoading(true);
    const params = activeStatus !== 'all' ? `?status=${activeStatus}` : '';
    adminFetch(`/api/admin/rfqs${params}`)
      .then((r) => r.json())
      .then((d) => setRfqs(d.rfqs || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeStatus]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">RFQs</h1>

      {/* Status tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {statusTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveStatus(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeStatus === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.icon && <tab.icon className="w-3.5 h-3.5" />}
            {tab.label}
          </button>
        ))}
      </div>

      {/* RFQ list */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="px-5 py-8 text-center text-sm text-gray-400">Loading...</div>
        ) : rfqs.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-gray-400">No RFQs found</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {rfqs.map((rfq) => (
              <Link
                key={rfq.id}
                href={`/admin/rfqs/${rfq.id}`}
                className="px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-600 flex-shrink-0">
                    {(rfq.company_name || 'U')[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{rfq.company_name}</p>
                    <p className="text-xs text-gray-500">
                      {rfq.contact_person} · {rfq.email}
                      {rfq.country && ` · ${rfq.country}`}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {rfq.rfq_items?.length || 0} item(s)
                      {rfq.quantity_range && ` · Qty: ${rfq.quantity_range}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[rfq.status] || statusColors.new}`}>
                    {rfq.status.charAt(0).toUpperCase() + rfq.status.slice(1)}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(rfq.created_at).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
