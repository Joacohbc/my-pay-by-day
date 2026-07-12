import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { filesService } from '@/services/files.service';
import type { Base64FileUploadRequestDto, FileDto } from '@/models';
import { fileKeys } from '@/lib/queryKeys';
import { invalidateDomains } from '@/lib/cacheInvalidation';

export function useFiles(page = 0, size = 20, orphaned?: boolean) {
  return useQuery({
    queryKey: fileKeys.list(page, size, orphaned),
    queryFn: () => filesService.getAll(page, size, orphaned),
  });
}

export function useFile(id: number) {
  return useQuery({
    queryKey: fileKeys.detail(id),
    queryFn: () => filesService.getById(id),
    enabled: !!id,
  });
}

export function useUploadFile() {
  const queryClient = useQueryClient();
  return useMutation<FileDto, Error, Base64FileUploadRequestDto>({
    mutationFn: (data) => filesService.uploadBase64(data),
    onSuccess: () => {
      invalidateDomains(queryClient, ['files']);
    },
  });
}

export function useDeleteFile() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: (id) => filesService.delete(id),
    onSuccess: () => {
      invalidateDomains(queryClient, ['files']);
    },
  });
}
