import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { KNOWLEDGE_BASES } from '@/lib/knowledgeBase';

interface PromptViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PromptViewer({ open, onOpenChange }: PromptViewerProps) {
  const { toast } = useToast();

  const copyPrompt = async (prompt: string, name: string) => {
    try {
      await navigator.clipboard.writeText(prompt);
      toast({
        title: 'Copied',
        description: `${name} prompt template copied to clipboard`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy prompt template',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Complete Prompt Templates</span>
            <Badge variant="outline">{Object.keys(KNOWLEDGE_BASES).length} Templates</Badge>
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6">
            {Object.entries(KNOWLEDGE_BASES).map(([id, config]) => (
              <div key={id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="outline" 
                      className={`bg-${config.color}/10 text-${config.color} border-${config.color}/20`}
                    >
                      {config.name}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyPrompt(config.promptTemplate, config.name)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="bg-muted/30 p-4 rounded-lg">
                  <pre className="text-sm whitespace-pre-wrap font-mono leading-relaxed">
                    {config.promptTemplate}
                  </pre>
                </div>
                
                <div className="text-xs text-muted-foreground space-y-1">
                  <p><strong>Available placeholders:</strong></p>
                  <p>• <code>{"{RETRIEVED_CONTEXT}"}</code> - Relevant context from knowledge base</p>
                  <p>• <code>{"{USER_INPUT}"}</code> - User's hazard description</p>
                </div>
                
                {id !== Object.keys(KNOWLEDGE_BASES)[Object.keys(KNOWLEDGE_BASES).length - 1] && (
                  <Separator className="my-4" />
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}