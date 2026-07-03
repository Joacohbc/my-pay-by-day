interface AiChatBubbleProps {
  role: 'user' | 'assistant';
  text: string;
}

export function AiChatBubble({ role, text }: AiChatBubbleProps) {
  const isUser = role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
          isUser ? 'bg-dn-primary/15 text-dn-text-main' : 'bg-dn-surface-low text-dn-text-main'
        }`}
      >
        {text}
      </div>
    </div>
  );
}
