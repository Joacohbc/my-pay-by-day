import { useTranslation } from 'react-i18next';
import { useTemplates } from '@/hooks/useTemplates';
import { Modal } from '@/components/ui/Modal';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { Icon } from '@/components/ui/Icon';
import type { Template } from '@/models';

interface TemplatePickerModalProps {
  open: boolean;
  onClose: () => void;
  /** null = create from scratch, Template = use that template */
  onSelect: (template: Template | null) => void;
}

export function TemplatePickerModal({ open, onClose, onSelect }: TemplatePickerModalProps) {
  const { t } = useTranslation();
  const { data: paged, isLoading } = useTemplates();
  const templates = paged?.content ?? [];

  return (
    <Modal open={open} onClose={onClose} title={t('templatePicker.title')}>
      <div className="space-y-3">
        {/* From Scratch */}
        <button
          onClick={() => onSelect(null)}
          className="w-full flex items-center gap-3 p-4 rounded-card bg-dn-surface-low hover:bg-dn-surface transition-colors text-left cursor-pointer"
        >
          <div className="w-10 h-10 flex items-center justify-center rounded-2xl bg-dn-primary/10 text-dn-primary shrink-0">
            <Icon name="edit_note" />
          </div>
          <div>
            <p className="text-sm font-medium text-dn-text-main">{t('templatePicker.fromScratch')}</p>
            <p className="text-xs text-dn-text-muted">{t('templatePicker.fromScratchDesc')}</p>
          </div>
        </button>

        {/* Templates */}
        {isLoading ? (
          <FullPageSpinner />
        ) : templates.length > 0 ? (
          <div>
            <p className="text-xs font-medium text-dn-text-muted uppercase tracking-wider mb-2 px-1">
              {t('templatePicker.templates')}
            </p>
            <div className="space-y-2">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => onSelect(template)}
                  className="w-full flex items-center gap-3 p-4 rounded-card bg-dn-surface-low hover:bg-dn-surface transition-colors text-left cursor-pointer"
                >
                  <div className="w-10 h-10 flex items-center justify-center rounded-2xl bg-dn-surface text-dn-text-muted shrink-0">
                    <Icon name="auto_fix_high" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-dn-text-main">{template.name}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {template.eventType && (
                        <span className="text-xs text-dn-text-muted">
                          {t(`eventType.${template.eventType}`)}
                        </span>
                      )}
                      {(template.originNodeName || template.destinationNodeName) && (
                        <span className="text-xs text-dn-text-muted">
                          {template.originNodeName}
                          {template.destinationNodeName && ` → ${template.destinationNodeName}`}
                        </span>
                      )}
                      {template.category && (
                        <span className="text-xs text-dn-text-muted">
                          · {template.category.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <Icon name="chevron_right" className="text-lg text-dn-text-muted/50 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
