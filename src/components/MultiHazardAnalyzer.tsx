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
            Multi-Knowledge Safety Intelligence
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Comprehensive AI-powered safety analysis across multiple knowledge bases
          </p>
        </div>

        <Tabs defaultValue="analysis" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
            <TabsTrigger value="analysis" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Analysis
            </TabsTrigger>
            <TabsTrigger value="results" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Results
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analysis">
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Input Section */}
              <div className="space-y-6">
                <HazardInput 
                  hazardDescription={hazardDescription}
                  onHazardDescriptionChange={setHazardDescription}
                />

                <KnowledgeBaseSelector
                  selectedKnowledgeBase={selectedKnowledgeBase}
                  onKnowledgeBaseChange={setSelectedKnowledgeBase}
                />

                <PromptEditor
                  selectedKnowledgeBase={selectedKnowledgeBase}
                  customPrompt={customPrompt}
                  onCustomPromptChange={setCustomPrompt}
                />

                {/* Action Buttons */}
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
                        Analyzing All Knowledge Bases...
                      </>
                    ) : (
                      <>
                        <Zap className="h-5 w-5 mr-2" />
                        Analyze All Knowledge Bases
                      </>
                    )}
                  </Button>

                  <div className="flex gap-2">
                    <Button 
                      onClick={handleAnalyzeSingle} 
                      disabled={isAnalyzing}
                      variant="outline"
                      className="flex-1"
                      size="lg"
                    >
                      {isAnalyzing ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Search className="h-4 w-4 mr-2" />
                          Analyze Selected Only
                        </>
                      )}
                    </Button>
                    
                    <Button 
                      onClick={resetForm}
                      variant="outline"
                      size="lg"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reset
                    </Button>
                  </div>
                </div>
              </div>

              {/* Quick Results Preview */}
              <div className="space-y-6">
                <AnalysisResults 
                  results={results} 
                  isAnalyzing={isAnalyzing} 
                />
                
                {singleResult && (
                  <div className="space-y-4">
                    <Separator />
                    <h3 className="text-lg font-semibold">Single Knowledge Base Result</h3>
                    <AnalysisResults 
                      results={{
                        results: [singleResult],
                        totalProcessingTime: singleResult.processingTime,
                        hasErrors: false,
                        errors: []
                      }}
                      isAnalyzing={false}
                    />
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="results" className="space-y-6">
            <AnalysisResults 
              results={results} 
              isAnalyzing={isAnalyzing} 
            />
            
            {singleResult && (
              <div className="space-y-4">
                <Separator />
                <h3 className="text-lg font-semibold">Latest Single Analysis</h3>
                <AnalysisResults 
                  results={{
                    results: [singleResult],
                    totalProcessingTime: singleResult.processingTime,
                    hasErrors: false,
                    errors: []
                  }}
                  isAnalyzing={false}
                />
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}