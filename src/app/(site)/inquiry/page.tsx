'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Product, Category } from '@/lib/products';

interface FormData {
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  country: string;
  businessType: string;
  selectedProducts: string[];
  quantityRange: string;
  customization: string[];
  message: string;
}

export default function InquiryPage() {
  const [formData, setFormData] = useState<FormData>({
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    country: '',
    businessType: '',
    selectedProducts: [],
    quantityRange: '',
    customization: [],
    message: '',
  });

  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  // Surface load failures so the user sees an actionable message instead
  // of an empty product picker with no context.
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      fetch('/api/products', { signal: controller.signal }).then((r) => {
        if (!r.ok) throw new Error(`Failed to load products (${r.status})`);
        return r.json();
      }),
      fetch('/api/categories', { signal: controller.signal }).then((r) => {
        if (!r.ok) throw new Error(`Failed to load categories (${r.status})`);
        return r.json();
      }),
    ])
      .then(([prodData, catData]) => {
        setProducts(prodData.products || []);
        setCategories(catData.categories || []);
      })
      .catch((e) => {
        if (controller.signal.aborted) return;
        setLoadError(e instanceof Error ? e.message : 'Failed to load');
      });
    return () => controller.abort();
  }, []);

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleProductToggle = (productId: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedProducts: prev.selectedProducts.includes(productId)
        ? prev.selectedProducts.filter((id) => id !== productId)
        : [...prev.selectedProducts, productId],
    }));
  };

  const handleCustomizationToggle = (option: string) => {
    setFormData((prev) => ({
      ...prev,
      customization: prev.customization.includes(option)
        ? prev.customization.filter((o) => o !== option)
        : [...prev.customization, option],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/rfqs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: formData.companyName,
          contact_person: formData.contactPerson,
          email: formData.email,
          phone: formData.phone,
          country: formData.country,
          business_type: formData.businessType,
          quantity_range: formData.quantityRange,
          customization: formData.customization,
          message: formData.message,
          items: formData.selectedProducts.map((id) => ({ product_id: id })),
        }),
      });
      if (res.ok) {
        setSubmitted(true);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to submit inquiry. Please try again.');
      }
    } catch {
      alert('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <main className="min-h-screen bg-[#F5F0EB] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-16 h-16 bg-[#B8956A]/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-[#B8956A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="font-serif text-2xl text-[#2C2C2C] mb-3">Inquiry Received</h1>
          <p className="text-[#2C2C2C]/60 text-sm leading-relaxed mb-8">
            Thank you for your interest. Our team will review your inquiry and respond within 24 business hours with detailed pricing and availability.
          </p>
          <Link
            href="/products"
            className="inline-flex items-center justify-center px-8 py-3 bg-[#2C2C2C] text-white text-sm tracking-[0.08em] uppercase hover:bg-[#2C2C2C]/90 transition-colors"
          >
            Continue Browsing
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F5F0EB]">
      {/* Header */}
      <section className="bg-[#2C2C2C] py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <p className="text-[#B8956A] text-sm tracking-[0.15em] uppercase mb-3">Get Started</p>
          <h1 className="font-serif text-4xl lg:text-5xl text-white mb-4" style={{ letterSpacing: '0.02em' }}>
            Request a Quote
          </h1>
          <p className="text-white/60 text-base max-w-xl">
            Tell us about your sourcing needs. Whether you need wholesale pricing, custom manufacturing, or samples — we&apos;ll get back to you within 24 hours.
          </p>
        </div>
      </section>

      {/* Form */}
      <section className="py-12 lg:py-16">
        <div className="mx-auto max-w-4xl px-6 lg:px-8">
          <form onSubmit={handleSubmit} className="space-y-10">
            {/* Company Information */}
            <div className="bg-white border border-[#D9D4CE] p-6 lg:p-8">
              <h2 className="font-serif text-lg text-[#2C2C2C] mb-6" style={{ letterSpacing: '0.04em' }}>
                Company Information
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] tracking-[0.1em] uppercase text-[#2C2C2C]/40 mb-2">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.companyName}
                    onChange={(e) => handleChange('companyName', e.target.value)}
                    className="w-full border border-[#D9D4CE] px-4 py-2.5 text-sm text-[#2C2C2C] bg-white focus:outline-none focus:border-[#B8956A] transition-colors"
                    placeholder="Your company name"
                  />
                </div>
                <div>
                  <label className="block text-[10px] tracking-[0.1em] uppercase text-[#2C2C2C]/40 mb-2">
                    Contact Person *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.contactPerson}
                    onChange={(e) => handleChange('contactPerson', e.target.value)}
                    className="w-full border border-[#D9D4CE] px-4 py-2.5 text-sm text-[#2C2C2C] bg-white focus:outline-none focus:border-[#B8956A] transition-colors"
                    placeholder="Full name"
                  />
                </div>
                <div>
                  <label className="block text-[10px] tracking-[0.1em] uppercase text-[#2C2C2C]/40 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className="w-full border border-[#D9D4CE] px-4 py-2.5 text-sm text-[#2C2C2C] bg-white focus:outline-none focus:border-[#B8956A] transition-colors"
                    placeholder="email@company.com"
                  />
                </div>
                <div>
                  <label className="block text-[10px] tracking-[0.1em] uppercase text-[#2C2C2C]/40 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    className="w-full border border-[#D9D4CE] px-4 py-2.5 text-sm text-[#2C2C2C] bg-white focus:outline-none focus:border-[#B8956A] transition-colors"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
                <div>
                  <label className="block text-[10px] tracking-[0.1em] uppercase text-[#2C2C2C]/40 mb-2">
                    Country *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.country}
                    onChange={(e) => handleChange('country', e.target.value)}
                    className="w-full border border-[#D9D4CE] px-4 py-2.5 text-sm text-[#2C2C2C] bg-white focus:outline-none focus:border-[#B8956A] transition-colors"
                    placeholder="Country"
                  />
                </div>
                <div>
                  <label className="block text-[10px] tracking-[0.1em] uppercase text-[#2C2C2C]/40 mb-2">
                    Business Type *
                  </label>
                  <select
                    required
                    value={formData.businessType}
                    onChange={(e) => handleChange('businessType', e.target.value)}
                    className="w-full border border-[#D9D4CE] px-4 py-2.5 text-sm text-[#2C2C2C] bg-white focus:outline-none focus:border-[#B8956A] transition-colors"
                  >
                    <option value="">Select type...</option>
                    <option value="brand">Brand / Retailer</option>
                    <option value="wholesaler">Wholesaler / Distributor</option>
                    <option value="e-commerce">E-commerce</option>
                    <option value="agency">Buying Agency</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Product Selection */}
            <div className="bg-white border border-[#D9D4CE] p-6 lg:p-8">
              <h2 className="font-serif text-lg text-[#2C2C2C] mb-2" style={{ letterSpacing: '0.04em' }}>
                Product Selection
              </h2>
              <p className="text-[#2C2C2C]/40 text-xs mb-6">
                Select the products you&apos;re interested in. You can also request our full catalog.
              </p>
              {loadError && (
                <div className="mb-4 text-sm text-amber-800 bg-amber-50 px-3 py-2 rounded-md">
                  We couldn&apos;t load the product list right now ({loadError}). You can still submit the form and we&apos;ll follow up with our full catalog.
                </div>
              )}
              <div className="space-y-4">
                {categories.filter((c) => c.slug !== 'all').map((cat) => {
                  const catProducts = products.filter((p) => p.category === cat.label);
                  if (catProducts.length === 0) return null;
                  return (
                    <div key={cat.slug}>
                      <p className="text-[10px] tracking-[0.1em] uppercase text-[#B8956A] mb-2">{cat.label}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {catProducts.map((product) => (
                          <label
                            key={product.id}
                            className={`flex items-center gap-3 px-4 py-3 border cursor-pointer transition-colors ${
                              formData.selectedProducts.includes(product.id)
                                ? 'border-[#B8956A] bg-[#B8956A]/5'
                                : 'border-[#D9D4CE] hover:border-[#B8956A]/50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={formData.selectedProducts.includes(product.id)}
                              onChange={() => handleProductToggle(product.id)}
                              className="sr-only"
                            />
                            <div className={`w-4 h-4 border flex items-center justify-center ${
                              formData.selectedProducts.includes(product.id)
                                ? 'border-[#B8956A] bg-[#B8956A]'
                                : 'border-[#D9D4CE]'
                            }`}>
                              {formData.selectedProducts.includes(product.id) && (
                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-[#2C2C2C] truncate">{product.name}</p>
                              <p className="text-[10px] text-[#2C2C2C]/40">From ${product.wholesalePrice.toFixed(2)}/unit · MOQ: {product.moq}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Order Details */}
            <div className="bg-white border border-[#D9D4CE] p-6 lg:p-8">
              <h2 className="font-serif text-lg text-[#2C2C2C] mb-6" style={{ letterSpacing: '0.04em' }}>
                Order Details
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] tracking-[0.1em] uppercase text-[#2C2C2C]/40 mb-2">
                    Estimated Quantity per Style
                  </label>
                  <select
                    value={formData.quantityRange}
                    onChange={(e) => handleChange('quantityRange', e.target.value)}
                    className="w-full border border-[#D9D4CE] px-4 py-2.5 text-sm text-[#2C2C2C] bg-white focus:outline-none focus:border-[#B8956A] transition-colors"
                  >
                    <option value="">Select range...</option>
                    <option value="50-100">50 – 100 units</option>
                    <option value="100-500">100 – 500 units</option>
                    <option value="500-1000">500 – 1,000 units</option>
                    <option value="1000-5000">1,000 – 5,000 units</option>
                    <option value="5000+">5,000+ units</option>
                  </select>
                </div>
              </div>
              <div className="mt-5">
                <label className="block text-[10px] tracking-[0.1em] uppercase text-[#2C2C2C]/40 mb-3">
                  Customization Needs
                </label>
                <div className="flex flex-wrap gap-2">
                  {['Custom Label / Tag', 'Custom Color', 'Custom Sizing', 'Custom Packaging', 'OEM Design', 'Private Label'].map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => handleCustomizationToggle(option)}
                      className={`px-4 py-2 text-xs tracking-[0.04em] border transition-colors ${
                        formData.customization.includes(option)
                          ? 'border-[#B8956A] bg-[#B8956A]/10 text-[#B8956A]'
                          : 'border-[#D9D4CE] text-[#2C2C2C]/60 hover:border-[#B8956A]/50'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-5">
                <label className="block text-[10px] tracking-[0.1em] uppercase text-[#2C2C2C]/40 mb-2">
                  Additional Notes
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) => handleChange('message', e.target.value)}
                  rows={4}
                  className="w-full border border-[#D9D4CE] px-4 py-2.5 text-sm text-[#2C2C2C] bg-white focus:outline-none focus:border-[#B8956A] transition-colors resize-none"
                  placeholder="Tell us more about your requirements, timeline, or any questions..."
                />
              </div>
            </div>

            {/* Submit */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-[#2C2C2C]/40 text-xs">
                We respond to all inquiries within 24 business hours.
              </p>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center px-12 py-4 bg-[#2C2C2C] text-white text-sm tracking-[0.1em] uppercase hover:bg-[#2C2C2C]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Submit Inquiry'}
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
