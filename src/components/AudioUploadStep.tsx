import React, { useState, useCallback } from 'react';
import { Upload, File, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface AudioUploadStepProps {
  onNext: (file: File, duration: number) => void;
}

const AudioUploadStep = ({ onNext }: AudioUploadStepProps) => {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  const validateFile = (file: File): boolean => {
    const validFormats = ['audio/mp3', 'audio/wav', 'audio/m4a', 'audio/mpeg', 'audio/x-m4a'];
    const maxSize = 100 * 1024 * 1024; // 100MB

    if (!validFormats.includes(file.type) && !file.name.match(/\.(mp3|wav|m4a)$/i)) {
      toast({
        title: 'Format tidak didukung',
        description: 'Silakan upload file MP3, WAV, atau M4A',
        variant: 'destructive',
      });
      return false;
    }

    if (file.size > maxSize) {
      toast({
        title: 'File terlalu besar',
        description: 'Ukuran file maksimal 100MB',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  const handleFileUpload = useCallback((file: File) => {
    if (!validateFile(file)) return;

    const audio = new Audio(URL.createObjectURL(file));
    audio.onloadedmetadata = () => {
      const audioDuration = Math.floor(audio.duration);
      
      if (audioDuration < 10) {
        toast({
          title: 'Audio terlalu pendek',
          description: 'Durasi audio minimal 10 detik',
          variant: 'destructive',
        });
        return;
      }

      setDuration(audioDuration);
      setAudioFile(file);
      toast({
        title: 'File berhasil diupload',
        description: `${file.name} (${formatDuration(audioDuration)})`,
      });
    };

    audio.onerror = () => {
      toast({
        title: 'Error',
        description: 'Gagal membaca file audio',
        variant: 'destructive',
      });
    };
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatSize = (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Upload Audio Interview</h2>
        <p className="text-muted-foreground">
          Upload rekaman audio wawancara investigasi (MP3, WAV, M4A - Max 100MB)
        </p>
      </div>

      {!audioFile ? (
        <Card
          className={cn(
            'border-2 border-dashed p-12 transition-colors cursor-pointer',
            isDragging && 'border-primary bg-primary/5'
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => document.getElementById('audio-upload')?.click()}
        >
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="p-4 bg-primary/10 rounded-full">
              <Upload className="h-12 w-12 text-primary" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-lg font-semibold">Drag & drop audio file di sini</p>
              <p className="text-sm text-muted-foreground">atau klik untuk browse file</p>
            </div>
            <input
              id="audio-upload"
              type="file"
              accept=".mp3,.wav,.m4a,audio/*"
              className="hidden"
              onChange={handleFileInput}
            />
          </div>
        </Card>
      ) : (
        <Card className="p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              <div className="p-3 bg-primary/10 rounded-lg">
                <File className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="font-semibold">{audioFile.name}</p>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span>{formatSize(audioFile.size)}</span>
                  <span>•</span>
                  <span>{formatDuration(duration)}</span>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setAudioFile(null);
                setDuration(0);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <audio controls className="w-full">
            <source src={URL.createObjectURL(audioFile)} type={audioFile.type} />
          </audio>

          <Button onClick={() => onNext(audioFile, duration)} className="w-full" size="lg">
            Lanjut ke Transkripsi
          </Button>
        </Card>
      )}
    </div>
  );
};

export default AudioUploadStep;
