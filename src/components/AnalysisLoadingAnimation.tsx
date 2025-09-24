import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';

export function AnalysisLoadingAnimation() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          return 0;
        }
        return prev + 1;
      });
    }, 80);

    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="shadow-card">
      <CardContent className="flex items-center justify-center py-16">
        <div className="text-center space-y-4 max-w-sm">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <Search className="h-6 w-6 text-primary animate-pulse" />
          </div>
          
          <div className="space-y-2">
            <p className="text-lg font-medium text-foreground">
              Analyzing Safety Data
            </p>
            <p className="text-sm text-muted-foreground">
              Processing across multiple knowledge bases
            </p>
          </div>

          <div className="w-full max-w-xs mx-auto">
            <Progress value={progress} className="h-1" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}