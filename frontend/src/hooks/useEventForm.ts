import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import type { FinanceEvent, EventType } from '@/models';
import { toLocalDateTimeString, getLocalizedNow } from '@/lib/format';
import { buildSchema } from '@/components/events/EventFormMapper';
import type { FormValues } from '@/components/events/EventFormMapper';

const MIN_LINE_ITEMS = 2;

const DEFAULT_LINE_ITEMS: FormValues['lineItems'] = [
  { nodeId: '', amount: '' },
  { nodeId: '', amount: '' },
];

function buildFormDefaults(defaultValues?: Partial<FinanceEvent>): FormValues {
  const transactionDate = defaultValues?.transactionDate
    ? toLocalDateTimeString(defaultValues.transactionDate)
    : toLocalDateTimeString(getLocalizedNow());

  const categoryId = defaultValues?.category ? String(defaultValues.category.id) : '';
  const tagIds = defaultValues?.tags?.map((t) => String(t.id)) ?? [];

  const lineItems =
    defaultValues?.lineItems?.map((li) => ({
      nodeId: String(li.financeNodeId),
      amount: li.amount !== 0 ? String(li.amount) : '',
    })) ?? DEFAULT_LINE_ITEMS;

  const numberOfLineItems = defaultValues?.lineItems?.length ?? 0;
  const numberOfEmptyItems = defaultValues?.lineItems?.filter((li) => !li.financeNodeId).length ?? 0;
  const isSimplifiedMode = numberOfEmptyItems > 0 && [0, 1, 2].includes(numberOfLineItems);

  return {
    name: defaultValues?.name ?? '',
    description: defaultValues?.description ?? '',
    type: (defaultValues?.type as EventType) ?? 'OUTBOUND',
    transactionDate,
    categoryId,
    tagIds,
    lineItems,
    isDraft: defaultValues?.isDraft ?? false,
    draftId: defaultValues?.draftId,
    isSimplifiedMode,
  };
}

/**
 * Configuration options for the event form initialization.
 *
 * The separation between base and draft values is a deliberate design decision to allow
 * React Hook Form to compute `dirtyFields` against the original server state, while
 * displaying the unsaved draft state to the user.
 */
interface UseEventFormOptions {
  /**
   * The immutable baseline representing the event precisely as it exists on the server.
   * RHF uses this strictly for its dirty-tracking diff engine.
   */
  baseValues?: Partial<FinanceEvent>;
  /**
   * In-progress edits or templates applied on top of the base.
   * RHF projects this onto the UI inputs without mutating the original baseline.
   */
  draftValues?: Partial<FinanceEvent>;
}

/**
 * Centralizes React Hook Form (RHF) initialization, separating the complex state management
 * from the visual component.
 *
 * Returns the RHF `methods` bag and a `formReady` flag. `formReady` acts as a synchronous
 * suspension switch to hide the visual flash that occurs during the extra render cycle RHF
 * needs to defensively superimpose the `values` over the `defaultValues`.
 */
export function useEventForm({ baseValues, draftValues }: UseEventFormOptions) {
  const { t } = useTranslation();
  const schema = useMemo(() => buildSchema(t, MIN_LINE_ITEMS), [t]);

  const computedValues = useMemo(
    () => buildFormDefaults(draftValues ?? baseValues),
    [draftValues, baseValues]
  );
  const initValues = useMemo(() => buildFormDefaults(baseValues), [baseValues]);

  const methods = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: initValues,
    values: computedValues,
    resetOptions: { keepDefaultValues: true },
  });

  const [formReady, setFormReady] = useState(!draftValues);

  useEffect(() => {
    if (!formReady) {
      // Forzamos un render en cascada deliberadamente para darle a React Hook Form
      // un ciclo para aplicar `values` sobre `defaultValues` antes de pintar el form.
      // eslint-disable-next-line
      setFormReady(true);
    }
  }, [formReady]);

  return { methods, formReady };
}
