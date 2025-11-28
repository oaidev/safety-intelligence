import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  Image,
  Target,
  Shuffle,
  RefreshCw,
  FileDown
} from 'lucide-react';
import { AnalysisResult, scoringService } from '@/lib/scoringService';
import { ThinkingProcessViewer } from './ThinkingProcessViewer';

interface HazardScoringProps {
  analysis: AnalysisResult;
  onImproveReport?: (improvements: any) => void;
  onExportReport?: () => void;
  compact?: boolean;
}

export function HazardScoring({ analysis, onImproveReport, onExportReport, compact = false }: HazardScoringProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="h-5 w-5 text-green-600" />;
    if (score >= 60) return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
    return <XCircle className="h-5 w-5 text-red-600" />;
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'consistency': return <Shuffle className="h-5 w-5" />;
      case 'completeness': return <FileText className="h-5 w-5" />;
      case 'image_relevance': return <Image className="h-5 w-5" />;
      default: return <FileText className="h-5 w-5" />;
    }
  };

  const getCategoryTitle = (category: string) => {
    switch (category) {
      case 'consistency': return 'Konsistensi Antar Field';
      case 'completeness': return 'Kelengkapan Deskripsi';
      case 'image_relevance': return 'Kesesuaian Gambar';
      default: return category;
    }
  };

  const getPriorityColor = (priority: string) => {
    if (priority.includes('HIGH')) return 'bg-red-100 text-red-800 border-red-300';
    if (priority.includes('MEDIUM')) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-blue-100 text-blue-800 border-blue-300';
  };

  return (
    <div className="space-y-6">
      {/* Overall Score Card */}
      <Card className="shadow-elegant border-primary/20">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            {getScoreIcon(analysis.scores.overall)}
            Kualitas Laporan Hazard
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="relative w-32 h-32 mx-auto">
            <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r="54"
                stroke="currentColor"
                strokeWidth="12"
                fill="transparent"
                className="text-muted/20"
              />
              <circle
                cx="60"
                cy="60"
                r="54"
                stroke="currentColor"
                strokeWidth="12"
                fill="transparent"
                strokeDasharray={`${(analysis.scores.overall / 100) * 339.292} 339.292`}
                className={scoringService.getScoreColor(analysis.scores.overall).replace('text-', 'stroke-')}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className={`text-2xl font-bold ${scoringService.getScoreColor(analysis.scores.overall)}`}>
                  {analysis.scores.overall}
                </div>
                <div className="text-sm text-muted-foreground">/ 100</div>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Badge variant="secondary" className="text-lg px-4 py-2">
              {scoringService.getScoreGrade(analysis.scores.overall)}
            </Badge>
            <p className="text-sm text-muted-foreground">
              Skor keseluruhan berdasarkan 3 aspek penilaian
            </p>
          </div>
          
        </CardContent>

        {/* Thinking Process in Overall Card */}
        {analysis.thinkingProcess && (
          <CardFooter className="pt-4 border-t">
            <ThinkingProcessViewer 
              thinkingProcess={analysis.thinkingProcess} 
              compact 
            />
          </CardFooter>
        )}
      </Card>

      {/* Detailed Score Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(analysis.detailed_analysis).map(([category, details]) => (
          <Card key={category} className="shadow-card">
            <Collapsible 
              open={expandedSections[category]} 
              onOpenChange={() => toggleSection(category)}
            >
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(category)}
                      <span className="text-sm">{getCategoryTitle(category)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={scoringService.getScoreColor(details.score)}>
                        {details.score}/100
                      </Badge>
                      {expandedSections[category] ? 
                        <ChevronUp className="h-4 w-4" /> : 
                        <ChevronDown className="h-4 w-4" />
                      }
                    </div>
                  </CardTitle>
                  <Progress 
                    value={details.score} 
                    className="h-2"
                  />
                </CardHeader>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  {/* Findings */}
                  {'findings' in details && details.findings.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-green-700 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Poin Positif
                      </h4>
                      <ul className="space-y-1">
                        {details.findings.map((finding, index) => (
                          <li key={index} className="text-sm text-green-600 flex items-start gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 flex-shrink-0" />
                            {finding}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Strong Points */}
                  {'strong_points' in details && details.strong_points.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-green-700 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Kelebihan
                      </h4>
                      <ul className="space-y-1">
                        {details.strong_points.map((point, index) => (
                          <li key={index} className="text-sm text-green-600 flex items-start gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 flex-shrink-0" />
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Strengths */}
                  {'strengths' in details && details.strengths.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-green-700 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Kekuatan
                      </h4>
                      <ul className="space-y-1">
                        {details.strengths.map((strength, index) => (
                          <li key={index} className="text-sm text-green-600 flex items-start gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 flex-shrink-0" />
                            {strength}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Issues */}
                  {'issues' in details && details.issues.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-red-700 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Perlu Diperbaiki
                      </h4>
                      <ul className="space-y-1">
                        {details.issues.map((issue, index) => (
                          <li key={index} className="text-sm text-red-600 flex items-start gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 flex-shrink-0" />
                            {issue}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Missing Elements */}
                  {'missing_elements' in details && details.missing_elements.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-red-700 flex items-center gap-2">
                        <XCircle className="h-4 w-4" />
                        Elemen yang Hilang
                      </h4>
                      <ul className="space-y-1">
                        {details.missing_elements.map((element, index) => (
                          <li key={index} className="text-sm text-red-600 flex items-start gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 flex-shrink-0" />
                            {element}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Improvements */}
                  {'improvements' in details && details.improvements.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-yellow-700 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Saran Perbaikan
                      </h4>
                      <ul className="space-y-1">
                        {details.improvements.map((improvement, index) => (
                          <li key={index} className="text-sm text-yellow-600 flex items-start gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-2 flex-shrink-0" />
                            {improvement}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}
      </div>
    </div>
  );
}