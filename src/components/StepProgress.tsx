import React from 'react';
import { CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepProgressProps {
  currentStep: number;
  totalSteps?: number;
}

const StepProgress = ({ currentStep, totalSteps = 3 }: StepProgressProps) => {
  const steps = [
    { number: 1, title: 'Upload Audio' },
    { number: 2, title: 'Review Transcript' },
    { number: 3, title: 'Generate Report' },
  ];

  return (
    <div className="flex items-center justify-center mb-12">
      {steps.map((step, index) => (
        <React.Fragment key={step.number}>
          <div className="flex flex-col items-center">
            <div
              className={cn(
                'w-12 h-12 rounded-full flex items-center justify-center font-semibold transition-all duration-300',
                step.number === currentStep &&
                  'bg-primary text-primary-foreground ring-4 ring-primary/20 scale-110',
                step.number < currentStep && 'bg-primary text-primary-foreground',
                step.number > currentStep && 'bg-muted text-muted-foreground'
              )}
            >
              {step.number < currentStep ? (
                <CheckCircle className="h-6 w-6" />
              ) : (
                step.number
              )}
            </div>
            <span
              className={cn(
                'text-sm mt-2 font-medium transition-colors',
                step.number === currentStep && 'text-primary',
                step.number < currentStep && 'text-primary',
                step.number > currentStep && 'text-muted-foreground'
              )}
            >
              {step.title}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div
              className={cn(
                'h-1 w-24 mx-4 transition-all duration-300',
                step.number < currentStep ? 'bg-primary' : 'bg-muted'
              )}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default StepProgress;
