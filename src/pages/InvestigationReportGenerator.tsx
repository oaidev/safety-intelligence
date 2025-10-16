import React, { useState } from 'react';
import StepProgress from '@/components/StepProgress';
import AudioUploadStep from '@/components/AudioUploadStep';
import TranscriptionStep from '@/components/TranscriptionStep';
import ReportGenerationStep from '@/components/ReportGenerationStep';
import { Card } from '@/components/ui/card';

const InvestigationReportGenerator = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [transcript, setTranscript] = useState('');

  const handleAudioUpload = (file: File, duration: number) => {
    setAudioFile(file);
    setAudioDuration(duration);
    setCurrentStep(2);
  };

  const handleTranscriptReady = (transcriptText: string) => {
    setTranscript(transcriptText);
    setCurrentStep(3);
  };

  const handleBackToUpload = () => {
    setCurrentStep(1);
    setAudioFile(null);
    setAudioDuration(0);
    setTranscript('');
  };

  const handleBackToTranscript = () => {
    setCurrentStep(2);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-6 py-12">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Investigation Report Generator</h1>
          <p className="text-muted-foreground text-lg">
            Buat laporan investigasi kecelakaan lengkap dari audio interview
          </p>
        </div>

        <StepProgress currentStep={currentStep} />

        <Card className="min-h-96 p-6">
          {currentStep === 1 && <AudioUploadStep onNext={handleAudioUpload} />}
          
          {currentStep === 2 && audioFile && (
            <TranscriptionStep
              audioFile={audioFile}
              audioDuration={audioDuration}
              onNext={handleTranscriptReady}
              onBack={handleBackToUpload}
            />
          )}
          
          {currentStep === 3 && audioFile && (
            <ReportGenerationStep
              transcript={transcript}
              audioFileName={audioFile.name}
              audioDuration={audioDuration}
              onBack={handleBackToTranscript}
            />
          )}
        </Card>
      </div>
    </div>
  );
};

export default InvestigationReportGenerator;
