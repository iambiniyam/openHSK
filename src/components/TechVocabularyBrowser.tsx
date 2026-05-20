import { useState, useMemo, useCallback } from 'react';

import {
  Search, Filter, Hash, X, Volume2, BookOpen, Lightbulb,
  Smartphone, FlaskConical, Car, ClipboardCheck, Users, Code2,
  Server, Database, Cloud, Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

import { Separator } from '@/components/ui/separator';
import { Empty, EmptyContent, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { ttsService } from '@/services/ttsService';
import type { TechVocabTerm, TechVocabCategory } from '@/types/professional';

interface TechVocabularyBrowserProps {
  terms: TechVocabTerm[];
  categories: TechVocabCategory[];
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  android_aosp: <Smartphone className="w-4 h-4" />,
  testing_qa: <FlaskConical className="w-4 h-4" />,
  automotive: <Car className="w-4 h-4" />,
  cdd_compliance: <ClipboardCheck className="w-4 h-4" />,
  team_comm: <Users className="w-4 h-4" />,
  general_se: <Code2 className="w-4 h-4" />,
  devops: <Server className="w-4 h-4" />,
  data: <Database className="w-4 h-4" />,
  cloud: <Cloud className="w-4 h-4" />,
  security: <Shield className="w-4 h-4" />,
};

const HSK_COLORS: Record<number, string> = {
  1: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  2: 'bg-sky-500/10 text-sky-600 border-sky-500/20',
  3: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  4: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  5: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
  6: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
};

export default function TechVocabularyBrowser({ terms, categories }: TechVocabularyBrowserProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredTerms = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return terms.filter((term) => {
      if (activeCategory !== 'all' && term.category !== activeCategory) return false;
      if (!q) return true;
      return (
        term.english.toLowerCase().includes(q) ||
        term.chinese.includes(q) ||
        term.pinyin.toLowerCase().includes(q) ||
        term.abbreviation?.toLowerCase().includes(q) ||
        term.definition_en.toLowerCase().includes(q)
      );
    });
  }, [terms, activeCategory, searchQuery]);

  const handleSpeak = useCallback((text: string) => {
    ttsService.speak(text);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-primary" />
          Technical Vocabulary
        </h2>
        <p className="text-muted-foreground text-sm">
          Software engineering, Android, automotive, and workplace terms in Chinese
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(activeCategory === cat.id ? 'all' : cat.id)}
            className={`p-3 rounded-xl border text-left transition-all ${
              activeCategory === cat.id
                ? 'border-primary bg-primary/5 shadow-sm'
                : 'border-border/50 hover:border-primary/20 hover:bg-muted/30'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className={activeCategory === cat.id ? 'text-primary' : 'text-muted-foreground'}>
                {CATEGORY_ICONS[cat.id] || <Hash className="w-4 h-4" />}
              </span>
              <span className="text-xs font-medium truncate">{cat.label_en}</span>
            </div>
            <div className="text-lg font-bold">{cat.term_count}</div>
            <div className="text-[10px] text-muted-foreground truncate">{cat.label_zh}</div>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search terms (English, Chinese, pinyin, abbreviation)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 pr-10"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {filteredTerms.length} of {terms.length} terms
          {activeCategory !== 'all' && (
            <span> in {categories.find((c) => c.id === activeCategory)?.label_en}</span>
          )}
        </span>
        {activeCategory !== 'all' && (
          <Button variant="ghost" size="sm" onClick={() => setActiveCategory('all')}>
            <Filter className="w-3 h-3 mr-1" /> Clear filter
          </Button>
        )}
      </div>

      {/* Terms grid */}
      {filteredTerms.length === 0 ? (
        <Empty>
          <EmptyContent>
            <EmptyTitle>No terms found</EmptyTitle>
            <EmptyDescription>Try a different search or category filter</EmptyDescription>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid gap-3">
            {filteredTerms.map((term) => {
              const isExpanded = expandedId === term.id;
              const cat = categories.find((c) => c.id === term.category);
              const hskClass = HSK_COLORS[term.hsk_level_estimate] || HSK_COLORS[4];

              return (
                  <Card
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      isExpanded ? 'border-primary/30 shadow-sm' : ''
                    }`}
                    onClick={() => setExpandedId(isExpanded ? null : term.id)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-lg font-bold">{term.chinese}</h3>
                            <Badge variant="outline" className={`text-xs ${hskClass}`}>
                              HSK ~{term.hsk_level_estimate}
                            </Badge>
                            {term.abbreviation && (
                              <Badge variant="secondary" className="text-xs">
                                {term.abbreviation}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">{term.english}</span>
                            <span className="text-xs">·</span>
                            <span className="text-xs">{term.pinyin}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSpeak(term.chinese);
                            }}
                          >
                            <Volume2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      {cat && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                          {CATEGORY_ICONS[cat.id] || <Hash className="w-3 h-3" />}
                          {cat.label_en}
                        </div>
                      )}
                    </CardHeader>

                    {isExpanded && (
                          <CardContent className="pt-0 space-y-4">
                            <Separator />

                            {/* Definitions */}
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm font-medium">
                                <Lightbulb className="w-4 h-4 text-amber-500" />
                                Definitions
                              </div>
                              <div className="grid gap-2 sm:grid-cols-2">
                                <div className="p-3 rounded-lg bg-muted/50">
                                  <div className="text-xs text-muted-foreground mb-1">English</div>
                                  <p className="text-sm">{term.definition_en}</p>
                                </div>
                                <div className="p-3 rounded-lg bg-muted/50">
                                  <div className="text-xs text-muted-foreground mb-1">中文</div>
                                  <p className="text-sm">{term.definition_zh}</p>
                                </div>
                              </div>
                            </div>

                            {/* Example */}
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm font-medium">
                                <BookOpen className="w-4 h-4 text-primary" />
                                Example
                              </div>
                              <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 space-y-2">
                                <p className="text-base font-medium">{term.example_zh}</p>
                                <p className="text-sm text-muted-foreground">{term.example_pinyin}</p>
                                <p className="text-sm">{term.example_en}</p>
                              </div>
                            </div>
                          </CardContent>
                    )}
                  </Card>
              );
            })}
        </div>
      )}
    </div>
  );
}
