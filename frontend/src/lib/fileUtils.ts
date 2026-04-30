export function getFileIcon(mimeType: string): string {
  if (!mimeType) return 'description';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'movie';
  if (mimeType.startsWith('audio/')) return 'audio_file';
  if (mimeType === 'application/pdf') return 'picture_as_pdf';
  if (mimeType === 'text/csv') return 'csv';
  if (mimeType === 'application/json') return 'code';
  if (mimeType.startsWith('text/')) return 'article';
  return 'description';
}
