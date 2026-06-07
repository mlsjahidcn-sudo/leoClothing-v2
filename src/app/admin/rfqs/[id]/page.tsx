'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Mail, Phone, MapPin, Building2 } from 'lucide-react';
import { adminFetch } from '@/lib/admin-fetch';

interface RfqDetail {
  id: string;
  company_name: string;
  contact_person: string;
  email: string;
  phone: string | null;
  country: string | null;
  business_type: string | null;
  quantity_range: string | null;
  customization: Record<string, unknown> | null;
  message: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
  rfq_items: Array<{
    id: number;
    product_id: string;
    quantity: number | null;
    notes: string | null;
    products: {
      id: string;
      name: string;
      sku: string;
      product_images: { url: string; sort_order: number }[];
    } | null;
  }>;
}

const statusColors: Record<string, string> = {
  new: 'bg-blue-50 text-blue-700 border-blue-200',
  reviewing: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  quoted: 'bg-green-50 text-green-700 border-green-200',
  closed: 'bg-gray-100 text-gray-500 border-gray-200',
};

const statusFlow = ['new', 'reviewing', 'quoted', 'closed'];

export default function AdminRfqDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [rfq, setRfq] = useState<RfqDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [internalNotes, setInternalNotes] = useState('');

  useEffect(() => {
    adminFetch(`/api/admin/rfqs/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.rfq) {
          setRfq(d.rfq);
          setInternalNotes(d.rfq.notes || '');
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleStatusChange = async (newStatus: string) => {
    if (!rfq) return;
    setUpdatingStatus(true);
    try {
      const res = await adminFetch(`/api/admin/rfqs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setRfq({ ...rfq, status: newStatus });
      }
    } catch {
      alert('Failed to update status');
    }
    setUpdatingStatus(false);
  };

  const handleSaveNotes = async () => {
    if (!rfq) return;
    try {
      await adminFetch(`/api/admin/rfqs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: internalNotes }),
      });
      setRfq({ ...rfq, notes: internalNotes });
      alert('Notes saved');
    } catch {
      alert('Failed to save notes');
    }
  };

  if (loading) {
    return <div className="animate-pulse text-gray-400">Loading RFQ...</div>;
  }

  if (!rfq) {
    return <div className="text-red-600">RFQ not found</div>;
  }

  const currentStatusIndex = statusFlow.indexOf(rfq.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/rfqs" className="p-2 -ml-2 text-gray-400 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">RFQ #{rfq.id}</h1>
            <p className="text-sm text-gray-500">{rfq.company_name} · {new Date(rfq.created_at).toLocaleDateString()}</p>
          </div>
        </div>
        <span className={`text-sm px-3 py-1 rounded-full font-medium border ${statusColors[rfq.status] || statusColors.new}`}>
          {rfq.status.charAt(0).toUpperCase() + rfq.status.slice(1)}
        </span>
      </div>

      {/* Status workflow */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-sm font-medium text-gray-900 mb-3">Status</h2>
        <div className="flex items-center gap-2">
          {statusFlow.map((s, i) => (
            <button
              key={s}
              onClick={() => handleStatusChange(s)}
              disabled={updatingStatus}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                i <= currentStatusIndex
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Company info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="text-sm font-medium text-gray-900 mb-4">Company Information</h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Building2 className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{rfq.company_name}</p>
                  {rfq.business_type && <p className="text-xs text-gray-500">{rfq.business_type}</p>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-gray-400" />
                <a href={`mailto:${rfq.email}`} className="text-sm text-blue-600 hover:underline">{rfq.email}</a>
              </div>
              {rfq.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-700">{rfq.phone}</span>
                </div>
              )}
              {rfq.country && (
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-700">{rfq.country}</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="text-sm font-medium text-gray-900 mb-3">Requirements</h2>
            <div className="space-y-2">
              {rfq.quantity_range && (
                <div className="text-sm">
                  <span className="text-gray-500">Quantity:</span>{' '}
                  <span className="text-gray-900">{rfq.quantity_range}</span>
                </div>
              )}
              {rfq.customization && Object.keys(rfq.customization).length > 0 && (
                <div className="text-sm">
                  <span className="text-gray-500">Customization:</span>{' '}
                  <span className="text-gray-900">{Object.values(rfq.customization).filter(Boolean).join(', ')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Internal notes */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="text-sm font-medium text-gray-900 mb-3">Internal Notes</h2>
            <textarea
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              placeholder="Add internal notes..."
            />
            <button
              onClick={handleSaveNotes}
              className="mt-2 text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-md hover:bg-gray-200 transition-colors"
            >
              Save Notes
            </button>
          </div>
        </div>

        {/* Right: Requested items + message */}
        <div className="lg:col-span-2 space-y-6">
          {/* Requested products */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="text-sm font-medium text-gray-900 mb-4">Requested Products</h2>
            {rfq.rfq_items.length === 0 ? (
              <p className="text-sm text-gray-400">No specific products requested</p>
            ) : (
              <div className="space-y-3">
                {rfq.rfq_items.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-md">
                    <div className="w-12 h-14 bg-gray-200 rounded overflow-hidden flex-shrink-0">
                      {item.products?.product_images?.[0]?.url ? (
                        <img src={item.products.product_images[0].url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">No img</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/admin/products/${item.product_id}`}
                        className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors"
                      >
                        {item.products?.name || 'Unknown Product'}
                      </Link>
                      <p className="text-xs text-gray-400">{item.products?.sku}</p>
                    </div>
                    {item.quantity && (
                      <span className="text-sm text-gray-600">Qty: {item.quantity}</span>
                    )}
                    {item.notes && (
                      <span className="text-xs text-gray-400 max-w-[200px] truncate">{item.notes}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Message */}
          {rfq.message && (
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <h2 className="text-sm font-medium text-gray-900 mb-3">Message</h2>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{rfq.message}</p>
            </div>
          )}

          {/* Contact person */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="text-sm font-medium text-gray-900 mb-3">Contact Person</h2>
            <p className="text-sm text-gray-900">{rfq.contact_person}</p>
            <p className="text-sm text-gray-500">{rfq.email}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
