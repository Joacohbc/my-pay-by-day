interface ActiveGeneration {
  startedAt: string;
}

const activeGenerations = new Map<string, ActiveGeneration>();

export const chatGenerationTracker = {
  markGenerationActive(chatId: string): void {
    activeGenerations.set(chatId, { startedAt: new Date().toISOString() });
  },

  markGenerationComplete(chatId: string): void {
    activeGenerations.delete(chatId);
  },

  isGenerationActive(chatId: string): boolean {
    return activeGenerations.has(chatId);
  },
};
