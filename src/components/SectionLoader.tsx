import { Card, CardContent } from '@/components/ui/card';

export const SectionLoader = ({ label }: { label: string }) => (
  <Card>
    <CardContent className="p-6 sm:p-8 text-center">
      <div className="flex items-center justify-center gap-3 text-muted-foreground">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-sm sm:text-base">{label}</span>
      </div>
    </CardContent>
  </Card>
);

export default SectionLoader;
