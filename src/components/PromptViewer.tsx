import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface KnowledgeBase {
  id: string;
  name: string;
  color: string;
  prompt_template: string;
}

interface PromptViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PromptViewer({ open, onOpenChange }: PromptViewerProps) {
  const { toast } = useToast();
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      loadKnowledgeBases();
    }
  }, [open]);

  const loadKnowledgeBases = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('knowledge_bases')
        .select('id, name, color, prompt_template')
        .order('name');

      if (error) throw error;
      setKnowledgeBases(data || []);
    } catch (error) {
      console.error('Error loading knowledge bases:', error);
      toast({
        title: 'Error',
        description: 'Failed to load prompt templates',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

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
            <Badge variant="outline">{knowledgeBases.length} Templates</Badge>
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="h-[60vh] pr-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading prompt templates...</div>
          ) : knowledgeBases.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No prompt templates found</div>
          ) : (
            <div className="space-y-6">
            {knowledgeBases.map((kb, index) => (
                <div key={kb.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="outline" 
                        className={`bg-${kb.color}/10 text-${kb.color} border-${kb.color}/20`}
                      >
                        {kb.name}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyPrompt(kb.prompt_template, kb.name)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <pre className="text-sm whitespace-pre-wrap font-mono leading-relaxed">
                      {kb.prompt_template}
                    </pre>
                  </div>
                  
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p><strong>Available placeholders:</strong></p>
                    <p>• <code>{"{RETRIEVED_CONTEXT}"}</code> - Relevant context from knowledge base</p>
                    <p>• <code>{"{USER_INPUT}"}</code> - User's hazard description</p>
                  </div>
                  
                  {index !== knowledgeBases.length - 1 && (
                    <Separator className="my-4" />
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}