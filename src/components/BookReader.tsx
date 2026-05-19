import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Volume2,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Hash,
  Globe,
  BookOpen,
  List,
  PanelLeftClose,
  Clock,
  CheckCircle2,
  Pause,
  Play,
  Square,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Toggle } from '@/components/ui/toggle';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ttsService } from '@/services/ttsService';
import type { Book } from '@/types/books';
import { ChineseText } from './ChineseText';
import { ReaderSettingsPanel, loadReaderSettings, getFontSizeClass, getLineSpacingClass, getChineseFontClass, getThemeClasses, type ReaderSettings } from './ReaderSettings';

interface BookReaderProps {
  book: Book;
  onWordClick?: (hanzi: string) => void;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  bookIndex?: number;
  totalBooks?: number;
}



const levelSpineColors: Record<number, string> = {
  1: 'from-green-400 to-emerald-500',
  2: 'from-emerald-400 to-teal-500',
  3: 'from-blue-400 to-cyan-500',
  4: 'from-purple-400 to-violet-500',
  5: 'from-orange-400 to-amber-500',
  6: 'from-red-400 to-rose-500',
  7: 'from-slate-400 to-gray-500',
};

const genreIcons: Record<string, string> = {
  adventure: '🏔️', mystery: '🔍', scifi: '🚀', romance: '💕',
  historical: '🏯', comedy: '😄', thriller: '🌑',
  slice_of_life: '🏠', fantasy: '🐉', travel: '🗺️',
};

const estimateReadingTime = (chars: number): string => {
  const mins = Math.max(1, Math.round(chars / 300));
  return mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
};

const getStorageKey = (bookId: string) => `openhsk.book-position.${bookId}.v1`;

export const BookReader = ({
  book, onWordClick, onPrevious, onNext, hasPrevious, hasNext, bookIndex, totalBooks,
}: BookReaderProps) => {
  const [readerSettings, setReaderSettings] = useState<ReaderSettings>(loadReaderSettings);
  const [showEnglish, setShowEnglish] = useState(false);
  const [showVocab, setShowVocab] = useState(false);
  const [currentChapter, setCurrentChapter] = useState(() => {
    try {
      const saved = localStorage.getItem(getStorageKey(book.book_id));
      if (saved) {
        const pos = JSON.parse(saved);
        if (typeof pos.chapter === 'number' && pos.chapter >= 0 && pos.chapter < book.total_chapters) {
          return pos.chapter;
        }
      }
    } catch { /* ignore */ }
    return 0;
  });
  const [showToc, setShowToc] = useState(false);
  const [showVocabList, setShowVocabList] = useState(false);
  const [completedChapters, setCompletedChapters] = useState<Set<number>>(() => {
    try {
      const saved = localStorage.getItem(`openhsk.book-progress.${book.book_id}.v1`);
      return saved ? new Set(JSON.parse(saved)) : new Set<number>();
    } catch { return new Set<number>(); }
  });
  const contentRef = useRef<HTMLDivElement>(null);

  // TTS read-along state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentSentence, setCurrentSentence] = useState(-1);
  const sentenceRefs = useRef<(HTMLDivElement | null)[]>([]);

  const chapter = book.chapters[currentChapter];
  const chapterWordUsage = useMemo(() => {
    if (!chapter) return [];
    return (book.word_usage || []).filter((u) => u.chapter_number === chapter.chapter_number);
  }, [book.word_usage, chapter]);

  const handleSpeak = useCallback((text: string) => ttsService.speak(text), []);

  // Stop TTS when chapter or book changes
  useEffect(() => {
    ttsService.stop();
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentSentence(-1);
    return () => { ttsService.stop(); };
  }, [book.book_id, currentChapter]);

  // Auto-scroll current sentence into view
  useEffect(() => {
    if (currentSentence >= 0 && sentenceRefs.current[currentSentence]) {
      sentenceRefs.current[currentSentence]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentSentence]);

  const handlePlayAll = useCallback(async () => {
    if (!chapter) return;

    if (isPaused) {
      ttsService.resume();
      setIsPaused(false);
      setIsPlaying(true);
      return;
    }

    const sentences = chapter.sentences.map((s) => s.chinese);

    setIsPlaying(true);
    setIsPaused(false);

    try {
      await ttsService.speakSequential(sentences, (index) => {
        setCurrentSentence(index);
      }, isPaused ? currentSentence : 0);
    } catch {
      // aborted
    } finally {
      setIsPlaying(false);
      setIsPaused(false);
    }
  }, [chapter, isPaused, currentSentence]);

  const handlePlayFromIndex = useCallback(async (index: number) => {
    if (!chapter) return;

    const sentences = chapter.sentences.map((s) => s.chinese);

    ttsService.stop();
    setIsPlaying(true);
    setIsPaused(false);

    try {
      await ttsService.speakSequential(sentences, (idx) => {
        setCurrentSentence(idx);
      }, index);
    } catch {
      // aborted
    } finally {
      setIsPlaying(false);
      setIsPaused(false);
    }
  }, [chapter]);

  const handlePause = useCallback(() => {
    ttsService.pause();
    setIsPaused(true);
  }, []);

  const handleStop = useCallback(() => {
    ttsService.stop();
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentSentence(-1);
  }, []);

  const canPrevChapter = currentChapter > 0;
  const canNextChapter = currentChapter < book.total_chapters - 1;

  const goToChapter = useCallback((index: number) => {
    ttsService.stop();
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentSentence(-1);
    const newIndex = Math.max(0, Math.min(book.total_chapters - 1, index));
    setCurrentChapter(newIndex);
    setShowToc(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    try { localStorage.setItem(getStorageKey(book.book_id), JSON.stringify({ chapter: newIndex })); } catch { /* ignore */ }
  }, [book.book_id, book.total_chapters]);

  // Mark chapter as read when navigating away
  const markChapterComplete = useCallback(() => {
    const updated = new Set(completedChapters);
    updated.add(currentChapter);
    setCompletedChapters(updated);
    try { localStorage.setItem(`openhsk.book-progress.${book.book_id}.v1`, JSON.stringify([...updated])); } catch { /* ignore */ }
  }, [completedChapters, currentChapter, book.book_id]);

  const handleNextChapter = useCallback(() => {
    if (canNextChapter) {
      markChapterComplete();
      goToChapter(currentChapter + 1);
    }
  }, [canNextChapter, markChapterComplete, goToChapter, currentChapter]);

  const handlePrevChapter = useCallback(() => {
    if (canPrevChapter) goToChapter(currentChapter - 1);
  }, [canPrevChapter, goToChapter, currentChapter]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowRight') handleNextChapter();
      if (e.key === 'ArrowLeft') handlePrevChapter();
      if (e.key === 't' && !e.ctrlKey && !e.metaKey) { e.preventDefault(); setShowToc((v) => !v); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleNextChapter, handlePrevChapter]);

  if (!book || book.error) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">{book?.error || 'Book data not available'}</p>
        </CardContent>
      </Card>
    );
  }

  const spineColor = levelSpineColors[book.hsk_level] || levelSpineColors[7];
  const readingTime = estimateReadingTime(book.char_count || 0);
  const chapterProgress = ((currentChapter + 1) / book.total_chapters) * 100;

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Book Cover / Title Area */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="overflow-hidden">
          <div className={`absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-b ${spineColor}`} />
          <CardContent className="pl-6 p-5 sm:p-6">
            <div className="flex items-start gap-4">
              {/* Book icon */}
              <div className="hidden sm:flex shrink-0 items-center justify-center w-14 h-14 rounded-xl bg-muted text-3xl shadow-inner">
                {genreIcons[book.genre] || '📖'}
              </div>
              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-[11px]">
                    HSK {book.hsk_level > 6 ? '7-9' : book.hsk_level}
                  </Badge>
                  <Badge variant="outline" className="text-[11px]">
                    {genreIcons[book.genre]} {book.genre_label_english}
                  </Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" /> ~{readingTime}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold leading-tight font-cn">
                  {book.title_chinese}
                </h1>
                <p className="text-sm text-muted-foreground italic">{book.title_english}</p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {book.description_chinese}
                </p>
              </div>
            </div>
            {/* Global reading progress */}
            <div className="mt-4 space-y-1">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Reading progress</span>
                <span>{completedChapters.size} / {book.total_chapters} chapters</span>
              </div>
              <Progress value={(completedChapters.size / book.total_chapters) * 100} className="h-1.5" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Chapter Navigation Bar */}
      <div className="flex items-center gap-2 sticky top-20 z-30 bg-background/95 backdrop-blur py-2 -mx-1 px-1 rounded-lg">
        {/* Book prev/next */}
        <div className="flex items-center gap-1">
          {onPrevious && (
            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!hasPrevious} onClick={onPrevious}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
          )}
          {onNext && (
            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!hasNext} onClick={onNext}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
          {bookIndex !== undefined && totalBooks !== undefined && (
            <span className="text-xs text-muted-foreground ml-1">Book {bookIndex + 1}/{totalBooks}</span>
          )}
        </div>

        <div className="flex-1" />

        {/* Chapter navigation */}
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" className="h-8 px-2" disabled={!canPrevChapter} onClick={handlePrevChapter}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium tabular-nums min-w-[90px] text-center">
            Ch {currentChapter + 1}/{book.total_chapters}
          </span>
          <Button variant="outline" size="sm" className="h-8 px-2" disabled={!canNextChapter} onClick={handleNextChapter}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* TOC toggle */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowToc(!showToc)}>
                <List className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Table of Contents (T)</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Table of Contents Sidebar (overlay) */}
      <AnimatePresence>
        {showToc && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card className="bg-muted/30">
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <BookOpen className="w-4 h-4" /> Table of Contents
                  </h3>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowToc(false)}>
                    <PanelLeftClose className="w-4 h-4" />
                  </Button>
                </div>
                <div className="space-y-1 max-h-[40vh] overflow-y-auto">
                  {book.chapters.map((ch, i) => (
                    <button
                      key={ch.chapter_number}
                      onClick={() => goToChapter(i)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-3 group ${
                        i === currentChapter
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        completedChapters.has(i) ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600' :
                        i === currentChapter ? 'bg-primary/20 text-primary' : 'bg-muted-foreground/10'
                      }`}>
                        {completedChapters.has(i) ? <CheckCircle2 className="w-3 h-3" /> : ch.chapter_number}
                      </span>
                      <span className="truncate flex-1">{ch.title_chinese}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        {ch.sentences.length} lines
                      </span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chapter Content */}
      {chapter && (
        <motion.div
          key={chapter.chapter_number}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.25 }}
          ref={contentRef}
        >
          <Card className="shadow-lg overflow-hidden">
            {/* Chapter Header */}
            <div className="border-b px-5 py-4 sm:px-6 sm:py-5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className="text-[11px] font-medium">
                      Chapter {chapter.chapter_number}
                    </Badge>
                    <Badge variant="outline" className="text-[11px]">
                      <Hash className="w-3 h-3 mr-1" />
                      {chapter.word_count} new words
                    </Badge>
                    {completedChapters.has(currentChapter) && (
                      <Badge variant="outline" className="text-[11px] text-emerald-600 border-emerald-300">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Read
                      </Badge>
                    )}
                  </div>
                  <h2 className="text-xl font-bold font-cn">{chapter.title_chinese}</h2>
                  <p className="text-sm text-muted-foreground">{chapter.title_english}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleSpeak(chapter.title_chinese)}>
                  <Volume2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <CardContent className={`p-5 sm:p-6 space-y-5 transition-colors duration-300 ${getThemeClasses(readerSettings.theme)}`}>
              {/* Reading Controls */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Display options */}
                <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
                  <ReaderSettingsPanel settings={readerSettings} onChange={setReaderSettings} />
                  <Toggle
                    pressed={showEnglish}
                    onPressedChange={setShowEnglish}
                    size="sm"
                    className="h-7 px-2 text-xs"
                    aria-label="Toggle English"
                  >
                    <Globe className="w-3.5 h-3.5 mr-1" />
                    <span className="hidden sm:inline">英文</span>
                  </Toggle>
                  <Toggle
                    pressed={showVocab}
                    onPressedChange={setShowVocab}
                    size="sm"
                    className="h-7 px-2 text-xs"
                    aria-label="Toggle vocabulary highlights"
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1" />
                    <span className="hidden sm:inline">词汇</span>
                  </Toggle>
                </div>

                <div className="flex-1" />

                {/* Read aloud */}
                <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
                  {isPlaying && !isPaused ? (
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={handlePause}>
                      <Pause className="w-3.5 h-3.5 mr-1" />
                      Pause
                    </Button>
                  ) : (
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={handlePlayAll}>
                      <Play className="w-3.5 h-3.5 mr-1" />
                      {isPaused ? 'Resume' : 'Read'}
                    </Button>
                  )}
                  {isPlaying && (
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={handleStop}>
                      <Square className="w-3.5 h-3.5 mr-1" />
                      Stop
                    </Button>
                  )}
                </div>
              </div>

              {/* Story Content */}
              <div className="space-y-2">
                {chapter.sentences.map((sentence, i) => {
                  const isCurrent = currentSentence === i;
                  return (
                    <div
                      key={i}
                      ref={(el) => { sentenceRefs.current[i] = el; }}
                      className="group"
                    >
                      <motion.div
                        animate={{
                          backgroundColor: isCurrent
                            ? 'hsl(var(--primary) / 0.12)'
                            : 'transparent',
                          borderLeftColor: isCurrent
                            ? 'hsl(var(--primary))'
                            : 'transparent',
                        }}
                        transition={{ duration: 0.25 }}
                        className="flex items-start gap-2 sm:gap-3 rounded-lg px-3 py-2 border-l-4 border-l-transparent cursor-pointer"
                        onClick={() => {
                          if (isCurrent) return;
                          handlePlayFromIndex(i);
                        }}
                      >
                        <span className="text-xs text-muted-foreground/80 mt-1 shrink-0 w-5 text-right tabular-nums font-medium">
                          {i + 1}
                        </span>
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div
                            className={`${getFontSizeClass(readerSettings.fontSize)} ${getLineSpacingClass(readerSettings.lineSpacing)} ${getChineseFontClass(readerSettings.chineseFont)} tracking-wide transition-colors duration-200 ${
                              isCurrent ? 'text-foreground font-semibold' : ''
                            }`}
                          >
                            <ChineseText
                              text={sentence.chinese}
                              pinyin={sentence.pinyin}
                              settings={readerSettings}
                              onWordClick={onWordClick}
                              highlightChars={showVocab ? new Set(chapterWordUsage.map(u => u.hanzi).filter(h => sentence.chinese.includes(h)).flatMap(h => Array.from(h))) : undefined}
                            />
                          </div>
                          {readerSettings.pinyinMode === 'off' && sentence.pinyin && (
                            <div className="text-sm text-primary/70 italic leading-relaxed pl-0.5">
                              {sentence.pinyin}
                            </div>
                          )}
                          {showEnglish && sentence.english && (
                            <div className="text-sm text-muted-foreground leading-relaxed border-l-2 border-muted pl-3">
                              {sentence.english}
                            </div>
                          )}
                        </div>
                        <div className="shrink-0 flex items-center gap-1">
                          {isCurrent && isPlaying && !isPaused && (
                            <motion.div
                              className="flex items-center gap-0.5 mr-1"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                            >
                              {[0, 1, 2].map((j) => (
                                <motion.span
                                  key={j}
                                  className="w-1 h-4 bg-primary rounded-full"
                                  animate={{ scaleY: [0.4, 1, 0.4] }}
                                  transition={{
                                    duration: 0.8,
                                    repeat: Infinity,
                                    delay: j * 0.15,
                                    ease: 'easeInOut',
                                  }}
                                />
                              ))}
                            </motion.div>
                          )}
                          <Button
                            variant="ghost" size="icon"
                            className={`shrink-0 h-7 w-7 transition-opacity mt-0.5 ${
                              isCurrent ? 'opacity-100' : 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100'
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSpeak(sentence.chinese);
                            }}
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </motion.div>
                    </div>
                  );
                })}
              </div>

              {/* Chapter Vocabulary */}
              {chapterWordUsage.length > 0 && (
                <div className="border-t pt-4">
                  <Button variant="ghost" size="sm" onClick={() => setShowVocabList(!showVocabList)} className="gap-2 text-xs h-8">
                    {showVocabList ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {showVocabList ? 'Hide' : `Chapter Vocabulary (${chapterWordUsage.length} words)`}
                  </Button>
                  <AnimatePresence>
                    {showVocabList && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                          {chapterWordUsage.map((usage, i) => (
                            <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-muted/50 hover:bg-muted cursor-pointer transition-colors border border-transparent hover:border-primary/20"
                              onClick={() => onWordClick?.(usage.hanzi)}>
                              <div className="shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-lg">
                                {usage.hanzi}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">{usage.hanzi}</span>
                                  <span className="text-xs text-muted-foreground">{usage.pinyin}</span>
                                </div>
                                <div className="text-xs text-muted-foreground line-clamp-1">{usage.context_meaning}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Chapter end — Next chapter preview + complete button */}
      <div className="space-y-4 pb-8">
        {/* Mark as complete */}
        {!completedChapters.has(currentChapter) && (
          <div className="text-center">
            <Button variant="outline" size="sm" onClick={markChapterComplete} className="gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Mark chapter as read
            </Button>
          </div>
        )}

        {/* Bottom navigation */}
        <div className="flex items-center justify-between gap-4">
          <Button variant="outline" onClick={handlePrevChapter} disabled={!canPrevChapter} className="gap-2">
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Previous Chapter</span>
          </Button>

          <div className="text-center text-xs text-muted-foreground">
            <Progress value={chapterProgress} className="w-32 h-1.5 mb-1 mx-auto" />
            Chapter {currentChapter + 1} of {book.total_chapters}
          </div>

          {canNextChapter ? (
            <Button onClick={handleNextChapter} className="gap-2">
              <span className="hidden sm:inline">Next Chapter</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckCircle2 className="w-4 h-4" />
              Book Complete!
            </div>
          )}
        </div>

        {/* Next chapter preview */}
        {canNextChapter && book.chapters[currentChapter + 1] && (
          <Card className="bg-muted/30 border-dashed">
            <CardContent className="p-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Up Next</p>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h4 className="font-semibold text-sm font-cn">{book.chapters[currentChapter + 1].title_chinese}</h4>
                  <p className="text-xs text-muted-foreground">{book.chapters[currentChapter + 1].title_english}</p>
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0">
                  {book.chapters[currentChapter + 1].word_count} words
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Keyboard hint */}
      <div className="hidden md:flex fixed bottom-4 right-4 z-40 items-center gap-3 text-[10px] text-muted-foreground/50">
        <span><kbd className="px-1 py-0.5 rounded bg-muted text-[10px]">←</kbd> <kbd className="px-1 py-0.5 rounded bg-muted text-[10px]">→</kbd> Navigate</span>
        <span><kbd className="px-1 py-0.5 rounded bg-muted text-[10px]">T</kbd> Table of Contents</span>
      </div>
    </div>
  );
};

export default BookReader;
