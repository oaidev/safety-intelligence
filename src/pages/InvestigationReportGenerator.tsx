import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { InvestigationMultiInputForm, type EvidenceFiles } from '@/components/InvestigationMultiInputForm';
import { InvestigationProcessingPipeline, type ProcessingStep, type ThinkingMessage } from '@/components/InvestigationProcessingPipeline';
import { InvestigationReportDisplay } from '@/components/InvestigationReportDisplay';
import { whisperService } from '@/lib/whisperService';
import { documentProcessingService } from '@/lib/documentProcessingService';
import { investigationContextService, type InvestigationContext, type ProcessedAudio, type ProcessedDocument, type ProcessedImage, type ProcessedVideo } from '@/lib/investigationContextService';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ThinkingProcessViewer, type ThinkingProcess } from '@/components/ThinkingProcessViewer';

const SUPABASE_URL = 'https://shdhbfvpprqhtooqluld.supabase.co';

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

  // Compress image before sending to server
  const compressImage = (file: File, maxWidth = 1024, quality = 0.8): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      img.onload = () => {
        let { width, height } = img;
        
        // Scale down if needed
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Get compressed base64
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const base64 = dataUrl.split(',')[1];
        resolve(base64);
      };
      
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  // Calculate total payload size
  const estimatePayloadSize = (files: EvidenceFiles): number => {
    let totalSize = 0;
    files.audioFiles.forEach(f => totalSize += f.size);
    files.imageFiles.forEach(f => totalSize += f.size * 0.3); // Compressed estimate
    files.documentFiles.forEach(f => totalSize += f.size);
    files.videoFiles.forEach(f => totalSize += f.size);
    return totalSize;
  };

  const handleGenerateWithSSE = async (files: EvidenceFiles) => {
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

    // Check estimated payload size
    const estimatedSize = estimatePayloadSize(files);
    const MAX_PAYLOAD_SIZE = 50 * 1024 * 1024; // 50MB limit
    
    if (estimatedSize > MAX_PAYLOAD_SIZE) {
      toast({
        title: 'Payload terlalu besar',
        description: `Total file ~${Math.round(estimatedSize / (1024 * 1024))}MB melebihi batas 50MB. Kurangi ukuran atau jumlah file.`,
        variant: 'destructive',
      });
      setIsGenerating(false);
      setShowPipeline(false);
      return;
    }

    let context = investigationContextService.createEmptyContext();

    try {
      // Step 1: Process Audio Files locally if possible
      if (files.audioFiles.length > 0) {
        updateStep('audio', { status: 'processing' });
        addThinkingMessage('Memulai transkripsi audio interview...');

        for (let i = 0; i < files.audioFiles.length; i++) {
          const file = files.audioFiles[i];
          let transcript = '';
          let processedLocally = false;

          setProcessingSteps(prev => prev.map(step => 
            step.id === 'audio' ? {
              ...step,
              subSteps: step.subSteps?.map((sub, idx) => 
                idx === i ? { ...sub, status: 'processing' as const } : sub
              ),
            } : step
          ));

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

          context = investigationContextService.addAudio(context, audio);

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
      }

      // Step 2: Process Documents (DOCX/TXT locally, PDF to server)
      if (files.documentFiles.length > 0) {
        updateStep('documents', { status: 'processing' });
        addThinkingMessage('Mengekstrak konten dokumen...');

        for (let i = 0; i < files.documentFiles.length; i++) {
          const file = files.documentFiles[i];
          let content = '';
          let wordCount = 0;
          let processedLocally = false;
          const format = documentProcessingService.getFileFormat(file);

          setProcessingSteps(prev => prev.map(step => 
            step.id === 'documents' ? {
              ...step,
              subSteps: step.subSteps?.map((sub, idx) => 
                idx === i ? { ...sub, status: 'processing' as const } : sub
              ),
            } : step
          ));

          try {
            if (format === 'docx') {
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
            } else if (format === 'pdf') {
              addThinkingMessage(`PDF akan diproses via OCR server: ${file.name}...`);
              // PDF will be processed server-side with Gemini Vision
              processedLocally = false;
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

          setProcessingSteps(prev => prev.map(step => 
            step.id === 'documents' ? {
              ...step,
              subSteps: step.subSteps?.map((sub, idx) => 
                idx === i ? { ...sub, status: 'completed' as const } : sub
              ),
            } : step
          ));
        }

        updateStep('documents', { status: 'completed', details: `${context.summary.totalWordCount} words extracted locally` });
      }

      // Step 3: Prepare Images (with compression)
      if (files.imageFiles.length > 0) {
        updateStep('images', { status: 'processing' });
        addThinkingMessage('Mengompresi dan menyiapkan foto bukti...');

        for (const file of files.imageFiles) {
          // Compress image to reduce payload size
          const base64 = await compressImage(file, 1024, 0.8);
          const image: ProcessedImage = {
            fileName: file.name,
            base64,
          };
          context = investigationContextService.addImage(context, image);
        }

        updateStep('images', { status: 'completed', details: `${files.imageFiles.length} images compressed & ready` });
      }

      // Step 4: Prepare Videos (skip if too large)
      if (files.videoFiles.length > 0) {
        updateStep('videos', { status: 'processing' });
        
        const validVideos: File[] = [];
        const skippedVideos: string[] = [];
        const VIDEO_MAX_SIZE = 15 * 1024 * 1024; // 15MB per video
        
        for (const file of files.videoFiles) {
          if (file.size > VIDEO_MAX_SIZE) {
            skippedVideos.push(file.name);
            addThinkingMessage(`⚠️ Video ${file.name} terlalu besar (${Math.round(file.size / (1024 * 1024))}MB), dilewati`);
          } else {
            validVideos.push(file);
          }
        }

        if (skippedVideos.length > 0) {
          toast({
            title: 'Beberapa video dilewati',
            description: `${skippedVideos.length} video > 15MB tidak diproses untuk menghindari memory error`,
            variant: 'default',
          });
        }

        for (const file of validVideos) {
          addThinkingMessage(`Menyiapkan video: ${file.name}...`);
          const base64 = await fileToBase64(file);
          const video: ProcessedVideo = {
            fileName: file.name,
            base64,
          };
          context = investigationContextService.addVideo(context, video);
        }

        const details = validVideos.length > 0 
          ? `${validVideos.length} videos ready` + (skippedVideos.length > 0 ? `, ${skippedVideos.length} skipped` : '')
          : 'No videos processed (all too large)';
        
        updateStep('videos', { status: 'completed', details });
      }

      // Step 5: Call Edge Function with SSE
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

      // Include base64 for PDFs that need server-side OCR
      const documentData = await Promise.all(
        files.documentFiles.map(async (file, idx) => {
          const docContext = context.documents[idx];
          return {
            name: file.name,
            content: docContext.content,
            format: docContext.format,
            base64: docContext.format === 'pdf' && !docContext.processedLocally ? await fileToBase64(file) : undefined,
            processedLocally: docContext.processedLocally,
          };
        })
      );

      // Use SSE streaming
      const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-investigation-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audioFiles: audioData,
          imageFiles: context.images,
          documentFiles: documentData,
          videoFiles: context.videos,
          textContext: investigationContextService.buildPromptContext(context),
          stream: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate report');
      }

      // Process SSE stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              const eventType = line.slice(7);
              continue;
            }
            
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                
                if (data.step && data.message) {
                  // Progress update
                  addThinkingMessage(data.message);
                  
                  // Update step status based on progress
                  if (data.step === 'audio') {
                    updateStep('audio', { status: 'processing' });
                  } else if (data.step === 'documents') {
                    updateStep('documents', { status: 'processing' });
                  } else if (data.step === 'videos') {
                    updateStep('videos', { status: 'processing' });
                  } else if (data.step === 'analysis') {
                    updateStep('analysis', { status: 'processing' });
                  }
                  
                  // Estimate progress
                  const progressMap: Record<string, number> = {
                    'start': 10,
                    'audio': 30,
                    'documents': 50,
                    'videos': 70,
                    'analysis': 85,
                    'complete': 100,
                  };
                  setOverallProgress(progressMap[data.step] || 50);
                }
                
                if (data.report) {
                  // Final result
                  updateStep('analysis', { status: 'completed' });
                  setOverallProgress(100);
                  setReportData(data.report);
                  setTrackingId(data.tracking_id || '');
                  
                  if (data.thinkingProcess) {
                    setThinkingProcess(data.thinkingProcess);
                  }
                }
                
                if (data.error) {
                  throw new Error(data.error);
                }
              } catch (e) {
                // Ignore parse errors for partial data
              }
            }
          }
        }
      }

      toast({
        title: 'Report generated!',
        description: 'Investigation report with video analysis and PDF OCR complete',
      });

    } catch (error: any) {
      console.error('[InvestigationReport] Error:', error);
      
      setProcessingSteps(prev => prev.map(step => 
        step.status === 'processing' ? { ...step, status: 'error' } : step
      ));

      // Check for specific error types
      let errorMessage = error.message || 'Failed to generate report';
      let errorTitle = 'Error generating report';
      
      if (errorMessage.toLowerCase().includes('memory')) {
        errorTitle = 'Memory limit exceeded';
        errorMessage = 'File terlalu besar untuk diproses. Coba kurangi ukuran video atau gunakan video yang lebih pendek.';
      } else if (error.message?.includes('429') || error.message?.includes('rate limit')) {
        errorTitle = 'Rate limit exceeded';
        errorMessage = 'Terlalu banyak request. Tunggu beberapa saat dan coba lagi.';
      }

      toast({
        title: errorTitle,
        description: errorMessage,
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
            Generate comprehensive investigation report from audio, video, images, and documents
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Input Section */}
          <div className="space-y-4">
            <InvestigationMultiInputForm
              onGenerate={handleGenerateWithSSE}
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
