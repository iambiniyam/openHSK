import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Keyboard } from 'lucide-react';

interface ShortcutGroup {
  name: string;
  shortcuts: { key: string; desc: string }[];
}

const SHORTCUTS: ShortcutGroup[] = [
  {
    name: 'Global',
    shortcuts: [
      { key: '?', desc: 'Show this help' },
      { key: 'Esc', desc: 'Close dialogs / go back' },
    ],
  },
  {
    name: 'Study Mode',
    shortcuts: [
      { key: 'Space', desc: 'Reveal answer' },
      { key: '1', desc: 'Again (failed)' },
      { key: '2', desc: 'Hard' },
      { key: '3', desc: 'Good' },
      { key: '4', desc: 'Easy' },
    ],
  },
  {
    name: 'Quiz Mode',
    shortcuts: [
      { key: '1–4', desc: 'Select answer option' },
      { key: 'Space / Enter', desc: 'Next question' },
      { key: 'Esc', desc: 'Exit quiz' },
    ],
  },
  {
    name: 'Browse & Detail',
    shortcuts: [
      { key: 'Enter', desc: 'Search / open selected word' },
      { key: '← / →', desc: 'Navigate detail pages' },
    ],
  },
];

export function KeyboardShortcutsHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5 pt-2">
          {SHORTCUTS.map((group) => (
            <div key={group.name}>
              <h4 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                {group.name}
              </h4>
              <div className="space-y-1.5">
                {group.shortcuts.map((s) => (
                  <div key={s.key + s.desc} className="flex items-center justify-between gap-4">
                    <span className="text-sm">{s.desc}</span>
                    <Badge variant="secondary" className="font-mono text-xs shrink-0">
                      {s.key}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground pt-2 border-t">
          Press <kbd className="px-1 py-0.5 rounded bg-muted font-mono text-xs">?</kbd> anywhere to toggle this help.
        </p>
      </DialogContent>
    </Dialog>
  );
}
