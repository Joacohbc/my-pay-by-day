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
}

export type CreateCategoryDto = Omit<Category, 'id'>;

// ─── Tag ──────────────────────────────────────────────────────────────────────

export interface Tag extends Identifiable {
  name: string;
  description?: string;
}

export type CreateTagDto = Omit<Tag, 'id'>;

// ─── FinanceNode ──────────────────────────────────────────────────────────────

export interface FinanceNode extends Identifiable {
  name: string;
  type: FinanceNodeType;
  archived: boolean;
}

export type CreateFinanceNodeDto = Omit<FinanceNode, 'id' | 'archived'>;

// ─── FinanceLineItem ──────────────────────────────────────────────────────────

/** Read model — matches the flat FinanceLineItemDto from the backend */
export interface FinanceLineItem extends Identifiable {
  financeNodeId: number;
  financeNodeName: string;
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

// ─── FinanceEvent ─────────────────────────────────────────────────────────────

/** Read model — matches the flat FinanceEventDto from the backend */
export interface FinanceEvent extends Identifiable {
  transactionId: number;
  name: string;
  description?: string;
  receiptUrl?: string;
  type: EventType;
  transactionDate: string; // ISO-8601 date-time
  lineItems: FinanceLineItem[];
  category?: Category;
  tags: Tag[];
}

export interface CreateEventDto {
  name: string;
  description?: string;
  receiptUrl?: string;
  type: EventType;
  transaction: CreateTransactionDto;
  category?: { id: number };
  tags?: { id: number }[];
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

export interface Subscription extends Identifiable {
  name: string;
  template: Template;
  recurrence: RecurrenceFrequency;
  nextExecutionDate: string; // ISO-8601 date
}

export type CreateSubscriptionDto = Omit<Subscription, 'id' | 'template'> & {
  template: { id: number };
};

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
