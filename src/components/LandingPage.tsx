import { motion } from 'framer-motion';
import {
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface LandingPageProps {
  totalWords: number;
  onStartLearning: () => void;
  onBrowseDictionary: () => void;
}

const valuePillars = [
  {
    iconPath: '/brand/icons/book-open.svg',
    title: 'Open Dictionary',
    description: 'Fast HSK search by hanzi, pinyin, and meaning.',
  },
  {
    iconPath: '/brand/icons/stroke-pen.svg',
    title: 'Writing Practice',
    description: 'Stroke order and character practice built in.',
  },
  {
    iconPath: '/brand/icons/quiz-flash.svg',
    title: 'Daily Momentum',
    description: 'Quizzes, goals, and favorites to stay consistent.',
  },
];

const roadmap = [
  {
    level: 'HSK 1-2',
    focus: 'Foundation and survival communication',
    detail: 'Sentence basics, particles, and core verb patterns.',
  },
  {
    level: 'HSK 3-4',
    focus: 'Fluency and exam stamina',
    detail: 'Comparison, complements, and connected reading/listening.',
  },
  {
    level: 'HSK 5-6',
    focus: 'Precision and advanced reading',
    detail: 'Complex connectors, discourse cohesion, and nuance control.',
  },
  {
    level: 'HSK 7-9',
    focus: 'Academic and professional expression',
    detail: 'Argumentation, formal style, and high-level comprehension.',
  },
];

const trainingLoop = [
  {
    title: 'Diagnose',
    description: 'Find weak points by level and skill type.',
    iconPath: '/brand/icons/filter-funnel.svg',
  },
  {
    title: 'Train',
    description: 'Study targeted words, grammar, and stroke patterns.',
    iconPath: '/brand/icons/timer-focus.svg',
  },
  {
    title: 'Simulate',
    description: 'Use timed practice to build real exam confidence.',
    iconPath: '/brand/icons/quiz-flash.svg',
  },
  {
    title: 'Track',
    description: 'Measure progress and revisit weak points automatically.',
    iconPath: '/brand/icons/progress-mountain.svg',
  },
];

export const LandingPage = ({ totalWords, onStartLearning, onBrowseDictionary }: LandingPageProps) => {
  return (
    <div className="space-y-6 sm:space-y-8 pb-4">
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-primary/10 via-background to-primary/5 p-6 sm:p-10"
      >
        <img
          src="/brand/backgrounds/hero-orbit.svg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-35"
          loading="eager"
          decoding="async"
        />
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-44 w-44 rounded-full bg-primary/20 blur-2xl" />

        <div className="relative space-y-6">
          <div className="space-y-4 max-w-3xl">
            <div className="w-full max-w-[260px] sm:max-w-[320px]">
              <img
                src="/brand/logo-horizontal.svg"
                alt="OpenHSK"
                className="h-auto w-full"
                loading="eager"
                fetchPriority="high"
              />
            </div>

            <div className="space-y-3">
              <h1 className="text-4xl leading-tight sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground">
                Learn Chinese
                <span className="block bg-gradient-to-r from-primary via-[#DA5A3F] to-[#f97316] bg-clip-text text-transparent">
                  Clearly and Consistently.
                </span>
              </h1>
              <p className="font-cn text-lg sm:text-xl text-primary/90 font-semibold">让每个人都能轻松学习中文</p>
            </div>

            <p className="max-w-2xl text-sm sm:text-base text-muted-foreground leading-relaxed">
              One focused platform for HSK vocabulary, grammar progression, writing practice, and daily review.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button size="lg" className="group" onClick={onStartLearning}>
                Start Learning
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button size="lg" variant="outline" onClick={onBrowseDictionary}>
                Browse Dictionary
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 max-w-3xl">
            <Card className="border-primary/20 bg-card/90 shadow-sm">
              <CardContent className="p-3 sm:p-4">
                <div className="text-xl sm:text-2xl font-extrabold text-primary">{totalWords.toLocaleString()}</div>
                <div className="text-[11px] sm:text-xs text-muted-foreground">HSK Words</div>
              </CardContent>
            </Card>
            <Card className="border-primary/20 bg-card/90 shadow-sm">
              <CardContent className="p-3 sm:p-4">
                <div className="text-xl sm:text-2xl font-extrabold text-primary">Offline</div>
                <div className="text-[11px] sm:text-xs text-muted-foreground">PWA Ready</div>
              </CardContent>
            </Card>
            <Card className="border-primary/20 bg-card/90 shadow-sm">
              <CardContent className="p-3 sm:p-4">
                <div className="text-xl sm:text-2xl font-extrabold text-primary">Free</div>
                <div className="text-[11px] sm:text-xs text-muted-foreground">Open Access</div>
              </CardContent>
            </Card>
            <Card className="border-primary/20 bg-card/90 shadow-sm">
              <CardContent className="p-3 sm:p-4">
                <div className="text-xl sm:text-2xl font-extrabold text-primary">Grammar</div>
                <div className="text-[11px] sm:text-xs text-muted-foreground">HSK Map</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="grid gap-3 sm:grid-cols-3"
      >
        {valuePillars.map((pillar) => {
          return (
            <Card key={pillar.title} className="h-full border-border/80 bg-card/95">
              <CardContent className="p-4 sm:p-5 space-y-2.5">
                <div className="inline-flex rounded-lg bg-primary/10 p-2 text-primary">
                  <img src={pillar.iconPath} alt="" aria-hidden="true" className="h-5 w-5" loading="lazy" decoding="async" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-foreground">{pillar.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{pillar.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]"
      >
        <Card className="border-border/80 bg-card/95">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">HSK Roadmap</CardTitle>
            <CardDescription>
              Follow the level path with clear milestones from basics to advanced fluency.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {roadmap.map((item) => (
                <div key={item.level} className="rounded-xl border bg-muted/40 p-3 space-y-1.5">
                  <div className="text-sm font-semibold text-primary">{item.level}</div>
                  <div className="text-sm font-medium text-foreground">{item.focus}</div>
                  <div className="text-xs text-muted-foreground leading-relaxed">{item.detail}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/95">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Pass-Ready Training Loop</CardTitle>
            <CardDescription>
              Repeat this loop every week to improve score and retention.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {trainingLoop.map((step, index) => (
              <div key={step.title} className="flex items-start gap-3 rounded-xl border bg-muted/30 p-3">
                <div className="inline-flex shrink-0 items-center justify-center rounded-full bg-primary/10 p-2">
                  <img src={step.iconPath} alt="" aria-hidden="true" className="h-4 w-4" loading="lazy" decoding="async" />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <div className="text-sm font-semibold text-foreground">
                    {index + 1}. {step.title}
                  </div>
                  <div className="text-xs text-muted-foreground break-words">{step.description}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.section>
    </div>
  );
};

export default LandingPage;
