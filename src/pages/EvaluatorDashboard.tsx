import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
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
  Zap,
  Home,
  ChevronLeft,
  ChevronRight
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
  const [loading, setLoading] = useState(true);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);
  const [hasMore, setHasMore] = useState(true);
  
  // Filter states with default date (last 3 days)
  const getDefaultDateFrom = () => {
    const date = new Date();
    date.setDate(date.getDate() - 3);
    return date.toISOString().split('T')[0];
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    location: '',
    dateFrom: getDefaultDateFrom(),
    dateTo: '',
    category: ''
  });
  const [groupByClusters, setGroupByClusters] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Debounce search input
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1); // Reset to first page on search
    }, 500);
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const offset = (currentPage - 1) * itemsPerPage;
      
      const [reportsData, statsData] = await Promise.all([
        hazardReportService.getPendingReports({
          search: debouncedSearch,
          status: filters.status,
          category: filters.category,
          location: filters.location,
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
          limit: itemsPerPage,
          offset: offset,
        }),
        hazardReportService.getDashboardStats()
      ]);
      
      setReports(reportsData);
      setStats(statsData);
      setHasMore(reportsData.length === itemsPerPage);
    } catch (error: any) {
      console.error('Error loading dashboard data:', error);
      
      // Handle timeout specifically
      if (error?.code === '57014' || error?.message?.includes('timeout')) {
        toast({
          title: "Timeout",
          description: "Permintaan memakan waktu terlalu lama. Coba persempit filter Anda.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Gagal memuat data dashboard. Silakan coba lagi.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, debouncedSearch, filters, toast]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

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
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/">
                <Home className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Dashboard Evaluator</h1>
              <p className="text-muted-foreground">Kelola dan evaluasi laporan hazard</p>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/frontliner">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Mode Frontliner
            </Link>
          </Button>
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
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    disabled={loading}
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
                  <SelectItem value="COMPLETED">Selesai</SelectItem>
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
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-10 w-32" />
                </div>
                <div className="border rounded-lg">
                  <div className="border-b p-4">
                    <div className="flex gap-4">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </div>
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="p-4 border-b last:border-0">
                      <div className="flex gap-4">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
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
          
          {/* Pagination Controls */}
          {!loading && reports.length > 0 && (
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <div className="text-sm text-muted-foreground">
                Halaman {currentPage} • Menampilkan {reports.length} laporan
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1 || loading}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Sebelumnya
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => p + 1)}
                  disabled={!hasMore || loading}
                >
                  Selanjutnya
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Cluster Analysis Section */}
        <ClusterAnalysisDashboard />
      </div>
    </div>
  );
}