import { Suspense, memo } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { SectionLoader } from '@/components/SectionLoader';
import type { BookDataset, Book } from '@/types/books';

const BookBrowser = lazy(() => import('@/components/BookBrowser'));
const BookReader = lazy(() => import('@/components/BookReader'));

import { lazy } from 'react';

interface BooksViewProps {
  bookDataset: BookDataset | null;
  bookView: 'browse' | 'reader';
  currentBookIndex: number;
  onSetBookView: (view: 'browse' | 'reader') => void;
  onSetCurrentBookIndex: (index: number | ((prev: number) => number)) => void;
  onWordClick: (hanzi: string) => void;
}

export const BooksView = memo(function BooksView({
  bookDataset,
  bookView,
  currentBookIndex,
  onSetBookView,
  onSetCurrentBookIndex,
  onWordClick,
}: BooksViewProps) {
  if (!bookDataset) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <SectionLoader label="Loading book dataset..." />
      </motion.div>
    );
  }

  if (bookView === 'reader' && bookDataset) {
    const book = bookDataset.books[currentBookIndex];
    if (!book) return null;

    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => onSetBookView('browse')}>
            ← Back to Books
          </Button>
        </div>
        <Suspense fallback={<SectionLoader label="Loading book..." />}>
          <BookReader
            book={book}
            hasPrevious={currentBookIndex > 0}
            hasNext={currentBookIndex < bookDataset.books.length - 1}
            bookIndex={currentBookIndex}
            totalBooks={bookDataset.books.length}
            onWordClick={onWordClick}
            onPrevious={() => onSetCurrentBookIndex((i) => Math.max(0, i - 1))}
            onNext={() =>
              onSetCurrentBookIndex((i) =>
                Math.min(bookDataset.books.length - 1, i + 1)
              )
            }
          />
        </Suspense>
      </motion.div>
    );
  }

  const handleBookSelect = (_book: Book, index: number) => {
    onSetCurrentBookIndex(index);
    onSetBookView('reader');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Suspense fallback={<SectionLoader label="Loading book browser..." />}>
        <BookBrowser
          books={bookDataset.books}
          meta={bookDataset.meta}
          onBookSelect={handleBookSelect}
        />
      </Suspense>
    </motion.div>
  );
});
