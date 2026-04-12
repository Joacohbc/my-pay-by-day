import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useCategories } from '@/hooks/useCategories';
import { useTags } from '@/hooks/useTags';
import { useNodes } from '@/hooks/useNodes';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { CategorySelector } from '@/components/ui/CategorySelector';
import { TagSelector } from '@/components/ui/TagSelector';
import { Modal } from '@/components/ui/Modal';
import { NodeForm } from '@/components/nodes/NodeForm';
import {
  buildSchema,
  fromSubscription,
  toCreateDto,
  DEFAULT_VALUES,
  type FormValues,
} from '@/components/subscriptions/SubscriptionFormMapper';
import type { Subscription, CreateSubscriptionDto } from '@/models';

interface SubscriptionFormProps {
  editTarget?: Subscription | null;
  onSubmit: (dto: CreateSubscriptionDto) => Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
}

export function SubscriptionForm({ editTarget, onSubmit, onCancel, loading }: SubscriptionFormProps) {
  const { t } = useTranslation();
  const schema = buildSchema(t);

  const { data: categoriesPaged } = useCategories(0, 200);
  const { data: tagsPaged } = useTags(0, 200);
  const { data: nodesPaged } = useNodes(0, 200);
  const categories = categoriesPaged?.content ?? [];
  const tags = tagsPaged?.content ?? [];
  const nodes = nodesPaged?.content ?? [];
  const activeNodes = nodes.filter((n) => !n.archived);
  const nodeOptions = activeNodes.map((n) => ({ value: String(n.id), label: n.name }));

  const [showNodeModal, setShowNodeModal] = useState<'origin' | 'destination' | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: editTarget ? fromSubscription(editTarget) : DEFAULT_VALUES,
  });

  // Re-populate when editTarget changes (e.g. modal opens for different item)
  useEffect(() => {
    reset(editTarget ? fromSubscription(editTarget) : DEFAULT_VALUES);
  }, [editTarget, reset]);

  const handleFormSubmit = async (values: FormValues) => {
    await onSubmit(toCreateDto(values));
  };

  return (
    <>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.stopPropagation();
          handleSubmit(handleFormSubmit)(e);
        }}
      >
        <Input
          label={t('common.name')}
          placeholder={t('templates.namePlaceholder')}
          error={errors.name?.message}
          {...register('name')}
        />

        <Textarea
          label={t('common.description')}
          placeholder={t('templates.descriptionPlaceholder')}
          error={errors.description?.message}
          {...register('description')}
        />

        <div className="grid grid-cols-2 gap-3">
          <Controller
            name="recurrence"
            control={control}
            render={({ field }) => (
              <SearchableSelect
                label={t('subscriptions.recurrenceLabel')}
                placeholder={t('common.none')}
                options={[
                  { value: 'DAILY', label: t('subscriptions.recurrence.DAILY') },
                  { value: 'WEEKLY', label: t('subscriptions.recurrence.WEEKLY') },
                  { value: 'MONTHLY', label: t('subscriptions.recurrence.MONTHLY') },
                  { value: 'YEARLY', label: t('subscriptions.recurrence.YEARLY') },
                ]}
                error={errors.recurrence?.message}
                {...field}
              />
            )}
          />
          <Input
            label={t('subscriptions.next')}
            type="date"
            error={errors.nextExecutionDate?.message}
            {...register('nextExecutionDate')}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <SearchableSelect
                label={t('common.status')}
                options={[
                  { value: 'ACTIVE', label: t('subscriptions.status.ACTIVE') },
                  { value: 'CANCELLED', label: t('subscriptions.status.CANCELLED') },
                ]}
                error={errors.status?.message}
                {...field}
              />
            )}
          />
          <Controller
            name="eventType"
            control={control}
            render={({ field }) => (
              <SearchableSelect
                label={t('templates.eventType')}
                placeholder={t('common.none')}
                options={[
                  { value: 'INBOUND', label: t('eventType.INBOUND') },
                  { value: 'OUTBOUND', label: t('eventType.OUTBOUND') },
                  { value: 'OTHER', label: t('eventType.OTHER') },
                ]}
                {...field}
              />
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Controller
                name="originNodeId"
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    label={t('templates.originNode')}
                    placeholder={t('common.none')}
                    options={nodeOptions}
                    {...field}
                  />
                )}
              />
            </div>
            <button
              type="button"
              onClick={() => setShowNodeModal('origin')}
              className="mt-6 p-2 rounded-full text-dn-text-muted hover:text-dn-primary hover:bg-dn-primary/10 transition-colors"
              title={t('nodes.addNode')}
            >
              <Icon name="add_circle" className="text-xl" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Controller
                name="destinationNodeId"
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    label={t('templates.destinationNode')}
                    placeholder={t('common.none')}
                    options={nodeOptions}
                    {...field}
                  />
                )}
              />
            </div>
            <button
              type="button"
              onClick={() => setShowNodeModal('destination')}
              className="mt-6 p-2 rounded-full text-dn-text-muted hover:text-dn-primary hover:bg-dn-primary/10 transition-colors"
              title={t('nodes.addNode')}
            >
              <Icon name="add_circle" className="text-xl" />
            </button>
          </div>
        </div>

        <Controller
          name="categoryId"
          control={control}
          render={({ field }) => (
            <CategorySelector
              categories={categories}
              value={field.value ?? ''}
              onChange={(val) => field.onChange(val)}
              variant="select"
              showAdd={true}
            />
          )}
        />

        <Controller
          name="tagIds"
          control={control}
          render={({ field }) => (
            <TagSelector
              tags={tags}
              value={field.value ?? []}
              onChange={field.onChange}
              showAdd={true}
            />
          )}
        />

        <Input
          label={t('eventForm.amount')}
          placeholder={t('eventForm.amountPlaceholderEg')}
          type="number"
          step="0.01"
          min="0"
          {...register('modifierValue')}
        />

        <div className="flex gap-2 pt-2">
          <Button type="submit" fullWidth loading={loading}>
            {editTarget ? t('common.update') : t('common.create')}
          </Button>
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel}>
              {t('common.cancel')}
            </Button>
          )}
        </div>
      </form>

      <Modal
        open={showNodeModal !== null}
        onClose={() => setShowNodeModal(null)}
        title={t('nodes.newNode')}
      >
        <NodeForm
          onSuccess={(newNode) => {
            if (showNodeModal === 'origin') {
              setValue('originNodeId', String(newNode.id));
            } else if (showNodeModal === 'destination') {
              setValue('destinationNodeId', String(newNode.id));
            }
            setShowNodeModal(null);
          }}
          onCancel={() => setShowNodeModal(null)}
        />
      </Modal>
    </>
  );
}
