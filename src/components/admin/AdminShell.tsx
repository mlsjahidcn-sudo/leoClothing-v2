'use client';

import { useEffect, useState } from 'react';
import { useAdminAuth } from '@/components/admin/AuthProvider';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Package,
  FileText,
  LogOut,
  ExternalLink,
  Menu,
  Users,
  Settings as SettingsIcon,
  Bot,
} from 'lucide-react';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/products', label: 'Products', icon: Package, exact: false },
  { href: '/admin/leads', label: 'Leads', icon: Users, exact: false },
  { href: '/admin/chatbot', label: 'Chatbot', icon: Bot, exact: false },
  { href: '/admin/rfqs', label: 'RFQs', icon: FileText, exact: false },
  { href: '/admin/settings', label: 'Settings', icon: SettingsIcon, exact: false },
];

// Defensive: any falsy `name`/`email` should fall back to 'A', not crash
// when both are empty strings (which is valid for a freshly-created
// admin_profile row that hasn't been populated).
function avatarLetter(name: string | null | undefined, email: string | null | undefined): string {
  const source = name || email || '';
  return (source[0] || 'A').toUpperCase();
}

function AdminShellInner({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAdminAuth();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Mobile sidebar: close on Escape so keyboard users can dismiss it.
  // Without this the only escape is the backdrop click.
  useEffect(() => {
    if (!sidebarOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sidebarOpen]);

  return (
    <div className="min-h-screen flex bg-gray-50">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        aria-label="Admin navigation"
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 transform transition-transform lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="px-6 py-5 border-b border-gray-100">
            <h1 className="text-lg font-semibold text-gray-900">Chengfeng Admin</h1>
            <p className="text-xs text-gray-500 mt-0.5">Management Dashboard</p>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-1">
            {navItems.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <item.icon className="w-4 h-4" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="px-3 py-4 border-t border-gray-100 space-y-1">
            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              <ExternalLink className="w-4 h-4" aria-hidden="true" />
              View Site
            </Link>
            <button
              onClick={() => void logout()}
              className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors w-full"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 px-4 lg:px-8 py-3 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 -ml-2 text-gray-500 hover:text-gray-900"
            aria-label="Open navigation menu"
            aria-expanded={sidebarOpen}
          >
            <Menu className="w-5 h-5" aria-hidden="true" />
          </button>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{user?.name || user?.email}</span>
            <div
              aria-hidden="true"
              className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-medium"
            >
              {avatarLetter(user?.name, user?.email)}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAdminAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !user && pathname !== '/admin/login') {
      router.push('/admin/login');
    }
  }, [isLoading, user, router, pathname]);

  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse text-gray-400">Redirecting...</div>
      </div>
    );
  }

  return <AdminShellInner>{children}</AdminShellInner>;
}
