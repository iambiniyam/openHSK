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
  pauseDuration: number; // in seconds
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

export const AudioPlaylist: React.FC = () => {
  const [settings, setSettings] = useState<AudioPlaylistSettings>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(AUDIO_PLAYLIST_SETTINGS_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          // Validate the parsed settings
          if (parsed && typeof parsed === 'object') {
            return { ...DEFAULT_SETTINGS, ...parsed };
          }
        }
      } catch (error) {
        console.warn('Failed to load audio playlist settings:', error);
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

  const playbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPlayingRef = useRef(false);

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
      } catch (error) {
        console.warn('Failed to save audio playlist settings:', error);
      }
    }
  }, [settings]);

  // Stop playback when settings that affect playlist change
  useEffect(() => {
    pausePlayback();
    setCurrentIndex(0);
  }, [settings.selectedLevels, settings.shuffle]);

  const speakWord = useCallback(async (entry: HSKEntry): Promise<void> => {
    setCurrentWord(entry);

    await ttsService.speak(entry.source.hanzi);

    if (settings.includeEnglish && entry.core.english_definitions.length > 0) {
      await new Promise(resolve => setTimeout(resolve, 500));
      await ttsService.speak(entry.core.english_definitions[0]);
    }
  }, [settings.includeEnglish]);

  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const playlistRef = useRef(playlist);
  playlistRef.current = playlist;
  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;

  const speakWordRef = useRef(speakWord);
  speakWordRef.current = speakWord;
  const playNextRef = useRef<(() => Promise<void>) | null>(null);

  playNextRef.current = async () => {
    if (!playlistRef.current.length || !isPlayingRef.current) return;

    const idx = currentIndexRef.current;
    const entry = playlistRef.current[idx];
    if (!entry) {
      setIsPlaying(false);
      isPlayingRef.current = false;
      return;
    }

    setIsLoading(true);
    try {
      for (let rep = 0; rep < settingsRef.current.repetitions; rep++) {
        if (!isPlayingRef.current) break;
        await speakWordRef.current(entry);
        if (rep < settingsRef.current.repetitions - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    } catch (error) {
      console.error('Error speaking word:', error);
    } finally {
      setIsLoading(false);
    }

    if (isPlayingRef.current) {
      playbackTimeoutRef.current = setTimeout(() => {
        setCurrentIndex(prev => (prev + 1) % playlistRef.current.length);
        void playNextRef.current?.();
      }, settingsRef.current.pauseDuration * 1000);
    }
  };

  const startPlayback = () => {
    if (playlist.length === 0) return;
    setIsPlaying(true);
    isPlayingRef.current = true;
    void playNextRef.current?.();
  };

  const pausePlayback = () => {
    setIsPlaying(false);
    isPlayingRef.current = false;
    if (playbackTimeoutRef.current) {
      clearTimeout(playbackTimeoutRef.current);
      playbackTimeoutRef.current = null;
    }
    ttsService.stop();
  };

  const skipForward = () => {
    if (playlist.length === 0) return;
    setCurrentIndex(prev => (prev + 1) % playlist.length);
  };

  const skipBackward = () => {
    if (playlist.length === 0) return;
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
      if (playbackTimeoutRef.current) {
        clearTimeout(playbackTimeoutRef.current);
      }
      ttsService.stop();
    };
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
            Audio Playlist - Passive Learning
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Word Display */}
          {currentWord && (
            <div className="text-center space-y-2 p-6 bg-muted rounded-lg">
              <div className="text-4xl font-bold">{currentWord.source.hanzi}</div>
              <div className="text-xl text-muted-foreground">{currentWord.source.pinyin}</div>
              {settings.includeEnglish && currentWord.core.english_definitions.length > 0 && (
                <div className="text-lg">{currentWord.core.english_definitions[0]}</div>
              )}
              <div className="text-sm text-muted-foreground">
                Level {currentWord.source.level} • {currentIndex + 1} of {playlist.length}
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
              disabled={playlist.length === 0 || isLoading}
              className="w-16 h-16 rounded-full"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-current"></div>
              ) : isPlaying ? (
                <Pause className="h-6 w-6" />
              ) : (
                <Play className="h-6 w-6" />
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
                          // Prevent deselecting if it's the last level
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