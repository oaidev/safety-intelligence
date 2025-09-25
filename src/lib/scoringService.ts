import { supabase } from '@/integrations/supabase/client';

export interface ScoreData {
  consistency: number;
  completeness: number;
  image_relevance: number;
  actionability: number;
  overall: number;
}

export interface DetailedAnalysis {
  consistency: {
    score: number;
    findings: string[];
    issues: string[];
  };
  completeness: {
    score: number;
    missing_elements: string[];
    strong_points: string[];
  };
  image_relevance: {
    score: number;
    findings: string[];
    issues: string[];
  };
  actionability: {
    score: number;
    strengths: string[];
    improvements: string[];
  };
}

export interface AnalysisResult {
  scores: ScoreData;
  detailed_analysis: DetailedAnalysis;
  recommendations: string[];
  suggested_improvements: {
    deskripsi_temuan?: string;
    quick_action?: string;
  };
}

export interface HazardFormData {
  deskripsi_temuan: string;
  ketidaksesuaian: string;
  sub_ketidaksesuaian: string;
  tools_pengamatan: string;
  lokasi_detail: string;
  quick_action: string;
  image_base64?: string;
}

export class ScoringService {
  async analyzeHazardQuality(formData: HazardFormData): Promise<AnalysisResult> {
    try {
      console.log('[ScoringService] Starting hazard quality analysis...');
      
      const { data, error } = await supabase.functions.invoke('analyze-hazard-quality', {
        body: { formData }
      });

      if (error) {
        console.error('[ScoringService] Supabase function error:', error);
        throw new Error(`Analysis failed: ${error.message}`);
      }

      if (!data.success) {
        console.error('[ScoringService] Analysis unsuccessful:', data.error);
        throw new Error(data.error || 'Analysis failed');
      }

      console.log('[ScoringService] Analysis completed successfully');
      return data.analysis;

    } catch (error) {
      console.error('[ScoringService] Error:', error);
      throw error;
    }
  }

  getScoreColor(score: number): string {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  }

  getScoreGrade(score: number): string {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 60) return 'Fair';
    if (score >= 40) return 'Poor';
    return 'Critical';
  }

  getProgressColor(score: number): string {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  }
}

// Export singleton instance
export const scoringService = new ScoringService();