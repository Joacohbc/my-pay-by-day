export interface ChatRequest {
  chatId: string;
  message: string;
  image?: string;
}

export interface ChatResponse {
  response: string;
}
