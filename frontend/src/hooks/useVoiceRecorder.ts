import { useState, useRef, useCallback, useEffect } from 'react';

type RecordingState = 'idle' | 'recording' | 'preparing';

const preferredRecorderMimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/ogg'];

function resolveRecorderOptions(): MediaRecorderOptions | undefined {
  const supportedRecorderMimeType = preferredRecorderMimeTypes
    .find((preferredMimeType) => MediaRecorder.isTypeSupported(preferredMimeType));

  if (!supportedRecorderMimeType) {
    return undefined;
  }

  return { mimeType: supportedRecorderMimeType };
}

function resolveErrorKey(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }

  return 'transcription_failed';
}

export type VoicePermissionState = 'prompt' | 'granted' | 'denied';

export function useVoiceRecorder(onAudioReady: (audioBlob: Blob) => Promise<void>, onError: (error: string) => void) {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [permissionState, setPermissionState] = useState<VoicePermissionState>('prompt');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const isRecordingSupported = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.permissions) return;

    let cancelled = false;
    navigator.permissions.query({ name: 'microphone' as PermissionName })
      .then((status) => {
        if (cancelled) return;
        setPermissionState(status.state as VoicePermissionState);
        status.onchange = () => {
          setPermissionState(status.state as VoicePermissionState);
        };
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isRecordingSupported) {
      onError('voice_not_supported');
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setPermissionState('granted');
      return true;
    } catch {
      setPermissionState('denied');
      onError('microphone_denied');
      return false;
    }
  }, [isRecordingSupported, onError]);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (!isRecordingSupported) {
      onError('voice_not_supported');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setPermissionState('granted');
      const recorderOptions = resolveRecorderOptions();
      const mediaRecorder = recorderOptions
        ? new MediaRecorder(stream, recorderOptions)
        : new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setRecordingState('preparing');
        try {
          const recordedAudioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
          await onAudioReady(recordedAudioBlob);
        } catch (error) {
          onError(resolveErrorKey(error));
        } finally {
          setRecordingState('idle');
        }

        mediaRecorder.stream.getTracks().forEach(track => track.stop());
        audioChunksRef.current = [];
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setRecordingState('recording');
    } catch {
      setPermissionState('denied');
      onError('microphone_denied');
      setRecordingState('idle');
    }
  }, [isRecordingSupported, onAudioReady, onError]);

  const toggleRecording = useCallback(() => {
    if (recordingState === 'recording') {
      stopRecording();
      return;
    }

    if (recordingState === 'idle') {
      startRecording();
    }
  }, [recordingState, startRecording, stopRecording]);

  return {
    recordingState,
    isRecordingSupported,
    permissionState,
    requestPermission,
    toggleRecording,
  };
}
