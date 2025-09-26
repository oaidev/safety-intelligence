import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  AlertTriangle, 
  Plus, 
  Clock, 
  CheckCircle, 
  XCircle, 
  ArrowLeft,
  BarChart3,
  FileText,
  Camera,
  MapPin
} from "lucide-react";
import { HybridHazardAnalyzer } from "@/components/HybridHazardAnalyzer";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const FrontlinerDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("report");

  // Fetch recent hazard reports for the dashboard
  const { data: recentReports, isLoading } = useQuery({
    queryKey: ["recent-hazard-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hazard_reports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data;
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING_REVIEW":
        return "bg-yellow-500";
      case "UNDER_INVESTIGATION":
        return "bg-blue-500";
      case "COMPLETED":
        return "bg-green-500";
      case "REJECTED":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PENDING_REVIEW":
        return <Clock className="h-4 w-4" />;
      case "UNDER_INVESTIGATION":
        return <AlertTriangle className="h-4 w-4" />;
      case "COMPLETED":
        return <CheckCircle className="h-4 w-4" />;
      case "REJECTED":
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/')}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Kembali
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Dashboard Frontliner</h1>
                <p className="text-sm text-muted-foreground">Sistem Pelaporan Hazard & Keselamatan</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-6 w-6 text-primary" />
              <span className="font-semibold text-primary">Safety First</span>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="report" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Buat Laporan
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Riwayat Laporan
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Statistik
            </TabsTrigger>
          </TabsList>

          {/* Report Tab */}
          <TabsContent value="report" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Laporkan Temuan Hazard
                </CardTitle>
              </CardHeader>
              <CardContent>
                <HybridHazardAnalyzer />
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Riwayat Laporan Anda</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-muted-foreground">Memuat data...</p>
                  </div>
                ) : recentReports && recentReports.length > 0 ? (
                  <div className="space-y-4">
                    {recentReports.map((report) => (
                      <div key={report.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-medium">{report.tracking_id}</span>
                              <Badge variant="outline" className={`${getStatusColor(report.status)} text-white`}>
                                <div className="flex items-center gap-1">
                                  {getStatusIcon(report.status)}
                                  {report.status.replace('_', ' ')}
                                </div>
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {report.finding_description?.substring(0, 100)}...
                            </p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {report.location}
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(report.created_at).toLocaleDateString('id-ID')}
                              </div>
                              {report.image_url && (
                                <div className="flex items-center gap-1">
                                  <Camera className="h-3 w-3" />
                                  Dengan foto
                                </div>
                              )}
                            </div>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => navigate(`/evaluate/${report.id}`)}
                          >
                            Detail
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Belum ada laporan yang dibuat</p>
                    <Button 
                      className="mt-4" 
                      onClick={() => setActiveTab("report")}
                    >
                      Buat Laporan Pertama
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Stats Tab */}
          <TabsContent value="stats" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Laporan</p>
                      <p className="text-2xl font-bold">
                        {recentReports?.length || 0}
                      </p>
                    </div>
                    <FileText className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Pending Review</p>
                      <p className="text-2xl font-bold text-yellow-600">
                        {recentReports?.filter(r => r.status === 'PENDING_REVIEW').length || 0}
                      </p>
                    </div>
                    <Clock className="h-8 w-8 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Completed</p>
                      <p className="text-2xl font-bold text-green-600">
                        {recentReports?.filter(r => r.status === 'COMPLETED').length || 0}
                      </p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Tips Keselamatan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-900 dark:text-blue-100">Selalu gunakan APD lengkap</p>
                      <p className="text-sm text-blue-700 dark:text-blue-300">Pastikan semua alat pelindung diri dalam kondisi baik sebelum bekerja</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-green-900 dark:text-green-100">Laporkan setiap temuan</p>
                      <p className="text-sm text-green-700 dark:text-green-300">Tidak ada temuan yang terlalu kecil untuk dilaporkan. Safety is everyone's responsibility</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <Camera className="h-5 w-5 text-orange-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-orange-900 dark:text-orange-100">Dokumentasi yang baik</p>
                      <p className="text-sm text-orange-700 dark:text-orange-300">Ambil foto yang jelas dan lengkapi dengan deskripsi detail untuk membantu evaluasi</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default FrontlinerDashboard;