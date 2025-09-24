import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, 
  Database, 
  Search, 
  Sparkles, 
  CheckCircle,
  Clock
} from 'lucide-react';
import { useEffect, useState } from 'react';

export function AnalysisLoadingAnimation() {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  const steps = [
    { 
      icon: Brain, 
      label: 'Processing Input', 
      description: 'Analyzing hazard description',
      color: 'blue',
      duration: 1000
    },
    { 
      icon: Database, 
      label: 'Loading Knowledge Bases', 
      description: 'Accessing Safety Golden Rules, PSPP, and TBC',
      color: 'green',
      duration: 1500
    },
    { 
      icon: Search, 
      label: 'Retrieving Context', 
      description: 'Finding relevant safety information',
      color: 'purple',
      duration: 2000
    },
    { 
      icon: Sparkles, 
      label: 'AI Analysis', 
      description: 'Generating comprehensive safety assessment',
      color: 'orange',
      duration: 2500
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < steps.length - 1) {
          return prev + 1;
        }
        return 0; // Loop back to start
      });
    }, 800);

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          return 0;
        }
        return prev + 2;
      });
    }, 50);

    return () => {
      clearInterval(interval);
      clearInterval(progressInterval);
    };
  }, []);

  return (
    <Card className="shadow-card border-primary/20">
      <CardContent className="py-8">
        <div className="text-center space-y-6">
          {/* Main Animation */}
          <div className="relative">
            <div className="mx-auto w-20 h-20 bg-gradient-primary rounded-full flex items-center justify-center animate-pulse">
              <div className="absolute inset-0 bg-gradient-primary rounded-full animate-ping opacity-75"></div>
              <div className="relative z-10">
                {steps.map((step, index) => {
                  const StepIcon = step.icon;
                  return (
                    <StepIcon
                      key={index}
                      className={`h-10 w-10 text-white transition-all duration-500 ${
                        index === currentStep 
                          ? 'opacity-100 scale-110' 
                          : 'opacity-0 scale-90 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2'
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Current Step Info */}
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                Step {currentStep + 1} of {steps.length}
              </Badge>
            </div>
            
            <h3 className="text-xl font-semibold text-primary">
              {steps[currentStep].label}
            </h3>
            
            <p className="text-muted-foreground max-w-md mx-auto">
              {steps[currentStep].description}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2 max-w-sm mx-auto">
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-muted-foreground">
              Analyzing across multiple knowledge bases...
            </p>
          </div>

          {/* Step Indicators */}
          <div className="flex justify-center gap-4">
            {steps.map((step, index) => {
              const StepIcon = step.icon;
              return (
                <div
                  key={index}
                  className={`flex flex-col items-center gap-1 transition-all duration-300 ${
                    index <= currentStep ? 'opacity-100' : 'opacity-40'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    index <= currentStep 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted'
                  }`}>
                    {index < currentStep ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : index === currentStep ? (
                      <StepIcon className="h-4 w-4 animate-pulse" />
                    ) : (
                      <Clock className="h-4 w-4" />
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground text-center max-w-16">
                    {step.label.split(' ')[0]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}