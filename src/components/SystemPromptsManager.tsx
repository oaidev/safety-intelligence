import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Edit, RotateCcw, AlertCircle, CheckCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { systemPromptsService, type SystemPrompt } from "@/lib/systemPromptsService";
import { useToast } from "@/hooks/use-toast";

const SystemPromptsManager = () => {
  const [prompts, setPrompts] = useState<SystemPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPrompt, setSelectedPrompt] = useState<SystemPrompt | null>(null);
  const [editedTemplate, setEditedTemplate] = useState("");
  const [saving, setSaving] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadPrompts();
  }, []);

  useEffect(() => {
    if (selectedPrompt && editedTemplate) {
      const result = systemPromptsService.validatePrompt(selectedPrompt, editedTemplate);
      setValidationResult(result);
    }
  }, [editedTemplate, selectedPrompt]);

  const loadPrompts = async () => {
    try {
      setLoading(true);
      const data = await systemPromptsService.getAllPrompts();
      setPrompts(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal memuat system prompts",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (prompt: SystemPrompt) => {
    setSelectedPrompt(prompt);
    setEditedTemplate(prompt.prompt_template);
  };

  const handleSave = async () => {
    if (!selectedPrompt || !validationResult?.isValid) return;

    try {
      setSaving(true);
      await systemPromptsService.updatePromptTemplate(selectedPrompt.id, editedTemplate);
      
      toast({
        title: "Success",
        description: "Prompt template berhasil diupdate",
      });

      setSelectedPrompt(null);
      loadPrompts();
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal mengupdate prompt template",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async (prompt: SystemPrompt) => {
    try {
      await systemPromptsService.resetPromptToDefault(prompt.id);
      
      toast({
        title: "Success",
        description: "Prompt direset ke default",
      });

      if (selectedPrompt?.id === prompt.id) {
        setSelectedPrompt(null);
      }
      loadPrompts();
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal mereset prompt",
        variant: "destructive"
      });
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Quality Analysis': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      'Safety Analysis': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      'HIRA Analysis': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      'Investigation': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">System Prompt Templates</h2>
        <p className="text-muted-foreground mt-1">
          Kelola prompt templates untuk semua fitur AI dalam aplikasi
        </p>
      </div>

      <div className="grid gap-4">
        {prompts.map((prompt) => (
          <Card key={prompt.id} className="border-border">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{prompt.name}</CardTitle>
                  <CardDescription>{prompt.description}</CardDescription>
                </div>
                <Badge className={getCategoryColor(prompt.category)}>
                  {prompt.category}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  <strong>Placeholders:</strong>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {prompt.placeholders.map((ph) => (
                      <code key={ph} className="px-2 py-0.5 bg-muted rounded text-xs">
                        {ph}
                      </code>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(prompt)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit Prompt
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReset(prompt)}
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Reset to Default
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!selectedPrompt} onOpenChange={(open) => !open && setSelectedPrompt(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Prompt: {selectedPrompt?.name}</DialogTitle>
            <DialogDescription>
              Customize the AI prompt template. Make sure to include all required placeholders.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Validation Alerts */}
            {validationResult && !validationResult.isValid && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc pl-4 space-y-1">
                    {validationResult.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {validationResult && validationResult.isValid && validationResult.warnings.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc pl-4 space-y-1">
                    {validationResult.warnings.map((warn, i) => (
                      <li key={i}>{warn}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {validationResult && validationResult.isValid && validationResult.warnings.length === 0 && (
              <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-600 dark:text-green-400">
                  Prompt template valid!
                </AlertDescription>
              </Alert>
            )}

            {/* Placeholders Reference */}
            <Card className="bg-muted/50">
              <CardHeader>
                <CardTitle className="text-sm">Available Placeholders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {selectedPrompt?.placeholders.map((ph) => (
                    <code
                      key={ph}
                      className={`px-2 py-1 rounded text-xs cursor-pointer hover:bg-primary/10 ${
                        selectedPrompt.validation_rules.required_placeholders?.includes(ph)
                          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                          : 'bg-background'
                      }`}
                      onClick={() => {
                        const textarea = document.getElementById('prompt-textarea') as HTMLTextAreaElement;
                        if (textarea) {
                          const start = textarea.selectionStart;
                          const end = textarea.selectionEnd;
                          const text = editedTemplate;
                          const before = text.substring(0, start);
                          const after = text.substring(end);
                          setEditedTemplate(before + ph + after);
                          setTimeout(() => {
                            textarea.focus();
                            textarea.setSelectionRange(start + ph.length, start + ph.length);
                          }, 0);
                        }
                      }}
                      title="Click to insert"
                    >
                      {ph}
                      {selectedPrompt.validation_rules.required_placeholders?.includes(ph) && ' *'}
                    </code>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  * = Required placeholder. Click any placeholder to insert it at cursor position.
                </p>
              </CardContent>
            </Card>

            {/* Editor */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Prompt Template
              </label>
              <Textarea
                id="prompt-textarea"
                value={editedTemplate}
                onChange={(e) => setEditedTemplate(e.target.value)}
                className="min-h-[400px] font-mono text-sm"
                placeholder="Enter your prompt template..."
              />
              <p className="text-xs text-muted-foreground mt-1">
                Length: {editedTemplate.length} characters
                {selectedPrompt?.validation_rules.min_length && 
                  ` (minimum: ${selectedPrompt.validation_rules.min_length})`
                }
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedPrompt(null)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !validationResult?.isValid}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SystemPromptsManager;