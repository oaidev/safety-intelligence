import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { similarityService, type SimilarityCluster } from '@/lib/similarityService';
import { hazardReportService } from '@/lib/hazardReportService';
import { 
  TrendingUp, 
  Users, 
  AlertTriangle, 
  MapPin, 
  Calendar,
  Eye,
  BarChart3,
  Target,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Link } from 'react-router-dom';

interface ClusterStats {
  totalClusters: number;
  totalClusteredReports: number;
  averageClusterSize: number;
  topLocations: Array<{ location: string; count: number }>;
  topCategories: Array<{ category: string; count: number }>;
}

interface TimingAnalytics {
  avg_review_to_close_days: number;
  avg_submission_interval_hours: number;
}

export function ClusterAnalysisDashboard() {
  const [painPoints, setPainPoints] = useState<SimilarityCluster[]>([]);
  const [clusterStats, setClusterStats] = useState<ClusterStats | null>(null);
  const [timingAnalytics, setTimingAnalytics] = useState<TimingAnalytics>({
    avg_review_to_close_days: 0,
    avg_submission_interval_hours: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadClusterData();
  }, []);

  const loadClusterData = async () => {
    setIsLoading(true);
    try {
      // Load pain points and timing analytics
      const [pointsResult, timingData] = await Promise.all([
        similarityService.getPainPoints(),
        hazardReportService.getTimingAnalytics()
      ]);
      
      setPainPoints(pointsResult.clusters);
      setTimingAnalytics(timingData);

      // Calculate cluster statistics
      if (pointsResult.clusters.length > 0) {
        const totalReports = pointsResult.clusters.reduce((sum, cluster) => sum + cluster.reports.length, 0);
        const avgSize = totalReports / pointsResult.clusters.length;

        // Count by location
        const locationCounts: Record<string, number> = {};
        const categoryCounts: Record<string, number> = {};

        pointsResult.clusters.forEach(cluster => {
          cluster.reports.forEach(report => {
            locationCounts[report.location] = (locationCounts[report.location] || 0) + 1;
            categoryCounts[report.non_compliance] = (categoryCounts[report.non_compliance] || 0) + 1;
          });
        });

        const topLocations = Object.entries(locationCounts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5)
          .map(([location, count]) => ({ location, count }));

        const topCategories = Object.entries(categoryCounts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5)
          .map(([category, count]) => ({ category, count }));

        setClusterStats({
          totalClusters: pointsResult.clusters.length,
          totalClusteredReports: totalReports,
          averageClusterSize: Math.round(avgSize * 10) / 10,
          topLocations,
          topCategories
        });
      }
    } catch (error) {
      console.error('Error loading cluster data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRiskLevel = (clusterSize: number) => {
    if (clusterSize >= 5) return { level: 'CRITICAL', color: 'destructive', icon: AlertTriangle };
    if (clusterSize >= 3) return { level: 'HIGH', color: 'secondary', icon: TrendingUp };
    return { level: 'MEDIUM', color: 'outline', icon: Target };
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Analisis Clustering
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4 animate-spin" />
              Memuat data cluster...
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{clusterStats?.totalClusters || 0}</p>
                <p className="text-xs text-muted-foreground">Total Clusters</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{clusterStats?.totalClusteredReports || 0}</p>
                <p className="text-xs text-muted-foreground">Clustered Reports</p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{clusterStats?.averageClusterSize || 0}</p>
                <p className="text-xs text-muted-foreground">Avg Cluster Size</p>
              </div>
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">
                  {painPoints.filter(p => p.reports.length >= 5).length}
                </p>
                <p className="text-xs text-muted-foreground">Critical Clusters</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="timing" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="timing">Waktu Review</TabsTrigger>
          <TabsTrigger value="interval">Interval Submission</TabsTrigger>
          <TabsTrigger value="clusters">Pain Points</TabsTrigger>
          <TabsTrigger value="locations">Top Locations</TabsTrigger>
          <TabsTrigger value="categories">Top Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="timing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Waktu Review ke Closing
              </CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="interval" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Interval Submission
              </CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clusters" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Critical Pain Points
                {painPoints.length > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {painPoints.length} clusters
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {painPoints.length === 0 ? (
                <Alert>
                  <Target className="h-4 w-4" />
                  <AlertDescription>
                    Tidak ada pain points terdeteksi saat ini. Sistem berjalan dengan baik!
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  {painPoints.map((cluster) => {
                    const risk = getRiskLevel(cluster.reports.length);
                    const Icon = risk.icon;
                    
                    return (
                      <Card key={cluster.id} className="border-l-4 border-l-red-500">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Icon className="h-5 w-5 text-red-500" />
                              <Badge variant={risk.color as any}>
                                {risk.level} - {cluster.reports.length} laporan
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Similarity: {Math.round(cluster.similarity_score * 100)}%
                            </div>
                          </div>

                          <div className="space-y-2 mb-4">
                            <div className="font-medium">
                              {cluster.reports[0]?.non_compliance}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Sub-kategori: {cluster.reports[0]?.sub_non_compliance}
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              <div className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                <span>{cluster.reports[0]?.location}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span>
                                  {format(new Date(cluster.reports[0]?.created_at), 'dd MMM yyyy', { locale: idLocale })}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="text-sm font-medium">
                              Similarity Breakdown:
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-xs">
                              <div>
                                <div className="flex justify-between">
                                  <span>Text</span>
                                  <span>{Math.round(cluster.cluster_metadata.text_similarity * 100)}%</span>
                                </div>
                                <Progress 
                                  value={cluster.cluster_metadata.text_similarity * 100} 
                                  className="h-2"
                                />
                              </div>
                              <div>
                                <div className="flex justify-between">
                                  <span>Location</span>
                                  <span>{Math.round(cluster.cluster_metadata.location_similarity * 100)}%</span>
                                </div>
                                <Progress 
                                  value={cluster.cluster_metadata.location_similarity * 100} 
                                  className="h-2"
                                />
                              </div>
                              <div>
                                <div className="flex justify-between">
                                  <span>Category</span>
                                  <span>{Math.round(cluster.cluster_metadata.category_similarity * 100)}%</span>
                                </div>
                                <Progress 
                                  value={cluster.cluster_metadata.category_similarity * 100} 
                                  className="h-2"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="flex justify-between items-center mt-4 pt-2 border-t">
                            <div className="text-xs text-muted-foreground">
                              Cluster ID: {cluster.id.substring(0, 8)}...
                            </div>
                            <div className="flex gap-2">
                              {cluster.reports.slice(0, 3).map((report) => (
                                <Button key={report.id} asChild variant="outline" size="sm">
                                  <Link to={`/evaluator/hazard/${report.id}`}>
                                    <Eye className="h-4 w-4 mr-1" />
                                    {report.tracking_id}
                                  </Link>
                                </Button>
                              ))}
                              {cluster.reports.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{cluster.reports.length - 3} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="locations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Top Problem Locations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {clusterStats?.topLocations.map((item, index) => (
                  <div key={item.location} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">#{index + 1}</Badge>
                      <span className="font-medium">{item.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{item.count} laporan</span>
                      <Progress value={(item.count / (clusterStats.totalClusteredReports || 1)) * 100} className="w-16 h-2" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Top Problem Categories
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {clusterStats?.topCategories.map((item, index) => (
                  <div key={item.category} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">#{index + 1}</Badge>
                      <span className="font-medium">{item.category}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{item.count} laporan</span>
                      <Progress value={(item.count / (clusterStats.totalClusteredReports || 1)) * 100} className="w-16 h-2" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}