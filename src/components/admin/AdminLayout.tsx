import type { ReactNode } from 'react';
import AdminHeader, { type AdminNavSection } from './AdminHeader';
import AdminFooter from './AdminFooter';

interface AdminLayoutProps {
  subtitle: string;
  activeSection?: AdminNavSection;
  children: ReactNode;
}

export default function AdminLayout({ subtitle, activeSection, children }: AdminLayoutProps) {
  return (
    <div className="admin-shell min-h-screen flex flex-col">
      <AdminHeader subtitle={subtitle} activeSection={activeSection} />
      <main className="flex-1">{children}</main>
      <AdminFooter />
    </div>
  );
}
