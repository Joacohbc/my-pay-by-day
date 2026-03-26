export type ChatMode = 'query' | 'agent';

export interface ChatSendParams {
  chatId: string;
  message: string;
  mode?: ChatMode;
  image?: File;
}

export interface ChatResponse {
  response: string;
}
