import { useRef, useEffect, useState } from "react";
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
  const [hasAnimated, setHasAnimated] = useState(false);
  const isPureNumber = /^\d+$/.test(value);
  const numeric = isPureNumber ? parseInt(value, 10) : NaN;

  useEffect(() => {
    const el = ref.current;
    if (!el || hasAnimated || !isPureNumber) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || hasAnimated) return;
        observer.disconnect();
        setHasAnimated(true);
        const start = performance.now();
        const duration = 1200;
        const frame = (now: number) => {
          const t = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - t, 3);
          el.textContent = Math.round(eased * numeric).toString();
          if (t < 1) requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [numeric, isPureNumber, hasAnimated]);

  return <span ref={ref}>{value}</span>;
}

function RevealSection({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'} ${className}`}
    >
      {children}
    </div>
  );
}

export const LandingPage = ({
  totalWords,
  onStartLearning,
  onBrowseDictionary,
}: LandingPageProps) => {
  return (
    <div className="space-y-12 sm:space-y-16 pb-8">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden rounded-3xl border border-border/40 bg-gradient-to-br from-background via-primary/[0.02] to-background px-6 py-12 sm:py-16 lg:py-20 animate-fade-in">
        {/* Background glow */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 -right-32 h-[400px] w-[400px] rounded-full bg-primary/5 blur-[100px]" />
          <div className="absolute -bottom-24 -left-24 h-[300px] w-[300px] rounded-full bg-amber-500/3 blur-[80px]" />
        </div>

        <div className="relative max-w-3xl mx-auto text-center space-y-6">
          <div className="animate-fade-in">
            <Badge
              variant="secondary"
              className="gap-1.5 px-3 py-1 text-[11px] font-medium rounded-full"
            >
              <Sparkles className="h-3 w-3" />
              Free &amp; Open Source
            </Badge>
          </div>

          <div className="space-y-4">
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
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
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
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2 max-w-lg mx-auto pt-2">
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
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <RevealSection className="max-w-3xl mx-auto">
        <h2 className="text-center text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-6">
          Features
        </h2>

        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3">
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
        </div>
      </RevealSection>

      {/* ── Bottom CTA ── */}
      <RevealSection className="text-center space-y-4 px-4">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
          Ready to start?
        </h2>
        <p className="text-sm text-muted-foreground">
          No account. No paywall. Works offline.
        </p>
        <div>
          <Button
            size="lg"
            className="h-11 px-8 text-sm rounded-xl"
            onClick={onStartLearning}
          >
            Get Started Free
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </RevealSection>

      {/* ── Developer Link ── */}
      <div className="text-center pb-4 animate-fade-in">
        <a
          href="https://thebini.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          Made by Bini
        </a>
      </div>
    </div>
  );
};

export default LandingPage;
