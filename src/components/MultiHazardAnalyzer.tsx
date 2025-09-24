import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { HazardInput } from '@/components/HazardInput';
import { AnalysisResults } from '@/components/AnalysisResults';
import { KnowledgeBaseViewer } from '@/components/KnowledgeBaseViewer';
import { PromptViewer } from '@/components/PromptViewer';
import { AnalysisLoadingAnimation } from '@/components/AnalysisLoadingAnimation';

import { multiRagService, type MultiAnalysisResult, type AnalysisResult } from '@/lib/multiRagService';
import { KNOWLEDGE_BASES } from '@/lib/knowledgeBase';
import { useToast } from '@/hooks/use-toast';
import {
  Sparkles,
  RefreshCw,
  RotateCcw,
  Zap,
  Database,
  MessageSquare,
  Eye
} from 'lucide-react';

export function MultiHazardAnalyzer() {
  const [hazardDescription, setHazardDescription] = useState('');
  const [selectedKnowledgeBase, setSelectedKnowledgeBase] = useState('golden_rules');
  const [customPrompt, setCustomPrompt] = useState(KNOWLEDGE_BASES.golden_rules.promptTemplate);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<MultiAnalysisResult | null>(null);
  const [singleResult, setSingleResult] = useState<AnalysisResult | null>(null);
  const [showKnowledgeBase, setShowKnowledgeBase] = useState(false);
  const [showPrompts, setShowPrompts] = useState(false);
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
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Safety Intelligence
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Your AI-powered Safety Copilot
            </p>
            
            {/* Quick Access Icons */}
            <TooltipProvider>
              <div className="flex items-center justify-center gap-4 mt-4">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowKnowledgeBase(true)}
                      className="text-muted-foreground hover:text-primary"
                    >
                      <Database className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>View Complete Knowledge Bases</p>
                  </TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPrompts(true)}
                      className="text-muted-foreground hover:text-primary"
                    >
                      <MessageSquare className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>View Prompt Templates</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          </div>
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
            {isAnalyzing ? (
              <AnalysisLoadingAnimation />
            ) : (
              <AnalysisResults 
                results={results} 
                isAnalyzing={isAnalyzing} 
              />
            )}
          </div>
        </div>
        
        {/* Popups */}
        <KnowledgeBaseViewer 
          open={showKnowledgeBase} 
          onOpenChange={setShowKnowledgeBase} 
        />
        <PromptViewer 
          open={showPrompts} 
          onOpenChange={setShowPrompts} 
        />
      </div>
    </div>
  );
}