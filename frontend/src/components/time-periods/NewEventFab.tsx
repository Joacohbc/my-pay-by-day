import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

interface NewEventFabProps {
  onNewEvent?: () => void;
}

export function NewEventFab({ onNewEvent }: NewEventFabProps) {
  const { t } = useTranslation();

  return (
    <div className="fixed bottom-24 right-5 z-30">
      {onNewEvent ? (
        <Button size="lg" className="rounded-pill shadow-lg shadow-dn-primary/20 gap-2" onClick={onNewEvent}>
          <Icon name="add" />
          {t('dashboard.newEvent')}
        </Button>
      ) : (
        <Link to="/events/new">
          <Button size="lg" className="rounded-pill shadow-lg shadow-dn-primary/20 gap-2">
            <Icon name="add" />
            {t('dashboard.newEvent')}
          </Button>
        </Link>
      )}
    </div>
  );
}