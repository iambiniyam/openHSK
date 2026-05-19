import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Volume2,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Hash,
  Globe,
  Pause,
  Play,
  Square,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Toggle } from '@/components/ui/toggle';
import { ttsService } from '@/services/ttsService';
import type { StoryEntry } from '@/types/stories';
import { ChineseText } from './ChineseText';
import { ReaderSettingsPanel, loadReaderSettings, getFontSizeClass, getLineSpacingClass, getChineseFontClass, getThemeClasses, type ReaderSettings } from './ReaderSettings';

interface StoryViewerProps {
  story: StoryEntry;
  onWordClick?: (hanzi: string) => void;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  storyIndex?: number;
  totalStories?: number;
}

export const StoryViewer = ({
  story,
  onWordClick,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
  storyIndex,
  totalStories,
}: StoryViewerProps) => {
  const [readerSettings, setReaderSettings] = useState<ReaderSettings>(loadReaderSettings);
  const [showEnglish, setShowEnglish] = useState(false);
  const [showVocabList, setShowVocabList] = useState(false);

  // TTS read-along state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentSentence, setCurrentSentence] = useState(() => {
    try {
      const saved = localStorage.getItem(`openhsk.story-position.${story.story_id}.v1`);
      if (saved) {
        const pos = JSON.parse(saved);
        if (typeof pos.sentence === 'number') return pos.sentence;
      }
    } catch { /* ignore */ }
    return -1;
  });
  const sentenceRefs = useRef<(HTMLDivElement | null)[]>([]);

  const hasSentences = (story.sentences?.length || 0) > 0;
  const displaySentences = hasSentences ? story.sentences : null;

  // Stop TTS when story changes
  useEffect(() => {
    ttsService.stop();
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentSentence(() => {
      try {
        const saved = localStorage.getItem(`openhsk.story-position.${story.story_id}.v1`);
        if (saved) {
          const pos = JSON.parse(saved);
          if (typeof pos.sentence === 'number') return pos.sentence;
        }
      } catch { /* ignore */ }
      return -1;
    });
    return () => { ttsService.stop(); };
  }, [story.story_id]);

  // Auto-scroll current sentence into view
  useEffect(() => {
    if (currentSentence >= 0 && sentenceRefs.current[currentSentence]) {
      sentenceRefs.current[currentSentence]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentSentence]);

  // Persist reading position
  useEffect(() => {
    try {
      localStorage.setItem(`openhsk.story-position.${story.story_id}.v1`, JSON.stringify({ sentence: currentSentence }));
    } catch { /* ignore */ }
  }, [currentSentence, story.story_id]);

  const handleSpeakSentence = useCallback((text: string) => {
    ttsService.speak(text);
  }, []);

  const handlePlayAll = useCallback(async () => {
    if (!displaySentences) return;

    if (isPaused) {
      ttsService.resume();
      setIsPaused(false);
      setIsPlaying(true);
      return;
    }

    const sentences = displaySentences.map((s) => s.chinese);

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
  }, [displaySentences, isPaused, currentSentence]);

  const handlePlayFromIndex = useCallback(async (index: number) => {
    if (!displaySentences) return;

    const sentences = displaySentences.map((s) => s.chinese);

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
  }, [displaySentences]);

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

  if (!story || story.error) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">
            {story?.error || 'Story data not available'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Navigation Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          <span className="text-sm text-muted-foreground">
            {storyIndex !== undefined && totalStories !== undefined && (
              <>Story {storyIndex + 1} of {totalStories}</>
            )}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onPrevious && (
            <Button
              variant="outline"
              size="icon"
              disabled={!hasPrevious}
              onClick={onPrevious}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          )}
          {onNext && (
            <Button
              variant="outline"
              size="icon"
              disabled={!hasNext}
              onClick={onNext}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Story Card */}
      <motion.div
        key={story.story_id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className={`hsk-badge-${story.hsk_level > 6 ? '7' : story.hsk_level}`}>
                    HSK {story.hsk_level}
                  </Badge>
                  <Badge variant="outline">
                    <Hash className="w-3 h-3 mr-1" />
                    {story.word_count} target words
                  </Badge>
                  <Badge variant="outline" className={story.coverage >= 0.9 ? 'text-green-600' : 'text-yellow-600'}>
                    {(story.coverage * 100).toFixed(0)}% coverage
                  </Badge>
                </div>
                <CardTitle className="text-2xl">{story.title_chinese}</CardTitle>
                <CardDescription>{story.title_english}</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => handleSpeakSentence(story.title_chinese)}>
                <Volume2 className="w-5 h-5" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className={`space-y-6 rounded-b-xl transition-colors duration-300 ${getThemeClasses(readerSettings.theme)}`}>
            {/* Display Options + TTS */}
            <div className="flex items-center gap-2 border-b pb-3 flex-wrap">
              <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              <ReaderSettingsPanel settings={readerSettings} onChange={setReaderSettings} />
              <Toggle
                pressed={showEnglish}
                onPressedChange={setShowEnglish}
                size="sm"
                aria-label="Toggle English"
              >
                <Globe className="w-4 h-4 mr-1" />
                英文
              </Toggle>
            </div>
            <div className="flex-1" />

            {displaySentences && (
              <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                {isPlaying && !isPaused ? (
                  <Button variant="ghost" size="sm" onClick={handlePause}>
                    <Pause className="w-4 h-4 mr-1" />
                    Pause
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" onClick={handlePlayAll}>
                    <Play className="w-4 h-4 mr-1" />
                    {isPaused ? 'Resume' : 'Read Aloud'}
                  </Button>
                )}
                {isPlaying && (
                  <Button variant="ghost" size="sm" onClick={handleStop}>
                    <Square className="w-4 h-4 mr-1" />
                    Stop
                  </Button>
                )}
              </div>
            )}
          </div>

            {/* Story Content */}
            <div className="space-y-6">
              {displaySentences ? (
                /* Sentence-by-sentence with read-along highlighting */
                <div className="space-y-2">
                  {displaySentences.map((sentence, i) => {
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
                          className="flex items-start gap-3 rounded-lg px-3 py-2 border-l-4 border-l-transparent cursor-pointer"
                          onClick={() => {
                            if (isCurrent) return;
                            handlePlayFromIndex(i);
                          }}
                        >
                          <span className="text-xs text-muted-foreground/80 mt-0.5 shrink-0 w-6 text-right tabular-nums font-medium">
                            {i + 1}
                          </span>
                          <div className="space-y-1 flex-1 min-w-0">
                            <div
                              className={`${getFontSizeClass(readerSettings.fontSize)} ${getLineSpacingClass(readerSettings.lineSpacing)} ${getChineseFontClass(readerSettings.chineseFont)} tracking-wide transition-colors duration-200 ${
                                isCurrent ? 'text-foreground font-semibold' : ''
                              } ${readerSettings.pinyinMode === 'always' ? 'py-1' : ''}`}
                            >
                              <ChineseText
                                text={sentence.chinese}
                                pinyin={sentence.pinyin}
                                settings={readerSettings}
                                onWordClick={onWordClick}
                              />
                            </div>
                            {readerSettings.pinyinMode === 'off' && sentence.pinyin && (
                              <div className="text-base text-primary/70 italic leading-relaxed">
                                {sentence.pinyin}
                              </div>
                            )}
                            {showEnglish && sentence.english && (
                              <div className="text-base text-muted-foreground leading-relaxed">
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
                              variant="ghost"
                              size="icon"
                              className={`shrink-0 transition-opacity ${
                                isCurrent ? 'opacity-100' : 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100'
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSpeakSentence(sentence.chinese);
                              }}
                            >
                              <Volume2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </motion.div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Fallback: plain text display */
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">中文</div>
                    <div className={`${getFontSizeClass(readerSettings.fontSize)} ${getLineSpacingClass(readerSettings.lineSpacing)} ${getChineseFontClass(readerSettings.chineseFont)} tracking-wide`}>
                      <ChineseText
                        text={story.story_chinese}
                        pinyin={story.story_pinyin}
                        settings={readerSettings}
                        onWordClick={onWordClick}
                        highlightChars={showVocabList && story.word_usage ? new Set(story.word_usage.map(u => u.hanzi)) : undefined}
                      />
                    </div>
                  </div>

                  {readerSettings.pinyinMode === 'off' && story.story_pinyin && (
                    <div className="border-t pt-4">
                      <div className="text-sm text-muted-foreground mb-1">拼音</div>
                      <div className={`text-base text-primary/70 italic ${getLineSpacingClass(readerSettings.lineSpacing)}`}>
                        {story.story_pinyin}
                      </div>
                    </div>
                  )}

                  {showEnglish && story.story_english && (
                    <div className="border-t pt-4">
                      <div className="text-sm text-muted-foreground mb-1">English</div>
                      <div className="text-lg leading-relaxed text-muted-foreground">
                        {story.story_english}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Vocabulary List Toggle */}
            <div className="border-t pt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowVocabList(!showVocabList)}
                className="gap-2"
              >
                {showVocabList ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showVocabList ? 'Hide Vocabulary' : `Show Vocabulary (${story.word_usage?.length || 0} words)`}
              </Button>

              <AnimatePresence>
                {showVocabList && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
                      {(story.word_usage || []).map((usage, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                          onClick={() => onWordClick?.(usage.hanzi)}
                        >
                          <div className="shrink-0 w-11 h-11 flex items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-lg">
                            {usage.hanzi}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{usage.hanzi}</span>
                              <span className="text-xs text-muted-foreground">{usage.pinyin}</span>
                            </div>
                            <div className="text-xs text-muted-foreground line-clamp-1">
                              {usage.context_meaning}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default StoryViewer;
