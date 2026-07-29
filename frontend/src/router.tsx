import { createBrowserRouter, Navigate } from 'react-router';
import { AppLayout } from '@/layouts/AppLayout';
import { DashboardPage } from '@/pages/DashboardPage';
import { EventsPage } from '@/pages/EventsPage';
import { DraftsPage } from '@/pages/DraftsPage';
import { EventDetailPage } from '@/pages/EventDetailPage';
import { EventNewPage } from '@/pages/EventNewPage';
import { EventEditPage } from '@/pages/EventEditPage';
import { NodesPage } from '@/pages/NodesPage';
import { SubscriptionsPage } from '@/pages/SubscriptionsPage';
import { PaymentPlansPage } from '@/pages/PaymentPlansPage';
import { PaymentPlanNewPage } from '@/pages/PaymentPlanNewPage';
import { PaymentPlanNewGroupPage } from '@/pages/PaymentPlanNewGroupPage';
import { PaymentPlanNewGenericPage } from '@/pages/PaymentPlanNewGenericPage';
import { PaymentPlanDetailPage } from '@/pages/PaymentPlanDetailPage';
import { PaymentPlanEditPage } from '@/pages/PaymentPlanEditPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { CategoriesPage } from '@/pages/CategoriesPage';
import { TagsPage } from '@/pages/TagsPage';
import { TagGroupsPage } from '@/pages/TagGroupsPage';
import { TemplatesPage } from '@/pages/TemplatesPage';
import { TimePeriodsPage } from '@/pages/TimePeriodsPage';
import { TimePeriodDetailPage } from '@/pages/TimePeriodDetailPage';
import { ChatPage } from '@/pages/ChatPage';
import { FilesPage } from '@/pages/FilesPage';
import { AiSettingsPage } from '@/pages/AiSettingsPage';
import { DuplicateSettingsPage } from '@/pages/DuplicateSettingsPage';
import { EventDuplicatesPage } from '@/pages/EventDuplicatesPage';
import { AgentTaskDetailPage } from '@/pages/AgentTaskDetailPage';
import { Routes } from '@/lib/routes';
import { RouteErrorBoundary } from '@/components/ui/RouteErrorBoundary';

export const router = createBrowserRouter([
  {
    path: Routes.DASHBOARD,
    element: <AppLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <DashboardPage /> },

      // Events
      { path: 'events', element: <EventsPage /> },
      { path: 'events/duplicates', element: <EventDuplicatesPage /> },
      { path: 'events/drafts', element: <DraftsPage /> },
      { path: 'events/new', element: <EventNewPage /> },
      { path: 'events/:id', element: <EventDetailPage /> },
      { path: 'events/:id/edit', element: <EventEditPage /> },

      // Subscriptions & Payment Plans
      { path: 'subscriptions', element: <SubscriptionsPage /> },
      { path: 'payment-plans', element: <PaymentPlansPage /> },
      { path: 'payment-plans/new', element: <PaymentPlanNewPage /> },
      { path: 'payment-plans/new/group', element: <PaymentPlanNewGroupPage /> },
      { path: 'payment-plans/new/installment', element: <PaymentPlanNewGenericPage /> },
      { path: 'payment-plans/new/custom', element: <PaymentPlanNewGenericPage /> },
      { path: 'payment-plans/:id', element: <PaymentPlanDetailPage /> },
      { path: 'payment-plans/:id/edit', element: <PaymentPlanEditPage /> },
      { path: 'payment-plans/:id/items/:itemId', element: <PaymentPlanDetailPage /> },

      // Chat
      { path: 'chat', element: <ChatPage /> },

      // Time Periods
      { path: 'periods', element: <TimePeriodsPage /> },
      { path: 'periods/:id', element: <TimePeriodDetailPage /> },

      // Settings
      { path: 'settings', element: <SettingsPage /> },
      { path: 'settings/categories', element: <CategoriesPage /> },
      { path: 'settings/tags', element: <TagsPage /> },
      { path: 'settings/tag-groups', element: <TagGroupsPage /> },
      { path: 'settings/templates', element: <TemplatesPage /> },
      { path: 'settings/nodes', element: <NodesPage /> },
      { path: 'settings/files', element: <FilesPage /> },
      { path: 'settings/ai', element: <AiSettingsPage /> },
      { path: 'settings/duplicates', element: <DuplicateSettingsPage /> },

      // Agent Tasks
      { path: 'agent-tasks/:id', element: <AgentTaskDetailPage /> },

      // Fallback
      { path: '*', element: <Navigate to={Routes.DASHBOARD} replace /> },
    ],
  },
]);
