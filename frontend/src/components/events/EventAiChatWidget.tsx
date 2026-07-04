import { useTranslation } from 'react-i18next';
import { AiChatWidget } from '@/components/ui/AiChatWidget';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { useEntityChat } from '@/hooks/useEntityChat';

interface EventAiChatWidgetProps {
  draftId: number | undefined;
  onEnsureDraft: () => Promise<number>;
  onDraftIdResolved: (id: number) => void;
  onFieldsPatch: (patch: Record<string, unknown>) => void;
  buildContext: () => string;
}

export function EventAiChatWidget({ draftId, onEnsureDraft, onDraftIdResolved, onFieldsPatch, buildContext }: EventAiChatWidgetProps) {
  const { t } = useTranslation();
  const {
    messages,
    input,
    setInput,
    isPending,
    draftFiles,
    handleSend,
    handleAudioRecorded,
    handleAudioFileSelected,
    handleAddFile,
    handleRemoveFile,
    handleToolApproval,
    handleAskUserAnswer,
    countdown,
    triggerSendNow,
    handleStop,
  } = useEntityChat({
    scopeType: 'draft',
    scopeId: draftId,
    buildContext,
    ensureScopeId: onEnsureDraft,
    onScopeIdResolved: onDraftIdResolved,
    onFieldsPatch,
  });

  return (
    <AiChatWidget
      isLoading={isPending}
      hasMessages={messages.length > 0}
      inputContent={input}
      setInputContent={setInput}
      onSend={handleSend}
      onAudioRecorded={handleAudioRecorded}
      onAudioFileSelected={handleAudioFileSelected}
      draftFiles={draftFiles}
      onAddFile={handleAddFile}
      onRemoveFile={handleRemoveFile}
      placeholder={t('ai.chatWidget.placeholderEvent')}
      countdown={countdown}
      onSendNow={triggerSendNow}
      onStop={handleStop}
    >
      {messages.map((message) => (
        <ChatMessage key={message.id} message={message} onApprove={handleToolApproval} onAskUserAnswer={handleAskUserAnswer} />
      ))}
    </AiChatWidget>
  );
}
