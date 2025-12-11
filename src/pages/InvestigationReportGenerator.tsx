import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { InvestigationMultiInputForm, type EvidenceFiles } from '@/components/InvestigationMultiInputForm';
import { InvestigationProcessingPipeline, type ProcessingStep, type ThinkingMessage } from '@/components/InvestigationProcessingPipeline';
import { InvestigationReportDisplay } from '@/components/InvestigationReportDisplay';
import { whisperService } from '@/lib/whisperService';
import { pdfProcessingService } from '@/lib/pdfProcessingService';
import { documentProcessingService } from '@/lib/documentProcessingService';
import { investigationContextService, type InvestigationContext, type ProcessedAudio, type ProcessedDocument, type ProcessedImage, type ProcessedVideo } from '@/lib/investigationContextService';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ThinkingProcessViewer, type ThinkingProcess } from '@/components/ThinkingProcessViewer';

const InvestigationReportGenerator = () => {
  const [reportData, setReportData] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [trackingId, setTrackingId] = useState('');
  const [thinkingProcess, setThinkingProcess] = useState<ThinkingProcess | null>(null);
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([]);
  const [thinkingMessages, setThinkingMessages] = useState<ThinkingMessage[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const [showPipeline, setShowPipeline] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    whisperService.initializeInBackground();
  }, []);

  const updateStep = useCallback((stepId: string, updates: Partial<ProcessingStep>) => {
    setProcessingSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, ...updates } : step
    ));
  }, []);

  const addThinkingMessage = useCallback((text: string) => {
    setThinkingMessages(prev => [...prev, { text, timestamp: Date.now() }]);
  }, []);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleGenerate = async (files: EvidenceFiles) => {
    setIsGenerating(true);
    setShowPipeline(true);
    setReportData('');
    setThinkingMessages([]);
    setOverallProgress(0);

    // Initialize steps
    const steps: ProcessingStep[] = [];
    if (files.audioFiles.length > 0) {
      steps.push({
        id: 'audio',
        label: `Processing ${files.audioFiles.length} Audio Files`,
        status: 'pending',
        subSteps: files.audioFiles.map(f => ({ label: f.name, status: 'pending' as const })),
      });
    }
    if (files.documentFiles.length > 0) {
      steps.push({
        id: 'documents',
        label: `Processing ${files.documentFiles.length} Documents`,
        status: 'pending',
        subSteps: files.documentFiles.map(f => ({ label: f.name, status: 'pending' as const })),
      });
    }
    if (files.imageFiles.length > 0) {
      steps.push({
        id: 'images',
        label: `Processing ${files.imageFiles.length} Images`,
        status: 'pending',
      });
    }
    if (files.videoFiles.length > 0) {
      steps.push({
        id: 'videos',
        label: `Processing ${files.videoFiles.length} Videos`,
        status: 'pending',
      });
    }
    steps.push({
      id: 'analysis',
      label: 'Generating Investigation Report',
      status: 'pending',
    });
    
    setProcessingSteps(steps);

    let context = investigationContextService.createEmptyContext();
    const totalSteps = steps.length;
    let completedSteps = 0;

    try {
      // Step 1: Process Audio Files
      if (files.audioFiles.length > 0) {
        updateStep('audio', { status: 'processing' });
        addThinkingMessage('Memulai transkripsi audio interview...');

        for (let i = 0; i < files.audioFiles.length; i++) {
          const file = files.audioFiles[i];
          let transcript = '';
          let processedLocally = false;

          // Update substep to processing
          setProcessingSteps(prev => prev.map(step => 
            step.id === 'audio' ? {
              ...step,
              subSteps: step.subSteps?.map((sub, idx) => 
                idx === i ? { ...sub, status: 'processing' as const } : sub
              ),
            } : step
          ));

          // Try local Whisper first
          if (whisperService.isModelReady()) {
            try {
              addThinkingMessage(`Menggunakan Whisper lokal untuk ${file.name}...`);
              transcript = await whisperService.transcribeAudio(file);
              processedLocally = true;
            } catch (error) {
              console.error('[InvestigationReport] Local Whisper failed:', error);
            }
          }

          const audio: ProcessedAudio = {
            fileName: file.name,
            transcript,
            processedLocally,
          };

          // If local failed or not ready, we'll send raw audio to edge function
          if (!processedLocally) {
            audio.transcript = ''; // Will be processed server-side
          }

          context = investigationContextService.addAudio(context, audio);

          // Update substep to completed
          setProcessingSteps(prev => prev.map(step => 
            step.id === 'audio' ? {
              ...step,
              subSteps: step.subSteps?.map((sub, idx) => 
                idx === i ? { ...sub, status: 'completed' as const } : sub
              ),
            } : step
          ));
        }

        updateStep('audio', { status: 'completed', details: `${files.audioFiles.length} audio processed` });
        completedSteps++;
        setOverallProgress(Math.round((completedSteps / totalSteps) * 100));
      }

      // Step 2: Process Documents
      if (files.documentFiles.length > 0) {
        updateStep('documents', { status: 'processing' });
        addThinkingMessage('Mengekstrak konten dokumen...');

        for (let i = 0; i < files.documentFiles.length; i++) {
          const file = files.documentFiles[i];
          let content = '';
          let wordCount = 0;
          let processedLocally = false;
          const format = documentProcessingService.getFileFormat(file);

          // Update substep to processing
          setProcessingSteps(prev => prev.map(step => 
            step.id === 'documents' ? {
              ...step,
              subSteps: step.subSteps?.map((sub, idx) => 
                idx === i ? { ...sub, status: 'processing' as const } : sub
              ),
            } : step
          ));

          try {
            if (format === 'pdf') {
              addThinkingMessage(`Mengekstrak teks dari PDF: ${file.name}...`);
              const result = await pdfProcessingService.extractText(file);
              content = result.text;
              wordCount = content.split(/\s+/).filter(w => w.length > 0).length;
              processedLocally = !pdfProcessingService.isScannedPDF(result);
            } else if (format === 'docx') {
              addThinkingMessage(`Mengekstrak teks dari DOCX: ${file.name}...`);
              const result = await documentProcessingService.extractFromDocx(file);
              content = result.text;
              wordCount = result.wordCount;
              processedLocally = true;
            } else if (format === 'txt') {
              const result = await documentProcessingService.extractFromTxt(file);
              content = result.text;
              wordCount = result.wordCount;
              processedLocally = true;
            }
          } catch (error) {
            console.error(`[InvestigationReport] Failed to process ${file.name}:`, error);
          }

          const doc: ProcessedDocument = {
            fileName: file.name,
            content,
            wordCount,
            format,
            processedLocally,
          };

          context = investigationContextService.addDocument(context, doc);

          // Update substep to completed
          setProcessingSteps(prev => prev.map(step => 
            step.id === 'documents' ? {
              ...step,
              subSteps: step.subSteps?.map((sub, idx) => 
                idx === i ? { ...sub, status: 'completed' as const } : sub
              ),
            } : step
          ));
        }

        updateStep('documents', { status: 'completed', details: `${context.summary.totalWordCount} words extracted` });
        completedSteps++;
        setOverallProgress(Math.round((completedSteps / totalSteps) * 100));
      }

      // Step 3: Process Images (convert to base64 for AI)
      if (files.imageFiles.length > 0) {
        updateStep('images', { status: 'processing' });
        addThinkingMessage('Menyiapkan foto bukti untuk analisis AI...');

        for (const file of files.imageFiles) {
          const base64 = await fileToBase64(file);
          const image: ProcessedImage = {
            fileName: file.name,
            base64,
          };
          context = investigationContextService.addImage(context, image);
        }

        updateStep('images', { status: 'completed', details: `${files.imageFiles.length} images ready` });
        completedSteps++;
        setOverallProgress(Math.round((completedSteps / totalSteps) * 100));
      }

      // Step 4: Process Videos (convert to base64 for AI)
      if (files.videoFiles.length > 0) {
        updateStep('videos', { status: 'processing' });
        addThinkingMessage('Menyiapkan video untuk analisis AI...');

        for (const file of files.videoFiles) {
          const base64 = await fileToBase64(file);
          const video: ProcessedVideo = {
            fileName: file.name,
            base64,
          };
          context = investigationContextService.addVideo(context, video);
        }

        updateStep('videos', { status: 'completed', details: `${files.videoFiles.length} videos ready` });
        completedSteps++;
        setOverallProgress(Math.round((completedSteps / totalSteps) * 100));
      }

      // Step 5: Generate Report via Edge Function
      updateStep('analysis', { status: 'processing' });
      addThinkingMessage('Mengirim data ke AI untuk analisis komprehensif...');

      // Build request payload
      const audioData = await Promise.all(
        files.audioFiles.map(async (file, idx) => ({
          data: context.audioInterviews[idx].processedLocally ? undefined : await fileToBase64(file),
          name: file.name,
          transcript: context.audioInterviews[idx].transcript || undefined,
          processedLocally: context.audioInterviews[idx].processedLocally,
        }))
      );

      const documentData = files.documentFiles.map((file, idx) => ({
        name: file.name,
        content: context.documents[idx].content,
        format: context.documents[idx].format,
        processedLocally: context.documents[idx].processedLocally,
      }));

      addThinkingMessage('AI menganalisis korelasi antara interview dan bukti...');

      const { data, error } = await supabase.functions.invoke('generate-investigation-report', {
        body: {
          audioFiles: audioData,
          imageFiles: context.images,
          documentFiles: documentData,
          videoFiles: context.videos,
          textContext: investigationContextService.buildPromptContext(context),
        }
      });

      if (error) throw error;

      updateStep('analysis', { status: 'completed' });
      completedSteps++;
      setOverallProgress(100);

      setReportData(data.report);
      setTrackingId(data.tracking_id || '');
      
      if (data.thinkingProcess) {
        setThinkingProcess(data.thinkingProcess);
      }

      toast({
        title: 'Report generated!',
        description: 'You can now edit and export the report',
      });

    } catch (error: any) {
      console.error('[InvestigationReport] Error:', error);
      
      // Mark current processing step as error
      setProcessingSteps(prev => prev.map(step => 
        step.status === 'processing' ? { ...step, status: 'error' } : step
      ));

      toast({
        title: 'Error generating report',
        description: error.message || 'Failed to generate report',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-4 lg:p-6">
        <div className="text-center mb-6">
          <h1 className="text-2xl lg:text-3xl font-bold mb-1">Investigation Report Generator</h1>
          <p className="text-muted-foreground text-sm lg:text-base">
            Generate comprehensive investigation report from multiple evidence sources
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Input Section */}
          <div className="space-y-4">
            <InvestigationMultiInputForm
              onGenerate={handleGenerate}
              isGenerating={isGenerating}
            />
          </div>

          {/* Output Section */}
          <div className="space-y-4">
            {showPipeline && isGenerating && (
              <InvestigationProcessingPipeline
                steps={processingSteps}
                thinkingMessages={thinkingMessages}
                overallProgress={overallProgress}
                isComplete={!isGenerating && reportData.length > 0}
              />
            )}

            {reportData ? (
              <div className="space-y-4">
                {thinkingProcess && (
                  <ThinkingProcessViewer thinkingProcess={thinkingProcess} compact={false} />
                )}
                <InvestigationReportDisplay
                  reportData={reportData}
                  trackingId={trackingId}
                  onUpdate={(newReport) => setReportData(newReport)}
                />
              </div>
            ) : !isGenerating && (
              <Card className="p-8 text-center border-dashed min-h-64 flex items-center justify-center">
                <p className="text-muted-foreground">
                  Your investigation report will appear here after generation
                </p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvestigationReportGenerator;
