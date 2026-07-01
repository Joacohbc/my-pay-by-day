import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { Icon } from '@/components/ui/Icon';
import { useChatUI } from '@/hooks/useChatUI';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ChatInput } from '@/components/chat/ChatInput';
import { ChatImagePreview } from '@/components/chat/ChatImagePreview';
import { ChatEmptyState } from '@/components/chat/ChatEmptyState';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { AgentTasksView } from '@/components/agent-tasks/AgentTasksView';

type ChatTab = 'chat' | 'tasks';

export function ChatPage() {
  const [searchParams, setSearchParams] = useSearchParams();
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
    handleNewChat,
    handleClearMemory,
    handleEditMessage,
    handleAudioRecorded,
    handleAddFile,
    handleRemoveFile,
    t,
  } = useChatUI();

  const activeTab = (searchParams.get('tab') as ChatTab) || 'chat';
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);

  const handleTabChange = (tab: ChatTab) => {
    setSearchParams({ tab });
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-80px)] bg-dn-bg overflow-hidden">
      <PageHeader
        title={t('chat.title')}
        action={
          <div className="flex gap-2">
            {activeTab === 'chat' ? (
              <>
                <button
                  onClick={handleNewChat}
                  className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-dn-surface-low text-dn-text-main hover:bg-dn-surface transition-colors"
                  aria-label={t('chat.newChat')}
                  title={t('chat.newChat')}
                >
                  <Icon name="add" className="text-[18px]" />
                </button>
                <button
                  onClick={handleClearMemory}
                  disabled={isClearing || messages.length === 0}
                  className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-dn-surface-low text-dn-text-main hover:bg-dn-error hover:text-white transition-colors disabled:opacity-30"
                  aria-label={t('chat.clearMemory')}
                  title={t('chat.clearMemory')}
                >
                  <Icon name="delete_sweep" className="text-[18px]" />
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowNewTaskModal(true)}
                className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-dn-primary text-white hover:bg-dn-primary-focus transition-colors shadow-lg"
                aria-label={t('agentTasks.newTask')}
                title={t('agentTasks.newTask')}
              >
                <Icon name="add" className="text-[20px]" />
              </button>
            )}
          </div>
        }
      />

      <div className="px-5 mb-2">
        <SegmentedControl<ChatTab>
          value={activeTab}
          onChange={handleTabChange}
          options={[
            { value: 'chat', label: t('chat.tabs.chat') },
            { value: 'tasks', label: t('chat.tabs.tasks') },
          ]}
        />
      </div>

      {activeTab === 'chat' ? (
        <>
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto w-full">
            {messages.length === 0 ? (
              <ChatEmptyState />
            ) : (
              messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  onEdit={handleEditMessage}
                />
              ))
            )}

            {/* Thinking Indicator */}
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
            <div ref={messagesEndRef} className="h-8" />
          </div>

          {/* Image Preview Bar */}
          <ChatImagePreview
            images={draftFiles}
            previewUrls={imagePreviewUrls}
            onRemove={(idx) => handleRemoveFile(draftFiles[idx].id)}
          />

          {/* Input Area */}
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
      ) : (
        <AgentTasksView 
          showNewTaskModal={showNewTaskModal} 
          onCloseModal={() => setShowNewTaskModal(false)} 
        />
      )}
    </div>
  );
}
