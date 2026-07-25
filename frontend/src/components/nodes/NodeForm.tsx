import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { IconPicker } from '@/components/ui/IconPicker';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { useCreateNode, useUpdateNode } from '@/hooks/useNodes';
import { useAiFieldController } from '@/hooks/useAiFieldController';
import { FormPatchAiChatWidget } from '@/components/ui/FormPatchAiChatWidget';
import type { FinanceNode, FinanceNodeType, CreateFinanceNodeDto } from '@/models';

const NODE_TYPES: FinanceNodeType[] = ['OWN', 'EXTERNAL', 'CONTACT'];

/**
 * Which direction a node's limit points. The backend stores a single signed
 * `balanceLimit`; this only exists so the user types a plain positive amount and states
 * what it means, instead of having to reason about the sign themselves.
 */
type LimitKind = 'DEBT_CAP' | 'BALANCE_TARGET';

interface NodeFormValues {
  name: string;
  type: FinanceNodeType;
  description: string;
  icon: string;
  color: string;
  limitAmount: string;
  limitKind: LimitKind;
  cycleDay: string;
  settlementDay: string;
}

function limitKindOf(balanceLimit?: number): LimitKind {
  return balanceLimit !== undefined && balanceLimit > 0 ? 'BALANCE_TARGET' : 'DEBT_CAP';
}

/** Turns the typed magnitude plus its direction back into the signed limit the API expects. */
function toSignedLimit(limitAmount: string, limitKind: LimitKind): number | undefined {
  const magnitude = Math.abs(Number(limitAmount));
  if (!limitAmount.trim() || Number.isNaN(magnitude) || magnitude === 0) return undefined;
  return limitKind === 'DEBT_CAP' ? -magnitude : magnitude;
}

function toDayOfMonth(day: string): number | undefined {
  const parsed = Number(day);
  return day.trim() && !Number.isNaN(parsed) ? parsed : undefined;
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

  const { register, handleSubmit, control, getValues, setValue, formState: { errors } } = useForm<NodeFormValues>({
    defaultValues: {
      name: editTarget?.name ?? '',
      type: editTarget?.type ?? 'OWN',
      description: editTarget?.description ?? '',
      icon: editTarget?.icon ?? '',
      color: editTarget?.color ?? '',
      limitAmount: editTarget?.balanceLimit != null ? String(Math.abs(editTarget.balanceLimit)) : '',
      limitKind: limitKindOf(editTarget?.balanceLimit),
      cycleDay: editTarget?.cycleDay != null ? String(editTarget.cycleDay) : '',
      settlementDay: editTarget?.settlementDay != null ? String(editTarget.settlementDay) : '',
    },
  });

  const nameAi = useAiFieldController<NodeFormValues>({
    name: 'name',
    getValues,
    setValue,
    allowVoice: true,
  });

  const descriptionAi = useAiFieldController<NodeFormValues>({
    name: 'description',
    getValues,
    setValue,
    allowVoice: true,
  });

  const nodeTypeOptions = [
    { value: 'OWN', label: t('nodes.ownAccountType') },
    { value: 'EXTERNAL', label: t('nodes.externalType') },
    { value: 'CONTACT', label: t('nodes.contactType') },
  ];

  const limitKindOptions = [
    { value: 'DEBT_CAP', label: t('nodes.limitKindDebt') },
    { value: 'BALANCE_TARGET', label: t('nodes.limitKindTarget') },
  ];

  const onSubmit = async (values: NodeFormValues, e?: React.BaseSyntheticEvent) => {
    e?.stopPropagation();
    const { limitAmount, limitKind, cycleDay, settlementDay, ...nodeFields } = values;
    // Update is a full replace, so the capability fields always travel — omitting them
    // would silently clear the node's limit and cycle.
    const dto: CreateFinanceNodeDto = {
      ...nodeFields,
      balanceLimit: toSignedLimit(limitAmount, limitKind),
      cycleDay: toDayOfMonth(cycleDay),
      settlementDay: toDayOfMonth(settlementDay),
    };
    try {
      if (editTarget) {
        const updated = await updateNode.mutateAsync({ id: editTarget.id, dto });
        onSuccess?.(updated as unknown as FinanceNode);
      } else {
        const created = await createNode.mutateAsync(dto);
        onSuccess?.(created as unknown as FinanceNode);
      }
    } catch {
      // Save failure is shipped by the global mutation logger; the mutation surfaces it in the UI.
    }
  };

  const isSubmitting = createNode.isPending || updateNode.isPending;

  const applyPatch = (patch: Record<string, unknown>) => {
    if (typeof patch.name === 'string') setValue('name', patch.name, { shouldDirty: true });
    if (typeof patch.description === 'string') setValue('description', patch.description, { shouldDirty: true });
    if (typeof patch.icon === 'string') setValue('icon', patch.icon, { shouldDirty: true });
    if (typeof patch.color === 'string') setValue('color', patch.color, { shouldDirty: true });
    if (typeof patch.type === 'string' && NODE_TYPES.includes(patch.type as FinanceNodeType)) {
      setValue('type', patch.type as FinanceNodeType, { shouldDirty: true });
    }
  };

  return (
    <>
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
        ai={nameAi}
      />
      <Textarea
        label={t('common.description')}
        placeholder={t('nodes.descriptionPlaceholder')}
        {...register('description')}
        ai={descriptionAi}
      />
      <Controller
        name="icon"
        control={control}
        render={({ field }) => (
          <IconPicker
            label={t('nodes.iconLabel')}
            value={field.value}
            onChange={field.onChange}
          />
        )}
      />
      <Controller
        name="color"
        control={control}
        render={({ field }) => (
          <ColorPicker
            label={t('common.colorLabel')}
            value={field.value}
            onChange={field.onChange}
          />
        )}
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

      <div className="space-y-4 border-t border-dn-border pt-4">
        <div>
          <p className="text-dn-text-main font-medium text-sm">{t('nodes.profileSection')}</p>
          <p className="text-xs text-dn-text-muted mt-0.5">{t('nodes.profileHint')}</p>
        </div>
        <Input
          type="number"
          step="any"
          label={t('nodes.limitLabel')}
          placeholder={t('nodes.limitPlaceholder')}
          {...register('limitAmount')}
        />
        <Controller
          name="limitKind"
          control={control}
          render={({ field }) => (
            <SearchableSelect
              label={t('nodes.limitKindLabel')}
              options={limitKindOptions}
              {...field}
            />
          )}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            type="number"
            min={1}
            max={28}
            label={t('nodes.cycleDayLabel')}
            {...register('cycleDay')}
          />
          <Input
            type="number"
            min={1}
            max={28}
            label={t('nodes.settlementDayLabel')}
            {...register('settlementDay')}
          />
        </div>
        <p className="text-xs text-dn-text-muted">{t('nodes.cycleDayHint')}</p>
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
    <FormPatchAiChatWidget
      entityType="node"
      getCurrentValues={() => getValues() as unknown as Record<string, unknown>}
      onPatch={applyPatch}
    />
    </>
  );
}
