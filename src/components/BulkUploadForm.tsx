import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Upload, FileSpreadsheet, Download, AlertCircle, CheckCircle, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import Papa from 'papaparse';
import { optimizedRagService } from '@/lib/optimizedRagService';

interface BulkImportJob {
  id: string;
  kb_id: string;
  kb_name: string;
  status: string;
  total_rows: number;
  processed_rows: number;
  failed_rows: number;
  operation_type: string;
  created_at: string;
}

interface ProcessingStatus {
  stage: 'parsing' | 'generating' | 'saving' | 'completed' | 'error';
  totalRows: number;
  processedRows: number;
  failedRows: number;
  currentBatch: number;
  totalBatches: number;
  errors: string[];
}

export function BulkUploadForm() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [kbId, setKbId] = useState('');
  const [kbName, setKbName] = useState('');
  const [operationType, setOperationType] = useState<'create' | 'replace' | 'append'>('create');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus | null>(null);
  const [currentJob, setCurrentJob] = useState<BulkImportJob | null>(null);
  const [isCancelled, setIsCancelled] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const BATCH_SIZE = 100; // Process 100 rows per batch

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'text/csv',
        'application/csv'
      ];
      
      if (!validTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please select an Excel (.xlsx) or CSV file",
          variant: "destructive"
        });
        return;
      }

      setSelectedFile(file);
    }
  };

  const parseCSVFile = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            reject(new Error(`CSV parsing errors: ${results.errors.map(e => e.message).join(', ')}`));
          } else {
            resolve(results.data);
          }
        },
        error: (error) => reject(error)
      });
    });
  };

  const handleUpload = async () => {
    if (!selectedFile || !kbId || !kbName) {
      toast({
        title: "Missing information",
        description: "Please fill all required fields and select a file",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setIsCancelled(false);
    
    try {
      // Stage 1: Parse file
      setProcessingStatus({
        stage: 'parsing',
        totalRows: 0,
        processedRows: 0,
        failedRows: 0,
        currentBatch: 0,
        totalBatches: 0,
        errors: []
      });

      const rows = await parseCSVFile(selectedFile);
      
      if (rows.length === 0) {
        throw new Error('No data found in file');
      }

      // Validate required columns
      const firstRow = rows[0];
      if (!firstRow.chunk_text || !firstRow.chunk_index) {
        throw new Error('Missing required columns: chunk_text and chunk_index');
      }

      const totalBatches = Math.ceil(rows.length / BATCH_SIZE);
      
      setProcessingStatus(prev => prev ? {
        ...prev,
        stage: 'generating',
        totalRows: rows.length,
        totalBatches
      } : null);

      // Stage 2: Clear existing data if replacing
      if (operationType === 'replace') {
        const { error: deleteError } = await supabase
          .from('knowledge_base_chunks')
          .delete()
          .eq('knowledge_base_id', kbId);
        
        if (deleteError) throw deleteError;
      }

      // Stage 3: Process in batches
      await optimizedRagService.initialize();
      
      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        if (isCancelled) break;

        const startIdx = batchIndex * BATCH_SIZE;
        const endIdx = Math.min(startIdx + BATCH_SIZE, rows.length);
        const batch = rows.slice(startIdx, endIdx);

        setProcessingStatus(prev => prev ? {
          ...prev,
          currentBatch: batchIndex + 1,
          stage: 'generating'
        } : null);

        // Generate embeddings for batch
        const chunksWithEmbeddings = [];
        const batchErrors: string[] = [];

        for (let i = 0; i < batch.length; i++) {
          if (isCancelled) break;

          const row = batch[i];
          try {
            const embedding = await optimizedRagService.generateEmbedding(row.chunk_text);
            
            chunksWithEmbeddings.push({
              knowledge_base_id: kbId,
              chunk_text: row.chunk_text,
              client_embedding: `[${embedding.join(',')}]`,
              chunk_index: parseInt(row.chunk_index) || startIdx + i,
              embedding_provider: 'client-side'
            });

            setProcessingStatus(prev => prev ? {
              ...prev,
              processedRows: startIdx + i + 1
            } : null);

          } catch (error) {
            const errorMsg = `Row ${startIdx + i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`;
            batchErrors.push(errorMsg);
            
            setProcessingStatus(prev => prev ? {
              ...prev,
              failedRows: prev.failedRows + 1,
              errors: [...prev.errors, errorMsg]
            } : null);
          }
        }

        if (isCancelled) break;

        // Stage 4: Save batch to database
        setProcessingStatus(prev => prev ? {
          ...prev,
          stage: 'saving'
        } : null);

        if (chunksWithEmbeddings.length > 0) {
          const { error: insertError } = await supabase
            .from('knowledge_base_chunks')
            .insert(chunksWithEmbeddings);

          if (insertError) {
            throw new Error(`Database insert error: ${insertError.message}`);
          }
        }
      }

      if (!isCancelled) {
        // Create knowledge base record if it doesn't exist
        const { error: kbError } = await supabase
          .from('knowledge_bases')
          .upsert({
            id: kbId,
            name: kbName,
            description: `Bulk imported from ${selectedFile.name}`,
            color: '#3B82F6',
            prompt_template: 'Analyze the hazard based on the following context: {context}'
          });

        if (kbError && !kbError.message.includes('duplicate key')) {
          console.warn('Knowledge base creation error (non-critical):', kbError);
        }

        setProcessingStatus(prev => prev ? {
          ...prev,
          stage: 'completed'
        } : null);

        toast({
          title: "Import completed",
          description: `Successfully processed ${processingStatus?.processedRows || 0} rows${processingStatus?.failedRows ? ` (${processingStatus.failedRows} failed)` : ''}`
        });
      }

    } catch (error) {
      console.error('Bulk import error:', error);
      setProcessingStatus(prev => prev ? {
        ...prev,
        stage: 'error',
        errors: [...prev.errors, error instanceof Error ? error.message : 'Unknown error']
      } : null);
      
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    setIsCancelled(true);
    setIsProcessing(false);
    setProcessingStatus(null);
    toast({
      title: "Import cancelled",
      description: "The bulk import process has been cancelled"
    });
  };

  const downloadSampleFile = () => {
    const csvContent = `chunk_text,chunk_index
"Sample hazard description 1",1
"Sample hazard description 2",2
"Sample hazard description 3",3`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'sample_knowledge_base.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Instructions Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-success" />
            File Format Requirements
          </CardTitle>
          <CardDescription>
            Your Excel/CSV file should contain the following columns:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="bg-muted/30 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Required Columns:</h4>
              <ul className="space-y-1 text-sm">
                <li><strong>chunk_text</strong> - The knowledge content (text, rules, procedures)</li>
                <li><strong>chunk_index</strong> - Sequential number (1, 2, 3, etc.)</li>
              </ul>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={downloadSampleFile}>
                <Download className="h-4 w-4 mr-2" />
                Download Sample CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Form */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Knowledge Base Data</CardTitle>
          <CardDescription>
            Upload up to 50,000 rows. Uses offline AI embeddings - no API costs or rate limits!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="kb-id">Knowledge Base ID*</Label>
              <Input
                id="kb-id"
                placeholder="e.g., safety_procedures"
                value={kbId}
                onChange={(e) => setKbId(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="kb-name">Knowledge Base Name*</Label>
              <Input
                id="kb-name"
                placeholder="e.g., Safety Procedures Manual"
                value={kbName}
                onChange={(e) => setKbName(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label>Operation Type</Label>
              <Select value={operationType} onValueChange={(value: 'create' | 'replace' | 'append') => setOperationType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="create">Create New Knowledge Base</SelectItem>
                  <SelectItem value="replace">Replace Existing Knowledge Base</SelectItem>
                  <SelectItem value="append">Add to Existing Knowledge Base</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="file">Upload File*</Label>
              <div className="flex items-center gap-4">
                <Input
                  id="file"
                  type="file"
                  accept=".xlsx,.csv"
                  onChange={handleFileSelect}
                  ref={fileInputRef}
                />
                {selectedFile && (
                  <Badge variant="outline">
                    {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleUpload} 
                disabled={isProcessing || !selectedFile || !kbId || !kbName}
                className="flex-1"
              >
                <Upload className="h-4 w-4 mr-2" />
                {isProcessing ? 'Processing...' : 'Start Bulk Import'}
              </Button>
              
              {isProcessing && (
                <Button 
                  onClick={handleCancel} 
                  variant="outline"
                  className="px-3"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress Card */}
      {processingStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {processingStatus.stage === 'completed' && <CheckCircle className="h-5 w-5 text-success" />}
              {processingStatus.stage === 'error' && <AlertCircle className="h-5 w-5 text-destructive" />}
              {processingStatus.stage !== 'completed' && processingStatus.stage !== 'error' && (
                <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              )}
              Offline Processing: {kbName}
            </CardTitle>
            <CardDescription className="space-y-1">
              <div>Stage: <Badge variant="outline" className="ml-2">
                {processingStatus.stage === 'parsing' && 'Parsing File'}
                {processingStatus.stage === 'generating' && 'Generating Embeddings'}
                {processingStatus.stage === 'saving' && 'Saving to Database'}
                {processingStatus.stage === 'completed' && 'Completed'}
                {processingStatus.stage === 'error' && 'Error'}
              </Badge></div>
              {processingStatus.totalBatches > 0 && (
                <div>Batch: {processingStatus.currentBatch}/{processingStatus.totalBatches}</div>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress: {processingStatus.processedRows}/{processingStatus.totalRows} rows</span>
                <span>
                  {processingStatus.totalRows > 0 
                    ? Math.round((processingStatus.processedRows / processingStatus.totalRows) * 100)
                    : 0
                  }%
                </span>
              </div>
              <Progress 
                value={processingStatus.totalRows > 0 
                  ? (processingStatus.processedRows / processingStatus.totalRows) * 100 
                  : 0
                } 
              />
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="font-semibold text-success">{processingStatus.processedRows}</div>
                <div className="text-muted-foreground">Processed</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-destructive">{processingStatus.failedRows}</div>
                <div className="text-muted-foreground">Failed</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-muted-foreground">
                  {processingStatus.totalRows - processingStatus.processedRows - processingStatus.failedRows}
                </div>
                <div className="text-muted-foreground">Remaining</div>
              </div>
            </div>

            {processingStatus.errors.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-destructive">
                  Errors ({processingStatus.errors.length}):
                </div>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {processingStatus.errors.slice(-5).map((error, index) => (
                    <div key={index} className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                      {error}
                    </div>
                  ))}
                  {processingStatus.errors.length > 5 && (
                    <div className="text-xs text-muted-foreground text-center">
                      ... and {processingStatus.errors.length - 5} more errors
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}