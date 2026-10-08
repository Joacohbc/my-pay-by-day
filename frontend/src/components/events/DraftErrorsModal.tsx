import { useTranslation } from 'react-i18next';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface DraftErrorsModalProps {
  /** Why the action did not go through; the modal stays closed while it is empty. */
  messages: string[];
  title: string;
  onClose: () => void;
}

/** Lists every reason a draft action was refused, so none of them disappears with a toast. */
export function DraftErrorsModal({ messages, title, onClose }: DraftErrorsModalProps) {
  const { t } = useTranslation();

  return (
    <Modal
      open={messages.length > 0}
      onClose={onClose}
      title={title}
      footer={
        <div className="flex justify-end w-full">
          <Button onClick={onClose}>{t('common.close')}</Button>
        </div>
      }
    >
      <ul className="list-disc pl-5 space-y-1.5">
        {messages.map((message, index) => (
          <li key={`${index}-${message}`} className="text-sm text-dn-text-main">{message}</li>
        ))}
      </ul>
    </Modal>
  );
}
