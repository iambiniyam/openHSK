class TTSService {
  private synth: SpeechSynthesis | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private chineseVoices: SpeechSynthesisVoice[] = [];
  private rate: number = 1;
  private preferredVoice: SpeechSynthesisVoice | null = null;

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
      this.loadVoices();
      
      // Voices may load asynchronously
      if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = () => this.loadVoices();
      }
    }
  }

  private loadVoices(): void {
    if (!this.synth) return;
    
    this.voices = this.synth.getVoices();
    this.chineseVoices = this.voices.filter(voice => 
      voice.lang.startsWith('zh') || voice.lang.startsWith('cmn')
    );
    
    // Prefer high-quality Chinese voices with deterministic ranking.
    if (this.chineseVoices.length > 0) {
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

  isSupported(): boolean {
    return this.synth !== null;
  }

  getVoices(): SpeechSynthesisVoice[] {
    return this.chineseVoices;
  }

  setRate(rate: number): void {
    this.rate = Math.max(0.5, Math.min(2, rate));
  }

  getRate(): number {
    return this.rate;
  }

  setVoice(voice: SpeechSynthesisVoice): void {
    this.preferredVoice = voice;
  }

  speak(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.synth) {
        reject(new Error('Speech synthesis not supported'));
        return;
      }

      // Cancel any ongoing speech
      this.synth.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      
      if (this.preferredVoice) {
        utterance.voice = this.preferredVoice;
      }
      
      utterance.rate = this.rate;
      utterance.pitch = 1;
      utterance.volume = 1;
      utterance.lang = 'zh-CN';

      utterance.onend = () => resolve();
      utterance.onerror = (event) => reject(event);

      this.synth.speak(utterance);
    });
  }

  stop(): void {
    if (this.synth) {
      this.synth.cancel();
    }
  }

  // Speak with tone visualization data
  speakWithTones(text: string, pinyin?: string): Promise<void> {
    void pinyin;
    return this.speak(text);
  }

  // Get available rates
  getRateOptions(): { value: number; label: string }[] {
    return [
      { value: 0.5, label: '0.5x' },
      { value: 0.75, label: '0.75x' },
      { value: 1, label: '1x' },
      { value: 1.25, label: '1.25x' },
      { value: 1.5, label: '1.5x' },
      { value: 2, label: '2x' }
    ];
  }
}

export const ttsService = new TTSService();
