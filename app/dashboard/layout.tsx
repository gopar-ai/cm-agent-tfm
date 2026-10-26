import { getServerEnv } from '@/lib/env';
import SembrarDemo from '@/components/SembrarDemo';
import Sidebar from '@/components/Sidebar';

/**
 * Se renderiza en cada petición: el modo de demostración se decide al arrancar
 * el servidor, no al construir la imagen. Prerenderizarlo dejaba el valor
 * congelado con lo que hubiera durante la compilación, y el contenido de
 * ejemplo nunca llegaba a sembrarse.
 */
export const dynamic = 'force-dynamic';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { demoMode } = getServerEnv();

  return (
    <div className="flex h-screen bg-[#121417] overflow-hidden">
      <SembrarDemo activo={demoMode} />
      <Sidebar />
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
