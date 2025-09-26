import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Save, RotateCcw, Eye, FileText } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface KnowledgeBase {
  id: string;
  name: string;
  color: string;
  prompt_template: string;
}

export function PromptTemplateEditor() {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [selectedKB, setSelectedKB] = useState<string>('');
  const [promptTemplate, setPromptTemplate] = useState('');
  const [originalTemplate, setOriginalTemplate] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const colorOptions: Record<string, string> = {
    info: 'bg-info/10 text-info border-info/20',
    warning: 'bg-warning/10 text-warning border-warning/20',
    success: 'bg-success/10 text-success border-success/20',
    destructive: 'bg-destructive/10 text-destructive border-destructive/20'
  };

  useEffect(() => {
    loadKnowledgeBases();
  }, []);

  useEffect(() => {
    if (selectedKB && knowledgeBases.length > 0) {
      const kb = knowledgeBases.find(k => k.id === selectedKB);
      if (kb) {
        setPromptTemplate(kb.prompt_template);
        setOriginalTemplate(kb.prompt_template);
      }
    }
  }, [selectedKB, knowledgeBases]);

  const loadKnowledgeBases = async () => {
    try {
      const { data, error } = await supabase
        .from('knowledge_bases')
        .select('id, name, color, prompt_template')
        .order('name');

      if (error) throw error;
      setKnowledgeBases(data || []);
      
      // Select first KB if available
      if (data && data.length > 0) {
        setSelectedKB(data[0].id);
      }
    } catch (error) {
      console.error('Error loading knowledge bases:', error);
      toast({
        title: "Error",
        description: "Failed to load knowledge bases",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedKB || !promptTemplate.trim()) {
      toast({
        title: "Validation Error",
        description: "Please select a knowledge base and enter a prompt template",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('knowledge_bases')
        .update({ prompt_template: promptTemplate })
        .eq('id', selectedKB);

      if (error) throw error;

      setOriginalTemplate(promptTemplate);
      toast({
        title: "Success",
        description: "Prompt template updated successfully"
      });
    } catch (error) {
      console.error('Error saving prompt template:', error);
      toast({
        title: "Error",
        description: "Failed to save prompt template",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setPromptTemplate(originalTemplate);
  };

  const validateTemplate = (template: string): string[] => {
    const issues: string[] = [];
    
    if (!template.includes('{RETRIEVED_CONTEXT}')) {
      issues.push('Missing {RETRIEVED_CONTEXT} placeholder');
    }
    
    if (!template.includes('{USER_INPUT}')) {
      issues.push('Missing {USER_INPUT} placeholder');
    }
    
    if (template.length < 50) {
      issues.push('Template seems too short');
    }
    
    return issues;
  };

  const selectedKnowledgeBase = knowledgeBases.find(kb => kb.id === selectedKB);
  const hasChanges = promptTemplate !== originalTemplate;
  const validationIssues = validateTemplate(promptTemplate);

  if (loading) {
    return <div className="text-center py-8">Loading knowledge bases...</div>;
  }

  if (knowledgeBases.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No knowledge bases found. Create a knowledge base first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Knowledge Base Selector */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Select value={selectedKB} onValueChange={setSelectedKB}>
              <SelectTrigger>
                <SelectValue placeholder="Select a knowledge base to edit" />
              </SelectTrigger>
              <SelectContent>
                {knowledgeBases.map((kb) => (
                  <SelectItem key={kb.id} value={kb.id}>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${colorOptions[kb.color] || colorOptions.info}`} />
                      {kb.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedKnowledgeBase && (
            <Badge variant="outline" className={colorOptions[selectedKnowledgeBase.color] || colorOptions.info}>
              {selectedKnowledgeBase.id}
            </Badge>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button 
            onClick={handleSave} 
            disabled={!hasChanges || saving || validationIssues.length > 0}
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={handleReset} 
            disabled={!hasChanges}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
      </div>

      <Separator />

      {/* Template Editor */}
      {selectedKnowledgeBase && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">Edit Prompt Template</h3>
            <p className="text-sm text-muted-foreground">
              Customize the AI analysis prompt for {selectedKnowledgeBase.name}
            </p>
          </div>

          <Textarea
            value={promptTemplate}
            onChange={(e) => setPromptTemplate(e.target.value)}
            rows={12}
            className="resize-none font-mono text-sm"
            placeholder="Enter the prompt template with placeholders..."
          />

          {/* Validation Issues */}
          {validationIssues.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-destructive">Validation Issues</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-1">
                  {validationIssues.map((issue, index) => (
                    <li key={index} className="text-destructive">• {issue}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Placeholders Reference */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Available Placeholders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 text-sm">
                <div>
                  <code className="bg-muted px-2 py-1 rounded text-xs">{'{RETRIEVED_CONTEXT}'}</code>
                  <span className="ml-2 text-muted-foreground">Relevant context retrieved from the knowledge base</span>
                </div>
                <div>
                  <code className="bg-muted px-2 py-1 rounded text-xs">{'{USER_INPUT}'}</code>
                  <span className="ml-2 text-muted-foreground">User's hazard description or input</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Template Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Template Preview
              </CardTitle>
              <CardDescription>
                This is how your prompt will look with sample data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/30 p-4 rounded-lg font-mono text-sm whitespace-pre-wrap">
                {promptTemplate
                  .replace('{RETRIEVED_CONTEXT}', '[Sample context from knowledge base...]')
                  .replace('{USER_INPUT}', '[Sample user hazard description...]')}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}