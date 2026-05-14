import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play, Pause, SkipForward, SkipBack, Settings, Volume2, RotateCcw,
  Repeat, Shuffle, Heart, Headphones, Clock, Hash, ChevronDown, ChevronUp,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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

interface AudioPlaylistProps {
  onWordClick?: (hanzi: string) => void;
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

export const AudioPlaylist: React.FC<AudioPlaylistProps> = ({ onWordClick }) => {
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
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [currentWord, setCurrentWord] = useState<HSKEntry | null>(null);
  const [wordsHeard, setWordsHeard] = useState(0);
  const [sessionStartTime] = useState(() => Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Refs for background-safe playback
  const isPlayingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const silentAudioRef = useRef<HTMLAudioElement | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const playLoopPromiseRef = useRef<Promise<void> | null>(null);
  const skipRequestedRef = useRef(false);
  const currentIndexRef = useRef(0);
  const playlistRef = useRef<HSKEntry[]>([]);

  // Keep refs in sync
  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { playlistRef.current = playlist; }, [playlist]);

  // Session timer
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - sessionStartTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying, sessionStartTime]);

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
      } else if (isPlayingRef.current) {
        void requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [requestWakeLock]);

  const speakWord = useCallback(async (entry: HSKEntry, signal: AbortSignal): Promise<void> => {
    setCurrentWord(entry);
    setWordsHeard(prev => prev + 1);

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
      const idx = currentIndexRef.current;
      const pl = playlistRef.current;
      const entry = pl[idx];
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

      // Advance to next word (unless skip was requested)
      if (skipRequestedRef.current) {
        skipRequestedRef.current = false;
        continue;
      }
      setCurrentIndex(prev => (prev + 1) % pl.length);
    }

    // Release wake lock when loop ends
    releaseWakeLock();
    // Stop silent audio
    silentAudioRef.current?.pause();

    const nav = navigator as Navigator & { mediaSession?: MediaSession };
    if (nav.mediaSession) {
      nav.mediaSession.playbackState = 'paused';
    }
  }, [settings.repetitions, settings.pauseDuration, speakWord, releaseWakeLock]);

  const startPlayback = useCallback(() => {
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
  }, [playlist.length, requestWakeLock, runPlaybackLoop]);

  const pausePlayback = useCallback(() => {
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
  }, [releaseWakeLock]);

  const skipForward = useCallback(() => {
    if (playlist.length === 0) return;
    skipRequestedRef.current = true;
    abortControllerRef.current?.abort();
    setCurrentIndex(prev => (prev + 1) % playlist.length);
  }, [playlist.length]);

  const skipBackward = useCallback(() => {
    if (playlist.length === 0) return;
    skipRequestedRef.current = true;
    abortControllerRef.current?.abort();
    setCurrentIndex(prev => (prev - 1 + playlist.length) % playlist.length);
  }, [playlist.length]);

  const repeatCurrent = useCallback(() => {
    if (playlist.length === 0) return;
    skipRequestedRef.current = true;
    abortControllerRef.current?.abort();
    // Don't change index — just re-trigger the current word
    if (!isPlayingRef.current) {
      startPlayback();
    }
  }, [playlist.length, startPlayback]);

  const jumpToIndex = useCallback((index: number) => {
    if (playlist.length === 0) return;
    skipRequestedRef.current = true;
    abortControllerRef.current?.abort();
    setCurrentIndex(index);
    if (!isPlayingRef.current) {
      startPlayback();
    }
  }, [playlist.length, startPlayback]);

  const resetPlayback = useCallback(() => {
    pausePlayback();
    setCurrentIndex(0);
    setCurrentWord(playlist[0] || null);
    setWordsHeard(0);
  }, [pausePlayback, playlist]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key) {
        case ' ':
          e.preventDefault();
          if (isPlayingRef.current) {
            pausePlayback();
          } else {
            startPlayback();
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          skipForward();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          skipBackward();
          break;
        case 'r':
        case 'R':
          e.preventDefault();
          repeatCurrent();
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [startPlayback, pausePlayback, skipForward, skipBackward, repeatCurrent]);

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

  const isFavorite = currentWord ? hskDataService.getFavorites().includes(currentWord.entry_id) : false;
  const handleToggleFavorite = useCallback(() => {
    if (!currentWord) return;
    hskDataService.toggleFavorite(currentWord.entry_id);
    // Force re-render
    setCurrentWord(prev => prev ? { ...prev } : null);
  }, [currentWord]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 max-w-5xl">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Player */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Headphones className="h-5 w-5 text-primary" />
                  Audio Playlist
                </CardTitle>
                <div className="flex items-center gap-2">
                  {settings.shuffle && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <Shuffle className="w-3 h-3" /> Shuffle
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs gap-1">
                    <Clock className="w-3 h-3" /> {formatTime(elapsedSeconds)}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Current Word Display */}
              {currentWord && (
                <div className="text-center space-y-3 p-6 sm:p-8 bg-gradient-to-br from-primary/5 via-background to-primary/5 rounded-2xl border border-primary/10 relative">
                  <div className="absolute top-3 right-3 flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-8 w-8 ${isFavorite ? 'text-red-500' : 'text-muted-foreground'}`}
                      onClick={handleToggleFavorite}
                      title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
                    </Button>
                    {onWordClick && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs gap-1"
                        onClick={() => onWordClick(currentWord.source.hanzi)}
                      >
                        <Hash className="h-3 w-3" /> Details
                      </Button>
                    )}
                  </div>

                  <div
                    className="text-5xl sm:text-6xl font-bold tracking-tight cursor-pointer hover:text-primary transition-colors"
                    onClick={() => onWordClick?.(currentWord.source.hanzi)}
                    title="Click to view word details"
                  >
                    {currentWord.source.hanzi}
                  </div>
                  <div className="text-xl sm:text-2xl text-primary font-medium">{currentWord.source.pinyin}</div>
                  {settings.includeEnglish && currentWord.core.english_definitions.length > 0 && (
                    <div className="text-base sm:text-lg text-muted-foreground max-w-md mx-auto">
                      {currentWord.core.english_definitions[0]}
                    </div>
                  )}
                  <div className="inline-flex items-center gap-2 text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
                    <span className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-primary animate-pulse' : 'bg-muted-foreground/40'}`} />
                    HSK {currentWord.source.level} • {currentIndex + 1} of {playlist.length}
                  </div>
                </div>
              )}

              {/* Session Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <div className="text-lg font-bold text-primary">{wordsHeard}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Words Heard</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <div className="text-lg font-bold text-primary">{formatTime(elapsedSeconds)}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Listening Time</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <div className="text-lg font-bold text-primary">{playlist.length}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">In Playlist</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden cursor-pointer relative group"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const pct = (e.clientX - rect.left) / rect.width;
                    const idx = Math.floor(pct * playlist.length);
                    jumpToIndex(Math.max(0, Math.min(playlist.length - 1, idx)));
                  }}
                >
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300 group-hover:bg-primary/80"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{currentIndex + 1} / {playlist.length} words</span>
                  <span>{progress.toFixed(0)}%</span>
                </div>
              </div>

              {/* Playback Controls */}
              <div className="flex items-center justify-center gap-3">
                <Button variant="outline" size="icon" onClick={skipBackward} disabled={playlist.length === 0} title="Previous (←)">
                  <SkipBack className="h-4 w-4" />
                </Button>

                <Button variant="outline" size="icon" onClick={repeatCurrent} disabled={playlist.length === 0} title="Repeat (R)">
                  <Repeat className="h-4 w-4" />
                </Button>

                <Button
                  size="lg"
                  onClick={isPlaying ? pausePlayback : startPlayback}
                  disabled={playlist.length === 0}
                  className="w-16 h-16 rounded-full relative"
                  title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
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

                <Button variant="outline" size="icon" onClick={skipForward} disabled={playlist.length === 0} title="Next (→)">
                  <SkipForward className="h-4 w-4" />
                </Button>

                <Button variant="outline" size="icon" onClick={resetPlayback} disabled={playlist.length === 0} title="Reset">
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>

              {/* Keyboard hint */}
              <div className="hidden sm:flex justify-center gap-3 text-[10px] text-muted-foreground/50">
                <span><kbd className="px-1 py-0.5 rounded bg-muted">Space</kbd> Play/Pause</span>
                <span><kbd className="px-1 py-0.5 rounded bg-muted">←</kbd> <kbd className="px-1 py-0.5 rounded bg-muted">→</kbd> Skip</span>
                <span><kbd className="px-1 py-0.5 rounded bg-muted">R</kbd> Repeat</span>
              </div>

              {/* Settings Toggle */}
              <div className="flex justify-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowPlaylist(!showPlaylist)}>
                  {showPlaylist ? <ChevronUp className="h-4 w-4 mr-2" /> : <ChevronDown className="h-4 w-4 mr-2" />}
                  {showPlaylist ? 'Hide Playlist' : 'Show Playlist'}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowSettings(!showSettings)}>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Playlist */}
          {showPlaylist && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Volume2 className="h-4 w-4" />
                    Playlist ({playlist.length} words)
                  </CardTitle>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowPlaylist(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[300px]">
                  <div className="divide-y divide-border">
                    {playlist.map((entry, i) => {
                      const isCurrent = i === currentIndex;
                      return (
                        <button
                          key={`${entry.entry_id}-${i}`}
                          onClick={() => jumpToIndex(i)}
                          className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors ${
                            isCurrent
                              ? 'bg-primary/10 text-primary'
                              : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <span className={`text-xs font-mono w-8 text-right tabular-nums shrink-0 ${isCurrent ? 'font-bold' : ''}`}>
                            {i + 1}
                          </span>
                          <span className={`text-base font-medium shrink-0 w-16 text-center ${isCurrent ? 'font-bold' : ''}`}>
                            {entry.source.hanzi}
                          </span>
                          <span className="text-sm truncate flex-1">
                            {entry.source.pinyin}
                          </span>
                          <span className="text-xs text-muted-foreground shrink-0">
                            HSK {entry.source.level}
                          </span>
                          {isCurrent && isPlaying && (
                            <span className="flex items-center gap-0.5 shrink-0">
                              <span className="w-1 h-3 bg-primary rounded-full animate-pulse" />
                              <span className="w-1 h-3 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.15s' }} />
                              <span className="w-1 h-3 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Settings Panel */}
        <div className="space-y-4">
          {showSettings && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Playback Settings</CardTitle>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowSettings(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Level Selection */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">HSK Levels</Label>
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(level => (
                      <label key={level} className="flex items-center space-x-1.5 cursor-pointer">
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
                        <span className="text-sm">{level}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Playback Speed */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <Label>Speed</Label>
                    <span className="text-muted-foreground">{settings.playbackSpeed}x</span>
                  </div>
                  <Slider
                    value={[settings.playbackSpeed]}
                    onValueChange={([value]) => updateSettings('playbackSpeed', value)}
                    min={0.5}
                    max={2}
                    step={0.25}
                  />
                </div>

                {/* Repetitions */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <Label>Repetitions</Label>
                    <span className="text-muted-foreground">{settings.repetitions}x</span>
                  </div>
                  <Slider
                    value={[settings.repetitions]}
                    onValueChange={([value]) => updateSettings('repetitions', value)}
                    min={1}
                    max={5}
                    step={1}
                  />
                </div>

                {/* Pause Duration */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <Label>Pause</Label>
                    <span className="text-muted-foreground">{settings.pauseDuration}s</span>
                  </div>
                  <Slider
                    value={[settings.pauseDuration]}
                    onValueChange={([value]) => updateSettings('pauseDuration', value)}
                    min={0.5}
                    max={10}
                    step={0.5}
                  />
                </div>

                {/* Options */}
                <div className="space-y-3 pt-1">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <Checkbox
                      checked={settings.includeEnglish}
                      onCheckedChange={(checked) => updateSettings('includeEnglish', checked === true)}
                    />
                    <span className="text-sm">Include English translation</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <Checkbox
                      checked={settings.shuffle}
                      onCheckedChange={(checked) => updateSettings('shuffle', checked === true)}
                    />
                    <span className="text-sm">Shuffle playlist</span>
                  </label>
                </div>
              </CardContent>
            </Card>
          )}

          {!showSettings && (
            <Card className="bg-muted/30 border-dashed">
              <CardContent className="p-4 space-y-3">
                <div className="text-sm font-medium">Quick Settings</div>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>Speed: <span className="text-foreground font-medium">{settings.playbackSpeed}x</span></div>
                  <div>Reps: <span className="text-foreground font-medium">{settings.repetitions}x</span></div>
                  <div>Pause: <span className="text-foreground font-medium">{settings.pauseDuration}s</span></div>
                  <div>Levels: <span className="text-foreground font-medium">{settings.selectedLevels.join(', ')}</span></div>
                  <div>English: <span className="text-foreground font-medium">{settings.includeEnglish ? 'On' : 'Off'}</span></div>
                  <div>Shuffle: <span className="text-foreground font-medium">{settings.shuffle ? 'On' : 'Off'}</span></div>
                </div>
                <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setShowSettings(true)}>
                  <Settings className="h-3 w-3 mr-1.5" /> Open Settings
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default AudioPlaylist;
