import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { useAlert } from '@/contexts/AlertContext';
import { extractService, type ExtractedEvent } from '@/services/extract.service';

interface ImageExtractButtonProps {
  templateId?: number;
  onExtracted: (event: ExtractedEvent) => void;
}

function readAsBase64(file: File): Promise<{ data: string; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve({ data: result.slice(result.indexOf(',') + 1), mediaType: file.type || 'image/jpeg' });
    };
    reader.onerror = () => reject(new Error('read_failed'));
    reader.readAsDataURL(file);
  });
}

export function ImageExtractButton({ templateId, onExtracted }: ImageExtractButtonProps) {
  const { t } = useTranslation();
  const alert = useAlert();
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setLoading(true);
    try {
      const image = await readAsBase64(file);
      const { event: extracted } = await extractService.fromImage([image], templateId);
      onExtracted(extracted);
      alert.success(t('eventForm.extractFromImageDone'));
    } catch (error) {
      alert.error(error instanceof Error ? error.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className="flex items-center justify-center gap-2 w-full rounded-input border border-dashed border-dn-border px-3 py-2.5 text-sm text-dn-text-muted hover:text-dn-text-main hover:border-dn-primary/50 transition-colors disabled:opacity-50"
      >
        {loading ? <Spinner size="sm" /> : <Icon name="image_search" className="text-base text-dn-primary" />}
        {t('eventForm.extractFromImage')}
      </button>
    </>
  );
}
