# Ticket: Scheduled Jobs Integration for Manual vs Automated PaymentPlans

**Label:** `wayfinder:grilling`  
**Status:** Closed (Resolved)  
**ID:** issue-5  
**Parent:** issue-1  
**Blocked by:** None (Unblocked by issue-2)  

## Question

How should the Quarkus scheduled job engine handle `PaymentPlan` execution when configured as automated (`isAutomated=true`, generating `FinanceEvent`s directly) versus informative/manual (`isAutomated=false`, creating `Draft`s or sending notifications)?

## Resolution

1. **Pre-generation of `PaymentPlanItem`s**:
   - Upon creating a `PaymentPlan` with fixed terms (cuotas / period / expiration), the system pre-generates all $N$ `PaymentPlanItemEntity` records immediately in status `PENDING` (unlinked to events or drafts).

2. **Strict Automated Job Execution (`isAutomated = true`)**:
   - On `expectedDate`, the scheduled job's sole responsibility is to create a `DraftEntity` for due items.
   - The job links `PaymentPlanItem.draft` and updates status to `DRAFTED`.
   - **Golden Rule:** The Job **never** creates `FinanceEvent`s directly. `FinanceEvent` creation occurs exclusively when the user confirms the `Draft`.

3. **Manual Plans (`isAutomated = false`)**:
   - No background Jobs are executed or registered. Manual plans are managed entirely by user actions.
