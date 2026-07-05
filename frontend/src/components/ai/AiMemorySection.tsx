import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useAlert } from '@/contexts/AlertContext';
import { memoryService, type MemoryEntry } from '@/services/memory.service';
import { memoryKeys } from '@/lib/queryKeys';

export function AiMemorySection() {
  const { t } = useTranslation();
  const alert = useAlert();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState('');

  const { data: memories = [] } = useQuery<MemoryEntry[]>({
    queryKey: memoryKeys.all,
    queryFn: memoryService.list,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: memoryKeys.all });

  const addMutation = useMutation({
    mutationFn: (content: string) => memoryService.add(content),
    onSuccess: () => {
      setDraft('');
      alert.success(t('ai.memory.saved'));
      invalidate();
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => memoryService.remove(id),
    onSuccess: () => {
      alert.success(t('ai.memory.deleted'));
      invalidate();
    },
  });

  const handleAdd = () => {
    const content = draft.trim();
    if (content) addMutation.mutate(content);
  };

  return (
    <Card className="space-y-4">
      <div>
        <h2 className="text-sm font-bold text-dn-text-main">{t('ai.memory.title')}</h2>
        <p className="text-xs text-dn-text-muted mt-1">{t('ai.memory.subtitle')}</p>
      </div>

      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder={t('ai.memory.addPlaceholder')}
          className="flex-1 rounded-lg bg-dn-surface-low border border-dn-border px-3 py-2 text-sm text-dn-text-main outline-none focus:border-dn-primary"
        />
        <Button onClick={handleAdd} disabled={!draft.trim() || addMutation.isPending}>
          {t('ai.memory.add')}
        </Button>
      </div>

      {memories.length === 0 ? (
        <p className="text-xs text-dn-text-muted/70">{t('ai.memory.empty')}</p>
      ) : (
        <ul className="space-y-2">
          {memories.map((memory) => (
            <li
              key={memory.id}
              className="flex items-start gap-2 rounded-lg bg-dn-surface-low border border-dn-border px-3 py-2"
            >
              <span className="flex-1 text-sm text-dn-text-main break-words">{memory.content}</span>
              <button
                onClick={() => removeMutation.mutate(memory.id)}
                aria-label={t('common.delete')}
                className="shrink-0 text-dn-text-muted hover:text-dn-error transition-colors"
              >
                <Icon name="delete" className="text-base" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
