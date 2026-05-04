import {
  type AzureTtsConfig,
  loadAzureConfig,
  synthesizeAzure,
} from './enhancedTtsService';
import { speakWebTts, isWebTtsSupported } from './webTtsService';

export type TtsProvider = 'browser' | 'azure' | 'web';

export interface TtsVoiceInfo {
  name: string;
  lang: string;
  neural: boolean;
  local: boolean;
}

class TTSService {
  private synth: SpeechSynthesis | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private chineseVoices: SpeechSynthesisVoice[] = [];
  private englishVoices: SpeechSynthesisVoice[] = [];
  private rate: number = 1;
  private preferredVoice: SpeechSynthesisVoice | null = null;
  private preferredVoiceName: string | null = null;
  private provider: TtsProvider = 'browser';
  private azureConfig: AzureTtsConfig | null = null;

  // Sequential playback state
  private _isSpeaking = false;
  private _isPaused = false;
  private _currentIndex = -1;
  private _abortController: AbortController | null = null;

  // Azure audio state
  private _currentAudio: HTMLAudioElement | null = null;

  private readonly preferredVoiceHints = [
    'xiaoxiao',
    'xiaoyi',
    'yunxi',
    'yunjian',
    'yunyang',
    'xiaohan',
    'xiaomo',
    'xiaorui',
    'zh-cn',
    'microsoft',
    'google',
    'chinese',
    'mandarin',
  ];

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.loadVoicesWithRetry();

      if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = () => this.loadVoices();
      }
    }

    // Load saved provider preference (browser is always the safe default)
    try {
      const savedProvider = localStorage.getItem('openhsk.tts-provider.v1');
      // Only persist 'azure' — browser is default, web is experimental fallback
      if (savedProvider === 'azure') {
        this.provider = savedProvider;
      }
    } catch {
      // ignore
    }

    // Load saved voice preference
    try {
      const savedVoiceName = localStorage.getItem('openhsk.tts-voice.v1');
      if (savedVoiceName) {
        this.preferredVoiceName = savedVoiceName;
      }
    } catch {
      // ignore
    }

    this.azureConfig = loadAzureConfig();
  }

  private loadVoices(): void {
    if (!this.synth) return;

    this.voices = this.synth.getVoices();
    this.chineseVoices = this.voices.filter((voice) =>
      voice.lang.startsWith('zh') || voice.lang.startsWith('cmn'),
    );
    this.englishVoices = this.voices.filter((voice) =>
      voice.lang.startsWith('en'),
    );

    if (this.chineseVoices.length > 0) {
      // If user has a saved voice preference, try to find it
      if (this.preferredVoiceName) {
        const saved = this.chineseVoices.find(
          (v) => v.name === this.preferredVoiceName,
        );
        if (saved) {
          this.preferredVoice = saved;
          return;
        }
      }

      const ranked = [...this.chineseVoices].sort((a, b) => {
        const score = (voice: SpeechSynthesisVoice) => {
          const id = `${voice.name} ${voice.lang}`.toLowerCase();

          let value = 0;

          if (id.includes('zh-cn') || id.includes('cmn-cn')) value += 120;
          else if (id.includes('zh-hk') || id.includes('zh-tw')) value += 80;

          if (voice.default) value += 12;
          if (id.includes('neural')) value += 30;

          this.preferredVoiceHints.forEach((hint, index) => {
            if (id.includes(hint)) {
              value += Math.max(14 - index, 1);
            }
          });

          return value;
        };

        return score(b) - score(a);
      });

      this.preferredVoice = ranked[0] || null;
    }
  }

  /**
   * iOS Safari and some Android browsers return an empty voice list on first call.
   * We retry with exponential backoff until voices are available.
   */
  private loadVoicesWithRetry(attempt = 0): void {
    this.loadVoices();

    if (this.chineseVoices.length === 0 && attempt < 10) {
      const delay = Math.min(100 + attempt * 100, 1000);
      setTimeout(() => this.loadVoicesWithRetry(attempt + 1), delay);
    }
  }

  isSupported(): boolean {
    return this.synth !== null;
  }

  get isSpeaking(): boolean {
    return this._isSpeaking;
  }

  get isPaused(): boolean {
    return this._isPaused;
  }

  get currentIndex(): number {
    return this._currentIndex;
  }

  getVoices(): SpeechSynthesisVoice[] {
    return this.chineseVoices;
  }

  getEnglishVoices(): SpeechSynthesisVoice[] {
    return this.englishVoices;
  }

  setRate(rate: number): void {
    this.rate = Math.max(0.5, Math.min(2, rate));
  }

  getRate(): number {
    return this.rate;
  }

  setVoice(voice: SpeechSynthesisVoice): void {
    this.preferredVoice = voice;
    this.preferredVoiceName = voice.name;
    try {
      localStorage.setItem('openhsk.tts-voice.v1', voice.name);
    } catch {
      // ignore
    }
  }

  setVoiceByName(name: string): void {
    const voice = this.voices.find((v) => v.name === name);
    if (voice) {
      this.setVoice(voice);
    }
  }

  getVoiceList(): SpeechSynthesisVoice[] {
    return this.chineseVoices;
  }

  getProvider(): TtsProvider {
    return this.provider;
  }

  setProvider(provider: TtsProvider): void {
    this.provider = provider;
    try {
      // Only persist azure; browser is default, web is not persisted
      if (provider === 'azure') {
        localStorage.setItem('openhsk.tts-provider.v1', provider);
      } else {
        localStorage.removeItem('openhsk.tts-provider.v1');
      }
    } catch {
      // ignore
    }
  }

  isWebTtsSupported(): boolean {
    return isWebTtsSupported();
  }

  getAzureConfig(): AzureTtsConfig | null {
    return this.azureConfig;
  }

  setAzureConfig(config: AzureTtsConfig | null): void {
    this.azureConfig = config;
  }

  /**
   * Score the quality of a browser voice on a 0-100 scale.
   * Higher is better. Considers known neural voices, platform, and vendor.
   */
  private scoreVoiceQuality(voice: SpeechSynthesisVoice): number {
    const id = `${voice.name} ${voice.lang}`.toLowerCase();
    let score = 0;

    // Known high-quality neural voices (Microsoft / Edge)
    if (id.includes('xiaoxiao')) score += 100;
    else if (id.includes('yunxi')) score += 95;
    else if (id.includes('xiaoyi')) score += 95;
    else if (id.includes('yunjian')) score += 90;
    else if (id.includes('yunyang')) score += 85;
    else if (id.includes('xiaohan') || id.includes('xiaomo') || id.includes('xiaorui')) score += 80;

    // Apple Siri voices (Safari macOS/iOS) - excellent quality
    if (id.includes('siri')) score += 90;
    if (id.includes('ting-ting')) score += 85;

    // Google voices (Chrome on Android/Windows)
    if (id.includes('google')) score += 50;

    // Explicit neural tag
    if (id.includes('neural')) score += 40;

    // Microsoft voices in general are decent
    if (id.includes('microsoft')) score += 30;

    // Apple voices in general
    if (id.includes('apple')) score += 25;

    // Penalize known poor-quality engines
    if (id.includes('espeak')) score -= 80;
    if (id.includes('festival')) score -= 80;
    if (id.includes('speech hub')) score -= 60;
    if (id.includes('free')) score -= 30; // often low-quality FOSS voices

    // Local service vs remote/cloud
    if (!voice.localService) score += 10; // Cloud voices are usually better

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Detect whether the browser has a high-quality neural voice available.
   */
  hasQualityVoice(): boolean {
    if (!this.synth || this.chineseVoices.length === 0) return false;
    const best = this.preferredVoice;
    if (!best) return false;
    return this.scoreVoiceQuality(best) >= 60;
  }

  /**
   * Returns a quality rating label for the best available browser voice.
   */
  getVoiceQualityLabel(): { score: number; label: string; description: string } {
    if (!this.preferredVoice) {
      return { score: 0, label: 'None', description: 'No Chinese voice found in your browser.' };
    }
    const score = this.scoreVoiceQuality(this.preferredVoice);
    if (score >= 80) {
      return { score, label: 'Excellent', description: `${this.preferredVoice.name} — Neural quality, natural sounding.` };
    }
    if (score >= 50) {
      return { score, label: 'Good', description: `${this.preferredVoice.name} — Decent quality, usable for learning.` };
    }
    if (score >= 20) {
      return { score, label: 'Fair', description: `${this.preferredVoice.name} — Acceptable but may sound robotic.` };
    }
    return { score, label: 'Poor', description: `${this.preferredVoice.name} — Sounds robotic. Consider Azure Neural TTS.` };
  }

  getBestVoiceName(): string {
    if (!this.preferredVoice) return 'None';
    return this.preferredVoice.name;
  }

  /**
   * Force a voice reload — useful when the user opens settings
   * and voices may have become available since page load.
   */
  refreshVoices(): void {
    this.loadVoicesWithRetry();
  }

  private speakUtterance(text: string, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.synth) {
        reject(new Error('Speech synthesis not supported'));
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);

      if (this.preferredVoice) {
        utterance.voice = this.preferredVoice;
      }

      utterance.rate = this.rate;
      utterance.pitch = 1;
      utterance.volume = 1;
      utterance.lang = 'zh-CN';

      const onAbort = () => {
        this.synth?.cancel();
        reject(new DOMException('Aborted', 'AbortError'));
      };

      signal?.addEventListener('abort', onAbort, { once: true });

      utterance.onend = () => {
        signal?.removeEventListener('abort', onAbort);
        resolve();
      };

      utterance.onerror = (event) => {
        signal?.removeEventListener('abort', onAbort);
        if (event.error === 'canceled' || event.error === 'interrupted') {
          resolve(); // treat cancel as resolved to not break the chain
        } else {
          reject(event);
        }
      };

      this.synth.speak(utterance);
    });
  }

  private async speakAzure(text: string, signal?: AbortSignal): Promise<void> {
    if (!this.azureConfig) {
      throw new Error('Azure TTS not configured');
    }

    const audio = await synthesizeAzure(text, this.azureConfig, { rate: this.rate });
    this._currentAudio = audio;

    return new Promise((resolve, reject) => {
      const onAbort = () => {
        audio.pause();
        audio.currentTime = 0;
        this._currentAudio = null;
        reject(new DOMException('Aborted', 'AbortError'));
      };

      signal?.addEventListener('abort', onAbort, { once: true });

      audio.addEventListener(
        'ended',
        () => {
          signal?.removeEventListener('abort', onAbort);
          this._currentAudio = null;
          resolve();
        },
        { once: true },
      );

      audio.addEventListener(
        'error',
        () => {
          signal?.removeEventListener('abort', onAbort);
          this._currentAudio = null;
          reject(new Error('Azure audio playback failed'));
        },
        { once: true },
      );

      audio.play().catch((err) => {
        signal?.removeEventListener('abort', onAbort);
        this._currentAudio = null;
        reject(err);
      });
    });
  }

  speak(text: string): Promise<void> {
    this.stop();
    this._isSpeaking = true;

    const doSpeak = async () => {
      if (this.provider === 'azure' && this.azureConfig) {
        await this.speakAzure(text);
      } else if (this.provider === 'web') {
        await speakWebTts(text, 'zh-CN');
      } else {
        if (!this.synth) {
          throw new Error('Speech synthesis not supported');
        }
        await this.speakUtterance(text);
      }
    };

    return doSpeak().finally(() => {
      this._isSpeaking = false;
    });
  }

  /**
   * Play sentences sequentially, calling onProgress before each sentence.
   * Returns a promise that resolves when all sentences are done or rejects on abort.
   * Supports pause/resume and stop.
   */
  async speakSequential(
    sentences: string[],
    onProgress: (index: number) => void,
    startIndex = 0,
  ): Promise<void> {
    this.stop();
    this._isSpeaking = true;
    this._isPaused = false;
    this._currentIndex = -1;
    this._abortController = new AbortController();
    const signal = this._abortController.signal;

    try {
      for (let i = startIndex; i < sentences.length; i++) {
        if (signal.aborted) break;

        // Check for pause before each sentence
        while (this._isPaused && !signal.aborted) {
          await new Promise<void>((r) => {
            const check = () => {
              if (!this._isPaused || signal.aborted) {
                r();
              } else {
                setTimeout(check, 80);
              }
            };
            check();
          });
        }

        if (signal.aborted) break;

        this._currentIndex = i;
        onProgress(i);

        const trimmed = sentences[i].trim();
        if (!trimmed) continue;

        if (this.provider === 'azure' && this.azureConfig) {
          await this.speakAzure(trimmed, signal);
        } else if (this.provider === 'web') {
          await speakWebTts(trimmed, 'zh-CN');
        } else {
          await this.speakUtterance(trimmed, signal);
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // Expected on stop
      } else {
        throw err;
      }
    } finally {
      this._isSpeaking = false;
      this._isPaused = false;
      this._currentAudio = null;
      this._abortController = null;
    }
  }

  pause(): void {
    if (!this._isSpeaking || this._isPaused) return;
    this._isPaused = true;
    if (this._currentAudio) {
      this._currentAudio.pause();
    } else {
      this.synth?.cancel();
    }
  }

  resume(): void {
    if (!this._isPaused) return;
    this._isPaused = false;
    if (this._currentAudio) {
      this._currentAudio.play().catch(() => {
        // ignore
      });
    }
  }

  stop(): void {
    this._isSpeaking = false;
    this._isPaused = false;
    this._currentIndex = -1;
    this._abortController?.abort();
    this._abortController = null;
    if (this._currentAudio) {
      this._currentAudio.pause();
      this._currentAudio.currentTime = 0;
      this._currentAudio = null;
    }
    this.synth?.cancel();
  }

  speakWithTones(text: string, _pinyin?: string): Promise<void> {
    return this.speak(text);
  }

  getRateOptions(): { value: number; label: string }[] {
    return [
      { value: 0.5, label: '0.5x' },
      { value: 0.75, label: '0.75x' },
      { value: 1, label: '1x' },
      { value: 1.25, label: '1.25x' },
      { value: 1.5, label: '1.5x' },
      { value: 2, label: '2x' },
    ];
  }
}

export const ttsService = new TTSService();
