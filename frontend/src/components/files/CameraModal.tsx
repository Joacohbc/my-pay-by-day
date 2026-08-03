import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

interface CameraModalProps {
  open: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
}

export function CameraModal({ open, onClose, onCapture }: CameraModalProps) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [hasCamera, setHasCamera] = useState<boolean | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const startCamera = async () => {
    stopStream();
    setErrorMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setHasCamera(true);
    } catch {
      setHasCamera(false);
      setErrorMsg(t('files.cameraError') || 'No se pudo acceder a la cámara');
    }
  };

  useEffect(() => {
    if (open) {
      startCamera();
    } else {
      stopStream();
    }
    return () => {
      stopStream();
    };
  }, [open]);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const fileName = `photo_${Date.now()}.jpg`;
      const file = new File([blob], fileName, { type: 'image/jpeg' });
      stopStream();
      onClose();
      onCapture(file);
    }, 'image/jpeg', 0.9);
  };

  return (
    <Modal open={open} onClose={onClose} title={t('files.takePhoto')} size="lg">
      <div className="flex flex-col items-center space-y-4">
        {errorMsg ? (
          <div className="w-full text-center py-8 space-y-3">
            <Icon name="videocam_off" className="text-4xl text-dn-text-muted" />
            <p className="text-sm text-dn-text-muted">{errorMsg}</p>
          </div>
        ) : (
          <div className="relative w-full max-w-md bg-black rounded-2xl overflow-hidden aspect-4/3 flex items-center justify-center border border-white/10 shadow-inner">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />
          </div>
        )}

        <div className="flex items-center justify-center gap-3 w-full pt-2">
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          {hasCamera && !errorMsg && (
            <Button
              variant="primary"
              onClick={handleCapture}
              className="flex items-center gap-2 px-6"
            >
              <Icon name="photo_camera" className="text-lg" />
              <span>{t('files.takePhoto')}</span>
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
