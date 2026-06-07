'use client';

import { AdminAuthProvider } from '@/components/admin/AuthProvider';
import AdminShell from '@/components/admin/AdminShell';

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthProvider>
      <AdminShell>{children}</AdminShell>
    </AdminAuthProvider>
  );
}
