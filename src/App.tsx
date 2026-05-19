import { lazy, useState, useEffect, useCallback, useMemo, useDeferredValue, useRef, useTransition } from 'react';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import { 
  BarChart3, 
  Brain,
  Settings,
  Sun,
  Moon,
  Volume2,
  Mic,
  RotateCcw,
  ScrollText,
  Library,
  AlertTriangle,
  Headphones,
  Play,
  Briefcase,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';

import { unifiedDictionary, type UnifiedEntry } from '@/services/unifiedDictionaryService';
import { hskDataService } from '@/services/hskDataService';
import { ttsService, type TtsProvider } from '@/services/ttsService';
import { scheduleRuntimeWarmup } from '@/lib/runtimeWarmup';
import { fetchWithCacheFallback } from '@/lib/offlineFetch';
import type { UserStats } from '@/types/hsk';
import type { StoryDataset } from '@/types/stories';
import type { BookDataset } from '@/types/books';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { LoadingScreen } from '@/components/LoadingScreen';
import { TopProgressBar } from '@/components/TopProgressBar';
import { KeyboardShortcutsHelp } from '@/components/KeyboardShortcutsHelp';
import { OfflineBanner } from '@/components/OfflineBanner';
import { PwaInstallPrompt } from '@/components/PwaInstallPrompt';
import type { ProgressUpdate } from '@/lib/progressiveLoader';
import { buildDetailSequenceWindow } from '@/lib/detailSequence';
import {
  LandingView,
  DashboardView,
  BrowseView,
  DetailView,
  StudyView,
  ProgressView,
  StoriesView,
  BooksView,
  ProfessionalView,
  SectionLoader,
} from '@/views';

import './App.css';

export type ViewMode = 'landing' | 'dashboard' | 'browse' | 'detail' | 'study' | 'progress' | 'audio' | 'stories' | 'books' | 'professional';
type ListViewMode = 'paginated' | 'virtualized';
export type ProgressTab = 'stats' | 'favorites' | 'grammar' | 'data';

const APP_SESSION_STORAGE_KEY = 'openhsk.ui-session.v1';
const MAX_PERSISTED_DETAIL_SEQUENCE = 180;
const MAX_PERSISTED_STUDY_ENTRIES = 30;

interface PersistedUiSession {
  version: 1;
  currentView: ViewMode;
  darkMode: boolean;
  ttsRate: number;
  searchQuery: string;
  selectedLevel: number | 'all' | '7-9';
  selectedPOS: string;
  listViewMode: ListViewMode;
  browsePage: number;
  progressTab: ProgressTab;
  selectedEntryId?: string;
  detailSequenceIds: string[];
  detailReturnView: ViewMode;
  studyEntryIds: string[];
  currentStudyIndex: number;
  showAnswer: boolean;
  showQuiz: boolean;
  scrollPositions: Partial<Record<ViewMode, number>>;
}

const isViewMode = (value: unknown): value is ViewMode => {
  return (
    typeof value === 'string' &&
    ['landing', 'dashboard', 'browse', 'detail', 'study', 'progress', 'audio', 'stories', 'books', 'professional'].includes(value)
  );
};

const isListViewMode = (value: unknown): value is ListViewMode => {
  return typeof value === 'string' && ['paginated', 'virtualized'].includes(value);
};

const isProgressTab = (value: unknown): value is ProgressTab => {
  return typeof value === 'string' && ['stats', 'favorites', 'grammar', 'data'].includes(value);
};

const normalizeSelectedLevel = (value: unknown): number | 'all' | '7-9' => {
  if (value === 'all' || value === '7-9') return value;
  if (typeof value === 'number' && Number.isFinite(value) && value >= 1 && value <= 9) {
    return value >= 7 ? '7-9' : value;
  }
  return 'all';
};

const sanitizeScrollPositions = (value: unknown): Partial<Record<ViewMode, number>> => {
  if (!value || typeof value !== 'object') return {};

  const positions: Partial<Record<ViewMode, number>> = {};
  for (const [rawView, rawPosition] of Object.entries(value)) {
    if (!isViewMode(rawView)) continue;
    if (typeof rawPosition !== 'number' || !Number.isFinite(rawPosition) || rawPosition < 0) continue;
    positions[rawView] = rawPosition;
  }

  return positions;
};

const loadPersistedUiSession = (): PersistedUiSession | null => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(APP_SESSION_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<PersistedUiSession>;
    if (parsed.version !== 1) return null;

    return {
      version: 1,
      currentView: isViewMode(parsed.currentView) ? parsed.currentView : 'landing',
      darkMode: typeof parsed.darkMode === 'boolean' ? parsed.darkMode : false,
      ttsRate:
        typeof parsed.ttsRate === 'number' && Number.isFinite(parsed.ttsRate)
          ? Math.min(Math.max(parsed.ttsRate, 0.5), 2)
          : 1,
      searchQuery: typeof parsed.searchQuery === 'string' ? parsed.searchQuery : '',
      selectedLevel: normalizeSelectedLevel(parsed.selectedLevel),
      selectedPOS: typeof parsed.selectedPOS === 'string' ? parsed.selectedPOS : 'all',
      listViewMode: isListViewMode(parsed.listViewMode) ? parsed.listViewMode : 'paginated',
      browsePage:
        typeof parsed.browsePage === 'number' && Number.isFinite(parsed.browsePage) && parsed.browsePage > 0
          ? Math.floor(parsed.browsePage)
          : 1,
      progressTab: isProgressTab(parsed.progressTab) ? parsed.progressTab : 'stats',
      selectedEntryId: typeof parsed.selectedEntryId === 'string' ? parsed.selectedEntryId : undefined,
      detailSequenceIds: Array.isArray(parsed.detailSequenceIds)
        ? parsed.detailSequenceIds.filter((id): id is string => typeof id === 'string').slice(0, MAX_PERSISTED_DETAIL_SEQUENCE)
        : [],
      detailReturnView: isViewMode(parsed.detailReturnView) ? parsed.detailReturnView : 'browse',
      studyEntryIds: Array.isArray(parsed.studyEntryIds)
        ? parsed.studyEntryIds.filter((id): id is string => typeof id === 'string').slice(0, MAX_PERSISTED_STUDY_ENTRIES)
        : [],
      currentStudyIndex:
        typeof parsed.currentStudyIndex === 'number' && Number.isFinite(parsed.currentStudyIndex) && parsed.currentStudyIndex >= 0
          ? Math.floor(parsed.currentStudyIndex)
          : 0,
      showAnswer: Boolean(parsed.showAnswer),
      showQuiz: Boolean(parsed.showQuiz),
      scrollPositions: sanitizeScrollPositions(parsed.scrollPositions),
    };
  } catch {
    return null;
  }
};

const savePersistedUiSession = (session: PersistedUiSession): void => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(APP_SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Ignore storage failures to avoid blocking the app.
  }
};



const AudioPlaylist = lazy(() => import('@/components/AudioPlaylist').then((m) => ({ default: m.AudioPlaylist })));



function App() {
  const initialSession = useMemo(() => loadPersistedUiSession(), []);

  // State
  const [darkMode, setDarkMode] = useState(() => {
    if (initialSession) return initialSession.darkMode;

    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    return false;
  });
  const [currentView, setCurrentView] = useState<ViewMode>(initialSession?.currentView || 'landing');
  const [loading, setLoading] = useState(true);
  const [dictionaryReady, setDictionaryReady] = useState(false);
  const [loadProgress, setLoadProgress] = useState<ProgressUpdate | null>(null);
  const [showLoadingScreen, setShowLoadingScreen] = useState(true);
  const [entries, setEntries] = useState<UnifiedEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<UnifiedEntry | null>(null);
  const [detailSequence, setDetailSequence] = useState<UnifiedEntry[]>([]);
  const [detailReturnView, setDetailReturnView] = useState<ViewMode>(initialSession?.detailReturnView || 'browse');
  
  // Search state
  const [searchQuery, setSearchQuery] = useState(initialSession?.searchQuery || '');
  const [selectedLevel, setSelectedLevel] = useState<number | 'all' | '7-9'>(initialSession?.selectedLevel || 'all');
  const [selectedPOS, setSelectedPOS] = useState<string>(initialSession?.selectedPOS || 'all');
  const [searchResults, setSearchResults] = useState<UnifiedEntry[]>([]);
  const [listViewMode, setListViewMode] = useState<ListViewMode>(initialSession?.listViewMode || 'paginated');
  const [browsePage, setBrowsePage] = useState<number>(initialSession?.browsePage || 1);
  const [progressTab, setProgressTab] = useState<ProgressTab>(initialSession?.progressTab || 'stats');
  const [isPending, startTransition] = useTransition();
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const searchCacheRef = useRef<Map<string, UnifiedEntry[]>>(new Map());
  const viewScrollPositionsRef = useRef<Partial<Record<ViewMode, number>>>(initialSession?.scrollPositions || {});
  const previousViewRef = useRef<ViewMode>(initialSession?.currentView || 'landing');
  const hasProcessedHashRef = useRef(false);
  
  // Stats
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [dailyStats, setDailyStats] = useState({
    newWordsLearned: 0,
    wordsReviewed: 0,
    studyTimeMinutes: 0,
    quizzesCompleted: 0,
    writingExercises: 0
  });
  const [dueCount, setDueCount] = useState(0);
  const [favorites, setFavorites] = useState<string[]>([]);
  
  // Study mode
  const [studyEntries, setStudyEntries] = useState<UnifiedEntry[]>([]);
  const [currentStudyIndex, setCurrentStudyIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [showStudyComplete, setShowStudyComplete] = useState(false);

  // Memoized quiz entries to prevent regeneration on every render
  const quizEntries = useMemo(() => {
    if (!dictionaryReady) return [];
    const rec = hskDataService.getRecommendedEntries(100);
    return rec
      .map((hsk) => unifiedDictionary.getEntry(hsk.entry_id))
      .filter((e): e is UnifiedEntry => Boolean(e));
  }, [dictionaryReady]);
  
  // Settings
  const [ttsRate, setTtsRate] = useState(initialSession?.ttsRate || 1);
  const [ttsProvider, setTtsProvider] = useState<TtsProvider>(() => ttsService.getProvider());
  const [showPomodoro, setShowPomodoro] = useState(false);
  const [exportData, setExportData] = useState('');

  // TTS voice state
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>(() => {
    if (typeof window !== 'undefined') {
      ttsService.refreshVoices();
    }
    return ttsService.getVoiceList();
  });
  const [selectedVoiceName, setSelectedVoiceName] = useState(() => ttsService.getBestVoiceName());
  const [voiceQuality, setVoiceQuality] = useState(() => ttsService.getVoiceQualityLabel());
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importData, setImportData] = useState('');

  // Init error state
  const [initError, setInitError] = useState(false);

  // Auto-play TTS in study mode
  const [studyAutoPlay, setStudyAutoPlay] = useState(() => {
    try { return localStorage.getItem('openhsk.study-autoplay.v1') === 'true'; } catch { return false; }
  });

  // Study session dialog
  const [showStudyDialog, setShowStudyDialog] = useState(false);
  const [studySessionSize, setStudySessionSize] = useState(20);

  // Search history
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('openhsk.search-history.v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.filter((s): s is string => typeof s === 'string').slice(0, 20);
      }
    } catch { /* ignore */ }
    return [];
  });

  // Welcome banner
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem('openhsk.welcomed.v1') !== 'true';
  });
  const dismissWelcomeBanner = useCallback(() => {
    setShowWelcomeBanner(false);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('openhsk.welcomed.v1', 'true');
    }
  }, []);

  // Stories state
  const [storyDataset, setStoryDataset] = useState<StoryDataset | null>(null);
  const [storyView, setStoryView] = useState<'browse' | 'reader'>('browse');
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [bookDataset, setBookDataset] = useState<BookDataset | null>(null);
  const [bookView, setBookView] = useState<'browse' | 'reader'>('browse');
  const [currentBookIndex, setCurrentBookIndex] = useState(0);

  // Initialize — app shell pattern
  useEffect(() => {
    let disposed = false;

    const init = async () => {
      // Immediately reveal app shell so landing page is interactive.
      setLoading(false);
      setShowLoadingScreen(true);

      // Start dictionary load with real-time progress in background.
      const dictPromise = unifiedDictionary.initializeWithProgress((update) => {
        if (!disposed) {
          setLoadProgress(update);
        }
      });

      // Also start hskDataService (will hit cache after dict fetch).
      const hskPromise = hskDataService.loadData();

      try {
        await dictPromise;
        if (disposed) return;

        await hskPromise;
        if (disposed) return;

        const allEntries = unifiedDictionary.getAllEntries();
        setEntries(allEntries);
        setSearchResults(allEntries);
        searchCacheRef.current.clear();

        setUserStats(hskDataService.getUserStats());
        setDueCount(hskDataService.getDueReviews().length);
        setFavorites(hskDataService.getFavorites());
        setDailyStats(hskDataService.getDailyStats());

        if (initialSession) {
          const entryById = new Map(allEntries.map((entry) => [entry.id, entry] as const));

          setDarkMode(initialSession.darkMode);
          setTtsRate(initialSession.ttsRate);
          setSearchQuery(initialSession.searchQuery);
          setSelectedLevel(initialSession.selectedLevel);
          setSelectedPOS(initialSession.selectedPOS);
          setListViewMode(initialSession.listViewMode);
          setBrowsePage(initialSession.browsePage);
          setProgressTab(initialSession.progressTab);
          setDetailReturnView(initialSession.detailReturnView);
          viewScrollPositionsRef.current = initialSession.scrollPositions;

          const restoredDetailSequence = initialSession.detailSequenceIds
            .map((id) => entryById.get(id))
            .filter((entry): entry is UnifiedEntry => Boolean(entry));

          const restoredSelectedEntry = initialSession.selectedEntryId
            ? entryById.get(initialSession.selectedEntryId) || null
            : null;

          if (restoredSelectedEntry) {
            setSelectedEntry(restoredSelectedEntry);
            setDetailSequence(
              restoredDetailSequence.length > 0 ? restoredDetailSequence : [restoredSelectedEntry],
            );
          }

          const restoredStudyEntries = initialSession.studyEntryIds
            .map((id) => entryById.get(id))
            .filter((entry): entry is UnifiedEntry => Boolean(entry));

          if (restoredStudyEntries.length > 0) {
            setStudyEntries(restoredStudyEntries);
            setCurrentStudyIndex(
              Math.min(initialSession.currentStudyIndex, restoredStudyEntries.length - 1),
            );
            setShowAnswer(initialSession.showAnswer);
            setShowQuiz(initialSession.showQuiz);
          }

          let restoredView = initialSession.currentView;
          if (restoredView === 'detail' && !restoredSelectedEntry) {
            restoredView = initialSession.detailReturnView;
          }
          if (restoredView === 'study' && restoredStudyEntries.length === 0) {
            restoredView = 'dashboard';
          }

          setCurrentView(restoredView);
          previousViewRef.current = restoredView;
        }

        setDictionaryReady(true);
      } catch (error) {
        console.error('Failed to initialize:', error);
        if (!disposed) {
          setDictionaryReady(false);
          setInitError(true);
        }
      }

      // Load stories dataset in background (non-blocking)
      try {
        const res = await fetchWithCacheFallback('/quality/hsk-stories.v1.json');
        const data = await res.json() as StoryDataset;
        if (!disposed && data?.stories?.length) {
          setStoryDataset(data);
        }
      } catch {
        // Stories are optional; app works without them
      }

      // Load books dataset in background (non-blocking)
      try {
        const res = await fetchWithCacheFallback('/quality/hsk-books.v1.json');
        const data = await res.json() as BookDataset;
        if (!disposed && data?.books?.length) {
          setBookDataset(data);
        }
      } catch {
        // Books are optional; app works without them
      }
    };

    init();

    return () => {
      disposed = true;
      unifiedDictionary.abortLoad();
    };
  }, [initialSession]);

  // Hash-based deep linking — read hash on mount
  // Read hash and restore view-specific state on mount / when data loads
  useEffect(() => {
    if (hasProcessedHashRef.current) return;
    const hash = window.location.hash.replace('#', '');
    if (!hash) {
      hasProcessedHashRef.current = true;
      return;
    }
    const [view, ...params] = hash.split('/');
    if (!isViewMode(view)) {
      hasProcessedHashRef.current = true;
      return;
    }

    // Use a single batch update to avoid multiple re-renders
    const updates: (() => void)[] = [];
    updates.push(() => setCurrentView(view));

    if (view === 'detail' && params[0] && dictionaryReady) {
      const entry = unifiedDictionary.getAllEntries().find(e => e.id === params[0] || e.hanzi === decodeURIComponent(params[0]));
      if (entry) {
        updates.push(() => setSelectedEntry(entry));
        updates.push(() => setDetailSequence([entry]));
        updates.push(() => setDetailReturnView('browse'));
      }
    }
    if (view === 'stories' && params[0] === 'reader' && params[1] && storyDataset) {
      const idx = parseInt(params[1], 10);
      if (!isNaN(idx) && storyDataset.stories[idx]) {
        updates.push(() => setCurrentStoryIndex(idx));
        updates.push(() => setStoryView('reader'));
      }
    }
    if (view === 'books' && params[0] === 'reader' && params[1] && bookDataset) {
      const idx = parseInt(params[1], 10);
      if (!isNaN(idx) && bookDataset.books[idx]) {
        updates.push(() => setCurrentBookIndex(idx));
        updates.push(() => setBookView('reader'));
      }
    }

    // Apply all state updates in a microtask to batch them
    Promise.resolve().then(() => {
      updates.forEach(fn => fn());
      hasProcessedHashRef.current = true;
    });
  }, [dictionaryReady, storyDataset, bookDataset]);

  // Listen for browser back/forward hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (!hash) return;
      const view = hash.split('/')[0] as ViewMode;
      if (isViewMode(view)) {
        setCurrentView(view);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Update hash when view changes (replaceState does not trigger hashchange)
  useEffect(() => {
    const newHash = `#${currentView}`;
    if (window.location.hash !== newHash) {
      window.history.replaceState(null, '', newHash);
    }
  }, [currentView]);

  useEffect(() => {
    if (!dictionaryReady) return;
    return scheduleRuntimeWarmup();
  }, [dictionaryReady]);

  // Dark mode
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  // Remember scroll position per view and restore when users return.
  useEffect(() => {
    if (loading) return;

    const previousView = previousViewRef.current;
    if (previousView !== currentView) {
      viewScrollPositionsRef.current[previousView] = window.scrollY;
    }

    if (currentView !== 'detail' && currentView !== 'study' && currentView !== 'stories' && currentView !== 'books' && currentView !== 'professional') {
      const targetScroll = viewScrollPositionsRef.current[currentView] || 0;
      requestAnimationFrame(() => {
        window.scrollTo({ top: targetScroll, behavior: 'auto' });
      });
    }

    previousViewRef.current = currentView;
  }, [currentView, loading]);

  // Update metadata by active section to improve crawlable context.
  useEffect(() => {
    let title = 'OpenHSK | Learn Chinese with HSK, Pinyin, and Stroke Practice';
    let description = 'OpenHSK helps you learn Chinese with HSK vocabulary, stroke order practice, quizzes, and daily study tools.';

    if (currentView === 'landing') {
      title = 'OpenHSK | Free Chinese Learning for Everyone';
      description = 'A free and open platform for learning Chinese with HSK vocabulary, pinyin, stroke order, and daily study tools.';
    } else if (currentView === 'browse') {
      title = 'Browse HSK Vocabulary | OpenHSK';
      description = 'Search and filter the HSK dictionary by level, pinyin, and meaning.';
    } else if (currentView === 'detail' && selectedEntry) {
      title = `${selectedEntry.hanzi} (${selectedEntry.pinyin}) | OpenHSK`;
      description = `Study ${selectedEntry.hanzi} with pinyin, meanings, examples, and stroke order in OpenHSK.`;
    } else if (currentView === 'study') {
      title = 'Study Session | OpenHSK';
      description = 'Practice Chinese vocabulary with guided study and quiz mode.';
    } else if (currentView === 'progress') {
      title = 'Learning Progress | OpenHSK';
      description = 'Track your HSK learning progress, goals, and favorite words.';
    } else if (currentView === 'professional') {
      title = 'Professional Chinese | OpenHSK';
      description = 'Learn software engineering, Android, automotive, and workplace Chinese vocabulary and dialogues.';
    }

    document.title = title;

    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', description);
    }
  }, [currentView, selectedEntry]);

  // TTS rate
  useEffect(() => {
    ttsService.setRate(ttsRate);
  }, [ttsRate]);

  // Persist UI session so users can continue where they left off.
  useEffect(() => {
    if (loading || !dictionaryReady) return;

    const detailSequenceIds =
      currentView === 'detail'
        ? detailSequence.map((entry) => entry.id).slice(0, MAX_PERSISTED_DETAIL_SEQUENCE)
        : selectedEntry
          ? [selectedEntry.id]
          : [];

    const persistSession = () => {
      savePersistedUiSession({
        version: 1,
        currentView,
        darkMode,
        ttsRate,
        searchQuery,
        selectedLevel,
        selectedPOS,
        listViewMode,
        browsePage,
        progressTab,
        selectedEntryId: selectedEntry?.id,
        detailSequenceIds,
        detailReturnView,
        studyEntryIds: studyEntries.map((entry) => entry.id).slice(0, MAX_PERSISTED_STUDY_ENTRIES),
        currentStudyIndex,
        showAnswer,
        showQuiz,
        scrollPositions: viewScrollPositionsRef.current,
      });
    };

    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

    if (typeof idleWindow.requestIdleCallback === 'function') {
      const handle = idleWindow.requestIdleCallback(persistSession, { timeout: 700 });
      return () => {
        if (typeof idleWindow.cancelIdleCallback === 'function') {
          idleWindow.cancelIdleCallback(handle);
        }
      };
    }

    const timer = window.setTimeout(persistSession, 240);
    return () => window.clearTimeout(timer);
  }, [
    loading,
    currentView,
    darkMode,
    ttsRate,
    searchQuery,
    selectedLevel,
    selectedPOS,
    listViewMode,
    browsePage,
    progressTab,
    selectedEntry,
    detailSequence,
    detailReturnView,
    studyEntries,
    currentStudyIndex,
    showAnswer,
    showQuiz,
    dictionaryReady,
  ]);

  // Search with debounce - optimized for performance
  useEffect(() => {
    if (!dictionaryReady) return;

    const cacheKey = `${deferredSearchQuery}|${selectedLevel}|${selectedPOS}`;
    const cached = searchCacheRef.current.get(cacheKey);

    if (cached) {
      startTransition(() => {
        setSearchResults(cached);
      });
      return;
    }

    const timer = setTimeout(() => {
      // Use requestAnimationFrame for smoother UI updates
      requestAnimationFrame(() => {
        const results = unifiedDictionary.search(deferredSearchQuery, {
          hskLevel: selectedLevel === 'all' ? undefined : selectedLevel,
          partOfSpeech: selectedPOS === 'all' ? undefined : selectedPOS,
        });

        const filtered = results.map((r) => r.entry);

        searchCacheRef.current.set(cacheKey, filtered);
        // Limit cache size to prevent unbounded growth
        if (searchCacheRef.current.size > 30) {
          const firstKey = searchCacheRef.current.keys().next().value;
          if (firstKey !== undefined) {
            searchCacheRef.current.delete(firstKey);
          }
        }

        startTransition(() => {
          setSearchResults(filtered);
        });
      });
    }, 120);

    return () => clearTimeout(timer);
  }, [dictionaryReady, deferredSearchQuery, selectedLevel, selectedPOS, startTransition]);

  // Stats
  const hskStats = unifiedDictionary.getHSKStats();
  const totalWords = entries.length;

  // Actions
  const refreshStats = useCallback(() => {
    setUserStats(hskDataService.getUserStats());
    setDueCount(hskDataService.getDueReviews().length);
    setDailyStats(hskDataService.getDailyStats());
  }, []);

  const openDetailView = useCallback(
    (
      entry: UnifiedEntry,
      options?: {
        sequence?: UnifiedEntry[];
        returnView?: ViewMode;
      },
    ) => {
      setSelectedEntry(entry);
      const rawSequence = options?.sequence && options.sequence.length > 0 ? options.sequence : [entry];
      setDetailSequence(buildDetailSequenceWindow(rawSequence, entry.id));
      setDetailReturnView(options?.returnView ?? currentView);
      setCurrentView('detail');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [currentView],
  );

  const toggleFavorite = useCallback((id: string) => {
    const isFav = hskDataService.toggleFavorite(id);
    setFavorites(hskDataService.getFavorites());
    const entry = unifiedDictionary.getEntry(id);
    if (entry) {
      toast(isFav ? 'Added to favorites' : 'Removed from favorites', {
        description: entry.hanzi,
        duration: 1500,
      });
    }
    return isFav;
  }, []);

  const startStudySession = useCallback((size = 20) => {
    const recommended = hskDataService.getRecommendedEntries(size)
      .map((hsk) => unifiedDictionary.getEntry(hsk.entry_id))
      .filter((entry): entry is UnifiedEntry => Boolean(entry));
    setStudyEntries(recommended);
    setCurrentStudyIndex(0);
    setShowAnswer(false);
    setShowQuiz(false);
    setShowStudyComplete(false);
    setCurrentView('study');
  }, []);

  const handleStudyResult = useCallback((rating: 1 | 2 | 3 | 4) => {
    const entry = studyEntries[currentStudyIndex];
    if (entry) {
      hskDataService.updateProgressWithRating(entry.id, rating);
    }

    if (currentStudyIndex < studyEntries.length - 1) {
      setCurrentStudyIndex(prev => prev + 1);
      setShowAnswer(false);
    } else {
      refreshStats();
      setShowStudyComplete(true);
    }
  }, [currentStudyIndex, studyEntries, refreshStats]);

  // Study mode keyboard shortcuts
  useEffect(() => {
    if (currentView !== 'study' || showQuiz) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      if (!showAnswer) {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          setShowAnswer(true);
        }
      } else {
        if (e.key >= '1' && e.key <= '4') {
          e.preventDefault();
          handleStudyResult(parseInt(e.key) as 1 | 2 | 3 | 4);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentView, showQuiz, showAnswer, handleStudyResult]);

  // Auto-play TTS when answer is revealed in study mode
  useEffect(() => {
    if (currentView === 'study' && studyAutoPlay && showAnswer && studyEntries[currentStudyIndex]) {
      const entry = studyEntries[currentStudyIndex];
      const timer = setTimeout(() => {
        ttsService.speak(entry.hanzi);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [currentView, showAnswer, studyAutoPlay, currentStudyIndex, studyEntries]);

  const handleRetryInit = useCallback(() => {
    setInitError(false);
    setDictionaryReady(false);
    setShowLoadingScreen(true);
    // Re-trigger the init effect by forcing a reload
    window.location.reload();
  }, []);

  const handleExport = useCallback(() => {
    const data = hskDataService.exportData();
    setExportData(data);
  }, []);

  const handleImport = useCallback(() => {
    const success = hskDataService.importData(importData);
    if (success) {
      refreshStats();
      setShowImportDialog(false);
      setImportData('');
      toast.success('Data imported successfully!');
    } else {
      toast.error('Failed to import data. Please check the format.');
    }
  }, [importData, refreshStats]);

  // Stable callback wrappers for view components
  const handleNavigateTo = useCallback((view: ViewMode) => setCurrentView(view), []);
  const handleShowStudyDialog = useCallback(() => setShowStudyDialog(true), []);
  const handleStartQuiz = useCallback(() => { setShowQuiz(true); setCurrentView('study'); }, []);
  const handleShowPomodoro = useCallback(() => setShowPomodoro(true), []);
  const handleShowFeatureGuide = useCallback(() => { dismissWelcomeBanner(); window.dispatchEvent(new CustomEvent('openhsk:show-feature-guide')); }, [dismissWelcomeBanner]);
  const handleShowImportDialog = useCallback(() => setShowImportDialog(true), []);
  const handleSetShowPomodoro = useCallback((open: boolean) => setShowPomodoro(open), []);

  const handleSearchQueryChange = useCallback((value: string) => { setSearchQuery(value); setBrowsePage(1); }, []);
  const handleSearchSubmit = useCallback((trimmed: string) => {
    setSearchHistory((prev) => {
      const next = [trimmed, ...prev.filter((s) => s !== trimmed)].slice(0, 20);
      try { localStorage.setItem('openhsk.search-history.v1', JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);
  const handleClearSearch = useCallback(() => { setSearchQuery(''); setBrowsePage(1); }, []);
  const handleSelectedLevelChange = useCallback((value: number | 'all' | '7-9') => { setSelectedLevel(value); setBrowsePage(1); }, []);
  const handleSelectedPOSChange = useCallback((value: string) => { setSelectedPOS(value); setBrowsePage(1); }, []);
  const handleListViewModeChange = useCallback((mode: ListViewMode) => setListViewMode(mode), []);
  const handleSelectHistoryTerm = useCallback((term: string) => { setSearchQuery(term); setBrowsePage(1); }, []);
  const handleClearHistory = useCallback(() => {
    setSearchHistory([]);
    try { localStorage.removeItem('openhsk.search-history.v1'); } catch { /* ignore */ }
  }, []);

  const handleSetShowAnswer = useCallback((show: boolean) => setShowAnswer(show), []);
  const handleSetStudyAutoPlay = useCallback((value: boolean | ((prev: boolean) => boolean)) => setStudyAutoPlay(value), []);
  const handleSetShowQuiz = useCallback((show: boolean) => setShowQuiz(show), []);
  const handleSetShowStudyComplete = useCallback((show: boolean) => setShowStudyComplete(show), []);

  const handleSetSelectedEntry = useCallback((entry: UnifiedEntry) => setSelectedEntry(entry), []);
  const handleSetDetailSequence = useCallback((seq: UnifiedEntry[] | ((prev: UnifiedEntry[]) => UnifiedEntry[])) => setDetailSequence(seq), []);

  const handleSetProgressTab = useCallback((tab: ProgressTab) => setProgressTab(tab), []);
  const handleSetFavorites = useCallback((favs: string[]) => setFavorites(favs), []);

  const handleSetStoryView = useCallback((view: 'browse' | 'reader') => setStoryView(view), []);
  const handleSetCurrentStoryIndex = useCallback((index: number | ((prev: number) => number)) => setCurrentStoryIndex(index), []);

  const handleSetBookView = useCallback((view: 'browse' | 'reader') => setBookView(view), []);
  const handleSetCurrentBookIndex = useCallback((index: number | ((prev: number) => number)) => setCurrentBookIndex(index), []);

  // Loading screen — shown until user dismisses it or data is ready
  if (showLoadingScreen && !dictionaryReady) {
    return (
      <LoadingScreen
        progress={loadProgress}
        onEnterApp={() => setShowLoadingScreen(false)}
        canEnterEarly={true}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background brand-atmosphere">
      <OfflineBanner />
      <KeyboardShortcutsHelp />
      <PwaInstallPrompt />
      {/* Header */}
      <header className="border-b sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <div 
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => setCurrentView('landing')}
          >
            <div className="h-10 w-10 sm:h-11 sm:w-11 shrink-0 rounded-xl border border-primary/20 bg-background/90 p-1 shadow-sm">
              <img src="/brand/logo-mark.svg" alt="OpenHSK logo" className="h-full w-full" loading="eager" />
            </div>
            <div className="leading-tight">
              <span className="font-brand block text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                OpenHSK
              </span>
              <span className="hidden lg:block text-[11px] text-muted-foreground uppercase tracking-[0.18em]">
                Open Chinese Learning
              </span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <Button
              variant={currentView === 'landing' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setCurrentView('landing')}
              className="gap-2"
            >
              <img src="/brand/logo-mark.svg" alt="" aria-hidden="true" className="w-4 h-4" loading="eager" />
              Start
            </Button>
            <Button
              variant={currentView === 'dashboard' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setCurrentView('dashboard')}
              className="gap-2"
            >
              <img src="/brand/icons/dictionary-stack.svg" alt="" aria-hidden="true" className="w-4 h-4" loading="eager" />
              Home
            </Button>
            <Button
              variant={currentView === 'browse' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setCurrentView('browse')}
              className="gap-2"
            >
              <img src="/brand/icons/search-hanzi.svg" alt="" aria-hidden="true" className="w-4 h-4" loading="eager" />
              Browse
            </Button>
            <Button
              variant={currentView === 'progress' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setCurrentView('progress')}
              className="gap-2"
            >
              <BarChart3 className="w-4 h-4" />
              Progress
            </Button>
            <Button
              variant={currentView === 'audio' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setCurrentView('audio')}
              className="gap-2"
            >
              <Volume2 className="w-4 h-4" />
              Audio
            </Button>
            <Button
              variant={currentView === 'stories' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setCurrentView('stories')}
              className="gap-2"
              disabled={!storyDataset}
            >
              <ScrollText className={`w-4 h-4 ${!storyDataset ? 'opacity-50' : ''}`} />
              Stories
            </Button>
            <Button
              variant={currentView === 'books' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setCurrentView('books')}
              className="gap-2"
              disabled={!bookDataset}
            >
              <Library className={`w-4 h-4 ${!bookDataset ? 'opacity-50' : ''}`} />
              Books
            </Button>
            <Button
              variant={currentView === 'professional' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setCurrentView('professional')}
              className="gap-2"
            >
              <Briefcase className="w-4 h-4" />
              Pro
            </Button>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'} onClick={() => setDarkMode(!darkMode)}>
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
            
            <Dialog
              onOpenChange={(open) => {
                if (open) {
                  ttsService.refreshVoices();
                  setAvailableVoices(ttsService.getVoiceList());
                  setSelectedVoiceName(ttsService.getBestVoiceName());
                  setVoiceQuality(ttsService.getVoiceQualityLabel());
                }
              }}
            >
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Settings">
                  <Settings className="w-5 h-5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Settings</DialogTitle>
                  <DialogDescription>Customize your learning experience</DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  {/* Voice Speed */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Voice Speed</Label>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">0.5x</span>
                      <Slider
                        value={[ttsRate]}
                        onValueChange={([v]) => setTtsRate(v)}
                        min={0.5}
                        max={2}
                        step={0.25}
                        className="flex-1"
                      />
                      <span className="text-sm text-muted-foreground">2x</span>
                    </div>
                    <div className="text-center text-sm text-muted-foreground">
                      Current: {ttsRate}x
                    </div>
                  </div>

                  {/* TTS Provider */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">TTS Engine</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        { value: 'browser' as const, label: 'Browser', desc: 'Use system voices' },
                        { value: 'web' as const, label: 'Web TTS', desc: 'Free, no signup' },
                        { value: 'azure' as const, label: 'Azure', desc: 'Neural quality' },
                      ]).map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => {
                            ttsService.setProvider(opt.value);
                            setTtsProvider(opt.value);
                          }}
                          className={`flex flex-col items-center gap-1 rounded-lg border p-2.5 text-center transition-all ${
                            ttsProvider === opt.value
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border/50 hover:border-primary/30 hover:bg-muted/50'
                          }`}
                        >
                          <span className="text-xs font-semibold">{opt.label}</span>
                          <span className="text-[10px] text-muted-foreground leading-tight">{opt.desc}</span>
                        </button>
                      ))}
                    </div>
                    {ttsProvider === 'web' && (
                      <p className="text-xs text-muted-foreground">
                        Uses Google Translate TTS. Free, no signup, works in most browsers. Quality varies.
                      </p>
                    )}
                  </div>

                  {ttsProvider === 'browser' && (
                    <>
                      {/* Voice Quality Indicator */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Voice Quality</Label>
                        <div className="flex items-start gap-2 flex-wrap">
                          <Badge
                            variant={voiceQuality.score >= 80 ? 'default' : voiceQuality.score >= 50 ? 'secondary' : 'destructive'}
                            className="text-xs shrink-0 mt-0.5"
                          >
                            {voiceQuality.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground break-words flex-1 min-w-0">
                            {voiceQuality.description}
                          </span>
                        </div>
                      </div>

                      {/* Voice Picker */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Chinese Voice</Label>
                        <Select
                          value={selectedVoiceName}
                          onValueChange={(name) => {
                            ttsService.setVoiceByName(name);
                            setSelectedVoiceName(name);
                            setVoiceQuality(ttsService.getVoiceQualityLabel());
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a voice..." />
                          </SelectTrigger>
                          <SelectContent>
                            {availableVoices.length === 0 ? (
                              <SelectItem value="none" disabled>
                                No voices available — try reloading the page
                              </SelectItem>
                            ) : (
                              availableVoices.map((voice) => (
                                <SelectItem key={voice.name} value={voice.name}>
                                  {voice.name} ({voice.lang})
                                  {voice.default && ' • Default'}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        {availableVoices.length === 0 && (
                          <p className="text-xs text-amber-600">
                            No Chinese voices detected. On iOS, go to Settings → Accessibility → Spoken Content → Voices → Chinese to download higher-quality voices.
                          </p>
                        )}
                      </div>
                    </>
                  )}

                  {/* Test Voice */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      ttsService.speak('你好，欢迎使用 OpenHSK。');
                    }}
                  >
                    <Mic className="w-4 h-4 mr-2" />
                    Test Voice
                  </Button>

                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-background z-50 pb-safe">
        <div className="flex justify-around items-center p-1.5 gap-1 overflow-x-auto">
          {([
            { view: 'landing' as const, label: 'Start', icon: <img src="/brand/logo-mark.svg" alt="" aria-hidden="true" className="w-5 h-5" loading="eager" /> },
            { view: 'dashboard' as const, label: 'Home', icon: <img src="/brand/icons/dictionary-stack.svg" alt="" aria-hidden="true" className="w-5 h-5" loading="eager" /> },
            { view: 'browse' as const, label: 'Browse', icon: <img src="/brand/icons/search-hanzi.svg" alt="" aria-hidden="true" className="w-5 h-5" loading="eager" /> },
            { view: 'progress' as const, label: 'Progress', icon: <BarChart3 className="w-5 h-5" /> },
            { view: 'audio' as const, label: 'Audio', icon: <Volume2 className="w-5 h-5" /> },
            { view: 'stories' as const, label: 'Stories', icon: <ScrollText className={`w-5 h-5 ${!storyDataset ? 'opacity-50' : ''}`} />, disabled: !storyDataset },
            { view: 'books' as const, label: 'Books', icon: <Library className={`w-5 h-5 ${!bookDataset ? 'opacity-50' : ''}`} />, disabled: !bookDataset },
            { view: 'professional' as const, label: 'Pro', icon: <Briefcase className="w-5 h-5" /> },
          ] as Array<{ view: ViewMode; label: string; icon: React.ReactNode; disabled?: boolean }>).map((item) => {
            const active = currentView === item.view;
            return (
              <Button
                key={item.view}
                variant={active ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setCurrentView(item.view)}
                disabled={item.disabled}
                className={`flex-col h-14 min-w-[64px] flex-1 gap-0.5 rounded-xl transition-all duration-200 ${
                  active
                    ? 'bg-primary/10 text-primary shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                } ${item.disabled ? 'opacity-60' : ''}`}
                aria-label={item.label}
                aria-current={active ? 'page' : undefined}
              >
                <span className={`transition-transform duration-200 ${active ? 'scale-110' : ''}`}>{item.icon}</span>
                <span className="text-[10px] font-medium leading-none">{item.label}</span>
                {active && (
                  <span className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" aria-hidden="true" />
                )}
              </Button>
            );
          })}
        </div>
      </nav>

      {/* Subtle top progress when data loads in background */}
      <TopProgressBar
        progress={loadProgress?.overallProgress ?? 0}
        visible={!showLoadingScreen && !dictionaryReady}
      />

      {/* Main Content */}
      <ErrorBoundary>
        <MotionConfig reducedMotion="user">
        <main id="main-content" className="max-w-7xl mx-auto px-4 py-6 pb-24 md:pb-6 overflow-x-hidden">
          <AnimatePresence>
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              {currentView === 'landing' ? (
                <LandingView totalWords={totalWords} onStartLearning={() => setCurrentView('dashboard')} onBrowseDictionary={() => setCurrentView('browse')} />
              ) : initError ? (
                <Card className="max-w-md mx-auto mt-12">
                  <CardContent className="p-8 text-center space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
                      <AlertTriangle className="w-8 h-8 text-destructive" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold mb-1">Failed to Load Data</h2>
                      <p className="text-sm text-muted-foreground">
                        Couldn't load the HSK dictionary. You may be offline or the data files are unavailable.
                      </p>
                    </div>
                    <Button onClick={handleRetryInit} className="w-full">
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Retry
                    </Button>
                  </CardContent>
                </Card>
              ) : !dictionaryReady ? (
                <SectionLoader label="Preparing your HSK data for this section..." />
              ) : (
                <>
                  {currentView === 'dashboard' && (
                    <DashboardView
                      showWelcomeBanner={showWelcomeBanner}
                      userStats={userStats}
                      dueCount={dueCount}
                      totalWords={totalWords}
                      favorites={favorites}
                      hskStats={hskStats}
                      dailyStats={dailyStats}
                      storyDataset={storyDataset}
                      bookDataset={bookDataset}
                      showPomodoro={showPomodoro}
                      onDismissWelcomeBanner={dismissWelcomeBanner}
                      onShowFeatureGuide={handleShowFeatureGuide}
                      onShowStudyDialog={handleShowStudyDialog}
                      onStartQuiz={handleStartQuiz}
                      onNavigateTo={handleNavigateTo}
                      onShowPomodoro={handleShowPomodoro}
                      onSetProgressTab={handleSetProgressTab}
                      onOpenDetailView={openDetailView}
                      onRefreshStats={refreshStats}
                      onSetShowPomodoro={handleSetShowPomodoro}
                    />
                  )}
                  {currentView === 'browse' && (
                    <BrowseView
                      searchQuery={searchQuery}
                      onSearchQueryChange={handleSearchQueryChange}
                      onSearchSubmit={handleSearchSubmit}
                      onClearSearch={handleClearSearch}
                      selectedLevel={selectedLevel}
                      onSelectedLevelChange={handleSelectedLevelChange}
                      selectedPOS={selectedPOS}
                      onSelectedPOSChange={handleSelectedPOSChange}
                      searchResults={searchResults}
                      favorites={favorites}
                      onToggleFavorite={toggleFavorite}
                      listViewMode={listViewMode}
                      onListViewModeChange={handleListViewModeChange}
                      browsePage={browsePage}
                      onBrowsePageChange={setBrowsePage}
                      deferredSearchQuery={deferredSearchQuery}
                      isPending={isPending}
                      searchHistory={searchHistory}
                      onSelectHistoryTerm={handleSelectHistoryTerm}
                      onClearHistory={handleClearHistory}
                      onOpenDetailView={openDetailView}
                    />
                  )}
                  {currentView === 'detail' && selectedEntry && (
                    <DetailView
                      selectedEntry={selectedEntry}
                      detailSequence={detailSequence}
                      detailReturnView={detailReturnView}
                      favorites={favorites}
                      onToggleFavorite={toggleFavorite}
                      onSetSelectedEntry={handleSetSelectedEntry}
                      onSetDetailSequence={handleSetDetailSequence}
                      onSetCurrentView={handleNavigateTo}
                    />
                  )}
                  {currentView === 'study' && (
                    <StudyView
                      studyEntries={studyEntries}
                      currentStudyIndex={currentStudyIndex}
                      showAnswer={showAnswer}
                      showQuiz={showQuiz}
                      showStudyComplete={showStudyComplete}
                      studyAutoPlay={studyAutoPlay}
                      quizEntries={quizEntries}
                      onSetShowAnswer={handleSetShowAnswer}
                      onSetStudyAutoPlay={handleSetStudyAutoPlay}
                      onHandleStudyResult={handleStudyResult}
                      onSetShowQuiz={handleSetShowQuiz}
                      onSetShowStudyComplete={handleSetShowStudyComplete}
                      onSetCurrentView={handleNavigateTo}
                      onStartStudySession={startStudySession}
                      onRefreshStats={refreshStats}
                    />
                  )}
                  {currentView === 'progress' && (
                    <ProgressView
                      progressTab={progressTab}
                      onSetProgressTab={handleSetProgressTab}
                      userStats={userStats}
                      dueCount={dueCount}
                      hskStats={hskStats}
                      entries={entries}
                      favorites={favorites}
                      exportData={exportData}
                      onHandleExport={handleExport}
                      onShowImportDialog={handleShowImportDialog}
                      onRefreshStats={refreshStats}
                      onSetFavorites={handleSetFavorites}
                      onOpenDetailView={openDetailView}
                    />
                  )}
                  {currentView === 'audio' && (
                    <AudioPlaylist
                      onWordClick={(hanzi: string) => {
                        const entry = unifiedDictionary.getEntryByHanzi(hanzi);
                        if (entry) {
                          openDetailView(entry, { sequence: [entry], returnView: 'audio' });
                        }
                      }}
                    />
                  )}
                  {currentView === 'stories' && (
                    <StoriesView
                      storyDataset={storyDataset}
                      storyView={storyView}
                      currentStoryIndex={currentStoryIndex}
                      onSetStoryView={handleSetStoryView}
                      onSetCurrentStoryIndex={handleSetCurrentStoryIndex}
                      onOpenDetailView={openDetailView}
                    />
                  )}
                  {currentView === 'books' && (
                    <BooksView
                      bookDataset={bookDataset}
                      bookView={bookView}
                      currentBookIndex={currentBookIndex}
                      onSetBookView={handleSetBookView}
                      onSetCurrentBookIndex={handleSetCurrentBookIndex}
                      onOpenDetailView={openDetailView}
                    />
                  )}
                  {currentView === 'professional' && (
                    <ProfessionalView />
                  )}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
        </MotionConfig>
      </ErrorBoundary>

      {/* Study Session Dialog */}
      <Dialog open={showStudyDialog} onOpenChange={setShowStudyDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              Start Study Session
            </DialogTitle>
            <DialogDescription>
              {dueCount > 0
                ? `${dueCount} cards due for review`
                : "You're all caught up! Ready to learn new words?"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Session Size</Label>
              <div className="flex gap-2">
                {[10, 20, 50].map((size) => (
                  <button
                    key={size}
                    onClick={() => setStudySessionSize(size)}
                    className={`flex-1 rounded-lg border p-2.5 text-center text-sm font-medium transition-all ${
                      studySessionSize === size
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border/50 hover:border-primary/30 hover:bg-muted/50'
                    }`}
                  >
                    {size} cards
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Auto-Play Audio</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant={studyAutoPlay ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1 gap-1"
                  onClick={() => {
                    setStudyAutoPlay(true);
                    try { localStorage.setItem('openhsk.study-autoplay.v1', 'true'); } catch { /* ignore */ }
                  }}
                >
                  <Headphones className="w-3.5 h-3.5" />
                  On
                </Button>
                <Button
                  variant={!studyAutoPlay ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1 gap-1"
                  onClick={() => {
                    setStudyAutoPlay(false);
                    try { localStorage.setItem('openhsk.study-autoplay.v1', 'false'); } catch { /* ignore */ }
                  }}
                >
                  Off
                </Button>
              </div>
            </div>
            <Button
              className="w-full"
              onClick={() => {
                setShowStudyDialog(false);
                startStudySession(studySessionSize);
              }}
            >
              <Play className="w-4 h-4 mr-2" />
              Start Session
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Data</DialogTitle>
            <DialogDescription>Paste your exported JSON data below</DialogDescription>
          </DialogHeader>
          <Textarea
            value={importData}
            onChange={(e) => setImportData(e.target.value)}
            placeholder="Paste JSON data here..."
            className="font-mono text-sm h-48"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleImport}>Import</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Toaster theme={darkMode ? 'dark' : 'light'} position="bottom-right" richColors />
    </div>
  );
}

export default App;
