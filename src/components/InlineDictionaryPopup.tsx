import { useEffect, useRef, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, Volume2, BookOpen, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { unifiedDictionary } from '@/services/unifiedDictionaryService';
import { ttsService } from '@/services/ttsService';
import { hskDataService } from '@/services/hskDataService';
import type { UnifiedEntry } from '@/services/unifiedDictionaryService';

interface InlineDictionaryPopupProps {
  hanzi: string;
  position: { x: number; y: number };
  onClose: () => void;
  onOpenDetail?: (entry: UnifiedEntry) => void;
}

export function InlineDictionaryPopup({ hanzi, position, onClose, onOpenDetail }: InlineDictionaryPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);
  const entry = useMemo(() => unifiedDictionary.getEntryByHanzi(hanzi), [hanzi]);
  const isFavorite = entry ? hskDataService.getFavorites().includes(entry.id) : false;
  const [, forceUpdate] = useState({});

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!entry) {
    return (
      <motion.div
        ref={popupRef}
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.15 }}
        style={{
          position: 'fixed',
          left: Math.max(8, Math.min(position.x, window.innerWidth - 272)),
          top: Math.min(position.y + 20, window.innerHeight - 200),
          zIndex: 100,
        }}
        className="w-64 max-w-[calc(100vw-16px)] bg-card border border-border rounded-xl shadow-xl p-4"
      >
        <div className="text-center text-muted-foreground text-sm">
          <p className="text-lg font-bold text-foreground mb-1">{hanzi}</p>
          <p>No dictionary entry found</p>
        </div>
      </motion.div>
    );
  }

  const hskLevel = entry.hskLevel;
  const hskLabel = hskLevel ? (hskLevel >= 7 ? 'HSK 7-9' : `HSK ${hskLevel}`) : null;

  return (
    <motion.div
      ref={popupRef}
      initial={{ opacity: 0, scale: 0.95, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 8 }}
      transition={{ duration: 0.15 }}
      style={{
        position: 'fixed',
        left: Math.max(8, Math.min(position.x, window.innerWidth - 328)),
        top: Math.min(position.y + 20, window.innerHeight - 280),
        zIndex: 100,
      }}
      className="w-80 max-w-[calc(100vw-16px)] bg-card border border-border rounded-xl shadow-xl overflow-hidden"
    >
        {/* Header */}
        <div className="p-4 pb-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-3xl font-bold">{entry.hanzi}</div>
              <div className="text-sm text-muted-foreground mt-0.5">{entry.pinyin}</div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-md hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {hskLabel && (
            <Badge variant="outline" className={`mt-2 hsk-badge-${hskLevel && hskLevel >= 7 ? '7' : hskLevel} text-xs`}>
              {hskLabel}
            </Badge>
          )}
        </div>

        {/* Definitions */}
        <div className="px-4 pb-3">
          <div className="flex flex-wrap gap-1.5">
            {entry.definitions.slice(0, 4).map((def, i) => (
              <span key={i} className="text-sm text-foreground bg-muted px-2 py-0.5 rounded-md">
                {def}
              </span>
            ))}
            {entry.definitions.length > 4 && (
              <span className="text-xs text-muted-foreground self-center">+{entry.definitions.length - 4} more</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 px-4 pb-4">
          <Button size="sm" variant="outline" onClick={() => ttsService.speak(entry.hanzi)}>
            <Volume2 className="w-3.5 h-3.5 mr-1.5" />
            Listen
          </Button>
          <Button
            size="sm"
            variant={isFavorite ? 'default' : 'outline'}
            onClick={() => {
              hskDataService.toggleFavorite(entry.id);
              forceUpdate({});
            }}
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            {isFavorite ? 'Added' : 'Study'}
          </Button>
          {onOpenDetail && (
            <Button size="sm" variant="ghost" onClick={() => onOpenDetail(entry)}>
              <BookOpen className="w-3.5 h-3.5 mr-1.5" />
              Details
            </Button>
          )}
        </div>
      </motion.div>
  );
}

export default InlineDictionaryPopup;
