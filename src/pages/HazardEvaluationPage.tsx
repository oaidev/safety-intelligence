import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { hazardReportService } from '@/lib/hazardReportService';
import { hiraRecommendationService } from '@/lib/hiraRecommendationService';
import { ComprehensiveRecommendationDisplay } from '@/components/ComprehensiveRecommendationDisplay';
import { SimilarReportsAnalysis } from '@/components/SimilarReportsAnalysis';
import { 
  ArrowLeft,
  Calendar as CalendarIcon,
  Sparkles,
  Save,
  Eye,
  AlertTriangle,
  MapPin,
  User,
  FileText,
  Zap,
  Target,
  Shield
} from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface HazardReport {
  id: string;
  tracking_id: string;
  reporter_name: string;
  reporter_position?: string;
  reporter_company?: string;
  location: string;
  site?: string;
  detail_location?: string;
  location_description?: string;
  area_pja_bc?: string;
  pja_mitra_kerja?: string;
  non_compliance: string;
  sub_non_compliance: string;
  quick_action: string;
  finding_description: string;
  image_base64?: string;
  status: string;
  created_at: string;
  kategori_temuan?: string;
  root_cause_analysis?: string;
  corrective_actions?: string;
  preventive_measures?: string;
  risk_level?: string;
  konfirmasi?: string;
  jenis_tindakan?: string;
  alur_permasalahan?: string;
  tindakan?: string;
  due_date_perbaikan?: string;
  similarity_cluster_id?: string;
  similar_reports?: any[];
  hazard_action_items?: any[];
}

interface ActionItem {
  jenis_tindakan: string;
  alur_permasalahan: string;
  tindakan: string;
  due_date: string;
  priority_level: string;
}

export default function HazardEvaluationPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [report, setReport] = useState<HazardReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingRecommendations, setGeneratingRecommendations] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [dueDate, setDueDate] = useState<Date>();
  const [comprehensiveRecommendations, setComprehensiveRecommendations] = useState<any>(null);
  const [showComprehensive, setShowComprehensive] = useState(false);

  const [evaluationData, setEvaluationData] = useState({
    kategori_temuan: '',
    root_cause_analysis: '',
    corrective_actions: '',
    preventive_measures: '',
    risk_level: '',
    konfirmasi: '',
    jenis_tindakan: '',
    alur_permasalahan: '',
    tindakan: '',
    due_date_perbaikan: ''
  });

  useEffect(() => {
    if (id) {
      loadHazardReport();
    }
  }, [id]);

  const loadHazardReport = async () => {
    try {
      setLoading(true);
      const reportData = await hazardReportService.getHazardReport(id!);
      setReport(reportData);
      
      // Populate evaluation form with existing data
      setEvaluationData({
        kategori_temuan: reportData.kategori_temuan || '',
        root_cause_analysis: reportData.root_cause_analysis || '',
        corrective_actions: reportData.corrective_actions || '',
        preventive_measures: reportData.preventive_measures || '',
        risk_level: reportData.risk_level || '',
        konfirmasi: reportData.konfirmasi || '',
        jenis_tindakan: reportData.jenis_tindakan || '',
        alur_permasalahan: reportData.alur_permasalahan || '',
        tindakan: reportData.tindakan || '',
        due_date_perbaikan: reportData.due_date_perbaikan || ''
      });

      if (reportData.due_date_perbaikan) {
        setDueDate(new Date(reportData.due_date_perbaikan));
      }
      
    } catch (error) {
      console.error('Error loading hazard report:', error);
      toast({
        title: 'Error',
        description: 'Failed to load hazard report',
        variant: 'destructive',
      });
      navigate('/evaluator');
    } finally {
      setLoading(false);
    }
  };

  const generateRecommendations = async () => {
    if (!report) return;
    
    try {
      setGeneratingRecommendations(true);
      const formatted = await hiraRecommendationService.getFormattedRecommendations(
        report.finding_description,
        report.location,
        report.non_compliance
      );

      setEvaluationData(prev => ({
        ...prev,
        alur_permasalahan: formatted.rootCauses,
        tindakan: formatted.correctiveActions
      }));

      toast({
        title: formatted.source === 'hira' ? 'HIRA Recommendation' : 'AI Recommendation',
        description: formatted.message,
      });
    } catch (error) {
      console.error('Error generating recommendations:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate recommendations',
        variant: 'destructive',
      });
    } finally {
      setGeneratingRecommendations(false);
    }
  };


  const saveEvaluation = async () => {
    if (!report) return;
    
    try {
      setSaving(true);
      
      // Determine the final status based on konfirmasi
      let finalStatus = 'COMPLETED';
      switch (evaluationData.konfirmasi) {
        case 'RUBAH TINDAKAN':
          finalStatus = 'IN_PROGRESS';
          break;
        case 'TUTUP LAPORAN':
          finalStatus = 'COMPLETED';
          break;
        case 'DUPLIKAT':
          finalStatus = 'DUPLIKAT';
          break;
        case 'BUKAN HAZARD':
          finalStatus = 'COMPLETED'; // Keep as COMPLETED since BUKAN_HAZARD might not be allowed
          break;
        default:
          finalStatus = 'COMPLETED';
      }
      
      // Only include fields that should be saved based on konfirmasi selection  
      const dataToSave: any = {
        kategori_temuan: evaluationData.kategori_temuan,
        konfirmasi: evaluationData.konfirmasi,
        status: finalStatus,
        evaluated_by: null // Set to null instead of string to avoid constraint issues
      };
      
      // Only include these fields if "RUBAH TINDAKAN" is selected
      if (evaluationData.konfirmasi === 'RUBAH TINDAKAN') {
        dataToSave.root_cause_analysis = evaluationData.alur_permasalahan;
        dataToSave.corrective_actions = evaluationData.tindakan;
        dataToSave.jenis_tindakan = evaluationData.jenis_tindakan;
        dataToSave.due_date_perbaikan = dueDate ? format(dueDate, 'yyyy-MM-dd') : null;
      }
      
      await hazardReportService.updateHazardEvaluation(report.id, dataToSave);

      toast({
        title: 'Evaluation Completed',
        description: 'Hazard evaluation has been completed successfully',
      });
      
      navigate('/evaluator');
    } catch (error) {
      console.error('Error saving evaluation:', error);
      toast({
        title: 'Error',
        description: `Failed to save evaluation: ${error.message || 'Unknown error'}`,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const addActionItem = async () => {
    // Remove this function as we're removing the action items section
  };
  
  const confirmEvaluation = async () => {
    // Remove this function as we're removing the confirmation section
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'PENDING_REVIEW': return 'destructive';
      case 'IN_PROGRESS': return 'default';
      case 'COMPLETED': return 'default';
      case 'DUPLIKAT': return 'secondary';
      case 'BUKAN_HAZARD': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING_REVIEW': return 'Menunggu Review';
      case 'IN_PROGRESS': return 'Dalam Proses';
      case 'COMPLETED': return 'Selesai';
      case 'DUPLIKAT': return 'Duplikat';
      case 'BUKAN_HAZARD': return 'Bukan Hazard';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading hazard report...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Report Not Found</h2>
            <p className="text-muted-foreground mb-4">The hazard report you're looking for could not be found.</p>
            <Button onClick={() => navigate('/evaluator')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/50 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate('/evaluator')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Kembali
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Detail Laporan</h1>
              <p className="text-muted-foreground">Evaluasi dan tindak lanjut hazard report</p>
            </div>
          </div>
          <Badge variant={getStatusBadgeVariant(report.status)} className="text-lg px-4 py-2">
            {getStatusLabel(report.status)}
          </Badge>
        </div>

        {/* Header Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Informasi Laporan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">ID Laporan</Label>
                <p className="font-mono text-lg">{report.tracking_id}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Tanggal Pembuatan</Label>
                <p>{format(new Date(report.created_at), 'EEEE, dd MMM yyyy HH:mm', { locale: idLocale })}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Perusahaan</Label>
                <p>{report.reporter_company || 'Tidak diisi'}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Pelapor</Label>
                <p className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {report.reporter_name}
                  {report.reporter_position && (
                    <span className="text-muted-foreground">- {report.reporter_position}</span>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Informasi Lokasi
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Site</Label>
                <p>{report.site || 'Tidak diisi'}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Lokasi</Label>
                <p>{report.location}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Detail Lokasi</Label>
                <p>{report.detail_location || 'Tidak diisi'}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Keterangan</Label>
                <p>{report.location_description || 'Tidak diisi'}</p>
              </div>
              <div className="grid grid-cols-1 gap-2">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Area PJA BC</Label>
                  <p>{report.area_pja_bc || 'Tidak diisi'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">PJA Mitra Kerja</Label>
                  <p>{report.pja_mitra_kerja || 'Tidak diisi'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Original Findings Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Deskripsi Objek
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Ketidaksesuaian</Label>
                <p className="font-medium">{report.non_compliance}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Sub Ketidaksesuaian</Label>
                <p>{report.sub_non_compliance}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Quick Action</Label>
                <p>{report.quick_action}</p>
              </div>
            </div>
            
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Deskripsi Temuan</Label>
              <p className="mt-2 p-4 bg-muted rounded-lg whitespace-pre-wrap">{report.finding_description}</p>
            </div>

            {/* Image Section */}
            {report.image_base64 && (
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Bukti Temuan</Label>
                <div className="mt-2">
                  <img 
                    src={report.image_base64.startsWith('data:') ? report.image_base64 : `data:image/jpeg;base64,${report.image_base64}`}
                    alt="Bukti temuan"
                    className="max-w-md rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setImageDialogOpen(true)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Klik untuk memperbesar</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Similarity Analysis */}
        <SimilarReportsAnalysis 
          currentReport={{
            id: report.id,
            tracking_id: report.tracking_id,
            reporter_name: report.reporter_name,
            location: report.location,
            non_compliance: report.non_compliance,
            sub_non_compliance: report.sub_non_compliance,
            finding_description: report.finding_description,
            status: report.status,
            created_at: report.created_at,
            similarity_cluster_id: report.similarity_cluster_id
          }}
          onSimilarReportsFound={(count) => console.log(`Found ${count} similar reports`)}
        />

        {/* Follow-up Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Pengendalian
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Konfirmasi</Label>
                <Select value={evaluationData.konfirmasi} onValueChange={(value) => setEvaluationData(prev => ({ ...prev, konfirmasi: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih konfirmasi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RUBAH TINDAKAN">RUBAH TINDAKAN</SelectItem>
                    <SelectItem value="TUTUP LAPORAN">TUTUP LAPORAN</SelectItem>
                    <SelectItem value="DUPLIKAT">DUPLIKAT</SelectItem>
                    <SelectItem value="BUKAN HAZARD">BUKAN HAZARD</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {evaluationData.konfirmasi === 'RUBAH TINDAKAN' && (
                <div>
                  <Label>Jenis Tindakan</Label>
                  <Select value="PERBAIKAN" onValueChange={(value) => setEvaluationData(prev => ({ ...prev, jenis_tindakan: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih jenis tindakan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PERBAIKAN">PERBAIKAN</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {evaluationData.konfirmasi === 'RUBAH TINDAKAN' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Akar Permasalahan
                  </Label>
                  <Button 
                    onClick={generateRecommendations}
                    disabled={generatingRecommendations}
                    className="w-full"
                  >
                    {generatingRecommendations ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate Recommendation
                      </>
                    )}
                  </Button>
                </div>
                <Textarea
                  value={evaluationData.alur_permasalahan}
                  onChange={(e) => setEvaluationData(prev => ({ ...prev, alur_permasalahan: e.target.value }))}
                  placeholder="Akar permasalahan akan dihasilkan dari knowledge base HIRA atau AI..."
                  rows={3}
                />
              </div>
            )}

            {evaluationData.konfirmasi === 'RUBAH TINDAKAN' && (
              <div className="space-y-4">
                <Label className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Tindakan Perbaikan
                </Label>
                <Textarea
                  value={evaluationData.tindakan}
                  onChange={(e) => setEvaluationData(prev => ({ ...prev, tindakan: e.target.value }))}
                  placeholder="Tindakan perbaikan akan dihasilkan dari knowledge base HIRA atau AI..."
                  rows={3}
                />
              </div>
            )}

            {evaluationData.konfirmasi === 'RUBAH TINDAKAN' && (
              <div>
                <Label>Due Date Perbaikan</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dueDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dueDate ? format(dueDate, "PPP", { locale: idLocale }) : <span>Pilih tanggal</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dueDate}
                      onSelect={(date) => {
                        setDueDate(date);
                        setEvaluationData(prev => ({ 
                          ...prev, 
                          due_date_perbaikan: date ? date.toISOString().split('T')[0] : '' 
                        }));
                      }}
                      disabled={(date) => date < new Date()}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            <Button onClick={saveEvaluation} disabled={saving} size="lg" className="w-full">
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Menyelesaikan...' : 'Selesaikan Evaluasi'}
            </Button>
          </CardContent>
        </Card>

        {/* Comprehensive Recommendations Display */}
        {showComprehensive && comprehensiveRecommendations && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Rekomendasi HIRA Komprehensif
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowComprehensive(false)}
                >
                  Tutup
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ComprehensiveRecommendationDisplay 
                recommendations={comprehensiveRecommendations}
                onCopyToForm={(section, content) => {
                  if (section === 'rootCause') {
                    setEvaluationData(prev => ({ ...prev, alur_permasalahan: content }));
                  } else if (section === 'action') {
                    setEvaluationData(prev => ({ ...prev, tindakan: content }));
                  }
                  toast({
                    title: 'Copied to Form',
                    description: 'Content has been copied to the form fields',
                  });
                }}
              />
            </CardContent>
          </Card>
        )}

        {/* Image Dialog */}
        <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Bukti Temuan</DialogTitle>
              <DialogDescription>
                Gambar bukti dari laporan hazard
              </DialogDescription>
            </DialogHeader>
            {report.image_base64 && (
              <div className="flex justify-center">
                <img 
                  src={report.image_base64.startsWith('data:') ? report.image_base64 : `data:image/jpeg;base64,${report.image_base64}`}
                  alt="Bukti temuan"
                  className="max-w-full max-h-[70vh] object-contain rounded-lg"
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
