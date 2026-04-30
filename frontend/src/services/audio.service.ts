import { api } from '@/services/api';
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

    return api.postForm<AudioTranscriptionResponse>('/ai/audio/transcribe', formData);
  },

  transcribeRecordedAudio: async (recordedAudioBlob: Blob): Promise<AudioTranscriptionResponse> => {
    const wavAudioBlob = await convertAudioBlobToWav(recordedAudioBlob);
    return audioService.transcribeAudio(wavAudioBlob);
  },
};
