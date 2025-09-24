import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { KNOWLEDGE_BASES } from '@/lib/knowledgeBase';

interface KnowledgeBaseViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KnowledgeBaseViewer({ open, onOpenChange }: KnowledgeBaseViewerProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Complete Knowledge Bases</span>
            <Badge variant="outline">{Object.keys(KNOWLEDGE_BASES).length} Knowledge Bases</Badge>
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6">
            {Object.entries(KNOWLEDGE_BASES).map(([id, config]) => (
              <div key={id} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="outline" 
                    className={`bg-${config.color}/10 text-${config.color} border-${config.color}/20`}
                  >
                    {config.name}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {config.content.split('\n').filter(line => line.trim()).length} items
                  </span>
                </div>
                
                <div className="bg-muted/30 p-4 rounded-lg">
                  <pre className="text-sm whitespace-pre-wrap font-mono leading-relaxed">
                    {config.content}
                  </pre>
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