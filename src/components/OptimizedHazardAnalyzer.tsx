import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';

import { HazardInput } from '@/components/HazardInput';
import { AnalysisResults } from '@/components/AnalysisResults';
import { KnowledgeBaseViewer } from '@/components/KnowledgeBaseViewer';
import { PromptViewer } from '@/components/PromptViewer';
import { AnalysisLoadingAnimation } from '@/components/AnalysisLoadingAnimation';

import { optimizedRagService, type MultiAnalysisResult } from '@/lib/optimizedRagService';
import { useToast } from '@/hooks/use-toast';
import {
  Sparkles,
  RefreshCw,
  RotateCcw,
  Zap,
  Database,
  MessageSquare,
  Cpu,
  Globe
} from 'lucide-react';

export function OptimizedHazardAnalyzer() {
  const [hazardDescription, setHazardDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [initProgress, setInitProgress] = useState(0);
  const [results, setResults] = useState<MultiAnalysisResult | null>(null);
  const [showKnowledgeBase, setShowKnowledgeBase] = useState(false);
  const [showPrompts, setShowPrompts] = useState(false);
  const { toast } = useToast();

  // Initialize optimized RAG service on component mount
  useEffect(() => {
    const initializeService = async () => {
      setIsInitializing(true);
      setInitProgress(0);
      
      try {
        // Simulate progress steps
        setInitProgress(20);
        console.log('[OptimizedAnalyzer] Initializing embedding model...');
        
        await optimizedRagService.initialize();
        setInitProgress(60);
        
        console.log('[OptimizedAnalyzer] Checking knowledge base population...');
        const isPopulated = await optimizedRagService.checkKnowledgeBasesPopulated();
        
        if (!isPopulated) {
          setInitProgress(70);
          console.log('[OptimizedAnalyzer] Populating knowledge bases...');
          await optimizedRagService.populateKnowledgeBases();
        }
        
        setInitProgress(100);
        
        toast({
          title: 'System Ready',
          description: 'Client-side AI model initialized and knowledge bases ready!',
        });
        
      } catch (error) {
        console.error('[OptimizedAnalyzer] Initialization error:', error);
        toast({
          title: 'Initialization Failed',
          description: 'Failed to initialize the optimized system. Falling back to original system.',
          variant: 'destructive',
        });
      } finally {
        setIsInitializing(false);
      }
    };

    initializeService();
  }, []);

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
    setResults(null);

    try {
      console.log('[OptimizedAnalyzer] Starting optimized multi-knowledge base analysis...');
      const analysisResults = await optimizedRagService.analyzeHazardAll(hazardDescription);
      
      setResults(analysisResults);
      
      const successCount = analysisResults.results.length;
      const errorCount = analysisResults.errors.length;
      
      toast({
        title: 'Multi-Analysis Complete',
        description: `Analyzed across ${successCount + errorCount} knowledge bases. ${successCount} successful, ${errorCount} errors. (${analysisResults.totalProcessingTime}ms)`,
        variant: analysisResults.hasErrors ? 'destructive' : 'default',
      });
      
      console.log('[OptimizedAnalyzer] Multi-analysis completed:', analysisResults);
    } catch (error) {
      console.error('[OptimizedAnalyzer] Multi-analysis error:', error);
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
    setResults(null);
  };

  const clearData = async () => {
    try {
      await optimizedRagService.clearAllKnowledgeBases();
      toast({
        title: 'Data Cleared',
        description: 'All knowledge base data cleared. Will be re-populated on next analysis.',
      });
    } catch (error) {
      console.error('[OptimizedAnalyzer] Clear data error:', error);
    }
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
              Optimized Safety Intelligence
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              AI-powered Safety Copilot with Client-side Embeddings & Vector Search
            </p>
            
            {/* Performance Indicators */}
            <div className="flex items-center justify-center gap-6 mt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Cpu className="h-4 w-4 text-green-500" />
                <span>Client-side AI</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Database className="h-4 w-4 text-blue-500" />
                <span>Vector Search</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Globe className="h-4 w-4 text-purple-500" />
                <span>Batch Processing</span>
              </div>
            </div>
            
            {/* Quick Access Icons */}
            <TooltipProvider>
              <div className="flex items-center justify-center gap-4 mt-6">
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
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearData}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <RefreshCw className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Clear Vector Database</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          </div>
        </div>

        {/* Initialization Progress */}
        {isInitializing && (
          <div className="max-w-md mx-auto space-y-4">
            <div className="text-center">
              <h3 className="font-semibold text-foreground">Initializing AI System</h3>
              <p className="text-sm text-muted-foreground">Setting up client-side embeddings and vector database...</p>
            </div>
            <Progress value={initProgress} className="w-full" />
          </div>
        )}

        {!isInitializing && (
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Input Section */}
            <div className="space-y-6">
              <HazardInput 
                hazardDescription={hazardDescription}
                onHazardDescriptionChange={setHazardDescription}
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
                      Analyzing with Optimized AI...
                    </>
                  ) : (
                    <>
                      <Zap className="h-5 w-5 mr-2" />
                      Analyze (Optimized)
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
        )}
        
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