import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  Circle,
  GitBranch,
  Lock,
  Sparkles,
  Target,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { UserStats } from '@/types/hsk';

type HskLevelId = 1 | 2 | 3 | 4 | 5 | 6 | 7;

type GrammarCategory =
  | 'word-order'
  | 'aspect'
  | 'complements'
  | 'connectors'
  | 'discourse';

interface GrammarPoint {
  id: string;
  level: HskLevelId;
  title: string;
  description: string;
  example: string;
  category: GrammarCategory;
  prerequisites: string[];
}

interface GrammarMapProps {
  userStats?: UserStats | null;
}

const GRAMMAR_PROGRESS_STORAGE_KEY = 'openhsk.grammar-progress.v1';

const LEVEL_LABELS: Record<HskLevelId, string> = {
  1: 'HSK 1',
  2: 'HSK 2',
  3: 'HSK 3',
  4: 'HSK 4',
  5: 'HSK 5',
  6: 'HSK 6',
  7: 'HSK 7-9',
};

const CATEGORY_LABELS: Record<GrammarCategory, string> = {
  'word-order': 'Word Order',
  aspect: 'Aspect',
  complements: 'Complements',
  connectors: 'Connectors',
  discourse: 'Discourse',
};

const GRAMMAR_POINTS: GrammarPoint[] = [
  {
    id: 'g1-svo-basic',
    level: 1,
    title: 'Basic SVO Sentences',
    description: 'Build clear subject-verb-object statements for everyday communication.',
    example: '我 学 中文。',
    category: 'word-order',
    prerequisites: [],
  },
  {
    id: 'g1-time-place-order',
    level: 1,
    title: 'Time + Place + Verb Order',
    description: 'Place time and location before the verb phrase naturally.',
    example: '我 明天 在 学校 学习。',
    category: 'word-order',
    prerequisites: ['g1-svo-basic'],
  },
  {
    id: 'g1-ma-question',
    level: 1,
    title: '吗 Yes/No Questions',
    description: 'Turn statements into yes/no questions with sentence-final 吗.',
    example: '你 是 老师 吗？',
    category: 'connectors',
    prerequisites: ['g1-svo-basic'],
  },
  {
    id: 'g1-de-possession',
    level: 1,
    title: '的 Possession Modifier',
    description: 'Use 的 to link owner and noun or add simple description.',
    example: '这是 我 的 书。',
    category: 'word-order',
    prerequisites: ['g1-svo-basic'],
  },
  {
    id: 'g2-zai-progressive',
    level: 2,
    title: '在 Ongoing Actions',
    description: 'Express actions currently in progress with 在 + verb.',
    example: '我 在 看 书。',
    category: 'aspect',
    prerequisites: ['g1-time-place-order'],
  },
  {
    id: 'g2-le-perfective',
    level: 2,
    title: '了 Completed Actions',
    description: 'Mark completed events and changes of state with 了.',
    example: '我 吃 了 早饭。',
    category: 'aspect',
    prerequisites: ['g1-svo-basic'],
  },
  {
    id: 'g2-serial-verb',
    level: 2,
    title: 'Serial Verb Patterns',
    description: 'Chain actions in one sentence without repeating subjects.',
    example: '我 去 商店 买 水。',
    category: 'word-order',
    prerequisites: ['g1-time-place-order'],
  },
  {
    id: 'g2-resultative',
    level: 2,
    title: 'Resultative Complements',
    description: 'Add result after verbs to show outcome clearly.',
    example: '我 看懂 了。',
    category: 'complements',
    prerequisites: ['g2-serial-verb', 'g2-le-perfective'],
  },
  {
    id: 'g2-ba-basic',
    level: 2,
    title: '把 Basic Disposal',
    description: 'Move the object before the verb to highlight handling/disposal.',
    example: '我 把 门 关上 了。',
    category: 'word-order',
    prerequisites: ['g2-resultative'],
  },
  {
    id: 'g3-bi-comparison',
    level: 3,
    title: '比 Comparisons',
    description: 'Compare two things with 比 in natural spoken Chinese.',
    example: '今天 比 昨天 热。',
    category: 'connectors',
    prerequisites: ['g1-svo-basic'],
  },
  {
    id: 'g3-potential-complement',
    level: 3,
    title: 'Potential Complements',
    description: 'Use 得/不 + complement for ability/possibility statements.',
    example: '这本 书 我 看得懂。',
    category: 'complements',
    prerequisites: ['g2-resultative'],
  },
  {
    id: 'g3-lian-even',
    level: 3,
    title: '连...都/也 Emphasis',
    description: 'Emphasize surprising cases with 连...都/也 structures.',
    example: '他 连 中文 都 会 说。',
    category: 'connectors',
    prerequisites: ['g2-serial-verb'],
  },
  {
    id: 'g3-particle-tone',
    level: 3,
    title: 'Sentence-final Tone Particles',
    description: 'Control tone and attitude with 呢, 吧, 啊 in context.',
    example: '你 去 吧。',
    category: 'discourse',
    prerequisites: ['g1-ma-question'],
  },
  {
    id: 'g4-passive-bei',
    level: 4,
    title: '被 Passive Sentences',
    description: 'Describe passive events and external impact using 被.',
    example: '手机 被 我 忘 在 家里 了。',
    category: 'word-order',
    prerequisites: ['g2-ba-basic'],
  },
  {
    id: 'g4-concession',
    level: 4,
    title: '虽然...但是 Concession',
    description: 'Build balanced contrast and concession statements.',
    example: '虽然 下雨， 但是 我们 还是 去。',
    category: 'connectors',
    prerequisites: ['g3-lian-even'],
  },
  {
    id: 'g4-topic-comment',
    level: 4,
    title: 'Topic-comment Fronting',
    description: 'Promote known information as topic for fluent discourse.',
    example: '这件 事， 我 已经 知道 了。',
    category: 'discourse',
    prerequisites: ['g3-bi-comparison'],
  },
  {
    id: 'g4-complex-complements',
    level: 4,
    title: 'Complex Verb Complements',
    description: 'Combine direction, result, and degree complements correctly.',
    example: '他 说得 很 清楚。',
    category: 'complements',
    prerequisites: ['g3-potential-complement'],
  },
  {
    id: 'g5-nominalization',
    level: 5,
    title: 'Nominalization with 的',
    description: 'Turn clauses into noun phrases for formal expression.',
    example: '你 说 的 我 都 记得。',
    category: 'discourse',
    prerequisites: ['g4-topic-comment'],
  },
  {
    id: 'g5-advanced-connectors',
    level: 5,
    title: 'Advanced Logical Connectors',
    description: 'Use 因而, 以至于, 即使, 尽管 for precise logic.',
    example: '即使 很 累， 他 也 坚持 练习。',
    category: 'connectors',
    prerequisites: ['g4-concession'],
  },
  {
    id: 'g5-reference-ellipsis',
    level: 5,
    title: 'Reference and Ellipsis',
    description: 'Drop recoverable words while keeping cohesion and clarity.',
    example: '我 先 走， 你 呢？',
    category: 'discourse',
    prerequisites: ['g3-particle-tone', 'g4-topic-comment'],
  },
  {
    id: 'g5-rhetorical',
    level: 5,
    title: 'Rhetorical Questions',
    description: 'Use 不是...吗 and related forms for argument emphasis.',
    example: '这 不是 你 说 的 吗？',
    category: 'discourse',
    prerequisites: ['g3-particle-tone'],
  },
  {
    id: 'g6-formal-style',
    level: 6,
    title: 'Formal and Written Style',
    description: 'Handle denser sentence structures for advanced texts.',
    example: '鉴于 当前 情况， 我们 需要 调整 方案。',
    category: 'discourse',
    prerequisites: ['g5-nominalization', 'g5-advanced-connectors'],
  },
  {
    id: 'g6-multi-clause',
    level: 6,
    title: 'Multi-clause Argument Flow',
    description: 'Compose layered cause-effect-contrast structures naturally.',
    example: '由于 时间 有限， 所以 我们 先 讨论 核心 问题。',
    category: 'connectors',
    prerequisites: ['g5-advanced-connectors'],
  },
  {
    id: 'g6-inversion',
    level: 6,
    title: 'Inversion and Emphasis',
    description: 'Use inversion for literary emphasis and nuanced tone.',
    example: '如此 美景， 怎能 错过？',
    category: 'discourse',
    prerequisites: ['g5-rhetorical'],
  },
  {
    id: 'g6-precision-aspect',
    level: 6,
    title: 'Aspect Nuance Precision',
    description: 'Differentiate subtle aspect and state transitions accurately.',
    example: '他 早 就 吃 过 了。',
    category: 'aspect',
    prerequisites: ['g2-le-perfective', 'g3-potential-complement'],
  },
  {
    id: 'g7-academic',
    level: 7,
    title: 'Academic Discourse Structures',
    description: 'Organize thesis-support-conclusion flow in advanced contexts.',
    example: '基于 以上 分析， 可以 得出 以下 结论。',
    category: 'discourse',
    prerequisites: ['g6-formal-style', 'g6-multi-clause'],
  },
  {
    id: 'g7-argumentation',
    level: 7,
    title: 'Argumentation and Counterpoints',
    description: 'Build and refute viewpoints with high coherence.',
    example: '与其 说 A， 不如 说 B 更 贴切。',
    category: 'connectors',
    prerequisites: ['g7-academic', 'g6-inversion'],
  },
  {
    id: 'g7-rhetorical-cohesion',
    level: 7,
    title: 'Rhetorical Cohesion',
    description: 'Control register, transitions, and rhetorical rhythm at scale.',
    example: '不仅 如此， 更 重要 的 是...。',
    category: 'discourse',
    prerequisites: ['g7-academic', 'g6-precision-aspect'],
  },
];

const GRAMMAR_ID_SET = new Set(GRAMMAR_POINTS.map((point) => point.id));

const getRecommendedLevel = (userStats?: UserStats | null): HskLevelId => {
  if (!userStats?.levelProgress) return 3;

  let highestStable = 1;
  for (let level = 1; level <= 6; level += 1) {
    const current = userStats.levelProgress[level];
    if (!current || current.total <= 0) continue;

    const ratio = current.studied / current.total;
    if (ratio >= 0.72) {
      highestStable = level;
    }
  }

  const next = Math.min(highestStable + 1, 7);
  return next as HskLevelId;
};

const loadMasteredSet = (): Set<string> => {
  if (typeof window === 'undefined') return new Set<string>();

  try {
    const raw = window.localStorage.getItem(GRAMMAR_PROGRESS_STORAGE_KEY);
    if (!raw) return new Set<string>();

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set<string>();

    return new Set(
      parsed.filter((id): id is string => typeof id === 'string' && GRAMMAR_ID_SET.has(id)),
    );
  } catch {
    return new Set<string>();
  }
};

export const GrammarMap = ({ userStats }: GrammarMapProps) => {
  const recommendedLevel = useMemo(() => getRecommendedLevel(userStats), [userStats]);
  const [manualLevel, setManualLevel] = useState<HskLevelId | null>(null);
  const selectedLevel = manualLevel ?? recommendedLevel;
  const [masteredSet, setMasteredSet] = useState<Set<string>>(() => loadMasteredSet());
  const [selectedNodeId, setSelectedNodeId] = useState<string>('g1-svo-basic');
  const mapWrapperRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  const pointsById = useMemo(() => {
    return new Map(GRAMMAR_POINTS.map((point) => [point.id, point] as const));
  }, []);

  const dependentsById = useMemo(() => {
    const dependents = new Map<string, string[]>();

    for (const point of GRAMMAR_POINTS) {
      for (const prerequisite of point.prerequisites) {
        const bucket = dependents.get(prerequisite) || [];
        bucket.push(point.id);
        dependents.set(prerequisite, bucket);
      }
    }

    return dependents;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const payload = JSON.stringify(Array.from(masteredSet));
    window.localStorage.setItem(GRAMMAR_PROGRESS_STORAGE_KEY, payload);
  }, [masteredSet]);

  useEffect(() => {
    const element = mapWrapperRef.current;
    if (!element) return;

    const updateSize = () => {
      setContainerWidth(element.clientWidth);
    };

    updateSize();

    if (typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const levelPoints = useMemo(() => {
    return GRAMMAR_POINTS.filter((point) => point.level === selectedLevel);
  }, [selectedLevel]);

  const visibleIds = useMemo(() => {
    const ids = new Set<string>();

    const includeWithPrerequisites = (id: string) => {
      if (ids.has(id)) return;
      ids.add(id);
      const point = pointsById.get(id);
      if (!point) return;
      for (const prerequisite of point.prerequisites) {
        includeWithPrerequisites(prerequisite);
      }
    };

    for (const point of levelPoints) {
      includeWithPrerequisites(point.id);
    }

    return ids;
  }, [levelPoints, pointsById]);

  const visiblePoints = useMemo(() => {
    return Array.from(visibleIds)
      .map((id) => pointsById.get(id))
      .filter((point): point is GrammarPoint => Boolean(point))
      .sort((a, b) => a.level - b.level || a.title.localeCompare(b.title));
  }, [visibleIds, pointsById]);

  const depthById = useMemo(() => {
    const cache = new Map<string, number>();

    const visit = (id: string): number => {
      const cached = cache.get(id);
      if (cached !== undefined) return cached;

      const point = pointsById.get(id);
      if (!point) {
        cache.set(id, 0);
        return 0;
      }

      const prerequisitesInScope = point.prerequisites.filter((prerequisite) => visibleIds.has(prerequisite));
      const depth =
        prerequisitesInScope.length === 0
          ? 0
          : Math.max(...prerequisitesInScope.map((prerequisite) => visit(prerequisite))) + 1;

      cache.set(id, depth);
      return depth;
    };

    for (const point of visiblePoints) {
      visit(point.id);
    }

    return cache;
  }, [pointsById, visibleIds, visiblePoints]);

  const columns = useMemo(() => {
    const grouped = new Map<number, GrammarPoint[]>();

    for (const point of visiblePoints) {
      const depth = depthById.get(point.id) || 0;
      const bucket = grouped.get(depth) || [];
      bucket.push(point);
      grouped.set(depth, bucket);
    }

    return Array.from(grouped.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([depth, points]) => ({
        depth,
        points: points.sort((a, b) => a.level - b.level || a.title.localeCompare(b.title)),
      }));
  }, [depthById, visiblePoints]);

  const isCompact = containerWidth > 0 && containerWidth < 720;
  const nodeWidth = isCompact ? 170 : 214;
  const nodeHeight = isCompact ? 94 : 106;
  const rowGap = isCompact ? 16 : 22;
  const columnGap = isCompact ? 196 : 248;
  const padding = isCompact ? 22 : 28;

  const maxRows = Math.max(1, ...columns.map((column) => column.points.length));
  const calculatedWidth = padding * 2 + Math.max(0, columns.length - 1) * columnGap + nodeWidth;
  const svgWidth = Math.max(calculatedWidth, containerWidth > 0 ? containerWidth - 4 : calculatedWidth);
  const svgHeight = Math.max(
    padding * 2 + maxRows * nodeHeight + Math.max(0, maxRows - 1) * rowGap,
    isCompact ? 340 : 420,
  );

  const positionById = useMemo(() => {
    const positions = new Map<string, { x: number; y: number }>();

    columns.forEach((column, columnIndex) => {
      const laneHeight = column.points.length * nodeHeight + Math.max(0, column.points.length - 1) * rowGap;
      const startY = padding + Math.max(0, (svgHeight - padding * 2 - laneHeight) / 2);

      column.points.forEach((point, rowIndex) => {
        positions.set(point.id, {
          x: padding + columnIndex * columnGap,
          y: startY + rowIndex * (nodeHeight + rowGap),
        });
      });
    });

    return positions;
  }, [columns, nodeHeight, padding, rowGap, svgHeight, columnGap]);

  const edges = useMemo(() => {
    const links: Array<{ from: string; to: string }> = [];

    for (const point of visiblePoints) {
      for (const prerequisite of point.prerequisites) {
        if (visibleIds.has(prerequisite)) {
          links.push({ from: prerequisite, to: point.id });
        }
      }
    }

    return links;
  }, [visibleIds, visiblePoints]);

  const isUnlocked = useMemo(() => {
    return (point: GrammarPoint): boolean => {
      return point.prerequisites.every((prerequisite) => masteredSet.has(prerequisite));
    };
  }, [masteredSet]);

  const selectedPoint = useMemo(() => {
    if (visibleIds.has(selectedNodeId)) {
      return pointsById.get(selectedNodeId) || levelPoints[0] || GRAMMAR_POINTS[0];
    }

    const preferred = levelPoints.find((point) => !masteredSet.has(point.id) && isUnlocked(point));
    return preferred || levelPoints[0] || GRAMMAR_POINTS[0];
  }, [isUnlocked, levelPoints, masteredSet, pointsById, selectedNodeId, visibleIds]);

  const activeNodeId = selectedPoint.id;
  const missingPrerequisites = selectedPoint.prerequisites.filter((prerequisite) => !masteredSet.has(prerequisite));
  const selectedIsMastered = masteredSet.has(selectedPoint.id);
  const selectedIsUnlocked = missingPrerequisites.length === 0;

  const levelCompletedCount = levelPoints.filter((point) => masteredSet.has(point.id)).length;
  const levelUnlockedCount = levelPoints.filter((point) => isUnlocked(point)).length;
  const levelProgress =
    levelPoints.length > 0 ? Math.round((levelCompletedCount / levelPoints.length) * 100) : 0;

  const handleToggleMastered = (pointId: string) => {
    setMasteredSet((previous) => {
      const next = new Set(previous);

      if (next.has(pointId)) {
        const queue = [pointId];
        const removed = new Set<string>();

        while (queue.length > 0) {
          const current = queue.shift();
          if (!current || removed.has(current)) continue;

          removed.add(current);
          next.delete(current);

          const dependents = dependentsById.get(current) || [];
          for (const dependent of dependents) {
            if (next.has(dependent)) {
              queue.push(dependent);
            }
          }
        }

        return next;
      }

      const point = pointsById.get(pointId);
      if (!point) return next;

      const unlocked = point.prerequisites.every((prerequisite) => next.has(prerequisite));
      if (!unlocked) {
        return next;
      }

      next.add(pointId);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <GitBranch className="h-5 w-5 text-primary" />
                HSK Grammar Dependency Map
              </CardTitle>
              <CardDescription>
                Visualize prerequisites, unlock next grammar points, and track mastery by level.
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                <Sparkles className="h-3.5 w-3.5" />
                Recommended: {LEVEL_LABELS[recommendedLevel]}
              </Badge>

              <Select
                value={String(selectedLevel)}
                onValueChange={(value) => {
                  setManualLevel(Number(value) as HskLevelId);
                }}
              >
                <SelectTrigger className="w-[128px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(LEVEL_LABELS) as Array<[string, string]>).map(([level, label]) => (
                    <SelectItem key={level} value={level}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border bg-muted/40 p-3">
              <div className="text-xs text-muted-foreground">Level Completion</div>
              <div className="mt-1 text-2xl font-bold">{levelCompletedCount}/{levelPoints.length}</div>
              <Progress value={levelProgress} className="mt-2 h-2" />
            </div>
            <div className="rounded-xl border bg-muted/40 p-3">
              <div className="text-xs text-muted-foreground">Unlocked Points</div>
              <div className="mt-1 text-2xl font-bold">{levelUnlockedCount}</div>
              <div className="mt-1 text-xs text-muted-foreground">Ready to practice now</div>
            </div>
            <div className="rounded-xl border bg-muted/40 p-3">
              <div className="text-xs text-muted-foreground">Current Focus</div>
              <div className="mt-1 text-base font-semibold line-clamp-2">{selectedPoint.title}</div>
              <div className="mt-1 text-xs text-muted-foreground">{CATEGORY_LABELS[selectedPoint.category]}</div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div ref={mapWrapperRef} className="overflow-x-auto rounded-xl border bg-card/40 p-2 sm:p-3">
            <svg
              width={svgWidth}
              height={svgHeight}
              role="img"
              aria-label="Grammar prerequisite map"
              className="block"
            >
              <defs>
                <filter id="grammarGlow" x="-40%" y="-40%" width="180%" height="180%">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {edges.map((edge) => {
                const from = positionById.get(edge.from);
                const to = positionById.get(edge.to);
                if (!from || !to) return null;

                const fromMidY = from.y + nodeHeight / 2;
                const toMidY = to.y + nodeHeight / 2;
                const fromX = from.x + nodeWidth;
                const toX = to.x;
                const controlDelta = Math.max(26, (toX - fromX) * 0.45);
                const path = `M ${fromX} ${fromMidY} C ${fromX + controlDelta} ${fromMidY}, ${toX - controlDelta} ${toMidY}, ${toX} ${toMidY}`;

                const edgeActive = masteredSet.has(edge.from);

                return (
                  <path
                    key={`${edge.from}-${edge.to}`}
                    d={path}
                    fill="none"
                    stroke={edgeActive ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground) / 0.35)'}
                    strokeWidth={edgeActive ? 2.4 : 1.8}
                    strokeLinecap="round"
                    strokeDasharray={edgeActive ? '0' : '6 6'}
                  />
                );
              })}

              {visiblePoints.map((point) => {
                const position = positionById.get(point.id);
                if (!position) return null;

                const mastered = masteredSet.has(point.id);
                const unlocked = isUnlocked(point);
                const locked = !mastered && !unlocked;
                const isSelected = activeNodeId === point.id;
                const isCurrentLevel = point.level === selectedLevel;

                const fillColor = mastered
                  ? 'hsl(var(--primary) / 0.16)'
                  : locked
                    ? 'hsl(var(--muted))'
                    : 'hsl(var(--secondary))';

                const strokeColor = isSelected
                  ? 'hsl(var(--primary))'
                  : mastered
                    ? 'hsl(var(--primary) / 0.8)'
                    : 'hsl(var(--border))';

                const statusText = mastered ? 'Mastered' : locked ? 'Locked' : 'Ready';
                const displayTitle = point.title.length > 30 ? `${point.title.slice(0, 30)}...` : point.title;

                return (
                  <g
                    key={point.id}
                    transform={`translate(${position.x}, ${position.y})`}
                    onClick={() => setSelectedNodeId(point.id)}
                    className="cursor-pointer"
                  >
                    <rect
                      rx={14}
                      width={nodeWidth}
                      height={nodeHeight}
                      fill={fillColor}
                      stroke={strokeColor}
                      strokeWidth={isSelected ? 2.5 : 1.6}
                      filter={mastered ? 'url(#grammarGlow)' : undefined}
                    />

                    <text x={12} y={22} fontSize={11} fill="hsl(var(--muted-foreground))" fontWeight={600}>
                      {LEVEL_LABELS[point.level]} · {CATEGORY_LABELS[point.category]}
                    </text>
                    <text x={12} y={46} fontSize={13} fill="hsl(var(--foreground))" fontWeight={700}>
                      {displayTitle}
                    </text>
                    <text x={12} y={nodeHeight - 14} fontSize={11} fill="hsl(var(--muted-foreground))" fontWeight={600}>
                      {statusText}
                    </text>

                    <circle
                      cx={nodeWidth - 16}
                      cy={16}
                      r={6}
                      fill={mastered ? 'hsl(var(--primary))' : locked ? 'hsl(var(--muted-foreground) / 0.45)' : 'hsl(var(--ring))'}
                    />

                    {!isCurrentLevel && (
                      <rect
                        x={nodeWidth - 54}
                        y={nodeHeight - 28}
                        width={42}
                        height={18}
                        rx={9}
                        fill="hsl(var(--background) / 0.8)"
                        stroke="hsl(var(--border))"
                        strokeWidth={1}
                      />
                    )}
                    {!isCurrentLevel && (
                      <text
                        x={nodeWidth - 33}
                        y={nodeHeight - 15}
                        textAnchor="middle"
                        fontSize={10}
                        fill="hsl(var(--muted-foreground))"
                        fontWeight={700}
                      >
                        prereq
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </CardContent>
      </Card>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <Card>
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  {selectedPoint.title}
                </CardTitle>
                <CardDescription>{selectedPoint.description}</CardDescription>
              </div>

              <Badge
                className={cn(
                  'gap-1',
                  selectedIsMastered
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-200'
                    : selectedIsUnlocked
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200'
                      : 'bg-muted text-muted-foreground',
                )}
              >
                {selectedIsMastered ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : selectedIsUnlocked ? (
                  <Sparkles className="h-3.5 w-3.5" />
                ) : (
                  <Lock className="h-3.5 w-3.5" />
                )}
                {selectedIsMastered ? 'Mastered' : selectedIsUnlocked ? 'Ready to Learn' : 'Locked'}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Example Pattern</div>
              <p className="mt-1 font-cn text-base sm:text-lg text-foreground">{selectedPoint.example}</p>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Prerequisites</div>
              {selectedPoint.prerequisites.length === 0 ? (
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Circle className="h-4 w-4" />
                  No prerequisites. You can start this point now.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {selectedPoint.prerequisites.map((prerequisiteId) => {
                    const prerequisite = pointsById.get(prerequisiteId);
                    const done = masteredSet.has(prerequisiteId);
                    return (
                      <Badge
                        key={prerequisiteId}
                        variant="outline"
                        className={cn(done ? 'border-green-500/60 text-green-700 dark:text-green-300' : 'border-amber-500/60 text-amber-700 dark:text-amber-300')}
                      >
                        {done ? <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> : <Circle className="mr-1 h-3.5 w-3.5" />}
                        {prerequisite?.title || prerequisiteId}
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>

            {!selectedIsUnlocked && (
              <div className="rounded-lg border border-amber-500/40 bg-amber-50/60 p-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                Complete {missingPrerequisites.length} prerequisite{missingPrerequisites.length === 1 ? '' : 's'} to unlock this point.
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => handleToggleMastered(selectedPoint.id)}
                disabled={!selectedIsMastered && !selectedIsUnlocked}
              >
                {selectedIsMastered ? 'Mark as Not Mastered' : 'Mark as Mastered'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setMasteredSet(new Set<string>());
                }}
              >
                Reset Grammar Progress
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default GrammarMap;
