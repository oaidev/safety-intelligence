import * as pdfjsLib from 'pdfjs-dist';

// Set up the worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface PDFExtractionResult {
  text: string;
  pageCount: number;
  hasImages: boolean;
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

  async extractText(
    pdfFile: File,
    onProgress?: (progress: PDFProcessingProgress) => void
  ): Promise<PDFExtractionResult> {
    console.log('[PDFProcessingService] Starting text extraction for:', pdfFile.name);
    
    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    const totalPages = pdf.numPages;
    let fullText = '';
    let hasImages = false;

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      fullText += `\n--- Page ${pageNum} ---\n${pageText}`;

      // Check for images (operators that indicate image rendering)
      const operators = await page.getOperatorList();
      if (operators.fnArray.includes(pdfjsLib.OPS.paintImageXObject)) {
        hasImages = true;
      }

      if (onProgress) {
        onProgress({
          currentPage: pageNum,
          totalPages,
          extractedText: fullText,
        });
      }
    }

    console.log('[PDFProcessingService] Extraction complete. Pages:', totalPages, 'Characters:', fullText.length);
    
    return {
      text: fullText.trim(),
      pageCount: totalPages,
      hasImages,
    };
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

  isScannedPDF(result: PDFExtractionResult): boolean {
    // If has images and very little text, likely a scanned PDF
    const wordsPerPage = result.text.split(/\s+/).length / result.pageCount;
    return result.hasImages && wordsPerPage < 50;
  }
}

export const pdfProcessingService = PDFProcessingService.getInstance();
