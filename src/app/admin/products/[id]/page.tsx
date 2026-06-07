'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Trash2, Plus, X } from 'lucide-react';
import { adminFetch } from '@/lib/admin-fetch';

interface ProductDetail {
  id: string;
  name: string;
  series: string;
  sku: string;
  wholesale_price: string;
  moq: number;
  lead_time: string;
  packaging: string;
  description: string;
  care_instructions: string;
  is_new: boolean;
  is_featured: boolean;
  is_active: boolean;
  category_id: number;
  categories: { slug: string; label: string } | null;
  product_images: { id: number; url: string; sort_order: number }[];
  product_bulk_pricing: { id: number; min_qty: number; max_qty: number | null; unit_price: string }[];
  product_colors: { id: number; name: string; hex: string }[];
  product_sizes: { id: number; size_label: string; sort_order: number }[];
  product_size_chart: { id: number; size: string; chest: number; waist: number; hip: number; length: number; sleeve: number }[];
  product_materials: { id: number; fabric: string; lining: string; craft: string }[];
  product_design_details: { id: number; detail_text: string; sort_order: number }[];
  product_certifications: { id: number; cert_name: string }[];
}

interface Category {
  id: number;
  slug: string;
  label: string;
}

const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent';
const smallInputCls = 'px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent';

export default function AdminProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'pricing' | 'images' | 'specs'>('basic');

  useEffect(() => {
    Promise.all([
      adminFetch(`/api/admin/products/${id}`).then((r) => r.json()),
      fetch('/api/categories').then((r) => r.json()),
    ])
      .then(([prodData, catData]) => {
        if (prodData.product) setProduct(prodData.product);
        setCategories(catData.categories || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const updateProduct = useCallback((updates: Partial<ProductDetail>) => {
    setProduct((prev) => prev ? { ...prev, ...updates } : prev);
  }, []);

  const handleSave = async () => {
    if (!product) return;
    setSaving(true);
    try {
      const res = await adminFetch(`/api/admin/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: product.name,
          series: product.series,
          sku: product.sku,
          wholesale_price: product.wholesale_price,
          moq: product.moq,
          lead_time: product.lead_time,
          packaging: product.packaging,
          description: product.description,
          care_instructions: product.care_instructions,
          is_new: product.is_new,
          is_featured: product.is_featured,
          is_active: product.is_active,
          category_id: product.category_id,
          bulk_pricing: product.product_bulk_pricing.map(({ min_qty, max_qty, unit_price }) => ({ min_qty, max_qty, unit_price })),
          colors: product.product_colors.map(({ name, hex }) => ({ name, hex })),
          sizes: product.product_sizes.map(({ size_label, sort_order }) => ({ size_label, sort_order })),
          size_chart: product.product_size_chart.map(({ size, chest, waist, hip, length, sleeve }) => ({ size, chest, waist, hip, length, sleeve })),
          materials: product.product_materials.map(({ fabric, lining, craft }) => ({ fabric, lining, craft })),
          design_details: product.product_design_details.map(({ detail_text, sort_order }) => ({ detail_text, sort_order })),
          certifications: product.product_certifications.map(({ cert_name }) => ({ cert_name })),
          images: product.product_images.map(({ url, sort_order }) => ({ url, sort_order })),
        }),
      });
      if (res.ok) {
        // Refresh data from server
        const freshData = await adminFetch(`/api/admin/products/${id}`).then((r) => r.json());
        if (freshData.product) setProduct(freshData.product);
        alert('Product saved successfully');
      } else {
        const err = await res.json();
        alert('Failed to save: ' + (err.error || 'Unknown error'));
      }
    } catch {
      alert('Network error');
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm('Deactivate this product?')) return;
    const res = await adminFetch(`/api/admin/products/${id}`, { method: 'DELETE' });
    if (res.ok) {
      router.push('/admin/products');
    }
  };

  if (loading) {
    return <div className="animate-pulse text-gray-400">Loading product...</div>;
  }

  if (!product) {
    return <div className="text-red-600">Product not found</div>;
  }

  const tabs = [
    { key: 'basic' as const, label: 'Basic Info' },
    { key: 'pricing' as const, label: 'Pricing & Options' },
    { key: 'images' as const, label: 'Images' },
    { key: 'specs' as const, label: 'Specifications' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/products" className="p-2 -ml-2 text-gray-400 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{product.name}</h1>
            <p className="text-sm text-gray-500">{product.sku} · {product.categories?.label}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Deactivate
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 bg-gray-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Basic Info Tab */}
      {activeTab === 'basic' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
              <input type="text" value={product.name} onChange={(e) => updateProduct({ name: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
              <input type="text" value={product.sku} onChange={(e) => updateProduct({ sku: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Series</label>
              <input type="text" value={product.series} onChange={(e) => updateProduct({ series: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={product.category_id}
                onChange={(e) => updateProduct({ category_id: Number(e.target.value) })}
                className={inputCls}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Wholesale Price ($)</label>
              <input type="text" value={product.wholesale_price} onChange={(e) => updateProduct({ wholesale_price: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">MOQ</label>
              <input type="number" value={product.moq} onChange={(e) => updateProduct({ moq: Number(e.target.value) })} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lead Time</label>
              <input type="text" value={product.lead_time} onChange={(e) => updateProduct({ lead_time: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Packaging</label>
              <input type="text" value={product.packaging} onChange={(e) => updateProduct({ packaging: e.target.value })} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={product.description} onChange={(e) => updateProduct({ description: e.target.value })} rows={4} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Care Instructions</label>
            <textarea value={product.care_instructions} onChange={(e) => updateProduct({ care_instructions: e.target.value })} rows={3} className={inputCls} />
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={product.is_active} onChange={(e) => updateProduct({ is_active: e.target.checked })} className="rounded border-gray-300" />
              Active
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={product.is_featured} onChange={(e) => updateProduct({ is_featured: e.target.checked })} className="rounded border-gray-300" />
              Featured
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={product.is_new} onChange={(e) => updateProduct({ is_new: e.target.checked })} className="rounded border-gray-300" />
              New Arrival
            </label>
          </div>
        </div>
      )}

      {/* Pricing & Options Tab */}
      {activeTab === 'pricing' && (
        <div className="space-y-6">
          {/* Bulk Pricing Tiers */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-gray-900">Bulk Pricing Tiers</h2>
              <button
                onClick={() => updateProduct({
                  product_bulk_pricing: [...product.product_bulk_pricing, { id: Date.now(), min_qty: 0, max_qty: null, unit_price: '0' }]
                })}
                className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900"
              >
                <Plus className="w-3.5 h-3.5" /> Add Tier
              </button>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-3 py-2">Min Qty</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-3 py-2">Max Qty</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-3 py-2">Unit Price ($)</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {product.product_bulk_pricing.map((tier, idx) => (
                  <tr key={tier.id}>
                    <td className="px-3 py-2">
                      <input type="number" value={tier.min_qty} onChange={(e) => {
                        const updated = [...product.product_bulk_pricing];
                        updated[idx] = { ...updated[idx], min_qty: Number(e.target.value) };
                        updateProduct({ product_bulk_pricing: updated });
                      }} className={`${smallInputCls} w-24`} />
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" value={tier.max_qty ?? ''} placeholder="∞" onChange={(e) => {
                        const updated = [...product.product_bulk_pricing];
                        updated[idx] = { ...updated[idx], max_qty: e.target.value ? Number(e.target.value) : null };
                        updateProduct({ product_bulk_pricing: updated });
                      }} className={`${smallInputCls} w-24`} />
                    </td>
                    <td className="px-3 py-2">
                      <input type="text" value={tier.unit_price} onChange={(e) => {
                        const updated = [...product.product_bulk_pricing];
                        updated[idx] = { ...updated[idx], unit_price: e.target.value };
                        updateProduct({ product_bulk_pricing: updated });
                      }} className={`${smallInputCls} w-24`} />
                    </td>
                    <td className="px-3 py-2">
                      <button onClick={() => {
                        updateProduct({ product_bulk_pricing: product.product_bulk_pricing.filter((_, i) => i !== idx) });
                      }} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Colors */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-gray-900">Available Colors</h2>
              <button
                onClick={() => updateProduct({
                  product_colors: [...product.product_colors, { id: Date.now(), name: 'New Color', hex: '#000000' }]
                })}
                className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900"
              >
                <Plus className="w-3.5 h-3.5" /> Add Color
              </button>
            </div>
            <div className="space-y-2">
              {product.product_colors.map((c, idx) => (
                <div key={c.id} className="flex items-center gap-3">
                  <input type="color" value={c.hex} onChange={(e) => {
                    const updated = [...product.product_colors];
                    updated[idx] = { ...updated[idx], hex: e.target.value };
                    updateProduct({ product_colors: updated });
                  }} className="w-8 h-8 rounded border border-gray-300 cursor-pointer" />
                  <input type="text" value={c.name} onChange={(e) => {
                    const updated = [...product.product_colors];
                    updated[idx] = { ...updated[idx], name: e.target.value };
                    updateProduct({ product_colors: updated });
                  }} className={`${smallInputCls} flex-1`} placeholder="Color name" />
                  <button onClick={() => {
                    updateProduct({ product_colors: product.product_colors.filter((_, i) => i !== idx) });
                  }} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </div>

          {/* Sizes */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-gray-900">Available Sizes</h2>
              <button
                onClick={() => updateProduct({
                  product_sizes: [...product.product_sizes, { id: Date.now(), size_label: '', sort_order: product.product_sizes.length }]
                })}
                className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900"
              >
                <Plus className="w-3.5 h-3.5" /> Add Size
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {product.product_sizes.map((s, idx) => (
                <div key={s.id} className="flex items-center gap-1">
                  <input type="text" value={s.size_label} onChange={(e) => {
                    const updated = [...product.product_sizes];
                    updated[idx] = { ...updated[idx], size_label: e.target.value };
                    updateProduct({ product_sizes: updated });
                  }} className={`${smallInputCls} w-16`} placeholder="Size" />
                  <button onClick={() => {
                    updateProduct({ product_sizes: product.product_sizes.filter((_, i) => i !== idx) });
                  }} className="text-gray-400 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Images Tab */}
      {activeTab === 'images' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-900">Product Images</h2>
            <button
              onClick={() => updateProduct({
                product_images: [...product.product_images, { id: Date.now(), url: '/products/placeholder.jpg', sort_order: product.product_images.length }]
              })}
              className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900"
            >
              <Plus className="w-3.5 h-3.5" /> Add Image
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {product.product_images.map((img, idx) => (
              <div key={img.id} className="space-y-2">
                <div className="aspect-[3/4] rounded-md overflow-hidden bg-gray-100 relative group">
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => updateProduct({ product_images: product.product_images.filter((_, i) => i !== idx) })}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <input type="text" value={img.url} onChange={(e) => {
                  const updated = [...product.product_images];
                  updated[idx] = { ...updated[idx], url: e.target.value };
                  updateProduct({ product_images: updated });
                }} className={`${smallInputCls} w-full`} placeholder="/products/image.jpg" />
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500">Order:</label>
                  <input type="number" value={img.sort_order} onChange={(e) => {
                    const updated = [...product.product_images];
                    updated[idx] = { ...updated[idx], sort_order: Number(e.target.value) };
                    updateProduct({ product_images: updated });
                  }} className={`${smallInputCls} w-16`} />
                </div>
              </div>
            ))}
          </div>
          {product.product_images.length === 0 && (
            <p className="text-sm text-gray-400">No images. Click &quot;Add Image&quot; to add one.</p>
          )}
        </div>
      )}

      {/* Specs Tab */}
      {activeTab === 'specs' && (
        <div className="space-y-6">
          {/* Material */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-sm font-medium text-gray-900 mb-3">Material</h2>
            {product.product_materials.map((m, idx) => (
              <div key={m.id} className="grid grid-cols-3 gap-3 mb-2">
                <input type="text" value={m.fabric} placeholder="Fabric" onChange={(e) => {
                  const updated = [...product.product_materials];
                  updated[idx] = { ...updated[idx], fabric: e.target.value };
                  updateProduct({ product_materials: updated });
                }} className={smallInputCls} />
                <input type="text" value={m.lining} placeholder="Lining" onChange={(e) => {
                  const updated = [...product.product_materials];
                  updated[idx] = { ...updated[idx], lining: e.target.value };
                  updateProduct({ product_materials: updated });
                }} className={smallInputCls} />
                <div className="flex items-center gap-1">
                  <input type="text" value={m.craft} placeholder="Craft" onChange={(e) => {
                    const updated = [...product.product_materials];
                    updated[idx] = { ...updated[idx], craft: e.target.value };
                    updateProduct({ product_materials: updated });
                  }} className={`${smallInputCls} flex-1`} />
                  <button onClick={() => {
                    updateProduct({ product_materials: product.product_materials.filter((_, i) => i !== idx) });
                  }} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
            <button onClick={() => updateProduct({
              product_materials: [...product.product_materials, { id: Date.now(), fabric: '', lining: '', craft: '' }]
            })} className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 mt-2">
              <Plus className="w-3.5 h-3.5" /> Add Material
            </button>
          </div>

          {/* Size chart */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-gray-900">Size Chart</h2>
              <button onClick={() => updateProduct({
                product_size_chart: [...product.product_size_chart, { id: Date.now(), size: '', chest: 0, waist: 0, hip: 0, length: 0, sleeve: 0 }]
              })} className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900">
                <Plus className="w-3.5 h-3.5" /> Add Size
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-xs font-medium text-gray-500 px-2 py-1">Size</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-2 py-1">Chest</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-2 py-1">Waist</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-2 py-1">Hip</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-2 py-1">Length</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-2 py-1">Sleeve</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {product.product_size_chart.map((sc, idx) => (
                    <tr key={sc.id}>
                      <td className="px-2 py-1"><input type="text" value={sc.size} onChange={(e) => {
                        const updated = [...product.product_size_chart];
                        updated[idx] = { ...updated[idx], size: e.target.value };
                        updateProduct({ product_size_chart: updated });
                      }} className={`${smallInputCls} w-14`} /></td>
                      <td className="px-2 py-1"><input type="number" value={sc.chest} onChange={(e) => {
                        const updated = [...product.product_size_chart];
                        updated[idx] = { ...updated[idx], chest: Number(e.target.value) };
                        updateProduct({ product_size_chart: updated });
                      }} className={`${smallInputCls} w-16`} /></td>
                      <td className="px-2 py-1"><input type="number" value={sc.waist} onChange={(e) => {
                        const updated = [...product.product_size_chart];
                        updated[idx] = { ...updated[idx], waist: Number(e.target.value) };
                        updateProduct({ product_size_chart: updated });
                      }} className={`${smallInputCls} w-16`} /></td>
                      <td className="px-2 py-1"><input type="number" value={sc.hip} onChange={(e) => {
                        const updated = [...product.product_size_chart];
                        updated[idx] = { ...updated[idx], hip: Number(e.target.value) };
                        updateProduct({ product_size_chart: updated });
                      }} className={`${smallInputCls} w-16`} /></td>
                      <td className="px-2 py-1"><input type="number" value={sc.length} onChange={(e) => {
                        const updated = [...product.product_size_chart];
                        updated[idx] = { ...updated[idx], length: Number(e.target.value) };
                        updateProduct({ product_size_chart: updated });
                      }} className={`${smallInputCls} w-16`} /></td>
                      <td className="px-2 py-1"><input type="number" value={sc.sleeve} onChange={(e) => {
                        const updated = [...product.product_size_chart];
                        updated[idx] = { ...updated[idx], sleeve: Number(e.target.value) };
                        updateProduct({ product_size_chart: updated });
                      }} className={`${smallInputCls} w-16`} /></td>
                      <td className="px-2 py-1">
                        <button onClick={() => {
                          updateProduct({ product_size_chart: product.product_size_chart.filter((_, i) => i !== idx) });
                        }} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Design details */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-gray-900">Design Details</h2>
              <button onClick={() => updateProduct({
                product_design_details: [...product.product_design_details, { id: Date.now(), detail_text: '', sort_order: product.product_design_details.length }]
              })} className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900">
                <Plus className="w-3.5 h-3.5" /> Add Detail
              </button>
            </div>
            <div className="space-y-2">
              {product.product_design_details.map((d, idx) => (
                <div key={d.id} className="flex items-center gap-2">
                  <input type="text" value={d.detail_text} onChange={(e) => {
                    const updated = [...product.product_design_details];
                    updated[idx] = { ...updated[idx], detail_text: e.target.value };
                    updateProduct({ product_design_details: updated });
                  }} className={`${smallInputCls} flex-1`} placeholder="Design detail" />
                  <button onClick={() => {
                    updateProduct({ product_design_details: product.product_design_details.filter((_, i) => i !== idx) });
                  }} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </div>

          {/* Certifications */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-gray-900">Certifications</h2>
              <button onClick={() => updateProduct({
                product_certifications: [...product.product_certifications, { id: Date.now(), cert_name: '' }]
              })} className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900">
                <Plus className="w-3.5 h-3.5" /> Add Certification
              </button>
            </div>
            <div className="space-y-2">
              {product.product_certifications.map((c, idx) => (
                <div key={c.id} className="flex items-center gap-2">
                  <input type="text" value={c.cert_name} onChange={(e) => {
                    const updated = [...product.product_certifications];
                    updated[idx] = { ...updated[idx], cert_name: e.target.value };
                    updateProduct({ product_certifications: updated });
                  }} className={`${smallInputCls} flex-1`} placeholder="Certification name" />
                  <button onClick={() => {
                    updateProduct({ product_certifications: product.product_certifications.filter((_, i) => i !== idx) });
                  }} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
