import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KNOWLEDGE_BASES } from '@/lib/knowledgeBase';

interface PromptEditorProps {
  selectedKnowledgeBase: string;
  customPrompt: string;
  onCustomPromptChange: (prompt: string) => void;
}

export function PromptEditor({ 
  selectedKnowledgeBase, 
  customPrompt, 
  onCustomPromptChange 
}: PromptEditorProps) {
  const selectedConfig = KNOWLEDGE_BASES[selectedKnowledgeBase];

  const resetToDefault = () => {
    if (selectedConfig) {
      onCustomPromptChange(selectedConfig.promptTemplate);
    }
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Analysis Prompt
          </div>
          {selectedConfig && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetToDefault}
              className="h-auto py-1 px-2"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset
            </Button>
          )}
        </CardTitle>
        <CardDescription>
          Customize the AI analysis prompt for the selected knowledge base
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {selectedConfig && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`bg-${selectedConfig.color}/10 text-${selectedConfig.color} border-${selectedConfig.color}/20`}>
              {selectedConfig.name}
            </Badge>
            <span className="text-sm text-muted-foreground">Template</span>
          </div>
        )}
        
        <Textarea
          value={customPrompt}
          onChange={(e) => onCustomPromptChange(e.target.value)}
          rows={8}
          className="resize-none text-sm"
          placeholder={selectedConfig?.promptTemplate || "Select a knowledge base to see the prompt template"}
        />

        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Available placeholders:</strong></p>
          <p>• <code>{"{RETRIEVED_CONTEXT}"}</code> - Relevant context from knowledge base</p>
          <p>• <code>{"{USER_INPUT}"}</code> - User's hazard description</p>
        </div>
      </CardContent>
    </Card>
  );
}