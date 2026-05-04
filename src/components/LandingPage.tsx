import { useRef, useEffect } from 'react';
import { motion, useInView, animate } from 'framer-motion';
import {
  ArrowRight,
  BookOpen,
  PenLine,
  Zap,
  TrendingUp,
  Layers,
  Globe,
  Code2,
  Sparkles,
  ChevronRight,
  Star,
  Github,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface LandingPageProps {
  totalWords: number;
  onStartLearning: () => void;
  onBrowseDictionary: () => void;
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.06 } },
};

const features = [
  {
    icon: BookOpen,
    title: 'Complete HSK Dictionary',
    description: 'All 9 levels with CC-CEDICT enrichments, pinyin, stroke data, and native audio.',
    gradient: 'from-emerald-500/15 to-emerald-500/5',
    iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
  {
    icon: PenLine,
    title: 'Stroke Order Practice',
    description: 'Interactive hanzi writer with animated stroke sequences and decomposition breakdowns.',
    gradient: 'from-blue-500/15 to-blue-500/5',
    iconBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
  {
    icon: Zap,
    title: 'Smart Quizzes',
    description: 'Adaptive multiple-choice and self-assessment with SRS-based spaced repetition.',
    gradient: 'from-amber-500/15 to-amber-500/5',
    iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
  {
    icon: TrendingUp,
    title: 'Progress Tracking',
    description: 'Daily streaks, level completion, and review scheduling to keep you motivated.',
    gradient: 'from-rose-500/15 to-rose-500/5',
    iconBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  },
  {
    icon: Layers,
    title: 'Character Graphs',
    description: 'Explore connections between characters with interactive D3 force-directed graphs.',
    gradient: 'from-violet-500/15 to-violet-500/5',
    iconBg: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  },
  {
    icon: Globe,
    title: 'Offline Ready',
    description: 'PWA with full offline support. Study anywhere without an internet connection.',
    gradient: 'from-cyan-500/15 to-cyan-500/5',
    iconBg: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
  },
];

const stats = [
  { value: '9', label: 'HSK Levels', suffix: '' },
  { value: '5K+', label: 'Vocabulary', suffix: '' },
  { value: 'Offline', label: 'PWA', suffix: '' },
  { value: 'Free', label: 'Open Source', suffix: '' },
];

const levels = [
  { range: '1–2', label: 'Foundation', desc: 'Survival phrases, particles, core verbs', color: 'bg-emerald-500', textColor: 'text-emerald-600' },
  { range: '3–4', label: 'Fluency', desc: 'Comparisons, complements, connected reading', color: 'bg-blue-500', textColor: 'text-blue-600' },
  { range: '5–6', label: 'Precision', desc: 'Complex connectors, discourse, nuance', color: 'bg-violet-500', textColor: 'text-violet-600' },
  { range: '7–9', label: 'Mastery', desc: 'Academic expression, formal argumentation', color: 'bg-rose-500', textColor: 'text-rose-600' },
];

function AnimatedCounter({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const numeric = parseInt(value.replace(/\D/g, ''));
  const display = isNaN(numeric) ? value : null;

  useEffect(() => {
    if (!isInView || !ref.current || display) return;
    const controls = animate(0, numeric, {
      duration: 1.5,
      ease: 'circOut',
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = Math.round(v).toString();
      },
    });
    return () => controls.stop();
  }, [isInView, numeric, display]);

  if (display) return <span ref={ref}>{display}</span>;
  return <span ref={ref}>0</span>;
}

function FloatingCharacter({ char, delay, x }: { char: string; delay: number; x: string }) {
  return (
    <motion.div
      className="absolute text-4xl sm:text-5xl font-bold text-primary/[0.06] select-none pointer-events-none font-cn"
      style={{ left: x, top: '15%' }}
      initial={{ y: 0, opacity: 0 }}
      animate={{ y: [-10, 10, -10], opacity: [0.04, 0.08, 0.04] }}
      transition={{ duration: 6, delay, repeat: Infinity, ease: 'easeInOut' }}
    >
      {char}
    </motion.div>
  );
}

export const LandingPage = ({ totalWords, onStartLearning, onBrowseDictionary }: LandingPageProps) => {
  const featuresRef = useRef<HTMLDivElement>(null);
  const featuresInView = useInView(featuresRef, { once: true, margin: '-80px' });

  return (
    <div className="space-y-16 sm:space-y-24 pb-8">
      {/* ── Hero ── */}
      <motion.section
        initial="hidden"
        animate="visible"
        variants={stagger}
        className="relative overflow-hidden rounded-[2rem] border border-border/40 bg-gradient-to-br from-background via-primary/[0.02] to-background p-8 sm:p-12 lg:p-16"
      >
        {/* Background decorations */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-primary/6 blur-[100px]" />
          <div className="absolute -bottom-32 -left-32 h-[400px] w-[400px] rounded-full bg-amber-500/4 blur-[80px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-violet-500/3 blur-[120px]" />
          <FloatingCharacter char="学" delay={0} x="8%" />
          <FloatingCharacter char="汉" delay={1.5} x="85%" />
          <FloatingCharacter char="语" delay={3} x="50%" />
          <div
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage:
                'linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)',
              backgroundSize: '60px 60px',
            }}
          />
        </div>

        <div className="relative space-y-8 max-w-4xl mx-auto text-center">
          {/* Badge */}
          <motion.div variants={fadeUp} className="flex justify-center">
            <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full">
              <Sparkles className="h-3 w-3" />
              Free &amp; Open Source
            </Badge>
          </motion.div>

          {/* Heading */}
          <motion.div variants={fadeUp} className="space-y-5">
            <h1 className="text-4xl leading-[1.08] sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold tracking-tight text-foreground text-balance">
              Master Chinese
              <span className="mt-2 sm:mt-3 block bg-gradient-to-r from-primary via-primary to-amber-500 bg-clip-text text-transparent">
                with clarity &amp; confidence
              </span>
            </h1>
            <p className="max-w-xl mx-auto text-base sm:text-lg text-muted-foreground leading-relaxed text-balance">
              A modern, open platform for mastering HSK vocabulary with smart tools,
              writing practice, and daily review — all in one beautiful place.
            </p>
          </motion.div>

          {/* CTAs */}
          <motion.div variants={fadeUp} className="flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" className="h-12 px-7 text-base group rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/25 transition-all" onClick={onStartLearning}>
              Start Learning
              <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-7 text-base rounded-xl" onClick={onBrowseDictionary}>
              Browse {totalWords > 0 ? `${totalWords.toLocaleString()} words` : 'dictionary'}
            </Button>
          </motion.div>

          {/* Stats strip */}
          <motion.div variants={fadeUp} className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto pt-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm px-4 py-3.5 text-center"
              >
                <div className="text-2xl sm:text-3xl font-extrabold text-foreground tabular-nums">
                  <AnimatedCounter value={stat.value} />
                  {stat.suffix}
                </div>
                <div className="text-[11px] sm:text-xs text-muted-foreground font-medium mt-0.5">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </motion.section>

      {/* ── Features Grid ── */}
      <motion.section
        ref={featuresRef}
        initial="hidden"
        animate={featuresInView ? 'visible' : 'hidden'}
        variants={stagger}
      >
        <motion.div variants={fadeUp} className="mb-10 text-center">
          <Badge variant="outline" className="mb-3 rounded-full text-xs">Features</Badge>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-balance">Everything you need</h2>
          <p className="mt-2 text-muted-foreground max-w-md mx-auto text-balance">Tools designed for every stage of your Chinese learning journey.</p>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <motion.div key={feature.title} variants={fadeUp}>
              <Card className="group relative h-full overflow-hidden border-border/50 bg-card/70 backdrop-blur-sm transition-all duration-300 hover:border-primary/25 hover:shadow-lg hover:shadow-primary/[0.03] hover:-translate-y-0.5">
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 transition-opacity duration-500 group-hover:opacity-100`}
                />
                <CardContent className="relative p-5 sm:p-6 space-y-3">
                  <div className={`inline-flex rounded-xl p-2.5 ${feature.iconBg} transition-transform duration-300 group-hover:scale-110`}>
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-base sm:text-lg font-semibold tracking-tight">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* ── Level Path ── */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
        variants={stagger}
        className="rounded-[2rem] border border-border/40 bg-card/50 p-8 sm:p-10 lg:p-12"
      >
        <motion.div variants={fadeUp} className="mb-10 text-center">
          <Badge variant="outline" className="mb-3 rounded-full text-xs">Curriculum</Badge>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-balance">Your HSK journey</h2>
          <p className="mt-2 text-muted-foreground max-w-md mx-auto text-balance">A clear path from beginner to advanced fluency.</p>
        </motion.div>

        <div className="relative">
          {/* Connecting line (desktop) */}
          <div className="hidden lg:block absolute top-8 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-emerald-500 via-blue-500 via-violet-500 to-rose-500 opacity-20" />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {levels.map((level, i) => (
              <motion.div key={level.range} variants={fadeUp} className="group">
                <div className="relative rounded-2xl border border-border/50 bg-background/70 p-5 text-center transition-all duration-300 hover:border-primary/20 hover:shadow-md hover:-translate-y-0.5">
                  {/* Step number + dot */}
                  <div className="mb-4 flex items-center justify-center gap-2">
                    <div className={`h-2.5 w-2.5 rounded-full ${level.color} shadow-sm`} />
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Step {i + 1}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className={`inline-block rounded-full px-3 py-1 text-xs font-bold text-white ${level.color}`}>
                      HSK {level.range}
                    </div>
                    <h3 className="text-lg font-bold">{level.label}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{level.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <motion.div variants={fadeUp} className="mt-8 flex justify-center">
          <Button variant="outline" size="lg" onClick={onBrowseDictionary} className="group rounded-xl">
            Explore all levels
            <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Button>
        </motion.div>
      </motion.section>

      {/* ── Social Proof / Trust ── */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
        variants={stagger}
        className="text-center space-y-6"
      >
        <motion.div variants={fadeUp} className="flex items-center justify-center gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
          ))}
        </motion.div>
        <motion.p variants={fadeUp} className="text-muted-foreground max-w-lg mx-auto text-balance">
          Loved by thousands of Chinese learners worldwide. OpenHSK is built with care for students, teachers, and self-learners.
        </motion.p>
        <motion.div variants={fadeUp} className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Github className="w-4 h-4" />
            Open Source
          </span>
          <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
          <span>Free Forever</span>
          <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
          <span>No Account Required</span>
        </motion.div>
      </motion.section>

      {/* ── Bottom CTA ── */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
        variants={stagger}
        className="relative overflow-hidden rounded-[2rem] border border-primary/15 bg-gradient-to-br from-primary/8 via-background to-primary/[0.03] p-8 sm:p-12 text-center"
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 h-[300px] w-[600px] rounded-full bg-primary/6 blur-[80px]" />
        </div>

        <motion.div variants={fadeUp} className="relative space-y-5 max-w-xl mx-auto">
          <div className="inline-flex rounded-2xl bg-primary/10 p-3 text-primary">
            <Code2 className="h-6 w-6" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-balance">Ready to start learning?</h2>
          <p className="text-muted-foreground leading-relaxed text-balance">
            OpenHSK is free, open source, and works offline. No accounts, no paywalls — just effective Chinese learning.
          </p>
          <Button size="lg" className="h-12 px-8 text-base shadow-lg shadow-primary/20 rounded-xl" onClick={onStartLearning}>
            Get started free
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </motion.div>
      </motion.section>
    </div>
  );
};

export default LandingPage;
