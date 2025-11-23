import React, { useState } from 'react';
import { Upload, File, Image as ImageIcon, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface InvestigationInputFormProps {
  onGenerate: (audioFile: File, imageFile: File | null) => void;
  isGenerating: boolean;
}

export function InvestigationInputForm({ onGenerate, isGenerating }: InvestigationInputFormProps) {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const { toast } = useToast();

  const validateAudioFile = (file: File): boolean => {
    const validFormats = ['audio/mp3', 'audio/wav', 'audio/m4a', 'audio/mpeg'];
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
        description: 'Ukuran audio maksimal 100MB',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  const validateImageFile = (file: File): boolean => {
    const validFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSize = 20 * 1024 * 1024; // 20MB

    if (!validFormats.includes(file.type)) {
      toast({
        title: 'Format tidak didukung',
        description: 'Silakan upload file JPG, PNG, atau WebP',
        variant: 'destructive',
      });
      return false;
    }

    if (file.size > maxSize) {
      toast({
        title: 'File terlalu besar',
        description: 'Ukuran image maksimal 20MB',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  const handleAudioUpload = (file: File) => {
    if (!validateAudioFile(file)) return;

    const audio = new Audio(URL.createObjectURL(file));
    audio.onloadedmetadata = () => {
      const duration = Math.floor(audio.duration);
      
      if (duration < 10) {
        toast({
          title: 'Audio terlalu pendek',
          description: 'Durasi audio minimal 10 detik',
          variant: 'destructive',
        });
        return;
      }

      setAudioDuration(duration);
      setAudioFile(file);
      toast({
        title: 'Audio berhasil diupload',
        description: `${file.name} (${formatDuration(duration)})`,
      });
    };
  };

  const handleImageUpload = (file: File) => {
    if (!validateImageFile(file)) return;
    setImageFile(file);
    toast({
      title: 'Image berhasil diupload',
      description: file.name,
    });
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleGenerate = () => {
    if (!audioFile) {
      toast({
        title: 'Audio wajib diisi',
        description: 'Silakan upload file audio terlebih dahulu',
        variant: 'destructive',
      });
      return;
    }

    onGenerate(audioFile, imageFile);
  };

  return (
    <div className="space-y-6">
      {/* Audio Upload Section */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <File className="h-5 w-5" />
          Audio Interview <span className="text-destructive">*</span>
        </h3>
        
        {!audioFile ? (
          <div
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
            onClick={() => document.getElementById('audio-input')?.click()}
          >
            <Upload className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
            <p className="font-medium mb-1">Upload rekaman audio interview</p>
            <p className="text-sm text-muted-foreground">MP3, WAV, M4A - Max 100MB</p>
            <input
              id="audio-input"
              type="file"
              accept=".mp3,.wav,.m4a,audio/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleAudioUpload(e.target.files[0])}
            />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
              <div className="flex items-center gap-3">
                <File className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-sm">{audioFile.name}</p>
                  <p className="text-xs text-muted-foreground">{formatDuration(audioDuration)}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setAudioFile(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <audio controls className="w-full">
              <source src={URL.createObjectURL(audioFile)} type={audioFile.type} />
            </audio>
          </div>
        )}
      </Card>

      {/* Image Upload Section */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Foto Bukti Investigasi <span className="text-muted-foreground text-sm font-normal">(Optional)</span>
        </h3>
        
        {!imageFile ? (
          <div
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
            onClick={() => document.getElementById('image-input')?.click()}
          >
            <ImageIcon className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
            <p className="font-medium mb-1">Upload foto bukti investigasi</p>
            <p className="text-sm text-muted-foreground">JPG, PNG, WebP - Max 20MB</p>
            <input
              id="image-input"
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
            />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
              <div className="flex items-center gap-3">
                <ImageIcon className="h-5 w-5 text-primary" />
                <p className="font-medium text-sm">{imageFile.name}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setImageFile(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <img
              src={URL.createObjectURL(imageFile)}
              alt="Preview"
              className="w-full max-h-96 object-contain rounded-lg border"
            />
          </div>
        )}
      </Card>

      {/* Generate Button */}
      <Button 
        onClick={handleGenerate} 
        disabled={!audioFile || isGenerating}
        className="w-full"
        size="lg"
      >
        {isGenerating ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Generating Report...
          </>
        ) : (
          'Generate Investigation Report'
        )}
      </Button>
    </div>
  );
}
