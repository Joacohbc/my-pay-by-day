import { useLocation, useNavigate, type NavigateOptions } from 'react-router-dom';
import type { FinanceEvent, Template } from '@/models';

export interface AppNavigationState {
  /**
   * The route to return to (e.g. when cancelling an action or closing a detail view)
   */
  from?: string;
  
  /**
   * Used to pre-fill the form when creating a new event from a template
   */
  template?: Template;
  
  /**
   * Used to pre-fill the form when creating a new event from a draft
   */
  draft?: FinanceEvent;
  
  /**
   * Used to establish a relationship when creating a new event related to an existing one
   */
  relatedToEventId?: number;
}

export function useAppNavigation() {
  const navigate = useNavigate();
  const location = useLocation();

  // Ensure state is correctly typed. Fallback to empty object.
  const state: AppNavigationState = (location.state as AppNavigationState) || {};

  /**
   * Typed navigation function.
   * Signature is similar to react-router's navigate, but enforces state shape if provided.
   */
  const navigateTo = (
    to: string | number,
    options?: Omit<NavigateOptions, 'state'> & { state?: AppNavigationState }
  ) => {
    if (typeof to === 'number') {
      navigate(to);
    } else {
      navigate(to, options);
    }
  };

  /**
   * Navigates back to the `from` route in the current state.
   * If `from` is not present, navigates to the provided `fallbackRoute`.
   */
  const navigateBack = (fallbackRoute: string, options?: Omit<NavigateOptions, 'state'> & { state?: AppNavigationState }) => {
    navigateTo(state.from || fallbackRoute, options);
  };

  return {
    navigate: navigateTo,
    navigateBack,
    state,
    location,

    // Extracted state variables for easier access
    fromRoute: state.from,
    template: state.template,
    draft: state.draft,
    relatedToEventId: state.relatedToEventId,
  };
}
