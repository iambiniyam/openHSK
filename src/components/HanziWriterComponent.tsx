import { useEffect, useRef, useState } from 'react';
import HanziWriter from 'hanzi-writer';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw, Eye, EyeOff, PenTool, CheckCircle2 } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface HanziWriterComponentProps {
  character: string;
  size?: number;
  showQuiz?: boolean;
}

export const HanziWriterComponent = ({ 
  character, 
  size = 250,
  showQuiz = true 
}: HanziWriterComponentProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const writerRef = useRef<HanziWriter | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showOutline, setShowOutline] = useState(true);
  const [showCharacter, setShowCharacter] = useState(true);
  const [isQuizMode, setIsQuizMode] = useState(false);
  const [quizProgress, setQuizProgress] = useState(0);
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resetTimeout = setTimeout(() => {
      setIsLoading(true);
      setError(false);
    }, 0);

    // Create HanziWriter instance
    const writer = HanziWriter.create(container, character, {
      width: size,
      height: size,
      padding: 5,
      showOutline: true,
      showCharacter: true,
      strokeAnimationSpeed: animationSpeed,
      strokeHighlightSpeed: 2,
      strokeFadeDuration: 400,
      delayBetweenStrokes: 1000 / animationSpeed,
      delayBetweenLoops: 2000,
      strokeColor: '#333',
      radicalColor: '#2563eb', // Blue for radical
      highlightColor: '#60a5fa',
      outlineColor: '#ddd',
      drawingColor: '#333',
      drawingWidth: 4,
      showHintAfterMisses: 3,
      onLoadCharDataError: () => {
        setError(true);
        setIsLoading(false);
      },
      onLoadCharDataSuccess: () => {
        setIsLoading(false);
      }
    });

    writerRef.current = writer;

    return () => {
      clearTimeout(resetTimeout);
      // Cleanup
      container.innerHTML = '';
    };
  }, [character, size, animationSpeed]);

  // Update outline visibility
  useEffect(() => {
    if (!writerRef.current) return;
    if (showOutline) {
      writerRef.current.showOutline();
    } else {
      writerRef.current.hideOutline();
    }
  }, [showOutline]);

  // Update character visibility
  useEffect(() => {
    if (!writerRef.current) return;
    if (showCharacter) {
      writerRef.current.showCharacter();
    } else {
      writerRef.current.hideCharacter();
    }
  }, [showCharacter]);

  // Note: HanziWriter doesn't support dynamic speed updates
  // Speed is set at initialization

  const handleAnimate = async () => {
    if (!writerRef.current) return;
    
    if (isQuizMode) {
      setIsQuizMode(false);
      writerRef.current.cancelQuiz();
    }
    
    setIsAnimating(true);
    setShowCharacter(true);
    
    try {
      await writerRef.current.animateCharacter({
        onComplete: () => setIsAnimating(false)
      });
    } catch {
      setIsAnimating(false);
    }
  };

  const handleLoopAnimate = () => {
    if (!writerRef.current) return;
    
    if (isQuizMode) {
      setIsQuizMode(false);
      writerRef.current.cancelQuiz();
    }
    
    setIsAnimating(true);
    setShowCharacter(true);
    writerRef.current.loopCharacterAnimation();
  };

  const handleStop = () => {
    if (!writerRef.current) return;
    // HanziWriter doesn't have cancelAnimation, we just stop tracking
    setIsAnimating(false);
  };

  const handleReset = () => {
    if (!writerRef.current) return;
    writerRef.current.cancelQuiz();
    setIsAnimating(false);
    setIsQuizMode(false);
    setQuizProgress(0);
    setShowCharacter(true);
    writerRef.current.showCharacter();
  };

  const handleStartQuiz = () => {
    if (!writerRef.current) return;
    
    setIsQuizMode(true);
    setShowCharacter(false);
    setQuizProgress(0);
    
    writerRef.current.quiz({
      onComplete: () => {
        setIsQuizMode(false);
        setQuizProgress(100);
      },
      onCorrectStroke: () => {
        setQuizProgress(prev => prev + 10); // Approximate progress
      },
      onMistake: () => {
        // Shake animation or feedback
      }
    });
  };

  if (error) {
    return (
      <div 
        className="flex items-center justify-center bg-muted/30 rounded-lg border-2 border-dashed border-muted-foreground/30"
        style={{ width: size, height: size }}
      >
        <div className="text-center p-4">
          <div className="text-4xl mb-2">{character}</div>
          <div className="text-xs text-muted-foreground">Stroke data not available</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Character Display */}
      <div className="relative">
        <div 
          ref={containerRef}
          className="bg-white dark:bg-slate-900 rounded-lg border-2 border-muted-foreground/20 shadow-inner"
          style={{ width: size, height: size }}
        />
        
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-lg">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        )}

        {/* Quiz Progress */}
        {isQuizMode && (
          <div className="absolute bottom-2 left-2 right-2">
            <div className="bg-background/90 backdrop-blur rounded-full h-2 overflow-hidden">
              <div 
                className="h-full bg-green-500 transition-all duration-300"
                style={{ width: `${quizProgress}%` }}
              />
            </div>
            <div className="text-xs text-center mt-1 font-medium">
              {Math.round(quizProgress)}% Complete
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {/* Animation Controls */}
        {!isQuizMode ? (
          <>
            <Button
              variant="default"
              size="sm"
              onClick={isAnimating ? handleStop : handleAnimate}
            >
              {isAnimating ? (
                <><Pause className="w-4 h-4 mr-1" /> Stop</>
              ) : (
                <><Play className="w-4 h-4 mr-1" /> Animate</>
              )}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleLoopAnimate}
              disabled={isAnimating}
            >
              <RotateCcw className="w-4 h-4 mr-1" /> Loop
            </Button>
          </>
        ) : (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleReset}
          >
            <CheckCircle2 className="w-4 h-4 mr-1" /> End Quiz
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowOutline(!showOutline)}
        >
          {showOutline ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
          {showOutline ? 'Hide' : 'Show'} Outline
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowCharacter(!showCharacter)}
          disabled={isQuizMode}
        >
          {showCharacter ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
          {showCharacter ? 'Hide' : 'Show'} Char
        </Button>

        {showQuiz && !isQuizMode && (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleStartQuiz}
          >
            <PenTool className="w-4 h-4 mr-1" /> Practice
          </Button>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={handleReset}
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>

      {/* Speed Control */}
      <div className="w-full max-w-[200px] space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <Label>Speed</Label>
          <span>{animationSpeed.toFixed(1)}x</span>
        </div>
        <Slider
          value={[animationSpeed]}
          onValueChange={([v]) => setAnimationSpeed(v)}
          min={0.5}
          max={3}
          step={0.5}
        />
      </div>

      {/* Status Badges */}
      <div className="flex gap-2">
        {isQuizMode && (
          <Badge variant="default" className="bg-green-600">
            <PenTool className="w-3 h-3 mr-1" /> Quiz Mode
          </Badge>
        )}
        {isAnimating && (
          <Badge variant="secondary">
            <Play className="w-3 h-3 mr-1" /> Animating
          </Badge>
        )}
      </div>
    </div>
  );
};

export default HanziWriterComponent;
