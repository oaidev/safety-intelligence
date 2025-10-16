import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, RefreshCw, FileText } from 'lucide-react';
import { pipeline } from '@huggingface/transformers';

interface TranscriptionStepProps {
  audioFile: File;
  audioDuration: number;
  onNext: (transcript: string) => void;
  onBack: () => void;
}

const TranscriptionStep = ({ audioFile, audioDuration, onNext, onBack }: TranscriptionStepProps) => {
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [modelStatus, setModelStatus] = useState<'idle' | 'loading' | 'ready' | 'processing'>('idle');
  const [wordCount, setWordCount] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    if (transcript) {
      const words = transcript.trim().split(/\s+/).length;
      setWordCount(words);
    }
  }, [transcript]);

  const transcribeAudio = async () => {
    setIsProcessing(true);
    setProgress(0);
    setModelStatus('loading');

    try {
      toast({
        title: 'Memuat model Whisper...',
        description: 'First time: ~290MB download. Akan di-cache untuk penggunaan selanjutnya.',
      });

      // Initialize Whisper model with Indonesian support
      const transcriber = await pipeline(
        'automatic-speech-recognition',
        'Xenova/whisper-base',
        {
          device: 'webgpu', // Use WebGPU for faster processing
          dtype: 'fp32',
          progress_callback: (data: any) => {
            if (data.status === 'progress') {
              const percentage = Math.round((data.loaded / data.total) * 100);
              setProgress(percentage);
            }
          },
        }
      );

      setModelStatus('ready');
      setProgress(0);
      
      toast({
        title: 'Model siap!',
        description: 'Memulai transkripsi audio...',
      });

      setModelStatus('processing');

      // Convert file to URL for processing
      const audioUrl = URL.createObjectURL(audioFile);
      
      // Transcribe with Indonesian language
      const result = await transcriber(audioUrl, {
        language: 'indonesian',
        task: 'transcribe',
        chunk_length_s: 30,
        stride_length_s: 5,
        return_timestamps: false,
      });

      // Clean up the URL
      URL.revokeObjectURL(audioUrl);

      // Extract text from result
      let transcribedText = '';
      if (typeof result === 'string') {
        transcribedText = result;
      } else if (Array.isArray(result)) {
        transcribedText = result.map(r => r.text).join(' ');
      } else if (result && 'text' in result) {
        transcribedText = (result as any).text;
      }
      
      if (!transcribedText || transcribedText.length < 50) {
        throw new Error('Transcript terlalu pendek atau gagal diproses');
      }

      setTranscript(transcribedText);
      setModelStatus('idle');
      
      toast({
        title: 'Transkripsi selesai!',
        description: `${transcribedText.split(/\s+/).length} kata berhasil ditranskripsi`,
      });

    } catch (error: any) {
      console.error('Transcription error:', error);
      setModelStatus('idle');
      
      let errorMessage = 'Gagal melakukan transkripsi';
      
      if (error.message?.includes('WebGPU')) {
        errorMessage = 'WebGPU tidak tersedia. Browser Anda mungkin tidak mendukung fitur ini.';
      } else if (error.message?.includes('memory')) {
        errorMessage = 'Tidak cukup memori. Coba gunakan file audio yang lebih kecil.';
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const handleContinue = () => {
    if (!transcript || transcript.length < 50) {
      toast({
        title: 'Transcript terlalu pendek',
        description: 'Pastikan transcript minimal 50 karakter',
        variant: 'destructive',
      });
      return;
    }

    onNext(transcript);
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Audio Transcription</h2>
        <p className="text-muted-foreground">
          Transkripsi otomatis menggunakan AI (Whisper model - Indonesian)
        </p>
      </div>

      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">File: {audioFile.name}</span>
          <span className="text-muted-foreground">Durasi: {formatDuration(audioDuration)}</span>
        </div>

        {!transcript && !isProcessing && (
          <Button onClick={transcribeAudio} className="w-full" size="lg">
            <FileText className="mr-2 h-5 w-5" />
            Mulai Transkripsi
          </Button>
        )}

        {isProcessing && (
          <div className="space-y-3 py-4">
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="font-medium">
                {modelStatus === 'loading' && 'Mengunduh model...'}
                {modelStatus === 'ready' && 'Model siap, memulai transkripsi...'}
                {modelStatus === 'processing' && 'Memproses audio...'}
              </span>
            </div>
            
            {progress > 0 && (
              <>
                <Progress value={progress} className="h-2" />
                <p className="text-sm text-center text-muted-foreground">
                  {progress}% - {modelStatus === 'loading' ? 'Downloading model (~290MB)' : 'Transcribing...'}
                </p>
              </>
            )}
          </div>
        )}
      </Card>

      {transcript && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">Hasil Transkripsi</h3>
            <div className="text-sm text-muted-foreground">
              {wordCount} kata • ~{Math.ceil(wordCount / 200)} menit membaca
            </div>
          </div>

          <Textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            className="min-h-96 font-mono text-sm"
            placeholder="Transcript akan muncul di sini..."
          />

          <div className="flex gap-3">
            <Button variant="outline" onClick={onBack} className="flex-1">
              Kembali
            </Button>
            <Button
              variant="outline"
              onClick={transcribeAudio}
              disabled={isProcessing}
              className="flex-1"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Re-process Audio
            </Button>
            <Button onClick={handleContinue} className="flex-1">
              Lanjut ke Generate Report
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default TranscriptionStep;
