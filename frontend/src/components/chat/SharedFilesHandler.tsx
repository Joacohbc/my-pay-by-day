import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSharedFiles } from '@/hooks/useSharedFiles';
import { useChatStore } from '@/store/chatStore';
import { Routes } from '@/lib/routes';

export function SharedFilesHandler() {
  const { sharedData, clearSharedFiles } = useSharedFiles();
  const navigate = useNavigate();
  const { newChat, setPendingFiles, setSharedText } = useChatStore();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (!sharedData || hasProcessed.current) return;

    const files = sharedData.files.map((sharedFile) => sharedFile.file);
    const text = [sharedData.title, sharedData.text, sharedData.url].filter(Boolean).join('\n');
    const hasContentToShare = files.length > 0 || text.length > 0;
    if (!hasContentToShare) return;

    hasProcessed.current = true;
    newChat();
    if (files.length > 0) setPendingFiles(files);
    if (text) setSharedText(text);
    navigate(Routes.CHAT);
    clearSharedFiles();
  }, [sharedData, navigate, newChat, setPendingFiles, setSharedText, clearSharedFiles]);

  return null;
}
