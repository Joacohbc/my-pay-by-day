# Ticket: Research Existing Subscription Footprint Across the Stack

**Label:** `wayfinder:research`  
**Status:** Closed (Resolved by Research Subagent)  
**ID:** issue-4  
**Parent:** issue-1  
**Blocked by:** None  

## Question

What are all the exact code references, database tables, REST endpoints, UI components, AI tools, and test suites currently handling `Subscription` across `mypaybyday`, `frontend`, and `chatbot` that must be refactored or migrated to `PaymentPlan`?

## Resolution

A complete inventory was generated:
- **Backend (25 Java files)**: `SubscriptionEntity`, `SubscriptionDto`, `SubscriptionRepository`, `SubscriptionResource`, `SubscriptionService`, `JobSchedulerService`, `DataTransferService`, `SubscriptionValidator`, `MsgKey`, `messages_en.properties`, `messages_es.properties`, and related service usage checks.
- **Database (Flyway)**: `V1__baseline.sql` baseline tables (`subscription`, `subscription_tag`, `finance_event.subscription_id`). Requires new `V3__migrate_subscriptions_to_payment_plans.sql`.
- **Frontend (20 TS/React files)**: `/subscriptions` route, `SubscriptionsPage.tsx`, `SubscriptionForm.tsx`, `useSubscriptions.ts`, `subscriptions.service.ts`, `queryKeys.ts`, `cacheInvalidation.ts`, `en.ts`, `es.ts`.
- **Chatbot (5 TS files)**: `chatbot/src/backend/enums.ts`, `chatbot/src/tools/types.ts`, `chatbot/src/tools/finance.ts`, `chatbot/src/prompts/system.ts`. Requires `pnpm gen:tools`.
- **CI & Observability**: `backend.json` Grafana dashboard (`subscription-processor` -> `payment-plan-processor`).
