import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw, SkipForward, SkipBack } from 'lucide-react';

// Stroke data for common characters (simplified representation)
const strokeDatabase: { [key: string]: string[] } = {
  '一': ['M 20 50 L 80 50'],
  '二': ['M 20 35 L 80 35', 'M 20 65 L 80 65'],
  '三': ['M 20 25 L 80 25', 'M 20 50 L 80 50', 'M 20 75 L 80 75'],
  '人': ['M 50 20 L 20 80', 'M 50 20 L 80 80'],
  '大': ['M 50 20 L 50 80', 'M 20 50 L 80 50', 'M 50 20 L 20 80', 'M 50 20 L 80 80'],
  '天': ['M 50 15 L 50 35', 'M 20 25 L 80 25', 'M 50 35 L 20 85', 'M 50 35 L 80 85'],
  '木': ['M 50 15 L 50 85', 'M 20 50 L 80 50', 'M 50 50 L 25 80', 'M 50 50 L 75 80'],
  '水': ['M 50 20 L 35 45', 'M 50 20 L 65 45', 'M 50 20 L 50 85', 'M 50 60 L 25 80'],
  '火': ['M 50 20 L 50 50', 'M 50 50 L 25 80', 'M 50 50 L 75 80', 'M 35 35 L 65 35'],
  '土': ['M 20 35 L 80 35', 'M 50 35 L 50 80', 'M 20 80 L 80 80'],
  '王': ['M 20 25 L 80 25', 'M 20 50 L 80 50', 'M 50 25 L 50 80', 'M 20 80 L 80 80'],
  '口': ['M 25 30 L 25 70', 'M 25 30 L 75 30', 'M 75 30 L 75 70', 'M 25 70 L 75 70'],
  '日': ['M 30 25 L 30 75', 'M 30 25 L 70 25', 'M 30 50 L 70 50', 'M 70 25 L 70 75', 'M 30 75 L 70 75'],
  '月': ['M 35 20 L 35 80', 'M 35 20 L 65 25', 'M 35 50 L 60 50', 'M 35 80 L 65 75', 'M 65 25 L 65 75'],
  '田': ['M 25 25 L 25 75', 'M 25 25 L 75 25', 'M 25 50 L 75 50', 'M 50 25 L 50 75', 'M 75 25 L 75 75', 'M 25 75 L 75 75'],
  '目': ['M 30 20 L 30 80', 'M 30 20 L 70 20', 'M 30 40 L 70 40', 'M 30 60 L 70 60', 'M 70 20 L 70 80', 'M 30 80 L 70 80'],
  '山': ['M 50 20 L 50 80', 'M 25 50 L 50 80', 'M 75 50 L 50 80'],
  '川': ['M 30 25 L 30 80', 'M 50 20 L 50 80', 'M 70 25 L 70 80'],
  '上': ['M 50 25 L 50 80', 'M 25 35 L 75 35', 'M 25 80 L 50 80'],
  '下': ['M 50 25 L 50 80', 'M 25 35 L 75 35', 'M 35 80 L 65 80'],
  '中': ['M 50 20 L 50 80', 'M 25 50 L 75 50', 'M 30 25 L 70 25', 'M 30 80 L 70 80'],
  '国': ['M 20 20 L 20 80', 'M 20 20 L 80 20', 'M 80 20 L 80 80', 'M 20 80 L 80 80', 'M 35 35 L 35 65', 'M 35 35 L 65 35', 'M 65 35 L 65 65', 'M 35 65 L 65 65'],
  '我': ['M 50 20 L 30 80', 'M 35 35 L 65 35', 'M 50 35 L 50 80', 'M 50 50 L 75 50', 'M 65 35 L 75 80', 'M 55 65 L 75 60'],
  '你': ['M 30 25 L 30 80', 'M 30 30 L 50 25', 'M 50 25 L 50 50', 'M 50 50 L 70 45', 'M 60 30 L 60 80', 'M 45 80 L 75 75'],
  '是': ['M 30 25 L 70 20', 'M 50 20 L 50 50', 'M 25 50 L 75 45', 'M 35 65 L 65 60', 'M 30 80 L 70 75'],
  '的': ['M 30 25 L 30 80', 'M 30 30 L 50 25', 'M 50 25 L 50 50', 'M 50 50 L 70 45', 'M 60 30 L 60 80', 'M 45 80 L 75 75', 'M 65 55 L 75 50'],
  '了': ['M 30 30 L 70 25', 'M 50 25 L 35 80', 'M 35 70 L 65 65'],
  '不': ['M 25 35 L 75 30', 'M 50 25 L 45 80', 'M 30 55 L 70 50', 'M 35 80 L 65 75'],
  '在': ['M 30 25 L 30 80', 'M 25 35 L 50 30', 'M 50 30 L 50 80', 'M 50 55 L 75 50', 'M 65 35 L 65 80'],
  '有': ['M 25 25 L 75 20', 'M 50 20 L 45 80', 'M 30 45 L 70 40', 'M 30 70 L 70 65'],
  '个': ['M 30 25 L 30 80', 'M 25 35 L 50 30', 'M 50 30 L 50 80', 'M 35 80 L 65 75'],
};

// Generate generic strokes for unknown characters
const generateGenericStrokes = (char: string): string[] => {
  const strokes: string[] = [];
  const chars = char.split('');
  
  chars.forEach((_, idx) => {
    const offsetX = idx * 100;
    // Create a simple box pattern for each character
    strokes.push(
      `M ${20 + offsetX} 30 L ${20 + offsetX} 70`,
      `M ${20 + offsetX} 30 L ${80 + offsetX} 30`,
      `M ${80 + offsetX} 30 L ${80 + offsetX} 70`,
      `M ${20 + offsetX} 70 L ${80 + offsetX} 70`,
      `M ${50 + offsetX} 30 L ${50 + offsetX} 70`,
      `M ${20 + offsetX} 50 L ${80 + offsetX} 50`
    );
  });
  
  return strokes;
};

interface StrokeOrderProps {
  character: string;
  size?: number;
}

export const StrokeOrder = ({ character, size = 200 }: StrokeOrderProps) => {
  const [currentStroke, setCurrentStroke] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [completedStrokes, setCompletedStrokes] = useState<number[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);

  const strokes = strokeDatabase[character] || generateGenericStrokes(character);
  const totalStrokes = strokes.length;

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentStroke((prev) => {
          if (prev >= totalStrokes - 1) {
            setIsPlaying(false);
            return prev;
          }
          setCompletedStrokes((comp) => [...comp, prev]);
          return prev + 1;
        });
      }, 800);
    }
    return () => clearInterval(interval);
  }, [isPlaying, totalStrokes]);

  const reset = () => {
    setIsPlaying(false);
    setCurrentStroke(0);
    setCompletedStrokes([]);
  };

  const goToStroke = (index: number) => {
    setIsPlaying(false);
    setCurrentStroke(index);
    setCompletedStrokes(Array.from({ length: index }, (_, i) => i));
  };

  const skipForward = () => {
    if (currentStroke < totalStrokes - 1) {
      setCompletedStrokes((comp) => [...comp, currentStroke]);
      setCurrentStroke(currentStroke + 1);
    }
  };

  const skipBackward = () => {
    if (currentStroke > 0) {
      setCompletedStrokes((comp) => comp.slice(0, -1));
      setCurrentStroke(currentStroke - 1);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div 
        className="relative bg-muted/30 rounded-lg overflow-hidden border-2 border-dashed border-muted-foreground/30"
        style={{ width: size, height: size }}
      >
        {/* Grid lines */}
        <svg 
          className="absolute inset-0 w-full h-full opacity-20"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <line x1="50" y1="0" x2="50" y2="100" stroke="currentColor" strokeWidth="0.5" />
          <line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" strokeWidth="0.5" />
          <line x1="0" y1="0" x2="100" y2="100" stroke="currentColor" strokeWidth="0.3" />
          <line x1="100" y1="0" x2="0" y2="100" stroke="currentColor" strokeWidth="0.3" />
        </svg>

        {/* Stroke animation */}
        <svg
          ref={svgRef}
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 100 100"
        >
          {/* Completed strokes */}
          {completedStrokes.map((strokeIndex) => (
            <path
              key={`completed-${strokeIndex}`}
              d={strokes[strokeIndex]}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.6}
            />
          ))}

          {/* Current stroke animation */}
          {currentStroke < totalStrokes && (
            <path
              d={strokes[currentStroke]}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="stroke-animate"
              style={{
                strokeDasharray: 200,
                strokeDashoffset: isPlaying ? 0 : 200,
                transition: isPlaying ? 'stroke-dashoffset 0.6s ease-out' : 'none',
              }}
            />
          )}

          {/* Stroke number indicators */}
          {strokes.map((_, index) => {
            if (index > currentStroke) return null;
            return (
              <circle
                key={`indicator-${index}`}
                cx={50}
                cy={30 + index * 10}
                r="4"
                fill={index === currentStroke ? 'hsl(var(--primary))' : 'hsl(var(--muted))'}
                opacity={index <= currentStroke ? 1 : 0.3}
              />
            );
          })}
        </svg>

        {/* Stroke counter */}
        <div className="absolute top-2 right-2 bg-background/80 backdrop-blur px-2 py-1 rounded text-sm font-medium">
          {Math.min(currentStroke + (isPlaying ? 1 : 0), totalStrokes)} / {totalStrokes}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={skipBackward} disabled={currentStroke === 0}>
          <SkipBack className="w-4 h-4" />
        </Button>
        
        <Button variant="default" size="sm" onClick={() => setIsPlaying(!isPlaying)}>
          {isPlaying ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
          {isPlaying ? 'Pause' : 'Play'}
        </Button>
        
        <Button variant="outline" size="icon" onClick={skipForward} disabled={currentStroke >= totalStrokes - 1}>
          <SkipForward className="w-4 h-4" />
        </Button>
        
        <Button variant="ghost" size="icon" onClick={reset}>
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>

      {/* Stroke thumbnails */}
      <div className="flex gap-1 flex-wrap justify-center max-w-[200px]">
        {strokes.map((_, index) => (
          <button
            key={index}
            onClick={() => goToStroke(index)}
            className={`w-6 h-6 rounded text-xs font-medium transition-colors ${
              index < currentStroke 
                ? 'bg-primary text-primary-foreground' 
                : index === currentStroke 
                  ? 'bg-primary/20 text-primary border border-primary'
                  : 'bg-muted text-muted-foreground'
            }`}
          >
            {index + 1}
          </button>
        ))}
      </div>
    </div>
  );
};

export default StrokeOrder;
