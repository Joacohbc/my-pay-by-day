import { useEffect, useRef } from 'react';
import { useTabsStore } from '@/store/tabsStore';
import { Icon } from '@/components/ui/Icon';

export function TabBar() {
  const { tabs, activeTabId, setActiveTab, closeTab } = useTabsStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll active tab into view
  useEffect(() => {
    if (activeTabId && scrollRef.current) {
      const activeElement = scrollRef.current.querySelector(`[data-tab-id="${activeTabId}"]`);
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [activeTabId, tabs.length]);

  if (tabs.length === 0) return null;

  return (
    <div className="bg-dn-surface-low border-b border-dn-surface w-full flex-shrink-0 relative h-12">
      <div
        ref={scrollRef}
        className="flex h-full items-center gap-2 px-3 overflow-x-auto no-scrollbar"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              data-tab-id={tab.id}
              onClick={() => {
                if (!isActive) {
                  setActiveTab(tab.id);
                  // The AppLayout will sync the URL.
                }
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full whitespace-nowrap cursor-pointer transition-colors shrink-0 max-w-[200px] ${
                isActive
                  ? 'bg-dn-primary text-white'
                  : 'bg-dn-surface text-dn-text-main hover:bg-dn-surface-high'
              }`}
            >
              <span className="text-sm font-medium truncate">
                {tab.title || 'Tab'}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                className={`flex items-center justify-center rounded-full p-0.5 hover:bg-black/10 transition-colors ${
                  isActive ? 'text-white' : 'text-dn-text-muted hover:text-dn-text-main'
                }`}
                aria-label="Close tab"
              >
                <Icon name="close" className="text-[14px]" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
