import { useState, useRef, useCallback, useEffect } from 'react';
import { audioService } from '@/services/audio.service';
import { convertAudioBlobToWav } from '@/lib/audioWav';

type RecordingState = 'idle' | 'recording' | 'preparing' | 'preview' | 'transcribing';

const preferredRecorderMimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/ogg'];

function resolveRecorderOptions(): MediaRecorderOptions | undefined {
  const supportedRecorderMimeType = preferredRecorderMimeTypes
    .find((preferredMimeType) => MediaRecorder.isTypeSupported(preferredMimeType));

  if (!supportedRecorderMimeType) {
    return undefined;
  }

  return { mimeType: supportedRecorderMimeType };
}

export function useVoiceRecorder(onTranscript: (text: string) => void, onError: (error: string) => void) {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [previewAudioBlob, setPreviewAudioBlob] = useState<Blob | null>(null);
  const [previewAudioUrl, setPreviewAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const previewAudioUrlRef = useRef<string | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const isRecordingSupported = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

  const clearPreviewAudio = useCallback(() => {
    if (previewAudioUrlRef.current) {
      URL.revokeObjectURL(previewAudioUrlRef.current);
      previewAudioUrlRef.current = null;
    }

    setPreviewAudioBlob(null);
    setPreviewAudioUrl(null);
  }, []);

  const setPreviewAudio = useCallback((audioBlob: Blob) => {
    if (previewAudioUrlRef.current) {
      URL.revokeObjectURL(previewAudioUrlRef.current);
      previewAudioUrlRef.current = null;
    }

    const nextPreviewAudioUrl = URL.createObjectURL(audioBlob);
    previewAudioUrlRef.current = nextPreviewAudioUrl;
    setPreviewAudioBlob(audioBlob);
    setPreviewAudioUrl(nextPreviewAudioUrl);
  }, []);

  useEffect(() => {
    return () => {
      if (!previewAudioUrlRef.current) {
        return;
      }

      URL.revokeObjectURL(previewAudioUrlRef.current);
      previewAudioUrlRef.current = null;
    };
  }, []);

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
          setPreviewAudio(recordedAudioBlob);
          setRecordingState('preview');
        } catch {
          onError('transcription_failed');
          setRecordingState('idle');
        }

        mediaRecorder.stream.getTracks().forEach(track => track.stop());
        audioChunksRef.current = [];
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setRecordingState('recording');
    } catch {
      onError('microphone_denied');
      setRecordingState('idle');
    }
  }, [isRecordingSupported, onError, setPreviewAudio]);

  const discardPreview = useCallback(() => {
    clearPreviewAudio();
    setRecordingState('idle');
  }, [clearPreviewAudio]);

  const submitPreview = useCallback(async () => {
    if (!previewAudioBlob) {
      setRecordingState('idle');
      return;
    }

    setRecordingState('transcribing');

    try {
      const wavAudioBlob = await convertAudioBlobToWav(previewAudioBlob);
      const result = await audioService.transcribeAudio(wavAudioBlob);
      onTranscript(result.transcription);
      clearPreviewAudio();
      setRecordingState('idle');
    } catch {
      onError('transcription_failed');
      setRecordingState('preview');
    }
  }, [clearPreviewAudio, onError, onTranscript, previewAudioBlob]);

  const toggleRecording = useCallback(() => {
    if (recordingState === 'recording') {
      stopRecording();
    } else if (recordingState === 'idle') {
      startRecording();
    }
  }, [recordingState, startRecording, stopRecording]);

  return {
    recordingState,
    isRecordingSupported,
    previewAudioUrl,
    toggleRecording,
    submitPreview,
    discardPreview,
  };
}
