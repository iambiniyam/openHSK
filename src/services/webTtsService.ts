/**
 * Free Web TTS using Google Translate's TTS endpoint.
 *
 * Approaches (tried in order):
 * 1. Audio element with referrerPolicy=no-referrer (hides Referer header)
 * 2. CORS proxy fallback if direct request is blocked
 *
 * No API key, no signup, no backend required.
 */

const MAX_CHARS = 200;
const PROXY_URL = 'https://corsproxy.io/';

function buildGoogleTtsUrl(text: string, lang: string): string {
  const encoded = encodeURIComponent(text);
  return `https://translate.google.com/translate_tts?ie=UTF-8&tl=${lang}&client=tw-ob&q=${encoded}`;
}

function buildProxiedUrl(text: string, lang: string): string {
  return `${PROXY_URL}?${encodeURIComponent(buildGoogleTtsUrl(text, lang))}`;
}

export async function speakWebTts(text: string, lang = 'zh-CN'): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;

  const chunks: string[] = [];
  if (trimmed.length > MAX_CHARS) {
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
    // Try direct first (with no-referrer), then proxy fallback
    try {
      await playAudioChunk(chunk, lang, false);
    } catch {
      try {
        await playAudioChunk(chunk, lang, true);
      } catch {
        // Both failed — rethrow so caller can fall back to browser TTS
        throw new Error('Web TTS failed: blocked by Google. Try Browser TTS or Azure.');
      }
    }
  }
}

function playAudioChunk(text: string, lang: string, useProxy: boolean): Promise<void> {
  return new Promise((resolve, reject) => {
    const url = useProxy ? buildProxiedUrl(text, lang) : buildGoogleTtsUrl(text, lang);
    const audio = new Audio();
    audio.src = url;
    (audio as HTMLAudioElement & { referrerPolicy?: string }).referrerPolicy = 'no-referrer';

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Web TTS timeout'));
    }, 10000);

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
      reject(new Error('Audio load error'));
    };

    audio.addEventListener('canplaythrough', onCanPlay, { once: true });
    audio.addEventListener('ended', onEnded, { once: true });
    audio.addEventListener('error', onError, { once: true });

    audio.load();
  });
}

export function isWebTtsSupported(): boolean {
  return typeof Audio !== 'undefined';
}
