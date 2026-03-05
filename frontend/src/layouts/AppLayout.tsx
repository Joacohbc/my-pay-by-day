import { Outlet, ScrollRestoration } from 'react-router-dom';
import { BottomNav } from '@/components/navigation/BottomNav';

export function AppLayout() {
  return (
    <div className="flex flex-col min-h-screen bg-zinc-950">
      <main className="flex-1 pb-20 overflow-y-auto max-w-xl mx-auto w-full">
        <Outlet />
      </main>
      <BottomNav />
      <ScrollRestoration />
    </div>
  );
}
