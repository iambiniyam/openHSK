import { Suspense, lazy, useState, useEffect, useCallback, useMemo, useDeferredValue, useRef, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, 
  BarChart3, 
  Search, 
  Brain,
  Settings,
  Sun,
  Moon,
  Flame,
  Trophy,
  Target,
  Volume2,
  Mic,
  ChevronRight,
  RotateCcw,
  CheckCircle2,
  XCircle,
  GraduationCap,
  Heart,
  Timer,
  Gamepad2,
  Download,
  Upload,
  Filter,
  X,
  LayoutGrid,
  List,
  GitBranch,
  Sparkles,
  ScrollText,
  Library,
  AlertTriangle,
  History,
  Trash2,
  Headphones,
  Layers,
  Play,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { unifiedDictionary, type UnifiedEntry } from '@/services/unifiedDictionaryService';
import { hskDataService } from '@/services/hskDataService';
import { ttsService, type TtsProvider } from '@/services/ttsService';
import { scheduleRuntimeWarmup } from '@/lib/runtimeWarmup';
import { fetchWithCacheFallback } from '@/lib/offlineFetch';
import type { UserStats } from '@/types/hsk';
import type { StoryEntry, StoryDataset } from '@/types/stories';
import type { Book, BookDataset } from '@/types/books';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { LoadingScreen } from '@/components/LoadingScreen';
import { TopProgressBar } from '@/components/TopProgressBar';
import { KeyboardShortcutsHelp } from '@/components/KeyboardShortcutsHelp';
import { OfflineBanner } from '@/components/OfflineBanner';
import { PwaInstallPrompt } from '@/components/PwaInstallPrompt';
import type { ProgressUpdate } from '@/lib/progressiveLoader';

import './App.css';

export type ViewMode = 'landing' | 'dashboard' | 'browse' | 'detail' | 'study' | 'progress' | 'audio' | 'stories' | 'books';
type ListViewMode = 'paginated' | 'virtualized';
export type ProgressTab = 'stats' | 'favorites' | 'grammar' | 'data';

const APP_SESSION_STORAGE_KEY = 'openhsk.ui-session.v1';
const MAX_PERSISTED_DETAIL_SEQUENCE = 180;
const MAX_PERSISTED_STUDY_ENTRIES = 30;
const MAX_DETAIL_NAV_SEQUENCE = 240;

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
    ['landing', 'dashboard', 'browse', 'detail', 'study', 'progress', 'audio', 'stories', 'books'].includes(value)
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

const buildDetailSequenceWindow = (sequence: UnifiedEntry[], selectedId: string): UnifiedEntry[] => {
  if (sequence.length <= MAX_DETAIL_NAV_SEQUENCE) {
    return sequence;
  }

  const selectedIndex = sequence.findIndex((entry) => entry.id === selectedId);
  if (selectedIndex === -1) {
    return sequence.slice(0, MAX_DETAIL_NAV_SEQUENCE);
  }

  const halfWindow = Math.floor(MAX_DETAIL_NAV_SEQUENCE / 2);
  const start = Math.max(0, selectedIndex - halfWindow);
  const end = Math.min(sequence.length, start + MAX_DETAIL_NAV_SEQUENCE);
  const normalizedStart = Math.max(0, end - MAX_DETAIL_NAV_SEQUENCE);

  return sequence.slice(normalizedStart, end);
};

const LandingPage = lazy(() => import('@/components/LandingPage'));
const AudioPlaylist = lazy(() => import('@/components/AudioPlaylist').then((m) => ({ default: m.AudioPlaylist })));
const StoryBrowser = lazy(() => import('@/components/StoryBrowser'));
const StoryViewer = lazy(() => import('@/components/StoryViewer'));
const BookBrowser = lazy(() => import('@/components/BookBrowser'));
const BookReader = lazy(() => import('@/components/BookReader'));
const VirtualizedWordList = lazy(() => import('@/components/VirtualizedWordList'));
const PaginatedWordList = lazy(() => import('@/components/PaginatedWordList'));
const WordDetail = lazy(() => import('@/components/WordDetail'));
const PomodoroTimer = lazy(() => import('@/components/PomodoroTimer'));
const QuizMode = lazy(() => import('@/components/QuizMode'));
const FavoritesList = lazy(() => import('@/components/FavoritesList'));
const DailyGoals = lazy(() => import('@/components/DailyGoals'));
const CharacterOfTheDay = lazy(() => import('@/components/CharacterOfTheDay'));
const GrammarMap = lazy(() => import('@/components/GrammarMap'));

const SectionLoader = ({ label }: { label: string }) => (
  <Card>
    <CardContent className="p-6 sm:p-8 text-center">
      <div className="flex items-center justify-center gap-3 text-muted-foreground">
        <motion.div
          className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
        <span className="text-sm sm:text-base">{label}</span>
      </div>
    </CardContent>
  </Card>
);

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
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (!hash) return;
    const [view, ...params] = hash.split('/');
    if (isViewMode(view)) {
      setCurrentView(view);
      // Restore detail view state
      if (view === 'detail' && params[0] && dictionaryReady) {
        const entry = unifiedDictionary.getAllEntries().find(e => e.id === params[0] || e.hanzi === decodeURIComponent(params[0]));
        if (entry) {
          setSelectedEntry(entry);
          setDetailSequence([entry]);
          setDetailReturnView('browse');
        }
      }
      // Restore story reader state
      if (view === 'stories' && params[0] === 'reader' && params[1] && storyDataset) {
        const idx = parseInt(params[1], 10);
        if (!isNaN(idx) && storyDataset.stories[idx]) {
          setCurrentStoryIndex(idx);
          setStoryView('reader');
        }
      }
      // Restore book reader state
      if (view === 'books' && params[0] === 'reader' && params[1] && bookDataset) {
        const idx = parseInt(params[1], 10);
        if (!isNaN(idx) && bookDataset.books[idx]) {
          setCurrentBookIndex(idx);
          setBookView('reader');
        }
      }
    }
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

    if (currentView !== 'detail' && currentView !== 'study') {
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
      setCurrentView('dashboard');
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
      alert('Data imported successfully!');
    } else {
      alert('Failed to import data. Please check the format.');
    }
  }, [importData, refreshStats]);

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

  // Dashboard View
  const renderDashboard = () => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Welcome Banner */}
      <AnimatePresence>
        {showWelcomeBanner && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-primary/10 shrink-0">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm sm:text-base mb-1">
                      Welcome to OpenHSK!
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-3">
                      Here's everything you can do to accelerate your Chinese learning.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          dismissWelcomeBanner();
                          window.dispatchEvent(new CustomEvent('openhsk:show-feature-guide'));
                        }}
                      >
                        <BookOpen className="w-3.5 h-3.5 mr-1.5" />
                        Explore Features
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          dismissWelcomeBanner();
                          setShowStudyDialog(true);
                        }}
                      >
                        <Brain className="w-3.5 h-3.5 mr-1.5" />
                        Start Studying
                      </Button>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 -mr-1 -mt-1"
                    onClick={dismissWelcomeBanner}
                    aria-label="Dismiss welcome banner"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            icon: Flame,
            label: 'Day Streak',
            value: userStats?.currentStreak || 0,
            toneClass: 'bg-orange-100 dark:bg-orange-900',
            iconClass: 'text-orange-600 dark:text-orange-400',
          },
          {
            icon: Trophy,
            label: 'Words Learned',
            value: userStats?.totalStudied || 0,
            toneClass: 'bg-blue-100 dark:bg-blue-900',
            iconClass: 'text-blue-600 dark:text-blue-400',
          },
          {
            icon: Target,
            label: 'Due for Review',
            value: dueCount,
            toneClass: 'bg-green-100 dark:bg-green-900',
            iconClass: 'text-green-600 dark:text-green-400',
            onClick: () => setShowStudyDialog(true),
          },
          {
            icon: Heart,
            label: 'Favorites',
            value: favorites.length,
            toneClass: 'bg-red-100 dark:bg-red-900',
            iconClass: 'text-red-600 dark:text-red-400',
          },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card
              className={`hover:shadow-lg transition-all duration-200 ${stat.onClick ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]' : ''}`}
              onClick={stat.onClick}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-3 rounded-xl ${stat.toneClass}`}>
                  <stat.icon className={`w-6 h-6 ${stat.iconClass}`} />
                </div>
                <div>
                  <div className="text-3xl font-bold">{stat.value}</div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Character of the Day */}
      <Suspense fallback={<SectionLoader label="Loading your daily character..." />}>
        <CharacterOfTheDay 
          onViewDetails={(entry) => openDetailView(entry, { sequence: [entry], returnView: 'dashboard' })}
        />
      </Suspense>

      {/* Daily Goals */}
      <Suspense fallback={<SectionLoader label="Preparing daily goals..." />}>
        <DailyGoals stats={dailyStats} onUpdateGoals={refreshStats} />
      </Suspense>

      {/* Quick Actions */}
      <TooltipProvider delayDuration={400}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { 
              icon: Brain, 
              title: 'Study Session', 
              desc: dueCount > 0 ? `${dueCount} due for review` : 'Learn new words',
              tooltip: 'Review due words or learn new ones with spaced repetition (SRS)',
              toneClass: 'bg-primary/10',
              iconClass: 'text-primary',
              onClick: () => setShowStudyDialog(true)
            },
            { 
              icon: Gamepad2, 
              title: 'Quiz Mode', 
              desc: 'Test your knowledge',
              tooltip: 'Multiple-choice questions with 4 types and keyboard shortcuts',
              toneClass: 'bg-green-100 dark:bg-green-900',
              iconClass: 'text-green-600 dark:text-green-400',
              onClick: () => { setShowQuiz(true); setCurrentView('study'); }
            },
            { 
              icon: BookOpen, 
              title: 'Browse Dictionary', 
              desc: `${totalWords.toLocaleString()} words`,
              tooltip: 'Search and explore the full HSK dictionary with enrichments',
              toneClass: 'bg-slate-100 dark:bg-slate-800',
              iconClass: 'text-slate-700 dark:text-slate-200',
              onClick: () => setCurrentView('browse')
            },
            { 
              icon: Timer, 
              title: 'Focus Timer', 
              desc: 'Pomodoro session',
              tooltip: 'Stay focused with timed study sessions (25/5/15 min)',
              toneClass: 'bg-blue-100 dark:bg-blue-900',
              iconClass: 'text-blue-600 dark:text-blue-400',
              onClick: () => setShowPomodoro(true)
            },
            {
              icon: GitBranch,
              title: 'Grammar Map',
              desc: 'Track prerequisites',
              tooltip: 'Interactive grammar dependency graph across HSK levels',
              toneClass: 'bg-violet-100 dark:bg-violet-900',
              iconClass: 'text-violet-700 dark:text-violet-300',
              onClick: () => {
                setProgressTab('grammar');
                setCurrentView('progress');
              },
            },
            {
              icon: Volume2,
              title: 'Audio Playlist',
              desc: 'Passive listening',
              tooltip: 'Listen to HSK vocabulary with text-to-speech',
              toneClass: 'bg-amber-100 dark:bg-amber-900',
              iconClass: 'text-amber-600 dark:text-amber-400',
              onClick: () => setCurrentView('audio'),
            },
            {
              icon: BarChart3,
              title: 'Progress',
              desc: 'Stats & favorites',
              tooltip: 'Track streaks, review schedules, favorites, and export data',
              toneClass: 'bg-rose-100 dark:bg-rose-900',
              iconClass: 'text-rose-600 dark:text-rose-400',
              onClick: () => setCurrentView('progress'),
            },
            ...(storyDataset ? [{
              icon: ScrollText,
              title: 'Stories',
              desc: `${storyDataset.meta.total_stories} stories`,
              tooltip: 'Read AI-generated short stories at your HSK level',
              toneClass: 'bg-cyan-100 dark:bg-cyan-900',
              iconClass: 'text-cyan-600 dark:text-cyan-400',
              onClick: () => setCurrentView('stories'),
            }] : []),
            ...(bookDataset ? [{
              icon: BookOpen,
              title: 'Books',
              desc: `${bookDataset.meta.total_books} books`,
              tooltip: 'Read continuous genre-based stories with chapters',
              toneClass: 'bg-teal-100 dark:bg-teal-900',
              iconClass: 'text-teal-600 dark:text-teal-400',
              onClick: () => setCurrentView('books'),
            }] : []),
          ].map((action, i) => (
            <motion.div
              key={action.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.08 }}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <Card 
                    className="cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group"
                    onClick={action.onClick}
                  >
                    <CardContent className="p-6 flex items-center gap-4">
                      <div className={`p-4 rounded-2xl group-hover:scale-110 transition-transform ${action.toneClass}`}>
                        <action.icon className={`w-8 h-8 ${action.iconClass}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold break-words">{action.title}</h3>
                        <p className="text-sm text-muted-foreground break-words">{action.desc}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform shrink-0" />
                    </CardContent>
                  </Card>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[240px] text-center">
                  <p>{action.tooltip}</p>
                </TooltipContent>
              </Tooltip>
            </motion.div>
          ))}
        </div>
      </TooltipProvider>

      {/* HSK Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5" />
            HSK Level Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {hskStats.filter(s => s.level !== 0).map(({ level, count, label }) => {
              const progressKey = String(level);
              const progress = userStats?.levelProgress[progressKey];
              const studied = progress?.studied || 0;
              const percentage = count > 0 ? (studied / count) * 100 : 0;
              
              return (
                <div key={level} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium flex items-center gap-2">
                      <Badge variant="outline" className={`hsk-badge-${level === '7-9' ? '7' : level}`}>
                        {label}
                      </Badge>
                    </span>
                    <span className="text-muted-foreground">
                      {studied} / {count} ({Math.round(percentage)}%)
                    </span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Pomodoro Dialog */}
      <Dialog open={showPomodoro} onOpenChange={setShowPomodoro}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Timer className="w-5 h-5" />
              Focus Timer
            </DialogTitle>
          </DialogHeader>
          <Suspense fallback={<SectionLoader label="Loading focus timer..." />}>
            <PomodoroTimer 
              onSessionComplete={(mode, duration) => {
                if (mode === 'focus') {
                  hskDataService.incrementStudyTime(Math.round(duration / 60));
                  refreshStats();
                }
              }}
            />
          </Suspense>
        </DialogContent>
      </Dialog>
    </motion.div>
  );

  // Landing View
  const renderLanding = () => (
    <Suspense fallback={<SectionLoader label="Preparing your learning space..." />}>
      <LandingPage
        totalWords={totalWords}
        onStartLearning={() => setCurrentView('dashboard')}
        onBrowseDictionary={() => setCurrentView('browse')}
      />
    </Suspense>
  );

  // Browse View
  const renderBrowse = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-3 sm:space-y-4"
    >
      {/* Search Bar */}
      <Card className="sticky top-0 z-10 shadow-md">
        <CardContent className="p-3 sm:p-4 space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
              <Input
                placeholder="Search character, pinyin, meaning..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setBrowsePage(1);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    const trimmed = searchQuery.trim();
                    setSearchHistory((prev) => {
                      const next = [trimmed, ...prev.filter((s) => s !== trimmed)].slice(0, 20);
                      try {
                        localStorage.setItem('openhsk.search-history.v1', JSON.stringify(next));
                      } catch { /* ignore */ }
                      return next;
                    });
                  }
                }}
                className="pl-9 sm:pl-10 h-10 sm:h-12 text-base sm:text-lg"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 h-7 w-7 sm:h-8 sm:w-8"
                  onClick={() => {
                    setSearchQuery('');
                    setBrowsePage(1);
                  }}
                >
                  <X className="w-3 h-3 sm:w-4 sm:h-4" />
                </Button>
              )}
            </div>

            {/* Search History */}
            {searchHistory.length > 0 && !searchQuery && (
              <div className="flex items-center gap-2 flex-wrap">
                <History className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                {searchHistory.slice(0, 8).map((term) => (
                  <button
                    key={term}
                    onClick={() => {
                      setSearchQuery(term);
                      setBrowsePage(1);
                    }}
                    className="text-xs px-2 py-1 rounded-full bg-muted hover:bg-muted/80 transition-colors text-muted-foreground"
                  >
                    {term}
                  </button>
                ))}
                <button
                  onClick={() => {
                    setSearchHistory([]);
                    try { localStorage.removeItem('openhsk.search-history.v1'); } catch { /* ignore */ }
                  }}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors ml-auto"
                  title="Clear history"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            )}
            
            {/* Filters */}
            <div className="flex gap-2">
              <Select 
                value={selectedLevel.toString()} 
                onValueChange={(v) => {
                  if (v === 'all') setSelectedLevel('all');
                  else if (v === '7-9') setSelectedLevel('7-9');
                  else setSelectedLevel(parseInt(v));
                  setBrowsePage(1);
                }}
              >
                <SelectTrigger className="w-[100px] sm:w-[120px] h-10 sm:h-12">
                  <Filter className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  <SelectValue placeholder="Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {[1, 2, 3, 4, 5, 6].map(l => (
                    <SelectItem key={l} value={l.toString()}>HSK {l}</SelectItem>
                  ))}
                  <SelectItem value="7-9">HSK 7-9</SelectItem>
                </SelectContent>
              </Select>
              
              <Select
                value={selectedPOS}
                onValueChange={(value) => {
                  setSelectedPOS(value);
                  setBrowsePage(1);
                }}
              >
                <SelectTrigger className="w-[110px] sm:w-[140px] h-10 sm:h-12">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="noun">Noun</SelectItem>
                  <SelectItem value="verb">Verb</SelectItem>
                  <SelectItem value="adjective">Adj</SelectItem>
                  <SelectItem value="adverb">Adv</SelectItem>
                  <SelectItem value="pronoun">Pronoun</SelectItem>
                  <SelectItem value="measure word">Measure</SelectItem>
                  <SelectItem value="particle">Particle</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* View Mode Toggle & Stats */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
              {isPending || searchQuery !== deferredSearchQuery ? (
                <span className="flex items-center gap-2">
                  <motion.div 
                    className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  />
                  Searching...
                </span>
              ) : `${searchResults.length.toLocaleString()} words found`}
            </div>
            
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={listViewMode === 'paginated' ? 'secondary' : 'ghost'}
                      size="icon"
                      className="h-7 w-7 sm:h-8 sm:w-8"
                      onClick={() => setListViewMode('paginated')}
                    >
                      <LayoutGrid className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Grid View (Paginated)</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={listViewMode === 'virtualized' ? 'secondary' : 'ghost'}
                      size="icon"
                      className="h-7 w-7 sm:h-8 sm:w-8"
                      onClick={() => setListViewMode('virtualized')}
                    >
                      <List className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>List View (Virtualized)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results - Paginated or Virtualized */}
      <Suspense fallback={<SectionLoader label="Rendering word list..." />}>
        {listViewMode === 'paginated' ? (
          <PaginatedWordList
            entries={searchResults}
            favoriteIds={favorites}
            onEntryClick={(entry) => openDetailView(entry, { sequence: searchResults, returnView: 'browse' })}
            onToggleFavorite={toggleFavorite}
            itemsPerPage={48}
            currentPage={browsePage}
            onPageChange={setBrowsePage}
          />
        ) : (
          <VirtualizedWordList
            entries={searchResults}
            favoriteIds={favorites}
            onEntryClick={(entry) => openDetailView(entry, { sequence: searchResults, returnView: 'browse' })}
            onToggleFavorite={toggleFavorite}
          />
        )}
      </Suspense>
    </motion.div>
  );

  // Detail View
  const renderDetail = () => {
    if (!selectedEntry) return null;

    const sequence = detailSequence.length > 0 ? detailSequence : [selectedEntry];
    const currentIndex = sequence.findIndex((item) => item.id === selectedEntry.id);
    const canGoPrevious = currentIndex > 0;
    const canGoNext = currentIndex >= 0 && currentIndex < sequence.length - 1;

    const backLabel =
      detailReturnView === 'dashboard'
        ? 'Dashboard'
        : detailReturnView === 'progress'
          ? 'Progress'
          : detailReturnView === 'study'
              ? 'Study'
              : detailReturnView === 'landing'
                ? 'Home'
                : 'Browse';

    const navigateDetailByOffset = (offset: -1 | 1) => {
      const next = sequence[currentIndex + offset];
      if (!next) return;
      setSelectedEntry(next);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-4"
      >
        <Button 
          variant="ghost" 
          onClick={() => setCurrentView(detailReturnView)}
          className="mb-2"
        >
          ← Back to {backLabel}
        </Button>
        
        <Suspense fallback={<SectionLoader label="Loading word details..." />}>
          <WordDetail
            key={selectedEntry.id}
            entry={selectedEntry}
            isFavorite={favorites.includes(selectedEntry.id)}
            onToggleFavorite={() => toggleFavorite(selectedEntry.id)}
            onRelatedWordClick={(entry) => {
              setSelectedEntry(entry);
              setDetailSequence((previous) => {
                if (previous.some((item) => item.id === entry.id)) {
                  return previous;
                }

                return buildDetailSequenceWindow([...previous, entry], entry.id);
              });
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            canGoPrevious={canGoPrevious}
            canGoNext={canGoNext}
            onGoPrevious={() => navigateDetailByOffset(-1)}
            onGoNext={() => navigateDetailByOffset(1)}
            navigationLabel={currentIndex >= 0 && sequence.length > 1 ? `${currentIndex + 1} / ${sequence.length}` : undefined}
          />
        </Suspense>
      </motion.div>
    );
  };

  // Study View
  const renderStudy = () => {
    if (showQuiz) {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => {
              setShowQuiz(false);
              setCurrentView('dashboard');
            }}>
              ← Exit Quiz
            </Button>
          </div>
          <Suspense fallback={<SectionLoader label="Preparing quiz mode..." />}>
            <QuizMode
              entries={(() => {
                const rec = hskDataService.getRecommendedEntries(100);
                return rec
                  .map((hsk) => unifiedDictionary.getEntry(hsk.entry_id))
                  .filter((e): e is UnifiedEntry => Boolean(e));
              })()}
              onComplete={() => {
                hskDataService.incrementQuizzes();
                refreshStats();
                setTimeout(() => {
                  setShowQuiz(false);
                  setCurrentView('dashboard');
                }, 2000);
              }}
              onExit={() => {
                setShowQuiz(false);
                setCurrentView('dashboard');
              }}
            />
          </Suspense>
        </div>
      );
    }

    const currentEntry = studyEntries[currentStudyIndex];
    if (!currentEntry) return null;

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => setCurrentView('dashboard')}>
            ← Exit Session
          </Button>
          <div className="text-sm text-muted-foreground">
            {currentStudyIndex + 1} / {studyEntries.length}
          </div>
        </div>

        <Progress value={(currentStudyIndex / studyEntries.length) * 100} className="h-2" />

        <Card className="p-8">
          <div className="text-center space-y-6">
            <div className="space-y-2">
              <div className="text-5xl sm:text-7xl font-bold">{currentEntry.hanzi}</div>
              <div className="text-2xl text-muted-foreground">{currentEntry.pinyin}</div>
            </div>
            
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" onClick={() => ttsService.speak(currentEntry.hanzi)}>
                <Volume2 className="w-4 h-4 mr-2" />
                Listen
              </Button>
              <Button
                variant={studyAutoPlay ? 'secondary' : 'ghost'}
                size="sm"
                className="gap-1 text-xs"
                onClick={() => {
                  setStudyAutoPlay(prev => {
                    const next = !prev;
                    try { localStorage.setItem('openhsk.study-autoplay.v1', String(next)); } catch { /* ignore */ }
                    return next;
                  });
                }}
              >
                <Headphones className="w-3.5 h-3.5" />
                Auto
              </Button>
            </div>

            <AnimatePresence>
              {showAnswer && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 pt-4 border-t"
                >
                  <div>
                    <div className="font-medium text-lg mb-2">Meanings:</div>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {currentEntry.definitions.map((def, i) => (
                        <Badge key={i} variant="secondary" className="text-base whitespace-normal break-words max-w-full">{def}</Badge>
                      ))}
                    </div>
                  </div>
                  
                  {currentEntry.examples.length > 0 && (
                    <div className="bg-muted p-4 rounded-lg">
                      <div className="font-medium mb-1">Example:</div>
                      <div className="text-lg break-words">{currentEntry.examples[0].chinese}</div>
                      <div className="text-sm text-muted-foreground break-words">{currentEntry.examples[0].pinyin}</div>
                      <div className="text-sm text-muted-foreground break-words">{currentEntry.examples[0].english}</div>
                    </div>
                  )}

                  {/* Character Breakdown */}
                  {currentEntry.characterBreakdown && currentEntry.characterBreakdown.length > 1 && (
                    <div className="bg-primary/[0.03] border border-primary/10 p-4 rounded-lg">
                      <div className="font-medium text-sm mb-2 flex items-center gap-1.5 text-primary/80">
                        <Layers className="w-3.5 h-3.5" />
                        Character Breakdown
                      </div>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {currentEntry.characterBreakdown.map((char) => (
                          <div key={char.char} className="flex flex-col items-center gap-1 px-3 py-2 bg-background rounded-lg border border-border/50 min-w-[60px]">
                            <span className="text-xl font-bold">{char.char}</span>
                            <span className="text-xs text-muted-foreground">{char.pinyin}</span>
                            {char.definition && (
                              <span className="text-[10px] text-muted-foreground text-center leading-tight max-w-[80px]">{char.definition}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 justify-center pt-4">
                    <Button variant="destructive" onClick={() => handleStudyResult(1)} className="flex-1 min-w-[100px]">
                      <XCircle className="w-4 h-4 mr-1.5" />
                      Again <span className="ml-1 opacity-70 text-xs">(1)</span>
                    </Button>
                    <Button variant="outline" onClick={() => handleStudyResult(2)} className="flex-1 min-w-[100px] border-amber-500/50 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10">
                      Hard <span className="ml-1 opacity-70 text-xs">(2)</span>
                    </Button>
                    <Button variant="default" onClick={() => handleStudyResult(3)} className="flex-1 min-w-[100px]">
                      <CheckCircle2 className="w-4 h-4 mr-1.5" />
                      Good <span className="ml-1 opacity-70 text-xs">(3)</span>
                    </Button>
                    <Button variant="secondary" onClick={() => handleStudyResult(4)} className="flex-1 min-w-[100px] bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-300 dark:hover:bg-green-900/60">
                      Easy <span className="ml-1 opacity-70 text-xs">(4)</span>
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {!showAnswer && (
              <Button className="w-full" size="lg" onClick={() => setShowAnswer(true)}>
                Show Answer <span className="ml-2 opacity-60 text-sm">(Space)</span>
              </Button>
            )}
          </div>
        </Card>
      </div>
    );
  };

  // Progress View
  const renderProgress = () => (
    <Tabs value={progressTab} onValueChange={(value) => setProgressTab(value as ProgressTab)} className="space-y-4">
      <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
        <TabsTrigger value="stats">Statistics</TabsTrigger>
        <TabsTrigger value="favorites">Favorites</TabsTrigger>
        <TabsTrigger value="grammar">Grammar</TabsTrigger>
        <TabsTrigger value="data">Data</TabsTrigger>
      </TabsList>

      <TabsContent value="stats" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Study Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Words', value: userStats?.totalStudied || 0 },
                { label: 'Current Streak', value: userStats?.currentStreak || 0 },
                { label: 'Longest Streak', value: userStats?.longestStreak || 0 },
                { label: 'Due for Review', value: dueCount },
              ].map(stat => (
                <div key={stat.label} className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-3xl font-bold">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Level Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {hskStats.filter(s => s.level !== 0).map(({ level, count, label }) => {
                const progressKey = String(level);
                const progress = userStats?.levelProgress[progressKey];
                const studied = progress?.studied || 0;
                const percentage = count > 0 ? Math.round((studied / count) * 100) : 0;
                const levelColors: Record<number, string> = {
                  1: 'bg-green-500',
                  2: 'bg-emerald-500',
                  3: 'bg-blue-500',
                  4: 'bg-purple-500',
                  5: 'bg-orange-500',
                  6: 'bg-red-500',
                };
                const levelNum = level as number;
                
                return (
                  <div key={level} className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4 group">
                    <div className="sm:w-20 font-medium text-sm flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${levelColors[levelNum] || 'bg-gray-400'}`} />
                      {label}
                    </div>
                    <div className="flex items-center gap-3 flex-1">
                      <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${levelColors[levelNum] || 'bg-gray-400'}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                        />
                      </div>
                      <div className="text-right text-sm tabular-nums shrink-0 min-w-[4rem]">
                        <span className="font-medium">{percentage}%</span>
                        <span className="text-muted-foreground text-xs ml-1">({studied}/{count})</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="favorites">
        <Suspense fallback={<SectionLoader label="Loading favorites..." />}>
          <FavoritesList
            entries={entries}
            favoriteIds={favorites}
            onRemoveFavorite={(id) => {
              hskDataService.removeFromFavorites(id);
              setFavorites(hskDataService.getFavorites());
            }}
            onEntryClick={(entry) => {
              const favoriteEntries = entries.filter((item) => favorites.includes(item.id));
              openDetailView(entry, { sequence: favoriteEntries, returnView: 'progress' });
            }}
            onClearAll={() => {
              hskDataService.clearFavorites();
              setFavorites([]);
            }}
          />
        </Suspense>
      </TabsContent>

      <TabsContent value="grammar">
        <Suspense fallback={<SectionLoader label="Loading grammar map..." />}>
          <GrammarMap userStats={userStats} />
        </Suspense>
      </TabsContent>

      <TabsContent value="data" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Export / Import Data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />
                Export Data
              </Button>
              <Button variant="outline" onClick={() => setShowImportDialog(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Import Data
              </Button>
            </div>

            {exportData && (
              <div className="space-y-2">
                <Label>Export JSON (copy and save):</Label>
                <Textarea value={exportData} readOnly className="font-mono text-xs h-32" />
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-center">
          <Button variant="destructive" onClick={() => {
            if (confirm('Are you sure you want to reset all progress? This cannot be undone.')) {
              hskDataService.resetProgress();
              refreshStats();
              setFavorites([]);
            }
          }}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset All Progress
          </Button>
        </div>
      </TabsContent>
    </Tabs>
  );

  // Stories View
  const renderStories = () => {
    if (!storyDataset) {
      return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <SectionLoader label="Loading story dataset..." />
        </motion.div>
      );
    }

    if (storyView === 'reader' && storyDataset) {
      const story = storyDataset.stories[currentStoryIndex];
      if (!story) return null;

      const handleWordClick = (hanzi: string) => {
        const entry = unifiedDictionary.getEntryByHanzi(hanzi);
        if (entry) {
          openDetailView(entry, { sequence: [entry], returnView: 'stories' });
        }
      };

      return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => setStoryView('browse')}>
              ← Back to Stories
            </Button>
          </div>
          <Suspense fallback={<SectionLoader label="Loading story..." />}>
            <StoryViewer
              story={story}
              hasPrevious={currentStoryIndex > 0}
              hasNext={currentStoryIndex < storyDataset.stories.length - 1}
              storyIndex={currentStoryIndex}
              totalStories={storyDataset.stories.length}
              onWordClick={handleWordClick}
              onPrevious={() => setCurrentStoryIndex((i) => Math.max(0, i - 1))}
              onNext={() =>
                setCurrentStoryIndex((i) =>
                  Math.min(storyDataset.stories.length - 1, i + 1)
                )
              }
            />
          </Suspense>
        </motion.div>
      );
    }

    const handleStorySelect = (_story: StoryEntry, index: number) => {
      setCurrentStoryIndex(index);
      setStoryView('reader');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Suspense fallback={<SectionLoader label="Loading story browser..." />}>
          <StoryBrowser
            stories={storyDataset.stories}
            meta={storyDataset.meta}
            onStorySelect={handleStorySelect}
          />
        </Suspense>
      </motion.div>
    );
  };

  // Books View
  const renderBooks = () => {
    if (!bookDataset) {
      return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <SectionLoader label="Loading book dataset..." />
        </motion.div>
      );
    }

    if (bookView === 'reader' && bookDataset) {
      const book = bookDataset.books[currentBookIndex];
      if (!book) return null;

      const handleWordClick = (hanzi: string) => {
        const entry = unifiedDictionary.getEntryByHanzi(hanzi);
        if (entry) {
          openDetailView(entry, { sequence: [entry], returnView: 'books' });
        }
      };

      return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => setBookView('browse')}>
              ← Back to Books
            </Button>
          </div>
          <Suspense fallback={<SectionLoader label="Loading book..." />}>
            <BookReader
              book={book}
              hasPrevious={currentBookIndex > 0}
              hasNext={currentBookIndex < bookDataset.books.length - 1}
              bookIndex={currentBookIndex}
              totalBooks={bookDataset.books.length}
              onWordClick={handleWordClick}
              onPrevious={() => setCurrentBookIndex((i) => Math.max(0, i - 1))}
              onNext={() =>
                setCurrentBookIndex((i) =>
                  Math.min(bookDataset.books.length - 1, i + 1)
                )
              }
            />
          </Suspense>
        </motion.div>
      );
    }

    const handleBookSelect = (_book: Book, index: number) => {
      setCurrentBookIndex(index);
      setBookView('reader');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Suspense fallback={<SectionLoader label="Loading book browser..." />}>
          <BookBrowser
            books={bookDataset.books}
            meta={bookDataset.meta}
            onBookSelect={handleBookSelect}
          />
        </Suspense>
      </motion.div>
    );
  };

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
            {storyDataset && (
              <Button
                variant={currentView === 'stories' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setCurrentView('stories')}
                className="gap-2"
              >
                <ScrollText className="w-4 h-4" />
                Stories
              </Button>
            )}
            {bookDataset && (
              <Button
                variant={currentView === 'books' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setCurrentView('books')}
                className="gap-2"
              >
                <Library className="w-4 h-4" />
                Books
              </Button>
            )}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setDarkMode(!darkMode)}>
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
                <Button variant="ghost" size="icon">
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
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={voiceQuality.score >= 80 ? 'default' : voiceQuality.score >= 50 ? 'secondary' : 'destructive'}
                            className="text-xs"
                          >
                            {voiceQuality.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
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
          {[
            { view: 'landing' as const, label: 'Start', icon: <img src="/brand/logo-mark.svg" alt="" aria-hidden="true" className="w-5 h-5" loading="eager" /> },
            { view: 'dashboard' as const, label: 'Home', icon: <img src="/brand/icons/dictionary-stack.svg" alt="" aria-hidden="true" className="w-5 h-5" loading="eager" /> },
            { view: 'browse' as const, label: 'Browse', icon: <img src="/brand/icons/search-hanzi.svg" alt="" aria-hidden="true" className="w-5 h-5" loading="eager" /> },
            { view: 'progress' as const, label: 'Progress', icon: <BarChart3 className="w-5 h-5" /> },
            { view: 'audio' as const, label: 'Audio', icon: <Volume2 className="w-5 h-5" /> },
            ...(storyDataset ? [{ view: 'stories' as const, label: 'Stories', icon: <ScrollText className="w-5 h-5" /> }] : []),
            ...(bookDataset ? [{ view: 'books' as const, label: 'Books', icon: <Library className="w-5 h-5" /> }] : []),
          ].map((item) => {
            const active = currentView === item.view;
            return (
              <Button
                key={item.view}
                variant={active ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setCurrentView(item.view)}
                className={`flex-col h-14 min-w-[64px] flex-1 gap-0.5 rounded-xl transition-all duration-200 ${
                  active
                    ? 'bg-primary/10 text-primary shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
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
                renderLanding()
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
                  {currentView === 'dashboard' && renderDashboard()}
                  {currentView === 'browse' && renderBrowse()}
                  {currentView === 'detail' && renderDetail()}
                  {currentView === 'study' && renderStudy()}
                  {currentView === 'progress' && renderProgress()}
                  {currentView === 'audio' && <AudioPlaylist />}
                  {currentView === 'stories' && renderStories()}
                  {currentView === 'books' && renderBooks()}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
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
    </div>
  );
}

export default App;
