// ─── Enums ────────────────────────────────────────────────────────────────────

export type EventType = 'INBOUND' | 'OUTBOUND' | 'OTHER';
export type FinanceNodeType = 'OWN' | 'EXTERNAL' | 'CONTACT';
export type ModifierType = 'PERCENTAGE' | 'FIXED';
export type RecurrenceFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

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

export interface FinanceLineItem extends Identifiable {
  financeNode: FinanceNode;
  amount: number;
}

export interface CreateLineItemDto {
  financeNode: { id: number };
  amount: number;
}

// ─── FinanceTransaction ───────────────────────────────────────────────────────

export interface FinanceTransaction extends Identifiable {
  transactionDate: string; // ISO-8601 date-time
  createdAt: string;
  updatedAt: string;
  lineItems: FinanceLineItem[];
}

export interface CreateTransactionDto {
  transactionDate: string;
  lineItems: CreateLineItemDto[];
}

// ─── FinanceEvent ─────────────────────────────────────────────────────────────

export interface FinanceEvent extends Identifiable {
  name: string;
  description?: string;
  receiptUrl?: string;
  type: EventType;
  transaction: FinanceTransaction;
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

export interface TemplateLineItem extends Identifiable {
  financeNode: FinanceNode;
  amount: number;
  modifierType?: ModifierType;
  modifierValue?: number;
}

export interface Template extends Identifiable {
  name: string;
  description?: string;
  lineItems: TemplateLineItem[];
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

export interface TimePeriod extends Identifiable {
  name: string;
  startDate: string;
  endDate: string;
  category?: Category;
  budgetedAmount?: number;
  savingsPercentageGoal?: number;
}

export type CreateTimePeriodDto = Omit<TimePeriod, 'id' | 'category'> & {
  category?: { id: number };
};
