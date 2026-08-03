import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { useUploadEmailFile } from '@/hooks/useFiles';
import type { EmailUploadRequestDto } from '@/models';

interface CreateEmailModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (fileId: number) => void;
}

export function CreateEmailModal({ open, onClose, onCreated }: CreateEmailModalProps) {
  const { t } = useTranslation();
  const uploadEmail = useUploadEmailFile();

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [messageDate, setMessageDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!from.trim()) {
      setError(t('common.required'));
      return;
    }
    if (!body.trim()) {
      setError(t('common.required'));
      return;
    }

    setError(null);

    const payload: EmailUploadRequestDto = {
      from: from.trim(),
      to: to.trim() ? [to.trim()] : undefined,
      subject: subject.trim() || undefined,
      messageDate: messageDate ? new Date(messageDate).toISOString() : undefined,
      textBody: body,
    };

    try {
      const createdFile = await uploadEmail.mutateAsync(payload);
      onClose();
      setFrom('');
      setTo('');
      setSubject('');
      setBody('');
      setMessageDate(new Date().toISOString().slice(0, 16));
      if (onCreated) {
        onCreated(createdFile.id);
      }
    } catch (err) {
      setError(String(err));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('files.createEmailTitle')}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs rounded-xl bg-dn-error/10 border border-dn-error/20 text-dn-error">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label={t('files.fromLabel')}
            placeholder={t('files.fromPlaceholder')}
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            required
          />
          <Input
            label={t('files.toLabel')}
            placeholder={t('files.toPlaceholder')}
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label={t('files.subjectLabel')}
            placeholder={t('files.subjectPlaceholder')}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          <Input
            type="datetime-local"
            label={t('files.dateLabel')}
            value={messageDate}
            onChange={(e) => setMessageDate(e.target.value)}
          />
        </div>

        <Textarea
          label={t('files.bodyLabel')}
          placeholder={t('files.bodyPlaceholder')}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={6}
          required
        />

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="primary" loading={uploadEmail.isPending}>
            {t('files.submitCreateEmail')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
