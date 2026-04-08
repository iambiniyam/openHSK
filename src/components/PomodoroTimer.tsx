import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, Pause, RotateCcw, Coffee, Brain } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

type TimerMode = 'focus' | 'shortBreak' | 'longBreak';

interface PomodoroTimerProps {
  onSessionComplete?: (mode: TimerMode, duration: number) => void;
}

const MODES: Record<TimerMode, { label: string; minutes: number; icon: typeof Brain }> = {
  focus: { label: 'Focus', minutes: 25, icon: Brain },
  shortBreak: { label: 'Short Break', minutes: 5, icon: Coffee },
  longBreak: { label: 'Long Break', minutes: 15, icon: Coffee },
};

export const PomodoroTimer = ({ onSessionComplete }: PomodoroTimerProps) => {
  const [mode, setMode] = useState<TimerMode>('focus');
  const [timeLeft, setTimeLeft] = useState(MODES.focus.minutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);

  const currentMode = MODES[mode];
  const totalTime = currentMode.minutes * 60;
  const progress = ((totalTime - timeLeft) / totalTime) * 100;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const switchMode = useCallback((newMode: TimerMode) => {
    setMode(newMode);
    setTimeLeft(MODES[newMode].minutes * 60);
    setIsRunning(false);
  }, []);

  const reset = () => {
    setTimeLeft(currentMode.minutes * 60);
    setIsRunning(false);
  };

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  useEffect(() => {
    if (!isRunning || timeLeft <= 0) {
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => Math.max(prev - 1, 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  useEffect(() => {
    if (timeLeft !== 0) {
      return;
    }

    const timeout = setTimeout(() => {
      setIsRunning(false);

      if (onSessionComplete) {
        onSessionComplete(mode, totalTime);
      }

      if (mode === 'focus') {
        const newCompleted = completedSessions + 1;
        setCompletedSessions(newCompleted);
        switchMode(newCompleted % 4 === 0 ? 'longBreak' : 'shortBreak');
      } else {
        switchMode('focus');
      }
    }, 0);

    return () => clearTimeout(timeout);
  }, [timeLeft, mode, totalTime, completedSessions, onSessionComplete, switchMode]);

  const ModeIcon = currentMode.icon;

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ModeIcon className="w-5 h-5" />
          {currentMode.label}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mode selector */}
        <div className="flex gap-1 p-1 bg-muted rounded-lg">
          {(Object.keys(MODES) as TimerMode[]).map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-md transition-colors ${
                mode === m
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {MODES[m].label}
            </button>
          ))}
        </div>

        {/* Timer display */}
        <div className="text-center">
          <div className={`text-5xl font-bold tabular-nums ${
            isRunning ? 'text-primary' : 'text-foreground'
          }`}>
            {formatTime(timeLeft)}
          </div>
          <Progress value={progress} className="mt-3 h-2" />
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-2">
          <Button
            variant={isRunning ? 'secondary' : 'default'}
            size="sm"
            onClick={toggleTimer}
          >
            {isRunning ? (
              <><Pause className="w-4 h-4 mr-2" /> Pause</>
            ) : (
              <><Play className="w-4 h-4 mr-2" /> Start</>
            )}
          </Button>
          <Button variant="outline" size="icon" onClick={reset}>
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>

        {/* Session counter */}
        <div className="text-center text-sm text-muted-foreground">
          <span className="font-medium">{completedSessions}</span> focus session{completedSessions !== 1 ? 's' : ''} completed
        </div>
      </CardContent>
    </Card>
  );
};

export default PomodoroTimer;
