import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  Search, 
  Clock, 
  Copy, 
  AlertTriangle, 
  CheckCircle, 
  Info,
  Download,
  BarChart3
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { AnalysisResult, MultiAnalysisResult } from '@/lib/multiRagService';

interface AnalysisResultsProps {
  results: MultiAnalysisResult | null;
  isAnalyzing: boolean;
}

export function AnalysisResults({ results, isAnalyzing }: AnalysisResultsProps) {
  const { toast } = useToast();

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Copied',
        description: 'Content copied to clipboard',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy to clipboard',
        variant: 'destructive',
      });
    }
  };

  const exportResults = () => {
    if (!results) return;

    const exportData = {
      timestamp: new Date().toISOString(),
      totalProcessingTime: results.totalProcessingTime,
      results: results.results.map(result => ({
        knowledgeBase: result.knowledgeBaseName,
        category: result.category,
        confidence: result.confidence,
        reasoning: result.reasoning,
        processingTime: result.processingTime
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `safety-analysis-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Exported',
      description: 'Analysis results exported successfully',
    });
  };

  const getConfidenceColor = (confidence: string) => {
    const numericConfidence = parseInt(confidence.replace(/[^\d]/g, '')) || 0;
    if (numericConfidence >= 80) return 'success';
    if (numericConfidence >= 60) return 'warning';
    return 'destructive';
  };

  const getConfidenceProgress = (confidence: string) => {
    return parseInt(confidence.replace(/[^\d]/g, '')) || 0;
  };

  if (isAnalyzing) {
    return (
      <div className="space-y-6">
        <Card className="shadow-card">
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center space-y-3">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center animate-pulse">
                <Search className="h-8 w-8 text-primary animate-spin" />
              </div>
              <p className="text-lg font-medium">Analyzing across all knowledge bases...</p>
              <p className="text-sm text-muted-foreground">
                Processing Safety Golden Rules, PSPP, and TBC simultaneously
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!results) {
    return (
      <Card className="shadow-card">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-3">
            <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">
              Enter a hazard description and click "Analyze All Knowledge Bases" to see comprehensive results
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">

      {/* Individual Results */}
      {results.results.map((result, index) => (
        <SingleAnalysisResult 
          key={result.knowledgeBaseId} 
          result={result} 
          onCopy={copyToClipboard}
          getConfidenceColor={getConfidenceColor}
          getConfidenceProgress={getConfidenceProgress}
        />
      ))}
    </div>
  );
}

interface SingleAnalysisResultProps {
  result: AnalysisResult;
  onCopy: (text: string) => void;
  getConfidenceColor: (confidence: string) => string;
  getConfidenceProgress: (confidence: string) => number;
}

function SingleAnalysisResult({ 
  result, 
  onCopy, 
  getConfidenceColor, 
  getConfidenceProgress 
}: SingleAnalysisResultProps) {
  const confidenceColor = getConfidenceColor(result.confidence);
  const confidenceProgress = getConfidenceProgress(result.confidence);

  return (
    <Card className={`shadow-card animate-fade-in border-l-4 border-l-${result.color}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`bg-${result.color}/10 text-${result.color} border-${result.color}/20`}>
              {result.knowledgeBaseName}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            {result.processingTime}ms
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Category and Confidence */}
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">Category</span>
              <Badge variant="secondary" className="text-base font-semibold">
                {result.category}
              </Badge>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">Confidence</span>
              <Badge variant={confidenceColor === 'success' ? 'default' : 'secondary'} 
                     className={confidenceColor === 'success' ? 'bg-success text-success-foreground' : ''}>
                {result.confidence}
              </Badge>
            </div>
            <Progress value={confidenceProgress} className="h-2" />
          </div>
        </div>
        
        <Separator />
        
        {/* Reasoning */}
        <div>
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <Info className="h-4 w-4" />
            Reasoning
          </h4>
          <p className="text-sm text-muted-foreground leading-relaxed">{result.reasoning}</p>
        </div>

      </CardContent>
    </Card>
  );
}