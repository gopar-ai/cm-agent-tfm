import { getServerEnv } from '@/lib/env';
import SembrarDemo from '@/components/SembrarDemo';
import Sidebar from '@/components/Sidebar';

export default function CalendarLayout({ children }: { children: React.ReactNode }) {
  const { demoMode } = getServerEnv();

  return (
    <div className="flex h-screen bg-[#0f0f0f] overflow-hidden">
      <SembrarDemo activo={demoMode} />
      <Sidebar />
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
