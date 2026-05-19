import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Library,
  Search,
  Filter,
  BookOpen,
  X,
  Layers,
  Clock,
  Hash,
  BookX,
  CheckCircle2,
} from 'lucide-react';
import { Empty, EmptyContent, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import type { Book, BookDatasetMeta } from '@/types/books';

interface BookBrowserProps {
  books: Book[];
  meta?: BookDatasetMeta;
  onBookSelect: (book: Book, index: number) => void;
}

const levelLabels: Record<number, string> = {
  1: 'HSK 1', 2: 'HSK 2', 3: 'HSK 3', 4: 'HSK 4', 5: 'HSK 5', 6: 'HSK 6',
  7: 'HSK 7-9', 8: 'HSK 7-9', 9: 'HSK 7-9',
};

const levelSpineColors: Record<number, string> = {
  1: 'from-green-400 to-emerald-500',
  2: 'from-emerald-400 to-teal-500',
  3: 'from-blue-400 to-cyan-500',
  4: 'from-purple-400 to-violet-500',
  5: 'from-orange-400 to-amber-500',
  6: 'from-red-400 to-rose-500',
  7: 'from-slate-400 to-gray-500',
};

const levelColors: Record<number, string> = {
  1: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
  2: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  3: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  4: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  5: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
  6: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
  7: 'bg-slate-100 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
};

const genreIcons: Record<string, string> = {
  adventure: '🏔️', mystery: '🔍', scifi: '🚀', romance: '💕',
  historical: '🏯', comedy: '😄', thriller: '🌑',
  slice_of_life: '🏠', fantasy: '🐉', travel: '🗺️',
};

const genreAccent: Record<string, string> = {
  adventure: 'border-l-amber-400 dark:border-l-amber-500',
  mystery: 'border-l-indigo-400 dark:border-l-indigo-500',
  scifi: 'border-l-cyan-400 dark:border-l-cyan-500',
  romance: 'border-l-pink-400 dark:border-l-pink-500',
  historical: 'border-l-yellow-500 dark:border-l-yellow-600',
  comedy: 'border-l-lime-400 dark:border-l-lime-500',
  thriller: 'border-l-gray-400 dark:border-l-gray-500',
  slice_of_life: 'border-l-teal-400 dark:border-l-teal-500',
  fantasy: 'border-l-violet-400 dark:border-l-violet-500',
  travel: 'border-l-sky-400 dark:border-l-sky-500',
};

const genreGradient: Record<string, string> = {
  adventure: 'from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20',
  mystery: 'from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/20',
  scifi: 'from-cyan-50 to-sky-50 dark:from-cyan-950/20 dark:to-sky-950/20',
  romance: 'from-pink-50 to-rose-50 dark:from-pink-950/20 dark:to-rose-950/20',
  historical: 'from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20',
  comedy: 'from-lime-50 to-green-50 dark:from-lime-950/20 dark:to-green-950/20',
  thriller: 'from-gray-50 to-zinc-50 dark:from-gray-950/20 dark:to-zinc-950/20',
  slice_of_life: 'from-teal-50 to-emerald-50 dark:from-teal-950/20 dark:to-emerald-950/20',
  fantasy: 'from-violet-50 to-fuchsia-50 dark:from-violet-950/20 dark:to-fuchsia-950/20',
  travel: 'from-sky-50 to-blue-50 dark:from-sky-950/20 dark:to-blue-950/20',
};

const estimateReadingTime = (chars: number): string => {
  const minutes = Math.max(1, Math.round(chars / 300));
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
};

export const BookBrowser = ({ books, meta, onBookSelect }: BookBrowserProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');

  const genres = useMemo(() => {
    const gs = new Map<string, string>();
    for (const b of books) {
      if (!gs.has(b.genre)) gs.set(b.genre, b.genre_label_english || b.genre);
    }
    return [...gs.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [books]);

  const bookIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    books.forEach((b, i) => map.set(b.book_id, i));
    return map;
  }, [books]);

  const filteredBooks = useMemo(() => {
    let result = books.filter((b) => !b.error);
    if (selectedLevel !== 'all') {
      const level = parseInt(selectedLevel);
      if (selectedLevel === '7-9') result = result.filter((b) => b.hsk_level >= 7);
      else result = result.filter((b) => b.hsk_level === level);
    }
    if (selectedGenre !== 'all') result = result.filter((b) => b.genre === selectedGenre);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((b) =>
        b.title_chinese.includes(q) || b.title_english.toLowerCase().includes(q) ||
        b.description_chinese.includes(q) || b.genre_label_chinese.includes(q) ||
        b.genre_label_english.toLowerCase().includes(q)
      );
    }
    return result;
  }, [books, selectedLevel, selectedGenre, searchQuery]);

  const getBookProgress = useMemo(() => {
    const progressMap = new Map<string, { completed: number; total: number }>();
    for (const book of books) {
      try {
        const saved = localStorage.getItem(`openhsk.book-progress.${book.book_id}.v1`);
        if (saved) {
          const completed = new Set<number>(JSON.parse(saved));
          progressMap.set(book.book_id, { completed: completed.size, total: book.total_chapters });
        }
      } catch { /* ignore */ }
    }
    return progressMap;
  }, [books]);

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      {meta && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="bg-gradient-to-br from-slate-50 to-amber-50 dark:from-slate-900/50 dark:to-amber-950/30 border-slate-200 dark:border-slate-800 overflow-hidden">
            <CardContent className="p-6 sm:p-8">
              <div className="flex items-start gap-4">
                <div className="hidden sm:flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/50 text-3xl shrink-0 shadow-inner">
                  📚
                </div>
                <div className="space-y-2 flex-1">
                  <h2 className="text-2xl font-bold tracking-tight">Your Book Library</h2>
                  <p className="text-muted-foreground text-sm max-w-lg">
                    Genre-based continuous stories covering every HSK word. Read chapter by chapter with pinyin and translations.
                  </p>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-1">
                    <span className="inline-flex items-center gap-1 bg-background/60 rounded-full px-3 py-1 border">
                      <BookOpen className="w-3 h-3" /> {meta.total_books} books
                    </span>
                    <span className="inline-flex items-center gap-1 bg-background/60 rounded-full px-3 py-1 border">
                      <Layers className="w-3 h-3" /> {meta.total_chapters} chapters
                    </span>
                    <span className="inline-flex items-center gap-1 bg-background/60 rounded-full px-3 py-1 border">
                      <Hash className="w-3 h-3" /> {(meta.overall_coverage * 100).toFixed(0)}% coverage
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Search & Filters */}
      <Card className="sticky top-20 z-10 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by title, genre, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-muted/50"
              />
              {searchQuery && (
                <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setSearchQuery('')}>
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                <SelectTrigger className="w-[130px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  {[1, 2, 3, 4, 5, 6].map((lv) => (
                    <SelectItem key={lv} value={String(lv)}>HSK {lv}</SelectItem>
                  ))}
                  <SelectItem value="7-9">HSK 7-9</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedGenre} onValueChange={setSelectedGenre}>
                <SelectTrigger className="w-[150px]">
                  <Layers className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Genre" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Genres</SelectItem>
                  {genres.map(([id, label]) => (
                    <SelectItem key={id} value={id}>{genreIcons[id] || '📖'} {label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bookshelf Grid */}
      {filteredBooks.length === 0 ? (
        <Empty className="min-h-[300px]">
          <EmptyContent>
            <EmptyMedia variant="icon"><BookX className="size-6" /></EmptyMedia>
            <EmptyTitle>No Books Found</EmptyTitle>
            <EmptyDescription>Try adjusting your filters or search query to find books matching your criteria.</EmptyDescription>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredBooks.map((book, i) => {

            const spineColor = levelSpineColors[book.hsk_level] || levelSpineColors[7];
            const accent = genreAccent[book.genre] || '';
            const bgGradient = genreGradient[book.genre] || '';
            const readingTime = estimateReadingTime(book.char_count || 0);
            const progress = book.coverage ? book.coverage * 100 : 0;

            return (
              <motion.div
                key={book.book_id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.4), duration: 0.35 }}
              >
                <div
                  className="group cursor-pointer"
                  onClick={() => onBookSelect(book, bookIndexMap.get(book.book_id) ?? 0)}
                >
                  {/* Book with spine effect */}
                  <div className={`relative rounded-xl border bg-gradient-to-br ${bgGradient} border-border hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden`}>
                    {/* Colored spine */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b ${spineColor}`} />
                    {/* Genre accent */}
                    <div className={`absolute left-1.5 top-0 bottom-0 w-0.5 border-l-2 ${accent} opacity-50`} />

                    <div className="pl-5 p-5">
                      {/* Level + Genre badges */}
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${levelColors[book.hsk_level] || levelColors[7]}`}>
                          {levelLabels[book.hsk_level] || `HSK ${book.hsk_level}`}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {genreIcons[book.genre] || '📖'} {book.genre_label_chinese}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="text-xl font-bold leading-tight mb-1 line-clamp-2 group-hover:text-primary transition-colors font-cn">
                        {book.title_chinese}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-1 italic">
                        {book.title_english}
                      </p>

                      {/* Description */}
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-4">
                        {book.description_chinese || book.description_english}
                      </p>

                      {/* Stats row */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-3.5 h-3.5" />
                          {book.total_chapters} chapters
                        </span>
                        <span className="flex items-center gap-1">
                          <Hash className="w-3.5 h-3.5" />
                          {book.word_count} words
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          ~{readingTime}
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="mt-3">
                        <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                          <span>Coverage</span>
                          <span>{progress.toFixed(0)}%</span>
                        </div>
                        <Progress value={progress} className="h-1" />
                      </div>

                      {/* Reading progress + CTA */}
                      <div className="mt-4 flex items-center gap-3">
                        {(() => {
                          const prog = getBookProgress.get(book.book_id);
                          if (!prog || prog.completed === 0) return null;
                          const pct = Math.round((prog.completed / prog.total) * 100);
                          return (
                            <div className="flex-1 space-y-1">
                              <div className="flex justify-between text-[10px] text-muted-foreground">
                                <span>{prog.completed}/{prog.total} chapters</span>
                                <span>{pct}%</span>
                              </div>
                              <Progress value={pct} className="h-1" />
                            </div>
                          );
                        })()}
                        <Button 
                          variant={(() => {
                            const prog = getBookProgress.get(book.book_id);
                            if (prog && prog.completed === prog.total && prog.total > 0) return 'secondary';
                            return 'default';
                          })()} 
                          size="sm" 
                          className="text-xs gap-1.5 shrink-0"
                        >
                          {(() => {
                            const prog = getBookProgress.get(book.book_id);
                            if (prog && prog.completed === prog.total && prog.total > 0) {
                              return <><CheckCircle2 className="w-3.5 h-3.5" />Completed</>;
                            }
                            if (prog && prog.completed > 0) {
                              return <><BookOpen className="w-3.5 h-3.5" />Continue</>;
                            }
                            return <><BookOpen className="w-3.5 h-3.5" />Start Reading</>;
                          })()}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Empty state if no books at all */}
      {books.length === 0 && (
        <Empty className="min-h-[300px]">
          <EmptyContent>
            <EmptyMedia variant="icon"><Library className="size-6" /></EmptyMedia>
            <EmptyTitle>Library is Empty</EmptyTitle>
            <EmptyDescription>Books are optional content. If you are self-hosting, you can generate genre-based books with the AI pipeline.</EmptyDescription>
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer hover:text-foreground transition-colors">For developers</summary>
              <code className="block mt-2 bg-muted px-3 py-1.5 rounded-md">npm run data:prepare:books</code>
            </details>
          </EmptyContent>
        </Empty>
      )}
    </div>
  );
};

export default BookBrowser;
