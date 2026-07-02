import { PageHeader } from '@/components/ui/PageHeader';
import { Icon } from '@/components/ui/Icon';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useChatUI } from '@/hooks/useChatUI';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ChatInput } from '@/components/chat/ChatInput';
import { ChatImagePreview } from '@/components/chat/ChatImagePreview';
import { ChatEmptyState } from '@/components/chat/ChatEmptyState';
import { ChatList } from '@/components/chat/ChatList';
import { useChatStore } from '@/store/chatStore';

export function ChatPage() {
  const { showChatList, openChatList } = useChatStore();
  const {
    messages,
    input,
    setInput,
    isPending,
    isClearing,
    draftFiles,
    imagePreviewUrls,
    messagesEndRef,
    countdown,
    triggerSendNow,
    stop,
    handleSend,
    handleContinue,
    handleNewChat,
    handleClearMemory,
    handleEditMessage,
    handleAudioRecorded,
    handleAddFile,
    handleRemoveFile,
    t,
  } = useChatUI();

  const isChatListVisible = showChatList;

  const lastMessage = messages.at(-1);
  const showContinueCard = !isPending && lastMessage?.role === 'assistant' && lastMessage.stoppedByStepLimit;

  return (
    <div className="flex flex-col h-[calc(100dvh-80px)] bg-dn-bg overflow-hidden">
      <PageHeader
        title={t('chat.title')}
        action={
          <div className="flex gap-2">
            {!isChatListVisible && (
              <button
                onClick={openChatList}
                className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-dn-surface-low text-dn-text-main hover:bg-dn-surface transition-colors"
                aria-label={t('chat.conversations')}
                title={t('chat.conversations')}
              >
                <Icon name="forum" className="text-[18px]" />
              </button>
            )}
            <button
              onClick={handleNewChat}
              className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-dn-surface-low text-dn-text-main hover:bg-dn-surface transition-colors"
              aria-label={t('chat.newChat')}
              title={t('chat.newChat')}
            >
              <Icon name="add" className="text-[18px]" />
            </button>
            {!isChatListVisible && (
              <button
                onClick={handleClearMemory}
                disabled={isClearing || messages.length === 0}
                className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-dn-surface-low text-dn-text-main hover:bg-dn-error hover:text-white transition-colors disabled:opacity-30"
                aria-label={t('chat.clearMemory')}
                title={t('chat.clearMemory')}
              >
                <Icon name="delete_sweep" className="text-[18px]" />
              </button>
            )}

          </div>
        }
      />

      <div className="flex flex-1 overflow-hidden relative w-full">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          {isChatListVisible ? (
            <ChatList />
          ) : (
            <>
              <div className="flex-1 overflow-y-auto w-full">
                {messages.length === 0 ? (
                  <ChatEmptyState />
                ) : (
                  messages.map((msg) => (
                    <ChatMessage key={msg.id} message={msg} onEdit={handleEditMessage} />
                  ))
                )}

                {isPending && (
                  <div className="w-full py-6 md:py-8 bg-dn-bg">
                    <div className="max-w-4xl mx-auto px-4 md:px-8 flex flex-col space-y-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-dn-surface-low border border-dn-border text-dn-primary/50 shadow-sm">
                          <Icon name="smart_toy" className="text-[16px] animate-pulse" />
                        </div>
                        <div className="flex items-center space-x-1.5 opacity-40">
                          <div className="w-1 h-1 bg-dn-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                          <div className="w-1 h-1 bg-dn-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                          <div className="w-1 h-1 bg-dn-primary rounded-full animate-bounce" />
                        </div>
                      </div>
                      {draftFiles.length > 0 && (
                        <span className="text-[10px] text-dn-primary/40 uppercase tracking-[0.2em] font-black px-1">
                          {t('chat.processingImage')}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {showContinueCard && (
                  <div className="max-w-4xl mx-auto px-4 md:px-8 mt-4">
                    <Card className="flex items-center justify-between gap-4 border border-dn-warning/30 bg-dn-warning/5">
                      <div className="flex items-center gap-2 text-sm text-dn-text-main">
                        <Icon name="hourglass_bottom" className="text-dn-warning" />
                        {t('chat.stepLimit.title')}
                      </div>
                      <Button size="sm" onClick={handleContinue}>
                        {t('chat.stepLimit.continue')}
                      </Button>
                    </Card>
                  </div>
                )}

                <div ref={messagesEndRef} className="h-8" />
              </div>

              <ChatImagePreview
                images={draftFiles}
                previewUrls={imagePreviewUrls}
                onRemove={(idx) => handleRemoveFile(draftFiles[idx].id)}
              />

              <ChatInput
                inputContent={input}
                setInputContent={setInput}
                onSend={handleSend}
                onAudioRecorded={handleAudioRecorded}
                draftFiles={draftFiles}
                onAddFile={handleAddFile}
                onRemoveFile={handleRemoveFile}
                isPending={isPending}
                countdown={countdown}
                onSendNow={triggerSendNow}
                onStop={stop}
              />
            </>
          )}
        </div>


      </div>
    </div>
  );
}
