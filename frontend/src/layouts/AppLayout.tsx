import { Outlet, ScrollRestoration } from 'react-router';
import { BottomNav } from '@/components/navigation/BottomNav';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { SharedFilesHandler } from '@/components/chat/SharedFilesHandler';

/** The single element every page scrolls inside, so a page can find it to read or restore its offset. */
export const APP_SCROLL_CONTAINER_ID = 'app-scroll-container';

export function AppLayout() {
  return (
    <div className="flex flex-col h-dvh bg-dn-bg font-display antialiased overflow-hidden">
      <OfflineBanner />
      <main id={APP_SCROLL_CONTAINER_ID} className="flex-1 pb-[80px] overflow-y-auto no-scrollbar max-w-xl mx-auto w-full">
        <Outlet />
      </main>
      <BottomNav />
      <ScrollRestoration />
      <SharedFilesHandler />
    </div>
  );
}
