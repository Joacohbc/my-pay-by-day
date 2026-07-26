# Ticket: Full End-to-End PaymentPlan Prototype (Backend + UI + Chatbot Tools)

**Label:** `wayfinder:prototype`  
**Status:** Resolved / Closed  
**ID:** issue-6  
**Parent:** issue-1  
**Blocked by:** None (Unblocked by issue-2)  

## Outcome

Full end-to-end `PaymentPlan` prototype implemented across all 3 stacks:

1. **Backend Layer (Java / Quarkus 3.x / Panache):**
   - **Flyway Schema:** `V3__add_payment_plans.sql` creating `payment_plan`, `payment_plan_tag`, and `payment_plan_item` tables.
   - **Enums & Entities:** `PaymentPlanType`, `PaymentPlanStatus`, `PaymentPlanItemStatus`, `PaymentPlanEntity`, `PaymentPlanItemEntity`.
   - **Service & Jobs:** `PaymentPlanService` pre-generates $N$ items upon plan creation, and `@Scheduled` `JobSchedulerService` creates `DraftEntity` instances on item due dates for automated plans.
   - **REST Resource:** `PaymentPlanResource` mounted at `/payment-plans` with OpenAPI specs.
   - **Compilation:** Clean build verified with `BUILD SUCCESS`.

2. **Frontend Layer (React 19 + TypeScript + Tailwind CSS):**
   - **Models & API Services:** `paymentPlan.ts` model types, `paymentPlans.service.ts`, and `usePaymentPlans.ts` TanStack Query hooks.
   - **Dashboard Page & Form:** `PaymentPlansPage.tsx` with KPI metrics, progress bars (e.g. 3/12 cuotas), active/remaining debt calculations, and modal `PaymentPlanForm.tsx`.
   - **Navigation & i18n:** Added `/payment-plans` route to `routes.ts`, `router.tsx`, `BottomNav.tsx`, and translations in `en.ts` and `es.ts`.
   - **Verification:** ESLint and `tsc -b` pass with 0 errors.

3. **AI Chatbot Layer (Hono + Vercel AI SDK):**
   - **Tools:** Added `listPaymentPlans` tool to `chatbot/src/tools/finance.ts`.
   - **Manifest:** Regenerated `toolManifest.generated.ts` via `pnpm gen:tools`.
