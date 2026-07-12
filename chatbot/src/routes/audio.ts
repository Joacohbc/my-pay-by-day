import { errorJson } from '@/i18n.js';
import { experimental_transcribe as transcribe, generateText } from 'ai';
import { Hono } from 'hono';
import { languageName, requestContextFrom } from '@/context.js';
import { logger } from '@/logging/logger.js';
import { audioTranscriptionModel, fastModel } from '@/models.js';
import { formattingGuidance } from '@/prompts/system.js';

const audioLog = logger.child('audio');

export const audioRoute = new Hono();

/**
 * Transcribes audio via OpenRouter's dedicated /audio/transcriptions endpoint,
 * using a speech-to-text model kept separate from the chat/agent model.
 * Accepts multipart form-data with an `audio` file, matching the previous Java contract.
 */
async function transcribeWithRetry(
  audioBytes: Uint8Array,
  maxAttempts = 3,
  delayMs = 1000,
): Promise<string> {
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  let attempt = 1;
  while (attempt < maxAttempts) {
    try {
      const result = await transcribe({ model: audioTranscriptionModel(), audio: audioBytes });
      return result.text;
    } catch (error) {
      audioLog.warn('audio transcription attempt failed, retrying', {
        attempt,
        error: (error as Error).message,
      });
      await sleep(delayMs * attempt);
      attempt++;
    }
  }
  const finalResult = await transcribe({ model: audioTranscriptionModel(), audio: audioBytes });
  return finalResult.text;
}

audioRoute.post('/transcribe', async (c) => {
  requestContextFrom(c);
  const body = await c.req.parseBody();
  const file = body['audio'];
  if (!(file instanceof File)) {
    return errorJson(c, 'error.audio_required', 400);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  try {
    const text = await transcribeWithRetry(bytes);
    return c.json({ transcription: text });
  } catch (error) {
    audioLog.error('audio transcription failed after all attempts', { error: (error as Error).message });
    return c.json({ error: (error as Error).message }, 500);
  }
});

function enhancedTranscriptionSystemPrompt(lang: string, currency: string): string {
  return (
    `You are a voice-editing assistant for a chat input box in a personal-finance app. ` +
    `The user is dictating by voice to shape the text currently in the box. ` +
    `Treat the transcription as SPOKEN INTENT, never as literal text to insert:\n` +
    `- Interpret filler, hesitations and self-corrections ("no wait", "actually", "scratch that") as edits, not content.\n` +
    `- Interpret meta commands ("delete that", "make it shorter", "add the date", "translate to English") as instructions to apply, not words to write.\n` +
    `- If there is CURRENT TEXT, apply the spoken changes to it and return the full edited result.\n` +
    `- If there is no CURRENT TEXT, produce clean written text expressing what was dictated.\n` +
    `OUTPUT RULES: return ONLY the resulting plain text — no markdown, no quotes, no explanation. ` +
    `Write in ${languageName(lang)}.\n` +
    formattingGuidance(lang, currency)
  );
}

async function editTextFromDictation(currentText: string, dictation: string, lang: string, currency: string): Promise<string> {
  const userParts = [
    currentText.trim() ? `CURRENT TEXT:\n${currentText.trim()}` : 'CURRENT TEXT:\n(empty)',
    `DICTATION:\n${dictation}`,
    'Produce the edited text now.',
  ];
  const { text } = await generateText({
    model: fastModel(),
    system: enhancedTranscriptionSystemPrompt(lang, currency),
    prompt: userParts.join('\n\n'),
  });
  return text.trim().replace(/^["']|["']$/g, '');
}

audioRoute.post('/transcribe-enhanced', async (c) => {
  const ctx = requestContextFrom(c);
  const body = await c.req.parseBody();
  const file = body['audio'];
  if (!(file instanceof File)) {
    return errorJson(c, 'error.audio_required', 400);
  }

  const currentText = typeof body['currentText'] === 'string' ? body['currentText'] : '';
  const bytes = new Uint8Array(await file.arrayBuffer());

  let dictation: string;
  try {
    dictation = await transcribeWithRetry(bytes);
  } catch (error) {
    audioLog.error('audio transcription failed after all attempts', { error: (error as Error).message });
    return c.json({ error: (error as Error).message }, 500);
  }

  try {
    const editedText = await editTextFromDictation(currentText, dictation, ctx.lang, ctx.currency);
    return c.json({ transcription: editedText || dictation });
  } catch (error) {
    audioLog.warn('enhanced transcription edit failed, returning raw transcription', { error: (error as Error).message });
    return c.json({ transcription: dictation });
  }
});
