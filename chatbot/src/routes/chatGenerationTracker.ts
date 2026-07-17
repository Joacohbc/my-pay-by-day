interface ActiveGeneration {
  startedAt: string;
  abortController: AbortController;
}

const activeGenerations = new Map<string, ActiveGeneration>();

export const chatGenerationTracker = {
  startGeneration(chatId: string): AbortController {
    activeGenerations.get(chatId)?.abortController.abort();
    const abortController = new AbortController();
    activeGenerations.set(chatId, { startedAt: new Date().toISOString(), abortController });
    return abortController;
  },

  markGenerationComplete(chatId: string, abortController: AbortController): void {
    const active = activeGenerations.get(chatId);
    if (active?.abortController === abortController) activeGenerations.delete(chatId);
  },

  abortGeneration(chatId: string): boolean {
    const active = activeGenerations.get(chatId);
    if (!active) return false;
    active.abortController.abort();
    activeGenerations.delete(chatId);
    return true;
  },

  isGenerationActive(chatId: string): boolean {
    return activeGenerations.has(chatId);
  },
};
