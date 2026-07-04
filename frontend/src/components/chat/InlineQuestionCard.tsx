import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';

export type AskUserArgs =
  | { mode: 'OPEN'; question: string }
  | { mode: 'CHOICE'; question: string; options: string[] }
  | { mode: 'YES_NO'; question: string };

interface InlineQuestionCardProps {
  args: AskUserArgs;
  approvalId: string;
  /** Set once the user has already answered (from `call.approval.reason`) — renders a read-only
   * record of the question and the given answer instead of the interactive form. */
  answer?: string;
  onAnswer: (approvalId: string, answer: string) => void;
}

export function InlineQuestionCard({ args, approvalId, answer, onAnswer }: InlineQuestionCardProps) {
  const { t } = useTranslation();
  const [isResponding, setIsResponding] = useState(false);
  const [openText, setOpenText] = useState('');

  const respond = (value: string) => {
    if (!value.trim()) return;
    setIsResponding(true);
    onAnswer(approvalId, value.trim());
  };

  if (answer != null) {
    return (
      <Card className="flex flex-col gap-2 mt-2 border border-white/5">
        <div className="flex items-center gap-1.5 text-xs font-medium text-dn-text-muted">
          <Icon name="help" className="text-[14px]" />
          {t('chat.question.title')}
        </div>
        <p className="text-sm text-dn-text-main">{args.question}</p>
        <div className="flex items-center gap-1.5 text-sm text-dn-primary">
          <Icon name="subdirectory_arrow_right" className="text-[14px]" />
          <span className="font-medium">{answer}</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-2 mt-2 border border-dn-primary/30 bg-dn-primary/5">
      <div className="flex items-center gap-1.5 text-xs font-medium text-dn-primary">
        <Icon name="help" className="text-[14px]" />
        {t('chat.question.title')}
      </div>
      <p className="text-sm text-dn-text-main">{args.question}</p>

      {args.mode === 'YES_NO' && (
        <div className="flex gap-2">
          <Button size="sm" onClick={() => respond('yes')} disabled={isResponding}>
            {t('common.yes')}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => respond('no')} disabled={isResponding}>
            {t('common.no')}
          </Button>
        </div>
      )}

      {args.mode === 'CHOICE' && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            {args.options.map((option) => (
              <Button key={option} size="sm" variant="secondary" onClick={() => respond(option)} disabled={isResponding}>
                {option}
              </Button>
            ))}
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              respond(openText);
            }}
          >
            <input
              type="text"
              value={openText}
              onChange={(e) => setOpenText(e.target.value)}
              disabled={isResponding}
              placeholder={t('chat.question.otherPlaceholder')}
              className="flex-1 min-w-0 px-3 py-2 text-sm rounded-pill bg-dn-surface border border-white/5 text-dn-text-main outline-none focus:border-dn-primary/50 disabled:opacity-50"
            />
            <Button type="submit" size="sm" variant="secondary" disabled={isResponding || !openText.trim()}>
              {t('chat.question.submit')}
            </Button>
          </form>
        </div>
      )}

      {args.mode === 'OPEN' && (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            respond(openText);
          }}
        >
          <input
            type="text"
            value={openText}
            onChange={(e) => setOpenText(e.target.value)}
            disabled={isResponding}
            className="flex-1 min-w-0 px-3 py-2 text-sm rounded-pill bg-dn-surface border border-white/5 text-dn-text-main outline-none focus:border-dn-primary/50 disabled:opacity-50"
          />
          <Button type="submit" size="sm" disabled={isResponding || !openText.trim()}>
            {t('chat.question.submit')}
          </Button>
        </form>
      )}
    </Card>
  );
}
