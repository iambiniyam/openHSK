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
  List
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
import { ttsService } from '@/services/ttsService';
import { scheduleRuntimeWarmup } from '@/lib/runtimeWarmup';
import type { UserStats } from '@/types/hsk';

import './App.css';

type ViewMode = 'landing' | 'dashboard' | 'browse' | 'detail' | 'study' | 'progress';
type ListViewMode = 'paginated' | 'virtualized';

const LandingPage = lazy(() => import('@/components/LandingPage'));
const VirtualizedWordList = lazy(() => import('@/components/VirtualizedWordList'));
const PaginatedWordList = lazy(() => import('@/components/PaginatedWordList'));
const WordDetail = lazy(() => import('@/components/WordDetail'));
const PomodoroTimer = lazy(() => import('@/components/PomodoroTimer'));
const QuizMode = lazy(() => import('@/components/QuizMode'));
const FavoritesList = lazy(() => import('@/components/FavoritesList'));
const DailyGoals = lazy(() => import('@/components/DailyGoals'));
const CharacterOfTheDay = lazy(() => import('@/components/CharacterOfTheDay'));

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
  // State
  const [darkMode, setDarkMode] = useState(false);
  const [currentView, setCurrentView] = useState<ViewMode>('landing');
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<UnifiedEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<UnifiedEntry | null>(null);
  const [detailSequence, setDetailSequence] = useState<UnifiedEntry[]>([]);
  const [detailReturnView, setDetailReturnView] = useState<ViewMode>('browse');
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<number | 'all' | '7-9'>('all');
  const [selectedPOS, setSelectedPOS] = useState<string>('all');
  const [searchResults, setSearchResults] = useState<UnifiedEntry[]>([]);
  const [listViewMode, setListViewMode] = useState<ListViewMode>('paginated');
  const [isPending, startTransition] = useTransition();
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const searchCacheRef = useRef<Map<string, UnifiedEntry[]>>(new Map());
  
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
  const [ttsRate, setTtsRate] = useState(1);
  const [showPomodoro, setShowPomodoro] = useState(false);
  const [exportData, setExportData] = useState('');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importData, setImportData] = useState('');

  // Initialize
  useEffect(() => {
    const init = async () => {
      try {
        await Promise.all([unifiedDictionary.initialize(), hskDataService.loadData()]);
        
        const allEntries = unifiedDictionary.getAllEntries();
        setEntries(allEntries);
        setSearchResults(allEntries);
        searchCacheRef.current.clear();
        
        setUserStats(hskDataService.getUserStats());
        setDueCount(hskDataService.getDueReviews().length);
        setFavorites(hskDataService.getFavorites());
        setDailyStats(hskDataService.getDailyStats());
        
        setLoading(false);
      } catch (error) {
        console.error('Failed to initialize:', error);
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (loading) return;
    return scheduleRuntimeWarmup();
  }, [loading]);

  // Dark mode
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

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

  // Search with debounce - optimized for performance
  useEffect(() => {
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
  }, [deferredSearchQuery, selectedLevel, selectedPOS, startTransition]);

  // Stats
  const hskStats = useMemo(() => unifiedDictionary.getHSKStats(), []);
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
      setDetailSequence(options?.sequence && options.sequence.length > 0 ? options.sequence : [entry]);
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

  const startStudySession = useCallback(() => {
    const recommended = unifiedDictionary.getRandomEntries(20);
    setStudyEntries(recommended);
    setCurrentStudyIndex(0);
    setShowAnswer(false);
    setShowQuiz(false);
    setCurrentView('study');
  }, []);

  const handleStudyResult = useCallback((correct: boolean) => {
    const entry = studyEntries[currentStudyIndex];
    if (entry) {
      hskDataService.updateProgress(entry.id, correct);
    }
    
    if (currentStudyIndex < studyEntries.length - 1) {
      setCurrentStudyIndex(prev => prev + 1);
      setShowAnswer(false);
    } else {
      refreshStats();
      setCurrentView('dashboard');
    }
  }, [currentStudyIndex, studyEntries, refreshStats]);

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

  // Loading screen
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="mx-auto h-20 w-20 rounded-2xl border border-primary/20 bg-card/80 p-3 shadow-sm">
            <img src="/brand/logo-mark.svg" alt="OpenHSK logo" className="h-full w-full" loading="eager" />
          </div>
          <motion.div 
            className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full mx-auto"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
          <p className="text-muted-foreground text-lg">Loading dictionary...</p>
          <p className="text-sm text-muted-foreground">This may take a moment</p>
        </div>
      </div>
    );
  }

  // Dashboard View
  const renderDashboard = () => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
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
            <Card className="hover:shadow-lg transition-shadow">
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { 
            icon: Brain, 
            title: 'Study Session', 
            desc: dueCount > 0 ? `${dueCount} due for review` : 'Learn new words',
            toneClass: 'bg-primary/10',
            iconClass: 'text-primary',
            onClick: startStudySession
          },
          { 
            icon: Gamepad2, 
            title: 'Quiz Mode', 
            desc: 'Test your knowledge',
            toneClass: 'bg-green-100 dark:bg-green-900',
            iconClass: 'text-green-600 dark:text-green-400',
            onClick: () => { setShowQuiz(true); setCurrentView('study'); }
          },
          { 
            icon: BookOpen, 
            title: 'Browse Dictionary', 
            desc: `${totalWords.toLocaleString()} words`,
            toneClass: 'bg-slate-100 dark:bg-slate-800',
            iconClass: 'text-slate-700 dark:text-slate-200',
            onClick: () => setCurrentView('browse')
          },
          { 
            icon: Timer, 
            title: 'Focus Timer', 
            desc: 'Pomodoro session',
            toneClass: 'bg-blue-100 dark:bg-blue-900',
            iconClass: 'text-blue-600 dark:text-blue-400',
            onClick: () => setShowPomodoro(true)
          },
        ].map((action, i) => (
          <motion.div
            key={action.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.1 }}
          >
            <Card 
              className="cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group"
              onClick={action.onClick}
            >
              <CardContent className="p-6 flex items-center gap-4">
                <div className={`p-4 rounded-2xl group-hover:scale-110 transition-transform ${action.toneClass}`}>
                  <action.icon className={`w-8 h-8 ${action.iconClass}`} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold break-words">{action.title}</h3>
                  <p className="text-sm text-muted-foreground break-words">{action.desc}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

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
              const progress = userStats?.levelProgress[level as number];
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
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 sm:pl-10 h-10 sm:h-12 text-base sm:text-lg"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 h-7 w-7 sm:h-8 sm:w-8"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="w-3 h-3 sm:w-4 sm:h-4" />
                </Button>
              )}
            </div>
            
            {/* Filters */}
            <div className="flex gap-2">
              <Select 
                value={selectedLevel.toString()} 
                onValueChange={(v) => {
                  if (v === 'all') setSelectedLevel('all');
                  else if (v === '7-9') setSelectedLevel('7-9');
                  else setSelectedLevel(parseInt(v));
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
              
              <Select value={selectedPOS} onValueChange={setSelectedPOS}>
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
              </TooltipProvider>
              
              <TooltipProvider>
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
            key={`${deferredSearchQuery}|${selectedLevel}|${selectedPOS}`}
            entries={searchResults}
            favoriteIds={favorites}
            onEntryClick={(entry) => openDetailView(entry, { sequence: searchResults, returnView: 'browse' })}
            onToggleFavorite={toggleFavorite}
            itemsPerPage={48}
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

                return [...previous, entry];
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
              entries={entries.slice(0, 100)}
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
              <div className="text-7xl font-bold">{currentEntry.hanzi}</div>
              <div className="text-2xl text-muted-foreground">{currentEntry.pinyin}</div>
            </div>
            
            <Button variant="outline" size="sm" onClick={() => ttsService.speak(currentEntry.hanzi)}>
              <Volume2 className="w-4 h-4 mr-2" />
              Listen
            </Button>

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

                  <div className="flex gap-2 justify-center pt-4">
                    <Button variant="destructive" onClick={() => handleStudyResult(false)}>
                      <XCircle className="w-4 h-4 mr-2" />
                      Again
                    </Button>
                    <Button variant="default" onClick={() => handleStudyResult(true)}>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Got it
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {!showAnswer && (
              <Button className="w-full" size="lg" onClick={() => setShowAnswer(true)}>
                Show Answer
              </Button>
            )}
          </div>
        </Card>
      </div>
    );
  };

  // Progress View
  const renderProgress = () => (
    <Tabs defaultValue="stats" className="space-y-4">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="stats">Statistics</TabsTrigger>
        <TabsTrigger value="favorites">Favorites</TabsTrigger>
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
                const progress = userStats?.levelProgress[level as number];
                const studied = progress?.studied || 0;
                const percentage = count > 0 ? (studied / count) * 100 : 0;
                
                return (
                  <div key={level} className="flex items-center gap-4">
                    <div className="w-20 font-medium">{label}</div>
                    <Progress value={percentage} className="flex-1 h-3" />
                    <div className="w-24 text-right text-sm text-muted-foreground">
                      {studied} / {count}
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

  return (
    <div className="min-h-screen bg-background brand-atmosphere">
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
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setDarkMode(!darkMode)}>
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
            
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Settings className="w-5 h-5" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Settings</DialogTitle>
                  <DialogDescription>Customize your learning experience</DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  <div className="space-y-2">
                    <Label>Voice Speed</Label>
                    <div className="flex items-center gap-4">
                      <span className="text-sm">0.5x</span>
                      <Slider
                        value={[ttsRate]}
                        onValueChange={([v]) => setTtsRate(v)}
                        min={0.5}
                        max={2}
                        step={0.25}
                        className="flex-1"
                      />
                      <span className="text-sm">2x</span>
                    </div>
                    <div className="text-center text-sm text-muted-foreground">
                      Current: {ttsRate}x
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-background z-50 pb-safe">
        <div className="flex justify-around p-2">
          <Button
            variant={currentView === 'landing' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setCurrentView('landing')}
          >
            <img src="/brand/logo-mark.svg" alt="" aria-hidden="true" className="w-5 h-5" loading="eager" />
          </Button>
          <Button
            variant={currentView === 'dashboard' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setCurrentView('dashboard')}
          >
            <img src="/brand/icons/dictionary-stack.svg" alt="" aria-hidden="true" className="w-5 h-5" loading="eager" />
          </Button>
          <Button
            variant={currentView === 'browse' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setCurrentView('browse')}
          >
            <img src="/brand/icons/search-hanzi.svg" alt="" aria-hidden="true" className="w-5 h-5" loading="eager" />
          </Button>
          <Button
            variant={currentView === 'progress' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setCurrentView('progress')}
          >
            <BarChart3 className="w-5 h-5" />
          </Button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 pb-24 md:pb-6 overflow-x-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {currentView === 'landing' && renderLanding()}
            {currentView === 'dashboard' && renderDashboard()}
            {currentView === 'browse' && renderBrowse()}
            {currentView === 'detail' && renderDetail()}
            {currentView === 'study' && renderStudy()}
            {currentView === 'progress' && renderProgress()}
          </motion.div>
        </AnimatePresence>
      </main>

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
