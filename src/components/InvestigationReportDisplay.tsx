import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Download, Edit, Save, X, Copy, ChevronDown, ChevronRight, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// Alternating colors for sub-groups
const groupColors = [
  'bg-muted/40',
  'bg-blue-50/60 dark:bg-blue-950/30',
  'bg-green-50/60 dark:bg-green-950/30',
  'bg-amber-50/60 dark:bg-amber-950/30',
  'bg-purple-50/60 dark:bg-purple-950/30',
];

// Interface for structured report field - simple 4-column structure
export interface ReportField {
  Section: string;
  Field: string;
  Value: string;
  Reason: string;
}

interface InvestigationReportDisplayProps {
  reportData: ReportField[] | string;
  reportFormat?: 'json' | 'text';
  reportRaw?: string;
  trackingId: string;
  onUpdate: (newReport: ReportField[] | string) => void;
}

// Updated section order matching BeInvestigasi structure (7 sections)
const sectionOrder = [
  'Informasi Karyawan',
  'Fakta Kecelakaan / Kejadian Berbahaya',
  'Kejadian Singkat Kecelakaan / Kejadian Berbahaya',
  'PEEPO Analysis',
  'Daftar Pertanyaan Layer Investigasi',
  'Detail Layer & Pertanyaan',
  'Detail Tindakan Perbaikan',
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

  // Fallback: try to parse text as JSON if it looks like a JSON array
  const { parsedData, effectiveFormat } = useMemo(() => {
    if (reportFormat === 'json' && Array.isArray(reportData)) {
      return { parsedData: reportData as ReportField[], effectiveFormat: 'json' as const };
    }
    if (typeof reportData === 'string') {
      try {
        let jsonStr = reportData.trim();
        const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlockMatch) jsonStr = codeBlockMatch[1].trim();
        const arrayMatch = jsonStr.match(/\[[\s\S]*\]/);
        if (arrayMatch) jsonStr = arrayMatch[0];
        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].Section) {
          return { parsedData: parsed as ReportField[], effectiveFormat: 'json' as const };
        }
      } catch {}
    }
    return { parsedData: reportData, effectiveFormat: reportFormat };
  }, [reportData, reportFormat]);

  // Group fields by section, then by sub-groups within sections
  const sections = useMemo(() => {
    if (typeof parsedData === 'string' || !Array.isArray(parsedData)) {
      return {};
    }
    return parsedData.reduce((acc, field) => {
      const section = field.Section || 'Lainnya';
      if (!acc[section]) acc[section] = [];
      acc[section].push(field);
      return acc;
  }, {} as Record<string, ReportField[]>);
  }, [parsedData]);

  // Detect sub-groups within sections (e.g., Korban/Saksi in Informasi Karyawan)
  const getSubGroups = (sectionFields: ReportField[]): { label: string; fields: ReportField[] }[] => {
    const groups: { label: string; fields: ReportField[] }[] = [];
    let currentGroup: { label: string; fields: ReportField[] } | null = null;
    
    // Fields that indicate a new sub-group
    const groupMarkers = ['Kategori', 'Layer'];
    
    sectionFields.forEach((field) => {
      const isMarker = groupMarkers.some(marker => field.Field.includes(marker));
      
      if (isMarker && field.Value) {
        // Start a new group
        if (currentGroup) {
          groups.push(currentGroup);
        }
        currentGroup = { label: field.Value, fields: [field] };
      } else if (currentGroup) {
        currentGroup.fields.push(field);
      } else {
        // No group yet, create default
        if (groups.length === 0) {
          groups.push({ label: '', fields: [] });
        }
        groups[groups.length - 1].fields.push(field);
      }
    });
    
    if (currentGroup) {
      groups.push(currentGroup);
    }
    
    // If only one group with no label, return flat
    if (groups.length === 1 && !groups[0].label) {
      return [{ label: '', fields: sectionFields }];
    }
    
    return groups;
  };

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

  const isJsonFormat = effectiveFormat === 'json' && Array.isArray(parsedData);

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
    if (!editingField || !Array.isArray(parsedData)) return;

    const sectionFields = sections[editingField.section];
    if (!sectionFields) return;

    const fieldToUpdate = sectionFields[editingField.fieldIndex];
    const updatedReport = [...parsedData];
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
    const content = Array.isArray(parsedData) 
      ? JSON.stringify(parsedData, null, 2) 
      : (typeof parsedData === 'string' ? parsedData : JSON.stringify(parsedData, null, 2));
    navigator.clipboard.writeText(content);
    toast({
      title: 'Disalin!',
      description: 'Laporan disalin ke clipboard',
    });
  };

  const exportToCSV = () => {
    try {
      if (!Array.isArray(parsedData)) {
        // Export as text file
        const blob = new Blob([reportRaw || (typeof parsedData === 'string' ? parsedData : '')], { type: 'text/plain' });
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

      // CSV export - 4 columns only
      const headers = ['Section', 'Field', 'Value', 'Reason'];
      const csvRows = [
        headers.join(','),
        ...(parsedData as ReportField[]).map(row => 
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
                {(parsedData as ReportField[]).length} fields
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
                      {(() => {
                        const subGroups = getSubGroups(sections[sectionName]);
                        const hasMultipleGroups = subGroups.length > 1 || (subGroups.length === 1 && subGroups[0].label);
                        
                        return (
                          <div className="space-y-3">
                            {subGroups.map((group, groupIdx) => (
                              <div 
                                key={groupIdx}
                                className={cn(
                                  "rounded-lg overflow-hidden",
                                  hasMultipleGroups && groupColors[groupIdx % groupColors.length]
                                )}
                              >
                                {hasMultipleGroups && group.label && (
                                  <div className="flex items-center gap-2 px-3 py-2 border-b bg-background/50">
                                    <Badge variant="secondary" className="text-xs font-medium">
                                      {group.label === 'Korban' ? '👤' : group.label === 'Saksi' ? '👁' : group.label.includes('Layer') ? '🔍' : '📋'} {group.label}
                                    </Badge>
                                  </div>
                                )}
                                <Table>
                                  {groupIdx === 0 && (
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead className="w-[140px]">Field</TableHead>
                                        <TableHead className="w-[55%]">Value</TableHead>
                                        <TableHead className="w-[35%]">Reason</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                  )}
                                  <TableBody>
                                    {group.fields.map((field, idx) => {
                                      // Calculate global index for editing
                                      const globalIdx = sections[sectionName].findIndex(
                                        f => f.Field === field.Field && f.Value === field.Value
                                      );
                                      const isEditingThis = editingField?.section === sectionName && editingField?.fieldIndex === globalIdx;
                                      
                                      return (
                                        <TableRow key={idx} className={cn(hasMultipleGroups && "bg-transparent hover:bg-background/50")}>
                                          <TableCell className="font-medium align-top text-sm">
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
                                                <span className="whitespace-pre-wrap flex-1 text-sm">
                                                  {field.Value || '-'}
                                                </span>
                                                <Button
                                                  variant="ghost"
                                                  size="icon"
                                                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                                  onClick={() => startEditField(sectionName, globalIdx, field.Value || '')}
                                                >
                                                  <Edit className="h-3 w-3" />
                                                </Button>
                                              </div>
                                            )}
                                          </TableCell>
                                          <TableCell className="align-top text-xs text-muted-foreground">
                                            {field.Reason || '-'}
                                          </TableCell>
                                        </TableRow>
                                      );
                                    })}
                                  </TableBody>
                                </Table>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
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
            {typeof parsedData === 'string' ? parsedData : JSON.stringify(parsedData, null, 2)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
