import { useEffect, useRef } from 'react';
import { useLocation, useNavigate, ScrollRestoration } from 'react-router-dom';
import { BottomNav } from '@/components/navigation/BottomNav';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { TabBar } from '@/components/navigation/TabBar';
import { useTabsStore } from '@/store/tabsStore';
import { TabRenderer } from '@/components/navigation/TabRenderer';
import { getTitleFromPath } from '@/lib/routeTitle';
import { Routes } from '@/lib/routes';

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { tabs, activeTabId, addTab } = useTabsStore();
  const isInitialMount = useRef(true);
  const locationRef = useRef(location);
  const skipNextUrlSync = useRef(false);

  // Sync URL to tabs
  useEffect(() => {
    if (skipNextUrlSync.current) {
      skipNextUrlSync.current = false;
      locationRef.current = location;
      return;
    }

    // If the URL hasn't changed, do nothing
    if (!isInitialMount.current && location.pathname === locationRef.current.pathname && location.search === locationRef.current.search) {
      return;
    }

    const title = getTitleFromPath(location.pathname);

    if (isInitialMount.current) {
       // Only add a tab if there are no tabs, otherwise we might be hydrating state
       if (tabs.length === 0) {
          addTab({
            pathname: location.pathname,
            search: location.search,
            hash: location.hash,
            title
          });
       }
       isInitialMount.current = false;
    } else {
      // Find if there is an existing tab that exactly matches this URL,
      // to avoid creating duplicates if we just navigated to an existing active tab.
      const existingTab = tabs.find(t => t.pathname === location.pathname && t.search === location.search);

      if (existingTab && existingTab.id === activeTabId) {
        // We are already exactly on the active tab's URL, ignore.
      } else {
        // It's a new navigation, create a new tab!
        addTab({
          pathname: location.pathname,
          search: location.search,
          hash: location.hash,
          title
        });
      }
    }

    locationRef.current = location;
  }, [location, addTab, activeTabId, tabs]);

  // Handle activeTab fallback when all tabs are closed
  useEffect(() => {
    if (!isInitialMount.current && tabs.length === 0) {
      // Skip sync so we don't open a duplicate dashboard tab
      skipNextUrlSync.current = true;
      navigate(Routes.DASHBOARD, { replace: true });
      addTab({
        pathname: Routes.DASHBOARD,
        search: '',
        hash: '',
        title: getTitleFromPath(Routes.DASHBOARD)
      });
    }
  }, [tabs.length, navigate, addTab]);

  // Ensure browser URL reflects the active tab (if active tab changed programmatically or via close)
  useEffect(() => {
    if (activeTabId && !isInitialMount.current) {
      const activeTab = tabs.find(t => t.id === activeTabId);
      if (activeTab && (activeTab.pathname !== location.pathname || activeTab.search !== location.search)) {
        skipNextUrlSync.current = true;
        navigate({ pathname: activeTab.pathname, search: activeTab.search, hash: activeTab.hash }, { replace: true });
        locationRef.current = { ...location, pathname: activeTab.pathname, search: activeTab.search, hash: activeTab.hash };
      }
    }
  }, [activeTabId, tabs, navigate, location]);


  return (
    <div className="flex flex-col h-dvh bg-dn-bg font-display antialiased overflow-hidden">
      <OfflineBanner />
      <TabBar />
      <main className="flex-1 pb-[80px] overflow-y-auto no-scrollbar max-w-xl mx-auto w-full relative">
        {tabs.map(tab => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              className="absolute inset-0 h-full w-full overflow-y-auto no-scrollbar"
              style={{ display: isActive ? 'block' : 'none' }}
            >
              <TabRenderer pathname={tab.pathname} />
            </div>
          );
        })}
      </main>
      <BottomNav />
      <ScrollRestoration />
    </div>
  );
}
