import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Volume2, CheckCircle2, XCircle, ArrowRight, Trophy, Headphones, HelpCircle } from 'lucide-react';
import { ttsService } from '@/services/ttsService';
import type { UnifiedEntry } from '@/services/unifiedDictionaryService';

type QuestionType = 'character-to-meaning' | 'meaning-to-character' | 'pinyin-to-character' | 'character-to-pinyin';

interface Question {
  type: QuestionType;
  entry: UnifiedEntry;
  options: string[];
  correctAnswer: string;
}

interface QuizModeProps {
  entries: UnifiedEntry[];
  onComplete?: (score: number, total: number) => void;
  onExit?: () => void;
}

function fisherYates<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const QuizMode = ({ entries, onComplete, onExit }: QuizModeProps) => {
  const [quizVersion, setQuizVersion] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [score, setScore] = useState(0);
  const [scoreFlash, setScoreFlash] = useState(false);
  const [quizComplete, setQuizComplete] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [autoPlayAudio, setAutoPlayAudio] = useState(() => {
    try { return localStorage.getItem('openhsk.quiz-autoplay.v1') === 'true'; } catch { return false; }
  });
  const scoreRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const generateQuestions = useCallback((entries: UnifiedEntry[], version: number): Question[] => {
    void version;
    if (entries.length === 0) return [];

    const shuffledAll = fisherYates(entries);
    const questionEntries = shuffledAll.slice(0, Math.min(10, entries.length));

    const getOptionValue = (e: UnifiedEntry, questionType: QuestionType): string | undefined => {
      switch (questionType) {
        case 'character-to-meaning':
          return e.definitions[0];
        case 'meaning-to-character':
          return e.hanzi;
        case 'pinyin-to-character':
          return e.hanzi;
        case 'character-to-pinyin':
          return e.pinyin;
        default:
          return undefined;
      }
    };

    let poolIndex = questionEntries.length;

    return questionEntries.map(entry => {
      const types: QuestionType[] = ['character-to-meaning', 'meaning-to-character', 'pinyin-to-character', 'character-to-pinyin'];
      const type = types[Math.floor(Math.random() * types.length)];

      const correctAnswer = getOptionValue(entry, type) || entry.hanzi;
      const usedValues = new Set<string>([correctAnswer]);
      const wrongOptions: string[] = [];

      const checkedIds = new Set<string>([entry.id]);
      while (wrongOptions.length < 3 && checkedIds.size < shuffledAll.length) {
        const candidate = shuffledAll[poolIndex % shuffledAll.length];
        poolIndex++;
        if (checkedIds.has(candidate.id)) continue;
        checkedIds.add(candidate.id);
        if (candidate.id === entry.id) continue;
        const value = getOptionValue(candidate, type);
        if (value && !usedValues.has(value)) {
          usedValues.add(value);
          wrongOptions.push(value);
        }
      }

      const options = fisherYates([correctAnswer, ...wrongOptions]);

      return {
        type,
        entry,
        options,
        correctAnswer
      };
    });
  }, []);

  const questions = useMemo(() => {
    if (entries.length === 0) {
      return [];
    }
    return generateQuestions(entries, quizVersion);
  }, [entries, generateQuestions, quizVersion]);

  const currentQuestion = questions[currentIndex];

  const handleAnswer = useCallback((answer: string) => {
    if (showAnswer || !currentQuestion) return;

    setSelectedAnswer(answer);
    setShowAnswer(true);

    if (answer === currentQuestion.correctAnswer) {
      setScore(prev => {
        const next = prev + 1;
        scoreRef.current = next;
        return next;
      });
      setScoreFlash(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setScoreFlash(false), 400);
    } else {
      setIsShaking(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setIsShaking(false), 500);
    }
  }, [showAnswer, currentQuestion]);

  const nextQuestion = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowAnswer(false);
    } else {
      setQuizComplete(true);
      if (onComplete) {
        onComplete(scoreRef.current, questions.length);
      }
    }
  }, [currentIndex, questions.length, onComplete]);

  // Auto-play audio when question changes
  useEffect(() => {
    if (autoPlayAudio && currentQuestion && !showAnswer) {
      const timer = setTimeout(() => {
        ttsService.speak(currentQuestion.entry.hanzi);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [currentQuestion, autoPlayAudio, showAnswer, currentIndex]);

  // Cleanup any pending timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (quizComplete) return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onExit?.();
        return;
      }

      if (!currentQuestion) return;

      if (!showAnswer) {
        if (e.key >= '1' && e.key <= '4') {
          const index = parseInt(e.key) - 1;
          if (index < currentQuestion.options.length) {
            handleAnswer(currentQuestion.options[index]);
          }
        }
      } else {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          nextQuestion();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [quizComplete, currentQuestion, showAnswer, onExit, handleAnswer, nextQuestion]);

  const playAudio = useCallback(() => {
    if (currentQuestion) {
      ttsService.speak(currentQuestion.entry.hanzi);
    }
  }, [currentQuestion]);

  // Memoized question display
  const questionDisplay = useMemo(() => {
    if (!currentQuestion) return null;

    switch (currentQuestion.type) {
      case 'character-to-meaning':
        return (
          <div className="text-center space-y-2">
            <div className="text-6xl font-bold">{currentQuestion.entry.hanzi}</div>
            <div className="text-lg text-muted-foreground">{currentQuestion.entry.pinyin}</div>
            <div className="text-sm text-muted-foreground">What does this mean?</div>
          </div>
        );
      case 'meaning-to-character':
        return (
          <div className="text-center space-y-2">
            <div className="text-xl break-words">{currentQuestion.entry.definitions[0]}</div>
            <div className="text-sm text-muted-foreground">Which character matches this meaning?</div>
          </div>
        );
      case 'pinyin-to-character':
        return (
          <div className="text-center space-y-2">
            <div className="text-3xl font-medium">{currentQuestion.entry.pinyin}</div>
            <div className="text-sm text-muted-foreground">Which character has this pinyin?</div>
          </div>
        );
      case 'character-to-pinyin':
        return (
          <div className="text-center space-y-2">
            <div className="text-6xl font-bold">{currentQuestion.entry.hanzi}</div>
            <div className="text-sm text-muted-foreground">What is the pinyin?</div>
          </div>
        );
      default:
        return null;
    }
  }, [currentQuestion]);

  // Memoized option display helper
  const getOptionDisplay = useCallback((option: string) => {
    const isChinese = /[\u4e00-\u9fa5]/.test(option);
    if (isChinese) {
      return <span className="text-2xl break-words">{option}</span>;
    }
    return <span className="break-words whitespace-normal text-center leading-snug">{option}</span>;
  }, []);

  const isPerfectScore = quizComplete && score === questions.length && questions.length > 0;

  const confettiParticles = useMemo(() =>
    Array.from({ length: 40 }).map(() => ({
      left: Math.random() * 100,
      animDuration: 1.5 + Math.random() * 2,
      delay: Math.random() * 1.5,
      color: ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#06b6d4'][Math.floor(Math.random() * 6)],
    })),
    []
  );

  if (quizComplete) {
    const finalScore = score;
    const percentage = Math.round((finalScore / questions.length) * 100);

    return (
      <Card className="w-full max-w-lg mx-auto relative overflow-hidden">
        {isPerfectScore && (
          <>
            <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
              {confettiParticles.map((p, i) => (
                <div
                  key={i}
                  className="absolute top-0 w-2 h-2 rounded-sm"
                  style={{
                    left: `${p.left}%`,
                    backgroundColor: p.color,
                    animation: `confetti-fall ${p.animDuration}s ${p.delay}s linear forwards`,
                    opacity: 0,
                  }}
                />
              ))}
            </div>
            <style>{`
              @keyframes confetti-fall {
                0% { transform: translateY(-10%) rotate(0deg); opacity: 1; }
                100% { transform: translateY(420px) rotate(720deg); opacity: 0; }
              }
            `}</style>
          </>
        )}
        <CardContent className="p-8 text-center space-y-6">
          <div className="flex justify-center">
            <div className="p-4 bg-primary/10 rounded-full">
              <Trophy className="w-12 h-12 text-primary" />
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-2">Quiz Complete!</h2>
            <p className="text-muted-foreground">
              You scored {finalScore} out of {questions.length}
            </p>
          </div>

          <div className="text-4xl font-bold text-primary">
            {percentage}%
          </div>

          <div className="flex gap-2 justify-center">
            <Button onClick={() => {
              setQuizVersion((prev) => prev + 1);
              setCurrentIndex(0);
              setScore(0);
              scoreRef.current = 0;
              setSelectedAnswer(null);
              setShowAnswer(false);
              setQuizComplete(false);
            }}>
              Try Again
            </Button>
            <Button variant="outline" onClick={onExit}>
              Exit
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!currentQuestion) {
    const isEmpty = entries.length === 0;
    return (
      <Card className="w-full max-w-lg mx-auto">
        <CardContent className="p-8 text-center space-y-4">
          {isEmpty ? (
            <>
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto">
                <HelpCircle className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">No words available</p>
                <p className="text-sm text-muted-foreground mt-1">Browse the dictionary first to build up your vocabulary.</p>
              </div>
            </>
          ) : (
            <p className="text-muted-foreground">Loading quiz...</p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="flex items-center justify-between text-sm">
        <span>Question {currentIndex + 1} of {questions.length}</span>
        <span className={`transition-all duration-300 ${scoreFlash ? 'text-green-600 dark:text-green-400 scale-125 font-bold' : ''}`}>
          Score: {score}
        </span>
      </div>
      <Progress value={((currentIndex + 1) / questions.length) * 100} className="h-2" />

      <Card className={`w-full max-w-lg mx-auto transition-transform ${isShaking ? 'animate-shake' : ''}`}>
        <style>{`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
            20%, 40%, 60%, 80% { transform: translateX(4px); }
          }
          .animate-shake {
            animation: shake 0.5s ease-in-out;
          }
        `}</style>
        <CardHeader className="flex flex-row items-center justify-between">
          <Badge variant="secondary">
            {currentQuestion.type.replace(/-/g, ' ')}
          </Badge>
          <div className="flex items-center gap-1">
            <Button
              variant={autoPlayAudio ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 gap-1 text-xs"
              aria-label={autoPlayAudio ? 'Disable auto-play audio' : 'Enable auto-play audio'}
              onClick={() => {
                setAutoPlayAudio(prev => {
                  const next = !prev;
                  try { localStorage.setItem('openhsk.quiz-autoplay.v1', String(next)); } catch { /* ignore */ }
                  return next;
                });
              }}
            >
              <Headphones className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Auto</span>
            </Button>
            <Button variant="ghost" size="icon" aria-label="Play audio" onClick={playAudio}>
              <Volume2 className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Question */}
          {questionDisplay}

          {/* Options */}
          <div className="grid grid-cols-2 gap-3">
            {currentQuestion.options.map((option, index) => {
              const isSelected = selectedAnswer === option;
              const isCorrect = option === currentQuestion.correctAnswer;
              const showCorrect = showAnswer && isCorrect;
              const showWrong = showAnswer && isSelected && !isCorrect;

              return (
                <Button
                  key={index}
                  variant={showCorrect ? 'default' : showWrong ? 'destructive' : 'outline'}
                  className={`h-auto py-4 px-4 text-left justify-center whitespace-normal break-words relative ${
                    isSelected ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => handleAnswer(option)}
                  disabled={showAnswer}
                >
                  <span className="absolute top-1.5 left-2 text-[10px] font-mono text-muted-foreground/60 select-none">
                    {index + 1}
                  </span>
                  <div className="flex items-center gap-2">
                    {showCorrect && <CheckCircle2 className="w-4 h-4" />}
                    {showWrong && <XCircle className="w-4 h-4" />}
                    {getOptionDisplay(option)}
                  </div>
                </Button>
              );
            })}
          </div>

          {/* Answer feedback */}
          {showAnswer && (
            <div className={`p-4 rounded-lg text-center ${
              selectedAnswer === currentQuestion.correctAnswer
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
            }`}>
              {selectedAnswer === currentQuestion.correctAnswer ? (
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Correct!</span>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-2">
                    <XCircle className="w-5 h-5" />
                    <span>Incorrect</span>
                  </div>
                  <div className="text-sm">
                    Correct answer: <strong>{currentQuestion.correctAnswer}</strong>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Next button */}
          {showAnswer && (
            <Button className="w-full" onClick={nextQuestion}>
              {currentIndex < questions.length - 1 ? (
                <><ArrowRight className="w-4 h-4 mr-2" /> Next Question</>
              ) : (
                <><Trophy className="w-4 h-4 mr-2" /> Finish Quiz</>
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default QuizMode;
