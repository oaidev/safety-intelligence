import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  color: string;
  prompt_template: string;
  created_at: string;
  updated_at: string;
}

export function KnowledgeBaseList() {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingKB, setEditingKB] = useState<KnowledgeBase | null>(null);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: '',
    color: 'info',
    prompt_template: ''
  });
  const { toast } = useToast();

  const colorOptions = [
    { value: 'info', label: 'Blue', class: 'bg-info/10 text-info border-info/20' },
    { value: 'warning', label: 'Orange', class: 'bg-warning/10 text-warning border-warning/20' },
    { value: 'success', label: 'Green', class: 'bg-success/10 text-success border-success/20' },
    { value: 'destructive', label: 'Red', class: 'bg-destructive/10 text-destructive border-destructive/20' }
  ];

  useEffect(() => {
    loadKnowledgeBases();
  }, []);

  const loadKnowledgeBases = async () => {
    try {
      const { data, error } = await supabase
        .from('knowledge_bases')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setKnowledgeBases(data || []);
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
    try {
      if (editingKB) {
        // Update existing
        const { error } = await supabase
          .from('knowledge_bases')
          .update({
            name: formData.name,
            description: formData.description,
            color: formData.color,
            prompt_template: formData.prompt_template
          })
          .eq('id', editingKB.id);

        if (error) throw error;
        toast({ title: "Success", description: "Knowledge base updated successfully" });
      } else {
        // Create new
        const { error } = await supabase
          .from('knowledge_bases')
          .insert({
            id: formData.id,
            name: formData.name,
            description: formData.description,
            color: formData.color,
            prompt_template: formData.prompt_template
          });

        if (error) throw error;
        toast({ title: "Success", description: "Knowledge base created successfully" });
      }

      setDialogOpen(false);
      setEditingKB(null);
      resetForm();
      loadKnowledgeBases();
    } catch (error) {
      console.error('Error saving knowledge base:', error);
      toast({
        title: "Error",
        description: "Failed to save knowledge base",
        variant: "destructive"
      });
    }
  };


  const openCreateDialog = () => {
    resetForm();
    setEditingKB(null);
    setDialogOpen(true);
  };

  const openEditDialog = (kb: KnowledgeBase) => {
    setFormData({
      id: kb.id,
      name: kb.name,
      description: kb.description || '',
      color: kb.color,
      prompt_template: kb.prompt_template
    });
    setEditingKB(kb);
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      id: '',
      name: '',
      description: '',
      color: 'info',
      prompt_template: ''
    });
  };

  if (loading) {
    return <div className="text-center py-8">Loading knowledge bases...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Knowledge Bases ({knowledgeBases.length})</h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Create New
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingKB ? 'Edit Knowledge Base' : 'Create New Knowledge Base'}
              </DialogTitle>
              <DialogDescription>
                {editingKB ? 'Update the knowledge base information' : 'Create a new knowledge base for hazard analysis'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              {!editingKB && (
                <div className="grid gap-2">
                  <Label htmlFor="id">ID (unique identifier)</Label>
                  <Input
                    id="id"
                    placeholder="e.g., safety_rules"
                    value={formData.id}
                    onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                  />
                </div>
              )}
              
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="Knowledge Base Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Brief description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="grid gap-2">
                <Label>Color Theme</Label>
                <Select value={formData.color} onValueChange={(value) => setFormData({ ...formData, color: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {colorOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${option.class}`} />
                          {option.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="prompt">Prompt Template</Label>
                  <Badge variant="outline" className="text-xs">
                    Use {'{RETRIEVED_CONTEXT}'} and {'{USER_INPUT}'}
                  </Badge>
                </div>
                <Textarea
                  id="prompt"
                  placeholder="Enter the AI prompt template with {RETRIEVED_CONTEXT} and {USER_INPUT} placeholders"
                  value={formData.prompt_template}
                  onChange={(e) => setFormData({ ...formData, prompt_template: e.target.value })}
                  rows={12}
                  className="font-mono text-sm"
                />
                {!formData.prompt_template.includes('{RETRIEVED_CONTEXT}') && formData.prompt_template && (
                  <p className="text-xs text-warning">⚠️ Missing {'{RETRIEVED_CONTEXT}'} placeholder</p>
                )}
                {!formData.prompt_template.includes('{USER_INPUT}') && formData.prompt_template && (
                  <p className="text-xs text-warning">⚠️ Missing {'{USER_INPUT}'} placeholder</p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={!formData.name || (!editingKB && !formData.id)}>
                {editingKB ? 'Update' : 'Create'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Knowledge Bases List */}
      <div className="grid gap-4">
        {knowledgeBases.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">No knowledge bases found. Create your first one to get started.</p>
            </CardContent>
          </Card>
        ) : (
          knowledgeBases.map((kb) => (
            <Card key={kb.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{kb.name}</CardTitle>
                      <Badge variant="outline" className={colorOptions.find(c => c.value === kb.color)?.class}>
                        {kb.id}
                      </Badge>
                    </div>
                    <CardDescription>{kb.description}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEditDialog(kb)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}