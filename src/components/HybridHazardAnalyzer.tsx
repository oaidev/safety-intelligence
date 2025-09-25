import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { ComprehensiveHazardForm } from '@/components/ComprehensiveHazardForm';
import { AnalysisResults } from '@/components/AnalysisResults';
import { KnowledgeBaseViewer } from '@/components/KnowledgeBaseViewer';
import { PromptViewer } from '@/components/PromptViewer';
import { AnalysisLoadingAnimation } from '@/components/AnalysisLoadingAnimation';

import { hybridRagService, type MultiAnalysisResult, type ServiceStatus } from '@/lib/hybridRagService';
import { useToast } from '@/hooks/use-toast';
import {
  Sparkles,
  RefreshCw,
  Zap,
  Database,
  MessageSquare,
  Cpu,
  Globe,
  Download,
  CheckCircle,
  Clock
} from 'lucide-react';

export function HybridHazardAnalyzer() {
  const [hazardDescription, setHazardDescription] = useState('');
  const [formData, setFormData] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<MultiAnalysisResult | null>(null);
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus>({
    isGoogleReady: true,
    isClientSideReady: false,
    clientSideProgress: 0,
    currentProvider: 'google',
    isPopulated: false,
  });
  const [showKnowledgeBase, setShowKnowledgeBase] = useState(false);
  const [showPrompts, setShowPrompts] = useState(false);
  const { toast } = useToast();

  // Subscribe to service status updates
  useEffect(() => {
    const unsubscribe = hybridRagService.onStatusUpdate((status) => {
      setServiceStatus(status);
      
      // Show notification when switching to client-side
      if (status.isClientSideReady && status.currentProvider === 'client-side') {
        toast({
          title: 'Performance Upgrade!',
          description: 'Switched to client-side embeddings for faster processing.',
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [toast]);

  const handleFormSubmit = async (data: { description: string; formData: any }) => {
    setHazardDescription(data.description);
    setFormData(data.formData);
    
    if (!data.description.trim()) {
      toast({
        title: 'Error',
        description: 'Deskripsi temuan wajib diisi',
        variant: 'destructive',
      });
      return;
    }

    setIsAnalyzing(true);
    setResults(null);

    try {
      console.log('[HybridAnalyzer] Starting hybrid analysis...');
      const analysisResults = await hybridRagService.analyzeHazardAll(data.description);
      
      setResults(analysisResults);
      
      const successCount = analysisResults.results.length;
      const errorCount = analysisResults.errors.length;
      const provider = analysisResults.embeddingProvider;
      
      toast({
        title: 'Multi-Analysis Complete',
        description: `Analyzed using ${provider} embeddings. ${successCount} successful, ${errorCount} errors. (${analysisResults.totalProcessingTime}ms)`,
        variant: analysisResults.hasErrors ? 'destructive' : 'default',
      });
      
      console.log('[HybridAnalyzer] Analysis completed:', analysisResults);
    } catch (error) {
      console.error('[HybridAnalyzer] Analysis error:', error);
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
    setFormData(null);
    setResults(null);
    localStorage.removeItem('hazard-form-data');
  };

  const clearData = async () => {
    try {
      await hybridRagService.clearAllKnowledgeBases();
      toast({
        title: 'Data Cleared',
        description: 'All knowledge base data cleared. Will be re-populated on next analysis.',
      });
    } catch (error) {
      console.error('[HybridAnalyzer] Clear data error:', error);
    }
  };

  const getProviderIcon = () => {
    if (serviceStatus.currentProvider === 'client-side') {
      return <Cpu className="h-4 w-4 text-green-500" />;
    }
    return <Globe className="h-4 w-4 text-blue-500" />;
  };

  const getProviderText = () => {
    if (serviceStatus.currentProvider === 'client-side') {
      return 'Client-side AI';
    }
    return 'Google Embeddings';
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
            
            {/* Client-side Download Progress */}
            {!serviceStatus.isClientSideReady && serviceStatus.clientSideProgress > 0 && (
              <div className="max-w-md mx-auto mt-4 space-y-2">
                <div className="text-xs text-muted-foreground">
                  Downloading AI model for offline processing...
                </div>
                <Progress value={serviceStatus.clientSideProgress} className="w-full h-2" />
              </div>
            )}
            
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

        {/* Main Interface */}
        <div className="space-y-8">
          {/* Comprehensive Form */}
          <ComprehensiveHazardForm 
            onSubmit={handleFormSubmit}
            isSubmitting={isAnalyzing}
          />


          {/* Results */}
          <div className="max-w-6xl mx-auto">
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