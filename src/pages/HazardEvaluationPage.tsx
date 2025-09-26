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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { hazardReportService } from '@/lib/hazardReportService';
import { aiRecommendationService } from '@/lib/aiRecommendationService';
import { 
  ArrowLeft,
  Calendar as CalendarIcon,
  Sparkles,
  Save,
  Plus,
  Eye,
  CheckCircle,
  Clock,
  AlertTriangle,
  MapPin,
  Building,
  User,
  FileText,
  Zap,
  Target,
  Shield,
  Lightbulb
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
  const [newActionItem, setNewActionItem] = useState<ActionItem>({
    jenis_tindakan: '',
    alur_permasalahan: '',
    tindakan: '',
    due_date: '',
    priority_level: 'MEDIUM'
  });

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

  const generateRootCauseRecommendations = async () => {
    if (!report) return;
    
    try {
      setGeneratingRecommendations(true);
      const recommendations = await aiRecommendationService.generateRootCauseAnalysis({
        deskripsi_temuan: report.finding_description,
        lokasi: report.location,
        ketidaksesuaian: report.non_compliance,
        sub_ketidaksesuaian: report.sub_non_compliance,
        quick_action: report.quick_action,
        image_base64: report.image_base64
      });

      setEvaluationData(prev => ({
        ...prev,
        root_cause_analysis: recommendations
      }));

      toast({
        title: 'AI Recommendation Generated',
        description: 'Root cause analysis has been generated successfully',
      });
    } catch (error) {
      console.error('Error generating recommendations:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate AI recommendations',
        variant: 'destructive',
      });
    } finally {
      setGeneratingRecommendations(false);
    }
  };

  const generateActionPlan = async () => {
    if (!report) return;
    
    try {
      setGeneratingRecommendations(true);
      const actionPlan = await aiRecommendationService.generateCorrectiveActions({
        deskripsi_temuan: report.finding_description,
        lokasi: report.location,
        ketidaksesuaian: report.non_compliance,
        sub_ketidaksesuaian: report.sub_non_compliance,
        quick_action: report.quick_action,
        image_base64: report.image_base64
      });

      setEvaluationData(prev => ({
        ...prev,
        corrective_actions: actionPlan.corrective_actions,
        preventive_measures: actionPlan.preventive_measures,
        jenis_tindakan: actionPlan.jenis_tindakan,
        tindakan: actionPlan.tindakan,
        alur_permasalahan: `Berdasarkan analisis AI: ${report.non_compliance} dapat menyebabkan risiko keselamatan kerja`
      }));

      // Suggest due date based on risk level
      const suggestedDate = new Date();
      suggestedDate.setDate(suggestedDate.getDate() + actionPlan.due_date_suggestion);
      setDueDate(suggestedDate);
      setEvaluationData(prev => ({
        ...prev,
        due_date_perbaikan: suggestedDate.toISOString().split('T')[0]
      }));

      toast({
        title: 'Action Plan Generated',
        description: 'Corrective actions and timeline have been generated',
      });
    } catch (error) {
      console.error('Error generating action plan:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate action plan',
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
      await hazardReportService.updateHazardEvaluation(report.id, {
        ...evaluationData,
        status: 'UNDER_EVALUATION',
        evaluated_by: 'current-evaluator' // In a real app, this would be the current user ID
      });

      toast({
        title: 'Evaluation Saved',
        description: 'Hazard evaluation has been saved successfully',
      });
      
      // Reload report to get updated data
      await loadHazardReport();
    } catch (error) {
      console.error('Error saving evaluation:', error);
      toast({
        title: 'Error',
        description: 'Failed to save evaluation',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const addActionItem = async () => {
    if (!report || !newActionItem.jenis_tindakan || !newActionItem.tindakan || !newActionItem.due_date) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      await hazardReportService.addActionItem(report.id, newActionItem);
      
      // Reset form
      setNewActionItem({
        jenis_tindakan: '',
        alur_permasalahan: '',
        tindakan: '',
        due_date: '',
        priority_level: 'MEDIUM'
      });

      toast({
        title: 'Action Item Added',
        description: 'New action item has been added successfully',
      });
      
      // Reload report
      await loadHazardReport();
    } catch (error) {
      console.error('Error adding action item:', error);
      toast({
        title: 'Error',
        description: 'Failed to add action item',
        variant: 'destructive',
      });
    }
  };

  const confirmEvaluation = async () => {
    if (!report) return;
    
    try {
      setSaving(true);
      await hazardReportService.updateHazardEvaluation(report.id, {
        ...evaluationData,
        status: 'IN_PROGRESS'
      });

      toast({
        title: 'Evaluation Confirmed',
        description: 'Hazard evaluation has been confirmed and moved to In Progress',
      });
      
      navigate('/evaluator');
    } catch (error) {
      console.error('Error confirming evaluation:', error);
      toast({
        title: 'Error',
        description: 'Failed to confirm evaluation',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'PENDING_REVIEW': return 'destructive';
      case 'UNDER_EVALUATION': return 'secondary';
      case 'IN_PROGRESS': return 'default';
      case 'COMPLETED': return 'default';
      default: return 'outline';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING_REVIEW': return 'Menunggu Review';
      case 'UNDER_EVALUATION': return 'Sedang Evaluasi';
      case 'IN_PROGRESS': return 'Dalam Proses';
      case 'COMPLETED': return 'Selesai';
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

        {/* Similar Reports Warning */}
        {report.similar_reports && report.similar_reports.length > 0 && (
          <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
                <AlertTriangle className="h-5 w-5" />
                Laporan Serupa Ditemukan ({report.similar_reports.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {report.similar_reports.map((similar: any) => (
                  <div key={similar.id} className="flex items-center justify-between p-3 border border-orange-200 rounded-lg">
                    <div>
                      <p className="font-medium">{similar.tracking_id}</p>
                      <p className="text-sm text-muted-foreground">{similar.location} - {format(new Date(similar.created_at), 'dd MMM yyyy', { locale: idLocale })}</p>
                    </div>
                    <Badge variant="outline">Serupa</Badge>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                <p className="text-sm text-orange-800 dark:text-orange-200">
                  <strong>Perhatian:</strong> Terdapat laporan serupa yang menunjukkan pola berulang. Pertimbangkan untuk mengidentifikasi akar masalah sistemik.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI-Powered Evaluation Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              Evaluasi & Rekomendasi AI
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Kategori Temuan */}
            <div>
              <Label htmlFor="kategori_temuan">Kategori Temuan</Label>
              <Select value={evaluationData.kategori_temuan} onValueChange={(value) => setEvaluationData(prev => ({ ...prev, kategori_temuan: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kategori temuan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Kondisi Tidak Aman">Kondisi Tidak Aman</SelectItem>
                  <SelectItem value="Tindakan Tidak Aman">Tindakan Tidak Aman</SelectItem>
                  <SelectItem value="Near Miss">Near Miss</SelectItem>
                  <SelectItem value="Environmental Issue">Environmental Issue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Root Cause Analysis Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Akar Permasalahan
                </Label>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={generateRootCauseRecommendations}
                  disabled={generatingRecommendations}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  {generatingRecommendations ? 'Generating...' : 'Generate Recommendation'}
                </Button>
              </div>
              <Textarea
                value={evaluationData.root_cause_analysis}
                onChange={(e) => setEvaluationData(prev => ({ ...prev, root_cause_analysis: e.target.value }))}
                placeholder="Analisis akar masalah akan dihasilkan oleh AI atau dapat diisi manual..."
                rows={4}
              />
            </div>

            {/* Corrective Actions Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Tindakan Perbaikan
                </Label>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={generateActionPlan}
                  disabled={generatingRecommendations}
                >
                  <Lightbulb className="h-4 w-4 mr-2" />
                  {generatingRecommendations ? 'Generating...' : 'Generate Action Plan'}
                </Button>
              </div>
              <Textarea
                value={evaluationData.corrective_actions}
                onChange={(e) => setEvaluationData(prev => ({ ...prev, corrective_actions: e.target.value }))}
                placeholder="Tindakan perbaikan akan dihasilkan oleh AI..."
                rows={3}
              />
            </div>

            {/* Preventive Measures */}
            <div>
              <Label>Langkah Pencegahan</Label>
              <Textarea
                value={evaluationData.preventive_measures}
                onChange={(e) => setEvaluationData(prev => ({ ...prev, preventive_measures: e.target.value }))}
                placeholder="Langkah pencegahan untuk mencegah kejadian serupa..."
                rows={3}
              />
            </div>

            {/* Risk Level */}
            <div>
              <Label>Tingkat Risiko</Label>
              <Select value={evaluationData.risk_level} onValueChange={(value) => setEvaluationData(prev => ({ ...prev, risk_level: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih tingkat risiko" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HIGH">High - Risiko Tinggi</SelectItem>
                  <SelectItem value="MEDIUM">Medium - Risiko Sedang</SelectItem>
                  <SelectItem value="LOW">Low - Risiko Rendah</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

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
                    <SelectItem value="TERIMA TINDAKAN">TERIMA TINDAKAN</SelectItem>
                    <SelectItem value="PERLU REVIEW">PERLU REVIEW</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Jenis Tindakan</Label>
                <Select value={evaluationData.jenis_tindakan} onValueChange={(value) => setEvaluationData(prev => ({ ...prev, jenis_tindakan: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih jenis tindakan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERBAIKAN">PERBAIKAN</SelectItem>
                    <SelectItem value="PELATIHAN">PELATIHAN</SelectItem>
                    <SelectItem value="INVESTIGASI">INVESTIGASI</SelectItem>
                    <SelectItem value="MONITORING">MONITORING</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Alur Permasalahan</Label>
              <Textarea
                value={evaluationData.alur_permasalahan}
                onChange={(e) => setEvaluationData(prev => ({ ...prev, alur_permasalahan: e.target.value }))}
                placeholder="Jelaskan alur bagaimana masalah ini dapat berkembang..."
                rows={3}
              />
            </div>

            <div>
              <Label>Tindakan</Label>
              <Textarea
                value={evaluationData.tindakan}
                onChange={(e) => setEvaluationData(prev => ({ ...prev, tindakan: e.target.value }))}
                placeholder="Tindakan spesifik yang akan dilakukan..."
                rows={3}
              />
            </div>

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

            <Button onClick={saveEvaluation} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Menyimpan...' : 'Simpan Evaluasi'}
            </Button>
          </CardContent>
        </Card>

        {/* Action Tracking Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Alasan Penindakan
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Existing Action Items */}
            {report.hazard_action_items && report.hazard_action_items.length > 0 && (
              <div className="mb-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Jenis Tindakan</TableHead>
                      <TableHead>Alur Permasalahan</TableHead>
                      <TableHead>Tindakan</TableHead>
                      <TableHead>Due Date Perbaikan</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.hazard_action_items.map((action: any) => (
                      <TableRow key={action.id}>
                        <TableCell>
                          <Badge variant="outline">{action.jenis_tindakan}</Badge>
                        </TableCell>
                        <TableCell>{action.alur_permasalahan}</TableCell>
                        <TableCell>{action.tindakan}</TableCell>
                        <TableCell>
                          {format(new Date(action.due_date), 'dd MMM yyyy', { locale: idLocale })}
                        </TableCell>
                        <TableCell>
                          <Badge variant={action.status === 'COMPLETED' ? 'default' : 'secondary'}>
                            {action.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Add New Action Item */}
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <h4 className="font-medium flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Tambah Tindakan Baru
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Jenis Tindakan</Label>
                  <Select value={newActionItem.jenis_tindakan} onValueChange={(value) => setNewActionItem(prev => ({ ...prev, jenis_tindakan: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih jenis tindakan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PERBAIKAN">PERBAIKAN</SelectItem>
                      <SelectItem value="PELATIHAN">PELATIHAN</SelectItem>
                      <SelectItem value="INVESTIGASI">INVESTIGASI</SelectItem>
                      <SelectItem value="MONITORING">MONITORING</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Priority Level</Label>
                  <Select value={newActionItem.priority_level} onValueChange={(value) => setNewActionItem(prev => ({ ...prev, priority_level: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih prioritas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="LOW">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Alur Permasalahan</Label>
                <Textarea
                  value={newActionItem.alur_permasalahan}
                  onChange={(e) => setNewActionItem(prev => ({ ...prev, alur_permasalahan: e.target.value }))}
                  placeholder="Jelaskan alur permasalahan..."
                  rows={2}
                />
              </div>

              <div>
                <Label>Tindakan</Label>
                <Textarea
                  value={newActionItem.tindakan}
                  onChange={(e) => setNewActionItem(prev => ({ ...prev, tindakan: e.target.value }))}
                  placeholder="Tindakan yang akan dilakukan..."
                  rows={2}
                />
              </div>

              <div>
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={newActionItem.due_date}
                  onChange={(e) => setNewActionItem(prev => ({ ...prev, due_date: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <Button onClick={addActionItem} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Tambah Tindakan
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Final Confirmation */}
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/10">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
              <div>
                <h3 className="text-lg font-semibold text-green-800 dark:text-green-400">Konfirmasi Evaluasi</h3>
                <p className="text-green-700 dark:text-green-300">
                  Setelah semua evaluasi dan tindakan selesai diisi, konfirmasi untuk melanjutkan ke tahap implementasi.
                </p>
              </div>
              <Button 
                size="lg" 
                className="bg-green-600 hover:bg-green-700 text-white px-8"
                onClick={confirmEvaluation}
                disabled={saving}
              >
                <CheckCircle className="h-5 w-5 mr-2" />
                {saving ? 'Processing...' : 'Konfirmasi Evaluasi'}
              </Button>
            </div>
          </CardContent>
        </Card>

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
