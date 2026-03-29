import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';
import { Textarea } from '@/components/ui/Textarea';

interface ChatInputProps {
  inputContent: string;
  setInputContent: (val: string) => void;
  onSend: () => void;
  onImageSelect: (files: File[]) => void;
  isPending?: boolean;
  hasDraftImages?: boolean;
}

export function ChatInput({ inputContent, setInputContent, onSend, onImageSelect, isPending, hasDraftImages }: ChatInputProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
      if (files.length > 0) {
        onImageSelect(files);
      }
      e.target.value = '';
    }
  };

  return (
    <div className="p-4 border-t border-dn-border bg-dn-surface mt-auto">
      <form
        className="flex items-end space-x-2"
        onSubmit={(e) => {
          e.preventDefault();
          onSend();
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Image upload button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isPending}
          className={`shrink-0 w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
            isPending
              ? 'bg-dn-surface-low text-dn-text-main/20'
              : 'bg-dn-surface-low text-dn-text-main/60 hover:text-dn-primary hover:bg-dn-primary/10'
          }`}
          aria-label={t('chat.uploadImage')}
          title={t('chat.uploadImage')}
        >
          <Icon name="add_photo_alternate" className="text-[20px]" />
        </button>

        <Textarea
          containerClassName="flex-1 min-w-0"
          className="px-4! py-2.5! text-sm transition-all min-h-[44px]! max-h-[200px]! overflow-y-auto"
          placeholder={t('chat.placeholderAgent')}
          value={inputContent}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInputContent(e.target.value)}
          onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          disabled={isPending}
        />

        <button
          type="submit"
          disabled={(!inputContent.trim() && !hasDraftImages) || isPending}
          className={`w-10 h-10 flex items-center justify-center rounded-full shrink-0 transition-colors ${
            (inputContent.trim() || hasDraftImages) && !isPending
              ? 'bg-dn-primary text-dn-bg hover:bg-dn-primary/90'
              : 'bg-dn-surface-low text-dn-text-main/30'
          }`}
        >
          <Icon name="send" className="text-[18px]" />
        </button>
      </form>
    </div>
  );
}
