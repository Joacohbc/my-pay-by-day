import { useTranslation } from 'react-i18next';
import { AiChatWidget } from '@/components/ui/AiChatWidget';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { useFormPatchChat, type FormPatchEntityType } from '@/hooks/useFormPatchChat';

interface FormPatchAiChatWidgetProps {
  entityType: FormPatchEntityType;
  getCurrentValues: () => Record<string, unknown>;
  onPatch: (patch: Record<string, unknown>) => void;
}

export function FormPatchAiChatWidget({ entityType, getCurrentValues, onPatch }: FormPatchAiChatWidgetProps) {
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
    countdown,
    triggerSendNow,
    handleStop,
  } = useFormPatchChat({ entityType, getCurrentValues, onPatch });

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
      placeholder={t('ai.chatWidget.placeholderForm')}
      countdown={countdown}
      onSendNow={triggerSendNow}
      onStop={handleStop}
    >
      {messages.map((message) => (
        <ChatMessage key={message.id} message={message} />
      ))}
    </AiChatWidget>
  );
}
