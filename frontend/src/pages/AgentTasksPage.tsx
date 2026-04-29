import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { AgentTasksView } from '@/components/agent-tasks/AgentTasksView';
import { Routes } from '@/lib/routes';

export function AgentTasksPage() {
  const { t } = useTranslation();
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={t('agentTasks.title')}
        back={Routes.SETTINGS}
        subtitle={t('agentTasks.subtitle')}
        action={
          <Button size="sm" onClick={() => setShowModal(true)}>
            <Icon name="add" className="text-sm" />
            {t('common.new')}
          </Button>
        }
      />

      <AgentTasksView 
        showNewTaskModal={showModal} 
        onCloseModal={() => setShowModal(false)} 
      />
    </div>
  );
}
