import { Suspense, lazy, memo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SectionLoader } from './SectionLoader';
import { loadVocabDataset, loadDialogueDataset } from '@/services/professionalDataService';
import type { VocabDataset, DialogueDataset } from '@/types/professional';

const TechVocabularyBrowser = lazy(() => import('@/components/TechVocabularyBrowser'));
const WorkplaceDialogueViewer = lazy(() => import('@/components/WorkplaceDialogueViewer'));

interface ProfessionalViewProps {
  onDatasetLoaded?: () => void;
}

export const ProfessionalView = memo(function ProfessionalView({ onDatasetLoaded }: ProfessionalViewProps) {
  const [vocabDataset, setVocabDataset] = useState<VocabDataset | null>(null);
  const [dialogueDataset, setDialogueDataset] = useState<DialogueDataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'vocab' | 'dialogues'>('vocab');

  useEffect(() => {
    let disposed = false;

    const load = async () => {
      const [vocab, dialogues] = await Promise.all([
        loadVocabDataset(),
        loadDialogueDataset(),
      ]);
      if (!disposed) {
        setVocabDataset(vocab);
        setDialogueDataset(dialogues);
        setLoading(false);
        if (onDatasetLoaded) onDatasetLoaded();
      }
    };

    load();
    return () => { disposed = true; };
  }, [onDatasetLoaded]);

  if (loading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <SectionLoader label="Loading professional dataset..." />
      </motion.div>
    );
  }

  const hasVocab = vocabDataset && vocabDataset.terms.length > 0;
  const hasDialogues = dialogueDataset && dialogueDataset.scenarios.length > 0;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'vocab' | 'dialogues')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="vocab">
            Technical Vocabulary
            {hasVocab && <span className="ml-1.5 text-[10px] text-muted-foreground">({vocabDataset.terms.length})</span>}
          </TabsTrigger>
          <TabsTrigger value="dialogues">
            Workplace Dialogues
            {hasDialogues && <span className="ml-1.5 text-[10px] text-muted-foreground">({dialogueDataset.scenarios.length})</span>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vocab" className="mt-4">
          {hasVocab ? (
            <Suspense fallback={<SectionLoader label="Loading vocabulary..." />}>
              <TechVocabularyBrowser
                terms={vocabDataset.terms}
                categories={vocabDataset.meta.categories}
              />
            </Suspense>
          ) : (
            <SectionLoader label="Vocabulary dataset not available" />
          )}
        </TabsContent>

        <TabsContent value="dialogues" className="mt-4">
          {hasDialogues ? (
            <Suspense fallback={<SectionLoader label="Loading dialogues..." />}>
              <WorkplaceDialogueViewer scenarios={dialogueDataset.scenarios} />
            </Suspense>
          ) : (
            <SectionLoader label="Dialogue dataset not available" />
          )}
        </TabsContent>
      </Tabs>
    </motion.div>
  );
});
