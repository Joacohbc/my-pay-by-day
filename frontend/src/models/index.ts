// ─── Enums ────────────────────────────────────────────────────────────────────

export type EventType = 'INBOUND' | 'OUTBOUND' | 'OTHER';
export type FinanceNodeType = 'OWN' | 'EXTERNAL' | 'CONTACT';
export type ModifierType = 'PERCENTAGE' | 'FIXED';
export type RecurrenceFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PagedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

// ─── Base ─────────────────────────────────────────────────────────────────────

export interface Identifiable {
  id: number;
}

// ─── Category ─────────────────────────────────────────────────────────────────

export interface Category extends Identifiable {
  name: string;
  description?: string;
  icon?: string;
  archived: boolean;
}

export type CreateCategoryDto = Omit<Category, 'id' | 'archived'>;

// ─── Tag ──────────────────────────────────────────────────────────────────────

export interface Tag extends Identifiable {
  name: string;
  description?: string;
  archived: boolean;
}

export type CreateTagDto = Omit<Tag, 'id' | 'archived'>;

// ─── FinanceNode ──────────────────────────────────────────────────────────────

export type SelectableEntityType = 'FINANCE_EVENT' | 'CATEGORY' | 'TAG' | 'FINANCE_NODE';

export interface UsageStats {
  entityId: number;
  domainUsageCount: number;
  selectionCount: number;
  lastSelectedAt?: string;
}

export interface FinanceNode extends Identifiable {
  name: string;
  type: FinanceNodeType;
  description?: string;
  icon?: string;
  archived: boolean;
}

export type CreateFinanceNodeDto = Omit<FinanceNode, 'id' | 'archived'>;

// ─── FinanceLineItem ──────────────────────────────────────────────────────────

/** Read model — matches the flat FinanceLineItemDto from the backend */
export interface FinanceLineItem {
  financeNodeId: number;
  financeNodeName: string;
  financeNodeIcon?: string;
  amount: number;
}

export interface CreateLineItemDto {
  financeNode: { id: number };
  amount: number;
}

// ─── FinanceTransaction ───────────────────────────────────────────────────────

/** Read model — matches the flat FinanceTransactionDto from the backend */
export interface FinanceTransaction extends Identifiable {
  transactionDate: string;
  lineItems: FinanceLineItem[];
}

/** Used only when constructing write payloads (POST/PUT /events) */
export interface CreateTransactionDto {
  transactionDate: string;
  lineItems: CreateLineItemDto[];
}

// ─── File ─────────────────────────────────────────────────────────────────────

export interface EventSummary extends Identifiable {
  name: string;
  type: EventType;
}

export interface FileDto extends Identifiable {
  fileName: string;
  mimeType: string;
  /** Short backend-computed type label (PDF, DOCX, PNG, ...). Optional to tolerate older backends. */
  typeLabel?: string;
  size: number;
  isOrphan: boolean;
}

export interface FileWithEventDto extends FileDto {
  events?: EventSummary[];
}

export interface Base64FileUploadRequestDto {
  fileName: string;
  mimeType: string;
  base64Content: string;
}

// ─── FinanceEvent ─────────────────────────────────────────────────────────────

export interface RelatedEvent extends Identifiable {
  name: string;
  date: string;
  amount: number;
  type: EventType;
  category?: Category;
}

/** Read model — matches the flat FinanceEventDto from the backend */
export interface FinanceEvent extends Identifiable {
  transactionId: number;
  name: string;
  description?: string;
  type: EventType;
  transactionDate: string; // ISO-8601 date-time
  lineItems: FinanceLineItem[];
  category?: Category;
  tags: Tag[];
  relatedEvents?: RelatedEvent[];
  isDraft?: boolean;
  draftId?: number;
  files?: FileDto[];
}

export interface CreateEventDto {
  name: string;
  description?: string;
  type: EventType;
  transaction: CreateTransactionDto;
  category?: { id: number };
  tags?: { id: number }[];
  isDraft?: boolean;
  draftId?: number;
  fileIds?: number[];
}

/** PATCH model — all fields optional; `null` means "clear", `undefined` means "don't touch" */
export interface PatchEventDto {
  name?: string;
  description?: string | null;
  type?: EventType;
  category?: { id: number } | null;
  tags?: { id: number }[] | null;
  fileIds?: number[] | null;
  transaction?: CreateTransactionDto;
}

/** Bulk PATCH — applies same category/tags change to multiple events in one request */
export interface BulkPatchEventDto {
  eventIds: number[];
  category?: { id: number } | null;
  tags?: { id: number }[] | null;
}

export interface FinanceEventDraftInputDto {
  id?: number;
  name?: string;
  description?: string;
  type?: EventType;
  transactionDate?: string;
  categoryId?: number;
  tagIds?: number[];
  lineItems?: { financeNodeId: number; amount: number }[];
}

export type DraftConfirmMode = 'MERGE' | 'CREATE_ONLY';

export interface ConfirmDraftsRequestDto {
  draftIds: number[];
  mode: DraftConfirmMode;
}

export interface ConfirmDraftsResultDto {
  confirmedEvents: FinanceEvent[];
  failedDraftIds: number[];
}

// ─── Template ─────────────────────────────────────────────────────────────────

export interface Template extends Identifiable {
  name: string;
  description?: string;
  originNodeId?: number;
  originNodeName?: string;
  destinationNodeId?: number;
  destinationNodeName?: string;
  category?: Category;
  tags: Tag[];
  eventType?: EventType;
  modifierType?: ModifierType;
  modifierValue?: number;
}

export interface CreateTemplateDto {
  name: string;
  description?: string;
  originNodeId?: number;
  destinationNodeId?: number;
  category?: { id: number };
  tags?: { id: number }[];
  eventType?: EventType;
  modifierType?: ModifierType;
  modifierValue?: number;
}

// ─── Subscription ─────────────────────────────────────────────────────────────

export type SubscriptionStatus = 'ACTIVE' | 'CANCELLED';

export interface Subscription extends Identifiable {
  name: string;
  description?: string;
  originNodeId?: number;
  originNodeName?: string;
  destinationNodeId?: number;
  destinationNodeName?: string;
  category?: Category;
  tags: Tag[];
  eventType?: EventType;
  modifierValue?: number;
  recurrence: RecurrenceFrequency;
  nextExecutionDate: string; // ISO-8601 date
  status: SubscriptionStatus;
}

export interface CreateSubscriptionDto {
  name: string;
  description?: string;
  originNodeId?: number;
  destinationNodeId?: number;
  category?: { id: number };
  tags?: { id: number }[];
  eventType?: EventType;
  modifierValue?: number;
  recurrence: RecurrenceFrequency;
  nextExecutionDate: string;
  status?: SubscriptionStatus;
}

// ─── TimePeriod ───────────────────────────────────────────────────────────────

export interface TimePeriodBudgetDto extends Identifiable {
  category?: Category;
  budgetedAmount: number;
}

export interface CategoryBudgetSummaryDto {
  category: Category;
  budgetedAmount: number;
  spentAmount: number;
}

export interface TimePeriod extends Identifiable {
  name: string;
  startDate: string;
  endDate: string;
  budgets?: TimePeriodBudgetDto[];
  savingsPercentageGoal?: number;
  budgetLimit?: number;
}

export type CreateTimePeriodDto = Omit<TimePeriod, 'id'>;

export interface TimePeriodBalance {
  timePeriod: TimePeriod;
  income: number;
  outbound: number;
  categoryBudgets: CategoryBudgetSummaryDto[];
  events: FinanceEvent[];
}

export interface DynamicTimePeriodBalance {
  startDate: string;
  endDate: string;
  income: number;
  outbound: number;
  events: FinanceEvent[];
}

export * from './drafts';

// ─── Tag Group ────────────────────────────────────────────────────────────────

export interface TagGroup extends Identifiable {
  name: string;
  description?: string;
  icon?: string;
  archived: boolean;
  tags: Tag[];
}

export interface CreateTagGroupDto {
  name: string;
  description?: string;
  icon?: string;
  tagIds: number[];
}

export * from './duplicates';
import type { DuplicateDetectionSettings } from './duplicates';

// ─── DataTransfer ─────────────────────────────────────────────────────────────

export interface DataTransferDto {
  version: string;
  exportedAt: string;
  tags: Tag[];
  categories: Category[];
  financeNodes: FinanceNode[];
  tagGroups: TagGroup[];
  events: FinanceEvent[];
  files: FileExportDto[];
  subscriptions: Subscription[];
  templates: Template[];
  timePeriods: TimePeriod[];
  duplicateDetectionSettings?: DuplicateDetectionSettings;
}

export interface DataTransferResult {
  importedTags: number;
  importedCategories: number;
  importedNodes: number;
  importedTagGroups: number;
  importedEvents: number;
  importedFiles: number;
  importedSubscriptions: number;
  importedTemplates: number;
  importedTimePeriods: number;
  skippedEvents: string[];
}

export interface FileExportDto extends Identifiable {
  fileName: string;
  mimeType: string;
  size: number;
  base64Content: string;
}
