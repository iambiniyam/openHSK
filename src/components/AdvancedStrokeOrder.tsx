import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw, SkipForward, SkipBack } from 'lucide-react';
import { makemeahanziService, type HanziGraphics } from '@/services/makemeahanziService';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

interface AdvancedStrokeOrderProps {
  character: string;
  size?: number;
  showGrid?: boolean;
  autoPlay?: boolean;
}

export const AdvancedStrokeOrder = ({ 
  character, 
  size = 250,
  showGrid = true,
  autoPlay = false
}: AdvancedStrokeOrderProps) => {
  const [graphics, setGraphics] = useState<HanziGraphics | null>(null);
  const [currentStroke, setCurrentStroke] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [completedStrokes, setCompletedStrokes] = useState<number[]>([]);
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const svgRef = useRef<SVGSVGElement>(null);

  // Load stroke data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await makemeahanziService.loadData();
      const data = makemeahanziService.getGraphics(character);
      setGraphics(data || null);
      setIsLoading(false);
      setCurrentStroke(0);
      setCompletedStrokes([]);
      setIsPlaying(autoPlay);
    };
    loadData();
  }, [character, autoPlay]);

  const totalStrokes = graphics?.strokes.length || 0;

  // Animation loop
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isPlaying && currentStroke < totalStrokes) {
      interval = setInterval(() => {
        setCurrentStroke((prev) => {
          if (prev >= totalStrokes - 1) {
            setIsPlaying(false);
            return prev;
          }
          setCompletedStrokes((comp) => [...comp, prev]);
          return prev + 1;
        });
      }, 1000 / animationSpeed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentStroke, totalStrokes, animationSpeed]);

  const reset = useCallback(() => {
    setIsPlaying(false);
    setCurrentStroke(0);
    setCompletedStrokes([]);
  }, []);

  const goToStroke = useCallback((index: number) => {
    setIsPlaying(false);
    setCurrentStroke(index);
    setCompletedStrokes(Array.from({ length: index }, (_, i) => i));
  }, []);

  const skipForward = useCallback(() => {
    if (currentStroke < totalStrokes - 1) {
      setCompletedStrokes((comp) => [...comp, currentStroke]);
      setCurrentStroke((prev) => prev + 1);
    }
  }, [currentStroke, totalStrokes]);

  const skipBackward = useCallback(() => {
    if (currentStroke > 0) {
      setCompletedStrokes((comp) => comp.slice(0, -1));
      setCurrentStroke((prev) => prev - 1);
    }
  }, [currentStroke]);

  if (isLoading) {
    return (
      <div 
        className="flex items-center justify-center bg-muted/30 rounded-lg border-2 border-dashed border-muted-foreground/30"
        style={{ width: size, height: size }}
      >
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!graphics || totalStrokes === 0) {
    return (
      <div 
        className="flex items-center justify-center bg-muted/30 rounded-lg border-2 border-dashed border-muted-foreground/30"
        style={{ width: size, height: size }}
      >
        <div className="text-center">
          <div className="text-4xl mb-2">{character}</div>
          <div className="text-xs text-muted-foreground">No stroke data</div>
        </div>
      </div>
    );
  }

  // makemeahanzi uses 1024x1024 coordinate system
  const viewBox = "0 0 1024 1024";

  return (
    <div className="flex flex-col items-center gap-4">
      <div 
        className="relative bg-white dark:bg-slate-900 rounded-lg overflow-hidden border-2 border-muted-foreground/20 shadow-inner"
        style={{ width: size, height: size }}
      >
        {/* Grid lines */}
        {showGrid && (
          <svg 
            className="absolute inset-0 w-full h-full"
            viewBox={viewBox}
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Background grid */}
            <defs>
              <pattern id="grid" width="128" height="128" patternUnits="userSpaceOnUse">
                <path d="M 128 0 L 0 0 0 128" fill="none" stroke="currentColor" strokeWidth="1" className="text-muted-foreground/10"/>
              </pattern>
            </defs>
            <rect width="1024" height="1024" fill="url(#grid)" />
            
            {/* Center cross */}
            <line x1="512" y1="0" x2="512" y2="1024" stroke="currentColor" strokeWidth="2" className="text-red-400/30" />
            <line x1="0" y1="512" x2="1024" y2="512" stroke="currentColor" strokeWidth="2" className="text-red-400/30" />
            
            {/* Diagonals */}
            <line x1="0" y1="0" x2="1024" y2="1024" stroke="currentColor" strokeWidth="1" className="text-red-400/20" />
            <line x1="1024" y1="0" x2="0" y2="1024" stroke="currentColor" strokeWidth="1" className="text-red-400/20" />
            
            {/* Border */}
            <rect x="20" y="20" width="984" height="984" fill="none" stroke="currentColor" strokeWidth="4" className="text-muted-foreground/30" rx="20" />
          </svg>
        )}

        {/* Stroke animation */}
        <svg
          ref={svgRef}
          className="absolute inset-0 w-full h-full"
          viewBox={viewBox}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Completed strokes - shown in lighter color */}
          {completedStrokes.map((strokeIndex) => (
            <path
              key={`completed-${strokeIndex}`}
              d={graphics.strokes[strokeIndex]}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="40"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.4}
            />
          ))}

          {/* Current stroke with animation */}
          {currentStroke < totalStrokes && (
            <path
              d={graphics.strokes[currentStroke]}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="45"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="stroke-animate"
              style={{
                strokeDasharray: 5000,
                strokeDashoffset: isPlaying ? 0 : 5000,
                transition: isPlaying ? `stroke-dashoffset ${1 / animationSpeed}s ease-out` : 'none',
              }}
            />
          )}

          {/* Stroke number indicators */}
          {graphics.medians.map((median, index) => {
            if (index > currentStroke || !median[0]) return null;
            const point = median[Math.floor(median.length / 2)];
            if (!point) return null;
            return (
              <g key={`indicator-${index}`}>
                <circle
                  cx={point[0]}
                  cy={point[1]}
                  r="50"
                  fill={index === currentStroke ? 'hsl(var(--primary))' : 'hsl(var(--muted))'}
                  opacity={0.8}
                />
                <text
                  x={point[0]}
                  y={point[1]}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={index === currentStroke ? 'white' : 'hsl(var(--muted-foreground))'}
                  fontSize="60"
                  fontWeight="bold"
                >
                  {index + 1}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Stroke counter overlay */}
        <div className="absolute top-2 right-2 bg-background/90 backdrop-blur px-3 py-1.5 rounded-full text-sm font-bold shadow-sm border">
          {Math.min(currentStroke + (isPlaying ? 1 : 0), totalStrokes)} / {totalStrokes}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 flex-wrap justify-center">
        <Button variant="outline" size="icon" onClick={skipBackward} disabled={currentStroke === 0}>
          <SkipBack className="w-4 h-4" />
        </Button>
        
        <Button variant="default" size="sm" onClick={() => setIsPlaying(!isPlaying)} className="min-w-[100px]">
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

      {/* Speed control */}
      <div className="w-full max-w-[200px] space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <Label>Animation Speed</Label>
          <span>{animationSpeed}x</span>
        </div>
        <Slider
          value={[animationSpeed]}
          onValueChange={([v]) => setAnimationSpeed(v)}
          min={0.5}
          max={3}
          step={0.5}
        />
      </div>

      {/* Stroke thumbnails */}
      <div className="flex gap-1 flex-wrap justify-center max-w-[280px]">
        {graphics.strokes.map((_, index) => (
          <button
            key={index}
            onClick={() => goToStroke(index)}
            className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
              index < currentStroke 
                ? 'bg-primary text-primary-foreground shadow-sm' 
                : index === currentStroke 
                  ? 'bg-primary/20 text-primary border-2 border-primary ring-2 ring-primary/20'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {index + 1}
          </button>
        ))}
      </div>
    </div>
  );
};

export default AdvancedStrokeOrder;
