import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { FileCard } from '@/components/files/FileCard';
import { AudioMessagePlayer } from '@/components/chat/AudioMessagePlayer';
import { InlineTaskCard } from '@/components/agent-tasks/InlineTaskCard';
import { InlineEventCard, InlineDraftCard, InlineTagCard, InlineCategoryCard } from '@/components/chat/InlineEntityCard';
import { InlineToolApprovalCard } from '@/components/chat/InlineToolApprovalCard';
import { InlineQuestionCard, type AskUserArgs as AskUserQuestionArgs } from '@/components/chat/InlineQuestionCard';
import { extractEntityRefs, toolCallEntityKey } from '@/components/chat/chatEntityRefs';
import { getFileIcon, getFileTypeLabel } from '@/lib/fileUtils';
import type { ChatMessage as ChatMessageType, ChatMessagePart, ChatToolCall } from '@/store/chatStore';

interface ChatMessageProps {
  message: ChatMessageType;
  onEdit?: (msg: ChatMessageType) => void;
  onApprove?: (approvalId: string, approved: boolean) => void;
  onAskUserAnswer?: (approvalId: string, answer: string) => void;
}

// Tool calls whose result is worth anchoring in the reading flow (a draft/event/approval/task card).
// Everything else (read-only lookups like listCategories, searchEvents, ...) collapses into the
// "Steps" accordion instead of cluttering the narration with low-signal noise.
const INLINE_TOOL_NAMES = new Set([
  'createDraft',
  'updateDraft',
  'confirmDraft',
  'deleteDraft',
  'updateEvent',
  'showEntity',
  'startBackgroundTask',
  'askUser',
]);

function isInlineToolCall(call: ChatToolCall): boolean {
  return INLINE_TOOL_NAMES.has(call.name) || call.state === 'approval-requested';
}

const MarkdownSpan = ({ text }: { text: string }) => (
  <div className="prose prose-sm prose-invert max-w-none prose-table:my-0 prose-p:leading-relaxed selection:bg-dn-primary/20">
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        table: ({ ...props }) => (
          <div className="overflow-x-auto my-8 -mx-1 px-1">
            <table {...props} className="min-w-full border-collapse border border-dn-border/20 rounded-xl overflow-hidden shadow-sm bg-dn-surface-low/20" />
          </div>
        ),
        thead: ({ ...props }) => <thead {...props} className="bg-dn-surface-low/50" />,
        th: ({ ...props }) => (
          <th
            {...props}
            className="px-5 py-3.5 text-left text-[11px] font-bold text-dn-text-main/50 uppercase tracking-widest border-b border-dn-border/30 whitespace-nowrap"
          />
        ),
        td: ({ ...props }) => (
          <td
            {...props}
            className="px-5 py-3.5 text-sm text-dn-text-main/80 border-b border-dn-border/10 whitespace-nowrap"
          />
        ),
      }}
    >
      {text}
    </ReactMarkdown>
  </div>
);

export function ChatMessage({ message, onEdit, onApprove, onAskUserAnswer }: ChatMessageProps) {
  const { t } = useTranslation();
  const toolFriendlyNames: Record<string, string> = {
    listCategories: t('chat.tools.listCategories'),
    listTags: t('chat.tools.listTags'),
    listTagGroups: t('chat.tools.listTagGroups'),
    listNodes: t('chat.tools.listNodes'),
    searchEvents: t('chat.tools.searchEvents'),
    getEvent: t('chat.tools.getEvent'),
    listDrafts: t('chat.tools.listDrafts'),
    getDraft: t('chat.tools.getDraft'),
    listTemplates: t('chat.tools.listTemplates'),
    showEntity: t('chat.tools.showEntity'),
    createDraft: t('chat.tools.createDraft'),
    updateDraft: t('chat.tools.updateDraft'),
    deleteDraft: t('chat.tools.deleteDraft'),
    confirmDraft: t('chat.tools.confirmDraft'),
    validateDraft: t('chat.tools.validateDraft'),
    updateEvent: t('chat.tools.updateEvent'),
    askUser: t('chat.tools.askUser'),
    calculate: t('chat.tools.calculate'),
    getCurrentDateTime: t('chat.tools.getCurrentDateTime'),
    saveMemory: t('chat.tools.saveMemory'),
    recallMemory: t('chat.tools.recallMemory'),
    forgetMemory: t('chat.tools.forgetMemory'),
    delegateTask: t('chat.tools.delegateTask'),
    getTaskResult: t('chat.tools.getTaskResult'),
    startBackgroundTask: t('chat.tools.startBackgroundTask'),
  };
  const isUser = message.role === 'user';
  const allToolsDone = message.toolCalls.every((tc) => tc.state === 'result');

  const lowSignalCalls = message.toolCalls.filter((tc) => !isInlineToolCall(tc));
  const toolStepGroups = lowSignalCalls.reduce<{ name: string; count: number; isDone: boolean; args?: unknown; output?: unknown }[]>(
    (groups, tc) => {
      const isDone = tc.state === 'result';
      if (tc.name === 'delegateTask') {
        groups.push({ name: tc.name, count: 1, isDone, args: tc.args, output: tc.output });
        return groups;
      }
      const last = groups[groups.length - 1];
      if (last && last.name === tc.name && last.name !== 'delegateTask') {
        last.count += 1;
        last.isDone = isDone;
        last.args = tc.args;
        last.output = tc.output;
        return groups;
      }
      groups.push({ name: tc.name, count: 1, isDone, args: tc.args, output: tc.output });
      return groups;
    },
    [],
  );

  // Entity refs are computed across the whole message (createDraft -> showEntity -> confirmDraft can all
  // point at the same draft/event) so the "winning" ref per entity is resolved once, then anchored to the
  // last part in the ordered sequence that produced it — avoiding duplicate cards for the same entity.
  const winningRefs = extractEntityRefs(message.toolCalls);
  const refByKey = new Map(winningRefs.map((ref) => [`${ref.kind}:${ref.id}`, ref] as const));
  const lastIndexForKey = new Map<string, number>();
  message.parts.forEach((part, idx) => {
    if (part.type !== 'tool') return;
    const key = toolCallEntityKey(part.call);
    if (key && refByKey.has(key)) lastIndexForKey.set(key, idx);
  });

  const [isCollapsedByUser, setIsCollapsedByUser] = useState<boolean | null>(null);
  const isStepsExpanded = isCollapsedByUser === null ? false : !isCollapsedByUser;
  const audioMessageUrl = typeof message.audioUrl === 'string' && message.audioUrl.length > 0
    ? message.audioUrl
    : null;
  const hasAudioMessage = audioMessageUrl !== null;
  const hasTextContent = message.content.trim().length > 0;
  const isEditable = isUser && !!onEdit && hasTextContent;
  const canCopy = hasTextContent;
  const hasSideActions = canCopy || isEditable;
  const [showEditModal, setShowEditModal] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const stepsScrollRef = useRef<HTMLDivElement>(null);
  const toolCallCount = message.toolCalls.length;

  useEffect(() => {
    const container = stepsScrollRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [toolCallCount]);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  function renderToolPart(call: ChatToolCall, idx: number, seenTaskIds: Set<string>) {
    if (call.name === 'askUser') {
      const key = call.toolCallId ?? `question-${idx}`;
      if (call.state === 'approval-requested') {
        return (
          <InlineQuestionCard
            key={key}
            args={call.args as AskUserQuestionArgs}
            approvalId={call.approval!.id}
            onAnswer={(id, answer) => onAskUserAnswer?.(id, answer)}
          />
        );
      }
      // Resolved: keep the question and the given answer visible instead of letting the card
      // disappear — `reason` is where the answer travels (see chat.ts's approval handling).
      const answer = call.approval?.reason;
      if (answer == null) return null;
      return (
        <InlineQuestionCard
          key={key}
          args={call.args as AskUserQuestionArgs}
          approvalId={call.approval?.id ?? key}
          answer={answer}
          onAnswer={(id, ans) => onAskUserAnswer?.(id, ans)}
        />
      );
    }

    if (call.state === 'approval-requested') {
      const callArgs = call.args as { draftId?: number; eventId?: number } | undefined;
      return (
        <InlineToolApprovalCard
          key={call.toolCallId ?? `approval-${idx}`}
          toolLabel={toolFriendlyNames[call.name] || call.name}
          approvalId={call.approval!.id}
          draftId={callArgs?.draftId}
          eventId={callArgs?.eventId}
          onApprove={(id) => onApprove?.(id, true)}
          onReject={(id) => onApprove?.(id, false)}
        />
      );
    }

    if (call.name === 'startBackgroundTask' && call.state === 'result') {
      const taskId = (call.output as { taskId?: string } | undefined)?.taskId;
      if (!taskId || seenTaskIds.has(taskId)) return null;
      seenTaskIds.add(taskId);
      return <InlineTaskCard key={taskId} taskId={taskId} />;
    }

    const key = toolCallEntityKey(call);
    if (!key || lastIndexForKey.get(key) !== idx) return null;
    const ref = refByKey.get(key);
    if (!ref) return null;

    switch (ref.kind) {
      case 'event':
        return <InlineEventCard key={`event-${ref.id}`} eventId={ref.id} action={ref.action} />;
      case 'draft':
        return <InlineDraftCard key={`draft-${ref.id}`} draftId={ref.id} action={ref.action} />;
      case 'tag':
        return <InlineTagCard key={`tag-${ref.id}`} tagId={ref.id} />;
      case 'category':
        return <InlineCategoryCard key={`category-${ref.id}`} categoryId={ref.id} />;
      default:
        return null;
    }
  }

  function renderInlineSequence() {
    const seenTaskIds = new Set<string>();
    return message.parts.map((part: ChatMessagePart, idx) => {
      if (part.type === 'text') {
        return part.text ? <MarkdownSpan key={`text-${idx}`} text={part.text} /> : null;
      }
      if (!isInlineToolCall(part.call)) return null;
      return renderToolPart(part.call, idx, seenTaskIds);
    });
  }

  return (
    <>
    <div>
      <div className={`max-w-4xl mx-auto mt-5 px-4 md:px-8 flex flex-col`}>

        {/* Header Row: Icon + Role + side actions */}
        <div className={`flex items-center gap-2 mb-3 group ${isUser ? 'justify-end' : 'justify-start'}`}>
          {isUser && hasSideActions && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity duration-200">
              {isEditable && (
                <button
                  onClick={() => setShowEditModal(true)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-dn-text-main/40 hover:text-dn-primary hover:bg-dn-primary/10 transition-colors"
                  title={t('common.edit')}
                >
                  <Icon name="edit" className="text-[14px]" />
                </button>
              )}
              {canCopy && (
                <button
                  onClick={handleCopy}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-dn-text-main/40 hover:text-dn-primary hover:bg-dn-primary/10 transition-colors"
                  title={isCopied ? t('chat.copied') : t('chat.copy')}
                >
                  <Icon name={isCopied ? 'check' : 'content_copy'} className="text-[14px]" />
                </button>
              )}
            </div>
          )}
          <div className={`flex items-center gap-1 ${isUser ? 'flex-row-reverse' : 'flex-row'} rounded-4xl border border-white/10 max-w-min px-4 py-3`}>
            <Icon
              name={isUser ? 'person' : 'smart_toy'}
              className="text-xl leading-0 text-dn-primary"
            />
            <span className="text-xs uppercase tracking-[0.2em] font-black text-dn-text-main/70 leading-none">
              {isUser ? t('chat.user') : t('chat.assistant')}
            </span>
          </div>
          {!isUser && hasSideActions && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity duration-200">
              {canCopy && (
                <button
                  onClick={handleCopy}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-dn-text-main/40 hover:text-dn-primary hover:bg-dn-primary/10 transition-colors"
                  title={isCopied ? t('chat.copied') : t('chat.copy')}
                >
                  <Icon name={isCopied ? 'check' : 'content_copy'} className="text-[14px]" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="flex flex-col space-y-4">
          {/* Images */}
          {message.imageUrls && message.imageUrls.length > 0 && (
            <div className={`flex flex-wrap gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
              {message.imageUrls.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={t('chat.imageUploaded')}
                  className="rounded-xl max-h-72 w-auto object-contain shadow-lg border border-dn-border/30"
                />
              ))}
            </div>
          )}

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className={`flex flex-wrap gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
              {message.attachments.map((file, i) =>
                file.fileId != null ? (
                  <FileCard
                    key={i}
                    file={{ id: file.fileId, fileName: file.name, mimeType: file.type, typeLabel: file.typeLabel, size: 0 }}
                    hideEventLinks
                  />
                ) : (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 bg-dn-surface-low rounded-xl border border-white/5 min-w-[200px] max-w-sm"
                  >
                    <div className="w-9 h-9 shrink-0 bg-dn-surface rounded-lg flex items-center justify-center text-dn-text-muted">
                      <Icon name={getFileIcon(file.type)} className="text-base" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-dn-text-main truncate">{file.name}</p>
                      <p className="text-xs text-dn-text-muted truncate">{file.typeLabel ?? getFileTypeLabel(file.name, file.type)}</p>
                    </div>
                  </div>
                ),
              )}
            </div>
          )}

          {/* Text content */}
          <div className={`flex items-start gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>

            {/* Main content */}
            <div className="min-w-0 flex-1">
              {isUser ? (
                <div className="flex flex-col items-end gap-2">
                  {hasAudioMessage && (
                    <AudioMessagePlayer
                      key={audioMessageUrl}
                      src={audioMessageUrl}
                      className="max-w-sm w-full"
                    />
                  )}

                  {message.audioTranscriptionStatus === 'pending' && (
                    <p className="text-[11px] text-dn-primary/60 text-right">
                      {t('chat.transcribing')}
                    </p>
                  )}

                  {message.audioTranscriptionStatus === 'failed' && (
                    <p className="text-[11px] text-dn-error text-right">
                      {t('chat.transcriptionFailed')}
                    </p>
                  )}

                  {hasTextContent && (
                    <div className="whitespace-pre-wrap text-sm leading-relaxed text-dn-text-main/90 text-right selection:bg-dn-primary/30">
                      {message.content}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {toolStepGroups.length > 0 && (
                    allToolsDone && !isStepsExpanded ? (
                      <button
                        type="button"
                        onClick={() => setIsCollapsedByUser(false)}
                        className="animate-in flex items-center gap-1.5 text-[11px] text-dn-text-muted/60 hover:text-dn-text-main/80 transition-colors w-fit"
                      >
                        <Icon name="check_circle" className="text-[12px] leading-none shrink-0 text-green-500/70" />
                        <span className="leading-none">{t('chat.tools.steps')} ({toolStepGroups.length})</span>
                        <Icon name="keyboard_arrow_down" className="text-[13px] leading-none shrink-0" />
                      </button>
                    ) : (
                    <div className="animate-in flex flex-col rounded-xl bg-dn-surface-low/30 border border-white/5 w-fit min-w-[220px] max-w-md overflow-hidden transition-all">
                      {/* Accordion Header */}
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setIsCollapsedByUser(isStepsExpanded)}
                        onKeyDown={(e) => {
                          if (e.key !== 'Enter' && e.key !== ' ') return;
                          e.preventDefault();
                          setIsCollapsedByUser(isStepsExpanded);
                        }}
                        className="flex items-center justify-between w-full p-3 hover:bg-white/5 transition-colors text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Icon
                            name={allToolsDone ? 'check_circle' : 'pending'}
                            className={`text-sm shrink-0 ${allToolsDone ? 'text-green-500/80' : 'text-dn-primary animate-spin'}`}
                          />
                          <span className="text-[10px] uppercase tracking-[0.15em] text-dn-text-muted/70 font-black leading-none">
                            {t('chat.tools.steps')} ({toolStepGroups.length})
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Icon
                            name="keyboard_arrow_down"
                            className={`text-base text-dn-text-muted transition-transform duration-200 ${
                              isStepsExpanded ? 'rotate-180' : ''
                            }`}
                          />
                        </div>
                      </div>

                      {/* Accordion Content */}
                      {isStepsExpanded && (
                        <div
                          ref={stepsScrollRef}
                          className="flex flex-col gap-2 p-3 pt-0 border-t border-white/5 overflow-y-auto max-h-48"
                        >
                          {toolStepGroups.map((group, idx) => {
                            let label = toolFriendlyNames[group.name] || `${t('chat.tools.running')} (${group.name})`;
                            if (group.name === 'delegateTask') {
                              const subtaskTitle = (group.args as { title?: string } | undefined)?.title;
                              const progressOutput = group.output as { type?: string; message?: string } | undefined;

                              if (group.isDone) {
                                label = subtaskTitle
                                  ? `${t('chat.subtask', 'Subtask')}: ${subtaskTitle}`
                                  : t('chat.tools.delegateTask');
                              } else {
                                const progressMsg = progressOutput?.type === 'progress' ? progressOutput.message : undefined;
                                label = subtaskTitle
                                  ? `${subtaskTitle} (${progressMsg || t('chat.tools.running', 'Running...')})`
                                  : `${t('chat.tools.delegateTask')} (${progressMsg || t('chat.tools.running', 'Running...')})`;
                              }
                            }
                            return (
                              <div
                                key={idx}
                                className="animate-in flex items-center gap-2 text-xs text-dn-text-main/70 first:mt-2"
                              >
                                <Icon
                                  name={group.isDone ? 'check_circle' : 'pending'}
                                  className={`text-[12px] shrink-0 ${group.isDone ? 'text-green-500/80' : 'text-dn-primary animate-spin'}`}
                                />
                                <span className={`flex-1 truncate ${group.isDone ? 'opacity-50' : 'font-medium'}`}>{label}</span>
                                {group.count > 1 && (
                                  <span className="shrink-0 text-[10px] font-bold text-dn-text-muted/60 bg-white/5 rounded-full px-1.5 py-0.5">
                                    ×{group.count}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    )
                  )}

                  {renderInlineSequence()}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>

    {showEditModal && (
      <ConfirmModal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        onConfirm={() => {
          setShowEditModal(false);
          onEdit?.(message);
        }}
        title={t('chat.editMessage')}
        message={t('chat.confirmEditMessage')}
        confirmLabel={t('chat.editMessage')}
        variant="primary"
      />
    )}
    </>
  );
}
