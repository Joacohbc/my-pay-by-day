import { Outlet, ScrollRestoration } from 'react-router-dom';
import { BottomNav } from '@/components/navigation/BottomNav';
import { OfflineBanner } from '@/components/ui/OfflineBanner';

export function AppLayout() {
  return (
    <div className="flex flex-col h-dvh bg-dn-bg font-display antialiased overflow-hidden">
      <OfflineBanner />
      <main className="flex-1 pb-[80px] overflow-y-auto no-scrollbar max-w-xl mx-auto w-full">
        <Outlet />
      </main>
      <BottomNav />
      <ScrollRestoration />
    </div>
  );
}
