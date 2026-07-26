# Map: PaymentPlan Architecture & Subscription Migration

**Label:** `wayfinder:map`  
**Status:** Resolved / Completed  
**ID:** issue-1

## Destination

Implement a flexible, highly configurable `PaymentPlan` domain model that replaces the rigid `Subscription` entity. The `PaymentPlan` engine unifies recurring subscriptions, fixed-term installment plans (cuotas), and self-imposed payment schedules into a single traceable agreement framework. It strongly links with both past `FinanceEvent`s and future `Draft`s, supporting both manual tracking/reminders and automated execution via backend scheduled Jobs.

## Notes

- **Domain:** Personal Finance, Accounting Engine, Double-Entry, Event Wrapper Pattern.
- **Skills to consult:** `quarkus-patterns`, `java-coding-standards`, `react-hook-form`, `zod`, `ui-styling`, `code-design`.
- **Standing Preferences:**
  - Preserve Wrapper Isolation: UI only interacts with `PaymentPlan`, `Draft`, and `FinanceEvent`.
  - Maintain Flyway migration integrity for existing SQLite databases.
  - Zero-Sum rule on underlying transactions.
  - Always update i18n (`en`, `es`) and AI tool manifests when modifying domain capabilities.

## Completed Tickets & Key Decisions

- [Research Existing Subscription Footprint Across the Stack](file:///.github/issues/issue-4-research-existing-subscription-code.md) — Identified 51 files across Backend (25 Java files), Database (Flyway V3 needed), Frontend (20 TS files), Chatbot (5 TS files), and Grafana dashboard that require migration to `PaymentPlan`.
- [Define PaymentPlan Entity Structure & Relationships](file:///.github/issues/issue-2-payment-plan-domain-model.md) — Defined `PaymentPlanEntity` supporting both automated execution and manual event/draft grouping, mapped via join tables.
- [Installment Progress & Debt Calculation Strategy](file:///.github/issues/issue-3-debt-installment-calculation.md) — Established explicit `PaymentPlanItem` model (`PaymentPlan -> PaymentPlanItem -> Event / Draft`), soft default amounts for inflation flexibility, and auto-completion when all items reach `PAID`.
- [Scheduled Jobs Integration for Manual vs Automated PaymentPlans](file:///.github/issues/issue-5-scheduled-jobs-integration.md) — Pre-generates all $N$ `PaymentPlanItem`s at creation; Jobs only generate `Draft`s (never events directly) on due date for automated plans, while manual plans run zero jobs.
- [Full End-to-End PaymentPlan Prototype](file:///.github/issues/issue-6-prototype-payment-plan-ui.md) — Built and verified backend (Flyway V3 migration, Entities, Repositories, DTOs, Service, REST Resource, Scheduled Jobs), frontend (`PaymentPlansPage`, `PaymentPlanForm`, TanStack Query hooks, `BottomNav` route, i18n in EN/ES), and Chatbot (`listPaymentPlans` tool and regenerated tool manifest).
