import React, { useState, useCallback } from 'react';
import { Upload, File, Image as ImageIcon, Video, FileText, X, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export interface EvidenceFiles {
  audioFiles: File[];
  imageFiles: File[];
  documentFiles: File[];
  videoFiles: File[];
}

interface InvestigationMultiInputFormProps {
  onGenerate: (files: EvidenceFiles) => void;
  isGenerating: boolean;
}

interface FileSection {
  id: keyof EvidenceFiles;
  label: string;
  icon: React.ElementType;
  accept: string;
  maxSize: number;
  maxSizeLabel: string;
  formats: string;
  required?: boolean;
  sizeWarning?: string;
}

const FILE_SECTIONS: FileSection[] = [
  {
    id: 'audioFiles',
    label: 'Audio Interview',
    icon: File,
    accept: '.mp3,.wav,.m4a,audio/*',
    maxSize: 100 * 1024 * 1024,
    maxSizeLabel: '100MB',
    formats: 'MP3, WAV, M4A',
    required: true,
  },
  {
    id: 'imageFiles',
    label: 'Foto Bukti',
    icon: ImageIcon,
    accept: 'image/jpeg,image/jpg,image/png,image/webp',
    maxSize: 10 * 1024 * 1024,
    maxSizeLabel: '10MB',
    formats: 'JPG, PNG, WebP',
  },
  {
    id: 'documentFiles',
    label: 'Dokumen',
    icon: FileText,
    accept: '.pdf,.docx,.doc,.txt',
    maxSize: 50 * 1024 * 1024,
    maxSizeLabel: '50MB',
    formats: 'PDF, DOCX, DOC, TXT',
  },
  {
    id: 'videoFiles',
    label: 'Video Bukti',
    icon: Video,
    accept: 'video/mp4,video/quicktime,.mp4,.mov',
    maxSize: 20 * 1024 * 1024,
    maxSizeLabel: '20MB',
    formats: 'MP4, MOV',
    sizeWarning: 'Video besar membutuhkan lebih banyak waktu dan memory',
  },
];

export function InvestigationMultiInputForm({ onGenerate, isGenerating }: InvestigationMultiInputFormProps) {
  const [files, setFiles] = useState<EvidenceFiles>({
    audioFiles: [],
    imageFiles: [],
    documentFiles: [],
    videoFiles: [],
  });
  const { toast } = useToast();

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileAdd = useCallback((sectionId: keyof EvidenceFiles, newFiles: FileList | null) => {
    if (!newFiles) return;

    const section = FILE_SECTIONS.find(s => s.id === sectionId);
    if (!section) return;

    const validFiles: File[] = [];
    
    Array.from(newFiles).forEach(file => {
      if (file.size > section.maxSize) {
        toast({
          title: 'File terlalu besar',
          description: `${file.name} melebihi batas ${section.maxSizeLabel}`,
          variant: 'destructive',
        });
        return;
      }
      validFiles.push(file);
    });

    if (validFiles.length > 0) {
      setFiles(prev => ({
        ...prev,
        [sectionId]: [...prev[sectionId], ...validFiles],
      }));
      
      toast({
        title: 'File ditambahkan',
        description: `${validFiles.length} file berhasil ditambahkan`,
      });
    }
  }, [toast]);

  const handleFileRemove = useCallback((sectionId: keyof EvidenceFiles, index: number) => {
    setFiles(prev => ({
      ...prev,
      [sectionId]: prev[sectionId].filter((_, i) => i !== index),
    }));
  }, []);

  const handleGenerate = () => {
    if (files.audioFiles.length === 0) {
      toast({
        title: 'Audio wajib diisi',
        description: 'Minimal satu file audio interview diperlukan',
        variant: 'destructive',
      });
      return;
    }
    onGenerate(files);
  };

  const totalFiles = Object.values(files).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {FILE_SECTIONS.map(section => {
          const Icon = section.icon;
          const sectionFiles = files[section.id];
          
          return (
            <Card key={section.id} className="overflow-hidden">
              <CardHeader className="py-3 px-4 bg-muted/30">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {section.label}
                  {section.required && <span className="text-destructive">*</span>}
                  {sectionFiles.length > 0 && (
                    <Badge variant="secondary" className="ml-auto">
                      {sectionFiles.length}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                {/* File List */}
                {sectionFiles.length > 0 && (
                  <div className="space-y-2 mb-3 max-h-32 overflow-y-auto">
                    {sectionFiles.map((file, idx) => (
                      <div
                        key={`${file.name}-${idx}`}
                        className="flex items-center justify-between p-2 bg-secondary/50 rounded text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="truncate">{file.name}</span>
                          <span className="text-muted-foreground shrink-0">
                            ({formatFileSize(file.size)})
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() => handleFileRemove(section.id, idx)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload Area */}
                <div
                  className={cn(
                    "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors",
                    "hover:border-primary hover:bg-primary/5"
                  )}
                  onClick={() => document.getElementById(`input-${section.id}`)?.click()}
                >
                  <Plus className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">
                    {section.formats} • Max {section.maxSizeLabel}
                  </p>
                  <input
                    id={`input-${section.id}`}
                    type="file"
                    accept={section.accept}
                    multiple
                    className="hidden"
                    onChange={(e) => handleFileAdd(section.id, e.target.files)}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Summary & Generate Button */}
      <Card className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground">
            {totalFiles === 0 ? (
              'Belum ada file yang diupload'
            ) : (
              <span>
                <strong>{totalFiles}</strong> file siap diproses
                {files.audioFiles.length > 0 && ` (${files.audioFiles.length} audio`}
                {files.documentFiles.length > 0 && `, ${files.documentFiles.length} dokumen`}
                {files.imageFiles.length > 0 && `, ${files.imageFiles.length} foto`}
                {files.videoFiles.length > 0 && `, ${files.videoFiles.length} video`}
                {files.audioFiles.length > 0 && ')'}
              </span>
            )}
          </div>
          <Button
            onClick={handleGenerate}
            disabled={files.audioFiles.length === 0 || isGenerating}
            size="lg"
            className="shrink-0"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Generate Report'
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
