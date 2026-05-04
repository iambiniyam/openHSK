import { memo } from 'react';
import { Volume2, ScrollText, Library, Search, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { StoryDataset } from '@/types/stories';
import type { BookDataset } from '@/types/books';
import type { ViewMode } from '@/App';

interface MobileNavProps {
  currentView: ViewMode;
  storyDataset: StoryDataset | null;
  bookDataset: BookDataset | null;
  onNavigate: (view: ViewMode) => void;
}

interface NavItem {
  view: ViewMode;
  label: string;
  icon: typeof Home;
  condition?: boolean;
}

export const MobileNav = memo(function MobileNav({
  currentView,
  storyDataset,
  bookDataset,
  onNavigate,
}: MobileNavProps) {
  const items: NavItem[] = [
    { view: 'landing', label: 'Home', icon: Home },
    { view: 'browse', label: 'Browse', icon: Search },
    { view: 'audio', label: 'Audio', icon: Volume2 },
    { view: 'stories', label: 'Stories', icon: ScrollText, condition: !!storyDataset },
    { view: 'books', label: 'Books', icon: Library, condition: !!bookDataset },
  ];

  const visibleItems = items.filter((item) => item.condition !== false);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border/40 bg-background/80 backdrop-blur-xl z-50 pb-safe">
      <div className="flex justify-around items-center p-1.5 gap-1">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = currentView === item.view;
          return (
            <Button
              key={item.view}
              variant={active ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => onNavigate(item.view)}
              className={`flex-col h-14 w-full gap-0.5 rounded-xl transition-all duration-200 ${
                active
                  ? 'bg-primary/10 text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className={`w-5 h-5 transition-transform duration-200 ${active ? 'scale-110' : ''}`} />
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
              {active && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" aria-hidden="true" />
              )}
            </Button>
          );
        })}
      </div>
    </nav>
  );
});
