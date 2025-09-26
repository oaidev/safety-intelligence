import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Upload, FileSpreadsheet, Download, AlertCircle, CheckCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

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

export function BulkUploadForm() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [kbId, setKbId] = useState('');
  const [kbName, setKbName] = useState('');
  const [operationType, setOperationType] = useState<'create' | 'replace' | 'append'>('create');
  const [isUploading, setIsUploading] = useState(false);
  const [currentJob, setCurrentJob] = useState<BulkImportJob | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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

  const handleUpload = async () => {
    if (!selectedFile || !kbId || !kbName) {
      toast({
        title: "Missing information",
        description: "Please fill all required fields and select a file",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('kb_id', kbId);
      formData.append('kb_name', kbName);
      formData.append('operation_type', operationType);

      // Call edge function
      const { data, error } = await supabase.functions.invoke('bulk-import-knowledge-base', {
        body: formData
      });

      if (error) throw error;

      setCurrentJob(data.job);
      toast({
        title: "Upload started",
        description: `Processing ${selectedFile.name} in the background`
      });

      // Start polling for progress
      pollJobProgress(data.job.id);

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "Failed to start the bulk import process",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const pollJobProgress = (jobId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from('bulk_import_jobs')
          .select('*')
          .eq('id', jobId)
          .single();

        if (error) throw error;

        setCurrentJob(data);

        if (data.status === 'completed' || data.status === 'failed') {
          clearInterval(pollInterval);
          toast({
            title: data.status === 'completed' ? "Import completed" : "Import failed",
            description: data.status === 'completed' 
              ? `Successfully processed ${data.processed_rows}/${data.total_rows} rows`
              : `Failed to process ${data.failed_rows} rows`,
            variant: data.status === 'completed' ? 'default' : 'destructive'
          });
        }
      } catch (error) {
        console.error('Error polling job progress:', error);
        clearInterval(pollInterval);
      }
    }, 2000);
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
            Upload up to 18,000 rows. Processing time: ~30-60 minutes for large files.
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

            <Button 
              onClick={handleUpload} 
              disabled={isUploading || !selectedFile || !kbId || !kbName}
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              {isUploading ? 'Starting Upload...' : 'Start Bulk Import'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Progress Card */}
      {currentJob && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {currentJob.status === 'completed' && <CheckCircle className="h-5 w-5 text-success" />}
              {currentJob.status === 'failed' && <AlertCircle className="h-5 w-5 text-destructive" />}
              {currentJob.status === 'processing' && <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />}
              Import Progress: {currentJob.kb_name}
            </CardTitle>
            <CardDescription>
              Status: <Badge variant={currentJob.status === 'completed' ? 'default' : currentJob.status === 'failed' ? 'destructive' : 'secondary'}>
                {currentJob.status}
              </Badge>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress: {currentJob.processed_rows}/{currentJob.total_rows} rows</span>
                <span>{Math.round((currentJob.processed_rows / currentJob.total_rows) * 100)}%</span>
              </div>
              <Progress value={(currentJob.processed_rows / currentJob.total_rows) * 100} />
            </div>
            
            {currentJob.failed_rows > 0 && (
              <div className="text-sm text-destructive">
                {currentJob.failed_rows} rows failed to process
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}