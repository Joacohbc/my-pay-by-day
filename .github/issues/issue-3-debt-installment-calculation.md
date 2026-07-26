# Ticket: Installment Progress & Debt Calculation Strategy

**Label:** `wayfinder:grilling`  
**Status:** Closed (Resolved)  
**ID:** issue-3  
**Parent:** issue-1  
**Blocked by:** None (Unblocked by issue-2)  

## Question

How should installment progress (e.g. Cuota 3/12), remaining debt balance, and payment status be calculated across linked `FinanceEvent`s and `Draft`s for fixed-term installment plans versus open-ended subscriptions?

## Resolution

1. **`PaymentPlanItemEntity` Explicit Intermediate Model**:
   - Hierarchy: `PaymentPlan -> PaymentPlanItem -> FinanceEvent / Draft`.
   - `PaymentPlanItemEntity` attributes: `paymentPlan`, `installmentNumber` (1..N), `expectedDate`, `expectedAmount`, `@ManyToOne` `event` (nullable), `@ManyToOne` `draft` (nullable), and `itemStatus` (`PENDING`, `DRAFTED`, `PAID`, `SKIPPED`).
   - Flexibility: Multiple items can reference the same `FinanceEvent` (e.g. paying cuotas 4 and 5 in a single lump-sum event).

2. **Soft Default Amounts & Flexible Enforcements**:
   - `installmentAmount` and `totalAmount` act as reference/default starting values, not strict validation constraints. Actual payments reflect real amounts (handling inflation, variable interest, or fee adjustments).

3. **Metrics Calculation & Automatic Completion**:
   - `completedInstallments`: Count of items with `status = PAID` (or non-null `event`).
   - `paidAmount`: Sum of amounts from linked `FinanceEvent`s.
   - `remainingAmount`: $\max(0, \text{totalAmount} - \text{paidAmount})$.
   - Auto-Completion: When all items reach `PAID` (or `completedInstallments >= totalInstallments`), `PaymentPlan.status` automatically transitions to `COMPLETED`.
