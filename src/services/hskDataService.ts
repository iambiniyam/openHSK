import type { HSKEntry, StudyProgress, UserStats } from '@/types/hsk';
import { loadHskDataset } from '@/lib/datasetLoader';

export interface DailyStats {
  date: string;
  newWordsLearned: number;
  wordsReviewed: number;
  studyTimeMinutes: number;
  quizzesCompleted: number;
  writingExercises: number;
}

class HSKDataService {
  private data: HSKEntry[] = [];
  private progress: Map<string, StudyProgress> = new Map();
  private favorites: Set<string> = new Set();
  private dailyStats: DailyStats = {
    date: new Date().toISOString().split('T')[0],
    newWordsLearned: 0,
    wordsReviewed: 0,
    studyTimeMinutes: 0,
    quizzesCompleted: 0,
    writingExercises: 0
  };
  private stats: UserStats = {
    totalStudied: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastStudyDate: '',
    levelProgress: {}
  };

  async loadData(): Promise<void> {
    try {
      this.data = await loadHskDataset<HSKEntry>();
      this.loadProgressFromStorage();
      this.calculateLevelProgress();
      this.checkAndResetDailyStats();
    } catch (error) {
      console.error('Failed to load HSK data:', error);
    }
  }

  getAllEntries(): HSKEntry[] {
    return this.data;
  }

  getEntriesByLevel(level: number): HSKEntry[] {
    return this.data.filter(entry => entry.source.level === level);
  }

  getEntryById(id: string): HSKEntry | undefined {
    return this.data.find(entry => entry.entry_id === id);
  }

  searchEntries(query: string): HSKEntry[] {
    const lowerQuery = query.toLowerCase().trim();
    if (!lowerQuery) return this.data;

    return this.data.filter(entry => {
      const hanziMatch = entry.source.hanzi.includes(query);
      const pinyinMatch = entry.source.pinyin.toLowerCase().includes(lowerQuery);
      const meaningMatch = entry.source.meaning.toLowerCase().includes(lowerQuery);
      const englishMatch = entry.core.english_definitions.some(def => 
        def.toLowerCase().includes(lowerQuery)
      );
      return hanziMatch || pinyinMatch || meaningMatch || englishMatch;
    });
  }

  // Advanced search with pinyin tone matching
  searchWithPinyinTones(query: string): HSKEntry[] {
    const normalizedQuery = query.toLowerCase().trim();
    if (!normalizedQuery) return this.data;

    return this.data.filter(entry => {
      // Exact pinyin match (with tones)
      const exactPinyin = entry.source.pinyin.toLowerCase() === normalizedQuery;
      
      // Pinyin without tones match
      const pinyinNoTones = entry.source.pinyin.toLowerCase().replace(/[0-9]/g, '');
      const queryNoTones = normalizedQuery.replace(/[0-9]/g, '');
      const noToneMatch = pinyinNoTones === queryNoTones;
      
      // Partial pinyin match
      const partialPinyin = entry.source.pinyin.toLowerCase().includes(normalizedQuery);
      
      // Hanzi match
      const hanziMatch = entry.source.hanzi.includes(query);
      
      // Meaning match
      const meaningMatch = entry.core.english_definitions.some(def => 
        def.toLowerCase().includes(normalizedQuery)
      );
      
      return exactPinyin || noToneMatch || partialPinyin || hanziMatch || meaningMatch;
    });
  }

  getEntriesByPartOfSpeech(pos: string): HSKEntry[] {
    return this.data.filter(entry => 
      entry.core.part_of_speech.includes(pos)
    );
  }

  getLevelStats(): { level: number; total: number; label: string }[] {
    const stats: { [key: number]: number } = {};
    this.data.forEach(entry => {
      const level = entry.source.level;
      stats[level] = (stats[level] || 0) + 1;
    });

    return Object.entries(stats)
      .map(([level, total]) => ({
        level: parseInt(level),
        total,
        label: `HSK ${level}`
      }))
      .sort((a, b) => a.level - b.level);
  }

  getRelatedEntries(entryId: string): HSKEntry[] {
    const entry = this.getEntryById(entryId);
    if (!entry) return [];

    const related: HSKEntry[] = [];
    
    // Find entries with same characters
    const characters = entry.source.hanzi.split('');
    characters.forEach(char => {
      if (char.length === 1) {
        const charEntries = this.data.filter(e => 
          e.source.hanzi.includes(char) && e.entry_id !== entryId
        );
        related.push(...charEntries.slice(0, 5));
      }
    });

    // Find entries with similar pinyin
    const pinyinBase = entry.source.pinyin.replace(/[0-9]/g, '');
    const pinyinMatches = this.data.filter(e => 
      e.source.pinyin.replace(/[0-9]/g, '') === pinyinBase && 
      e.entry_id !== entryId
    );
    related.push(...pinyinMatches.slice(0, 3));

    return [...new Set(related)].slice(0, 10);
  }

  getRandomEntries(count: number, level?: number): HSKEntry[] {
    const pool = level ? this.getEntriesByLevel(level) : this.data;
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  // Favorites management
  getFavorites(): string[] {
    return Array.from(this.favorites);
  }

  isFavorite(entryId: string): boolean {
    return this.favorites.has(entryId);
  }

  addToFavorites(entryId: string): void {
    this.favorites.add(entryId);
    this.saveFavoritesToStorage();
  }

  removeFromFavorites(entryId: string): void {
    this.favorites.delete(entryId);
    this.saveFavoritesToStorage();
  }

  toggleFavorite(entryId: string): boolean {
    if (this.favorites.has(entryId)) {
      this.removeFromFavorites(entryId);
      return false;
    } else {
      this.addToFavorites(entryId);
      return true;
    }
  }

  clearFavorites(): void {
    this.favorites.clear();
    this.saveFavoritesToStorage();
  }

  private saveFavoritesToStorage(): void {
    try {
      localStorage.setItem('hsk_favorites', JSON.stringify(Array.from(this.favorites)));
    } catch (e) {
      console.error('Failed to save favorites:', e);
    }
  }

  // Daily stats management
  getDailyStats(): DailyStats {
    this.checkAndResetDailyStats();
    return this.dailyStats;
  }

  incrementNewWords(count: number = 1): void {
    this.checkAndResetDailyStats();
    this.dailyStats.newWordsLearned += count;
    this.saveDailyStatsToStorage();
  }

  incrementReviewedWords(count: number = 1): void {
    this.checkAndResetDailyStats();
    this.dailyStats.wordsReviewed += count;
    this.saveDailyStatsToStorage();
  }

  incrementStudyTime(minutes: number): void {
    this.checkAndResetDailyStats();
    this.dailyStats.studyTimeMinutes += minutes;
    this.saveDailyStatsToStorage();
  }

  incrementQuizzes(count: number = 1): void {
    this.checkAndResetDailyStats();
    this.dailyStats.quizzesCompleted += count;
    this.saveDailyStatsToStorage();
  }

  incrementWritingExercises(count: number = 1): void {
    this.checkAndResetDailyStats();
    this.dailyStats.writingExercises += count;
    this.saveDailyStatsToStorage();
  }

  private checkAndResetDailyStats(): void {
    const today = new Date().toISOString().split('T')[0];
    if (this.dailyStats.date !== today) {
      this.dailyStats = {
        date: today,
        newWordsLearned: 0,
        wordsReviewed: 0,
        studyTimeMinutes: 0,
        quizzesCompleted: 0,
        writingExercises: 0
      };
      this.saveDailyStatsToStorage();
    }
  }

  private saveDailyStatsToStorage(): void {
    try {
      localStorage.setItem('hsk_daily_stats', JSON.stringify(this.dailyStats));
    } catch (e) {
      console.error('Failed to save daily stats:', e);
    }
  }

  // Progress tracking
  private loadProgressFromStorage(): void {
    try {
      const saved = localStorage.getItem('hsk_progress');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.progress = new Map(Object.entries(parsed));
      }
      const savedStats = localStorage.getItem('hsk_stats');
      if (savedStats) {
        this.stats = JSON.parse(savedStats);
      }
      const savedFavorites = localStorage.getItem('hsk_favorites');
      if (savedFavorites) {
        this.favorites = new Set(JSON.parse(savedFavorites));
      }
      const savedDailyStats = localStorage.getItem('hsk_daily_stats');
      if (savedDailyStats) {
        this.dailyStats = JSON.parse(savedDailyStats);
      }
    } catch (e) {
      console.error('Failed to load progress:', e);
    }
  }

  private saveProgressToStorage(): void {
    try {
      const obj = Object.fromEntries(this.progress);
      localStorage.setItem('hsk_progress', JSON.stringify(obj));
      localStorage.setItem('hsk_stats', JSON.stringify(this.stats));
    } catch (e) {
      console.error('Failed to save progress:', e);
    }
  }

  private calculateLevelProgress(): void {
    const levelStats: { [level: number]: { studied: number; total: number } } = {};
    
    for (let i = 1; i <= 9; i++) {
      const total = this.getEntriesByLevel(i).length;
      const studied = Array.from(this.progress.values())
        .filter(p => p.level === i).length;
      levelStats[i] = { studied, total };
    }
    
    this.stats.levelProgress = levelStats;
  }

  getProgress(entryId: string): StudyProgress | undefined {
    return this.progress.get(entryId);
  }

  updateProgress(entryId: string, correct: boolean): void {
    const entry = this.getEntryById(entryId);
    if (!entry) return;

    const existing = this.progress.get(entryId);
    const now = Date.now();
    
    if (existing) {
      existing.lastReviewed = now;
      existing.reviewCount++;
      this.incrementReviewedWords();
      if (correct) {
        existing.correctCount++;
        existing.confidence = Math.min(existing.confidence + 0.1, 1);
      } else {
        existing.confidence = Math.max(existing.confidence - 0.2, 0);
      }
      // Simple SRS: next review in 1, 3, 7, 14, 30 days based on confidence
      const days = [1, 3, 7, 14, 30][Math.floor(existing.confidence * 4)] || 1;
      existing.nextReview = now + days * 24 * 60 * 60 * 1000;
    } else {
      this.progress.set(entryId, {
        entryId,
        level: entry.source.level,
        lastReviewed: now,
        nextReview: now + 24 * 60 * 60 * 1000,
        confidence: correct ? 0.3 : 0.1,
        reviewCount: 1,
        correctCount: correct ? 1 : 0
      });
      this.stats.totalStudied++;
      this.incrementNewWords();
    }

    this.updateStreak();
    this.calculateLevelProgress();
    this.saveProgressToStorage();
  }

  private updateStreak(): void {
    const today = new Date().toISOString().split('T')[0];
    const lastDate = this.stats.lastStudyDate;
    
    if (lastDate === today) return;
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    if (lastDate === yesterdayStr) {
      this.stats.currentStreak++;
    } else {
      this.stats.currentStreak = 1;
    }
    
    if (this.stats.currentStreak > this.stats.longestStreak) {
      this.stats.longestStreak = this.stats.currentStreak;
    }
    
    this.stats.lastStudyDate = today;
  }

  getUserStats(): UserStats {
    return this.stats;
  }

  getDueReviews(): StudyProgress[] {
    const now = Date.now();
    return Array.from(this.progress.values())
      .filter(p => p.nextReview <= now)
      .sort((a, b) => a.nextReview - b.nextReview);
  }

  getRecommendedEntries(count: number): HSKEntry[] {
    const dueReviews = this.getDueReviews();
    const entryIds = dueReviews.slice(0, count).map(p => p.entryId);
    
    if (entryIds.length < count) {
      // Add new entries from current level
      const currentLevel = this.getRecommendedLevel();
      const newEntries = this.getEntriesByLevel(currentLevel)
        .filter(e => !this.progress.has(e.entry_id))
        .slice(0, count - entryIds.length);
      entryIds.push(...newEntries.map(e => e.entry_id));
    }

    return entryIds.map(id => this.getEntryById(id)).filter(Boolean) as HSKEntry[];
  }

  getRecommendedLevel(): number {
    // Find the level with the most unstudied entries
    for (let i = 1; i <= 9; i++) {
      const total = this.getEntriesByLevel(i).length;
      const studied = Array.from(this.progress.values())
        .filter(p => p.level === i).length;
      if (studied < total * 0.8) return i;
    }
    return 1;
  }

  // Export/Import functionality
  exportData(): string {
    const data = {
      progress: Object.fromEntries(this.progress),
      stats: this.stats,
      favorites: Array.from(this.favorites),
      dailyStats: this.dailyStats,
      exportDate: new Date().toISOString()
    };
    return JSON.stringify(data, null, 2);
  }

  importData(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      
      if (data.progress) {
        this.progress = new Map(Object.entries(data.progress));
      }
      if (data.stats) {
        this.stats = data.stats;
      }
      if (data.favorites) {
        this.favorites = new Set(data.favorites);
      }
      if (data.dailyStats) {
        this.dailyStats = data.dailyStats;
      }
      
      this.saveProgressToStorage();
      this.saveFavoritesToStorage();
      this.saveDailyStatsToStorage();
      
      return true;
    } catch (e) {
      console.error('Failed to import data:', e);
      return false;
    }
  }

  resetProgress(): void {
    this.progress.clear();
    this.favorites.clear();
    this.stats = {
      totalStudied: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastStudyDate: '',
      levelProgress: {}
    };
    this.dailyStats = {
      date: new Date().toISOString().split('T')[0],
      newWordsLearned: 0,
      wordsReviewed: 0,
      studyTimeMinutes: 0,
      quizzesCompleted: 0,
      writingExercises: 0
    };
    this.calculateLevelProgress();
    this.saveProgressToStorage();
    this.saveFavoritesToStorage();
    this.saveDailyStatsToStorage();
  }
}

export const hskDataService = new HSKDataService();
