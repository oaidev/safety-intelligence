import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Download, Edit, Save, X, Copy, ChevronDown, ChevronRight, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Interface for structured report field (removed Sumber field)
export interface ReportField {
  Section: string;
  Field: string;
  Value: string;
  'Input Type': string;
  'Knowledge Investigator': string;
}

interface InvestigationReportDisplayProps {
  reportData: ReportField[] | string;
  reportFormat?: 'json' | 'text';
  reportRaw?: string;
  trackingId: string;
  onUpdate: (newReport: ReportField[] | string) => void;
}

// Updated section order with merged section
const sectionOrder = [
  'Informasi Karyawan',
  'Kejadian Kecelakaan / Berbahaya',
  'PEEPO Analysis',
  'Daftar Pertanyaan Layer Investigasi',
  'Root Cause Analysis',
  'Rekomendasi Tindakan',
];

export function InvestigationReportDisplay({
  reportData,
  reportFormat = 'text',
  reportRaw,
  trackingId,
  onUpdate,
}: InvestigationReportDisplayProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [editingField, setEditingField] = useState<{ section: string; fieldIndex: number } | null>(null);
  const [editValue, setEditValue] = useState('');
  const { toast } = useToast();

  // Group fields by section
  const sections = useMemo(() => {
    if (typeof reportData === 'string' || !Array.isArray(reportData)) {
      return {};
    }
    return reportData.reduce((acc, field) => {
      const section = field.Section || 'Lainnya';
      if (!acc[section]) acc[section] = [];
      acc[section].push(field);
      return acc;
    }, {} as Record<string, ReportField[]>);
  }, [reportData]);

  const sortedSections = useMemo(() => {
    const keys = Object.keys(sections);
    return keys.sort((a, b) => {
      const aIndex = sectionOrder.indexOf(a);
      const bIndex = sectionOrder.indexOf(b);
      if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
  }, [sections]);

  const isJsonFormat = reportFormat === 'json' && Array.isArray(reportData);

  // Initialize all sections as expanded
  useMemo(() => {
    if (sortedSections.length > 0 && Object.keys(expandedSections).length === 0) {
      const initial: Record<string, boolean> = {};
      sortedSections.forEach(s => initial[s] = true);
      setExpandedSections(initial);
    }
  }, [sortedSections]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Inline edit handlers
  const startEditField = (section: string, fieldIndex: number, currentValue: string) => {
    setEditingField({ section, fieldIndex });
    setEditValue(currentValue);
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue('');
  };

  const saveFieldEdit = () => {
    if (!editingField || !Array.isArray(reportData)) return;

    const sectionFields = sections[editingField.section];
    if (!sectionFields) return;

    const fieldToUpdate = sectionFields[editingField.fieldIndex];
    const updatedReport = [...reportData];
    const globalIndex = updatedReport.findIndex(
      f => f.Section === fieldToUpdate.Section && f.Field === fieldToUpdate.Field
    );

    if (globalIndex !== -1) {
      updatedReport[globalIndex] = {
        ...updatedReport[globalIndex],
        Value: editValue
      };
      onUpdate(updatedReport);
      toast({
        title: 'Perubahan disimpan',
        description: 'Field berhasil diperbarui',
      });
    }

    setEditingField(null);
    setEditValue('');
  };

  const copyToClipboard = () => {
    const content = reportRaw || (typeof reportData === 'string' ? reportData : JSON.stringify(reportData, null, 2));
    navigator.clipboard.writeText(content);
    toast({
      title: 'Disalin!',
      description: 'Laporan disalin ke clipboard',
    });
  };

  const exportToCSV = () => {
    try {
      if (!Array.isArray(reportData)) {
        // Export as text file
        const blob = new Blob([reportRaw || (typeof reportData === 'string' ? reportData : '')], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `investigation-report-${trackingId || Date.now()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return;
      }

      // CSV export (without Sumber field)
      const headers = ['Section', 'Field', 'Value', 'Input Type', 'Knowledge Investigator'];
      const csvRows = [
        headers.join(','),
        ...reportData.map(row => 
          headers.map(h => `"${(row[h as keyof ReportField] || '').toString().replace(/"/g, '""')}"`).join(',')
        )
      ];
      const content = csvRows.join('\n');

      const blob = new Blob([content], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `investigation-report-${trackingId || Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'File diunduh!',
        description: `investigation-report-${trackingId || Date.now()}.csv`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal mengekspor file',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <CardTitle>Laporan Investigasi</CardTitle>
            {isJsonFormat && (
              <Badge variant="secondary" className="text-xs">
                {(reportData as ReportField[]).length} fields
              </Badge>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={copyToClipboard}>
              <Copy className="h-4 w-4 mr-1" />
              Salin
            </Button>
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-1" />
              Export CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isJsonFormat ? (
          <div className="space-y-4">
            {sortedSections.map((sectionName) => (
              <Collapsible
                key={sectionName}
                open={expandedSections[sectionName] !== false}
                onOpenChange={() => toggleSection(sectionName)}
              >
                <Card className="border">
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {expandedSections[sectionName] !== false ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <CardTitle className="text-base">{sectionName}</CardTitle>
                          <Badge variant="outline" className="text-xs">
                            {sections[sectionName].length} field
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[180px]">Field</TableHead>
                            <TableHead>Value</TableHead>
                            <TableHead className="w-[280px]">Reason</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sections[sectionName].map((field, idx) => {
                            const isEditingThis = editingField?.section === sectionName && editingField?.fieldIndex === idx;
                            
                            return (
                              <TableRow key={idx}>
                                <TableCell className="font-medium align-top">
                                  {field.Field}
                                </TableCell>
                                <TableCell className="align-top">
                                  {isEditingThis ? (
                                    <div className="flex gap-2">
                                      <Textarea
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        className="min-h-[80px] flex-1"
                                        autoFocus
                                      />
                                      <div className="flex flex-col gap-1">
                                        <Button 
                                          size="icon" 
                                          variant="default"
                                          className="h-8 w-8"
                                          onClick={saveFieldEdit}
                                        >
                                          <Check className="h-4 w-4" />
                                        </Button>
                                        <Button 
                                          size="icon" 
                                          variant="outline"
                                          className="h-8 w-8"
                                          onClick={cancelEdit}
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="group flex items-start gap-2">
                                      <span className="whitespace-pre-wrap flex-1">
                                        {field.Value || '-'}
                                      </span>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                        onClick={() => startEditField(sectionName, idx, field.Value || '')}
                                      >
                                        <Edit className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell className="align-top text-sm text-muted-foreground">
                                  {field['Knowledge Investigator'] || '-'}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
          </div>
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
            {typeof reportData === 'string' ? reportData : JSON.stringify(reportData, null, 2)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
