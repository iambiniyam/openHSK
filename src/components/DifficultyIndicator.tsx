import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Signal, SignalHigh, SignalMedium, SignalLow } from 'lucide-react';

interface DifficultyIndicatorProps {
  hskLevel?: number;
  strokeCount?: number;
  showLabel?: boolean;
}

export const DifficultyIndicator = ({ 
  hskLevel, 
  strokeCount,
  showLabel = true 
}: DifficultyIndicatorProps) => {
  const getDifficulty = () => {
    if (!hskLevel) return { level: 'unknown', label: 'Unknown', color: 'gray' };
    if (hskLevel <= 2) return { level: 'beginner', label: 'Beginner', color: 'green' };
    if (hskLevel <= 4) return { level: 'intermediate', label: 'Intermediate', color: 'yellow' };
    return { level: 'advanced', label: 'Advanced', color: 'red' };
  };

  const difficulty = getDifficulty();
  
  const getIcon = () => {
    switch (difficulty.level) {
      case 'beginner': return <SignalLow className="w-4 h-4" />;
      case 'intermediate': return <SignalMedium className="w-4 h-4" />;
      case 'advanced': return <SignalHigh className="w-4 h-4" />;
      default: return <Signal className="w-4 h-4" />;
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={`
              cursor-help
              ${difficulty.level === 'beginner' ? 'border-green-500 text-green-600 bg-green-50' : ''}
              ${difficulty.level === 'intermediate' ? 'border-yellow-500 text-yellow-600 bg-yellow-50' : ''}
              ${difficulty.level === 'advanced' ? 'border-red-500 text-red-600 bg-red-50' : ''}
            `}
          >
            {getIcon()}
            {showLabel && <span className="ml-1">{difficulty.label}</span>}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm">
            <p className="font-medium">{difficulty.label} Level</p>
            {hskLevel && <p>HSK Level: {hskLevel}</p>}
            {strokeCount && <p>Stroke Count: {strokeCount}</p>}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default DifficultyIndicator;
