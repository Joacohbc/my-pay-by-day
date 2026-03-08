import { Outlet, ScrollRestoration } from 'react-router-dom';
import { BottomNav } from '@/components/navigation/BottomNav';

export function AppLayout() {
  return (
    <div className="flex flex-col min-h-screen bg-dn-bg font-display antialiased">
      <main className="flex-1 pb-[80px] overflow-y-auto no-scrollbar max-w-xl mx-auto w-full">
        <Outlet />
      </main>
      <BottomNav />
      <ScrollRestoration />
    </div>
  );
}
