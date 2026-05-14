import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipForward, SkipBack, Settings, Volume2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { hskDataService } from '@/services/hskDataService';
import { ttsService } from '@/services/ttsService';
import type { HSKEntry } from '@/types/hsk';

interface AudioPlaylistSettings {
  selectedLevels: number[];
  playbackSpeed: number;
  repetitions: number;
  pauseDuration: number;
  includeEnglish: boolean;
  shuffle: boolean;
}

const DEFAULT_SETTINGS: AudioPlaylistSettings = {
  selectedLevels: [1],
  playbackSpeed: 1,
  repetitions: 1,
  pauseDuration: 2,
  includeEnglish: false,
  shuffle: false,
};

const AUDIO_PLAYLIST_SETTINGS_KEY = 'openhsk.audio-playlist.v1';

// Tiny silent WAV to keep audio session alive in background
const SILENT_AUDIO_URL = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQQAAAAAAA==';

export const AudioPlaylist: React.FC = () => {
  const [settings, setSettings] = useState<AudioPlaylistSettings>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(AUDIO_PLAYLIST_SETTINGS_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object') {
            return { ...DEFAULT_SETTINGS, ...parsed };
          }
        }
      } catch {
        // ignore
      }
    }
    return DEFAULT_SETTINGS;
  });
  const [playlist, setPlaylist] = useState<HSKEntry[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [currentWord, setCurrentWord] = useState<HSKEntry | null>(null);

  // Refs for background-safe playback
  const isPlayingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const silentAudioRef = useRef<HTMLAudioElement | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const playLoopPromiseRef = useRef<Promise<void> | null>(null);

  // Load playlist based on selected levels
  const loadPlaylist = useCallback(() => {
    const entries: HSKEntry[] = [];
    settings.selectedLevels.forEach(level => {
      entries.push(...hskDataService.getEntriesByLevel(level));
    });

    let finalPlaylist = entries;
    if (settings.shuffle) {
      finalPlaylist = [...entries].sort(() => Math.random() - 0.5);
    }

    setPlaylist(finalPlaylist);
    setCurrentIndex(0);
    setCurrentWord(finalPlaylist[0] || null);
  }, [settings.selectedLevels, settings.shuffle]);

  useEffect(() => {
    loadPlaylist();
  }, [loadPlaylist]);

  // Save settings to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(AUDIO_PLAYLIST_SETTINGS_KEY, JSON.stringify(settings));
      } catch {
        // ignore
      }
    }
  }, [settings]);

  // Sync currentWord with currentIndex
  useEffect(() => {
    if (playlist.length > 0) {
      setCurrentWord(playlist[currentIndex] || null);
    }
  }, [currentIndex, playlist]);

  // Stop playback when settings that affect playlist change
  useEffect(() => {
    pausePlayback();
    setCurrentIndex(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.selectedLevels, settings.shuffle]);

  // Initialize silent audio keepalive
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const audio = new Audio(SILENT_AUDIO_URL);
      audio.loop = true;
      audio.volume = 0.001;
      silentAudioRef.current = audio;
    }
    return () => {
      silentAudioRef.current?.pause();
      silentAudioRef.current = null;
    };
  }, []);

  // Media Session API
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    const nav = navigator as Navigator & { mediaSession: MediaSession };

    nav.mediaSession.setActionHandler('play', () => startPlayback());
    nav.mediaSession.setActionHandler('pause', () => pausePlayback());
    nav.mediaSession.setActionHandler('previoustrack', () => skipBackward());
    nav.mediaSession.setActionHandler('nexttrack', () => skipForward());

    return () => {
      nav.mediaSession.setActionHandler('play', null);
      nav.mediaSession.setActionHandler('pause', null);
      nav.mediaSession.setActionHandler('previoustrack', null);
      nav.mediaSession.setActionHandler('nexttrack', null);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update media session metadata when current word changes
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentWord) return;

    const nav = navigator as Navigator & { mediaSession: MediaSession };
    nav.mediaSession.metadata = new MediaMetadata({
      title: currentWord.source.hanzi,
      artist: `${currentWord.source.pinyin}`,
      album: `OpenHSK • HSK ${currentWord.source.level}`,
    });
    nav.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [currentWord, isPlaying]);

  // Request/release wake lock
  const requestWakeLock = useCallback(async () => {
    if (!('wakeLock' in navigator)) return;
    try {
      const nav = navigator as Navigator & { wakeLock: { request(type: string): Promise<WakeLockSentinel> } };
      wakeLockRef.current = await nav.wakeLock.request('screen');
    } catch {
      // ignore — wake lock may not be available
    }
  }, []);

  const releaseWakeLock = useCallback(() => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => {});
      wakeLockRef.current = null;
    }
  }, []);

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        // Page went to background — wake lock may be released by OS
        // We re-request it when becoming visible again if still playing
      } else if (isPlayingRef.current) {
        void requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [requestWakeLock]);

  const speakWord = useCallback(async (entry: HSKEntry, signal: AbortSignal): Promise<void> => {
    setCurrentWord(entry);

    await ttsService.speakWithRate(entry.source.hanzi, settings.playbackSpeed);
    if (signal.aborted) return;

    if (settings.includeEnglish && entry.core.english_definitions.length > 0) {
      await new Promise(resolve => setTimeout(resolve, 300));
      if (signal.aborted) return;
      await ttsService.speakWithRate(entry.core.english_definitions[0], settings.playbackSpeed);
    }
  }, [settings.includeEnglish, settings.playbackSpeed]);

  // Main playback loop
  const runPlaybackLoop = useCallback(async () => {
    while (isPlayingRef.current) {
      const idx = currentIndex;
      const entry = playlist[idx];
      if (!entry) {
        setIsPlaying(false);
        isPlayingRef.current = false;
        break;
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsLoading(true);
      try {
        for (let rep = 0; rep < settings.repetitions; rep++) {
          if (!isPlayingRef.current || controller.signal.aborted) break;
          await speakWord(entry, controller.signal);
          if (!isPlayingRef.current || controller.signal.aborted) break;
          if (rep < settings.repetitions - 1) {
            await new Promise(r => setTimeout(r, 800));
          }
        }
      } catch (err) {
        console.error('Error speaking word:', err);
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }

      if (!isPlayingRef.current) break;

      // Pause between words
      const pauseMs = Math.max(settings.pauseDuration * 1000, 500);
      await new Promise(r => setTimeout(r, pauseMs));
      if (!isPlayingRef.current) break;

      // Advance to next word
      setCurrentIndex(prev => (prev + 1) % playlist.length);
    }

    // Release wake lock when loop ends
    releaseWakeLock();
    // Stop silent audio
    silentAudioRef.current?.pause();

    const nav = navigator as Navigator & { mediaSession?: MediaSession };
    if (nav.mediaSession) {
      nav.mediaSession.playbackState = 'paused';
    }
  }, [playlist, currentIndex, settings.repetitions, settings.pauseDuration, speakWord, releaseWakeLock]);

  const startPlayback = () => {
    if (playlist.length === 0) return;
    if (isPlayingRef.current) return;

    setIsPlaying(true);
    isPlayingRef.current = true;

    // Start silent audio to keep session alive
    silentAudioRef.current?.play().catch(() => {});

    // Request wake lock
    void requestWakeLock();

    // Start the loop
    playLoopPromiseRef.current = runPlaybackLoop();
  };

  const pausePlayback = () => {
    setIsPlaying(false);
    isPlayingRef.current = false;

    // Abort current speech
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;

    // Stop TTS
    ttsService.stop();

    // Release wake lock
    releaseWakeLock();

    // Stop silent audio
    silentAudioRef.current?.pause();

    // Update media session
    const nav = navigator as Navigator & { mediaSession?: MediaSession };
    if (nav.mediaSession) {
      nav.mediaSession.playbackState = 'paused';
    }
  };

  const skipForward = () => {
    if (playlist.length === 0) return;
    // Abort current speech and advance
    abortControllerRef.current?.abort();
    setCurrentIndex(prev => (prev + 1) % playlist.length);
  };

  const skipBackward = () => {
    if (playlist.length === 0) return;
    abortControllerRef.current?.abort();
    setCurrentIndex(prev => (prev - 1 + playlist.length) % playlist.length);
  };

  const resetPlayback = () => {
    pausePlayback();
    setCurrentIndex(0);
    setCurrentWord(playlist[0] || null);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      pausePlayback();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateSettings = <K extends keyof AudioPlaylistSettings>(key: K, value: AudioPlaylistSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const progress = playlist.length > 0 ? ((currentIndex + 1) / playlist.length) * 100 : 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-6 w-6" />
            Audio Playlist — Passive Learning
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Word Display */}
          {currentWord && (
            <div className="text-center space-y-3 p-8 bg-gradient-to-br from-primary/5 via-background to-primary/5 rounded-2xl border border-primary/10">
              <div className="text-5xl sm:text-6xl font-bold tracking-tight">{currentWord.source.hanzi}</div>
              <div className="text-xl sm:text-2xl text-primary font-medium">{currentWord.source.pinyin}</div>
              {settings.includeEnglish && currentWord.core.english_definitions.length > 0 && (
                <div className="text-base sm:text-lg text-muted-foreground max-w-md mx-auto">{currentWord.core.english_definitions[0]}</div>
              )}
              <div className="inline-flex items-center gap-2 text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                <span className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-primary animate-pulse' : 'bg-muted-foreground/40'}`} />
                HSK {currentWord.source.level} • {currentIndex + 1} of {playlist.length}
              </div>
            </div>
          )}

          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            <div className="text-sm text-muted-foreground text-center">
              {currentIndex + 1} / {playlist.length} words
            </div>
          </div>

          {/* Playback Controls */}
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={skipBackward}
              disabled={playlist.length === 0}
            >
              <SkipBack className="h-4 w-4" />
            </Button>

            <Button
              size="lg"
              onClick={isPlaying ? pausePlayback : startPlayback}
              disabled={playlist.length === 0}
              className="w-16 h-16 rounded-full relative"
            >
              {isPlaying ? (
                <Pause className="h-6 w-6" />
              ) : (
                <Play className="h-6 w-6" />
              )}
              {isLoading && isPlaying && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
                </span>
              )}
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={skipForward}
              disabled={playlist.length === 0}
            >
              <SkipForward className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={resetPlayback}
              disabled={playlist.length === 0}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>

          {/* Settings Toggle */}
          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Settings Panel */}
      {showSettings && (
        <Card>
          <CardHeader>
            <CardTitle>Playback Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Level Selection */}
            <div className="space-y-2">
              <Label>HSK Levels</Label>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(level => (
                  <label key={level} className="flex items-center space-x-2">
                    <Checkbox
                      checked={settings.selectedLevels.includes(level)}
                      disabled={settings.selectedLevels.includes(level) && settings.selectedLevels.length === 1}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          updateSettings('selectedLevels', [...settings.selectedLevels, level]);
                        } else {
                          if (settings.selectedLevels.length > 1) {
                            updateSettings('selectedLevels', settings.selectedLevels.filter(l => l !== level));
                          }
                        }
                      }}
                    />
                    <span>Level {level}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Playback Speed */}
            <div className="space-y-2">
              <Label>Playback Speed: {settings.playbackSpeed}x</Label>
              <Slider
                value={[settings.playbackSpeed]}
                onValueChange={([value]) => updateSettings('playbackSpeed', value)}
                min={0.5}
                max={2}
                step={0.25}
                className="w-full"
              />
            </div>

            {/* Repetitions */}
            <div className="space-y-2">
              <Label>Repetitions per word: {settings.repetitions}</Label>
              <Slider
                value={[settings.repetitions]}
                onValueChange={([value]) => updateSettings('repetitions', value)}
                min={1}
                max={5}
                step={1}
                className="w-full"
              />
            </div>

            {/* Pause Duration */}
            <div className="space-y-2">
              <Label>Pause between words: {settings.pauseDuration}s</Label>
              <Slider
                value={[settings.pauseDuration]}
                onValueChange={([value]) => updateSettings('pauseDuration', value)}
                min={0.5}
                max={10}
                step={0.5}
                className="w-full"
              />
            </div>

            {/* Options */}
            <div className="space-y-4">
              <label className="flex items-center space-x-2">
                <Checkbox
                  checked={settings.includeEnglish}
                  onCheckedChange={(checked) => updateSettings('includeEnglish', checked === true)}
                />
                <span>Include English translation</span>
              </label>

              <label className="flex items-center space-x-2">
                <Checkbox
                  checked={settings.shuffle}
                  onCheckedChange={(checked) => updateSettings('shuffle', checked === true)}
                />
                <span>Shuffle playlist</span>
              </label>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
