import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

export interface DocumentExtractionResult {
  text: string;
  wordCount: number;
  format: 'docx' | 'doc' | 'txt' | 'xlsx' | 'xls';
}

class DocumentProcessingService {
  private static instance: DocumentProcessingService;

  static getInstance(): DocumentProcessingService {
    if (!DocumentProcessingService.instance) {
      DocumentProcessingService.instance = new DocumentProcessingService();
    }
    return DocumentProcessingService.instance;
  }

  async extractFromDocx(file: File): Promise<DocumentExtractionResult> {
    console.log('[DocumentProcessingService] Extracting DOCX:', file.name);
    
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    
    const text = result.value;
    const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
    
    console.log('[DocumentProcessingService] DOCX extracted. Words:', wordCount);
    
    return {
      text,
      wordCount,
      format: 'docx',
    };
  }

  async extractFromTxt(file: File): Promise<DocumentExtractionResult> {
    console.log('[DocumentProcessingService] Extracting TXT:', file.name);
    
    const text = await file.text();
    const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
    
    return {
      text,
      wordCount,
      format: 'txt',
    };
  }

  async extractFromExcel(file: File): Promise<DocumentExtractionResult> {
    console.log('[DocumentProcessingService] Extracting Excel:', file.name);
    
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    let fullText = '';
    
    // Iterate all sheets and convert to CSV for AI readability
    workbook.SheetNames.forEach((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      const csv = XLSX.utils.sheet_to_csv(sheet);
      fullText += `\n=== Sheet: ${sheetName} ===\n${csv}\n`;
    });
    
    const text = fullText.trim();
    const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
    
    console.log('[DocumentProcessingService] Excel extracted. Sheets:', workbook.SheetNames.length, 'Words:', wordCount);
    
    const ext = file.name.toLowerCase().split('.').pop();
    
    return {
      text,
      wordCount,
      format: ext === 'xls' ? 'xls' : 'xlsx',
    };
  }

  async extractAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  getFileFormat(file: File): 'docx' | 'doc' | 'txt' | 'pdf' | 'xlsx' | 'xls' | 'unknown' {
    const ext = file.name.toLowerCase().split('.').pop();
    if (ext === 'docx') return 'docx';
    if (ext === 'doc') return 'doc';
    if (ext === 'txt') return 'txt';
    if (ext === 'pdf') return 'pdf';
    if (ext === 'xlsx') return 'xlsx';
    if (ext === 'xls') return 'xls';
    return 'unknown';
  }

  canProcessLocally(file: File): boolean {
    const format = this.getFileFormat(file);
    return ['docx', 'txt', 'xlsx', 'xls'].includes(format);
  }
}

export const documentProcessingService = DocumentProcessingService.getInstance();
