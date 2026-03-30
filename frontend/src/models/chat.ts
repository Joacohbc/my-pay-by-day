export interface ChatSendParams {
  chatId: string;
  message: string;
  images?: File[];
}

export interface ChatResponse {
  response: string;
}
