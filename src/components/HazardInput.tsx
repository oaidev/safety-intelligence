import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
import { EXAMPLE_HAZARDS } from '@/lib/knowledgeBase';

interface HazardInputProps {
  hazardDescription: string;
  onHazardDescriptionChange: (description: string) => void;
}

export function HazardInput({ hazardDescription, onHazardDescriptionChange }: HazardInputProps) {
  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning" />
          Hazard Description
        </CardTitle>
        <CardDescription>
          Describe the safety hazard or violation you want to analyze
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          placeholder="Enter the safety hazard description here..."
          value={hazardDescription}
          onChange={(e) => onHazardDescriptionChange(e.target.value)}
          rows={4}
          className="resize-none"
        />
        
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Quick Examples:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {EXAMPLE_HAZARDS.map((example, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => onHazardDescriptionChange(example)}
                className="text-xs h-auto py-2 px-3 whitespace-normal text-left justify-start"
              >
                {example}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}