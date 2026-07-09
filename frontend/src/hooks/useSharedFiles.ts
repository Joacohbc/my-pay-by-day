import { useState, useEffect } from 'react';

export interface SharedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  file: File;
}

export interface SharedData {
  title?: string;
  text?: string;
  url?: string;
  files: SharedFile[];
}

export function useSharedFiles() {
  const [sharedData, setSharedData] = useState<SharedData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSharedFiles = async () => {
      try {
        const cache = await caches.open('share-target-cache');
        const metadataResponse = await cache.match('/shared-metadata.json');
        
        if (metadataResponse) {
          const metadata = await metadataResponse.json();
          const loadedFiles: SharedFile[] = [];
          
          for (const fileInfo of metadata.files) {
            const fileResponse = await cache.match(`/shared-file/${fileInfo.id}`);
            if (fileResponse) {
              const blob = await fileResponse.blob();
              const file = new File([blob], fileInfo.name, { type: fileInfo.type });
              loadedFiles.push({
                ...fileInfo,
                file
              });
            }
          }
          
          setSharedData({
            title: metadata.title,
            text: metadata.text,
            url: metadata.url,
            files: loadedFiles,
          });
        }
      } catch (error) {
        console.error('Error loading shared files from cache:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkSharedFiles();
  }, []);

  const clearSharedFiles = async () => {
    try {
      await caches.delete('share-target-cache');
      setSharedData(null);
    } catch (error) {
      console.error('Error clearing shared files cache:', error);
    }
  };

  return { sharedData, isLoading, clearSharedFiles };
}
