import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Download, Edit, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface InvestigationReportDisplayProps {
  reportData: string;
  trackingId: string;
  onUpdate: (newReport: string) => void;
}

export function InvestigationReportDisplay({
  reportData,
  trackingId,
  onUpdate,
}: InvestigationReportDisplayProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedReport, setEditedReport] = useState(reportData);
  const { toast } = useToast();

  const handleSaveEdit = () => {
    onUpdate(editedReport);
    setIsEditing(false);
    toast({
      title: 'Changes saved',
      description: 'Report has been updated',
    });
  };

  const handleCancelEdit = () => {
    setEditedReport(reportData);
    setIsEditing(false);
  };

  const downloadPDF = async () => {
    try {
      toast({
        title: 'Generating PDF...',
        description: 'Please wait',
      });

      const { jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas')).default;

      const reportElement = document.getElementById('investigation-report');
      if (!reportElement) throw new Error('Report element not found');

      const canvas = await html2canvas(reportElement, {
        scale: 2,
        logging: false,
        useCORS: true,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

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
        title: 'PDF downloaded!',
        description: fileName,
      });

    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to generate PDF: ' + error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Investigation Report</CardTitle>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveEdit}>
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                {/* Temporarily hidden - Export PDF functionality */}
                {/* <Button size="sm" onClick={downloadPDF}>
                  <Download className="h-4 w-4 mr-1" />
                  Export PDF
                </Button> */}
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <Textarea
            value={editedReport}
            onChange={(e) => setEditedReport(e.target.value)}
            className="min-h-[700px] font-mono text-sm"
          />
        ) : (
          <div
            id="investigation-report"
            className="prose prose-sm max-w-none dark:prose-invert"
            style={{
              whiteSpace: 'pre-wrap',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              lineHeight: '1.6',
            }}
          >
            {reportData}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
