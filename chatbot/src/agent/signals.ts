/** Thrown by an agent tool to pause the run and wait for a human decision. */
export class PauseSignal extends Error {
  constructor(public readonly actionId: number) {
    super('AGENT_PAUSED_FOR_USER_ACTION');
    this.name = 'PauseSignal';
  }
}

export function isPauseSignal(error: unknown): error is PauseSignal {
  return error instanceof PauseSignal || (error as Error)?.name === 'PauseSignal';
}
