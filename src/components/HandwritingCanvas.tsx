import { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Eraser, Undo, Check, X } from 'lucide-react';

interface HandwritingCanvasProps {
  character: string;
  size?: number;
  onComplete?: (score: number) => void;
}

export const HandwritingCanvas = ({ character, size = 200, onComplete }: HandwritingCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokes, setStrokes] = useState<{ x: number; y: number }[][]>([]);
  const [currentStroke, setCurrentStroke] = useState<{ x: number; y: number }[]>([]);
  const [showGuide, setShowGuide] = useState(true);
  const [feedback, setFeedback] = useState<'none' | 'correct' | 'incorrect'>('none');

  const drawGrid = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.strokeStyle = 'hsl(var(--muted-foreground) / 0.2)';
    ctx.lineWidth = 1;

    // Center cross
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // Diagonals
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(width, height);
    ctx.moveTo(width, 0);
    ctx.lineTo(0, height);
    ctx.stroke();

    // Border
    ctx.strokeRect(2, 2, width - 4, height - 4);

    // Guide character
    if (showGuide) {
      ctx.font = `${width * 0.7}px serif`;
      ctx.fillStyle = 'hsl(var(--muted-foreground) / 0.15)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(character, width / 2, height / 2);
    }
  }, [character, showGuide]);

  const getCoordinates = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }, []);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    setCurrentStroke([{ x, y }]);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    
    const { x, y } = getCoordinates(e);
    setCurrentStroke(prev => [...prev, { x, y }]);
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'hsl(var(--primary))';
    
    const lastPoint = currentStroke[currentStroke.length - 1];
    if (lastPoint) {
      ctx.beginPath();
      ctx.moveTo(lastPoint.x, lastPoint.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentStroke.length > 0) {
      setStrokes(prev => [...prev, currentStroke]);
    }
    setCurrentStroke([]);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid(ctx, canvas.width, canvas.height);
    setStrokes([]);
    setCurrentStroke([]);
    setFeedback('none');
  };

  const undo = () => {
    if (strokes.length === 0) return;
    
    const newStrokes = strokes.slice(0, -1);
    setStrokes(newStrokes);
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid(ctx, canvas.width, canvas.height);
    
    // Redraw all strokes
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'hsl(var(--primary))';
    
    newStrokes.forEach(stroke => {
      if (stroke.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(stroke[i].x, stroke[i].y);
      }
      ctx.stroke();
    });
  };

  const checkDrawing = () => {
    // Simple check - just verify something was drawn
    const totalPoints = strokes.reduce((sum, stroke) => sum + stroke.length, 0);
    const hasDrawing = totalPoints > 10;
    
    setFeedback(hasDrawing ? 'correct' : 'incorrect');
    if (onComplete) {
      onComplete(hasDrawing ? 80 : 20);
    }
    
    setTimeout(() => setFeedback('none'), 2000);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    
    // Set canvas resolution
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);
    
    drawGrid(ctx, size, size);
  }, [size, drawGrid]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={size}
          height={size}
          style={{ width: size, height: size }}
          className={`border-2 border-dashed border-muted-foreground/30 rounded-lg cursor-crosshair touch-none ${
            feedback === 'correct' ? 'ring-2 ring-green-500' : 
            feedback === 'incorrect' ? 'ring-2 ring-red-500' : ''
          }`}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        
        {/* Feedback overlay */}
        {feedback !== 'none' && (
          <div className={`absolute inset-0 flex items-center justify-center rounded-lg ${
            feedback === 'correct' ? 'bg-green-500/20' : 'bg-red-500/20'
          }`}>
            {feedback === 'correct' ? (
              <Check className="w-16 h-16 text-green-600" />
            ) : (
              <X className="w-16 h-16 text-red-600" />
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap justify-center">
        <Button variant="outline" size="sm" onClick={undo} disabled={strokes.length === 0}>
          <Undo className="w-4 h-4 mr-2" />
          Undo
        </Button>
        
        <Button variant="outline" size="sm" onClick={clear}>
          <Eraser className="w-4 h-4 mr-2" />
          Clear
        </Button>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setShowGuide(!showGuide)}
        >
          {showGuide ? 'Hide' : 'Show'} Guide
        </Button>
        
        <Button variant="default" size="sm" onClick={checkDrawing}>
          <Check className="w-4 h-4 mr-2" />
          Check
        </Button>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Trace over the guide character or practice freehand
      </p>
    </div>
  );
};

export default HandwritingCanvas;
