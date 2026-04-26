import { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Volume2, CheckCircle2, XCircle, ArrowRight, Trophy } from 'lucide-react';
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

export const QuizMode = ({ entries, onComplete, onExit }: QuizModeProps) => {
  const [quizVersion, setQuizVersion] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [score, setScore] = useState(0);
  const [quizComplete, setQuizComplete] = useState(false);

  const generateQuestions = useCallback((entries: UnifiedEntry[], version: number): Question[] => {
    void version;
    const shuffled = [...entries].sort(() => Math.random() - 0.5).slice(0, 10);
    
    return shuffled.map(entry => {
      const types: QuestionType[] = ['character-to-meaning', 'meaning-to-character', 'pinyin-to-character', 'character-to-pinyin'];
      const type = types[Math.floor(Math.random() * types.length)];
      
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

      // Generate wrong options from other entries
      const otherEntries = entries.filter(e => e.id !== entry.id);
      const usedValues = new Set<string>();
      const wrongOptions: string[] = [];
      
      const shuffledOthers = [...otherEntries].sort(() => Math.random() - 0.5);
      for (const otherEntry of shuffledOthers) {
        if (wrongOptions.length >= 3) break;
        const value = getOptionValue(otherEntry, type);
        if (value && !usedValues.has(value)) {
          usedValues.add(value);
          wrongOptions.push(value);
        }
      }

      const correctAnswer = getOptionValue(entry, type) || entry.hanzi;
      usedValues.add(correctAnswer);

      const options = [correctAnswer, ...wrongOptions].sort(() => Math.random() - 0.5);

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

  const handleAnswer = (answer: string) => {
    if (showAnswer) return;
    
    setSelectedAnswer(answer);
    setShowAnswer(true);
    
    if (answer === currentQuestion.correctAnswer) {
      setScore(prev => prev + 1);
    }
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowAnswer(false);
    } else {
      setQuizComplete(true);
      if (onComplete) {
        onComplete(score, questions.length);
      }
    }
  };

  const playAudio = () => {
    if (currentQuestion) {
      ttsService.speak(currentQuestion.entry.hanzi);
    }
  };

  const getQuestionDisplay = () => {
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
  };

  const getOptionDisplay = (option: string) => {
    if (!currentQuestion) return option;

    // Check if option is a Chinese character
    const isChinese = /[\u4e00-\u9fa5]/.test(option);
    
    if (isChinese) {
      return <span className="text-2xl break-words">{option}</span>;
    }
    return <span className="break-words whitespace-normal text-center leading-snug">{option}</span>;
  };

  if (quizComplete) {
    const finalScore = score;
    const percentage = Math.round((finalScore / questions.length) * 100);
    
    return (
      <Card className="w-full max-w-lg mx-auto">
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
    return (
      <Card className="w-full max-w-lg mx-auto">
        <CardContent className="p-8 text-center">
          <p>Loading quiz...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="flex items-center justify-between text-sm">
        <span>Question {currentIndex + 1} of {questions.length}</span>
        <span>Score: {score}</span>
      </div>
      <Progress value={(currentIndex / questions.length) * 100} className="h-2" />

      <Card className="w-full max-w-lg mx-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <Badge variant="secondary">
            {currentQuestion.type.replace(/-/g, ' ')}
          </Badge>
          <Button variant="ghost" size="icon" onClick={playAudio}>
            <Volume2 className="w-5 h-5" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Question */}
          {getQuestionDisplay()}

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
                  className={`h-auto py-4 px-4 text-left justify-center whitespace-normal break-words ${
                    isSelected ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => handleAnswer(option)}
                  disabled={showAnswer}
                >
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
