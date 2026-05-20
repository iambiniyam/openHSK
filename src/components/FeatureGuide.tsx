import { memo } from 'react';
import {
  Timer,
  BookOpen,
  Search,
  Volume2,
  ScrollText,
  Library,
  LayoutDashboard,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import type { ViewMode } from '@/App';

interface FeatureGuideProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (view: ViewMode) => void;
}

interface FeatureItem {
  icon: typeof Search;
  title: string;
  description: string;
  view: ViewMode;
}

interface FeatureCategory {
  label: string;
  items: FeatureItem[];
}

const categories: FeatureCategory[] = [
  {
    label: 'Explore',
    items: [
      {
        icon: Search,
        title: 'Browse Dictionary',
        description: 'Search and explore all 5,000+ HSK words with enrichments.',
        view: 'browse',
      },
      {
        icon: BookOpen,
        title: 'Detail View',
        description: 'Deep-dive into each HSK word with examples and related terms.',
        view: 'detail',
      },
    ],
  },
  {
    label: 'Media',
    items: [
      {
        icon: Volume2,
        title: 'Audio Playlist',
        description: 'Passive listening with text-to-speech for HSK vocabulary.',
        view: 'audio',
      },
      {
        icon: ScrollText,
        title: 'Stories',
        description: 'Read AI-generated short stories tailored to your HSK level.',
        view: 'stories',
      },
      {
        icon: Library,
        title: 'Books',
        description: 'Read continuous genre-based stories with chapter navigation.',
        view: 'books',
      },
    ],
  },
  {
    label: 'Tools',
    items: [
      {
        icon: LayoutDashboard,
        title: 'Dashboard',
        description: 'Your personal learning hub with stats, review tracking, and quick actions.',
        view: 'dashboard',
      },
      {
        icon: Timer,
        title: 'Focus Timer',
        description: 'Pomodoro timer to stay focused during study sessions.',
        view: 'dashboard',
      },
    ],
  },
];

export const FeatureGuide = memo(function FeatureGuide({
  open,
  onOpenChange,
  onNavigate,
}: FeatureGuideProps) {
  const handleNavigate = (view: ViewMode) => {
    onOpenChange(false);
    onNavigate(view);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <BookOpen className="w-5 h-5 text-primary" />
            Feature Guide
          </DialogTitle>
          <DialogDescription>
            Discover everything OpenHSK can do for your Chinese learning journey.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {categories.map((category) => (
            <div key={category.label}>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
                {category.label}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {category.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.title}
                      onClick={() => handleNavigate(item.view)}
                      className="flex items-start gap-3 p-3 rounded-xl border border-border/40 bg-background/50 hover:bg-muted/60 hover:border-primary/20 transition-all duration-200 text-left group"
                    >
                      <div className="p-2 rounded-lg bg-primary/10 shrink-0 group-hover:scale-110 transition-transform">
                        <Icon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold leading-tight mb-0.5">
                          {item.title}
                        </div>
                        <div className="text-xs text-muted-foreground leading-relaxed">
                          {item.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-2 border-t border-border/40">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            <X className="w-4 h-4 mr-1.5" />
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
});
