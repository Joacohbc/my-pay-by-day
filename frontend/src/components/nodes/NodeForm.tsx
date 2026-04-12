import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useCreateNode, useUpdateNode } from '@/hooks/useNodes';
import type { FinanceNode, FinanceNodeType } from '@/models';

interface NodeFormValues {
  name: string;
  type: FinanceNodeType;
}

interface NodeFormProps {
  editTarget?: FinanceNode | null;
  onSuccess?: (node: FinanceNode) => void;
  onCancel?: () => void;
}

export function NodeForm({ editTarget, onSuccess, onCancel }: NodeFormProps) {
  const { t } = useTranslation();
  const createNode = useCreateNode();
  const updateNode = useUpdateNode();

  const { register, handleSubmit, control, formState: { errors } } = useForm<NodeFormValues>({
    defaultValues: {
      name: editTarget?.name ?? '',
      type: editTarget?.type ?? 'OWN',
    },
  });

  const nodeTypeOptions = [
    { value: 'OWN', label: t('nodes.ownAccountType') },
    { value: 'EXTERNAL', label: t('nodes.externalType') },
    { value: 'CONTACT', label: t('nodes.contactType') },
  ];

  const onSubmit = async (values: NodeFormValues, e?: React.BaseSyntheticEvent) => {
    e?.stopPropagation();
    try {
      if (editTarget) {
        const updated = await updateNode.mutateAsync({ id: editTarget.id, dto: values });
        onSuccess?.(updated as unknown as FinanceNode);
      } else {
        const created = await createNode.mutateAsync(values);
        onSuccess?.(created as unknown as FinanceNode);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const isSubmitting = createNode.isPending || updateNode.isPending;

  return (
    <form 
      onSubmit={(e) => {
        e.stopPropagation();
        handleSubmit(onSubmit)(e);
      }} 
      className="space-y-4"
    >
      <Input
        label={t('common.name')}
        placeholder={t('nodes.nodeNamePlaceholder')}
        error={errors.name?.message}
        {...register('name', { required: t('common.nameRequired') })}
      />
      <Controller
        name="type"
        control={control}
        render={({ field }) => (
          <SearchableSelect
            label={t('common.type')}
            options={nodeTypeOptions}
            {...field}
          />
        )}
      />
      <div className="bg-dn-surface-low rounded-input p-3 space-y-1 text-xs text-dn-text-muted">
        <p><span className="text-dn-text-main font-medium">{t('nodeType.OWN')}:</span> {t('nodes.ownDesc')}</p>
        <p><span className="text-dn-text-main font-medium">{t('nodeType.EXTERNAL')}:</span> {t('nodes.externalDesc')}</p>
        <p><span className="text-dn-text-main font-medium">{t('nodeType.CONTACT')}:</span> {t('nodes.contactDesc')}</p>
      </div>

      <div className="pt-2 flex gap-3">
        {onCancel && (
          <Button type="button" variant="ghost" fullWidth onClick={onCancel} disabled={isSubmitting}>
            {t('common.cancel')}
          </Button>
        )}
        <Button type="submit" fullWidth loading={isSubmitting}>
          {editTarget ? t('common.save') : t('nodes.createNode')}
        </Button>
      </div>
    </form>
  );
}
