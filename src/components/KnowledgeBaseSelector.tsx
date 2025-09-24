import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Database } from 'lucide-react';
import { KNOWLEDGE_BASES } from '@/lib/knowledgeBase';

interface KnowledgeBaseSelectorProps {
  selectedKnowledgeBase: string;
  onKnowledgeBaseChange: (knowledgeBaseId: string) => void;
}

export function KnowledgeBaseSelector({ 
  selectedKnowledgeBase, 
  onKnowledgeBaseChange 
}: KnowledgeBaseSelectorProps) {
  const selectedConfig = KNOWLEDGE_BASES[selectedKnowledgeBase];

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          Knowledge Base Selection
        </CardTitle>
        <CardDescription>
          Choose which safety knowledge base to analyze against
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select value={selectedKnowledgeBase} onValueChange={onKnowledgeBaseChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select knowledge base" />
          </SelectTrigger>
          <SelectContent>
            {Object.values(KNOWLEDGE_BASES).map((kb) => (
              <SelectItem key={kb.id} value={kb.id}>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full bg-${kb.color}`} />
                  <span>{kb.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedConfig && (
          <div className="p-3 bg-muted/50 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className={`bg-${selectedConfig.color}/10 text-${selectedConfig.color} border-${selectedConfig.color}/20`}>
                <BookOpen className="h-3 w-3 mr-1" />
                {selectedConfig.name}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {selectedConfig.description}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}