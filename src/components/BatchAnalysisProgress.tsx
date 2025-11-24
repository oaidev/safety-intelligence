import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ThinkingProcessViewer, type ThinkingProcess } from '@/components/ThinkingProcessViewer';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText,
  BarChart3,
  Zap
} from 'lucide-react';

interface BatchItem {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  filename: string;
  result?: any;
  error?: string;
  thinkingProcess?: ThinkingProcess;
}

interface BatchAnalysisProgressProps {
  items: BatchItem[];
  totalItems: number;
  isProcessing: boolean;
  onItemClick?: (item: BatchItem) => void;
}

export function BatchAnalysisProgress({ 
  items, 
  totalItems, 
  isProcessing,
  onItemClick 
}: BatchAnalysisProgressProps) {
  const completedCount = items.filter(i => i.status === 'completed').length;
  const errorCount = items.filter(i => i.status === 'error').length;
  const progress = totalItems > 0 ? (completedCount / totalItems) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Overall Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Batch Analysis Progress
            {isProcessing && (
              <Badge variant="secondary" className="ml-2">
                <Clock className="h-3 w-3 mr-1 animate-spin" />
                Processing...
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{totalItems}</div>
              <div className="text-xs text-muted-foreground">Total Items</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{completedCount}</div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">{errorCount}</div>
              <div className="text-xs text-muted-foreground">Errors</div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Overall Progress</span>
              <span className="font-medium">{progress.toFixed(0)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Individual Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Item-by-Item Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {items.map((item, index) => (
              <div 
                key={item.id}
                className={`border rounded-lg p-4 transition-colors ${
                  onItemClick ? 'cursor-pointer hover:bg-muted/50' : ''
                }`}
                onClick={() => onItemClick?.(item)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    {item.status === 'completed' && (
                      <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                    )}
                    {item.status === 'error' && (
                      <XCircle className="h-5 w-5 text-red-600 shrink-0" />
                    )}
                    {item.status === 'processing' && (
                      <Zap className="h-5 w-5 text-blue-600 animate-pulse shrink-0" />
                    )}
                    {item.status === 'pending' && (
                      <Clock className="h-5 w-5 text-muted-foreground shrink-0" />
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">#{index + 1}</span>
                        <span className="text-sm truncate">{item.filename}</span>
                      </div>
                      
                      {item.error && (
                        <div className="text-xs text-red-600 mt-1">
                          Error: {item.error}
                        </div>
                      )}
                      
                      {item.result && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Analysis completed successfully
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <Badge 
                    variant={
                      item.status === 'completed' ? 'default' : 
                      item.status === 'error' ? 'destructive' :
                      item.status === 'processing' ? 'secondary' : 'outline'
                    }
                    className="shrink-0"
                  >
                    {item.status}
                  </Badge>
                </div>
                
                {/* Thinking Process */}
                {item.thinkingProcess && item.status === 'completed' && (
                  <div className="mt-3 pt-3 border-t">
                    <ThinkingProcessViewer 
                      thinkingProcess={item.thinkingProcess} 
                      compact={true} 
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
