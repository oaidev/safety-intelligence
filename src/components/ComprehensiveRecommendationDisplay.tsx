import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  ChevronDown, 
  ChevronRight, 
  Users, 
  Settings, 
  TreePine, 
  Building2,
  Trash2,
  RotateCcw,
  Wrench,
  FileText,
  Eye,
  Activity,
  Search,
  AlertTriangle,
  Shield,
  LifeBuoy,
  Copy
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ComprehensiveHiraRecommendation {
  source: 'hira' | 'ai';
  confidence: number;
  
  potentialRootCauses: {
    humanFactors: string[];
    systemFactors: string[];
    environmentalFactors: string[];
    organizationalFactors: string[];
  };
  
  correctiveActions: {
    elimination: string[];
    substitution: string[];
    engineeringControls: string[];
    administrativeControls: string[];
  };
  
  preventiveControls: {
    procedural: string[];
    technical: string[];
    management: string[];
  };
  
  detectiveControls: {
    routineInspections: string[];
    continuousMonitoring: string[];
    auditsAndReview: string[];
  };
  
  mitigativeControls: {
    emergencyResponse: string[];
    damageControl: string[];
    recoveryPlans: string[];
  };
  
  message?: string;
}

interface ComprehensiveRecommendationDisplayProps {
  recommendations: ComprehensiveHiraRecommendation;
  onCopyToForm?: (section: string, content: string) => void;
}

export function ComprehensiveRecommendationDisplay({ 
  recommendations, 
  onCopyToForm 
}: ComprehensiveRecommendationDisplayProps) {
  const { toast } = useToast();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    rootCause: true,
    corrective: true
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: 'Tersalin',
      description: 'Konten telah disalin ke clipboard',
    });
  };

  const formatListItems = (items: string[]): string => {
    return items.map((item, index) => `${index + 1}. ${item}`).join('\n');
  };

  const renderSection = (
    title: string,
    icon: React.ReactNode,
    items: string[],
    sectionKey: string,
    color: string = 'primary'
  ) => (
    <Collapsible
      open={expandedSections[sectionKey]}
      onOpenChange={() => toggleSection(sectionKey)}
    >
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between p-0 h-auto">
          <div className="flex items-center gap-2 py-2">
            {icon}
            <h4 className="font-medium text-left">{title}</h4>
            <Badge variant="secondary" className="text-xs">
              {items.length}
            </Badge>
          </div>
          {expandedSections[sectionKey] ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-2 pt-2">
        {items.map((item, index) => (
          <div key={index} className="flex items-start justify-between gap-2 p-2 bg-muted/30 rounded-md">
            <span className="text-sm flex-1">{item}</span>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => copyToClipboard(item)}
                className="h-6 w-6 p-0"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
        <Button
          size="sm"
          variant="outline"
          onClick={() => copyToClipboard(formatListItems(items))}
          className="w-full"
        >
          <Copy className="h-3 w-3 mr-2" />
          Salin Semua {title}
        </Button>
      </CollapsibleContent>
    </Collapsible>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Rekomendasi HIRA Komprehensif</h3>
          </div>
          <Badge variant={recommendations.source === 'hira' ? 'default' : 'secondary'}>
            {recommendations.source === 'hira' ? 'HIRA Knowledge Base' : 'AI Generated'}
          </Badge>
          <Badge variant="outline">
            Confidence: {Math.round(recommendations.confidence * 100)}%
          </Badge>
        </div>
      </div>

      {recommendations.message && (
        <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
          <p className="text-sm text-primary">{recommendations.message}</p>
        </div>
      )}

      {/* Root Cause Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Akar Masalah Potensial
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {renderSection(
            'Faktor Manusia',
            <Users className="h-4 w-4 text-orange-500" />,
            recommendations.potentialRootCauses.humanFactors,
            'humanFactors'
          )}
          {renderSection(
            'Faktor Sistem',
            <Settings className="h-4 w-4 text-blue-500" />,
            recommendations.potentialRootCauses.systemFactors,
            'systemFactors'
          )}
          {renderSection(
            'Faktor Lingkungan',
            <TreePine className="h-4 w-4 text-green-500" />,
            recommendations.potentialRootCauses.environmentalFactors,
            'environmentalFactors'
          )}
          {renderSection(
            'Faktor Organisasi',
            <Building2 className="h-4 w-4 text-purple-500" />,
            recommendations.potentialRootCauses.organizationalFactors,
            'organizationalFactors'
          )}
        </CardContent>
      </Card>

      {/* Corrective Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary" />
            Tindakan Perbaikan (Hierarchy of Controls)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {renderSection(
            'Eliminasi',
            <Trash2 className="h-4 w-4 text-red-500" />,
            recommendations.correctiveActions.elimination,
            'elimination'
          )}
          {renderSection(
            'Substitusi',
            <RotateCcw className="h-4 w-4 text-orange-500" />,
            recommendations.correctiveActions.substitution,
            'substitution'
          )}
          {renderSection(
            'Engineering Controls',
            <Settings className="h-4 w-4 text-blue-500" />,
            recommendations.correctiveActions.engineeringControls,
            'engineeringControls'
          )}
          {renderSection(
            'Administrative Controls',
            <FileText className="h-4 w-4 text-green-500" />,
            recommendations.correctiveActions.administrativeControls,
            'administrativeControls'
          )}
        </CardContent>
      </Card>

      {/* Preventive Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            Kontrol Pencegahan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {renderSection(
            'Prosedural',
            <FileText className="h-4 w-4 text-blue-500" />,
            recommendations.preventiveControls.procedural,
            'preventiveProcedural'
          )}
          {renderSection(
            'Teknis',
            <Wrench className="h-4 w-4 text-green-500" />,
            recommendations.preventiveControls.technical,
            'preventiveTechnical'
          )}
          {renderSection(
            'Manajemen',
            <Building2 className="h-4 w-4 text-purple-500" />,
            recommendations.preventiveControls.management,
            'preventiveManagement'
          )}
        </CardContent>
      </Card>

      {/* Detective Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-blue-600" />
            Kontrol Deteksi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {renderSection(
            'Inspeksi Rutin',
            <Search className="h-4 w-4 text-blue-500" />,
            recommendations.detectiveControls.routineInspections,
            'detectiveInspections'
          )}
          {renderSection(
            'Monitoring Kontinyu',
            <Activity className="h-4 w-4 text-green-500" />,
            recommendations.detectiveControls.continuousMonitoring,
            'detectiveMonitoring'
          )}
          {renderSection(
            'Audit & Review',
            <FileText className="h-4 w-4 text-purple-500" />,
            recommendations.detectiveControls.auditsAndReview,
            'detectiveAudits'
          )}
        </CardContent>
      </Card>

      {/* Mitigative Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LifeBuoy className="h-5 w-5 text-red-600" />
            Kontrol Mitigasi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {renderSection(
            'Emergency Response',
            <AlertTriangle className="h-4 w-4 text-red-500" />,
            recommendations.mitigativeControls.emergencyResponse,
            'mitigativeEmergency'
          )}
          {renderSection(
            'Damage Control',
            <Shield className="h-4 w-4 text-orange-500" />,
            recommendations.mitigativeControls.damageControl,
            'mitigativeDamage'
          )}
          {renderSection(
            'Recovery Plans',
            <RotateCcw className="h-4 w-4 text-blue-500" />,
            recommendations.mitigativeControls.recoveryPlans,
            'mitigativeRecovery'
          )}
        </CardContent>
      </Card>
    </div>
  );
}