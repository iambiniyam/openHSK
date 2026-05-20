import { useState, useMemo } from 'react';

import {
  MessageSquare, Volume2, ChevronRight, Users, Hash,
  CalendarDays, ClipboardList, Lightbulb, AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import { Empty, EmptyContent, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { ttsService } from '@/services/ttsService';
import type { DialogueScenario, DialogueLine } from '@/types/professional';

interface WorkplaceDialogueViewerProps {
  scenarios: DialogueScenario[];
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  meeting: <CalendarDays className="w-4 h-4" />,
  review: <ClipboardList className="w-4 h-4" />,
  planning: <Lightbulb className="w-4 h-4" />,
  technical: <Sparkles className="w-4 h-4" />,
  incident: <AlertTriangle className="w-4 h-4" />,
};

const CATEGORY_LABELS: Record<string, string> = {
  meeting: 'Meetings',
  review: 'Reviews',
  planning: 'Planning',
  technical: 'Technical',
  incident: 'Incidents',
};

function DialogueLineCard({ line, index }: { line: DialogueLine; index: number }) {
  const [showPinyin] = useState(true);
  const [showEnglish] = useState(true);

  const isEven = index % 2 === 0;

  return (
    <div className={`flex gap-3 ${isEven ? '' : 'flex-row-reverse'}`}>
      <div className={`flex-1 max-w-[85%] ${isEven ? '' : 'text-right'}`}>
        <div className={`inline-flex items-center gap-2 mb-1 ${isEven ? '' : 'flex-row-reverse'}`}>
          <Badge variant="outline" className="text-xs font-normal">
            {line.speaker}
          </Badge>
          <span className="text-[10px] text-muted-foreground">{line.role}</span>
        </div>
        <div
          className={`p-3 rounded-xl text-sm leading-relaxed ${
            isEven
              ? 'bg-primary/5 border border-primary/10 rounded-tl-sm'
              : 'bg-muted border border-border/50 rounded-tr-sm'
          }`}
        >
          <p className="text-base font-medium mb-1">{line.chinese}</p>
          {showPinyin && (
            <p className="text-xs text-muted-foreground mb-1">{line.pinyin}</p>
          )}
          {showEnglish && (
            <p className="text-xs text-foreground/80">{line.english}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function WorkplaceDialogueViewer({ scenarios }: WorkplaceDialogueViewerProps) {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const categories = useMemo(() => {
    const set = new Set(scenarios.map((s) => s.category));
    return [...set];
  }, [scenarios]);

  const filteredScenarios = useMemo(() => {
    if (activeCategory === 'all') return scenarios;
    return scenarios.filter((s) => s.category === activeCategory);
  }, [scenarios, activeCategory]);

  const selectedScenario = scenarios.find((s) => s.id === selectedScenarioId);

  const handleSpeakLine = (text: string) => {
    ttsService.speak(text);
  };

  const handleSpeakAll = (lines: DialogueLine[]) => {
    const text = lines.map((l) => l.chinese).join('。');
    ttsService.speak(text);
  };

  if (selectedScenario) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => setSelectedScenarioId(null)}>
            <ChevronRight className="w-4 h-4 mr-1 rotate-180" /> Back to Scenarios
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleSpeakAll(selectedScenario.lines)}>
            <Volume2 className="w-4 h-4 mr-1" /> Play All
          </Button>
        </div>

        <div className="space-y-1">
          <h2 className="text-xl font-bold">{selectedScenario.title_en}</h2>
          <p className="text-sm text-muted-foreground">{selectedScenario.title_zh}</p>
          <p className="text-sm">{selectedScenario.description_en}</p>
        </div>

        {/* Dialogue */}
        <Card>
          <CardContent className="p-4 space-y-4">
            {selectedScenario.lines.map((line, i) => (
              <DialogueLineCard key={i} line={line} index={i} />
            ))}
          </CardContent>
        </Card>

        {/* Key Vocabulary */}
        {selectedScenario.key_vocabulary.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Hash className="w-4 h-4 text-primary" />
              Key Vocabulary
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {selectedScenario.key_vocabulary.map((vocab, i) => (
                <Card key={i} className="cursor-pointer hover:border-primary/30 transition-colors"
                  onClick={() => handleSpeakLine(vocab.chinese)}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{vocab.chinese}</p>
                        <p className="text-xs text-muted-foreground">{vocab.pinyin}</p>
                      </div>
                      <Volume2 className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <p className="text-xs mt-1">{vocab.english}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 italic">{vocab.context}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-primary" />
          Workplace Dialogues
        </h2>
        <p className="text-muted-foreground text-sm">
          Realistic conversations for software engineering teams in Chinese tech companies
        </p>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={activeCategory === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveCategory('all')}
        >
          All
        </Button>
        {categories.map((cat) => (
          <Button
            key={cat}
            variant={activeCategory === cat ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveCategory(cat)}
            className="gap-1"
          >
            {CATEGORY_ICONS[cat] || <Hash className="w-3 h-3" />}
            {CATEGORY_LABELS[cat] || cat}
          </Button>
        ))}
      </div>

      {/* Scenario cards */}
      {filteredScenarios.length === 0 ? (
        <Empty>
          <EmptyContent>
            <EmptyTitle>No scenarios found</EmptyTitle>
            <EmptyDescription>Try a different category filter</EmptyDescription>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
            {filteredScenarios.map((scenario) => (
              <div key={scenario.id}>
                <Card
                  className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all h-full"
                  onClick={() => setSelectedScenarioId(scenario.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{scenario.title_en}</h3>
                        <p className="text-sm text-muted-foreground">{scenario.title_zh}</p>
                      </div>
                      {CATEGORY_ICONS[scenario.category] || <Hash className="w-4 h-4 text-muted-foreground shrink-0" />}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                      {scenario.description_en}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {scenario.lines.length} lines
                      </span>
                      <span className="flex items-center gap-1">
                        <Hash className="w-3 h-3" />
                        {scenario.key_vocabulary.length} key terms
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
