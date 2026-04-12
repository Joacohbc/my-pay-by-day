# React Query Optimization Plan & Progress

## Overview
This document tracks the improvements made to the React Query caching strategy, optimistic updates, and offline support in the `my-pay-by-day` project. The goal is to provide a seamless, offline-first experience that feels instant to the user.

## Completed Tasks

### 1. Migrated Cache Storage to IndexedDB
*   **What was done:** Updated the application's global `queryClient` persister in `frontend/src/App.tsx`.
*   **Why:** Previously, the app used `localStorage` to persist the React Query cache. `localStorage` is synchronous (blocks the UI thread during read/writes) and has a tight storage limit (~5MB). By switching to `IndexedDB` via our local `idbStorage.ts`, we eliminated blocking operations and vastly expanded the cache capacity, which is crucial for offline support.
*   **Refactoring:** Refactored `frontend/src/lib/idbStorage.ts` to export clean, typed, and reusable functions (`zustandStorage` and `queryStorage`), entirely removing `any` casts to guarantee type safety.

### 2. Implemented Query Key Factories
*   **What was done:** Replaced hardcoded array literals (e.g., `['events']`) with structured Factory Objects in all major hooks (`useEvents.ts`, `useCategories.ts`, `useTags.ts`, `useDrafts.ts`).
*   **Why:** As the app grows, managing cache keys manually leads to collisions or missed invalidations. Factories like `eventKeys.detail(id)` provide strict typing, ensure consistency across the codebase, and make it easier to surgically update or invalidate specific parts of the cache.

### 3. Implemented Optimistic Updates
*   **What was done:** Upgraded the `update` and `delete` mutations across `useEvents`, `useCategories`, `useTags`, and `useDrafts`.
*   **Why:** Instead of waiting for the backend to respond before updating the UI (which can feel sluggish on slow connections), we now use React Query's `onMutate` to instantly update the local cache with the user's input.
*   **Rollback Safety:** If the API request fails, the `onError` callback uses a snapshot of the previous state (captured in `onMutate`) to automatically revert the cache to its original state, ensuring the UI and the server remain perfectly in sync. 
*   **UX Adjustments:** Modified the `handleSubmit` functions in `EventEditPage.tsx` and `EventNewPage.tsx` to utilize non-blocking mutations (removing `await` from the mutate call), allowing the user to navigate instantly back to the detail view while the update happens seamlessly in the background.

### 4. Smart Draft Management
*   **What was done:** Adjusted the draft deletion logic in `EventEditPage` and `EventNewPage`.
*   **Why:** The UI now only deletes the temporary draft in the background *if and only if* the underlying event is successfully saved to the server. If the server fails (e.g., due to a validation error or lost connection), the draft remains intact. This guarantees that a user's typed data is never lost.

### 5. Linter Fixes
*   **What was done:** Resolved `@typescript-eslint/no-unused-vars` errors.
*   **Why:** Removed unused `id` parameters in the `onMutate` callbacks for delete operations across the hook files to maintain a clean codebase.

## Pending Tasks (Next Steps)

### Step 3 (from original plan): Complete Offline Support for Edits & Deletions
*   **Current State:** The app can currently queue *new* events (`CREATE`) when the user is offline using the `saveAsync` wrapper in `useCreateEvent`, which stores them in `pendingEventsStore`.
*   **What's Missing:** If a user is offline and tries to *edit* or *delete* an existing event, the optimistic update will trigger, but the background mutation will eventually fail, rolling back the change and showing an error. The edit is lost.
*   **Action Plan:**
    1.  Extend the `PendingEventAction` type in `pendingEventsStore.ts` to fully support `UPDATE` and `DELETE` payloads alongside `CREATE`.
    2.  Create asynchronous wrappers (`updateAsync`, `deleteAsync`) inside `useEvents.ts`, similar to the existing `saveAsync`.
    3.  When offline, these wrappers should intercept the action, save the payload to the `pendingEventsStore`, and manually apply the optimistic update to the cache so the user sees the change permanently while offline.
    4.  Update the `PendingEventsSync.tsx` component to handle sending queued updates and deletions to the backend when the connection is restored, ensuring they are executed in the correct order.