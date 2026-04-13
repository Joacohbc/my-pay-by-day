const WAV_HEADER_BYTE_LENGTH = 44;
const PCM_16_BIT_SAMPLE_BYTES = 2;
const PCM_16_BIT_MAX_POSITIVE = 0x7fff;
const PCM_16_BIT_MAX_NEGATIVE = 0x8000;

function writeAsciiString(dataView: DataView, offset: number, value: string): void {
  for (let charIndex = 0; charIndex < value.length; charIndex += 1) {
    dataView.setUint8(offset + charIndex, value.charCodeAt(charIndex));
  }
}

function toPcm16Sample(sampleValue: number): number {
  const clampedSampleValue = Math.max(-1, Math.min(1, sampleValue));
  if (clampedSampleValue < 0) {
    return Math.round(clampedSampleValue * PCM_16_BIT_MAX_NEGATIVE);
  }

  return Math.round(clampedSampleValue * PCM_16_BIT_MAX_POSITIVE);
}

function encodeAudioBufferToWav(audioBuffer: AudioBuffer): ArrayBuffer {
  const channelCount = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const sampleCount = audioBuffer.length;
  const blockAlign = channelCount * PCM_16_BIT_SAMPLE_BYTES;
  const pcmDataByteLength = sampleCount * blockAlign;
  const wavByteLength = WAV_HEADER_BYTE_LENGTH + pcmDataByteLength;

  const wavArrayBuffer = new ArrayBuffer(wavByteLength);
  const dataView = new DataView(wavArrayBuffer);

  writeAsciiString(dataView, 0, 'RIFF');
  dataView.setUint32(4, 36 + pcmDataByteLength, true);
  writeAsciiString(dataView, 8, 'WAVE');
  writeAsciiString(dataView, 12, 'fmt ');
  dataView.setUint32(16, 16, true);
  dataView.setUint16(20, 1, true);
  dataView.setUint16(22, channelCount, true);
  dataView.setUint32(24, sampleRate, true);
  dataView.setUint32(28, sampleRate * blockAlign, true);
  dataView.setUint16(32, blockAlign, true);
  dataView.setUint16(34, PCM_16_BIT_SAMPLE_BYTES * 8, true);
  writeAsciiString(dataView, 36, 'data');
  dataView.setUint32(40, pcmDataByteLength, true);

  const audioChannels = Array.from({ length: channelCount }, (_, channelIndex) => audioBuffer.getChannelData(channelIndex));
  let outputOffset = WAV_HEADER_BYTE_LENGTH;

  for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
    for (let channelIndex = 0; channelIndex < channelCount; channelIndex += 1) {
      const pcmSample = toPcm16Sample(audioChannels[channelIndex][sampleIndex]);
      dataView.setInt16(outputOffset, pcmSample, true);
      outputOffset += PCM_16_BIT_SAMPLE_BYTES;
    }
  }

  return wavArrayBuffer;
}

export async function convertAudioBlobToWav(inputAudioBlob: Blob): Promise<Blob> {
  const audioContext = new AudioContext();

  try {
    const inputAudioArrayBuffer = await inputAudioBlob.arrayBuffer();
    const decodedAudioBuffer = await audioContext.decodeAudioData(inputAudioArrayBuffer.slice(0));
    const wavArrayBuffer = encodeAudioBufferToWav(decodedAudioBuffer);
    return new Blob([wavArrayBuffer], { type: 'audio/wav' });
  } finally {
    await audioContext.close();
  }
}