import { useMemo, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Target, TrendingUp, Clock, BookOpen, Edit3, CheckCircle2, Settings2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';

interface DailyGoal {
  type: 'newWords' | 'reviewWords' | 'studyTime' | 'quizzes' | 'writing';
  label: string;
  icon: typeof Target;
  target: number;
  current: number;
  unit: string;
  color: string;
}

interface DailyGoalsProps {
  stats: {
    newWordsLearned: number;
    wordsReviewed: number;
    studyTimeMinutes: number;
    quizzesCompleted: number;
    writingExercises: number;
  };
  onUpdateGoals?: (goals: Partial<DailyGoal>[]) => void;
}

const DEFAULT_GOALS: Omit<DailyGoal, 'current'>[] = [
  { type: 'newWords', label: 'New Words', icon: BookOpen, target: 10, unit: 'words', color: 'text-emerald-600' },
  { type: 'reviewWords', label: 'Review Words', icon: CheckCircle2, target: 20, unit: 'words', color: 'text-blue-600' },
  { type: 'studyTime', label: 'Study Time', icon: Clock, target: 30, unit: 'min', color: 'text-amber-600' },
  { type: 'quizzes', label: 'Quizzes', icon: TrendingUp, target: 3, unit: 'quizzes', color: 'text-violet-600' },
  { type: 'writing', label: 'Writing', icon: Edit3, target: 5, unit: 'chars', color: 'text-rose-600' },
];

function CircularProgress({ percentage, size = 56 }: { percentage: number; size?: number }) {
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/60"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-primary transition-all duration-700 ease-out"
        />
      </svg>
      <span className="absolute text-xs font-bold">{Math.round(percentage)}%</span>
    </div>
  );
}

export const DailyGoals = ({ stats, onUpdateGoals }: DailyGoalsProps) => {
  const getCurrentProgress = useCallback((type: DailyGoal['type']): number => {
    switch (type) {
      case 'newWords': return stats.newWordsLearned;
      case 'reviewWords': return stats.wordsReviewed;
      case 'studyTime': return stats.studyTimeMinutes;
      case 'quizzes': return stats.quizzesCompleted;
      case 'writing': return stats.writingExercises;
      default: return 0;
    }
  }, [stats]);

  const loadSavedGoals = useCallback((): Omit<DailyGoal, 'current'>[] => {
    try {
      const saved = localStorage.getItem('hsk_daily_goals');
      if (!saved) return DEFAULT_GOALS;
      const parsed = JSON.parse(saved) as Partial<DailyGoal>[];
      return DEFAULT_GOALS.map((defaultGoal) => {
        const savedGoal = parsed.find((g) => g.type === defaultGoal.type);
        return { ...defaultGoal, ...savedGoal };
      });
    } catch {
      return DEFAULT_GOALS;
    }
  }, []);

  const [savedGoals, setSavedGoals] = useState<Omit<DailyGoal, 'current'>[]>(() => loadSavedGoals());
  const [showSettings, setShowSettings] = useState(false);
  const [tempGoals, setTempGoals] = useState<Omit<DailyGoal, 'current'>[]>(savedGoals);

  const goals = useMemo((): DailyGoal[] => {
    return savedGoals.map((goal) => ({
      ...goal,
      current: getCurrentProgress(goal.type),
    }));
  }, [savedGoals, getCurrentProgress]);

  const saveGoals = () => {
    setSavedGoals(tempGoals);
    try {
      localStorage.setItem('hsk_daily_goals', JSON.stringify(tempGoals));
    } catch { /* ignore */ }
    setShowSettings(false);
    if (onUpdateGoals) onUpdateGoals(tempGoals);
  };

  const totalProgress = goals.reduce((sum, g) => sum + Math.min(g.current / g.target, 1), 0) / goals.length;
  const completedGoals = goals.filter((g) => g.current >= g.target).length;

  return (
    <>
      <Card className="overflow-hidden">
        <CardContent className="p-5">
          {/* Header with circular progress */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <CircularProgress percentage={totalProgress * 100} />
              <div>
                <h3 className="font-semibold text-sm tracking-tight">Daily Goals</h3>
                <p className="text-xs text-muted-foreground">
                  {completedGoals} of {goals.length} completed
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 rounded-lg"
              onClick={() => {
                setTempGoals(savedGoals);
                setShowSettings(true);
              }}
              aria-label="Edit daily goals"
            >
              <Settings2 className="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>

          {/* Individual goals */}
          <div className="space-y-3.5">
            {goals.map((goal) => {
              const Icon = goal.icon;
              const percentage = Math.min((goal.current / goal.target) * 100, 100);
              const isComplete = goal.current >= goal.target;

              return (
                <div key={goal.type} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-3.5 h-3.5 ${isComplete ? 'text-green-500' : 'text-muted-foreground'}`} />
                      <span className={`text-sm ${isComplete ? 'text-green-600 font-medium' : ''}`}>
                        {goal.label}
                      </span>
                    </div>
                    <span className={`text-xs tabular-nums ${isComplete ? 'text-green-600 font-medium' : 'text-muted-foreground'}`}>
                      {goal.current} / {goal.target} {goal.unit}
                    </span>
                  </div>
                  <div className="relative h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out ${
                        isComplete ? 'bg-green-500' : 'bg-primary/70'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-muted-foreground" />
              Edit Daily Goals
            </DialogTitle>
            <DialogDescription>Set your daily learning targets</DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            {tempGoals.map((goal, index) => (
              <div key={goal.type} className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">{goal.label}</label>
                  <span className="text-xs text-muted-foreground tabular-nums bg-muted px-2 py-0.5 rounded-md">
                    {goal.target} {goal.unit}
                  </span>
                </div>
                <Slider
                  value={[goal.target]}
                  onValueChange={([value]) => {
                    const newGoals = [...tempGoals];
                    newGoals[index] = { ...goal, target: value };
                    setTempGoals(newGoals);
                  }}
                  min={1}
                  max={goal.type === 'studyTime' ? 120 : goal.type === 'quizzes' ? 10 : 50}
                  step={1}
                />
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowSettings(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={saveGoals}>Save Goals</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DailyGoals;
