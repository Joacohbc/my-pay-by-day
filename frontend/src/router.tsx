import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '@/layouts/AppLayout';
import { DashboardPage } from '@/pages/DashboardPage';
import { EventsPage } from '@/pages/EventsPage';
import { EventDetailPage } from '@/pages/EventDetailPage';
import { EventNewPage } from '@/pages/EventNewPage';
import { EventEditPage } from '@/pages/EventEditPage';
import { NodesPage } from '@/pages/NodesPage';
import { SubscriptionsPage } from '@/pages/SubscriptionsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { CategoriesPage } from '@/pages/CategoriesPage';
import { TagsPage } from '@/pages/TagsPage';
import { TemplatesPage } from '@/pages/TemplatesPage';
import { TimePeriodsPage } from '@/pages/TimePeriodsPage';
import { TimePeriodDetailPage } from '@/pages/TimePeriodDetailPage';
import { ChatPage } from '@/pages/ChatPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },

      // Events
      { path: 'events', element: <EventsPage /> },
      { path: 'events/new', element: <EventNewPage /> },
      { path: 'events/:id', element: <EventDetailPage /> },
      { path: 'events/:id/edit', element: <EventEditPage /> },

      // Subscriptions
      { path: 'subscriptions', element: <SubscriptionsPage /> },

      // Chat
      { path: 'chat', element: <ChatPage /> },

      // Time Periods
      { path: 'periods', element: <TimePeriodsPage /> },
      { path: 'periods/:id', element: <TimePeriodDetailPage /> },

      // Settings
      { path: 'settings', element: <SettingsPage /> },
      { path: 'settings/categories', element: <CategoriesPage /> },
      { path: 'settings/tags', element: <TagsPage /> },
      { path: 'settings/templates', element: <TemplatesPage /> },
      { path: 'settings/nodes', element: <NodesPage /> },

      // Fallback
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
