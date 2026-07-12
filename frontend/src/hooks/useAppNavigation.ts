import { useLocation, useNavigate, type NavigateOptions } from 'react-router-dom';
import type { FinanceEvent, Template } from '@/models';

const MAX_BACK_STACK_DEPTH = 10;

export interface AppNavigationState {
  /**
   * Stack of routes leading to the current page, most recent last.
   * Managed by useAppNavigation: linkStateFromHere/navigatePush push the
   * current route, navigateBack pops it, navigateReplace preserves it.
   */
  backStack?: string[];

  /**
   * Used to pre-fill the form when creating a new event from a template
   */
  template?: Template;

  /**
   * Used to pre-fill the form when creating a new event from a draft
   */
  draft?: Partial<FinanceEvent>;

  /**
   * Used to establish a relationship when creating a new event related to an existing one
   */
  relatedToEventId?: number;
}

type ForwardState = Omit<AppNavigationState, 'backStack'>;

function withoutTrailingRoute(stack: string[], route: string): string[] {
  let end = stack.length;
  while (end > 0 && stack[end - 1] === route) end--;
  return stack.slice(0, end);
}

export function useAppNavigation() {
  const navigate = useNavigate();
  const location = useLocation();

  // Ensure state is correctly typed. Fallback to empty object.
  const state: AppNavigationState = (location.state as AppNavigationState) || {};
  const backStack = state.backStack ?? [];
  const currentRoute = location.pathname + location.search;

  /**
   * Builds the navigation state for a forward navigation (e.g. <Link state={...}>)
   * so the target page returns to the current route when it navigates back.
   */
  const linkStateFromHere = (forwardState?: ForwardState): AppNavigationState => {
    const stackWithoutSelfLoop = withoutTrailingRoute(backStack, currentRoute);
    return {
      ...forwardState,
      backStack: [...stackWithoutSelfLoop, currentRoute].slice(-MAX_BACK_STACK_DEPTH),
    };
  };

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
   * Navigates forward remembering the current route as the return point.
   */
  const navigatePush = (
    to: string,
    forwardState?: ForwardState,
    options?: Omit<NavigateOptions, 'state'>
  ) => {
    navigate(to, { ...options, state: linkStateFromHere(forwardState) });
  };

  /**
   * Replaces the current route keeping the return point intact
   * (e.g. redirecting to the detail page after saving a form).
   */
  const navigateReplace = (to: string, forwardState?: ForwardState) => {
    navigate(to, {
      replace: true,
      state: { ...forwardState, backStack: withoutTrailingRoute(backStack, to) },
    });
  };

  /**
   * Navigates back to the previous route in the stack, popping it.
   * If the stack is empty, navigates to the provided `fallbackRoute`.
   */
  const navigateBack = (fallbackRoute: string) => {
    const previousRoute = backStack[backStack.length - 1];
    if (!previousRoute) {
      navigate(fallbackRoute);
      return;
    }
    navigate(previousRoute, { state: { backStack: backStack.slice(0, -1) } });
  };

  return {
    navigate: navigateTo,
    navigatePush,
    navigateReplace,
    navigateBack,
    linkStateFromHere,
    state,
    location,

    // Extracted state variables for easier access
    template: state.template,
    draft: state.draft,
    relatedToEventId: state.relatedToEventId,
  };
}
