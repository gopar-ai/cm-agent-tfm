import Sidebar from '@/components/Sidebar';

export default function CalendarLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-[#0f0f0f] overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
