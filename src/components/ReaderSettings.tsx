/* eslint-disable react-refresh/only-export-components */
import { useState } from 'react';
import { Settings, Type, Sun, Moon, BookOpen, Monitor, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type ReaderTheme = 'light' | 'sepia' | 'dark' | 'black';
export type PinyinMode = 'off' | 'hover' | 'always';
export type FontSize = 'normal' | 'large' | 'xlarge';
export type LineSpacing = 'compact' | 'normal' | 'relaxed';
export type ChineseFont = 'sans' | 'serif';

export interface ReaderSettings {
  theme: ReaderTheme;
  pinyinMode: PinyinMode;
  fontSize: FontSize;
  lineSpacing: LineSpacing;
  chineseFont: ChineseFont;
}

const STORAGE_KEY = 'openhsk.reader-settings.v1';

const DEFAULT_SETTINGS: ReaderSettings = {
  theme: 'light',
  pinyinMode: 'hover',
  fontSize: 'normal',
  lineSpacing: 'normal',
  chineseFont: 'sans',
};

export function loadReaderSettings(): ReaderSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      theme: ['light', 'sepia', 'dark', 'black'].includes(parsed.theme) ? parsed.theme : DEFAULT_SETTINGS.theme,
      pinyinMode: ['off', 'hover', 'always'].includes(parsed.pinyinMode) ? parsed.pinyinMode : DEFAULT_SETTINGS.pinyinMode,
      fontSize: ['normal', 'large', 'xlarge'].includes(parsed.fontSize) ? parsed.fontSize : DEFAULT_SETTINGS.fontSize,
      lineSpacing: ['compact', 'normal', 'relaxed'].includes(parsed.lineSpacing) ? parsed.lineSpacing : DEFAULT_SETTINGS.lineSpacing,
      chineseFont: ['sans', 'serif'].includes(parsed.chineseFont) ? parsed.chineseFont : DEFAULT_SETTINGS.chineseFont,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveReaderSettings(settings: ReaderSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch { /* ignore */ }
}

export function getThemeClasses(theme: ReaderTheme): string {
  switch (theme) {
    case 'sepia':
      return 'bg-[#f4ecd8] text-[#5b4636]';
    case 'dark':
      return 'bg-slate-900 text-slate-100';
    case 'black':
      return 'bg-black text-gray-300';
    default:
      return 'bg-background text-foreground';
  }
}

export function getFontSizeClass(size: FontSize): string {
  switch (size) {
    case 'large': return 'text-lg';
    case 'xlarge': return 'text-xl';
    default: return 'text-base';
  }
}

export function getLineSpacingClass(spacing: LineSpacing): string {
  switch (spacing) {
    case 'compact': return 'leading-relaxed';
    case 'relaxed': return 'leading-loose';
    default: return 'leading-normal';
  }
}

export function getChineseFontClass(font: ChineseFont): string {
  return font === 'serif' ? 'font-serif' : 'font-sans';
}

interface ReaderSettingsPanelProps {
  settings: ReaderSettings;
  onChange: (settings: ReaderSettings) => void;
}

export function ReaderSettingsPanel({ settings, onChange }: ReaderSettingsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  const update = (patch: Partial<ReaderSettings>) => {
    const next = { ...settings, ...patch };
    onChange(next);
    saveReaderSettings(next);
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen((p) => !p)}
        className="gap-1.5"
      >
        <Settings className="w-4 h-4" />
        <span className="hidden sm:inline">Settings</span>
      </Button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-64 bg-card border border-border rounded-xl shadow-xl p-4 z-50 space-y-4">
            {/* Theme */}
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                Theme
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {([
                  { key: 'light', icon: Sun, label: 'Light' },
                  { key: 'sepia', icon: BookOpen, label: 'Sepia' },
                  { key: 'dark', icon: Moon, label: 'Dark' },
                  { key: 'black', icon: Monitor, label: 'Black' },
                ] as const).map(({ key, icon: Icon, label }) => (
                  <button
                    key={key}
                    onClick={() => update({ theme: key })}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg text-xs transition-colors ${
                      settings.theme === key
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Pinyin */}
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                Pinyin
              </label>
              <div className="flex gap-1.5">
                {(['off', 'hover', 'always'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => update({ pinyinMode: mode })}
                    className={`flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      settings.pinyinMode === mode
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-muted'
                    }`}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Font Size */}
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block flex items-center gap-1.5">
                <Type className="w-3 h-3" />
                Size
              </label>
              <div className="flex gap-1.5 items-center">
                {(['normal', 'large', 'xlarge'] as const).map((size) => (
                  <button
                    key={size}
                    onClick={() => update({ fontSize: size })}
                    className={`flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      settings.fontSize === size
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-muted'
                    }`}
                  >
                    {size === 'normal' ? 'A' : size === 'large' ? 'A+' : 'A++'}
                  </button>
                ))}
              </div>
            </div>

            {/* Line Spacing */}
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                Spacing
              </label>
              <div className="flex gap-1.5">
                {(['compact', 'normal', 'relaxed'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => update({ lineSpacing: s })}
                    className={`flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      settings.lineSpacing === s
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-muted'
                    }`}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Font */}
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block flex items-center gap-1.5">
                <Palette className="w-3 h-3" />
                Font
              </label>
              <div className="flex gap-1.5">
                {(['sans', 'serif'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => update({ chineseFont: f })}
                    className={`flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      settings.chineseFont === f
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-muted'
                    }`}
                  >
                    {f === 'sans' ? 'Sans' : 'Serif'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
