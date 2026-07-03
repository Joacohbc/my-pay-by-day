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

const MIME_TYPE_LABELS: Record<string, string> = {
  'application/pdf': 'PDF',
  'application/json': 'JSON',
  'application/msword': 'DOC',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'application/vnd.ms-excel': 'XLS',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
  'application/vnd.ms-powerpoint': 'PPT',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPTX',
  'text/plain': 'TXT',
  'text/csv': 'CSV',
  'text/markdown': 'MD',
  'text/html': 'HTML',
};

const MAX_EXTENSION_LENGTH = 5;

export function getFileTypeLabel(fileName: string, mimeType: string): string {
  const extension = fileName.includes('.') ? fileName.split('.').pop() : undefined;
  if (extension && extension.length <= MAX_EXTENSION_LENGTH) return extension.toUpperCase();
  if (MIME_TYPE_LABELS[mimeType]) return MIME_TYPE_LABELS[mimeType];
  return (mimeType.split('/')[1] || mimeType).toUpperCase();
}

const BROWSER_NATIVE_PREVIEW_PREFIXES = ['image/', 'video/', 'audio/'];
const MARKDOWN_MIME_TYPES = ['text/markdown', 'text/x-markdown'];

export function isBrowserNativePreview(mimeType: string): boolean {
  if (!mimeType) return false;
  if (mimeType === 'application/pdf') return true;
  return BROWSER_NATIVE_PREVIEW_PREFIXES.some((prefix) => mimeType.startsWith(prefix));
}

export function isMarkdownFile(mimeType: string, fileName: string): boolean {
  if (MARKDOWN_MIME_TYPES.includes(mimeType)) return true;
  const lowerName = fileName.toLowerCase();
  return lowerName.endsWith('.md') || lowerName.endsWith('.markdown');
}
