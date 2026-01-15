import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Download, Edit, Save, X, FileJson, FileText, Copy, ChevronDown, ChevronRight, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Interface for structured report field
export interface ReportField {
  Section: string;
  Field: string;
  Value: string;
  'Input Type': string;
  'Knowledge Investigator': string;
  'Sumber / Link / Dokumen': string;
}

interface InvestigationReportDisplayProps {
  reportData: ReportField[] | string;
  reportFormat?: 'json' | 'text';
  reportRaw?: string;
  trackingId: string;
  onUpdate: (newReport: ReportField[] | string) => void;
}

// Input type badge color mapping
const inputTypeBadgeVariant = (type: string): 'default' | 'secondary' | 'outline' => {
  switch (type?.toLowerCase()) {
    case 'dropdown':
    case 'multi-select':
      return 'default';
    case 'text area':
      return 'secondary';
    default:
      return 'outline';
  }
};

export function InvestigationReportDisplay({
  reportData,
  reportFormat = 'text',
  reportRaw,
  trackingId,
  onUpdate,
}: InvestigationReportDisplayProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedReport, setEditedReport] = useState(
    typeof reportData === 'string' ? reportData : JSON.stringify(reportData, null, 2)
  );
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
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

  const sectionOrder = [
    'Informasi Karyawan',
    'Fakta Kecelakaan / Kejadian Berbahaya',
    'Kejadian Singkat Kecelakaan / Kejadian Berbahaya',
    'PEEPO Analysis',
    'Daftar Pertanyaan Layer Investigasi',
    'Root Cause Analysis',
    'Rekomendasi Tindakan',
  ];

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

  const handleSaveEdit = () => {
    try {
      if (isJsonFormat) {
        const parsed = JSON.parse(editedReport);
        onUpdate(parsed);
      } else {
        onUpdate(editedReport);
      }
      setIsEditing(false);
      toast({
        title: 'Perubahan disimpan',
        description: 'Laporan telah diperbarui',
      });
    } catch (e) {
      toast({
        title: 'Error',
        description: 'Format JSON tidak valid',
        variant: 'destructive',
      });
    }
  };

  const handleCancelEdit = () => {
    setEditedReport(
      typeof reportData === 'string' ? reportData : JSON.stringify(reportData, null, 2)
    );
    setIsEditing(false);
  };

  const copyToClipboard = (format: 'json' | 'text') => {
    const content = format === 'json' 
      ? JSON.stringify(reportData, null, 2) 
      : reportRaw || (typeof reportData === 'string' ? reportData : JSON.stringify(reportData, null, 2));
    
    navigator.clipboard.writeText(content);
    toast({
      title: 'Disalin!',
      description: `Format ${format.toUpperCase()} disalin ke clipboard`,
    });
  };

  const exportToFile = (format: 'json' | 'csv') => {
    try {
      let content: string;
      let mimeType: string;
      let extension: string;

      if (format === 'json') {
        content = JSON.stringify(reportData, null, 2);
        mimeType = 'application/json';
        extension = 'json';
      } else {
        // CSV export
        if (!Array.isArray(reportData)) {
          throw new Error('Data bukan format JSON');
        }
        const headers = ['Section', 'Field', 'Value', 'Input Type', 'Knowledge Investigator', 'Sumber / Link / Dokumen'];
        const csvRows = [
          headers.join(','),
          ...reportData.map(row => 
            headers.map(h => `"${(row[h as keyof ReportField] || '').toString().replace(/"/g, '""')}"`).join(',')
          )
        ];
        content = csvRows.join('\n');
        mimeType = 'text/csv';
        extension = 'csv';
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `investigation-report-${trackingId || Date.now()}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'File diunduh!',
        description: `investigation-report-${trackingId || Date.now()}.${extension}`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal mengekspor file',
        variant: 'destructive',
      });
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Initialize all sections as expanded
  useMemo(() => {
    if (sortedSections.length > 0 && Object.keys(expandedSections).length === 0) {
      const initial: Record<string, boolean> = {};
      sortedSections.forEach(s => initial[s] = true);
      setExpandedSections(initial);
    }
  }, [sortedSections]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <CardTitle>Laporan Investigasi</CardTitle>
            {isJsonFormat && (
              <Badge variant="secondary" className="text-xs">
                <FileJson className="h-3 w-3 mr-1" />
                {(reportData as ReportField[]).length} fields
              </Badge>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {isEditing ? (
              <>
                <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                  <X className="h-4 w-4 mr-1" />
                  Batal
                </Button>
                <Button size="sm" onClick={handleSaveEdit}>
                  <Save className="h-4 w-4 mr-1" />
                  Simpan
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                {isJsonFormat && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => copyToClipboard('json')}>
                      <Copy className="h-4 w-4 mr-1" />
                      Copy JSON
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => exportToFile('json')}>
                      <FileJson className="h-4 w-4 mr-1" />
                      Export JSON
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => exportToFile('csv')}>
                      <Download className="h-4 w-4 mr-1" />
                      Export CSV
                    </Button>
                  </>
                )}
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
        ) : isJsonFormat ? (
          <Tabs defaultValue="table" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="table">
                <FileText className="h-4 w-4 mr-1" />
                Tabel
              </TabsTrigger>
              <TabsTrigger value="json">
                <FileJson className="h-4 w-4 mr-1" />
                JSON
              </TabsTrigger>
            </TabsList>

            <TabsContent value="table" className="space-y-4">
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
                              <TableHead className="w-[100px]">Tipe</TableHead>
                              <TableHead className="w-[50px]">Info</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {sections[sectionName].map((field, idx) => (
                              <TableRow key={idx}>
                                <TableCell className="font-medium align-top">
                                  {field.Field}
                                </TableCell>
                                <TableCell className="whitespace-pre-wrap">
                                  {field.Value}
                                </TableCell>
                                <TableCell className="align-top">
                                  <Badge variant={inputTypeBadgeVariant(field['Input Type'])}>
                                    {field['Input Type']}
                                  </Badge>
                                </TableCell>
                                <TableCell className="align-top">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-6 w-6">
                                          <Info className="h-4 w-4 text-muted-foreground" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent side="left" className="max-w-sm">
                                        <div className="space-y-2">
                                          <div>
                                            <p className="font-semibold text-xs">Knowledge Investigator:</p>
                                            <p className="text-xs text-muted-foreground">
                                              {field['Knowledge Investigator'] || '-'}
                                            </p>
                                          </div>
                                          <div>
                                            <p className="font-semibold text-xs">Sumber:</p>
                                            <p className="text-xs text-muted-foreground">
                                              {field['Sumber / Link / Dokumen'] || '-'}
                                            </p>
                                          </div>
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              ))}
            </TabsContent>

            <TabsContent value="json">
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard('json')}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </Button>
                <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-[600px] text-sm font-mono">
                  {JSON.stringify(reportData, null, 2)}
                </pre>
              </div>
            </TabsContent>
          </Tabs>
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
