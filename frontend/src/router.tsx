import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '@/layouts/AppLayout';
import { Routes } from '@/lib/routes';
import { appRoutes } from '@/routesConfig';

export const router = createBrowserRouter([
  {
    path: Routes.DASHBOARD,
    element: <AppLayout />,
    children: appRoutes,
  },
]);
