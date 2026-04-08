import { useMemo, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Target, TrendingUp, Clock, BookOpen, Edit3, CheckCircle2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';

interface DailyGoal {
  type: 'newWords' | 'reviewWords' | 'studyTime' | 'quizzes' | 'writing';
  label: string;
  icon: typeof Target;
  target: number;
  current: number;
  unit: string;
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

const DEFAULT_GOALS: DailyGoal[] = [
  { type: 'newWords', label: 'New Words', icon: BookOpen, target: 10, current: 0, unit: 'words' },
  { type: 'reviewWords', label: 'Review Words', icon: CheckCircle2, target: 20, current: 0, unit: 'words' },
  { type: 'studyTime', label: 'Study Time', icon: Clock, target: 30, current: 0, unit: 'min' },
  { type: 'quizzes', label: 'Quizzes', icon: TrendingUp, target: 3, current: 0, unit: 'quizzes' },
  { type: 'writing', label: 'Writing Practice', icon: Edit3, target: 5, current: 0, unit: 'chars' },
];

export const DailyGoals = ({ stats, onUpdateGoals }: DailyGoalsProps) => {
  const getCurrentProgress = useCallback((type: DailyGoal['type'], currentStats: DailyGoalsProps['stats']): number => {
    switch (type) {
      case 'newWords': return currentStats.newWordsLearned;
      case 'reviewWords': return currentStats.wordsReviewed;
      case 'studyTime': return currentStats.studyTimeMinutes;
      case 'quizzes': return currentStats.quizzesCompleted;
      case 'writing': return currentStats.writingExercises;
      default: return 0;
    }
  }, []);

  const mergeWithDefaults = useCallback((savedGoals: Partial<DailyGoal>[]): DailyGoal[] => {
    return DEFAULT_GOALS.map((defaultGoal) => {
      const savedGoal = savedGoals.find((goal) => goal.type === defaultGoal.type);
      return {
        ...defaultGoal,
        ...savedGoal,
        icon: defaultGoal.icon,
      };
    });
  }, []);

  const loadSavedGoals = useCallback((): DailyGoal[] => {
    try {
      const saved = localStorage.getItem('hsk_daily_goals');
      if (!saved) {
        return DEFAULT_GOALS;
      }
      return mergeWithDefaults(JSON.parse(saved) as Partial<DailyGoal>[]);
    } catch {
      return DEFAULT_GOALS;
    }
  }, [mergeWithDefaults]);

  const [savedGoals, setSavedGoals] = useState<DailyGoal[]>(() => loadSavedGoals());
  const [showSettings, setShowSettings] = useState(false);
  const [tempGoals, setTempGoals] = useState<DailyGoal[]>(savedGoals);

  const goals = useMemo(() => {
    return savedGoals.map((goal) => ({
      ...goal,
      current: getCurrentProgress(goal.type, stats),
    }));
  }, [savedGoals, stats, getCurrentProgress]);

  const saveGoals = () => {
    setSavedGoals(tempGoals);
    localStorage.setItem('hsk_daily_goals', JSON.stringify(tempGoals));
    setShowSettings(false);
    if (onUpdateGoals) {
      onUpdateGoals(tempGoals);
    }
  };

  const totalProgress = goals.reduce((sum, g) => sum + Math.min(g.current / g.target, 1), 0) / goals.length;
  const completedGoals = goals.filter(g => g.current >= g.target).length;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Daily Goals
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setTempGoals(savedGoals);
              setShowSettings(true);
            }}
          >
            Edit
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Overall progress */}
          <div className="text-center">
            <div className="text-3xl font-bold">{Math.round(totalProgress * 100)}%</div>
            <div className="text-sm text-muted-foreground">
              {completedGoals} of {goals.length} goals completed
            </div>
            <Progress value={totalProgress * 100} className="mt-2 h-2" />
          </div>

          {/* Individual goals */}
          <div className="space-y-3">
            {goals.map((goal) => {
              const Icon = goal.icon;
              const percentage = Math.min((goal.current / goal.target) * 100, 100);
              const isComplete = goal.current >= goal.target;

              return (
                <div key={goal.type} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${isComplete ? 'text-green-500' : 'text-muted-foreground'}`} />
                      <span className={isComplete ? 'text-green-600 font-medium' : ''}>
                        {goal.label}
                      </span>
                    </div>
                    <span className={isComplete ? 'text-green-600 font-medium' : 'text-muted-foreground'}>
                      {goal.current} / {goal.target} {goal.unit}
                    </span>
                  </div>
                  <Progress 
                    value={percentage} 
                    className={`h-1.5 ${isComplete ? 'bg-green-100' : ''}`}
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Daily Goals</DialogTitle>
            <DialogDescription>
              Set your daily learning targets
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {tempGoals.map((goal, index) => (
              <div key={goal.type} className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">{goal.label}</label>
                  <span className="text-sm text-muted-foreground">
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
            <Button variant="outline" onClick={() => setShowSettings(false)}>
              Cancel
            </Button>
            <Button onClick={saveGoals}>
              Save Goals
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DailyGoals;
