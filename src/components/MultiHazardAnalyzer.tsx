import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { HazardInput } from '@/components/HazardInput';
import { KnowledgeBaseSelector } from '@/components/KnowledgeBaseSelector';
import { PromptEditor } from '@/components/PromptEditor';
import { AnalysisResults } from '@/components/AnalysisResults';

import { multiRagService, type MultiAnalysisResult, type AnalysisResult } from '@/lib/multiRagService';
import { KNOWLEDGE_BASES } from '@/lib/knowledgeBase';
import { useToast } from '@/hooks/use-toast';
import {
  Sparkles,
  Search,
  RefreshCw,
  RotateCcw,
  Zap,
  Target,
  Database
} from 'lucide-react';

export function MultiHazardAnalyzer() {
  const [hazardDescription, setHazardDescription] = useState('');
  const [selectedKnowledgeBase, setSelectedKnowledgeBase] = useState('golden_rules');
  const [customPrompt, setCustomPrompt] = useState(KNOWLEDGE_BASES.golden_rules.promptTemplate);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<MultiAnalysisResult | null>(null);
  const [singleResult, setSingleResult] = useState<AnalysisResult | null>(null);
  const { toast } = useToast();

  // Initialize API key on component mount
  useEffect(() => {
    const apiKey = 'AIzaSyBTa_fNTfYBHEdUbNk-5HgPT2pVrE8fcpk'; // Replace with your actual API key
    multiRagService.setApiKey(apiKey);
  }, []);

  // Update custom prompt when knowledge base selection changes
  useEffect(() => {
    const config = KNOWLEDGE_BASES[selectedKnowledgeBase];
    if (config) {
      setCustomPrompt(config.promptTemplate);
    }
  }, [selectedKnowledgeBase]);

  const handleAnalyzeAll = async () => {
    if (!hazardDescription.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a hazard description',
        variant: 'destructive',
      });
      return;
    }

    setIsAnalyzing(true);
    setSingleResult(null);
    setResults(null);

    try {
      console.log('[MultiHazardAnalyzer] Starting multi-knowledge base analysis...');
      multiRagService.clearAllKnowledgeBases(); // Clear previous data
      const analysisResults = await multiRagService.analyzeHazardAll(hazardDescription);
      
      setResults(analysisResults);
      
      const successCount = analysisResults.results.length;
      const errorCount = analysisResults.errors.length;
      
      toast({
        title: 'Multi-Analysis Complete',
        description: `Analyzed across ${successCount + errorCount} knowledge bases. ${successCount} successful, ${errorCount} errors. (${analysisResults.totalProcessingTime}ms)`,
        variant: analysisResults.hasErrors ? 'destructive' : 'default',
      });
      
      console.log('[MultiHazardAnalyzer] Multi-analysis completed:', analysisResults);
    } catch (error) {
      console.error('[MultiHazardAnalyzer] Multi-analysis error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: 'Analysis Failed',
        description: `${errorMessage}. Check console for details.`,
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalyzeSingle = async () => {
    if (!hazardDescription.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a hazard description',
        variant: 'destructive',
      });
      return;
    }

    setIsAnalyzing(true);
    setResults(null);
    setSingleResult(null);

    try {
      console.log('[MultiHazardAnalyzer] Starting single knowledge base analysis...');
      multiRagService.clearKnowledgeBase(selectedKnowledgeBase);
      
      // Update the prompt template for the selected knowledge base
      const originalPrompt = KNOWLEDGE_BASES[selectedKnowledgeBase].promptTemplate;
      KNOWLEDGE_BASES[selectedKnowledgeBase].promptTemplate = customPrompt;
      
      const analysisResult = await multiRagService.analyzeHazardSingle(
        hazardDescription,
        selectedKnowledgeBase
      );
      
      // Restore original prompt
      KNOWLEDGE_BASES[selectedKnowledgeBase].promptTemplate = originalPrompt;
      
      setSingleResult(analysisResult);
      
      toast({
        title: 'Analysis Complete',
        description: `${analysisResult.knowledgeBaseName}: ${analysisResult.category} (${analysisResult.processingTime}ms)`,
      });
      
      console.log('[MultiHazardAnalyzer] Single analysis completed:', analysisResult);
    } catch (error) {
      console.error('[MultiHazardAnalyzer] Single analysis error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: 'Analysis Failed',
        description: `${errorMessage}. Check console for details.`,
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetForm = () => {
    setHazardDescription('');
    setSelectedKnowledgeBase('golden_rules');
    setCustomPrompt(KNOWLEDGE_BASES.golden_rules.promptTemplate);
    setResults(null);
    setSingleResult(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-3 bg-gradient-primary rounded-full shadow-elegant">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Safety Intelligence
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Your AI-powered Safety Copilot
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="space-y-6">
            <HazardInput 
              hazardDescription={hazardDescription}
              onHazardDescriptionChange={setHazardDescription}
            />

            {/* Action Button */}
            <div className="space-y-3">
              <Button 
                onClick={handleAnalyzeAll} 
                disabled={isAnalyzing}
                className="w-full bg-gradient-primary shadow-elegant"
                size="lg"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Zap className="h-5 w-5 mr-2" />
                    Analyze
                  </>
                )}
              </Button>

              <Button 
                onClick={resetForm}
                variant="outline"
                size="lg"
                className="w-full"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>
          </div>

          {/* Results */}
          <div className="space-y-6">
            <AnalysisResults 
              results={results} 
              isAnalyzing={isAnalyzing} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}