import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ClipboardCheck, Shield, Users } from "lucide-react";

const RoleSelection = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Shield className="h-12 w-12 text-primary mr-3" />
            <h1 className="text-4xl font-bold text-foreground">Safety Management System</h1>
          </div>
          <p className="text-xl text-muted-foreground">Pilih peran Anda untuk melanjutkan</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Frontliner Card */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/frontliner')}>
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 p-4 rounded-full bg-blue-100 dark:bg-blue-900">
                <AlertTriangle className="h-12 w-12 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle className="text-2xl">Frontliner</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground mb-6">
                Laporkan temuan bahaya dan kondisi tidak aman di lapangan
              </p>
              
              <div className="space-y-3 text-sm">
                <div className="flex items-center text-left">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3 flex-shrink-0"></div>
                  <span>Input laporan hazard dan observasi keselamatan</span>
                </div>
                <div className="flex items-center text-left">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3 flex-shrink-0"></div>
                  <span>Upload foto dan dokumentasi temuan</span>
                </div>
                <div className="flex items-center text-left">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3 flex-shrink-0"></div>
                  <span>Analisis AI untuk kategori hazard</span>
                </div>
                <div className="flex items-center text-left">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3 flex-shrink-0"></div>
                  <span>Tracking status perbaikan</span>
                </div>
              </div>

              <Button className="w-full mt-6" size="lg">
                <Users className="mr-2 h-5 w-5" />
                Masuk sebagai Frontliner
              </Button>
            </CardContent>
          </Card>

          {/* Evaluator Card */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/evaluator')}>
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 p-4 rounded-full bg-green-100 dark:bg-green-900">
                <ClipboardCheck className="h-12 w-12 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-2xl">Evaluator</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground mb-6">
                Review, evaluasi, dan kelola laporan hazard dari frontliner
              </p>
              
              <div className="space-y-3 text-sm">
                <div className="flex items-center text-left">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3 flex-shrink-0"></div>
                  <span>Dashboard monitoring laporan hazard</span>
                </div>
                <div className="flex items-center text-left">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3 flex-shrink-0"></div>
                  <span>Evaluasi dan verifikasi temuan</span>
                </div>
                <div className="flex items-center text-left">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3 flex-shrink-0"></div>
                  <span>Analisis cluster dan trending</span>
                </div>
                <div className="flex items-center text-left">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3 flex-shrink-0"></div>
                  <span>Management action items</span>
                </div>
              </div>

              <Button className="w-full mt-6" size="lg" variant="outline">
                <ClipboardCheck className="mr-2 h-5 w-5" />
                Masuk sebagai Evaluator
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground">
            Sistem Manajemen Keselamatan Terintegrasi dengan AI
          </p>
        </div>
      </div>
    </div>
  );
};

export default RoleSelection;