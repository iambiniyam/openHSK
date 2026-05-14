import { useState, useCallback, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';

import { InlineDictionaryPopup } from './InlineDictionaryPopup';
import { alignPinyinToChars } from '@/lib/pinyinAligner';
import type { UnifiedEntry } from '@/services/unifiedDictionaryService';
import type { ReaderSettings } from './ReaderSettings';

interface ChineseTextProps {
  text: string;
  pinyin?: string;
  settings: ReaderSettings;
  onWordClick?: (hanzi: string) => void;
  className?: string;
  highlightChars?: Set<string>;
}

export function ChineseText({
  text,
  pinyin,
  settings,
  onWordClick,
  className = '',
  highlightChars,
}: ChineseTextProps) {
  const [popup, setPopup] = useState<{
    hanzi: string;
    x: number;
    y: number;
  } | null>(null);

  const aligned = useMemo(() => {
    if (!pinyin || settings.pinyinMode === 'off') return null;
    return alignPinyinToChars(text, pinyin);
  }, [text, pinyin, settings.pinyinMode]);

  const handleCharClick = useCallback((char: string, e: React.MouseEvent) => {
    if (!onWordClick) return;
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setPopup({
      hanzi: char,
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
  }, [onWordClick]);

  const handlePopupOpenDetail = useCallback((entry: UnifiedEntry) => {
    if (onWordClick) {
      onWordClick(entry.hanzi);
    }
    setPopup(null);
  }, [onWordClick]);

  // Render with ruby pinyin
  if (aligned && settings.pinyinMode !== 'off') {
    return (
      <>
        <span className={`inline ${className}`}>
          {aligned.map((item, i) => {
            if (!item.pinyin) {
              return <span key={i} className="inline">{item.char}</span>;
            }

            const isHighlight = highlightChars?.has(item.char);
            const rubyElement = (
              <ruby
                key={i}
                className={`ruby-char ${settings.pinyinMode === 'hover' ? 'ruby-hover' : ''} ${isHighlight ? 'bg-amber-200/60 dark:bg-amber-700/40 rounded px-0.5' : ''}`}
                onClick={(e) => handleCharClick(item.char, e)}
              >
                {item.char}
                <rt className="text-[0.6em] text-muted-foreground select-none">
                  {item.pinyin}
                </rt>
              </ruby>
            );

            return rubyElement;
          })}
        </span>
        <AnimatePresence>
          {popup && (
            <InlineDictionaryPopup
              hanzi={popup.hanzi}
              position={{ x: popup.x, y: popup.y }}
              onClose={() => setPopup(null)}
              onOpenDetail={handlePopupOpenDetail}
            />
          )}
        </AnimatePresence>
      </>
    );
  }

  // Render without pinyin - still clickable
  const chars = Array.from(text);
  return (
    <>
      <span className={`inline ${className}`}>
        {chars.map((char, i) => {
          const isChinese = /[\u4e00-\u9fff]/.test(char);
          if (!isChinese || !onWordClick) {
            return <span key={i}>{char}</span>;
          }
          const isHighlight = highlightChars?.has(char);
          return (
            <span
              key={i}
              className={`clickable-char cursor-pointer hover:text-primary hover:underline decoration-primary/40 underline-offset-4 transition-colors ${isHighlight ? 'bg-amber-200/60 dark:bg-amber-700/40 rounded px-0.5' : ''}`}
              onClick={(e) => handleCharClick(char, e)}
            >
              {char}
            </span>
          );
        })}
      </span>
      <AnimatePresence>
        {popup && (
          <InlineDictionaryPopup
            hanzi={popup.hanzi}
            position={{ x: popup.x, y: popup.y }}
            onClose={() => setPopup(null)}
            onOpenDetail={handlePopupOpenDetail}
          />
        )}
      </AnimatePresence>
    </>
  );
}
