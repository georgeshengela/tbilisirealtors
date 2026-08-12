import type { ReactNode } from 'react';
import AdminHeader, { type AdminNavSection } from './AdminHeader';
import AdminFooter from './AdminFooter';

interface AdminLayoutProps {
  subtitle: string;
  activeSection?: AdminNavSection;
  hideAddButton?: boolean;
  children: ReactNode;
}

export default function AdminLayout({ subtitle, activeSection, hideAddButton, children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#f4f6fa' }}>
      <AdminHeader subtitle={subtitle} activeSection={activeSection} hideAddButton={hideAddButton} />
      <main className="flex-1">{children}</main>
      <AdminFooter />
    </div>
  );
}
