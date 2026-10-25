import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'DandoEv - Administrative Workspace',
  description: 'Enterprise administration, fleet monitoring, risk control, and credit ops.',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="admin-workspace min-h-screen bg-[#EAF6FF] text-[#0A1B46] font-sans antialiased">
      {children}
    </div>
  );
}
