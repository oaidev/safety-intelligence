import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Download, Edit, RefreshCw, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Textarea } from '@/components/ui/textarea';
import { ThinkingProcessViewer, ThinkingStep, ThinkingProcess } from './ThinkingProcessViewer';

interface ReportGenerationStepProps {
  transcript: string;
  audioFileName: string;
  audioDuration: number;
  onBack: () => void;
}

const ReportGenerationStep = ({ 
  transcript, 
  audioFileName, 
  audioDuration,
  onBack 
}: ReportGenerationStepProps) => {
  const [reportData, setReportData] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [trackingId, setTrackingId] = useState<string>('');
  const [thinkingProcess, setThinkingProcess] = useState<ThinkingProcess | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Auto-generate report when component mounts
    generateReport();
  }, []);

  const generateReport = async () => {
    setIsGenerating(true);
    setReportData('');
    const startTime = Date.now();
    const steps: ThinkingStep[] = [];

    try {
      // Step 1: Validate transcript
      const step1Start = Date.now();
      const wordCount = transcript.split(/\s+/).length;
      const isValid = transcript.length >= 50;
      
      steps.push({
        step: 1,
        name: 'Validasi Transcript',
        description: 'Memastikan transcript cukup panjang dan informatif',
        timestamp: step1Start,
        duration: Date.now() - step1Start,
        details: {
          transcriptLength: transcript.length,
          wordCount: wordCount,
          isValid: isValid,
          explanation: isValid 
            ? `✅ Transcript memiliki ${wordCount} kata dan sudah cukup untuk dianalisis oleh AI.`
            : `⚠️ Transcript terlalu pendek (${transcript.length} characters). Minimum 50 characters diperlukan.`
        },
        status: isValid ? 'success' : 'warning'
      });

      toast({
        title: 'Generating report...',
        description: 'AI sedang menganalisis transcript dan membuat laporan investigasi',
      });

      // Step 2: Call edge function for report generation
      const step2Start = Date.now();
      const { data, error } = await supabase.functions.invoke('generate-investigation-report', {
        body: { transcript }
      });
      
      steps.push({
        step: 2,
        name: 'Generate Report dengan Gemini',
        description: 'AI membaca transcript dan membuat laporan investigasi lengkap',
        timestamp: step2Start,
        duration: Date.now() - step2Start,
        details: {
          model: 'gemini-2.0-flash',
          temperature: 0.3,
          maxTokens: 8000,
          transcriptLength: transcript.length,
          explanation: '🤖 Gemini AI membaca seluruh transcript audio dan mengekstrak informasi penting untuk membuat laporan investigasi terstruktur dengan 5W+1H (What, Who, When, Where, Why, How).',
          error: error ? error.message : undefined
        },
        status: error ? 'error' : 'success'
      });

      if (error) throw error;

      if (!data?.report) {
        throw new Error('Tidak ada report yang dikembalikan dari AI');
      }

      // Step 3: Format and save report
      const step3Start = Date.now();
      setReportData(data.report);

      await saveReportToDatabase(data.report);
      
      steps.push({
        step: 3,
        name: 'Save to Database',
        description: 'Menyimpan laporan ke database',
        timestamp: step3Start,
        duration: Date.now() - step3Start,
        details: {
          reportLength: data.report.length,
          trackingId: trackingId || 'Generated',
          explanation: '💾 Laporan disimpan ke database dengan status DRAFT. Tracking ID akan di-generate otomatis untuk referensi.'
        },
        status: 'success'
      });

      // Set thinking process
      setThinkingProcess({
        steps: steps,
        totalDuration: Date.now() - startTime,
        summary: `Investigation report berhasil dibuat dari ${wordCount} kata transcript dalam ${Math.round((Date.now() - startTime) / 1000)} detik.`
      });

      toast({
        title: 'Laporan berhasil dibuat!',
        description: 'Report ID: ' + trackingId,
      });

    } catch (error: any) {
      console.error('Report generation error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Gagal generate report',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const saveReportToDatabase = async (reportContent: string) => {
    try {
      const { data, error } = await supabase
        .from('investigation_reports')
        .insert({
          audio_file_name: audioFileName,
          audio_duration_seconds: audioDuration,
          transcript: transcript,
          report_content: { text: reportContent },
          status: 'DRAFT',
        })
        .select('tracking_id')
        .single();

      if (error) throw error;

      if (data?.tracking_id) {
        setTrackingId(data.tracking_id);
      }
    } catch (error: any) {
      console.error('Save report error:', error);
      // Don't show error toast here as report is still displayed
    }
  };

  const downloadPDF = async () => {
    try {
      toast({
        title: 'Generating PDF...',
        description: 'Mohon tunggu sebentar',
      });

      // Dynamic imports for better performance
      const { jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas')).default;

      const reportElement = document.getElementById('investigation-report');
      if (!reportElement) {
        throw new Error('Report element tidak ditemukan');
      }

      const canvas = await html2canvas(reportElement, {
        scale: 2,
        logging: false,
        useCORS: true,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add more pages if content is longer than one page
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const fileName = trackingId 
        ? `investigation-report-${trackingId}.pdf` 
        : `investigation-report-${Date.now()}.pdf`;
      
      pdf.save(fileName);

      toast({
        title: 'PDF berhasil didownload!',
        description: fileName,
      });

    } catch (error: any) {
      console.error('PDF generation error:', error);
      toast({
        title: 'Error',
        description: 'Gagal generate PDF: ' + error.message,
        variant: 'destructive',
      });
    }
  };

  if (isGenerating) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Generating Investigation Report</h2>
          <p className="text-muted-foreground">
            AI sedang menganalisis transcript dan membuat laporan lengkap...
          </p>
        </div>

        <Card className="p-12">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
            <p className="text-lg font-semibold">Generating comprehensive report...</p>
            <p className="text-sm text-muted-foreground">Ini mungkin memakan waktu 30-60 detik</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Investigation Report</h2>
        {trackingId && (
          <p className="text-sm text-muted-foreground">Tracking ID: {trackingId}</p>
        )}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack}>
          Kembali
        </Button>
        <Button variant="outline" onClick={generateReport} disabled={isGenerating}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Regenerate
        </Button>
        <Button variant="outline" onClick={() => setIsEditing(!isEditing)}>
          <Edit className="mr-2 h-4 w-4" />
          {isEditing ? 'Preview' : 'Edit'}
        </Button>
        <Button onClick={downloadPDF} className="ml-auto">
          <Download className="mr-2 h-4 w-4" />
          Download PDF
        </Button>
      </div>

      {/* Thinking Process */}
      {thinkingProcess && (
        <div className="mb-6">
          <ThinkingProcessViewer 
            thinkingProcess={thinkingProcess} 
            compact 
          />
        </div>
      )}

      <Card className="p-8">
        {isEditing ? (
          <Textarea
            value={reportData}
            onChange={(e) => setReportData(e.target.value)}
            className="min-h-[600px] font-mono text-sm"
          />
        ) : (
          <div 
            id="investigation-report" 
            className="prose prose-sm max-w-none"
            style={{ 
              whiteSpace: 'pre-wrap',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              lineHeight: '1.6'
            }}
          >
            {reportData || 'No report generated yet.'}
          </div>
        )}
      </Card>
    </div>
  );
};

export default ReportGenerationStep;
