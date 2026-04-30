export interface ChatSendParams {
  chatId: string;
  message: string;
  images?: File[];
  fileIds?: number[];
}

export interface ChatResponse {
  response: string;
}
