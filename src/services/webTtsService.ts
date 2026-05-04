/**
 * Free Web TTS using Google Translate's TTS endpoint.
 *
 * This is an unofficial/client-side-only approach that constructs a Google
 * Translate TTS URL and plays it via an <audio> element. No API key, no
 * signup, no backend required.
 *
 * Limitations:
 * - Google may block requests from some browsers/networks (Referer check)
 * - Text is limited to ~200 characters per request
 * - Quality is decent but not neural-level
 * - Relies on Google's unofficial endpoint which could change
 *
 * Falls back silently to browser TTS if the audio fails to load.
 */

const MAX_CHARS = 200;

function buildGoogleTtsUrl(text: string, lang: string): string {
  const encoded = encodeURIComponent(text);
  return `https://translate.google.com/translate_tts?ie=UTF-8&tl=${lang}&client=tw-ob&q=${encoded}`;
}

export async function speakWebTts(text: string, lang = 'zh-CN'): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;

  // Chunk long text
  const chunks: string[] = [];
  if (trimmed.length > MAX_CHARS) {
    // Try to split at sentence boundaries
    let current = '';
    for (const char of trimmed) {
      if (current.length >= MAX_CHARS && /[。！？.!?;；,，]/.test(char)) {
        current += char;
        chunks.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    if (current.trim()) chunks.push(current.trim());
  } else {
    chunks.push(trimmed);
  }

  for (const chunk of chunks) {
    await playAudioChunk(chunk, lang);
  }
}

function playAudioChunk(text: string, lang: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const url = buildGoogleTtsUrl(text, lang);
    const audio = new Audio(url);

    // Set a timeout in case the audio never loads
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Web TTS audio load timeout'));
    }, 8000);

    const cleanup = () => {
      clearTimeout(timeout);
      audio.removeEventListener('canplaythrough', onCanPlay);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };

    const onCanPlay = () => {
      audio.play().catch((err) => {
        cleanup();
        reject(err);
      });
    };

    const onEnded = () => {
      cleanup();
      resolve();
    };

    const onError = () => {
      cleanup();
      reject(new Error('Web TTS audio failed to load (blocked by browser or network)'));
    };

    audio.addEventListener('canplaythrough', onCanPlay, { once: true });
    audio.addEventListener('ended', onEnded, { once: true });
    audio.addEventListener('error', onError, { once: true });

    // Preload to trigger loading
    audio.load();
  });
}

export function isWebTtsSupported(): boolean {
  return typeof Audio !== 'undefined';
}
