import { pipeline } from '@huggingface/transformers';

export interface TranscriptionProgress {
  currentFile: number;
  totalFiles: number;
  fileName: string;
  transcript?: string;
}

class WhisperService {
  private static instance: WhisperService;
  private transcriber: any = null;
  private isInitializing: boolean = false;
  private isReady: boolean = false;

  static getInstance(): WhisperService {
    if (!WhisperService.instance) {
      WhisperService.instance = new WhisperService();
    }
    return WhisperService.instance;
  }

  // Silent initialization in background - no UI feedback
  async initializeInBackground() {
    if (this.isReady || this.isInitializing) return;
    
    this.isInitializing = true;
    console.log('[WhisperService] Background initialization started (silent)');

    try {
      this.transcriber = await pipeline(
        'automatic-speech-recognition',
        'Xenova/whisper-base',
        {
          device: 'webgpu',
          dtype: 'fp32',
          progress_callback: (data: any) => {
            if (data.status === 'progress') {
              const percentage = Math.round((data.loaded / data.total) * 100);
              console.log(`[WhisperService] Model download: ${percentage}%`);
            }
          },
        }
      );
      
      this.isReady = true;
      this.isInitializing = false;
      console.log('[WhisperService] Model ready for use');
    } catch (error) {
      console.error('[WhisperService] Initialization failed:', error);
      this.isInitializing = false;
      this.isReady = false;
    }
  }

  async transcribeAudio(audioFile: File): Promise<string> {
    if (!this.isReady) {
      throw new Error('Model not ready yet');
    }

    const audioUrl = URL.createObjectURL(audioFile);
    const result = await this.transcriber(audioUrl, {
      language: 'indonesian',
      task: 'transcribe',
      chunk_length_s: 30,
      stride_length_s: 5,
      return_timestamps: false,
    });

    URL.revokeObjectURL(audioUrl);

    let transcribedText = '';
    if (typeof result === 'string') {
      transcribedText = result;
    } else if (Array.isArray(result)) {
      transcribedText = result.map(r => r.text).join(' ');
    } else if (result && 'text' in result) {
      transcribedText = (result as any).text;
    }

    return transcribedText;
  }

  async transcribeMultipleAudio(
    files: File[],
    onProgress?: (progress: TranscriptionProgress) => void
  ): Promise<string[]> {
    const transcripts: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (onProgress) {
        onProgress({
          currentFile: i + 1,
          totalFiles: files.length,
          fileName: file.name,
        });
      }

      try {
        const transcript = await this.transcribeAudio(file);
        transcripts.push(transcript);

        if (onProgress) {
          onProgress({
            currentFile: i + 1,
            totalFiles: files.length,
            fileName: file.name,
            transcript,
          });
        }
      } catch (error) {
        console.error(`[WhisperService] Failed to transcribe ${file.name}:`, error);
        transcripts.push(''); // Push empty string for failed transcription
      }
    }

    return transcripts;
  }

  isModelReady(): boolean {
    return this.isReady;
  }
}

export const whisperService = WhisperService.getInstance();
