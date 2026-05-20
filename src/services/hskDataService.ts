import type { HSKEntry } from '@/types/hsk';
import { fetchWithCacheFallback } from '@/lib/offlineFetch';

class HSKDataService {
  private data: HSKEntry[] = [];
  private favorites: Set<string> = new Set();

  async loadData(): Promise<void> {
    try {
      const [part1, part2] = await Promise.all([
        fetchWithCacheFallback('/hsk3.0.part1.json').then(r => r.json()),
        fetchWithCacheFallback('/hsk3.0.part2.json').then(r => r.json()),
      ]);
      this.data = [...(part1 as HSKEntry[]), ...(part2 as HSKEntry[])];
      this.loadFavoritesFromStorage();
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

  // Favorites management
  getFavorites(): string[] {
    return Array.from(this.favorites);
  }

  isFavorite(entryId: string): boolean {
    return this.favorites.has(entryId);
  }

  toggleFavorite(entryId: string): boolean {
    if (this.favorites.has(entryId)) {
      this.favorites.delete(entryId);
      this.saveFavoritesToStorage();
      return false;
    }
    this.favorites.add(entryId);
    this.saveFavoritesToStorage();
    return true;
  }

  clearFavorites(): void {
    this.favorites.clear();
    this.saveFavoritesToStorage();
  }

  private loadFavoritesFromStorage(): void {
    try {
      const saved = localStorage.getItem('hsk_favorites');
      if (saved) this.favorites = new Set(JSON.parse(saved));
    } catch { /* ignore */ }
  }

  private saveFavoritesToStorage(): void {
    try {
      localStorage.setItem('hsk_favorites', JSON.stringify(Array.from(this.favorites)));
    } catch { /* ignore */ }
  }
}

export const hskDataService = new HSKDataService();
