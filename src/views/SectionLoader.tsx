import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';

export const SectionLoader = ({ label }: { label: string }) => (
  <Card>
    <CardContent className="p-6 sm:p-8 text-center">
      <div className="flex items-center justify-center gap-3 text-muted-foreground">
        <motion.div
          className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
        <span className="text-sm sm:text-base">{label}</span>
      </div>
    </CardContent>
  </Card>
);
