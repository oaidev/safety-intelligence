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
import { HazardScoring } from '@/components/HazardScoring';
import { ComprehensiveRecommendationDisplay } from '@/components/ComprehensiveRecommendationDisplay';

import { hybridRagService, type MultiAnalysisResult, type ServiceStatus } from '@/lib/hybridRagService';
import { scoringService, type AnalysisResult as ScoringAnalysisResult } from '@/lib/scoringService';
// Removed HIRA recommendation service import for frontliner
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
  Clock,
  Settings
} from 'lucide-react';
import { Link } from 'react-router-dom';

export function HybridHazardAnalyzer() {
  const [hazardDescription, setHazardDescription] = useState('');
  const [formData, setFormData] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<MultiAnalysisResult | null>(null);
  const [scoringAnalysis, setScoringAnalysis] = useState<ScoringAnalysisResult | null>(null);
  const [isScoring, setIsScoring] = useState(false);
  // Removed HIRA recommendations state for frontliner
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
    // Store form data but don't save to database yet - let ComprehensiveHazardForm handle similarity check first
    setHazardDescription(data.description);
    setFormData(data.formData);
  };

  const handleActualSubmission = async (data: { description: string; formData: any }) => {
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
    setScoringAnalysis(null);

    try {
      // Import hazard report service
      const { hazardReportService } = await import('@/lib/hazardReportService');
      
      // Save hazard report to database
      const savedReport = await hazardReportService.saveHazardReport({
        reporterName: data.formData.reporterName || 'Anonymous',
        reporterPosition: data.formData.reporterPosition,
        reporterCompany: data.formData.reporterCompany,
        site: data.formData.site,
        location: data.formData.location || 'Unknown',
        detailLocation: data.formData.detailLocation,
        locationDescription: data.formData.locationDescription,
        areaPjaBc: data.formData.areaPjaBc,
        pjaMitraKerja: data.formData.areaPjaMitra,
        observationTool: data.formData.observationTool,
        nonCompliance: data.formData.nonCompliance || 'Unknown',
        subNonCompliance: data.formData.subNonCompliance || 'Unknown',
        quickAction: data.formData.quickAction || 'Unknown',
        findingDescription: data.description,
        uploadedImage: data.formData.uploadedImage,
        latitude: data.formData.latitude,
        longitude: data.formData.longitude
      });

      // Show success message with tracking ID
      toast({
        title: 'Laporan Berhasil Disimpan',
        description: `ID Tracking: ${savedReport.tracking_id}`,
        duration: 5000,
      });

      // Start analyses in parallel (removed HIRA analysis for frontliner)
      const [analysisResults, scoringResults] = await Promise.allSettled([
        hybridRagService.analyzeHazardAll(data.description),
        startScoringAnalysis(data.formData)
      ]);

      // Handle RAG analysis results
      if (analysisResults.status === 'fulfilled') {
        setResults(analysisResults.value);
        
        const successCount = analysisResults.value.results.length;
        const errorCount = analysisResults.value.errors.length;
        const provider = analysisResults.value.embeddingProvider;
        
        toast({
          title: 'Multi-Analysis Complete',
          description: `Analyzed using ${provider} embeddings. ${successCount} successful, ${errorCount} errors.`,
          variant: analysisResults.value.hasErrors ? 'destructive' : 'default',
        });
      } else {
        console.error('[HybridAnalyzer] RAG Analysis error:', analysisResults.reason);
        toast({
          title: 'RAG Analysis Failed',
          description: 'RAG analysis encountered an error',
          variant: 'destructive',
        });
      }

      // Handle scoring analysis results
      if (scoringResults.status === 'fulfilled') {
        setScoringAnalysis(scoringResults.value);
      } else {
        console.error('[HybridAnalyzer] Scoring error:', scoringResults.reason);
        toast({
          title: 'Quality Scoring Failed',
          description: 'Quality scoring analysis encountered an error',
          variant: 'destructive',
        });
      }

      // HIRA analysis removed for frontliner dashboard
      
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
      setIsScoring(false);
    }
  };

  const startScoringAnalysis = async (formData: any): Promise<ScoringAnalysisResult> => {
    setIsScoring(true);
    console.log('[HybridAnalyzer] Starting scoring analysis...');
    
    // Convert form data to the format expected by scoring service
    const scoringFormData = {
      deskripsi_temuan: formData.findingDescription || '',
      ketidaksesuaian: formData.nonCompliance || '',
      sub_ketidaksesuaian: formData.subNonCompliance || '',
      tools_pengamatan: formData.observationTool || '',
      lokasi_detail: formData.detailLocation || '',
      quick_action: formData.quickAction || '',
      image_base64: formData.uploadedImage || undefined
    };

    return await scoringService.analyzeHazardQuality(scoringFormData);
  };

  // HIRA analysis function removed for frontliner

  const resetForm = () => {
    setHazardDescription('');
    setFormData(null);
    setResults(null);
    setScoringAnalysis(null);
    localStorage.removeItem('hazard-form-data');
  };

  const handleImproveReport = (improvements: any) => {
    // Apply the suggested improvements to the form
    // This would trigger a re-render of the form with suggested values
    toast({
      title: 'Improvements Applied',
      description: 'Suggested improvements have been applied to the form. Please review and resubmit.',
    });
  };

  const handleExportReport = () => {
    // Export the analysis as PDF
    toast({
      title: 'Export Started',
      description: 'Preparing PDF export...',
    });
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

  const forceRepopulate = async () => {
    try {
      // Import optimized RAG service
      const { optimizedRagService } = await import('@/lib/optimizedRagService');
      
      toast({
        title: 'Rebuilding Knowledge Base',
        description: 'Clearing old data and rebuilding with correct embeddings...',
      });
      
      await optimizedRagService.forceRepopulate();
      
      toast({
        title: 'Knowledge Base Rebuilt',
        description: 'Knowledge bases have been rebuilt with correct 384-dimensional embeddings.',
      });
    } catch (error) {
      console.error('[HybridAnalyzer] Force repopulate error:', error);
      toast({
        title: 'Error',
        description: 'Failed to rebuild knowledge bases',
        variant: 'destructive'
      });
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
                      onClick={forceRepopulate}
                      className="text-muted-foreground hover:text-primary"
                    >
                      <RefreshCw className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Fix Knowledge Base (Rebuild Embeddings)</p>
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
            onSubmit={handleActualSubmission}
            isSubmitting={isAnalyzing}
          />


          {/* Results */}
          <div className="max-w-6xl mx-auto space-y-8">
            {isAnalyzing || isScoring ? (
              <AnalysisLoadingAnimation />
            ) : (
              <>
                {/* Quality Scoring Results */}
                {scoringAnalysis && (
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold text-center">Analisis Kualitas Laporan</h2>
                    <HazardScoring 
                      analysis={scoringAnalysis}
                      onImproveReport={handleImproveReport}
                      onExportReport={handleExportReport}
                    />
                  </div>
                )}
                
                {/* RAG Analysis Results */}
                {results && (
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold text-center">Hasil Analisis Knowledge Base</h2>
                    <AnalysisResults 
                      results={results} 
                      isAnalyzing={isAnalyzing} 
                    />
                  </div>
                )}
              </>
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