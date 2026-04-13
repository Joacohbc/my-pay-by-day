import { useTranslation } from 'react-i18next';
import { useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import type { FormValues } from '@/components/events/EventFormMapper';

interface BasicInfoFieldsProps {
  onNameFocus: () => void;
  onDescriptionFocus: () => void;
}

export function BasicInfoFields({ onNameFocus, onDescriptionFocus }: BasicInfoFieldsProps) {
  const { t } = useTranslation();
  const { register, formState: { errors } } = useFormContext<FormValues>();

  return (
    <>
      <Input
        label={t('eventForm.eventName')}
        placeholder={t('eventForm.eventNamePlaceholder')}
        error={errors.name?.message}
        {...register('name')}
        onFocus={onNameFocus}
      />

      <Textarea
        label={t('eventForm.description')}
        placeholder={t('eventForm.descriptionPlaceholder')}
        {...register('description')}
        onFocus={onDescriptionFocus}
      />
    </>
  );
}
