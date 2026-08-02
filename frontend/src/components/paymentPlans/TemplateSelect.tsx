import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Template } from '@/models';
import { useTemplates } from '@/hooks/useTemplates';
import { SearchableSelect } from '@/components/ui/SearchableSelect';

const TEMPLATES_PAGE_SIZE = 100;

interface TemplateSelectProps {
  readonly value: number | null;
  readonly onChange: (templateId: number | null) => void;
  readonly error?: string;
  /** Kept selectable when the plan already points at a template that fell off the first page. */
  readonly selectedTemplate?: Template | null;
}

export function TemplateSelect({ value, onChange, error, selectedTemplate }: TemplateSelectProps) {
  const { t } = useTranslation();
  const { data: templatesResponse } = useTemplates(0, TEMPLATES_PAGE_SIZE);

  const options = useMemo(() => {
    const available = templatesResponse?.content ?? [];
    const isSelectedMissing = selectedTemplate && !available.some((template) => template.id === selectedTemplate.id);
    const templates = isSelectedMissing ? [selectedTemplate, ...available] : available;

    return templates.map((template) => ({
      value: String(template.id),
      label: template.originNodeName
        ? `${template.name} · ${template.originNodeName} → ${template.destinationNodeName ?? t('common.none')}`
        : template.name,
    }));
  }, [templatesResponse, selectedTemplate, t]);

  return (
    <SearchableSelect
      label={t('paymentPlans.templateLabel')}
      placeholder={t('common.select')}
      options={options}
      error={error}
      value={value == null ? '' : String(value)}
      onChange={(selected) => onChange(selected ? Number(selected) : null)}
    />
  );
}
