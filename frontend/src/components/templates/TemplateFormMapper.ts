import { z } from 'zod/v4';
import {
  nameField,
  descriptionField,
  optionalEventTypeField,
  optionalNodeIdField,
  optionalCategoryIdField,
  optionalTagIdsField,
} from '@/lib/validation';
import type { Template, CreateTemplateDto, EventType, ModifierType } from '@/models';

// ─── Schema ──────────────────────────────────────────────────────────────────

export function buildSchema(t: (key: string) => string) {
  return z
    .object({
      name: nameField(t),
      description: descriptionField(t),
      eventType: optionalEventTypeField(),
      originNodeId: optionalNodeIdField(),
      destinationNodeId: optionalNodeIdField(),
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
  originNodeId: '',
  destinationNodeId: '',
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
    originNodeId: template.originNodeId ? String(template.originNodeId) : '',
    destinationNodeId: template.destinationNodeId ? String(template.destinationNodeId) : '',
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
    originNodeId: values.originNodeId ? Number(values.originNodeId) : undefined,
    destinationNodeId: values.destinationNodeId ? Number(values.destinationNodeId) : undefined,
    category: values.categoryId ? { id: Number(values.categoryId) } : undefined,
    tags: values.tagIds?.map((id) => ({ id: Number(id) })),
    eventType: (values.eventType as EventType) || undefined,
    modifierType: (values.modifierType as ModifierType) || undefined,
    modifierValue:
      values.modifierType && values.modifierValue ? Number(values.modifierValue) : undefined,
  };
}
