/**
 * Azure Cognitive Services Speech REST API TTS client.
 *
 * Free tier (F0): 0.5M chars/month standard, 5 audio hours/month neural.
 * Sign up: https://azure.microsoft.com/en-us/services/cognitive-services/speech-services/
 *
 * Uses the lightweight REST API (no SDK needed) so the bundle stays small.
 */

export interface AzureTtsConfig {
  key: string;
  region: string;
  voiceZh: string;
  voiceEn: string;
}

const DEFAULT_VOICE_ZH = 'zh-CN-XiaoxiaoNeural';
const DEFAULT_VOICE_EN = 'en-US-JennyNeural';

const AZURE_VOICES = [
  { name: 'zh-CN-XiaoxiaoNeural', lang: 'zh-CN', label: 'Xiaoxiao (中文, 女)', gender: 'Female' },
  { name: 'zh-CN-YunxiNeural', lang: 'zh-CN', label: 'Yunxi (中文, 男)', gender: 'Male' },
  { name: 'zh-CN-YunjianNeural', lang: 'zh-CN', label: 'Yunjian (中文, 男)', gender: 'Male' },
  { name: 'zh-CN-XiaoyiNeural', lang: 'zh-CN', label: 'Xiaoyi (中文, 女)', gender: 'Female' },
  { name: 'zh-TW-HsiaoChenNeural', lang: 'zh-TW', label: 'HsiaoChen (台灣, 女)', gender: 'Female' },
  { name: 'zh-HK-HiuMaanNeural', lang: 'zh-HK', label: 'HiuMaan (香港, 女)', gender: 'Female' },
  { name: 'en-US-JennyNeural', lang: 'en-US', label: 'Jenny (English, Female)', gender: 'Female' },
  { name: 'en-US-GuyNeural', lang: 'en-US', label: 'Guy (English, Male)', gender: 'Male' },
  { name: 'en-GB-SoniaNeural', lang: 'en-GB', label: 'Sonia (British, Female)', gender: 'Female' },
  { name: 'en-AU-NatashaNeural', lang: 'en-AU', label: 'Natasha (Australian, Female)', gender: 'Female' },
];

const STORAGE_KEY = 'openhsk.azure-tts-config.v1';

export function getAzureVoices() {
  return AZURE_VOICES;
}

export function loadAzureConfig(): AzureTtsConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed.key === 'string' && typeof parsed.region === 'string') {
      return {
        key: parsed.key,
        region: parsed.region,
        voiceZh: parsed.voiceZh || DEFAULT_VOICE_ZH,
        voiceEn: parsed.voiceEn || DEFAULT_VOICE_EN,
      };
    }
  } catch {
    // ignore
  }
  return null;
}

export function saveAzureConfig(config: AzureTtsConfig | null): void {
  if (!config) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

function escapeSsml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function detectLanguage(text: string): 'zh' | 'en' {
  // Simple heuristic: if more than 30% of characters are CJK, treat as Chinese
  const cjk = text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g);
  const ratio = cjk ? cjk.length / text.length : 0;
  return ratio > 0.3 ? 'zh' : 'en';
}

/**
 * Lightweight Azure TTS engine.
 * Returns an HTMLAudioElement ready to play.
 */
export async function synthesizeAzure(
  text: string,
  config: AzureTtsConfig,
  options?: { rate?: number; pitch?: number },
): Promise<HTMLAudioElement> {
  const url = `https://${config.region}.tts.speech.microsoft.com/cognitiveservices/v1`;
  const lang = detectLanguage(text);
  const voiceName = lang === 'zh' ? config.voiceZh : config.voiceEn;
  const voiceInfo = AZURE_VOICES.find((v) => v.name === voiceName) || AZURE_VOICES[0];

  const ratePercent = Math.round(((options?.rate ?? 1) - 1) * 100);
  const rateAttr = ratePercent !== 0 ? ` rate="${ratePercent > 0 ? '+' : ''}${ratePercent}%"` : '';
  const pitchAttr = options?.pitch ? ` pitch="${options.pitch > 1 ? '+' : ''}${Math.round((options.pitch - 1) * 100)}%"` : '';

  const ssml = `<speak version='1.0' xml:lang='${voiceInfo.lang}'>
    <voice xml:lang='${voiceInfo.lang}' xml:gender='${voiceInfo.gender}' name='${voiceName}'>
      <prosody${rateAttr}${pitchAttr}>
        ${escapeSsml(text)}
      </prosody>
    </voice>
  </speak>`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': config.key,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-24khz-160kbitrate-mono-mp3',
      'User-Agent': 'OpenHSK',
    },
    body: ssml,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Azure TTS error ${response.status}: ${body || response.statusText}`);
  }

  const blob = await response.blob();
  const audioUrl = URL.createObjectURL(blob);
  const audio = new Audio(audioUrl);

  // Clean up object URL after playback
  audio.addEventListener('ended', () => URL.revokeObjectURL(audioUrl), { once: true });
  audio.addEventListener('error', () => URL.revokeObjectURL(audioUrl), { once: true });

  return audio;
}

/**
 * Test Azure credentials by synthesizing a single character.
 */
export async function testAzureConfig(config: AzureTtsConfig): Promise<{ ok: boolean; error?: string }> {
  try {
    const audio = await synthesizeAzure('你好', config);
    // Preload to verify the audio is valid
    await new Promise<void>((resolve, reject) => {
      audio.addEventListener('canplaythrough', () => resolve(), { once: true });
      audio.addEventListener('error', () => reject(new Error('Audio load failed')), { once: true });
      audio.load();
    });
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
