import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { InvestigationInputForm } from '@/components/InvestigationInputForm';
import { InvestigationReportDisplay } from '@/components/InvestigationReportDisplay';
import { whisperService } from '@/lib/whisperService';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const InvestigationReportGenerator = () => {
  const [reportData, setReportData] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [trackingId, setTrackingId] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    // Silent background initialization - no UI feedback
    whisperService.initializeInBackground();
  }, []);

  const handleGenerate = async (audioFile: File, imageFile: File | null) => {
    setIsGenerating(true);

    try {
      let transcript = '';
      let useLocalWhisper = false;

      // Try local Whisper first if ready
      if (whisperService.isModelReady()) {
        console.log('[InvestigationReport] Using local Whisper model');
        
        try {
          transcript = await whisperService.transcribeAudio(audioFile);
          useLocalWhisper = true;
          console.log('[InvestigationReport] Local transcription successful');
        } catch (error) {
          console.error('[InvestigationReport] Local Whisper failed, falling back to Gemini:', error);
        }
      } else {
        console.log('[InvestigationReport] Whisper not ready, using Gemini fallback');
      }

      // Convert files to base64
      const audioBase64 = await fileToBase64(audioFile);
      const imageBase64 = imageFile ? await fileToBase64(imageFile) : null;

      toast({
        title: 'Generating report...',
        description: imageFile 
          ? 'AI analyzing audio interview and photo evidence' 
          : 'AI analyzing audio interview',
      });

      // Call edge function
      const { data, error } = await supabase.functions.invoke('generate-investigation-report', {
        body: {
          audio: useLocalWhisper ? undefined : audioBase64,
          audioFileName: audioFile.name,
          image: imageBase64,
          imageFileName: imageFile?.name,
          useLocalWhisper: useLocalWhisper,
          transcript: useLocalWhisper ? transcript : undefined
        }
      });

      if (error) throw error;

      setReportData(data.report);
      setTrackingId(data.tracking_id || '');

      toast({
        title: 'Report generated!',
        description: 'You can now edit and export the report',
      });

    } catch (error: any) {
      console.error('[InvestigationReport] Error:', error);
      toast({
        title: 'Error generating report',
        description: error.message || 'Failed to generate report',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

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

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6 py-12">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Investigation Report Generator</h1>
          <p className="text-muted-foreground text-lg">
            Generate comprehensive investigation report from audio interview & photo evidence
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Section */}
          <div>
            <InvestigationInputForm
              onGenerate={handleGenerate}
              isGenerating={isGenerating}
            />
          </div>

          {/* Report Display Section */}
          <div>
            {reportData ? (
              <InvestigationReportDisplay
                reportData={reportData}
                trackingId={trackingId}
                onUpdate={(newReport) => setReportData(newReport)}
              />
            ) : (
              <Card className="p-12 text-center border-dashed min-h-96 flex items-center justify-center">
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
