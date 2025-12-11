import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Info, 
  ChevronDown, 
  ChevronUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Lightbulb,
  Brain,
  Search,
  Zap,
  AlertTriangle,
  MinusCircle
} from 'lucide-react';

export interface ThinkingStep {
  step: number;
  name: string;
  description: string;
  timestamp: number;
  duration: number;
  details: any;
  status: 'success' | 'error' | 'warning';
}

export interface ThinkingProcess {
  steps: ThinkingStep[];
  totalDuration: number;
  summary: string;
  metadata?: {
    category?: 'similarity-detection' | 'similarity-analysis' | 'clustering' | 'pain-point-detection' | 'recommendations' | 'investigation' | 'batch-analysis';
    configUsed?: any;
    candidatesAnalyzed?: number;
    finalResults?: number;
    [key: string]: any;
  };
}

interface ThinkingProcessViewerProps {
  thinkingProcess: ThinkingProcess;
  compact?: boolean;
}

export function ThinkingProcessViewer({ thinkingProcess, compact = false }: ThinkingProcessViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isInvestigation = thinkingProcess.metadata?.category === 'investigation';
  const showDuration = thinkingProcess.totalDuration > 0;

  if (compact) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
            <Info className="h-4 w-4" />
            Lihat Proses Thinking
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3">
          <ThinkingProcessContent thinkingProcess={thinkingProcess} simplified={isInvestigation} />
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <Card className="border-blue-200 bg-blue-50/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-blue-100">
              <Brain className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Proses Thinking</CardTitle>
              <CardDescription className="text-sm">
                {thinkingProcess.summary}
              </CardDescription>
            </div>
          </div>
          {showDuration && (
            <Badge variant="secondary" className="gap-1">
              <Clock className="h-3 w-3" />
              {(thinkingProcess.totalDuration / 1000).toFixed(2)}s
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ThinkingProcessContent thinkingProcess={thinkingProcess} simplified={isInvestigation} />
      </CardContent>
    </Card>
  );
}

function ThinkingProcessContent({ thinkingProcess, simplified = false }: { thinkingProcess: ThinkingProcess; simplified?: boolean }) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'warning': return <MinusCircle className="h-4 w-4 text-muted-foreground" />;
      default: return <CheckCircle className="h-4 w-4 text-blue-600" />;
    }
  };

  // Simplified view for investigation reports
  if (simplified) {
    return (
      <div className="space-y-2">
        {thinkingProcess.steps.map((step, index) => (
          <div key={index} className="flex items-start gap-2 py-1">
            {getStatusIcon(step.status)}
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium">Step {step.step}: {step.name}</span>
              <span className="text-sm text-muted-foreground ml-2">— {step.description}</span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Full detailed view for other categories
  const getStepIcon = (stepNumber: number) => {
    switch (stepNumber) {
      case 1: return <CheckCircle className="h-4 w-4" />;
      case 2: return <Brain className="h-4 w-4" />;
      case 3: return <Search className="h-4 w-4" />;
      case 4: return <Lightbulb className="h-4 w-4" />;
      default: return <Zap className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-50';
      case 'error': return 'text-red-600 bg-red-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-blue-600 bg-blue-50';
    }
  };

  return (
    <div className="space-y-3">
      {thinkingProcess.steps.map((step, index) => (
        <div key={index} className="relative pl-8">
          {/* Timeline connector */}
          {index < thinkingProcess.steps.length - 1 && (
            <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-blue-200" />
          )}
          
          {/* Step icon */}
          <div className={`absolute left-0 top-1 p-2 rounded-full ${getStatusColor(step.status)}`}>
            {getStepIcon(step.step)}
          </div>

          {/* Step content */}
          <Collapsible defaultOpen={false}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-3 h-auto hover:bg-blue-50/50">
                <div className="text-left">
                  <div className="font-medium text-sm flex items-center gap-2 flex-wrap">
                    Step {step.step}: {step.name}
                    {step.duration > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {step.duration}ms
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {step.description}
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 shrink-0" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="p-3 bg-gray-50 rounded-md text-sm space-y-2">
                {/* Message */}
                {step.details?.message && (
                  <div className="flex items-start gap-2 p-2 bg-green-50 rounded">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                    <p className="text-sm text-green-900">{step.details.message}</p>
                  </div>
                )}

                {/* Explanation */}
                {step.details?.explanation && (
                  <div className="flex items-start gap-2 p-2 bg-blue-50 rounded">
                    <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                    <p className="text-sm text-blue-900">{step.details.explanation}</p>
                  </div>
                )}

                {/* Warning */}
                {step.details?.warning && (
                  <div className="flex items-start gap-2 p-2 bg-yellow-50 rounded">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
                    <p className="text-sm text-yellow-900">{step.details.warning}</p>
                  </div>
                )}

                {/* Error */}
                {step.details?.error && (
                  <div className="flex items-start gap-2 p-2 bg-red-50 rounded">
                    <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                    <p className="text-sm text-red-900">{step.details.error}</p>
                  </div>
                )}
                
                {/* Technical details */}
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    Lihat detail teknis
                  </summary>
                  <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto max-h-40 text-xs">
                    {JSON.stringify(step.details, null, 2)}
                  </pre>
                </details>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      ))}
    </div>
  );
}
