import { useTranslation } from 'react-i18next';
import { useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import type { FormValues } from '@/components/events/EventFormMapper';

export function BasicInfoFields() {
  const { t } = useTranslation();
  const { register, formState: { errors } } = useFormContext<FormValues>();

  return (
    <>
      <Input
        label={t('eventForm.eventName')}
        placeholder={t('eventForm.eventNamePlaceholder')}
        error={errors.name?.message}
        {...register('name')}
      />

      <Textarea
        label={t('eventForm.description')}
        placeholder={t('eventForm.descriptionPlaceholder')}
        {...register('description')}
      />
    </>
  );
}
