import { BASE_URL } from '@/services/api';
import { convertAudioBlobToWav } from '@/lib/audioWav';
import { Howl, Howler } from 'howler';

export interface AudioTranscriptionResponse {
  transcription: string;
}

export interface AudioPlaybackCallbacks {
  onLoad?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  onStop?: () => void;
  onEnd?: () => void;
  onSeek?: () => void;
  onLoadError?: () => void;
  onPlayError?: () => void;
}

export const audioService = {
  createAudioPlayer: (sourceUrl: string, callbacks: AudioPlaybackCallbacks = {}): Howl => {
    return new Howl({
      src: [sourceUrl],
      preload: true,
      onload: callbacks.onLoad,
      onplay: callbacks.onPlay,
      onpause: callbacks.onPause,
      onstop: callbacks.onStop,
      onend: callbacks.onEnd,
      onseek: callbacks.onSeek,
      onloaderror: callbacks.onLoadError,
      onplayerror: callbacks.onPlayError,
    });
  },

  stopAllPlayback: (): void => {
    Howler.stop();
  },

  transcribeAudio: async (audioBlob: Blob): Promise<AudioTranscriptionResponse> => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.wav');

    const res = await fetch(`${BASE_URL}/audio/transcribe`, {
      method: 'POST',
      body: formData,
      headers: {
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      let errorMessage = `HTTP ${res.status}`;
      const rawErrorBody = await res.text();

      if (rawErrorBody) {
        try {
          const parsedErrorBody = JSON.parse(rawErrorBody) as {
            transcription?: string;
            message?: string;
            error?: string;
          };

          errorMessage = parsedErrorBody.transcription
            ?? parsedErrorBody.message
            ?? parsedErrorBody.error
            ?? errorMessage;
        } catch (jsonParseError) {
          const parsedBody = rawErrorBody.trim();
          const parseErrorHasMessage = jsonParseError instanceof Error && jsonParseError.message.length > 0;
          errorMessage = parsedBody.length > 0 ? parsedBody : (parseErrorHasMessage ? jsonParseError.message : errorMessage);
        }
      }

      throw new Error(errorMessage);
    }

    return res.json();
  },

  transcribeRecordedAudio: async (recordedAudioBlob: Blob): Promise<AudioTranscriptionResponse> => {
    const wavAudioBlob = await convertAudioBlobToWav(recordedAudioBlob);
    return audioService.transcribeAudio(wavAudioBlob);
  },
};
