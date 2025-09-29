import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { hazardReportService } from '@/lib/hazardReportService';
import { similarityService } from '@/lib/similarityService';
import { ClusterAnalysisDashboard } from '@/components/ClusterAnalysisDashboard';
import { 
  Search, 
  Filter,
  Eye,
  AlertTriangle,
  Clock,
  CheckCircle,
  Users,
  TrendingUp,
  Calendar,
  MapPin,
  FileText,
  Zap
} from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Link, useNavigate } from 'react-router-dom';

interface HazardReport {
  id: string;
  tracking_id: string;
  reporter_name: string;
  location: string;
  non_compliance: string;
  sub_non_compliance: string;
  finding_description: string;
  status: string;
  created_at: string;
  similarity_cluster_id?: string;
  hazard_action_items?: any[];
}

interface DashboardStats {
  total_reports: number;
  pending_review: number;
  in_progress: number;
  completed: number;
  pain_points: number;
}

interface TimingAnalytics {
  avg_review_to_close_days: number;
  avg_submission_interval_hours: number;
}

export default function EvaluatorDashboard() {
  const [reports, setReports] = useState<HazardReport[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    total_reports: 0,
    pending_review: 0,
    in_progress: 0,
    completed: 0,
    pain_points: 0,
  });
  const [timingAnalytics, setTimingAnalytics] = useState<TimingAnalytics>({
    avg_review_to_close_days: 0,
    avg_submission_interval_hours: 0,
  });
  const [activeAnalysisTab, setActiveAnalysisTab] = useState('timing');
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    location: '',
    dateFrom: '',
    dateTo: '',
    category: ''
  });
  const [groupByClusters, setGroupByClusters] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboardData();
  }, [filters]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [reportsData, statsData, timingData] = await Promise.all([
        hazardReportService.getPendingReports(filters),
        hazardReportService.getDashboardStats(),
        hazardReportService.getTimingAnalytics()
      ]);
      
      setReports(reportsData);
      setStats(statsData);
      setTimingAnalytics(timingData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'PENDING_REVIEW':
        return 'destructive';
      case 'IN_PROGRESS':
        return 'default';
      case 'COMPLETED':
        return 'default';
      case 'DUPLIKAT':
        return 'secondary';
      case 'BUKAN_HAZARD':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING_REVIEW':
        return 'Menunggu Review';
      case 'IN_PROGRESS':
        return 'Dalam Proses';
      case 'COMPLETED':
        return 'Selesai';
      case 'DUPLIKAT':
        return 'Duplikat';
      case 'BUKAN_HAZARD':
        return 'Bukan Hazard';
      default:
        return status;
    }
  };

  // Group reports by cluster
  const groupedReports = () => {
    if (!groupByClusters) return [{ cluster_id: null, reports }];
    
    const clustered = new Map();
    const unclustered: HazardReport[] = [];
    
    reports.forEach(report => {
      if (report.similarity_cluster_id) {
        if (!clustered.has(report.similarity_cluster_id)) {
          clustered.set(report.similarity_cluster_id, []);
        }
        clustered.get(report.similarity_cluster_id).push(report);
      } else {
        unclustered.push(report);
      }
    });
    
    const result = Array.from(clustered.entries()).map(([cluster_id, reports]) => ({
      cluster_id,
      reports
    }));
    
    if (unclustered.length > 0) {
      result.push({ cluster_id: null, reports: unclustered });
    }
    
    return result;
  };

  const getClusterColor = (clusterId: string) => {
    const colors = [
      'bg-blue-100 text-blue-800 border-blue-200',
      'bg-green-100 text-green-800 border-green-200',
      'bg-purple-100 text-purple-800 border-purple-200',
      'bg-orange-100 text-orange-800 border-orange-200',
      'bg-pink-100 text-pink-800 border-pink-200',
      'bg-indigo-100 text-indigo-800 border-indigo-200',
    ];
    const hash = clusterId.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const handleViewDetails = (report: HazardReport) => {
    navigate(`/evaluate/${report.id}`);
  };

  const StatCard = ({ title, value, icon: Icon, description, color }: {
    title: string;
    value: number;
    icon: any;
    description: string;
    color: string;
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Dashboard Evaluator</h1>
            <p className="text-muted-foreground">Kelola dan evaluasi laporan hazard</p>
          </div>
          <div className="flex gap-2">
            <Link to="/">
              <Button variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                Mode Frontliner
              </Button>
            </Link>
            <Link to="/settings">
              <Button variant="outline">Settings</Button>
            </Link>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            title="Total Laporan"
            value={stats.total_reports}
            icon={FileText}
            description="Semua laporan"
            color="text-blue-500"
          />
          <StatCard
            title="Menunggu Review"
            value={stats.pending_review}
            icon={Clock}
            description="Perlu evaluasi"
            color="text-orange-500"
          />
          <StatCard
            title="Dalam Proses"
            value={stats.in_progress}
            icon={Zap}
            description="Tindakan berjalan"
            color="text-blue-500"
          />
          <StatCard
            title="Selesai"
            value={stats.completed}
            icon={CheckCircle}
            description="Sudah ditangani"
            color="text-green-500"
          />
          <StatCard
            title="Pain Points"
            value={stats.pain_points}
            icon={AlertTriangle}
            description="Masalah berulang"
            color="text-red-500"
          />
        </div>

        {/* Analysis Tabs */}
        <Card>
          <CardHeader>
            <CardTitle>Analisis Dashboard</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-6">
              <Button
                variant={activeAnalysisTab === 'timing' ? 'default' : 'outline'}
                onClick={() => setActiveAnalysisTab('timing')}
                size="sm"
              >
                <Clock className="h-4 w-4 mr-2" />
                Waktu Review
              </Button>
              <Button
                variant={activeAnalysisTab === 'interval' ? 'default' : 'outline'}
                onClick={() => setActiveAnalysisTab('interval')}
                size="sm"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Interval Submission
              </Button>
              <Button
                variant={activeAnalysisTab === 'clusters' ? 'default' : 'outline'}
                onClick={() => setActiveAnalysisTab('clusters')}
                size="sm"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Pain Points
              </Button>
            </div>

            {activeAnalysisTab === 'timing' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="text-center p-6 bg-muted/50 rounded-lg">
                    <div className="text-3xl font-bold text-primary">
                      {timingAnalytics.avg_review_to_close_days.toFixed(1)}
                    </div>
                    <div className="text-sm text-muted-foreground">Hari rata-rata dari review ke closing</div>
                  </div>
                  <div className="text-center p-6 bg-muted/50 rounded-lg">
                    <div className="text-3xl font-bold text-primary">
                      {timingAnalytics.avg_review_to_close_days <= 7 ? 'Baik' : timingAnalytics.avg_review_to_close_days <= 14 ? 'Sedang' : 'Perlu Perbaikan'}
                    </div>
                    <div className="text-sm text-muted-foreground">Status performa review</div>
                  </div>
                </div>
              </div>
            )}

            {activeAnalysisTab === 'interval' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="text-center p-6 bg-muted/50 rounded-lg">
                    <div className="text-3xl font-bold text-primary">
                      {timingAnalytics.avg_submission_interval_hours.toFixed(1)}
                    </div>
                    <div className="text-sm text-muted-foreground">Jam rata-rata antar submission</div>
                  </div>
                  <div className="text-center p-6 bg-muted/50 rounded-lg">
                    <div className="text-3xl font-bold text-primary">
                      {timingAnalytics.avg_submission_interval_hours <= 24 ? 'Tinggi' : timingAnalytics.avg_submission_interval_hours <= 72 ? 'Normal' : 'Rendah'}
                    </div>
                    <div className="text-sm text-muted-foreground">Frekuensi pelaporan</div>
                  </div>
                </div>
              </div>
            )}

            {activeAnalysisTab === 'clusters' && (
              <ClusterAnalysisDashboard />
            )}
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filter & Pencarian
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              <div className="lg:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari ID, pelapor, lokasi, atau deskripsi..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={filters.status || 'ALL'} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value === 'ALL' ? '' : value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Status</SelectItem>
                  <SelectItem value="PENDING_REVIEW">Menunggu Review</SelectItem>
                  <SelectItem value="IN_PROGRESS">Dalam Proses</SelectItem>
                  <SelectItem value="DUPLIKAT">Duplikat</SelectItem>
                  <SelectItem value="BUKAN_HAZARD">Bukan Hazard</SelectItem>
                  <SelectItem value="DUPLIKAT">Duplikat</SelectItem>
                  <SelectItem value="BUKAN_HAZARD">Bukan Hazard</SelectItem>
                </SelectContent>
              </Select>

              <Input
                type="text"
                placeholder="Lokasi"
                value={filters.location}
                onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
              />

              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
              />

              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Reports Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Daftar Laporan Hazard</span>
              <div className="flex items-center gap-3">
                <Button
                  variant={groupByClusters ? "default" : "outline"}
                  size="sm"
                  onClick={() => setGroupByClusters(!groupByClusters)}
                >
                  <Users className="h-4 w-4 mr-2" />
                  {groupByClusters ? 'Tampilan Normal' : 'Group by Cluster'}
                </Button>
                <Badge variant="outline">{reports.length} laporan</Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : (
              <div className="overflow-x-auto">
                {groupByClusters ? (
                  // Grouped by Clusters View
                  <div className="space-y-6">
                    {groupedReports().map((group, groupIndex) => (
                      <div key={group.cluster_id || 'unclustered'} className="space-y-3">
                        {/* Cluster Header */}
                        {group.cluster_id ? (
                          <div className={`rounded-lg border-2 p-4 ${getClusterColor(group.cluster_id)}`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Users className="h-5 w-5" />
                                <div>
                                  <h3 className="font-semibold">Cluster #{groupIndex + 1}</h3>
                                  <p className="text-sm opacity-80">
                                    {group.reports.length} laporan serupa • Tingkat kesamaan tinggi
                                  </p>
                                </div>
                              </div>
                              <Badge variant="secondary" className="bg-white/50">
                                {group.reports.length} laporan
                              </Badge>
                            </div>
                            
                            {/* Common characteristics */}
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Badge variant="outline" className="bg-white/30">
                                <MapPin className="h-3 w-3 mr-1" />
                                {group.reports[0].location}
                              </Badge>
                              <Badge variant="outline" className="bg-white/30">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                {group.reports[0].non_compliance}
                              </Badge>
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-lg border border-dashed border-muted p-4">
                            <div className="flex items-center gap-3">
                              <FileText className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <h3 className="font-semibold text-muted-foreground">Laporan Individual</h3>
                                <p className="text-sm text-muted-foreground">
                                  {group.reports.length} laporan tanpa cluster
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Reports in this cluster */}
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>ID Tracking</TableHead>
                              <TableHead>Tanggal</TableHead>
                              <TableHead>Pelapor</TableHead>
                              <TableHead>Lokasi</TableHead>
                              <TableHead>Jenis Hazard</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Aksi</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {group.reports.map((report, reportIndex) => (
                              <TableRow 
                                key={report.id}
                                className={group.cluster_id ? `border-l-4 ${getClusterColor(group.cluster_id).split(' ')[0].replace('bg-', 'border-')}` : ''}
                              >
                                <TableCell className="font-mono text-sm">
                                  <div className="flex items-center gap-2">
                                    {group.cluster_id && reportIndex === 0 && (
                                      <div className="w-2 h-2 rounded-full bg-current opacity-60"></div>
                                    )}
                                    {report.tracking_id}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {format(new Date(report.created_at), 'dd MMM yyyy', { locale: idLocale })}
                                </TableCell>
                                <TableCell>{report.reporter_name}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3 text-muted-foreground" />
                                    {report.location}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="text-sm">
                                    <div className="font-medium">{report.non_compliance}</div>
                                    <div className="text-muted-foreground text-xs">{report.sub_non_compliance}</div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={getStatusBadgeVariant(report.status)}>
                                    {getStatusLabel(report.status)}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleViewDetails(report)}
                                  >
                                    <Eye className="h-4 w-4 mr-1" />
                                    Evaluasi
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ))}
                  </div>
                ) : (
                  // Normal Table View
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID Tracking</TableHead>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Pelapor</TableHead>
                        <TableHead>Lokasi</TableHead>
                        <TableHead>Jenis Hazard</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Cluster</TableHead>
                        <TableHead>Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reports.map((report) => (
                        <TableRow key={report.id}>
                          <TableCell className="font-mono text-sm">
                            {report.tracking_id}
                          </TableCell>
                          <TableCell>
                            {format(new Date(report.created_at), 'dd MMM yyyy', { locale: idLocale })}
                          </TableCell>
                          <TableCell>{report.reporter_name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              {report.location}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div className="font-medium">{report.non_compliance}</div>
                              <div className="text-muted-foreground text-xs">{report.sub_non_compliance}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(report.status)}>
                              {getStatusLabel(report.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {report.similarity_cluster_id && (
                              <Badge variant="outline" className="text-xs">
                                <Users className="h-3 w-3 mr-1" />
                                Cluster
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetails(report)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Evaluasi
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cluster Analysis Section */}
        <ClusterAnalysisDashboard />
      </div>
    </div>
  );
}