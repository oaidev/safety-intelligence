import React from 'react';
import { Check, Loader2, Clock, AlertCircle, Brain, FileText, Mic, Image, Video } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export interface ProcessingStep {
  id: string;
  label: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress?: number;
  details?: string;
  subSteps?: Array<{
    label: string;
    status: 'pending' | 'processing' | 'completed' | 'error';
  }>;
}

export interface ThinkingMessage {
  text: string;
  timestamp: number;
}

interface InvestigationProcessingPipelineProps {
  steps: ProcessingStep[];
  thinkingMessages: ThinkingMessage[];
  overallProgress: number;
  isComplete: boolean;
}

const StepIcon = ({ stepId }: { stepId: string }) => {
  switch (stepId) {
    case 'audio':
      return <Mic className="h-4 w-4" />;
    case 'documents':
      return <FileText className="h-4 w-4" />;
    case 'images':
      return <Image className="h-4 w-4" />;
    case 'videos':
      return <Video className="h-4 w-4" />;
    case 'analysis':
      return <Brain className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
};

const StatusIcon = ({ status }: { status: ProcessingStep['status'] }) => {
  switch (status) {
    case 'completed':
      return <Check className="h-4 w-4 text-green-500" />;
    case 'processing':
      return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
    case 'error':
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
};

export function InvestigationProcessingPipeline({
  steps,
  thinkingMessages,
  overallProgress,
  isComplete,
}: InvestigationProcessingPipelineProps) {
  return (
    <Card className="w-full">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Loader2 className={cn("h-4 w-4", !isComplete && "animate-spin")} />
          {isComplete ? 'Processing Complete' : 'Generating Investigation Report...'}
        </CardTitle>
        <Progress value={overallProgress} className="h-2 mt-2" />
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-4">
        {/* Processing Steps */}
        <div className="space-y-3">
          {steps.map((step) => (
            <div key={step.id} className="space-y-1">
              <div className="flex items-center gap-3">
                <StatusIcon status={step.status} />
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <StepIcon stepId={step.id} />
                  <span className={cn(
                    "text-sm font-medium",
                    step.status === 'completed' && "text-green-600",
                    step.status === 'processing' && "text-primary",
                    step.status === 'pending' && "text-muted-foreground",
                    step.status === 'error' && "text-destructive"
                  )}>
                    {step.label}
                  </span>
                </div>
                {step.progress !== undefined && step.status === 'processing' && (
                  <span className="text-xs text-muted-foreground">
                    {step.progress}%
                  </span>
                )}
              </div>
              
              {/* Sub-steps */}
              {step.subSteps && step.subSteps.length > 0 && (
                <div className="ml-7 pl-3 border-l space-y-1">
                  {step.subSteps.map((subStep, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                      <StatusIcon status={subStep.status} />
                      <span className={cn(
                        subStep.status === 'completed' && "text-green-600",
                        subStep.status === 'processing' && "text-primary",
                        subStep.status === 'pending' && "text-muted-foreground"
                      )}>
                        {subStep.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Details */}
              {step.details && (
                <p className="ml-7 text-xs text-muted-foreground">{step.details}</p>
              )}
            </div>
          ))}
        </div>

        {/* AI Thinking Animation */}
        {thinkingMessages.length > 0 && !isComplete && (
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <Brain className="h-4 w-4" />
              <span>AI sedang menganalisis...</span>
              <span className="flex gap-0.5 ml-auto">
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            </div>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {thinkingMessages.slice(-3).map((msg, idx) => (
                <p key={idx} className="text-xs text-muted-foreground italic">
                  "{msg.text}"
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Completion Message */}
        {isComplete && (
          <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3">
            <div className="flex items-center gap-2 text-sm font-medium text-green-600">
              <Check className="h-4 w-4" />
              Report berhasil dibuat! Anda dapat mengedit dan mengekspor report di bawah.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
