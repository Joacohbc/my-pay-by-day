import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { useAlert } from '@/contexts/AlertContext';
import { aiPromptsStore, type AiPrompts } from '@/store/aiPromptsStore';
import { Routes } from '@/lib/routes';

export function AiSettingsPage() {
  const { t } = useTranslation();
  const alert = useAlert();
  const [prompts, setPrompts] = useState<AiPrompts>(aiPromptsStore.get);

  const handleSave = () => {
    aiPromptsStore.set(prompts);
    alert.success(t('ai.settings.saved'));
  };

  const handleReset = () => {
    const defaultPrompts: AiPrompts = {
      generateName: '',
      generateDescription: '',
      fixNameSpelling: '',
      fixDescriptionSpelling: '',
    };
    setPrompts(defaultPrompts);
    aiPromptsStore.set(defaultPrompts);
    alert.success(t('ai.settings.saved'));
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t('ai.settings.title')} backTo={Routes.SETTINGS} />

      <section className="px-5 space-y-4">
        <Card>
          <p className="text-xs text-dn-text-muted leading-relaxed">
            {t('ai.settings.subtitle')}
          </p>
          <p className="text-xs text-dn-text-muted/70 leading-relaxed mt-1">
            {t('ai.settings.description')}
          </p>
        </Card>

        <Card className="space-y-4">
          <Textarea
            label={t('ai.settings.generateNameLabel')}
            placeholder={t('ai.settings.generateNamePlaceholder')}
            value={prompts.generateName}
            onChange={(e) => setPrompts((prev) => ({ ...prev, generateName: e.target.value }))}
            rows={4}
          />
          <Textarea
            label={t('ai.settings.generateDescriptionLabel')}
            placeholder={t('ai.settings.generateDescriptionPlaceholder')}
            value={prompts.generateDescription}
            onChange={(e) => setPrompts((prev) => ({ ...prev, generateDescription: e.target.value }))}
            rows={4}
          />
          <Textarea
            label={t('ai.settings.fixNameSpellingLabel')}
            placeholder={t('ai.settings.fixNameSpellingPlaceholder')}
            value={prompts.fixNameSpelling}
            onChange={(e) => setPrompts((prev) => ({ ...prev, fixNameSpelling: e.target.value }))}
            rows={4}
          />
          <Textarea
            label={t('ai.settings.fixDescriptionSpellingLabel')}
            placeholder={t('ai.settings.fixDescriptionSpellingPlaceholder')}
            value={prompts.fixDescriptionSpelling}
            onChange={(e) => setPrompts((prev) => ({ ...prev, fixDescriptionSpelling: e.target.value }))}
            rows={4}
          />
        </Card>

        <div className="flex gap-3">
          <Button variant="ghost" onClick={handleReset} className="flex-1 text-dn-text-muted">
            {t('ai.settings.reset')}
          </Button>
          <Button onClick={handleSave} className="flex-1">
            {t('common.save')}
          </Button>
        </div>
      </section>
    </div>
  );
}
