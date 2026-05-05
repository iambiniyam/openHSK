import { useRef, useEffect } from "react";
import { motion, useInView, animate } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  PenLine,
  Zap,
  Brain,
  Headphones,
  ScrollText,
  Library,
  GitBranch,
  BarChart3,
  Globe,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface LandingPageProps {
  totalWords: number;
  onStartLearning: () => void;
  onBrowseDictionary: () => void;
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.05 } },
};

const stats = [
  { value: "9", suffix: "", label: "HSK Levels" },
  { value: "5K+", suffix: "", label: "Words" },
  { value: "Offline", suffix: "", label: "PWA" },
  { value: "Free", suffix: "", label: "Open Source" },
];

const features = [
  { icon: BookOpen, label: "Dictionary" },
  { icon: Brain, label: "SRS Study" },
  { icon: Zap, label: "Quizzes" },
  { icon: PenLine, label: "Writing" },
  { icon: Headphones, label: "Audio" },
  { icon: ScrollText, label: "Stories" },
  { icon: Library, label: "Books" },
  { icon: GitBranch, label: "Grammar" },
  { icon: BarChart3, label: "Progress" },
  { icon: Globe, label: "Offline" },
];

function AnimatedCounter({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });

  // If value is purely numeric, animate it. Otherwise just show it.
  const isPureNumber = /^\d+$/.test(value);
  const numeric = isPureNumber ? parseInt(value, 10) : NaN;

  useEffect(() => {
    if (!isInView || !ref.current || !isPureNumber) return;
    const controls = animate(0, numeric, {
      duration: 1.2,
      ease: "circOut",
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = Math.round(v).toString();
      },
    });
    return () => controls.stop();
  }, [isInView, numeric, isPureNumber]);

  return <span ref={ref}>{value}</span>;
}

export const LandingPage = ({
  totalWords,
  onStartLearning,
  onBrowseDictionary,
}: LandingPageProps) => {
  return (
    <div className="space-y-12 sm:space-y-16 pb-8">
      {/* ── Hero ── */}
      <motion.section
        initial="hidden"
        animate="visible"
        variants={stagger}
        className="relative overflow-hidden rounded-3xl border border-border/40 bg-gradient-to-br from-background via-primary/[0.02] to-background px-6 py-12 sm:py-16 lg:py-20"
      >
        {/* Background glow */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 -right-32 h-[400px] w-[400px] rounded-full bg-primary/5 blur-[100px]" />
          <div className="absolute -bottom-24 -left-24 h-[300px] w-[300px] rounded-full bg-amber-500/3 blur-[80px]" />
        </div>

        <div className="relative max-w-3xl mx-auto text-center space-y-6">
          <motion.div variants={fadeUp}>
            <Badge
              variant="secondary"
              className="gap-1.5 px-3 py-1 text-[11px] font-medium rounded-full"
            >
              <Sparkles className="h-3 w-3" />
              Free &amp; Open Source
            </Badge>
          </motion.div>

          <motion.div variants={fadeUp} className="space-y-4">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-balance">
              Master Chinese
              <span className="block mt-1 bg-gradient-to-r from-primary to-amber-500 bg-clip-text text-transparent">
                with OpenHSK
              </span>
            </h1>
            <p className="max-w-md mx-auto text-base text-muted-foreground text-balance">
              A modern, open platform for HSK vocabulary, writing, reading, and
              daily review.
            </p>
          </motion.div>

          <motion.div
            variants={fadeUp}
            className="flex flex-wrap items-center justify-center gap-3"
          >
            <Button
              size="lg"
              className="h-11 px-6 text-sm rounded-xl shadow-lg shadow-primary/20"
              onClick={onStartLearning}
            >
              Start Learning
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-11 px-6 text-sm rounded-xl"
              onClick={onBrowseDictionary}
            >
              Browse{" "}
              {totalWords > 0
                ? `${totalWords.toLocaleString()} words`
                : "Dictionary"}
            </Button>
          </motion.div>

          {/* Stats */}
          <motion.div
            variants={fadeUp}
            className="grid grid-cols-4 gap-2 max-w-lg mx-auto pt-2"
          >
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm px-2 py-3 text-center"
              >
                <div className="text-xl sm:text-2xl font-extrabold tabular-nums">
                  <AnimatedCounter value={stat.value} />
                  {stat.suffix}
                </div>
                <div className="text-[10px] sm:text-xs text-muted-foreground font-medium mt-0.5">
                  {stat.label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </motion.section>

      {/* ── Features ── */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        variants={stagger}
        className="max-w-3xl mx-auto"
      >
        <motion.h2
          variants={fadeUp}
          className="text-center text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-6"
        >
          Features
        </motion.h2>

        <motion.div
          variants={fadeUp}
          className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3"
        >
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.label}
                className="flex flex-col items-center gap-1.5 rounded-xl border border-border/40 bg-card/50 p-3 sm:p-4 text-center transition-all hover:border-primary/20 hover:bg-primary/[0.03] hover:-translate-y-0.5"
              >
                <div className="inline-flex rounded-lg bg-primary/10 p-2 text-primary">
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <span className="text-[10px] sm:text-xs font-medium text-muted-foreground leading-tight">
                  {feature.label}
                </span>
              </div>
            );
          })}
        </motion.div>
      </motion.section>

      {/* ── Bottom CTA ── */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        variants={stagger}
        className="text-center space-y-4 px-4"
      >
        <motion.h2
          variants={fadeUp}
          className="text-xl sm:text-2xl font-bold tracking-tight"
        >
          Ready to start?
        </motion.h2>
        <motion.p variants={fadeUp} className="text-sm text-muted-foreground">
          No account. No paywall. Works offline.
        </motion.p>
        <motion.div variants={fadeUp}>
          <Button
            size="lg"
            className="h-11 px-8 text-sm rounded-xl"
            onClick={onStartLearning}
          >
            Get Started Free
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </motion.div>
      </motion.section>

      {/* ── Developer Link ── */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="text-center pb-4"
      >
        <a
          href="https://thebini.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          Made by Bini
        </a>
      </motion.div>
    </div>
  );
};

export default LandingPage;
