// PDF Processing Service - Server-side via Gemini Vision OCR
// pdfjs-dist removed due to top-level await incompatibility

export interface PDFExtractionResult {
  text: string;
  pageCount: number;
  hasImages: boolean;
  isScanned: boolean;
}

export interface PDFProcessingProgress {
  currentPage: number;
  totalPages: number;
  extractedText: string;
}

class PDFProcessingService {
  private static instance: PDFProcessingService;

  static getInstance(): PDFProcessingService {
    if (!PDFProcessingService.instance) {
      PDFProcessingService.instance = new PDFProcessingService();
    }
    return PDFProcessingService.instance;
  }

  async extractAsBase64(pdfFile: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(pdfFile);
    });
  }

  async extractText(
    pdfFile: File,
    onProgress?: (progress: PDFProcessingProgress) => void
  ): Promise<PDFExtractionResult> {
    console.log('[PDFProcessingService] PDF will be processed server-side:', pdfFile.name);
    if (onProgress) {
      onProgress({ currentPage: 0, totalPages: 1, extractedText: '' });
    }
    return { text: '', pageCount: 0, hasImages: true, isScanned: true };
  }

  isScannedPDF(result: PDFExtractionResult): boolean {
    return true; // All PDFs processed server-side now
  }
}

export const pdfProcessingService = PDFProcessingService.getInstance();
