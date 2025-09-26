import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { similarityService, type HazardReport, type SimilarityCluster } from '@/lib/similarityService';
import { 
  Users, 
  AlertTriangle, 
  MapPin, 
  Calendar,
  TrendingUp,
  Lightbulb,
  Target,
  Eye,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Link } from 'react-router-dom';

interface SimilarReportsAnalysisProps {
  currentReport: HazardReport;
  onSimilarReportsFound?: (count: number) => void;
}

export function SimilarReportsAnalysis({ currentReport, onSimilarReportsFound }: SimilarReportsAnalysisProps) {
  const [similarReports, setSimilarReports] = useState<HazardReport[]>([]);
  const [clusterReports, setClusterReports] = useState<HazardReport[]>([]);
  const [painPoints, setPainPoints] = useState<SimilarityCluster[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [analysisComplete, setAnalysisComplete] = useState(false);

  useEffect(() => {
    analyzeSimilarity();
  }, [currentReport.id]);

  const analyzeSimilarity = async () => {
    setIsLoading(true);
    try {
      // Find similar reports
      const similar = await similarityService.findSimilarReports(currentReport);
      setSimilarReports(similar);
      onSimilarReportsFound?.(similar.length);

      // Get cluster reports if this report is part of a cluster
      if (currentReport.similarity_cluster_id) {
        const cluster = await similarityService.getClusterReports(currentReport.similarity_cluster_id);
        setClusterReports(cluster.filter(r => r.id !== currentReport.id));
      }

      // Get system-wide pain points
      const points = await similarityService.getPainPoints();
      setPainPoints(points);

      setAnalysisComplete(true);
    } catch (error) {
      console.error('Error analyzing similarity:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 0.9) return 'text-red-600 bg-red-50';
    if (similarity >= 0.8) return 'text-orange-600 bg-orange-50';
    return 'text-yellow-600 bg-yellow-50';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Analisis Similaritas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4 animate-spin" />
            Menganalisis laporan serupa...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Similar Reports Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Laporan Serupa (7 Hari Terakhir)
            {similarReports.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {similarReports.length} laporan
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {similarReports.length === 0 ? (
            <Alert>
              <Lightbulb className="h-4 w-4" />
              <AlertDescription>
                Tidak ditemukan laporan serupa dalam 7 hari terakhir. Ini adalah masalah yang unik atau pertama kali dilaporkan.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              <Alert className="border-orange-200 bg-orange-50">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Perhatian:</strong> Ditemukan {similarReports.length} laporan serupa. 
                  Ini menunjukkan pola masalah berulang yang memerlukan investigasi lebih mendalam.
                </AlertDescription>
              </Alert>
              
              <div className="grid gap-3">
                {similarReports.map((report) => (
                  <div key={report.id} className="border rounded-lg p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {report.tracking_id}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            Similarity: 85%+
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span>{report.location}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>{format(new Date(report.created_at), 'dd MMM yyyy', { locale: idLocale })}</span>
                          </div>
                        </div>
                        
                        <div className="text-sm">
                          <span className="font-medium">Ketidaksesuaian:</span> {report.non_compliance}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {report.finding_description.substring(0, 100)}...
                        </div>
                      </div>
                      
                      <Button asChild variant="outline" size="sm">
                        <Link to={`/evaluator/hazard/${report.id}`}>
                          <Eye className="h-4 w-4 mr-1" />
                          Lihat
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cluster Analysis */}
      {currentReport.similarity_cluster_id && clusterReports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Analisis Cluster
              <Badge variant="destructive" className="ml-2">
                {clusterReports.length + 1} laporan terkait
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className="border-red-200 bg-red-50 mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Pain Point Terdeteksi:</strong> Laporan ini bagian dari cluster dengan {clusterReports.length + 1} laporan serupa. 
                Ini menunjukkan masalah sistemik yang memerlukan tindakan pencegahan menyeluruh.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <h4 className="font-medium">Laporan dalam Cluster:</h4>
              {clusterReports.map((report) => (
                <div key={report.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {report.tracking_id}
                      </Badge>
                      <span className="text-sm">{report.location}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(report.created_at), 'dd MMM yyyy', { locale: idLocale })}
                    </div>
                  </div>
                  <Button asChild variant="ghost" size="sm">
                    <Link to={`/evaluator/hazard/${report.id}`}>
                      <Eye className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Pain Points */}
      {painPoints.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Pain Points Sistem
              <Badge variant="destructive" className="ml-2">
                {painPoints.length} area kritis
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Ditemukan {painPoints.length} area dengan masalah berulang (3+ laporan serupa). 
                  Prioritaskan tindakan pencegahan untuk area ini.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                {painPoints.slice(0, 3).map((painPoint) => (
                  <div key={painPoint.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="destructive">
                        {painPoint.reports.length} laporan serupa
                      </Badge>
                      <div className="text-sm text-muted-foreground">
                        Similarity: {Math.round(painPoint.similarity_score * 100)}%
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="font-medium">
                        {painPoint.reports[0]?.non_compliance}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Lokasi utama: {painPoint.reports[0]?.location}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Cluster ID: {painPoint.id}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}