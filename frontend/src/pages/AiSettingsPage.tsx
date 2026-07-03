import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/ui/PageHeader';
import { Routes } from '@/lib/routes';
import { AiMemorySection } from '@/components/ai/AiMemorySection';

export function AiSettingsPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <PageHeader title={t('ai.memory.title')} back={Routes.SETTINGS} />

      <section className="px-5 space-y-4">
        <AiMemorySection />
      </section>
    </div>
  );
}
