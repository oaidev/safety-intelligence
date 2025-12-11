export interface ProcessedAudio {
  fileName: string;
  transcript: string;
  duration?: number;
  processedLocally: boolean;
}

export interface ProcessedDocument {
  fileName: string;
  content: string;
  wordCount: number;
  format: string;
  processedLocally: boolean;
}

export interface ProcessedImage {
  fileName: string;
  base64: string;
}

export interface ProcessedVideo {
  fileName: string;
  base64: string;
}

export interface InvestigationContext {
  audioInterviews: ProcessedAudio[];
  documents: ProcessedDocument[];
  images: ProcessedImage[];
  videos: ProcessedVideo[];
  summary: {
    totalAudioFiles: number;
    totalDocuments: number;
    totalImages: number;
    totalVideos: number;
    totalWordCount: number;
  };
}

export interface ProcessingStep {
  id: string;
  label: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress?: number;
  details?: string;
  startTime?: number;
  endTime?: number;
}

class InvestigationContextService {
  private static instance: InvestigationContextService;

  static getInstance(): InvestigationContextService {
    if (!InvestigationContextService.instance) {
      InvestigationContextService.instance = new InvestigationContextService();
    }
    return InvestigationContextService.instance;
  }

  createEmptyContext(): InvestigationContext {
    return {
      audioInterviews: [],
      documents: [],
      images: [],
      videos: [],
      summary: {
        totalAudioFiles: 0,
        totalDocuments: 0,
        totalImages: 0,
        totalVideos: 0,
        totalWordCount: 0,
      },
    };
  }

  addAudio(context: InvestigationContext, audio: ProcessedAudio): InvestigationContext {
    const wordCount = audio.transcript.split(/\s+/).filter(w => w.length > 0).length;
    return {
      ...context,
      audioInterviews: [...context.audioInterviews, audio],
      summary: {
        ...context.summary,
        totalAudioFiles: context.summary.totalAudioFiles + 1,
        totalWordCount: context.summary.totalWordCount + wordCount,
      },
    };
  }

  addDocument(context: InvestigationContext, doc: ProcessedDocument): InvestigationContext {
    return {
      ...context,
      documents: [...context.documents, doc],
      summary: {
        ...context.summary,
        totalDocuments: context.summary.totalDocuments + 1,
        totalWordCount: context.summary.totalWordCount + doc.wordCount,
      },
    };
  }

  addImage(context: InvestigationContext, image: ProcessedImage): InvestigationContext {
    return {
      ...context,
      images: [...context.images, image],
      summary: {
        ...context.summary,
        totalImages: context.summary.totalImages + 1,
      },
    };
  }

  addVideo(context: InvestigationContext, video: ProcessedVideo): InvestigationContext {
    return {
      ...context,
      videos: [...context.videos, video],
      summary: {
        ...context.summary,
        totalVideos: context.summary.totalVideos + 1,
      },
    };
  }

  buildPromptContext(context: InvestigationContext): string {
    const sections: string[] = [];

    // Audio transcripts
    if (context.audioInterviews.length > 0) {
      sections.push('=== TRANSKRIP INTERVIEW ===');
      context.audioInterviews.forEach((audio, idx) => {
        sections.push(`\n--- Interview ${idx + 1}: ${audio.fileName} ---`);
        sections.push(audio.transcript);
      });
    }

    // Documents
    if (context.documents.length > 0) {
      sections.push('\n\n=== DOKUMEN PENDUKUNG ===');
      context.documents.forEach((doc, idx) => {
        sections.push(`\n--- Dokumen ${idx + 1}: ${doc.fileName} (${doc.format.toUpperCase()}) ---`);
        sections.push(doc.content);
      });
    }

    // Summary of visual evidence
    if (context.images.length > 0 || context.videos.length > 0) {
      sections.push('\n\n=== BUKTI VISUAL ===');
      if (context.images.length > 0) {
        sections.push(`Foto bukti: ${context.images.map(i => i.fileName).join(', ')}`);
      }
      if (context.videos.length > 0) {
        sections.push(`Video bukti: ${context.videos.map(v => v.fileName).join(', ')}`);
      }
    }

    return sections.join('\n');
  }
}

export const investigationContextService = InvestigationContextService.getInstance();
