import { useMemo } from 'react';
import { matchRoutes } from 'react-router-dom';
import { appRoutes } from '@/routesConfig';

interface TabRendererProps {
  pathname: string;
}

export function TabRenderer({ pathname }: TabRendererProps) {
  const match = useMemo(() => {
    return matchRoutes(appRoutes, { pathname });
  }, [pathname]);

  if (!match || match.length === 0) {
    return null;
  }

  // Render the matched route element
  // Assuming a simple flat routing structure for children of Dashboard
  const matchedRoute = match[match.length - 1];
  return <>{matchedRoute.route.element}</>;
}
