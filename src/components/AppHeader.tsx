import { memo, useCallback, useState, useEffect } from 'react';
import {
  Volume2,
  Moon,
  ScrollText,
  Settings,
  Sun,
  Library,
  Search,
  Keyboard,
  Mic,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  CircleHelp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { StoryDataset } from '@/types/stories';
import type { BookDataset } from '@/types/books';
import type { ViewMode } from '@/App';
import { FeatureGuide } from './FeatureGuide';
import { ttsService, type TtsProvider } from '@/services/ttsService';
import {
  type AzureTtsConfig,
  getAzureVoices,
  loadAzureConfig,
  saveAzureConfig,
  testAzureConfig,
} from '@/services/enhancedTtsService';

interface AppHeaderProps {
  currentView: ViewMode;
  darkMode: boolean;
  ttsRate: number;
  storyDataset: StoryDataset | null;
  bookDataset: BookDataset | null;
  onNavigate: (view: ViewMode) => void;
  onToggleDarkMode: () => void;
  onTtsRateChange: (rate: number) => void;
}

const navItems: { view: ViewMode; label: string; icon: typeof Search }[] = [
  { view: 'browse', label: 'Browse', icon: Search },
  { view: 'audio', label: 'Audio', icon: Volume2 },
  { view: 'stories', label: 'Stories', icon: ScrollText },
  { view: 'books', label: 'Books', icon: Library },
];

function VoiceQualityBadge() {
  const quality = ttsService.getVoiceQualityLabel();

  const colorClass =
    quality.label === 'Excellent'
      ? 'text-emerald-600'
      : quality.label === 'Good'
        ? 'text-blue-600'
        : quality.label === 'Fair'
          ? 'text-amber-600'
          : 'text-rose-600';

  const Icon =
    quality.label === 'Excellent' || quality.label === 'Good'
      ? CheckCircle2
      : AlertCircle;

  return (
    <div className={`flex items-center gap-1.5 text-xs ${colorClass}`}>
      <Icon className="w-3.5 h-3.5" />
      <span className="font-medium">{quality.label}</span>
      <span className="text-muted-foreground truncate">{quality.description}</span>
    </div>
  );
}

export const AppHeader = memo(function AppHeader({
  currentView,
  darkMode,
  ttsRate,
  storyDataset,
  bookDataset,
  onNavigate,
  onToggleDarkMode,
  onTtsRateChange,
}: AppHeaderProps) {
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [featureGuideOpen, setFeatureGuideOpen] = useState(false);

  // TTS state
  const [provider, setProvider] = useState<TtsProvider>(() => ttsService.getProvider());
  const [azureKey, setAzureKey] = useState('');
  const [azureRegion, setAzureRegion] = useState('eastasia');
  const [azureVoiceZh, setAzureVoiceZh] = useState('zh-CN-XiaoxiaoNeural');
  const [azureVoiceEn, setAzureVoiceEn] = useState('en-US-JennyNeural');
  const [azureTestStatus, setAzureTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [azureTestError, setAzureTestError] = useState('');

  useEffect(() => {
    const handler = () => setShortcutsOpen(true);
    window.addEventListener('openhsk:show-shortcuts', handler);
    return () => window.removeEventListener('openhsk:show-shortcuts', handler);
  }, []);

  useEffect(() => {
    const handler = () => setFeatureGuideOpen(true);
    window.addEventListener('openhsk:show-feature-guide', handler);
    return () => window.removeEventListener('openhsk:show-feature-guide', handler);
  }, []);

  // Load Azure config into form when dialog opens
  useEffect(() => {
    if (!settingsOpen) return;
    const cfg = loadAzureConfig();
    if (cfg) {
      setAzureKey(cfg.key);
      setAzureRegion(cfg.region);
      setAzureVoiceZh(cfg.voiceZh || 'zh-CN-XiaoxiaoNeural');
      setAzureVoiceEn(cfg.voiceEn || 'en-US-JennyNeural');
    }
    setProvider(ttsService.getProvider());
  }, [settingsOpen]);

  const handleTtsRateChange = useCallback(
    ([v]: number[]) => onTtsRateChange(v),
    [onTtsRateChange],
  );

  const handleProviderChange = useCallback((value: TtsProvider) => {
    setProvider(value);
    ttsService.setProvider(value);
  }, []);

  const handleSaveAzure = useCallback(() => {
    const config: AzureTtsConfig = {
      key: azureKey.trim(),
      region: azureRegion,
      voiceZh: azureVoiceZh,
      voiceEn: azureVoiceEn,
    };
    ttsService.setAzureConfig(config);
    saveAzureConfig(config);
    setAzureTestStatus('idle');
  }, [azureKey, azureRegion, azureVoiceZh, azureVoiceEn]);

  const handleTestAzure = useCallback(async () => {
    setAzureTestStatus('testing');
    setAzureTestError('');
    const config: AzureTtsConfig = {
      key: azureKey.trim(),
      region: azureRegion,
      voiceZh: azureVoiceZh,
      voiceEn: azureVoiceEn,
    };
    const result = await testAzureConfig(config);
    if (result.ok) {
      setAzureTestStatus('success');
      handleSaveAzure();
    } else {
      setAzureTestStatus('error');
      setAzureTestError(result.error || 'Connection failed');
    }
  }, [azureKey, azureRegion, azureVoiceZh, azureVoiceEn, handleSaveAzure]);

  const isActive = (view: ViewMode) => currentView === view;

  const azureVoices = getAzureVoices();
  const zhVoices = azureVoices.filter((v) => v.lang.startsWith('zh'));
  const enVoices = azureVoices.filter((v) => v.lang.startsWith('en'));

  return (
    <TooltipProvider delayDuration={300}>
      <header className="sticky top-0 z-50 border-b border-border/40 glass">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between gap-2">
          {/* Logo */}
          <button
            className="flex items-center gap-2 cursor-pointer select-none group"
            onClick={() => onNavigate('landing')}
            aria-label="OpenHSK home"
          >
            <div className="h-9 w-9 sm:h-10 sm:w-10 shrink-0 rounded-xl border border-primary/20 bg-background/90 p-1.5 shadow-sm group-hover:shadow-md group-hover:border-primary/30 transition-all duration-300">
              <img src="/brand/logo-mark.svg" alt="" className="h-full w-full" loading="eager" aria-hidden="true" />
            </div>
            <div className="leading-tight hidden sm:block">
              <span className="font-brand block text-lg sm:text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                OpenHSK
              </span>
              <span className="hidden lg:block text-[10px] text-muted-foreground uppercase tracking-[0.2em]">
                Open Chinese Learning
              </span>
            </div>
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-0.5 bg-muted/40 rounded-xl p-1">
            {navItems.map((item) => {
              if ((item.view === 'stories' && !storyDataset) || (item.view === 'books' && !bookDataset)) {
                return null;
              }
              const Icon = item.icon;
              const active = isActive(item.view);
              return (
                <Button
                  key={item.view}
                  variant={active ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => onNavigate(item.view)}
                  className={`gap-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    active ? 'shadow-sm' : 'hover:bg-background/60'
                  }`}
                  aria-label={item.label}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Button>
              );
            })}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-lg h-9 w-9"
                  onClick={onToggleDarkMode}
                  aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {darkMode ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{darkMode ? 'Light mode' : 'Dark mode'}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-lg h-9 w-9 hidden sm:flex"
                  onClick={() => setShortcutsOpen(true)}
                  aria-label="Keyboard shortcuts"
                >
                  <Keyboard className="w-[18px] h-[18px]" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Shortcuts <kbd className="kbd-shortcut ml-1">?</kbd></p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-lg h-9 w-9"
                  onClick={() => setFeatureGuideOpen(true)}
                  aria-label="Feature guide"
                >
                  <CircleHelp className="w-[18px] h-[18px]" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Feature Guide</p>
              </TooltipContent>
            </Tooltip>

            <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-lg h-9 w-9" aria-label="Settings">
                  <Settings className="w-[18px] h-[18px]" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-muted-foreground" />
                    Settings
                  </DialogTitle>
                  <DialogDescription>Customize your learning experience</DialogDescription>
                </DialogHeader>

                <div className="space-y-8 py-4">
                  {/* Voice Speed */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Voice Speed</Label>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {ttsRate.toFixed(2)}x
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground tabular-nums w-6">0.5</span>
                      <Slider
                        value={[ttsRate]}
                        onValueChange={handleTtsRateChange}
                        min={0.5}
                        max={2}
                        step={0.25}
                        className="flex-1"
                        aria-label="Voice speed slider"
                      />
                      <span className="text-xs text-muted-foreground tabular-nums w-6 text-right">2</span>
                    </div>
                  </div>

                  {/* TTS Provider */}
                  <div className="space-y-4 border-t border-border/40 pt-5">
                    <div className="flex items-center gap-2">
                      <Mic className="w-4 h-4 text-muted-foreground" />
                      <Label className="text-sm font-medium">Text-to-Speech Engine</Label>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-border/50 p-3 bg-muted/30">
                      <div className="space-y-0.5">
                        <div className="text-sm font-medium">
                          {provider === 'azure' ? 'Azure Neural TTS' : 'Browser TTS'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {provider === 'azure'
                            ? 'High-quality neural voices via Azure'
                            : 'Uses built-in browser voices'}
                        </div>
                      </div>
                      <Switch
                        checked={provider === 'azure'}
                        onCheckedChange={(checked) => handleProviderChange(checked ? 'azure' : 'browser')}
                        aria-label="Toggle Azure TTS"
                      />
                    </div>

                    {provider === 'browser' && (
                      <div className="rounded-xl border border-border/40 p-3 bg-muted/20 space-y-2">
                        <VoiceQualityBadge />
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Browser TTS is free and works immediately, but quality depends on your browser and OS.
                          Edge on Windows and Safari on macOS/iOS have excellent neural voices.
                          Firefox and Linux usually sound robotic — switch to Azure Neural for the best experience.
                        </p>
                      </div>
                    )}

                    {provider === 'azure' && (
                      <div className="space-y-4 rounded-xl border border-border/40 p-4 bg-muted/20">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            Azure Speech Services free tier: 0.5M characters/month + 5 audio hours/month of neural voices.
                            <a
                              href="https://azure.microsoft.com/en-us/services/cognitive-services/speech-services/"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline inline-flex items-center gap-0.5 ml-1"
                            >
                              Sign up free <ExternalLink className="w-3 h-3" />
                            </a>
                          </p>
                        </div>

                        <div className="space-y-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Speech Key</Label>
                            <Input
                              type="password"
                              placeholder="Paste your Azure Speech key"
                              value={azureKey}
                              onChange={(e) => {
                                setAzureKey(e.target.value);
                                setAzureTestStatus('idle');
                              }}
                              className="h-9 text-sm"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Region</Label>
                            <Select value={azureRegion} onValueChange={setAzureRegion}>
                              <SelectTrigger className="h-9 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="eastasia">East Asia</SelectItem>
                                <SelectItem value="southeastasia">Southeast Asia</SelectItem>
                                <SelectItem value="eastus">East US</SelectItem>
                                <SelectItem value="westus">West US</SelectItem>
                                <SelectItem value="westeurope">West Europe</SelectItem>
                                <SelectItem value="northeurope">North Europe</SelectItem>
                                <SelectItem value="japaneast">Japan East</SelectItem>
                                <SelectItem value="koreacentral">Korea Central</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium">Chinese Voice</Label>
                              <Select value={azureVoiceZh} onValueChange={setAzureVoiceZh}>
                                <SelectTrigger className="h-9 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {zhVoices.map((v) => (
                                    <SelectItem key={v.name} value={v.name} className="text-xs">
                                      {v.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium">English Voice</Label>
                              <Select value={azureVoiceEn} onValueChange={setAzureVoiceEn}>
                                <SelectTrigger className="h-9 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {enVoices.map((v) => (
                                    <SelectItem key={v.name} value={v.name} className="text-xs">
                                      {v.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs"
                              onClick={handleTestAzure}
                              disabled={azureTestStatus === 'testing' || !azureKey.trim()}
                            >
                              {azureTestStatus === 'testing' ? 'Testing…' : 'Test & Save'}
                            </Button>
                            {azureTestStatus === 'success' && (
                              <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Connected
                              </span>
                            )}
                            {azureTestStatus === 'error' && (
                              <span className="text-xs text-destructive font-medium flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5" />
                                {azureTestError}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Keyboard Shortcuts Dialog */}
        <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Keyboard className="w-5 h-5 text-muted-foreground" />
                Keyboard Shortcuts
              </DialogTitle>
              <DialogDescription>Speed up your workflow with these shortcuts</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-3">
              {[
                { keys: ['/'], desc: 'Focus search' },
                { keys: ['Esc'], desc: 'Go back / close' },
                { keys: ['Alt', '1'], desc: 'Go to Dashboard' },
                { keys: ['Alt', '2'], desc: 'Go to Browse' },
                { keys: ['Alt', '3'], desc: 'Go to Progress' },
                { keys: ['?'], desc: 'Show this help' },
              ].map((item) => (
                <div key={item.desc} className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
                  <span className="text-sm text-muted-foreground">{item.desc}</span>
                  <div className="flex items-center gap-1">
                    {item.keys.map((k) => (
                      <kbd key={k} className="kbd-shortcut">{k}</kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* Feature Guide */}
        <FeatureGuide
          open={featureGuideOpen}
          onOpenChange={setFeatureGuideOpen}
          onNavigate={onNavigate}
        />
      </header>
    </TooltipProvider>
  );
});
