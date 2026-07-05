import { z } from 'zod/v4';
import {
  nameField,
  descriptionField,
  optionalEventTypeField,
  optionalCategoryIdField,
  optionalTagIdsField,
} from '@/lib/validation';
import type { Template, CreateTemplateDto, EventType, ModifierType } from '@/models';

// ─── Schema ──────────────────────────────────────────────────────────────────

const lineItemSchema = z.object({
  nodeId: z.string(),
  amount: z.string(),
});

export function buildSchema(t: (key: string, options?: Record<string, unknown>) => string, minItems = 0, maxItems?: number) {
  return z
    .object({
      name: nameField(t),
      description: descriptionField(t),
      eventType: optionalEventTypeField(),
      lineItems: maxItems
        ? z.array(lineItemSchema).min(minItems).max(maxItems)
        : z.array(lineItemSchema).min(minItems),
      categoryId: optionalCategoryIdField(),
      tagIds: optionalTagIdsField(),
      modifierType: z.enum(['PERCENTAGE', 'FIXED']).optional().or(z.literal('')),
      modifierValue: z.string().optional(),
    })
    .refine(
      (data) => {
        if (data.modifierType) {
          return (
            data.modifierValue !== undefined &&
            data.modifierValue !== '' &&
            !isNaN(Number(data.modifierValue))
          );
        }
        return true;
      },
      { message: t('validation.modifierValueRequired'), path: ['modifierValue'] },
    );
}

export type FormValues = z.infer<ReturnType<typeof buildSchema>>;

// ─── Defaults ────────────────────────────────────────────────────────────────

export const DEFAULT_VALUES: FormValues = {
  name: '',
  description: '',
  eventType: '',
  lineItems: [
    { nodeId: '', amount: '' },
    { nodeId: '', amount: '' },
  ],
  categoryId: '',
  tagIds: [],
  modifierType: '',
  modifierValue: '',
};

// ─── Mappers ─────────────────────────────────────────────────────────────────

export function fromTemplate(template: Template): FormValues {
  return {
    name: template.name,
    description: template.description ?? '',
    eventType: template.eventType ?? '',
    lineItems: [
      { nodeId: template.originNodeId ? String(template.originNodeId) : '', amount: '' },
      { nodeId: template.destinationNodeId ? String(template.destinationNodeId) : '', amount: '' },
    ],
    categoryId: template.category ? String(template.category.id) : '',
    tagIds: template.tags.map((tag) => String(tag.id)),
    modifierType: template.modifierType ?? '',
    modifierValue: template.modifierValue != null ? String(template.modifierValue) : '',
  };
}

export function toCreateDto(values: FormValues): CreateTemplateDto {
  return {
    name: values.name,
    description: values.description || undefined,
    originNodeId: values.lineItems[0]?.nodeId ? Number(values.lineItems[0].nodeId) : undefined,
    destinationNodeId: values.lineItems[1]?.nodeId ? Number(values.lineItems[1].nodeId) : undefined,
    category: values.categoryId ? { id: Number(values.categoryId) } : undefined,
    tags: values.tagIds?.map((id) => ({ id: Number(id) })),
    eventType: (values.eventType as EventType) || undefined,
    modifierType: (values.modifierType as ModifierType) || undefined,
    modifierValue:
      values.modifierType && values.modifierValue ? Number(values.modifierValue) : undefined,
  };
}
