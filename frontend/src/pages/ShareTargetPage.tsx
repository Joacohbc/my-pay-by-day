import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import { Routes } from '@/lib/routes';
import { FullPageSpinner } from '@/components/ui/Spinner';
import type { FinanceEvent } from '@/models';

export function ShareTargetPage() {
  const [searchParams] = useSearchParams();
  const { navigate } = useAppNavigation();

  useEffect(() => {
    const title = searchParams.get('title') || '';
    const text = searchParams.get('text') || '';
    const url = searchParams.get('url') || '';

    // Combine text and url into description if both exist, otherwise use whichever is available.
    // If neither text nor url is present but title is, we can use title as name.
    const descriptionParts = [];
    if (text) descriptionParts.push(text);
    if (url) descriptionParts.push(url);
    const description = descriptionParts.join('\n');

    const draftValues: Partial<FinanceEvent> = {
      name: title || '',
      description: description || undefined,
    };

    // Navigate to new event page, passing the draft values as state.
    // We'll mimic how template passes state so that EventNewPage can pick it up.
    navigate(Routes.EVENT_NEW, { replace: true, state: { draft: draftValues } });
  }, [searchParams, navigate]);

  return <FullPageSpinner />;
}
