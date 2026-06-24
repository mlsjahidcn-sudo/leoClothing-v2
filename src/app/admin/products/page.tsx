'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';
import { adminFetch } from '@/lib/admin-fetch';
import { useDebouncedValue } from '@/hooks/use-debounced-value';

interface ProductRow {
  id: string;
  name: string;
  sku: string;
  wholesale_price: string;
  moq: number;
  is_active: boolean;
  is_featured: boolean;
  is_new: boolean;
  categories: { slug: string; label: string } | null;
  product_images: { url: string; sort_order: number }[];
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  // Debounce the search so a 5-char query is 1 API call, not 5.
  const debouncedSearch = useDebouncedValue(search, 300);

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (categoryFilter) params.set('category', categoryFilter);

    setLoading(true);
    adminFetch(`/api/admin/products?${params.toString()}`)
      .then((res) => res.json())
      .then((d) => setProducts(d.products || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [debouncedSearch, categoryFilter]);

  /**
   * Deactivate (soft delete) a product. Sets is_active=false; the row
   * disappears from the public site immediately and is hidden from this
   * list view too, so the admin gets visual feedback. The DB row stays
   * (so the SKU / history isn't lost); flip is_active=true via Edit to
   * bring it back.
   */
  const handleDeactivate = async (id: string) => {
    if (!confirm('Deactivate this product? It will be hidden from the public site but kept in the admin.')) return;
    const res = await adminFetch(`/api/admin/products/${id}`, { method: 'DELETE' });
    if (res.ok) {
      // Optimistic: drop from the list. If the user wants the row back
      // they can flip is_active=true via the Edit page.
      setProducts((prev) => prev.filter((p) => p.id !== id));
      return;
    }
    // Without this branch the user clicks trash, nothing happens,
    // nothing is logged — they assume the action didn't take.
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    alert(`Failed to deactivate: ${err.error ?? res.statusText ?? 'Unknown error'}`);
  };

  /**
   * Permanently delete a product. Two-step confirmation because this
   * removes the row + sub-table rows + storage files for good. Use
   * only when a product was added by mistake or has no sales history.
   */
  const handleHardDelete = async (id: string, name: string) => {
    if (!confirm(`PERMANENTLY delete "${name}"? This removes the product, all its images from storage, and cannot be undone.`)) return;
    if (!confirm('Last warning: this is irreversible. Continue?')) return;
    const res = await adminFetch(`/api/admin/products/${id}?hard=true`, { method: 'DELETE' });
    if (res.ok) {
      setProducts((prev) => prev.filter((p) => p.id !== id));
      const body = (await res.json().catch(() => ({}))) as { storageRemoved?: number; storageError?: string };
      const tail = body.storageError
        ? ` (storage cleanup warning: ${body.storageError})`
        : '';
      alert(`Product permanently deleted. ${body.storageRemoved ?? 0} image file(s) removed from storage.${tail}`);
      return;
    }
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    alert(`Failed to delete: ${err.error ?? res.statusText ?? 'Unknown error'}`);
  };

  // Optimistic toggle: flip the badge instantly, roll back on failure.
  // The PATCH endpoint only updates the boolean, so it's cheap and
  // safe to fire-and-forget from the UI's perspective.
  const handleToggleActive = async (id: string, next: boolean) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, is_active: next } : p)),
    );
    const res = await adminFetch(`/api/admin/products/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: next }),
    });
    if (!res.ok) {
      // Roll back on failure and surface a non-blocking error.
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, is_active: !next } : p)),
      );
      const err = await res.json().catch(() => ({}));
      alert(`Failed to update: ${err.error ?? res.statusText}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Products</h1>
        <Link
          href="/admin/products/new"
          className="inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
        >
          <option value="">All Categories</option>
          <option value="polos">Knit Polos</option>
          <option value="t-shirts">T-Shirts</option>
          <option value="striped-tees">Striped Tees</option>
          <option value="knitwear">Knitwear</option>
        </select>
      </div>

      {/* Product table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Product</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Category</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Price</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">MOQ</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Status</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-sm text-gray-400">
                    Loading...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-sm text-gray-400">
                    No products found
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-gray-100 overflow-hidden flex-shrink-0">
                          {p.product_images?.[0]?.url ? (
                            <img
                              src={p.product_images[0].url}
                              alt={p.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                              <Eye className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{p.name}</p>
                          <p className="text-xs text-gray-400">{p.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-sm text-gray-600">{p.categories?.label || '-'}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-sm font-medium text-gray-900">${p.wholesale_price}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-sm text-gray-600">{p.moq}</span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(p.id, !p.is_active)}
                          className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium transition-opacity hover:opacity-70 ${
                            p.is_active
                              ? 'bg-green-50 text-green-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                          title={p.is_active ? 'Click to deactivate' : 'Click to activate'}
                        >
                          {p.is_active ? 'Active' : 'Inactive'}
                        </button>
                        {p.is_featured && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium">
                            Featured
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/admin/products/${p.id}`}
                          className="p-1.5 text-gray-400 hover:text-gray-900 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDeactivate(p.id)}
                          className="p-1.5 text-gray-400 hover:text-amber-600 transition-colors"
                          title="Deactivate (hide from public site)"
                        >
                          {/* EyeOff signals "stop showing" — distinct from delete */}
                          <EyeOff className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleHardDelete(p.id, p.name)}
                          className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete permanently"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
