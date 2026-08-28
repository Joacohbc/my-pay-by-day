import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';
import { filesService } from '@/services/files.service';
import { formatDateTime } from '@/lib/format';
import { logger } from '@/lib/logger';
import type { EmailFileDto } from '@/models';

interface EmailPreviewProps {
  fileId: number;
}

function EmailHeaderRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-xs">
      <span className="shrink-0 w-14 text-dn-text-muted uppercase tracking-wider">{label}</span>
      <span className="min-w-0 break-words text-dn-text-main/90">{value}</span>
    </div>
  );
}

type EmailBodyView = 'formatted' | 'plain';

/** Renders an email file as an email: its headers, then the body. The body can be shown as
 * Markdown converted from the original HTML, or as the plain-text part the sender provided —
 * the reader picks which when the email has both. */
export function EmailPreview({ fileId }: EmailPreviewProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState<EmailFileDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [bodyView, setBodyView] = useState<EmailBodyView>('formatted');

  useEffect(() => {
    let cancelled = false;

    const loadEmail = async () => {
      setLoading(true);
      try {
        const loaded = await filesService.getEmail(fileId);
        if (cancelled) return;
        setEmail(loaded);
        setBodyView(loaded.markdownBody?.trim() ? 'formatted' : 'plain');
      } catch (error) {
        logger.child('emailPreview').warn('Failed to load email file', { error, fileId });
        if (!cancelled) setEmail(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadEmail();
    return () => {
      cancelled = true;
    };
  }, [fileId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full w-full">
        <Icon name="sync" className="animate-spin text-white/50 text-4xl" />
      </div>
    );
  }

  if (!email) {
    return (
      <div className="flex flex-col justify-center items-center h-full w-full text-dn-error gap-2 bg-dn-surface/50 rounded-xl max-w-sm mx-auto p-8 border border-dn-error/20">
        <Icon name="error_outline" className="text-4xl" />
        <p>{t('files.preview.failed')}</p>
      </div>
    );
  }

  const markdownBody = email.markdownBody?.trim() || '';
  const plainBody = email.textBody?.trim() || '';
  const canToggleBodyView = markdownBody !== '' && plainBody !== '';
  const showPlainBody = bodyView === 'plain' || markdownBody === '';
  const body = showPlainBody ? plainBody : markdownBody;
  const recipients = email.to?.length ? email.to.join(', ') : t('files.email.unknownRecipient');

  return (
    <div className="w-full h-full overflow-auto p-4 md:p-8">
      <div className="mx-auto max-w-3xl bg-dn-surface/60 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-6 md:p-8 border-b border-white/10 space-y-3">
          <div className="flex items-start gap-3">
            <Icon name="mail" className="text-dn-primary text-[1.4rem] mt-0.5 shrink-0" />
            <h1 className="text-lg md:text-xl font-semibold text-dn-text-main break-words">
              {email.subject?.trim() || t('files.email.noSubject')}
            </h1>
          </div>
          <div className="space-y-1.5 pl-9">
            <EmailHeaderRow label={t('files.email.from')} value={email.from?.trim() || t('files.email.unknownSender')} />
            <EmailHeaderRow label={t('files.email.to')} value={recipients} />
            <EmailHeaderRow
              label={t('files.email.date')}
              value={formatDateTime(email.messageDate) || t('files.email.unknownDate')}
            />
          </div>
        </div>

        <div className="p-6 md:p-8">
          {canToggleBodyView && (
            <div className="flex justify-end gap-1 mb-4">
              <button
                type="button"
                onClick={() => setBodyView('formatted')}
                className={`px-3 py-1 rounded-full text-xs transition-colors ${
                  showPlainBody
                    ? 'text-dn-text-muted hover:text-dn-text-main'
                    : 'bg-dn-primary/20 text-dn-primary'
                }`}
              >
                {t('files.email.viewFormatted')}
              </button>
              <button
                type="button"
                onClick={() => setBodyView('plain')}
                className={`px-3 py-1 rounded-full text-xs transition-colors ${
                  showPlainBody
                    ? 'bg-dn-primary/20 text-dn-primary'
                    : 'text-dn-text-muted hover:text-dn-text-main'
                }`}
              >
                {t('files.email.viewPlain')}
              </button>
            </div>
          )}

          {body === '' ? (
            <p className="text-sm text-dn-text-muted italic">{t('files.email.emptyBody')}</p>
          ) : showPlainBody ? (
            <pre className="whitespace-pre-wrap break-words font-sans text-sm text-dn-text-main/90">{body}</pre>
          ) : (
            <div className="prose prose-sm prose-invert max-w-none prose-p:leading-normal prose-headings:mt-4 prose-headings:mb-2 first:prose-headings:mt-0 prose-p:my-2 prose-hr:my-4 prose-hr:border-white/10">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
