# Ticket: Define PaymentPlan Entity Structure & Relationships

**Label:** `wayfinder:grilling`  
**Status:** Closed (Resolved)  
**ID:** issue-2  
**Parent:** issue-1  
**Blocked by:** None  

## Question

How should the `PaymentPlan` entity be structured in the backend (Quarkus/Hibernate Panache), and what is the exact cardinality and mapping strategy for linking `PaymentPlan` to `FinanceEvent` (occurred events) and `Draft` (future/pending events)?

## Resolution

1. **Dual Operational Nature of `PaymentPlanEntity`**:
   - **Automated Mode (`isAutomated = true`)**: Driven by Quarkus `JobSchedulerService` to generate `FinanceEvent`s (if `autoCreateDraft = false`) or `Draft`s (if `autoCreateDraft = true`) on `nextDueDate`.
   - **Manual / Grouping Mode (`isAutomated = false`)**: Acts as a user-configured grouping container to associate past `FinanceEvent`s or future `Draft`s manually, tracking progress (`N/M` cuotas), total paid, and remaining debt.

2. **Entity Attributes**:
   - `name`, `description`, `planType` (`RECURRING`, `INSTALLMENT`, `CUSTOM`), `status` (`ACTIVE`, `PAUSED`, `COMPLETED`, `CANCELLED`).
   - `totalInstallments`, `totalAmount`, `installmentAmount`, `frequency`, `startDate`, `nextDueDate`.
   - `isAutomated`, `autoCreateDraft`.
   - Relationships to `originNode`, `destinationNode`, `category`, and `tags`.

3. **Relational Join Strategy & Immutability**:
   - Join table `finance_event_payment_plan` (`event_id`, `payment_plan_id`, `installment_number`).
   - Join table `draft_payment_plan` (`draft_id`, `payment_plan_id`, `expected_installment_number`).
   - Immutability: Completed or cancelled plans are preserved in DB to maintain audit history of linked events.
