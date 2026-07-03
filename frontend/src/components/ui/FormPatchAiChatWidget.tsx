import { useTranslation } from 'react-i18next';
import { AiChatWidget } from '@/components/ui/AiChatWidget';
import { AiChatBubble } from '@/components/ui/AiChatBubble';
import { useFormPatchChat } from '@/hooks/useFormPatchChat';
import type { FormPatchEntityType } from '@/services/formChat.service';

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
        <AiChatBubble key={message.id} role={message.role} text={message.text} />
      ))}
    </AiChatWidget>
  );
}
