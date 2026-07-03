import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { useAlert } from '@/contexts/AlertContext';
import { useAiPromptsStore, type AiPrompts } from '@/store/aiPromptsStore';
import { useBanner, BANNER_IDS } from '@/store/dismissedBannersStore';
import { Icon } from '@/components/ui/Icon';
import { Routes } from '@/lib/routes';
import { AiMemorySection } from '@/components/ai/AiMemorySection';

export function AiSettingsPage() {
  const { t } = useTranslation();
  const alert = useAlert();
  const prompts = useAiPromptsStore((s) => s.prompts);
  const setPrompts = useAiPromptsStore((s) => s.setPrompts);
  const setPromptForAction = useAiPromptsStore((s) => s.setPromptForAction);

  const infoBanner = useBanner(BANNER_IDS.AI_SETTINGS_INFO);

  const handleSave = () => {
    setPrompts(prompts);
    alert.success(t('ai.settings.saved'));
  };

  const handleReset = () => {
    const defaultPrompts: AiPrompts = {
      generateName: '',
      generateDescription: '',
      mergeDescription: '',
      suggestNameFromSimilar: '',
      suggestDescriptionFromSimilar: '',
      improveText: '',
      applyInstructions: '',
    };
    setPrompts(defaultPrompts);
    alert.success(t('ai.settings.saved'));
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t('ai.settings.title')} back={Routes.SETTINGS} />

      <section className="px-5 space-y-4">
        {infoBanner.isVisible && (
          <Card>
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-dn-text-muted leading-relaxed">
                  {t('ai.settings.subtitle')}
                </p>
                <p className="text-xs text-dn-text-muted/70 leading-relaxed mt-1">
                  {t('ai.settings.description')}
                </p>
              </div>
              <button
                onClick={infoBanner.dismiss}
                aria-label={t('common.close')}
                className="shrink-0 text-dn-text-muted hover:text-dn-text-main transition-colors"
              >
                <Icon name="close" className="text-base" />
              </button>
            </div>
          </Card>
        )}

        <Card className="space-y-4">
          <Textarea
            label={t('ai.settings.generateNameLabel')}
            placeholder={t('ai.settings.generateNamePlaceholder')}
            value={prompts.generateName}
            onChange={(e) => setPromptForAction('generateName', e.target.value)}
            rows={4}
          />
          <Textarea
            label={t('ai.settings.generateDescriptionLabel')}
            placeholder={t('ai.settings.generateDescriptionPlaceholder')}
            value={prompts.generateDescription}
            onChange={(e) => setPromptForAction('generateDescription', e.target.value)}
            rows={4}
          />
          <Textarea
            label={t('ai.settings.mergeDescriptionLabel')}
            placeholder={t('ai.settings.mergeDescriptionPlaceholder')}
            value={prompts.mergeDescription}
            onChange={(e) => setPromptForAction('mergeDescription', e.target.value)}
            rows={4}
          />
          <Textarea
            label={t('ai.settings.suggestNameFromSimilarLabel')}
            placeholder={t('ai.settings.suggestNameFromSimilarPlaceholder')}
            value={prompts.suggestNameFromSimilar}
            onChange={(e) => setPromptForAction('suggestNameFromSimilar', e.target.value)}
            rows={4}
          />
          <Textarea
            label={t('ai.settings.suggestDescriptionFromSimilarLabel')}
            placeholder={t('ai.settings.suggestDescriptionFromSimilarPlaceholder')}
            value={prompts.suggestDescriptionFromSimilar}
            onChange={(e) => setPromptForAction('suggestDescriptionFromSimilar', e.target.value)}
            rows={4}
          />
          <Textarea
            label={t('ai.settings.improveTextLabel')}
            placeholder={t('ai.settings.improveTextPlaceholder')}
            value={prompts.improveText}
            onChange={(e) => setPromptForAction('improveText', e.target.value)}
            rows={4}
          />
          <Textarea
            label={t('ai.settings.applyInstructionsLabel')}
            placeholder={t('ai.settings.applyInstructionsPlaceholder')}
            value={prompts.applyInstructions}
            onChange={(e) => setPromptForAction('applyInstructions', e.target.value)}
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

        <AiMemorySection />
      </section>
    </div>
  );
}
