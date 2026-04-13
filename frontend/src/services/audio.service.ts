import { BASE_URL } from '@/services/api';
import { convertAudioBlobToWav } from '@/lib/audioWav';

export interface AudioTranscriptionResponse {
  transcription: string;
}

function isWavMimeType(mimeType: string): boolean {
  const normalizedMimeType = mimeType.trim().toLowerCase();

  return normalizedMimeType === 'audio/wav'
    || normalizedMimeType === 'audio/x-wav'
    || normalizedMimeType === 'audio/wave';
}

export const audioService = {
  transcribeAudio: async (audioBlob: Blob): Promise<AudioTranscriptionResponse> => {
    if (!isWavMimeType(audioBlob.type)) {
      throw new Error('Only WAV audio can be uploaded');
    }

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
