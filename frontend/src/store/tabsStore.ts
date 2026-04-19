import { create } from 'zustand';

export interface Tab {
  id: string;
  pathname: string;
  search: string;
  hash: string;
  title: string;
}

interface TabsState {
  tabs: Tab[];
  activeTabId: string | null;
  addTab: (tab: Omit<Tab, 'id'>) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTabPath: (id: string, path: { pathname: string; search: string; hash: string; title: string }) => void;
}

export const useTabsStore = create<TabsState>((set) => ({
  tabs: [],
  activeTabId: null,

  addTab: (tab) => set((state) => {
    // If the EXACT path is already active, do not duplicate.
    const existingActive = state.tabs.find(t => t.id === state.activeTabId);
    if (existingActive && existingActive.pathname === tab.pathname && existingActive.search === tab.search) {
      return state;
    }

    const id = Date.now().toString() + Math.random().toString(36).substring(7);
    return {
      tabs: [...state.tabs, { ...tab, id }],
      activeTabId: id,
    };
  }),

  closeTab: (id) => set((state) => {
    const newTabs = state.tabs.filter(t => t.id !== id);
    let newActiveId = state.activeTabId;
    if (state.activeTabId === id) {
      // Focus the last tab if closing the active one
      newActiveId = newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null;
    }
    return { tabs: newTabs, activeTabId: newActiveId };
  }),

  setActiveTab: (id) => set({ activeTabId: id }),

  updateTabPath: (id, path) => set((state) => ({
    tabs: state.tabs.map(t => t.id === id ? { ...t, ...path } : t)
  })),
}));
